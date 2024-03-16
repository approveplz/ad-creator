import dotenv from 'dotenv';
import dropbox from 'dropbox';
import { promises as fs } from 'fs';

dotenv.config();

const FILE = 'file';
const DELETED = 'deleted';

const processFolderEntries = (files, entries) => {
    entries.forEach((entry) => {
        // use path_lower as key bc deleted files dont have id
        if (entry['.tag'] === FILE) {
            files[entry.path_lower] = entry;
        } else if (entry['.tag'] === DELETED) {
            delete files[entry.path_lower];
        }
    });
    return files;
};

const processFolder = async (dbx, path, limit) => {
    const response = await dbx.filesListFolder({
        path,
        limit,
    });

    let result = response.result;

    const files = processFolderEntries({}, result.entries);

    // Dropbox files are paginated
    // Use separate continue api with cursor to get the rest
    while (result.has_more) {
        const response = await dbx.filesListFolderContinue({
            cursor: result.cursor,
        });
        result = response.result;

        processFolderEntries(files, result.entries);
    }

    console.log(`Retrieved ${Object.keys(files).length} files from folder`);

    return files;
};

const downloadEntry = async (dbx, entryPath, outputPath) => {
    const response = await dbx.filesDownload({ path: entryPath });
    const result = response.result;

    await fs.writeFile(
        `${outputPath}/${result.name}`,
        result.fileBinary,
        'binary'
    );

    console.log(
        `Downloaded ${entryPath}/${result.name} from Dropbox to ${outputPath}/${result.name}`
    );
};

const downloadEntriesFromFile = async (dbx, files, outputPath) => {
    try {
        const downloadEntryPromises = Object.entries(files).map(
            async ([key, val]) =>
                await downloadEntry(dbx, val['path_lower'], outputPath)
        );

        // Promises are run concurrently. If one fails, the other promises succeed
        // An error is still thrown
        await Promise.all(downloadEntryPromises);

        console.log(
            `Downloaded ${downloadEntryPromises.length} files from Dropbox Folder`
        );
    } catch (e) {
        console.log('There was an error downloading at least one file: ', e);
    }
};

const main = async () => {
    try {
        const dbx = new dropbox.Dropbox({
            accessToken: process.env.DROPBOX_ACCESS_TOKEN,
        });
        console.log('Initialized Dropbox API');

        const files = await processFolder(dbx, '/Media', 5);

        downloadEntriesFromFile(
            dbx,
            files,
            '/Users/alanzhang/meta-api/AdCreator/temp'
        );
    } catch (e) {
        console.log(e);
    }
};

main();

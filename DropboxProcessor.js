import dropbox from 'dropbox';
import { promises as fs } from 'fs';

export default class DropboxProcessor {
    static FILE = 'file';
    static DELETED = 'deleted';

    constructor({ accessToken }) {
        this.dbx = new dropbox.Dropbox({
            accessToken: accessToken,
        });
        console.log('Initialized Dropbox Processor');
    }

    processFolderEntries(files, entries) {
        // Check for files that have been deleted
        // Use path_lower as key bc deleted files dont have id
        entries.forEach((entry) => {
            if (entry['.tag'] === DropboxProcessor.FILE) {
                files[entry.path_lower] = entry;
            } else if (entry['.tag'] === DropboxProcessor.DELETED) {
                delete files[entry.path_lower];
            }
        });
        return files;
    }

    async getFilesFromFolder(path, limit) {
        console.log(`Getting files from Dropbox folder: ${path}`);
        const response = await this.dbx.filesListFolder({
            path,
            limit,
        });

        let result = response.result;
        const files = this.processFolderEntries({}, result.entries);

        // Dropbox files are paginated
        // Use continue api with cursor to get the rest
        while (result.has_more) {
            const response = await this.dbx.filesListFolderContinue({
                cursor: result.cursor,
            });
            result = response.result;
            this.processFolderEntries(files, result.entries);
        }

        console.log(
            `Retrieved ${
                Object.keys(files).length
            } files from folder: ${path}\n`
        );
        return files;
    }

    async downloadFile(inputPath, outputLocation) {
        const response = await this.dbx.filesDownload({ path: inputPath });
        const result = response.result;

        const outputPath = `${outputLocation}/${result.name}`;

        await fs.writeFile(outputPath, result.fileBinary, 'binary');

        console.log(`Downloaded ${inputPath} from Dropbox to ${outputPath}`);

        return outputPath;
    }

    async downloadFiles(files, outputLocation) {
        console.log(`Downloading files from Dropbox folder`);
        try {
            // TODO: files is an object...it should probably be an array
            const downloadFilePromises = Object.entries(files).map(
                async ([key, val]) =>
                    this.downloadFile(val['path_lower'], outputLocation)
            );

            // Promises are run concurrently. If one fails, the other promises succeed but and error is still thrown
            const downloadedFiles = await Promise.all(downloadFilePromises);

            console.log(
                `Downloaded ${downloadedFiles.length} files from Dropbox Folder\n`
            );

            return downloadedFiles;
        } catch (e) {
            console.log(
                'There was an error downloading at least one file: ',
                e
            );
        }
    }

    async moveFiles(files, toPath) {
        console.log('Moving Dropbox files out of input folder...');
        const entries = Object.entries(files).map(([key, val]) => ({
            from_path: val['path_lower'],
            to_path: `${toPath}/${val.name}`,
        }));

        await this.dbx.filesMoveBatchV2({ entries });

        console.log(`Moved ${entries.length} files to ${toPath}\n`);
    }
}

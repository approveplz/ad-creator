import { promises as fs } from 'fs';

export default class DropboxProcessor {
    static FILE = 'file';
    static DELETED = 'deleted';

    constructor(dbx) {
        this.dbx = dbx;
    }

    processFolderEntries(files, entries) {
        // Check for files that have been deleted
        entries.forEach((entry) => {
            if (entry['.tag'] === DropboxProcessor.FILE) {
                files[entry.path_lower] = entry;
            } else if (entry['.tag'] === DropboxProcessor.DELETED) {
                delete files[entry.path_lower];
            }
        });
        return files;
    }

    async processFolder(path, limit) {
        const response = await this.dbx.filesListFolder({
            path,
            limit,
        });

        let result = response.result;
        const files = this.processFolderEntries({}, result.entries);

        while (result.has_more) {
            const response = await this.dbx.filesListFolderContinue({
                cursor: result.cursor,
            });
            result = response.result;
            this.processFolderEntries(files, result.entries);
        }

        console.log(`Retrieved ${Object.keys(files).length} files from folder`);
        return files;
    }

    async downloadEntry(entryPath, outputPath) {
        const response = await this.dbx.filesDownload({ path: entryPath });
        const result = response.result;

        await fs.writeFile(
            `${outputPath}/${result.name}`,
            result.fileBinary,
            'binary'
        );

        console.log(
            `Downloaded ${entryPath}/${result.name} from Dropbox to ${outputPath}/${result.name}`
        );
    }

    async downloadEntriesFromFile(files, outputPath) {
        try {
            const downloadEntryPromises = Object.entries(files).map(
                async ([key, val]) =>
                    this.downloadEntry(val['path_lower'], outputPath)
            );

            await Promise.all(downloadEntryPromises);

            console.log(
                `Downloaded ${downloadEntryPromises.length} files from Dropbox Folder`
            );
        } catch (e) {
            console.log(
                'There was an error downloading at least one file: ',
                e
            );
        }
    }
}

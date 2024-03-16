import dropbox from 'dropbox';
import dotenv from 'dotenv';
import DropboxProcessor from './DropboxProcessor.js';

dotenv.config();

const dbx = new dropbox.Dropbox({
    accessToken: process.env.DROPBOX_ACCESS_TOKEN,
});
console.log('Initialized Dropbox API');

const dropboxProcessor = new DropboxProcessor(dbx);

const main = async () => {
    try {
        const files = await dropboxProcessor.processFolder('/Media', 5);

        await dropboxProcessor.downloadEntriesFromFile(
            files,
            '/Users/alanzhang/meta-api/AdCreator/temp'
        );
    } catch (e) {
        console.log(e);
    }
};

main();

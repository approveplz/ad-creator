import dotenv from 'dotenv';
import path from 'path';

import DropboxProcessor from './DropboxProcessor.js';
import FacebookAdsProcessor from './FacebookAdsProcessor.js';

dotenv.config();

const dropboxProcessor = new DropboxProcessor({
    accessToken: process.env.DROPBOX_ACCESS_TOKEN,
});

const facebookAdsProcessor = new FacebookAdsProcessor(
    {
        appId: process.env.FACEBOOK_APP_ID,
        appSecret: process.env.FACEBOOK_APP_SECRET,
        accessToken: process.env.FACEBOOK_ACCESS_TOKEN,
        accountId: process.env.FACEBOOK_ACCOUNT_ID,
        apiVersion: '19.0',
    },
    true
);

const main = async () => {
    try {
        const files = await dropboxProcessor.processFolder('/Media', 5);

        const fileOutputPaths = await dropboxProcessor.downloadFiles(
            files,
            '/Users/alanzhang/meta-api/AdCreator/temp'
        );

        const uploadVideoPromises = fileOutputPaths.map(
            async (outputPath) =>
                await facebookAdsProcessor.uploadAdVideo({
                    name: path.basename(outputPath, path.extname(outputPath)),
                    videoFilePath: outputPath,
                })
        );

        const uploadedVideos = await Promise.all(uploadVideoPromises);
        console.log(uploadedVideos);
    } catch (e) {
        console.log(e);
    }
};

main();

const test = async () => {
    try {
        const adVideo = await facebookAdsProcessor.uploadAdVideo({
            name: 'test video name - 4',
            videoFilePath: '/Users/alanzhang/meta-api/AdCreator/temp/124.MP4',
        });

        // await facebookAdsProcessor.createCampaign({
        //     name: 'campaign name - 3',
        // });
    } catch (e) {
        console.log(e);
    }
};

// test();

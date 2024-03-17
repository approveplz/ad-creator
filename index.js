import dotenv from 'dotenv';
import path from 'path';
import { promises as fs } from 'fs';

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
        pageId: process.env.FACEBOOK_PAGE_ID,
        apiVersion: '19.0',
    },
    false
);

const dropboxInputFolder = '/input-media';
const tempLocalFolder = '/Users/alanzhang/meta-api/AdCreator/temp';
const dropboxProcessedFolder = '/processed-media';
const adCampaignName = 'Campaign name';
const adName = 'Ad Name';

const bodies = [
    'body text 1',
    'body text 2',
    'body text 3',
    'body text 4',
    'body text 5',
];
const titles = [
    'title text 1',
    'title text 2',
    'title text 3',
    'title text 4',
    'title text 5',
];
const descriptions = [
    'description text 1',
    'description text 2',
    'description text 3',
    'description text 4',
    'description text 5',
];
const website_url = 'https://onno.com';

const adCreativeName = 'Ad Creative Name';

const adSetName = 'Ad Set Name';

const main = async () => {
    try {
        // Save file from Dropbox folder
        const files = await dropboxProcessor.getFilesFromFolder(
            dropboxInputFolder,
            5
        );

        // Download files from Dropbox to local temp folder
        const fileOutputPaths = await dropboxProcessor.downloadFiles(
            files,
            tempLocalFolder
        );

        // move downloaded file to processed Dropbox folder
        await dropboxProcessor.moveFiles(files, dropboxProcessedFolder);

        // Upload files to Facebook media library
        const uploadVideoPromises = fileOutputPaths.map(async (outputPath) => {
            const video = await facebookAdsProcessor.uploadAdVideo({
                name: path.basename(outputPath, path.extname(outputPath)),
                videoFilePath: outputPath,
            });

            const intervalMs = 10 * 1000;
            const timeoutMs = 3 * 60 * 1000;
            await facebookAdsProcessor.waitUntilVideoReady(
                video.id,
                intervalMs,
                timeoutMs
            );
            return video;
        });
        const uploadedVideos = await Promise.all(uploadVideoPromises);
        console.log(uploadedVideos);

        // Delete files from local temp folder
        console.log(`Deleting files from local folder`);
        const deleteLocalFilePromises = fileOutputPaths.map((outputPath) =>
            fs.unlink(outputPath)
        );
        await Promise.all(deleteLocalFilePromises);
        console.log(
            `Deleted ${deleteLocalFilePromises.length} files from local folder`
        );

        // Create Facebook campaign
        const campaign = await facebookAdsProcessor.createCampaign({
            name: adCampaignName,
        });

        // Create AdCreatives
        const adCreatives = await facebookAdsProcessor.createAdCreatives({
            name: adCreativeName,
            videos: uploadedVideos,
            bodies,
            titles,
            descriptions,
            website_url,
        });

        // Create AdSet for each creative and associate them
        const adSetsWithCreativesPromises = adCreatives.map(
            async (creative, index) => {
                const adSet = await facebookAdsProcessor.createAdSet({
                    name: `${adSetName} - ${index + 1}`,
                    campaign_id: campaign.id,
                    bid_amount: '1',
                    billing_event: 'IMPRESSIONS',
                });
                return {
                    adSet,
                    creative,
                };
            }
        );
        const adSetsWithCreatives = await Promise.all(
            adSetsWithCreativesPromises
        );

        const ads = await facebookAdsProcessor.createAds({
            name: adName,
            adSetsWithCreatives,
        });
    } catch (e) {
        console.log(e);
    }
};

main();

const test = async () => {
    try {
        // const adVideo = await facebookAdsProcessor.uploadAdVideo({
        //     name: 'test video name - 4',
        //     videoFilePath: '/Users/alanzhang/meta-api/AdCreator/temp/124.MP4',
        // });

        const campaign = await facebookAdsProcessor.createCampaign({
            name: 'test campaign name - 33',
        });

        // const adSet = await facebookAdsProcessor.createAdSet({
        //     name: 'ad set test name -33',
        //     campaign_id: campaign.id,
        //     bid_amount: '1',
        //     billing_event: 'IMPRESSIONS',
        // });

        // Create Ad Creative
        // these videos wil come from upload video call
        const videos = [
            { id: '429949663026775' },
            { id: '777916670536070' },
            { id: '778531130446398' },
            { id: '369923949206102' },
            { id: '1770280636806928' },
            { id: '377151991859963' },
        ];

        const bodies = [
            'body text 33',
            'body text 34',
            'body text 35',
            'body text 36',
        ];
        const titles = [
            'title text 33',
            'title text 34',
            'title text 35',
            'title text 36',
        ];
        const descriptions = [
            'description text 33',
            'description text 34',
            'description text 35',
            'description text 36',
        ];
        const website_url = 'https://onno.com';

        const adCreatives = await facebookAdsProcessor.createAdCreatives({
            name: 'ad creative name - 33',
            videos,
            bodies,
            titles,
            descriptions,
            website_url,
        });

        const adSetsWithCreativesPromises = adCreatives.map(
            async (creative, index) => {
                const adSet = await facebookAdsProcessor.createAdSet({
                    name: `ad set test name -33 - ${index}`,
                    campaign_id: campaign.id,
                    bid_amount: '1',
                    billing_event: 'IMPRESSIONS',
                });
                return {
                    adSet,
                    creative,
                };
            }
        );
        const adSetsWithCreatives = await Promise.all(
            adSetsWithCreativesPromises
        );

        const ads = await facebookAdsProcessor.createAds({
            name: 'ad name 33',
            adSetsWithCreatives,
        });

        // loop through ad creatives
        // create ad set for each
        // put into obj in array
        // pass to create ads

        // const ads = await facebookAdsProcessor.createAds({
        //     name: 'ad name 33',
        //     adSetId: adSet.id,
        //     creatives: adCreatives,
        // });

        // const ad = await facebookAdsProcessor.createAd({
        //     name: 'ad name 33',
        //     adSetId: adSet.id,
        //     creativeId: adCreative.id,
        // });

        console.log({ ads });
    } catch (e) {
        console.log(e);
    }
};

// test();

const test2 = async () => {
    // Save file from Dropbox folder
    const files = await dropboxProcessor.getFilesFromFolder(
        dropboxInputFolder,
        5
    );

    // Download files from Dropbox to local temp folder
    const fileOutputPaths = await dropboxProcessor.downloadFiles(
        files,
        tempLocalFolder
    );

    // move downloaded file to processed Dropbox folder
    await dropboxProcessor.moveFiles(files, dropboxProcessedFolder);

    // Upload files to Facebook media library
    const uploadVideoPromises = fileOutputPaths.map(async (outputPath) => {
        const video = await facebookAdsProcessor.uploadAdVideo({
            name: path.basename(outputPath, path.extname(outputPath)),
            videoFilePath: outputPath,
        });

        const intervalMs = 10 * 1000;
        const timeoutMs = 3 * 60 * 1000;
        await facebookAdsProcessor.waitUntilVideoReady(
            video.id,
            intervalMs,
            timeoutMs
        );
        return video;
    });
    const uploadedVideos = await Promise.all(uploadVideoPromises);
    console.log(uploadedVideos);
};

// test2();

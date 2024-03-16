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
        pageId: process.env.FACEBOOK_PAGE_ID,
        apiVersion: '19.0',
    },
    false
);

const main = async () => {
    try {
        // Save file from Dropbox folder
        const files = await dropboxProcessor.processFolder('/Media', 5);
        const fileOutputPaths = await dropboxProcessor.downloadFiles(
            files,
            '/Users/alanzhang/meta-api/AdCreator/temp'
        );

        // Upload files to Facebook media library
        const uploadVideoPromises = fileOutputPaths.map(
            async (outputPath) =>
                await facebookAdsProcessor.uploadAdVideo({
                    name: path.basename(outputPath, path.extname(outputPath)),
                    videoFilePath: outputPath,
                })
        );
        const uploadedVideos = await Promise.all(uploadVideoPromises);
        console.log(uploadedVideos);
        // video ids
        // [
        //     { id: '429949663026775' },
        //     { id: '777916670536070' },
        //     { id: '778531130446398' },
        //     { id: '369923949206102' },
        //     { id: '1770280636806928' },
        //     { id: '377151991859963' }
        // ]
    } catch (e) {
        console.log(e);
    }
};

// main();

const test = async () => {
    try {
        // const adVideo = await facebookAdsProcessor.uploadAdVideo({
        //     name: 'test video name - 4',
        //     videoFilePath: '/Users/alanzhang/meta-api/AdCreator/temp/124.MP4',
        // });

        const campaign = await facebookAdsProcessor.createCampaign({
            name: 'test campaign name - 33',
        });

        const adSet = await facebookAdsProcessor.createAdSet({
            name: 'ad set test name -33',
            campaign_id: campaign.id,
            bid_amount: '1',
            billing_event: 'IMPRESSIONS',
        });

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

        const adCreative = await facebookAdsProcessor.createAdCreative({
            name: 'ad creative name - 33',
            videos,
            bodies,
            titles,
            descriptions,
            website_url,
        });

        const ad = await facebookAdsProcessor.createAd({
            name: 'ad name 33',
            adSetId: adSet.id,
            creativeId: adCreative.id,
        });

        console.log({ ad });
    } catch (e) {
        console.log(e);
    }
};

test();

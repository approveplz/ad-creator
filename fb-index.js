import dotenv from 'dotenv';
import * as fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';
import moment from 'moment';
import bizSdk from 'facebook-nodejs-business-sdk';

dotenv.config();

const AdAccount = bizSdk.AdAccount;
const Campaign = bizSdk.Campaign;
const AdSet = bizSdk.AdSet;
const AdImage = bizSdk.AdImage;

const app_secret = '62555e11bd691ec7d860732fcc26920a';
const app_id = '372430132243763';

const logApiCallResult = (apiCallName, data) => {
    console.log(apiCallName);
    // if (showDebugingInfo) {
    console.log('Data:' + JSON.stringify(data, null, 2));
    // }
};

const createCampaign = (adAccount, { fields = [], params }) => {
    const {
        name,
        // objective = 'OUTCOME_SALES', // double check w/ mak that this is the right one, but i think it is. it wont work with the adset optimization goal
        objective = 'OUTCOME_TRAFFIC',
        status = 'PAUSED',
        special_ad_categories = [],
        bid_strategy = 'LOWEST_COST_WITH_BID_CAP',
        daily_budget = 2000,
    } = params;

    const campaign = adAccount.createCampaign(fields, {
        name,
        status,
        objective,
        special_ad_categories,
        // promoted_object: {
        //     pixel_id: '327300203660662',
        //     custom_event_type: 'INITIATED_CHECKOUT',
        //     application_id: app_id,
        // },
        bid_strategy,
        daily_budget,
    });
    // logApiCallResult('createCampaign', campaign, true);
    return campaign;
};

const createAdSet = (adAccount, { fields = [], params }) => {
    const now = moment();
    const oneHourLater = now.add(1, 'hours');
    const oneHourLaterUnixTimestamp = oneHourLater.unix();

    const {
        campaign_id,
        bid_amount,
        bid_strategy = 'LOWEST_COST_WITH_BID_CAP',
        // destination_type = 'WEBSITE',
        name,
        start_time = oneHourLaterUnixTimestamp, //UTC unix timestamp. ex 2015-03-12 23:59:59-07:00
        end_time = '0',
        // optimization_goal = 'OFFSITE_CONVERSIONS', //https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group/#odax
        optimization_goal = 'LANDING_PAGE_VIEWS',
        status = 'PAUSED',
        targeting = {
            geo_locations: {
                countries: ['US'],
            },
            targeting_automation: {
                advantage_audience: 1,
            },
        },
        // promoted_object = {
        //     pixel_id: '327300203660662',
        //     custom_event_type: 'TEST',
        //     application_id: app_id,
        // },
        // daily_budget,
        billing_event,
        is_dynamic_creative = true,
    } = params;

    const adSet = adAccount.createAdSet(fields, {
        campaign_id,
        bid_amount,
        bid_strategy,
        // destination_type,
        name,
        start_time,
        end_time,
        optimization_goal,
        status,
        targeting,
        // lifetime_budget,
        // daily_budget,
        billing_event,
        // promoted_object,
        is_dynamic_creative,
    });
    // logApiCallResult('createAdSet', adSet, true);

    return adSet;
};

const createAdImage = (adAccount, byteFormattedImage) => {
    const adImage = adAccount.createAdImage([], {
        bytes: byteFormattedImage,
    });
    return adImage;
};

const createAdVideo = (adAcount, params) => {
    const version = '19.0';
    const url = `https://graph.facebook.com/v${version}/${adAcount.id}/advideos`;

    const { name, access_token, title, videoFilePath } = params;

    // const videoFilePath =
    //     '/Users/alanzhang/meta-api/AdCreator/test-video-2.mp4';

    const formdata = new FormData();
    formdata.append('name', name);
    formdata.append('access_token', access_token);
    formdata.append('title', title);
    formdata.append('source', fs.createReadStream(videoFilePath));

    // for axios
    let requestOptions = {
        method: 'post',
        url,
        data: formdata,
    };

    const response = axios.request(requestOptions).then((resp) => resp.data);

    return response;
};

const createAdCreativeAssetFeedSpec = () => {
    const assetFeedSpec = {
        images: [],
        // videos: [{ video_id: '791250436245129', thumbnail_hash: '' }],
        videos: [{ video_id: '791250436245129' }],
        bodies: [{ text: 'body text 1' }, { text: 'body text 2' }],
        titles: [{ text: 'title text 1' }, { text: 'title text 2' }],
        descriptions: [{ text: 'desc text 1' }, { text: 'desc text 2' }],
        ad_formats: ['SINGLE_VIDEO'],
        call_to_action_types: ['SHOP_NOW'],
        link_urls: [{ website_url: 'https://www.onno.com' }],
    };
    return assetFeedSpec;
};

const createAdCreativeObjectStorySpec = () => {
    const objectStorySpec = {
        page_id: '249433454921486',
    };

    return objectStorySpec;
};

const createAdCreative = (adAccount, fields, params) => {
    const adCreativeParams = {
        name: 'test creative',
        object_story_spec: {},
    };

    const adCreative = adAccount.createAdCreative(fields, params);

    // const adCreativeParams = {
    //     name: 'Sample Creative',
    //     object_story_spec: {
    //         page_id: pageId,
    //         link_data: {
    //             image_hash: adImage.image_hash,
    //             link: 'https://www.facebook.com/profile.php?id=61557068495227',
    //             message: 'try it out',
    //         },
    //     },
    // };

    // const adCreative = await adAccount.createAdCreative(
    //     [],
    //     adCreativeParams
};

const main = async () => {
    try {
        // init
        const api = bizSdk.FacebookAdsApi.init(process.env.ACCESS_TOKEN);
        const showDebugingInfo = true; // Setting this to true shows more debugging info.
        if (showDebugingInfo) {
            api.setDebug(true);
        }

        const adAccount = new AdAccount(`act_${process.env.ACCOUNT_ID}`);

        // create campaign
        const campaign = await createCampaign(adAccount, {
            fields: [],
            params: { name: 'real-test-2' },
        });
        logApiCallResult('campaign created', campaign);

        // create ad set
        const adSetParams = {
            name: 'real-adset-2',
            campaign_id: campaign.id,
            // lifetime_budget: '2000',
            // daily_budget: '2000',
            bid_amount: '1',
            billing_event: 'IMPRESSIONS',
        };
        const adSet = await createAdSet(adAccount, {
            fields: [],
            params: adSetParams,
        });
        logApiCallResult('ad set', adSet);

        // create ad creative
        const assetFeedSpec = createAdCreativeAssetFeedSpec();
        const objectStorySpec = createAdCreativeObjectStorySpec();

        const adCreativeParams = {
            name: 'test dynamic creative',
            object_story_spec: objectStorySpec,
            asset_feed_spec: assetFeedSpec,
        };
        const adCreative = await adAccount.createAdCreative(
            [],
            adCreativeParams
        );
        logApiCallResult('create video ad creative', adCreative);

        // create ad
        const ad = await adAccount.createAd([], {
            name: 'test ad - 2',
            adset_id: adSet.id,
            creative: { creative_id: adCreative.id },
            status: 'PAUSED',
        });
        logApiCallResult('create ad', ad);
    } catch (e) {
        console.log(e);
    }
};

main();

const testUploadVideo = async () => {
    const api = bizSdk.FacebookAdsApi.init(process.env.ACCESS_TOKEN);
    const showDebugingInfo = true; // Setting this to true shows more debugging info.
    if (showDebugingInfo) {
        api.setDebug(true);
    }

    const adAccount = new AdAccount(`act_${process.env.ACCOUNT_ID}`);

    try {
        // create video and upload to library
        const videoFilePath =
            '/Users/alanzhang/meta-api/AdCreator/test-mak.mov';

        const adVideo = await createAdVideo(adAccount, {
            name: 'test-name-2',
            access_token: process.env.ACCESS_TOKEN,
            title: 'test title-2',
            videoFilePath,
        });

        logApiCallResult('uplaod video', adVideo);

        // create ad creative
        const pageId = '249433454921486';
        // const adCreativeParams = {
        //     name: 'test Creative -1',
        //     object_story_spec: {
        //         page_id: pageId,
        //         video_data: {
        //             call_to_action: {
        //                 type: 'LIKE_PAGE',
        //                 value: {
        //                     page: pageId,
        //                     link: 'https://www.facebook.com/profile.php?id=61557068495227',
        //                 },
        //             },
        //             // image_url: 'https://postlmg.cc/N5Gsc2dt',
        //             // image_hash: 'e9831afe0fe759f4ebca9c4562d333a2',
        //             video_id: adVideo.id,
        //         },
        //     },
        // };

        const assetFeedSpec = createAdCreativeAssetFeedSpec();
        const objectStorySpec = createAdCreativeObjectStorySpec();

        const adCreativeParams = {
            name: 'test dynamic creative',
            object_story_spec: objectStorySpec,
            asset_feed_spec: assetFeedSpec,
        };

        // const videoCreative = await adAccount.createAdCreative(
        //     [],
        //     adCreativeParams
        // );
        // logApiCallResult('create video ad creative', videoCreative);

        // const adSetParams = {
        //     name: 'My AdSet 69',
        //     lifeTimeBudget: '2000',
        //     startTime: '2024-04-24T09:24:18-0700',
        //     endTime: '2024-05-01T09:24:18-0700',
        //     campaignId: '120208361001210155',
        //     bidAmount: '1',
        //     optimizationGoal: 'POST_ENGAGEMENT',
        //     targeting: {
        //         geo_locations: {
        //             countries: ['US'],
        //         },
        //     },
        //     status: 'PAUSED',
        //     billingEvent: 'IMPRESSIONS',
        // };
        // const adSet = createAdSet(adAccount, {
        //     fields: [],
        //     params: adSetParams,
        // });

        const ad = await adAccount.createAd([], {
            name: 'test ad - 1',
            adset_id: '120208557114170155',
            creative: { creative_id: '120208562946480155' },
            status: 'PAUSED',
        });
        logApiCallResult('create ad', ad);
    } catch (e) {
        console.log(e);
    }
};

// testUploadVideo();

const test2 = async () => {
    const api = bizSdk.FacebookAdsApi.init(process.env.ACCESS_TOKEN);
    const showDebugingInfo = true; // Setting this to true shows more debugging info.
    if (showDebugingInfo) {
        api.setDebug(true);
    }

    const adAccount = new AdAccount(`act_${process.env.ACCOUNT_ID}`);

    try {
        const campaign = await createCampaign(adAccount, {
            fields: [],
            params: { name: 'real-test-2' },
        });
        logApiCallResult('campaign', campaign);

        const adSetParams = {
            name: 'real-adset-2',
            campaign_id: campaign.id,
            // lifetime_budget: '2000',
            // daily_budget: '2000',
            bid_amount: '1',
            billing_event: 'IMPRESSIONS',
        };

        const adSet = await createAdSet(adAccount, {
            fields: [],
            params: adSetParams,
        });
        logApiCallResult('ad set', adSet);
    } catch (e) {
        console.log(e);
    }
};

// test2();

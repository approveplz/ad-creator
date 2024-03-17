import axios from 'axios';
import moment from 'moment';
import fs from 'fs';
import FormData from 'form-data';
import { FacebookAdsApi, AdAccount } from 'facebook-nodejs-business-sdk';

export default class FacebookAdsProcessor {
    constructor(
        {
            appId,
            appSecret,
            accessToken,
            accountId,
            pageId,
            apiVersion = '19.0',
        },
        showDebuggingInfo = false
    ) {
        this.appId = appId;
        this.appSecret = appSecret;
        this.accessToken = accessToken;
        this.showDebuggingInfo = showDebuggingInfo;
        this.accountId = accountId;
        this.pageId = pageId;
        this.apiVersion = apiVersion;

        this.api = FacebookAdsApi.init(accessToken);
        this.adAccount = new AdAccount(`act_${this.accountId}`);

        console.log('Initialized FacebookAdsProcessor');
    }

    logApiCallResult(apiCallName, data) {
        console.log(apiCallName);
        if (this.showDebuggingInfo) {
            console.log('Data:' + JSON.stringify(data, null, 2));
        }
    }

    async uploadAdVideo({ name, videoFilePath }) {
        console.log(`Uploading video to Facebook. Path: ${videoFilePath}}`);
        const url = `https://graph.facebook.com/v${this.apiVersion}/${this.adAccount.id}/advideos`;

        const formdata = new FormData();
        formdata.append('name', name);
        formdata.append('access_token', this.accessToken);
        formdata.append('source', fs.createReadStream(videoFilePath));

        const requestOptions = {
            method: 'post',
            url,
            data: formdata,
        };

        const response = await axios.request(requestOptions);
        const data = response.data;

        return data;
    }

    async getVideoUploadStatus(videoId) {
        const params = new URLSearchParams({
            access_token: this.accessToken,
            fields: 'status',
        });
        const url = `https://graph.facebook.com/v${this.apiVersion}/${videoId}?${params}`;

        let requestOptions = {
            method: 'get',
            url,
        };

        const response = await axios.request(requestOptions);
        const data = response.data.status['video_status'];
        return data;
    }

    async waitUntilVideoReady(videoId, intervalMs, timeoutMs) {
        console.log(`Waiting for videoId: ${videoId} to finish processing`);
        const startTime = new Date().getTime();
        let status = '';

        while (true) {
            status = await this.getVideoUploadStatus(videoId);
            if (status != 'processing') {
                break;
            } else if (startTime + timeoutMs <= new Date().getTime) {
                throw Error(`Video encoding timeout. Timeout: ${timeoutMs}`);
            }

            await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }

        if (status != 'ready') {
            throw Error(`Failed. Video status: ${status}`);
        }
        console.log(`videoId: ${videoId} has finished processing`);
    }

    async createCampaign({
        name,
        // objective = 'OUTCOME_SALES', // double check w/ mak that this is the right one, but i think it is. it wont work with the adset optimization goal
        objective = 'OUTCOME_TRAFFIC',
        status = 'PAUSED',
        special_ad_categories = [],
        bid_strategy = 'LOWEST_COST_WITH_BID_CAP',
        daily_budget = 2000,
    }) {
        console.log(`Creating Facebook Ad campaign. Name: ${name}`);
        const campaign = await this.adAccount.createCampaign([], {
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

        this.logApiCallResult(`Campaign created. ID: ${campaign.id}`, campaign);

        return campaign;
    }

    async createAdSet({
        name,
        campaign_id,
        bid_amount,
        billing_event,
        start_time = '0', //UTC unix timestamp. ex 2015-03-12 23:59:59-07:00
        bid_strategy = 'LOWEST_COST_WITH_BID_CAP',
        // destination_type = 'WEBSITE',
        end_time = '0',
        // optimization_goal = 'OFFSITE_CONVERSIONS', //https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group/#odax
        optimization_goal = 'LANDING_PAGE_VIEWS',
        status = 'PAUSED',
        targeting = {
            geo_locations: {
                countries: ['US'],
            },
            // Turn on advantage+ audience
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
        is_dynamic_creative = true,
    }) {
        if (start_time === '0') {
            const now = moment();
            const oneHourLater = now.add(1, 'hours');
            const oneHourLaterUnixTimestamp = oneHourLater.unix();
            start_time = oneHourLaterUnixTimestamp;
        }

        const adSet = await this.adAccount.createAdSet([], {
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

        this.logApiCallResult(`AdSet created. ID: ${adSet.id}`, adSet);

        return adSet;
    }

    createAdCreativeObjectStorySpec() {
        const objectStorySpec = {
            page_id: this.pageId,
        };

        return objectStorySpec;
    }

    createAdCreativeAssetFeedSpec({
        images = [],
        videos,
        bodies,
        titles,
        descriptions,
        website_url,
    }) {
        const assetFeedSpec = {
            images,
            videos: videos.map((video) => ({
                video_id: video.id,
            })),
            bodies: bodies.map((body) => ({ text: body })),
            titles: titles.map((title) => ({ text: title })),
            descriptions: descriptions.map((desc) => ({ text: desc })),
            ad_formats: ['SINGLE_VIDEO'],
            call_to_action_types: ['SHOP_NOW'],
            link_urls: [{ website_url }],
        };

        return assetFeedSpec;
    }

    async createAdCreative({
        name,
        videos,
        bodies,
        titles,
        descriptions,
        website_url,
    }) {
        console.log(`Creating Ad Creative. Name: ${name}`);
        const assetFeedSpec = this.createAdCreativeAssetFeedSpec({
            videos,
            bodies,
            titles,
            descriptions,
            website_url,
        });

        const objectStorySpec = this.createAdCreativeObjectStorySpec({
            page_id: this.pageId,
        });

        const adCreative = await this.adAccount.createAdCreative([], {
            name,
            object_story_spec: objectStorySpec,
            asset_feed_spec: assetFeedSpec,
        });
        this.logApiCallResult(
            `Created Ad Creative. Creative ID: ${adCreative.id}`,
            adCreative
        );

        return adCreative;
    }

    async createAdCreatives({
        name,
        videos,
        bodies,
        titles,
        descriptions,
        website_url,
    }) {
        console.log(`Creating Ad creatives...\n`);
        const maxVideosInCreative = 5;
        const videoChunks = [];

        for (let i = 0; i < videos.length; i += maxVideosInCreative) {
            const videoChunk = videos.slice(i, i + maxVideosInCreative);
            videoChunks.push(videoChunk);
        }

        const adCreativePromises = videoChunks.map((videos, index) =>
            this.createAdCreative({
                name: `${name} - ${index + 1}`,
                videos,
                bodies,
                titles,
                descriptions,
                website_url,
            })
        );

        const adCreatives = await Promise.all(adCreativePromises);
        console.log(`Created ${adCreativePromises.length} ad creatives`);

        return adCreatives;
    }

    async createAd({ name, adSetId, creativeId }) {
        const ad = await this.adAccount.createAd([], {
            name,
            adset_id: adSetId,
            creative: { creative_id: creativeId },
            status: 'PAUSED',
        });

        this.logApiCallResult(`Created Facebook Ad. Ad ID: ${ad.id}`, ad);

        return ad;
    }

    async createAds({ name, adSetsWithCreatives }) {
        console.log(`Creating Facebook Ads`);
        const adPromises = adSetsWithCreatives.map(
            ({ creative, adSet }, index) =>
                this.createAd({
                    name: `${name} - ${index + 1}`,
                    adSetId: adSet.id,
                    creativeId: creative.id,
                })
        );

        const ads = await Promise.all(adPromises);

        console.log(`Created ${adPromises.length} ads`);
        return ads;
    }
}

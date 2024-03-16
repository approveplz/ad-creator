import axios from 'axios';
import moment from 'moment';
import fs from 'fs';
import FormData from 'form-data';
import {
    FacebookAdsApi,
    AdAccount,
    Campaign,
    AdSet,
    AdImage,
} from 'facebook-nodejs-business-sdk';

export default class FacebookAdsProcessor {
    constructor(
        { appId, appSecret, accessToken, accountId, apiVersion = '19.0' },
        showDebuggingInfo = false
    ) {
        this.appId = appId;
        this.appSecret = appSecret;
        this.accessToken = accessToken;
        this.showDebuggingInfo = showDebuggingInfo;
        this.apiVersion = apiVersion;
        this.accountId = accountId;

        FacebookAdsApi.init(accessToken);
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
        const url = `https://graph.facebook.com/v${this.apiVersion}/${this.adAccount.id}/advideos`;

        const formdata = new FormData();
        formdata.append('name', name);
        formdata.append('access_token', this.accessToken);
        formdata.append('source', fs.createReadStream(videoFilePath));

        let requestOptions = {
            method: 'post',
            url,
            data: formdata,
        };

        const response = await axios.request(requestOptions);
        const data = response.data;

        this.logApiCallResult('Uploaded ad video to Facebook', data);

        return response.data;
    }

    createCampaign({
        name,
        // objective = 'OUTCOME_SALES', // double check w/ mak that this is the right one, but i think it is. it wont work with the adset optimization goal
        objective = 'OUTCOME_TRAFFIC',
        status = 'PAUSED',
        special_ad_categories = [],
        bid_strategy = 'LOWEST_COST_WITH_BID_CAP',
        daily_budget = 2000,
    }) {
        const campaign = this.adAccount.createCampaign([], {
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

        return campaign;
    }

    // const createCampaign = (adAccount, { fields = [], params }) => {
    //     const {
    //         name,
    //         // objective = 'OUTCOME_SALES', // double check w/ mak that this is the right one, but i think it is. it wont work with the adset optimization goal
    //         objective = 'OUTCOME_TRAFFIC',
    //         status = 'PAUSED',
    //         special_ad_categories = [],
    //         bid_strategy = 'LOWEST_COST_WITH_BID_CAP',
    //         daily_budget = 2000,
    //     } = params;

    //     const campaign = adAccount.createCampaign(fields, {
    //         name,
    //         status,
    //         objective,
    //         special_ad_categories,
    //         // promoted_object: {
    //         //     pixel_id: '327300203660662',
    //         //     custom_event_type: 'INITIATED_CHECKOUT',
    //         //     application_id: app_id,
    //         // },
    //         bid_strategy,
    //         daily_budget,
    //     });
    //     // logApiCallResult('createCampaign', campaign, true);
    //     return campaign;
    // };
}

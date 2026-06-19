const axios = require('axios');

const APP_ID = process.env.AGORA_APP_ID;
const CUSTOMER_ID = process.env.AGORA_CUSTOMER_ID;
const CUSTOMER_CERTIFICATE = process.env.AGORA_CUSTOMER_CERTIFICATE;

// Generate Basic Auth header for Agora Cloud Recording REST API
const authHeader = `Basic ${Buffer.from(`${CUSTOMER_ID}:${CUSTOMER_CERTIFICATE}`).toString('base64')}`;

const agoraApi = axios.create({
    baseURL: `https://api.agora.io/v1/apps/${APP_ID}/cloud_recording`,
    headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json;charset=utf-8'
    }
});

/**
 * Acquire a resource ID for recording
 */
const acquire = async (channelName, uid) => {
    try {
        console.log(`[Agora] Acquiring resource for ${channelName}...`);
        const response = await agoraApi.post('/acquire', {
            cname: channelName,
            uid: uid.toString(),
            clientRequest: {
                resourceExpiredHour: 24,
                scene: 0
            }
        });
        return response.data.resourceId;
    } catch (error) {
        console.error('[Agora] Acquire Error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Start cloud recording
 */
const start = async (resourceId, channelName, uid, token) => {
    try {
        console.log(`[Agora] Starting recording for ${channelName}...`);

        const sanitizedChannelName = channelName.replace(/\s+/g, '_');
        const storageConfig = {
            vendor: 6, // 6 is the correct Agora vendor code for Google Cloud Storage (Firebase)
            region: 0,
            bucket: process.env.FIREBASE_STORAGE_BUCKET || "my-project-e57d2.firebasestorage.app",
            accessKey: process.env.GCS_ACCESS_KEY, // Interoperability Access Key
            secretKey: process.env.GCS_SECRET_KEY, // Interoperability Secret Key
            fileNamePrefix: ["recordings", sanitizedChannelName]
        };

        const response = await agoraApi.post(`/resourceid/${resourceId}/mode/mix/start`, {
            cname: channelName,
            uid: uid.toString(),
            clientRequest: {
                token: token,
                recordingConfig: {
                    maxIdleTime: 10,
                    streamTypes: 2,
                    audioProfile: 1,
                    channelType: 1,
                    videoStreamType: 0,
                    transcodingConfig: {
                        width: 640,
                        height: 360,
                        fps: 15,
                        bitrate: 600,
                        mixedVideoLayout: 0
                    }
                },
                recordingFileConfig: {
                    avFileType: ["hls", "mp4"]
                },
                storageConfig: storageConfig
            }
        });
        return response.data.sid;
    } catch (error) {
        console.error('[Agora] Start Error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Stop cloud recording
 */
const stop = async (resourceId, sid, channelName, uid) => {
    try {
        console.log(`[Agora] Stopping recording for ${channelName}...`);
        const response = await agoraApi.post(`/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`, {
            cname: channelName,
            uid: uid.toString(),
            clientRequest: {}
        });

        // Construct the URL (For GCS: https://storage.googleapis.com/BUCKET/PATH/FILE)
        const fileList = response.data.serverResponse.fileList;
        return {
            status: 'stopped',
            files: fileList,
            sid: response.data.sid,
            resourceId: response.data.resourceId
        };
    } catch (error) {
        console.error('[Agora] Stop Error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Query recording status
 */
const query = async (resourceId, sid) => {
    try {
        const response = await agoraApi.get(`/resourceid/${resourceId}/sid/${sid}/mode/mix/query`);
        return response.data;
    } catch (error) {
        console.error('[Agora] Query Error:', error.response?.data || error.message);
        throw error;
    }
};

module.exports = {
    acquire,
    start,
    stop,
    query
};

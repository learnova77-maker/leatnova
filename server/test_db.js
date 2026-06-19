require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get } = require('firebase/database');

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    databaseURL: process.env.FIREBASE_DATABASE_URL
};

const app = initializeApp(firebaseConfig);
const rtdb = getDatabase(app);

async function check() {
    console.log("Fetching live sessions...");
    const snap = await get(ref(rtdb, 'live_sessions'));
    if (snap.exists()) {
        const data = snap.val();
        Object.keys(data).forEach(k => {
            if (data[k].serverDebugTrace) {
                console.log(`\nSession: ${data[k].title || k}`);
                console.log(`Debug Trace:\n`, JSON.parse(data[k].serverDebugTrace).join('\n'));
            }
        });
    } else {
        console.log("No sessions found.");
    }
    process.exit();
}
check();

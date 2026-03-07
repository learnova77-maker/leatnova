const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');
const { getDatabase } = require('firebase/database');
const { getStorage } = require('firebase/storage');
require('dotenv').config();

// Using the config provided by the user directly in .env or config
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyAPmrrkZcLHRfm-fwFedE-AktZwNQnqNEs",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "my-project-e57d2.firebaseapp.com",
    databaseURL: process.env.FIREBASE_DATABASE_URL || "https://my-project-e57d2-default-rtdb.firebaseio.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "my-project-e57d2",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "my-project-e57d2.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "239945810669",
    appId: process.env.FIREBASE_APP_ID || "1:239945810669:web:e5f77c929dc2a79a9bc2e4",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const rtdb = getDatabase(app);
const storage = getStorage(app);

module.exports = { auth, rtdb, storage };

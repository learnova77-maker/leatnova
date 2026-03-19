import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
    apiKey: "AIzaSyAPmrrkZcLHRfm-fwFedE-AktZwNQnqNEs",
    authDomain: "my-project-e57d2.firebaseapp.com",
    databaseURL: "https://my-project-e57d2-default-rtdb.firebaseio.com",
    projectId: "my-project-e57d2",
    storageBucket: "my-project-e57d2.firebasestorage.app",
    messagingSenderId: "239945810669",
    appId: "1:239945810669:web:e5f77c929dc2a79a9bc2e4",
};

const app = initializeApp(firebaseConfig);
export const rtdb = getDatabase(app);

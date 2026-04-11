const express = require('express');
const router = express.Router();
const { auth, rtdb, storage } = require('../config/firebase');
const {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} = require('firebase/auth');
const {
    ref,
    set,
    get,
    child
} = require('firebase/database');
const {
    ref: storageRef,
    uploadBytes,
    getDownloadURL
} = require('firebase/storage');
const multer = require('multer');

// Multer setup for file memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Helper to upload to Firebase
async function uploadToFirebase(file, folder, userId) {
    if (!file) return null;
    const fileName = `${folder}/${userId}_${Date.now()}_${file.originalname}`;
    const fileRef = storageRef(storage, fileName);

    const metadata = { contentType: file.mimetype };
    await uploadBytes(fileRef, file.buffer, metadata);
    return await getDownloadURL(fileRef);
}

// Sign up (Updated for Multi-part form-data)
router.post('/signup', upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'idCard', maxCount: 1 }
]), async (req, res) => {
    console.log('--- Incoming Signup Request ---');

    // For non-multipart requests, req.body might still be JSON
    // For multipart, text fields are in req.body
    const { email, password, fullName, role, ...extraInfo } = req.body;

    try {
        // Validation: Password length
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
        }

        let user = null;

        // 1. Create User in Firebase Auth or Use Existing UID from Google Auth
        if (req.body.uid && req.body.isGoogleAuth) {
            // User already authenticated via Google on frontend
            user = { uid: req.body.uid };
        } else {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            user = userCredential.user;
        }

        // 2. Upload Files if any
        let photoUrl = null;
        let idCardUrl = null;

        if (req.files) {
            if (req.files['photo']) {
                photoUrl = await uploadToFirebase(req.files['photo'][0], 'profiles', user.uid);
            }
            if (req.files['idCard']) {
                idCardUrl = await uploadToFirebase(req.files['idCard'][0], 'verifications', user.uid);
            }
        }

        // 3. Save data in Realtime Database
        const userData = {
            fullName,
            email,
            role: role || 'student',
            status: (role === 'teacher' || role === 'school') ? 'pending' : 'active',
            uid: user.uid,
            createdAt: Date.now(),
            photoUrl,
            idCardUrl,
            ...extraInfo
        };

        await set(ref(rtdb, 'users/' + user.uid), userData);

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            user: userData
        });
    } catch (err) {
        console.error('Signup Route Error:', err);
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password, role } = req.body; // Client sends selected role
    console.log(`Login Attempt: ${email} as ${role}`);

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Get user profile from Realtime Database
        const dbRef = ref(rtdb);
        const snapshot = await get(child(dbRef, `users/${user.uid}`));

        if (!snapshot.exists()) {
            return res.status(404).json({ success: false, message: 'User record not found' });
        }

        const userData = snapshot.val();

        // 1. Check Role Mismatch
        if (userData.role !== role) {
            return res.status(403).json({
                success: false,
                message: `This account is a ${userData.role}. Please select the correct role.`
            });
        }

        res.status(200).json({
            success: true,
            user: userData
        });
    } catch (err) {
        res.status(401).json({
            success: false,
            message: 'Invalid credentials or login error',
            error: err.message
        });
    }
});

module.exports = router;

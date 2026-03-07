const express = require('express');
const router = express.Router();
const { rtdb } = require('../config/firebase');
const {
    ref,
    get,
    update,
    child
} = require('firebase/database');

// Get current user profile
router.get('/profile/:uid', async (req, res) => {
    try {
        const dbRef = ref(rtdb);
        const snapshot = await get(child(dbRef, `users/${req.params.uid}`));
        if (!snapshot.exists()) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, user: snapshot.val() });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Update user profile
router.put('/update/:uid', async (req, res) => {
    const { fullName, email, ...updateData } = req.body;
    try {
        const userRef = ref(rtdb, `users/${req.params.uid}`);
        await update(userRef, {
            fullName,
            email,
            ...updateData,
            updatedAt: Date.now()
        });
        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

module.exports = router;

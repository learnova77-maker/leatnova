const express = require('express');
const router = express.Router();
const { push, set, ref, get, update } = require('firebase/database');
const { rtdb } = require('../config/firebase');

// Send Message in Live Support
router.post('/chat/send', async (req, res) => {
    try {
        const { userId, userName, text, sender, mediaUri, mediaType } = req.body;
        if (!userId) return res.status(400).json({ success: false, message: 'User ID is required' });

        const chatRef = ref(rtdb, `support_chats/${userId}`);
        const newMessageRef = push(chatRef);

        await set(newMessageRef, {
            text: text || '',
            sender: sender || 'user',
            userName: userName || 'User',
            mediaUri: mediaUri || null,
            mediaType: mediaType || null,
            read: false,
            createdAt: Date.now()
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get Chat Messages History
router.get('/chat/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const chatRef = ref(rtdb, `support_chats/${userId}`);
        const snapshot = await get(chatRef);

        if (!snapshot.exists()) {
            return res.json({ success: true, messages: [] });
        }

        const data = snapshot.val();
        const messages = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        })).sort((a, b) => a.createdAt - b.createdAt);

        res.json({ success: true, messages });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Mark messages as read
router.post('/chat/mark-read', async (req, res) => {
    try {
        const { userId, senderType = 'support' } = req.body;
        const chatRef = ref(rtdb, `support_chats/${userId}`);
        const snapshot = await get(chatRef);

        if (snapshot.exists()) {
            const data = snapshot.val();
            const updates = {};

            Object.keys(data).forEach(key => {
                if (data[key].sender === senderType && !data[key].read) {
                    updates[`support_chats/${userId}/${key}/read`] = true;
                }
            });

            if (Object.keys(updates).length > 0) {
                await update(ref(rtdb), updates);
            }
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

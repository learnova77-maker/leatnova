const express = require('express');
const router = express.Router();
const { rtdb } = require('../config/firebase');
const { ref, set, push, get, child, update } = require('firebase/database');

// Helper to generate a consistent chat ID between two users
const getChatId = (uid1, uid2) => {
    return [uid1, uid2].sort().join('_');
};

// Send a direct message
router.post('/send', async (req, res) => {
    const { senderId, senderName, receiverId, receiverName, text, mediaUri, mediaType } = req.body;
    try {
        const chatId = getChatId(senderId, receiverId);

        const messageRef = push(ref(rtdb, `chats/${chatId}/messages`));
        const messageData = {
            senderId,
            senderName,
            text: text || '',
            mediaUri: mediaUri || null,
            mediaType: mediaType || 'text',
            createdAt: Date.now(),
            read: false
        };
        await set(messageRef, messageData);

        // Update inbox for sender
        await update(ref(rtdb, `inboxes/${senderId}/${receiverId}`), {
            userId: receiverId,
            userName: receiverName,
            lastMessage: text || 'Media sent',
            lastMessageTime: Date.now(),
            unreadCount: 0
        });

        // Update inbox for receiver
        const receiverInboxRef = ref(rtdb, `inboxes/${receiverId}/${senderId}`);
        const receiverInboxSnap = await get(receiverInboxRef);
        let unreadCount = 1;
        if (receiverInboxSnap.exists()) {
            unreadCount = (receiverInboxSnap.val().unreadCount || 0) + 1;
        }
        await update(receiverInboxRef, {
            userId: senderId,
            userName: senderName,
            lastMessage: text || 'Media sent',
            lastMessageTime: Date.now(),
            unreadCount
        });

        res.json({ success: true, messageId: messageRef.key });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get chat history between two users
router.get('/history/:userId/:otherUserId', async (req, res) => {
    const { userId, otherUserId } = req.params;
    try {
        const chatId = getChatId(userId, otherUserId);
        const snapshot = await get(child(ref(rtdb), `chats/${chatId}/messages`));
        if (snapshot.exists()) {
            const data = snapshot.val();
            const messages = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            })).sort((a, b) => a.createdAt - b.createdAt);
            res.json({ success: true, messages });
        } else {
            res.json({ success: true, messages: [] });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get user inbox
router.get('/inbox/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const snapshot = await get(child(ref(rtdb), `inboxes/${userId}`));
        if (snapshot.exists()) {
            const data = snapshot.val();
            const inbox = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            })).sort((a, b) => b.lastMessageTime - a.lastMessageTime);
            res.json({ success: true, inbox });
        } else {
            res.json({ success: true, inbox: [] });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Mark messages as read
router.post('/mark-read', async (req, res) => {
    const { userId, otherUserId } = req.body;
    try {
        const chatId = getChatId(userId, otherUserId);

        // Mark all messages in the chat as read IF the sender is otherUserId
        const messagesSnap = await get(child(ref(rtdb), `chats/${chatId}/messages`));
        if (messagesSnap.exists()) {
            const messages = messagesSnap.val();
            const updates = {};
            Object.keys(messages).forEach(key => {
                if (messages[key].senderId === otherUserId && !messages[key].read) {
                    updates[`chats/${chatId}/messages/${key}/read`] = true;
                }
            });
            if (Object.keys(updates).length > 0) {
                await update(ref(rtdb), updates);
            }
        }

        // Reset unread count in inbox
        await update(ref(rtdb, `inboxes/${userId}/${otherUserId}`), {
            unreadCount: 0
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get total unread count for sidebar
router.get('/unread-count/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const snapshot = await get(child(ref(rtdb), `inboxes/${userId}`));
        let totalUnread = 0;
        if (snapshot.exists()) {
            const data = snapshot.val();
            Object.keys(data).forEach(key => {
                totalUnread += (data[key].unreadCount || 0);
            });
        }
        res.json({ success: true, totalUnread });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

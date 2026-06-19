const express = require('express');
const router = express.Router();
const {
    ref,
    get,
    update,
    child,
    push,
    set,
    remove
} = require('firebase/database');
const {
    ref: storageRef,
    uploadBytes,
    getDownloadURL
} = require('firebase/storage');
const multer = require('multer');
const { rtdb, storage } = require('../config/firebase');

// Multer setup for file memory storage
const uploadFile = multer({ storage: multer.memoryStorage() });

// Helper to upload to Firebase
async function uploadToFirebase(file, folder, userId) {
    if (!file) return null;
    const fileName = `${folder}/${userId}_${Date.now()}_${file.originalname}`;
    const fileRef = storageRef(storage, fileName);

    const metadata = { contentType: file.mimetype };
    await uploadBytes(fileRef, file.buffer, metadata);
    return await getDownloadURL(fileRef);
}

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
    const { ...updateData } = req.body;
    try {
        const userRef = ref(rtdb, `users/${req.params.uid}`);

        // Remove undefined values to prevent Firebase errors
        const cleanedData = Object.fromEntries(
            Object.entries(updateData).filter(([_, v]) => v !== undefined)
        );

        await update(userRef, {
            ...cleanedData,
            updatedAt: Date.now()
        });

        // Automatically clean up approval chat if the status is active
        if (updateData.status === 'active') {
            const approvalChatRef = ref(rtdb, `approval_chats/${req.params.uid}`);
            const { set } = require('firebase/database');
            await set(approvalChatRef, null);
        }

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// Delete user profile
router.delete('/delete/:uid', async (req, res) => {
    try {
        const userRef = ref(rtdb, `users/${req.params.uid}`);
        const { set } = require('firebase/database');
        await set(userRef, null);
        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get user notifications
router.get('/notifications/:uid', async (req, res) => {
    try {
        const dbRef = ref(rtdb);
        const snapshot = await get(child(dbRef, `notifications/${req.params.uid}`));
        if (!snapshot.exists()) {
            return res.json({ success: true, notifications: [] });
        }

        const notifications = [];
        const data = snapshot.val();
        for (const id in data) {
            notifications.push({ id, ...data[id] });
        }

        // Return sorted by date (newest first)
        notifications.sort((a, b) => b.createdAt - a.createdAt);
        res.json({ success: true, notifications });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Mark notification as read
router.post('/notifications/mark-read', async (req, res) => {
    const { uid, notificationId } = req.body;
    try {
        const notifRef = ref(rtdb, `notifications/${uid}/${notificationId}`);
        await update(notifRef, { read: true });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Mark ALL notifications as read
router.post('/notifications/mark-all-read', async (req, res) => {
    const { uid } = req.body;
    try {
        const snapshot = await get(ref(rtdb, `notifications/${uid}`));
        if (snapshot.exists()) {
            const updates = {};
            snapshot.forEach((childSnapshot) => {
                if (!childSnapshot.val().read) {
                    updates[`notifications/${uid}/${childSnapshot.key}/read`] = true;
                }
            });
            if (Object.keys(updates).length > 0) {
                await update(ref(rtdb), updates);
            }
        }
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Send Announcement (Teacher to Students)
router.post('/announcements/send', async (req, res) => {
    const { teacherId, teacherName, title, message } = req.body;
    try {
        const dbRef = ref(rtdb);

        // 1. Get all students of this teacher (from teacherStudents node)
        const tsSnap = await get(child(dbRef, `teacherStudents/${teacherId}`));
        if (!tsSnap.exists()) {
            return res.status(404).json({ success: false, message: 'No students found for this teacher' });
        }

        const students = tsSnap.val();
        const notificationData = {
            title,
            message,
            type: 'announcement',
            senderId: teacherId,
            senderName: teacherName,
            createdAt: Date.now(),
            read: false
        };

        const updates = {};

        // 2. Create notification for each student
        for (const studentId in students) {
            const newNotifRef = push(child(dbRef, `notifications/${studentId}`));
            updates[`notifications/${studentId}/${newNotifRef.key}`] = notificationData;
        }

        // 3. Keep a record in teacher's announcements history
        const teacherAnnRef = push(child(dbRef, `teacherAnnouncements/${teacherId}`));
        updates[`teacherAnnouncements/${teacherId}/${teacherAnnRef.key}`] = {
            title,
            message,
            createdAt: Date.now()
        };

        await update(ref(rtdb), updates);
        res.json({ success: true, message: 'Announcement sent to all students!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get teacher announcements
router.get('/announcements/history/:teacherId', async (req, res) => {
    try {
        const dbRef = ref(rtdb);
        const snapshot = await get(child(dbRef, `teacherAnnouncements/${req.params.teacherId}`));
        if (!snapshot.exists()) {
            return res.json({ success: true, announcements: [] });
        }

        const announcements = [];
        const data = snapshot.val();
        for (const id in data) {
            announcements.push({ id, ...data[id] });
        }
        announcements.sort((a, b) => b.createdAt - a.createdAt);
        res.json({ success: true, announcements });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Support / Report Problem
router.post('/support/report', async (req, res) => {
    try {
        const { userId, role, issue, description } = req.body;
        const dbRef = ref(rtdb, 'support_tickets');
        const newTicket = push(dbRef);
        await set(newTicket, {
            userId: userId || 'anonymous',
            role: role || 'user',
            issue,
            description,
            status: 'open',
            createdAt: Date.now()
        });
        res.json({ success: true, message: 'Report submitted successfully. We will get back to you soon.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Upload generic file/media
router.post('/upload', uploadFile.single('file'), async (req, res) => {
    try {
        const { userId, folder = 'chat_media' } = req.body;
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

        const downloadURL = await uploadToFirebase(req.file, folder, userId || 'anonymous');
        res.json({ success: true, url: downloadURL });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// --- Approval Chat System Endpoints (Specifically for Registration/Approval) ---

// Send Message in Approval Chat
router.post('/approval/chat/send', async (req, res) => {
    try {
        const { userId, userName, text, sender, mediaUri, mediaType } = req.body;
        if (!userId) return res.status(400).json({ success: false, message: 'User ID is required' });

        const chatRef = ref(rtdb, `approval_chats/${userId}`);
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

// Get Approval Chat Messages History
router.get('/approval/chat/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const chatRef = ref(rtdb, `approval_chats/${userId}`);
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

// Mark all approval messages as read
router.post('/approval/chat/mark-read', async (req, res) => {
    try {
        const { userId, senderType = 'support' } = req.body;
        const chatRef = ref(rtdb, `approval_chats/${userId}`);
        const snapshot = await get(chatRef);

        if (snapshot.exists()) {
            const data = snapshot.val();
            const updates = {};
            Object.keys(data).forEach(key => {
                if (data[key].sender === senderType && !data[key].read) {
                    updates[`approval_chats/${userId}/${key}/read`] = true;
                }
            });
            if (Object.keys(updates).length > 0) await update(ref(rtdb), updates);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Search user by username
router.get('/search/:username', async (req, res) => {
    const { username } = req.params;
    try {
        const usernameSnap = await get(child(ref(rtdb), `usernames/${username.toLowerCase()}`));
        if (!usernameSnap.exists()) {
            return res.json({ success: true, user: null, message: "User not found" });
        }
        const uid = usernameSnap.val();
        const userSnap = await get(child(ref(rtdb), `users/${uid}`));
        if (!userSnap.exists()) {
            return res.json({ success: true, user: null, message: "User profile not found" });
        }

        const userData = userSnap.val();
        res.json({
            success: true, user: {
                uid: userData.uid,
                fullName: userData.fullName,
                username: userData.username,
                photoUrl: userData.photoUrl,
                role: userData.role,
                bio: userData.bio
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

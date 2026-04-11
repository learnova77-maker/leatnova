const express = require('express');
const router = express.Router();
const { rtdb } = require('../config/firebase');
const {
    ref,
    get,
    update,
    child,
    push,
    set,
    remove
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

module.exports = router;

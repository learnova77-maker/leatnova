const express = require('express');
const router = express.Router();
const { rtdb } = require('../config/firebase');
const {
    ref,
    set,
    push,
    get,
    child,
    onValue,
    increment,
    update
} = require('firebase/database');

// Get all posts
router.get('/posts', async (req, res) => {
    try {
        const dbRef = ref(rtdb);
        const snapshot = await get(child(dbRef, 'social_posts'));
        if (snapshot.exists()) {
            const postsData = snapshot.val();
            // Convert to array and sort by newest
            const posts = Object.keys(postsData).map(key => ({
                id: key,
                ...postsData[key]
            })).sort((a, b) => b.createdAt - a.createdAt);
            res.json({ success: true, posts });
        } else {
            res.json({ success: true, posts: [] });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Create post
router.post('/post/create', async (req, res) => {
    const { userId, userName, text, mediaUri, mediaType, fileName } = req.body;
    if (!text && !mediaUri) return res.status(400).json({ success: false, message: 'Post content or media is required' });

    try {
        const postsRef = ref(rtdb, 'social_posts');
        const newPostRef = push(postsRef);
        await set(newPostRef, {
            userId,
            userName,
            text: text || '',
            mediaUri: mediaUri || null,
            mediaType: mediaType || null,
            fileName: fileName || null,
            likesCount: 0,
            commentsCount: 0,
            createdAt: Date.now()
        });
        res.status(201).json({ success: true, id: newPostRef.key });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Like a post
router.post('/post/like', async (req, res) => {
    const { postId, userId, userName } = req.body;
    try {
        const likeRef = ref(rtdb, `social_posts/${postId}/likes/${userId}`);
        const snapshot = await get(likeRef);

        if (snapshot.exists()) {
            // Unlike
            await set(likeRef, null);
            await update(ref(rtdb, `social_posts/${postId}`), {
                likesCount: increment(-1)
            });
            res.json({ success: true, liked: false });
        } else {
            // Like
            await set(likeRef, true);
            await update(ref(rtdb, `social_posts/${postId}`), {
                likesCount: increment(1)
            });

            // Create notification
            const postSnapshot = await get(ref(rtdb, `social_posts/${postId}`));
            const postOwnerId = postSnapshot.val().userId;
            if (postOwnerId !== userId) {
                const notifRef = push(ref(rtdb, `notifications/${postOwnerId}`));
                await set(notifRef, {
                    type: 'like',
                    postId,
                    senderId: userId,
                    senderName: userName || 'Someone',
                    createdAt: Date.now(),
                    read: false
                });
            }

            res.json({ success: true, liked: true });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Comment on a post
router.post('/post/comment', async (req, res) => {
    const { postId, userId, userName, text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Comment text is required' });

    try {
        const commentsRef = ref(rtdb, `social_posts/${postId}/comments`);
        const newCommentRef = push(commentsRef);
        await set(newCommentRef, {
            userId,
            userName,
            text,
            createdAt: Date.now()
        });

        await update(ref(rtdb, `social_posts/${postId}`), {
            commentsCount: increment(1)
        });

        // Create notification
        const postSnapshot = await get(ref(rtdb, `social_posts/${postId}`));
        const postOwnerId = postSnapshot.val().userId;
        if (postOwnerId !== userId) {
            const notifRef = push(ref(rtdb, `notifications/${postOwnerId}`));
            await set(notifRef, {
                type: 'comment',
                postId,
                senderId: userId,
                senderName: userName,
                text,
                createdAt: Date.now(),
                read: false
            });
        }

        res.status(201).json({ success: true, id: newCommentRef.key });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Delete a post
router.delete('/post/delete/:postId', async (req, res) => {
    const { postId } = req.params;
    try {
        await set(ref(rtdb, `social_posts/${postId}`), null);
        res.json({ success: true, message: 'Post deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get notifications
router.get('/notifications/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const snapshot = await get(ref(rtdb, `notifications/${userId}`));
        if (snapshot.exists()) {
            const data = snapshot.val();
            const notifications = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            })).sort((a, b) => b.createdAt - a.createdAt);
            res.json({ success: true, notifications });
        } else {
            res.json({ success: true, notifications: [] });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Mark all notifications as read
router.post('/notifications/read-all', async (req, res) => {
    const { userId } = req.body;
    try {
        const snapshot = await get(ref(rtdb, `notifications/${userId}`));
        if (snapshot.exists()) {
            const updates = {};
            snapshot.forEach((childSnapshot) => {
                updates[`notifications/${userId}/${childSnapshot.key}/read`] = true;
            });
            await update(ref(rtdb), updates);
        }
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Delete a notification
router.delete('/notifications/:userId/:notifId', async (req, res) => {
    const { userId, notifId } = req.params;
    try {
        await set(ref(rtdb, `notifications/${userId}/${notifId}`), null);
        res.json({ success: true, message: 'Notification deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Report a post
router.post('/post/report', async (req, res) => {
    const { postId, userId, userName, reportType, description } = req.body;
    try {
        const reportsRef = ref(rtdb, 'post_reports');
        const newReportRef = push(reportsRef);
        await set(newReportRef, {
            postId,
            userId,
            userName,
            reportType,
            description,
            createdAt: Date.now()
        });
        res.json({ success: true, message: 'Post reported successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

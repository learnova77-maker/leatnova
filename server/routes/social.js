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
    update,
    remove
} = require('firebase/database');

// Get all posts
// Get posts with pagination
router.get('/posts', async (req, res) => {
    try {
        const limitCount = parseInt(req.query.limit) || 10;
        const lastTimestamp = parseInt(req.query.lastTimestamp) || null;

        const dbRef = ref(rtdb);
        const snapshot = await get(child(dbRef, 'social_posts'));

        if (snapshot.exists()) {
            const postsData = snapshot.val();
            let posts = Object.keys(postsData).map(key => ({
                id: key,
                ...postsData[key]
            })).sort((a, b) => b.createdAt - a.createdAt);

            // Pagination Logic
            if (lastTimestamp) {
                posts = posts.filter(p => p.createdAt < lastTimestamp);
            }

            const hasMore = posts.length > limitCount;
            const paginatedPosts = posts.slice(0, limitCount);

            res.json({
                success: true,
                posts: paginatedPosts,
                hasMore
            });
        } else {
            res.json({ success: true, posts: [], hasMore: false });
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

        // Create notification safely
        const postSnapshot = await get(ref(rtdb, `social_posts/${postId}`));
        const postVal = postSnapshot.val();

        if (postVal && postVal.userId) {
            const postOwnerId = postVal.userId;
            if (postOwnerId !== userId) {
                const notifRef = push(ref(rtdb, `notifications/${postOwnerId}`));
                await set(notifRef, {
                    type: 'comment',
                    postId,
                    senderId: userId,
                    senderName: userName || 'Someone',
                    text,
                    createdAt: Date.now(),
                    read: false
                });
            }
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

// Get user profile stats and info
router.get('/user/profile/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const dbRef = ref(rtdb);

        // Fetch user basic info
        const userSnap = await get(child(dbRef, `users/${userId}`));
        if (!userSnap.exists()) return res.status(404).json({ success: false, message: 'User not found' });
        const user = userSnap.val();

        // Fetch followers and following
        const followersSnap = await get(child(dbRef, `social_followers/${userId}`));
        const followingSnap = await get(child(dbRef, `social_following/${userId}`));

        // Fetch post count
        const postsSnap = await get(child(dbRef, 'social_posts'));
        let postCount = 0;
        if (postsSnap.exists()) {
            const posts = postsSnap.val();
            postCount = Object.values(posts).filter(p => p.userId === userId).length;
        }

        res.json({
            success: true,
            user: {
                uid: userId,
                fullName: user.fullName,
                photoUrl: user.photoUrl,
                role: user.role,
                bio: user.bio,
                bannerUrl: user.bannerUrl
            },
            stats: {
                followers: followersSnap.exists() ? Object.keys(followersSnap.val()).length : 0,
                following: followingSnap.exists() ? Object.keys(followingSnap.val()).length : 0,
                posts: postCount
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Follow / Unfollow user
router.post('/user/follow', async (req, res) => {
    const { followerId, followingId, followerName } = req.body;
    if (followerId === followingId) return res.status(400).json({ success: false, message: 'You cannot follow yourself' });

    try {
        const followingRef = ref(rtdb, `social_following/${followerId}/${followingId}`);
        const followersRef = ref(rtdb, `social_followers/${followingId}/${followerId}`);

        const snapshot = await get(followingRef);
        if (snapshot.exists()) {
            // Unfollow
            await update(ref(rtdb), {
                [`social_following/${followerId}/${followingId}`]: null,
                [`social_followers/${followingId}/${followerId}`]: null
            });
            res.json({ success: true, followed: false });
        } else {
            // Follow
            await update(ref(rtdb), {
                [`social_following/${followerId}/${followingId}`]: true,
                [`social_followers/${followingId}/${followerId}`]: true
            });

            // Create notification
            const notifRef = push(ref(rtdb, `notifications/${followingId}`));
            await set(notifRef, {
                type: 'follow',
                senderId: followerId,
                senderName: followerName || 'Someone',
                createdAt: Date.now(),
                read: false
            });

            res.json({ success: true, followed: true });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get posts by specific user
router.get('/user/posts/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const dbRef = ref(rtdb);
        const snapshot = await get(child(dbRef, 'social_posts'));
        if (snapshot.exists()) {
            const postsData = snapshot.val();
            const posts = Object.keys(postsData)
                .map(key => ({ id: key, ...postsData[key] }))
                .filter(p => p.userId === userId)
                .sort((a, b) => b.createdAt - a.createdAt);
            res.json({ success: true, posts });
        } else {
            res.json({ success: true, posts: [] });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Check if following
router.get('/user/is-following/:followerId/:followingId', async (req, res) => {
    const { followerId, followingId } = req.params;
    try {
        const snap = await get(ref(rtdb, `social_following/${followerId}/${followingId}`));
        res.json({ success: true, isFollowing: snap.exists() });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get list of users a user is following
router.get('/user/following-ids/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const snap = await get(ref(rtdb, `social_following/${userId}`));
        if (snap.exists()) {
            res.json({ success: true, followingIds: Object.keys(snap.val()) });
        } else {
            res.json({ success: true, followingIds: [] });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Create a story
router.post('/story/create', async (req, res) => {
    const { userId, userName, userAvatar, mediaUri, mediaType, text, backgroundColor } = req.body;

    try {
        const storiesRef = ref(rtdb, 'social_stories');
        const newStoryRef = push(storiesRef);
        await set(newStoryRef, {
            userId,
            userName,
            userAvatar: userAvatar || null,
            mediaUri: mediaUri || null,
            mediaType: mediaType || 'image',
            text: text || null,
            backgroundColor: backgroundColor || null,
            createdAt: Date.now()
        });
        res.status(201).json({ success: true, id: newStoryRef.key });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get active stories for followed users only
router.post('/stories/filtered', async (req, res) => {
    const { userId, followingIds = [] } = req.body;
    try {
        const storiesRef = ref(rtdb, 'social_stories');
        const snapshot = await get(storiesRef);

        if (snapshot.exists()) {
            const now = Date.now();
            const period = 24 * 60 * 60 * 1000;
            const storiesData = snapshot.val();

            // Include current user in the filter list
            const allowedUserIds = [...followingIds, userId];

            const filteredStories = Object.keys(storiesData)
                .map(key => ({ id: key, ...storiesData[key] }))
                .filter(s =>
                    (now - s.createdAt) < period &&
                    allowedUserIds.includes(s.userId)
                );

            res.json({ success: true, stories: filteredStories });
        } else {
            res.json({ success: true, stories: [] });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Delete a story
router.delete('/story/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const storyRef = ref(rtdb, `social_stories/${id}`);
        await remove(storyRef);
        res.json({ success: true, message: 'Story deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

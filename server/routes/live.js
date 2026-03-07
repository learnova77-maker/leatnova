const express = require('express');
const router = express.Router();
const { RtcTokenBuilder, RtcRole } = require('agora-token');
const { rtdb } = require('../config/firebase');
const { ref, set, push, get, child, update } = require('firebase/database');

const APP_ID = process.env.AGORA_APP_ID || 'agora_app_id_placeholder';
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || 'agora_app_cert_placeholder';

// Generator RTC Token
router.post('/token', (req, res) => {
    const { channelName, uid, role } = req.body;

    if (!channelName) {
        return res.status(400).json({ success: false, message: 'channelName is required' });
    }

    // Role: 1 = Publisher (Teacher), 2 = Subscriber (Student)
    const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    // Token validity in seconds (e.g., 2 hours)
    const expirationTimeInSeconds = 3600 * 2;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    console.log(`Generating token for ${channelName}, uid: ${uid}, role: ${role}`);

    try {
        const token = RtcTokenBuilder.buildTokenWithUid(
            APP_ID,
            APP_CERTIFICATE,
            channelName,
            uid || 0,
            agoraRole,
            privilegeExpiredTs,
            privilegeExpiredTs
        );

        res.json({ success: true, token, appId: APP_ID });
    } catch (err) {
        console.error('Token Generation Error:', err);
        res.status(500).json({ success: false, message: 'Could not generate token' });
    }
});

// Create/Update Live Session in Realtime DB
router.post('/session/start', async (req, res) => {
    const { channelName, teacherId, teacherName, title } = req.body;
    try {
        const sessionsRef = ref(rtdb, 'live_sessions');
        const newSessionRef = push(sessionsRef);
        const sessionData = {
            id: newSessionRef.key,
            channelName,
            teacherId,
            teacherName,
            title,
            status: 'live',
            startedAt: Date.now()
        };
        await set(newSessionRef, sessionData);
        res.json({ success: true, session: sessionData });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// End Live Session
router.post('/session/end', async (req, res) => {
    const { sessionId } = req.body;
    try {
        const sessionRef = ref(rtdb, `live_sessions/${sessionId}`);
        await update(sessionRef, { status: 'ended', endedAt: Date.now() });
        res.json({ success: true, message: 'Session ended' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get Active Sessions for Students
router.get('/sessions/active', async (req, res) => {
    try {
        const dbRef = ref(rtdb);
        const snapshot = await get(child(dbRef, 'live_sessions'));
        if (snapshot.exists()) {
            const data = snapshot.val();
            const active = Object.keys(data)
                .map(key => ({ id: key, ...data[key] }))
                .filter(s => s.status === 'live');
            res.json({ success: true, sessions: active });
        } else {
            res.json({ success: true, sessions: [] });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

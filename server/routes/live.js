const express = require('express');
const router = express.Router();
const { RtcTokenBuilder, RtcRole } = require('agora-token');
const { rtdb, storage } = require('../config/firebase');
const { ref, set, push, get, child, update } = require('firebase/database');
const { ref: storageRef, getDownloadURL, listAll } = require('firebase/storage');
const agoraService = require('../services/agoraService');

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
    const { channelName, teacherId, teacherName, title, courseId, moduleId, lectureId } = req.body;
    console.log(`[Live] Starting session for channel: ${channelName}`);
    console.log('DEBUG: Incoming req.body:', JSON.stringify(req.body, null, 2));

    if (!process.env.AGORA_CUSTOMER_ID || !process.env.AGORA_CUSTOMER_CERTIFICATE) {
        console.error('[Live] Missing Agora REST credentials in .env');
        return res.status(500).json({ success: false, message: 'Server configuration error: Missing Agora Credentials' });
    }

    try {
        const recorderUid = 999; // Fixed UID for recorder bot

        // 1. Acquire Resource ID
        console.log('[Live] Step 1: Acquiring resource ID...');
        const resourceId = await agoraService.acquire(channelName, recorderUid);
        console.log(`[Live] Resource ID Acquired: ${resourceId}`);

        // 2. Generate Token for Recorder
        const expirationTimeInSeconds = 3600 * 2;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
        const recorderToken = RtcTokenBuilder.buildTokenWithUid(
            APP_ID,
            APP_CERTIFICATE,
            channelName,
            recorderUid,
            RtcRole.SUBSCRIBER,
            privilegeExpiredTs,
            privilegeExpiredTs
        );

        // 3. Start Recording
        console.log('[Live] Step 2: Starting cloud recording...');
        const sid = await agoraService.start(resourceId, channelName, recorderUid, recorderToken);
        console.log(`[Live] Recording started with sid: ${sid}`);

        const sessionsRef = ref(rtdb, 'live_sessions');
        const newSessionRef = push(sessionsRef);
        const sessionData = {
            id: newSessionRef.key,
            channelName,
            teacherId,
            teacherName,
            title,
            status: 'live',
            startedAt: Date.now(),
            recording: {
                resourceId,
                sid,
                recorderUid
            }
        };

        // Only add these if they exist to avoid Firebase "undefined" error
        if (courseId) sessionData.courseId = courseId;
        if (moduleId) sessionData.moduleId = moduleId;
        if (lectureId) sessionData.lectureId = lectureId;

        await set(newSessionRef, sessionData);
        console.log('[Live] Session successfully registered in RTDB.');
        res.json({ success: true, session: sessionData });
    } catch (err) {
        console.error('[Live] ERROR starting session:', err.response?.data || err.message);
        res.status(500).json({
            success: false,
            message: 'Failed to start live session recording',
            error: err.response?.data?.message || err.message
        });
    }
});

// End Live Session
router.post('/session/end', async (req, res) => {
    const { sessionId } = req.body;
    console.log(`[Live] Ending session: ${sessionId}`);
    try {
        const dbRef = ref(rtdb);
        const sessionSnap = await get(child(dbRef, `live_sessions/${sessionId}`));

        if (!sessionSnap.exists()) {
            console.error(`[Live] Session ${sessionId} not found`);
            return res.status(404).json({ success: false, message: 'Session not found in database' });
        }

        const session = sessionSnap.val();
        const bucket = process.env.FIREBASE_STORAGE_BUCKET || 'my-project-e57d2.firebasestorage.app';
        const sanitizedChannelName = session.channelName.replace(/\s+/g, '_');

        // 1. IMMEDIATELY mark status as 'ended' so students stop seeing "Join Live"
        const sessionRef = ref(rtdb, `live_sessions/${sessionId}`);
        await update(sessionRef, {
            status: 'ended',
            endedAt: Date.now(),
        });
        console.log(`[Live] Session ${sessionId} immediately marked as ended.`);

        // 2. Respond IMMEDIATELY to prevent frontend from hanging
        res.json({ success: true, message: 'Session end initiated in background' });

        // 3. Perform recording cleanup in the BACKGROUND
        (async () => {
            const debugLogs = [];
            debugLogs.push(`Started background cleanup at ${new Date().toISOString()}`);
            try {
                let recordingUrl = null;
                let fileList = [];

                if (session.recording && session.recording.resourceId && session.recording.sid) {
                    debugLogs.push(`Recording metadata exists. SID: ${session.recording.sid}`);
                    // Step A: Query
                    try {
                        const queryResult = await agoraService.query(session.recording.resourceId, session.recording.sid);
                        debugLogs.push(`Query successful. Found ${queryResult?.serverResponse?.fileList?.length || 0} files.`);
                        if (queryResult?.serverResponse?.fileList) fileList = queryResult.serverResponse.fileList;
                    } catch (e) {
                        debugLogs.push(`Query failed: ${e.response?.data?.message || e.message}`);
                    }

                    // Step B: Stop (Wait 2s for data flush)
                    await new Promise(r => setTimeout(r, 2000));
                    try {
                        const stopResult = await agoraService.stop(
                            session.recording.resourceId, session.recording.sid,
                            session.channelName, session.recording.recorderUid
                        );
                        debugLogs.push(`Stop successful. Found ${stopResult.files?.length || 0} files.`);
                        if (stopResult.files && stopResult.files.length > 0) fileList = stopResult.files;
                    } catch (e) {
                        debugLogs.push(`Stop failed: ${e.response?.data?.message || e.message}`);
                    }

                    // Step C: Generate URL using Agora's provided filenames (Wait 3s for GCS sync)
                    await new Promise(r => setTimeout(r, 3000));

                    // Agora returns fileList as a string or array depending on mode.
                    // With avFileType: ["hls","mp4"], both .m3u8 and .mp4 are generated.
                    // We PREFER .mp4 because it's a single playable file.
                    let targetFileName = null;

                    if (typeof fileList === 'string' && fileList.length > 0) {
                        // It's a raw filename string from Agora (usually the .m3u8)
                        // Construct .mp4 filename: Agora uses pattern: SID_channelName.mp4
                        const mp4Name = fileList.replace('.m3u8', '.mp4');
                        targetFileName = mp4Name;
                        debugLogs.push(`fileList is string: "${fileList}", using MP4: "${mp4Name}"`);
                    } else if (Array.isArray(fileList) && fileList.length > 0) {
                        // Array of objects with .fileName - prefer .mp4
                        const mp4 = fileList.find(f => f?.fileName?.endsWith('.mp4'));
                        const m3u8 = fileList.find(f => f?.fileName?.endsWith('.m3u8'));
                        targetFileName = mp4 ? mp4.fileName : (m3u8 ? m3u8.fileName : fileList[0].fileName);
                        debugLogs.push(`fileList is array, picked: "${targetFileName}"`);
                    } else if (fileList && typeof fileList === 'object') {
                        const vals = Object.values(fileList);
                        if (vals.length > 0) {
                            const mp4 = vals.find(f => f?.fileName?.endsWith('.mp4'));
                            const m3u8 = vals.find(f => f?.fileName?.endsWith('.m3u8'));
                            targetFileName = mp4 ? mp4.fileName : (m3u8 ? m3u8.fileName : (vals[0].fileName || vals[0]));
                            debugLogs.push(`fileList is object, picked: "${targetFileName}"`);
                        }
                    }

                    if (targetFileName) {
                        // Build the full storage path. If Agora already includes "recordings/",
                        // use as-is. Otherwise prepend our prefix.
                        let exactFilePath = targetFileName;
                        if (!targetFileName.startsWith('recordings/')) {
                            exactFilePath = `recordings/${sanitizedChannelName}/${targetFileName}`;
                        }
                        debugLogs.push(`Full storage path: ${exactFilePath}`);

                        for (let attempt = 1; attempt <= 4; attempt++) {
                            try {
                                const fileRef = storageRef(storage, exactFilePath);
                                recordingUrl = await getDownloadURL(fileRef);
                                debugLogs.push(`Got download URL on attempt ${attempt}`);
                                break;
                            } catch (e) {
                                debugLogs.push(`Attempt ${attempt} failed: ${e.message}`);
                                await new Promise(r => setTimeout(r, 4000));
                            }
                        }

                        // Fallback REST URL logic if SDK auth fails
                        if (!recordingUrl) {
                            const encodedPath = encodeURIComponent(exactFilePath);
                            recordingUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
                            debugLogs.push(`Using REST fallback: ${recordingUrl}`);
                        }
                    } else {
                        debugLogs.push(`ERROR: Could not extract filename. Raw fileList value: ${JSON.stringify(fileList)}`);
                    }
                } else {
                    debugLogs.push(`ERROR: Missing recording metadata (resourceId or sid).`);
                }

                // 3. Update Database with recording URL (whenever it's ready)
                debugLogs.push(`Processing complete. URL exists: ${!!recordingUrl}`);
                const bgSessionRef = ref(rtdb, `live_sessions/${sessionId}`);
                await update(bgSessionRef, {
                    recordingUrl: recordingUrl || null,
                    serverDebugTrace: JSON.stringify(debugLogs)
                });

                if (session.courseId && session.moduleId && session.lectureId && recordingUrl) {
                    const lecturePath = `courses/${session.courseId}/modules/${session.moduleId}/lectures/${session.lectureId}`;
                    await update(ref(rtdb, lecturePath), {
                        url: recordingUrl,
                        type: 'Video',
                        isRecorded: true,
                        recordedAt: Date.now()
                    });
                }
            } catch (bgErr) {
                debugLogs.push(`CRITICAL BACKGROUND ERROR: ${bgErr.message}`);
                const sessionRef = ref(rtdb, `live_sessions/${sessionId}`);
                await update(sessionRef, { serverDebugTrace: JSON.stringify(debugLogs) }).catch(() => { });
            }
        })();
    } catch (err) {
        console.error('[Live] Session End Error:', err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: err.message });
        }
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

// Get Recorded (Ended) Sessions for Students to watch replays
router.get('/sessions/recorded', async (req, res) => {
    try {
        const dbRef = ref(rtdb);
        const snapshot = await get(child(dbRef, 'live_sessions'));
        if (snapshot.exists()) {
            const data = snapshot.val();
            const recorded = Object.keys(data)
                .map(key => ({ id: key, ...data[key] }))
                .filter(s => s.status === 'ended')
                .sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));
            res.json({ success: true, sessions: recorded });
        } else {
            res.json({ success: true, sessions: [] });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Broadcast "Live Now!" notification to all enrolled students
router.post('/broadcast-live-now', async (req, res) => {
    const { courseId, teacherId, lectureTitle } = req.body;
    try {
        const dbRef = ref(rtdb);
        const enrollmentsSnap = await get(child(dbRef, 'enrollments'));
        if (enrollmentsSnap.exists()) {
            const allEnrollments = enrollmentsSnap.val();
            for (const studentId in allEnrollments) {
                if (allEnrollments[studentId][courseId]) {
                    const notifRef = push(child(dbRef, `notifications/${studentId}`));
                    set(notifRef, {
                        title: `🔴 Live Now!`,
                        message: `Your teacher just started a live class: "${lectureTitle}". Join now!`,
                        type: 'live-now',
                        courseId,
                        isRead: false,
                        timestamp: Date.now()
                    });
                }
            }
        }
        res.json({ success: true, message: 'Live Now notifications sent to all enrolled students.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Broadcast "Starting Soon!" notification (2 mins before)
router.post('/broadcast-starting-soon', async (req, res) => {
    const { courseId, teacherId, lectureTitle } = req.body;
    try {
        const dbRef = ref(rtdb);
        const enrollmentsSnap = await get(child(dbRef, 'enrollments'));
        if (enrollmentsSnap.exists()) {
            const allEnrollments = enrollmentsSnap.val();
            for (const studentId in allEnrollments) {
                if (allEnrollments[studentId][courseId]) {
                    const notifRef = push(child(dbRef, `notifications/${studentId}`));
                    set(notifRef, {
                        title: `⏳ Starting Soon!`,
                        message: `Your class "${lectureTitle}" is starting in 2 minutes. Get ready!`,
                        type: 'live-starting-soon',
                        courseId,
                        isRead: false,
                        timestamp: Date.now()
                    });
                }
            }
        }
        res.json({ success: true, message: 'Starting soon notifications sent.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Broadcast "Live Ended" notification
router.post('/broadcast-live-ended', async (req, res) => {
    const { courseId, teacherId, lectureTitle } = req.body;
    try {
        const dbRef = ref(rtdb);
        const enrollmentsSnap = await get(child(dbRef, 'enrollments'));
        if (enrollmentsSnap.exists()) {
            const allEnrollments = enrollmentsSnap.val();
            for (const studentId in allEnrollments) {
                if (allEnrollments[studentId][courseId]) {
                    const notifRef = push(child(dbRef, `notifications/${studentId}`));
                    set(notifRef, {
                        title: `🏁 Class Ended`,
                        message: `The live session for "${lectureTitle}" has ended. Hope you learned something new!`,
                        type: 'live-ended',
                        courseId,
                        isRead: false,
                        timestamp: Date.now()
                    });
                }
            }
        }
        res.json({ success: true, message: 'Live ended notifications sent.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

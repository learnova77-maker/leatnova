const cron = require('node-cron');
const { rtdb } = require('../config/firebase');
const { ref, get, child, push, set, update, remove } = require('firebase/database');

/**
 * Optimized Server-side Cron Job (High-Performance Mode).
 * Uses flat indices 'scheduled_lives' and 'course_enrollments' for O(1) performance.
 */
const initCronJobs = () => {
    // Schedule: Every minute
    cron.schedule('* * * * *', async () => {
        console.log('[Cron] Checking high-performance schedule index...');
        try {
            const dbRef = ref(rtdb);

            // 1. Get ONLY upcoming/scheduled lives (Optimized Flat Node)
            const scheduleSnap = await get(child(dbRef, 'scheduled_lives'));
            if (!scheduleSnap.exists()) return;

            const scheduledLives = scheduleSnap.val();
            const now = Date.now();
            const twoMinutesFromNow = now + (2 * 60 * 1000);

            for (const lecId in scheduledLives) {
                const live = scheduledLives[lecId];

                // If class starts within 2 mins and hasn't been notified
                if (live.scheduledAt && !live.preNotified) {
                    const scheduledTime = new Date(live.scheduledAt).getTime();

                    // If class starts within the next 2 minutes
                    if (scheduledTime > now && scheduledTime <= twoMinutesFromNow) {
                        console.log(`[Cron] High-performance trigger for: ${live.title}`);

                        // A. Mark as notified in flat index AND original course lecture path
                        const updateData = { preNotified: true };
                        await update(ref(rtdb, `scheduled_lives/${lecId}`), updateData);

                        const originalLecPath = `courses/${live.courseId}/modules/${live.moduleId}/lectures/${lecId}`;
                        await update(ref(rtdb, originalLecPath), updateData);

                        // B. Fetch ONLY students for this specific course (Optimized Index)
                        const studentsSnap = await get(child(dbRef, `course_enrollments/${live.courseId}`));
                        if (studentsSnap.exists()) {
                            const students = studentsSnap.val();

                            for (const studentId in students) {
                                const notifRef = push(child(dbRef, `notifications/${studentId}`));
                                await set(notifRef, {
                                    title: `⏳ Starting Soon!`,
                                    message: `Your class "${live.title}" is starting in 2 minutes. Get ready!`,
                                    type: 'live-starting-soon',
                                    courseId: live.courseId,
                                    lectureId: lecId,
                                    isRead: false,
                                    timestamp: Date.now()
                                });
                            }
                        }
                        console.log(`[Cron] Notifications sent successfully via optimized index.`);
                    } else if (scheduledTime < now - (60 * 60 * 1000)) {
                        // C. Cleanup: If the live was more than an hour ago, remove it from flat index to keep it tiny
                        await remove(ref(rtdb, `scheduled_lives/${lecId}`));
                    }
                }
            }
        } catch (error) {
            console.error('[Cron] Major Error in Optimized Cron Service:', error);
        }
    });

    console.log('[Cron] High-Performance Live Class Monitor initialized.');
};

module.exports = { initCronJobs };

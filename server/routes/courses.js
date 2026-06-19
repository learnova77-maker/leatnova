const express = require('express');
const router = express.Router();
const { rtdb } = require('../config/firebase');
const {
    ref,
    set,
    push,
    get,
    child,
    remove
} = require('firebase/database');

// Delete a course (teacher)
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const dbRef = ref(rtdb);

        // 1. Get course data first to find the instructor
        const courseSnap = await get(child(dbRef, `courses/${id}`));
        if (!courseSnap.exists()) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }
        const courseData = courseSnap.val();
        const teacherId = courseData.instructorId || courseData.userId;

        // 2. Delete the course itself
        await remove(ref(rtdb, `courses/${id}`));

        // 3. Cascade Cleanup: Remove from EVERYWHERE
        if (teacherId) {
            const studentsSnap = await get(child(dbRef, `teacherStudents/${teacherId}`));
            if (studentsSnap.exists()) {
                const students = studentsSnap.val();
                for (const studentId in students) {
                    // Check if this student was enrolled in THE deleted course
                    if (students[studentId].courseId === id) {
                        // A. Remove from teacher's student list
                        await remove(ref(rtdb, `teacherStudents/${teacherId}/${studentId}`));

                        // B. Remove from student's enrolled courses list
                        await remove(ref(rtdb, `studentCourses/${studentId}/${id}`));

                        // C. Remove from student's legacy enrollments
                        await remove(ref(rtdb, `enrollments/${studentId}/${id}`));

                        console.log(`Deep Cleanup: Removed course ${id} from student ${studentId} dashboard`);
                    }
                }
            }
        }

        res.json({ success: true, message: 'Course deleted from teacher and all student dashboards' });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get all courses (student)
router.get('/', async (req, res) => {
    try {
        const dbRef = ref(rtdb);
        const snapshot = await get(child(dbRef, 'courses'));
        if (snapshot.exists()) {
            const coursesData = snapshot.val();
            const courses = Object.keys(coursesData).map(key => ({
                id: key,
                ...coursesData[key]
            }));
            res.json({ success: true, courses });
        } else {
            res.json({ success: true, courses: [] });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get teacher-specific dashboard data
router.get('/teacher/:instructorId', async (req, res) => {
    const { instructorId } = req.params;
    try {
        const dbRef = ref(rtdb);
        const snapshot = await get(child(dbRef, 'courses'));

        let teacherCourses = [];
        if (snapshot.exists()) {
            const allCourses = snapshot.val();
            teacherCourses = Object.keys(allCourses)
                .map(key => ({ id: key, ...allCourses[key] }))
                .filter(course => course.instructorId === instructorId);
        }

        // Calculate Stats
        const stats = {
            totalCourses: teacherCourses.length,
            totalStudents: 0, // Will implement enrollment logic later
            totalHours: 0     // Will calculate from lectures later
        };

        res.json({
            success: true,
            courses: teacherCourses,
            stats
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get course details via POST (Vercel-friendly fallback for tricky IDs)
router.post('/details', async (req, res) => {
    const { courseId } = req.body;
    if (!courseId) {
        return res.status(400).json({ success: false, message: 'courseId is required in body' });
    }
    try {
        const dbRef = ref(rtdb);
        const snapshot = await get(child(dbRef, `courses/${courseId}`));
        if (snapshot.exists()) {
            res.json({ success: true, course: { id: courseId, ...snapshot.val() } });
        } else {
            res.status(404).json({ success: false, message: 'Course not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get course details (student/teacher) - path param version
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const dbRef = ref(rtdb);
        const snapshot = await get(child(dbRef, `courses/${id}`));
        if (snapshot.exists()) {
            res.json({ success: true, course: { id, ...snapshot.val() } });
        } else {
            res.status(404).json({ success: false, message: 'Course not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get course analytics (teacher)
router.get('/:id/analytics', async (req, res) => {
    const { id } = req.params;
    try {
        const dbRef = ref(rtdb);
        const snapshot = await get(child(dbRef, `courses/${id}`));
        if (!snapshot.exists()) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        let totalStudents = 0;
        let totalHours = 0;
        let chartData = [];

        // 1. Scan the global enrollments root node
        const enrollmentsSnap = await get(child(dbRef, 'enrollments'));
        if (enrollmentsSnap.exists()) {
            const allEnrollments = enrollmentsSnap.val();

            let totalSeconds = 0;
            const studentsEnrolled = [];

            // 2. Iterate dynamically over any student who has this courseId registered
            for (const studentId in allEnrollments) {
                if (allEnrollments[studentId][id]) {
                    const enrollmentData = allEnrollments[studentId][id];
                    studentsEnrolled.push(enrollmentData);

                    // Look for detailed module progress within the enrollment record
                    if (enrollmentData.progress) {
                        Object.values(enrollmentData.progress).forEach(prog => {
                            // Support multiple watch progress variables used across branches
                            if (prog.durationWatched) {
                                totalSeconds += parseInt(prog.durationWatched, 10);
                            } else if (prog.watchedSeconds) {
                                totalSeconds += parseInt(prog.watchedSeconds, 10);
                            }
                        });
                    }
                }
            }

            totalStudents = studentsEnrolled.length;

            let totalDurationStr = "0s";
            if (totalSeconds > 0) {
                const h = Math.floor(totalSeconds / 3600);
                const m = Math.floor((totalSeconds % 3600) / 60);
                const s = totalSeconds % 60;

                if (h > 0) totalDurationStr = `${h}h ${m}m ${s}s`;
                else if (m > 0) totalDurationStr = `${m}m ${s}s`;
                else totalDurationStr = `${s}s`;
            }
            totalHours = totalDurationStr; // re-purposing variable for the frontend

        } // Close enrollmentsSnap check

        const courseData = snapshot.val();
        const basePrice = parseFloat(courseData.price) || 200;
        const commissionPercent = 45;
        const totalEarnings = basePrice * totalStudents;
        const commissionAmount = (totalEarnings * commissionPercent) / 100;
        const netEarnings = totalEarnings - commissionAmount;

        res.json({
            success: true,
            analytics: {
                totalStudents,
                totalHours,
                thumbnail: courseData.thumbnail || null,
                coursePrice: basePrice,
                totalEarnings,
                commissionPercent,
                commissionAmount,
                netEarnings
            }
        });
    } catch (err) {
        console.error('Analytics Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Create course (teacher)
router.post('/create', async (req, res) => {
    const { title, instructorId, ...extraInfo } = req.body;
    try {
        const coursesRef = ref(rtdb, 'courses');
        const newCourseRef = push(coursesRef);
        await set(newCourseRef, {
            title,
            instructorId,
            createdAt: Date.now(),
            status: 'pending',
            ...extraInfo
        });
        res.status(201).json({ success: true, id: newCourseRef.key });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// Add module (teacher)
router.post('/module/add', async (req, res) => {
    const { courseId, moduleTitle } = req.body;
    try {
        const modulesRef = ref(rtdb, `courses/${courseId}/modules`);
        const newModuleRef = push(modulesRef);
        await set(newModuleRef, {
            title: moduleTitle,
            createdAt: Date.now(),
        });
        res.status(201).json({ success: true, moduleId: newModuleRef.key });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// Add lecture (teacher)
router.post('/lecture/add', async (req, res) => {
    const { courseId, moduleId, lectureTitle, duration, type, isPreviewFree, url, scheduledAt } = req.body;
    try {
        const lecturesRef = ref(rtdb, `courses/${courseId}/modules/${moduleId}/lectures`);
        const newLectureRef = push(lecturesRef);
        await set(newLectureRef, {
            title: lectureTitle,
            duration,
            type,
            isPreviewFree,
            url,
            scheduledAt: scheduledAt || null,
            createdAt: Date.now(),
        });

        // Broadcast notifications exclusively for Scheduled Live Classes
        if (type === 'Live' && scheduledAt) {
            const dbRef = ref(rtdb);

            // 1. ADD TO FLAT SCHEDULE INDEX (For High Performance Cron)
            const scheduleRef = ref(rtdb, `scheduled_lives/${newLectureRef.key}`);
            await set(scheduleRef, {
                lectureId: newLectureRef.key,
                courseId,
                moduleId,
                title: lectureTitle,
                scheduledAt,
                preNotified: false,
                createdAt: Date.now()
            });

            const courseSnap = await get(child(dbRef, `courses/${courseId}`));
            if (courseSnap.exists()) {
                const courseInfo = courseSnap.val();

                // Alert every enrolled student instantly that a Live is scheduled
                const enrollmentsSnap = await get(child(dbRef, 'enrollments'));
                if (enrollmentsSnap.exists()) {
                    const allEnrollments = enrollmentsSnap.val();
                    for (const studentId in allEnrollments) {
                        if (allEnrollments[studentId][courseId]) {
                            const notifRef = push(child(dbRef, `notifications/${studentId}`));
                            set(notifRef, {
                                title: `🔴 Live Class Scheduled!`,
                                message: `Your instructor scheduled a live class: "${lectureTitle}" on ${scheduledAt}.`,
                                type: 'live-scheduled',
                                courseId,
                                isRead: false,
                                timestamp: Date.now()
                            });
                        }
                    }
                }

                // Embed actionable Go Live button on teacher's notification timeline
                if (courseInfo.instructorId) {
                    const tNotifRef = push(child(dbRef, `notifications/${courseInfo.instructorId}`));
                    set(tNotifRef, {
                        title: `⏰ Live Control Ready`,
                        message: `"${lectureTitle}" is scheduled on ${scheduledAt}. Press Action to start streaming!`,
                        type: 'teacher-go-live',
                        courseId,
                        lectureTitle,
                        isRead: false,
                        timestamp: Date.now()
                    });
                }
            }
        }

        res.status(201).json({ success: true, lectureId: newLectureRef.key });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// Delete module (teacher)
router.delete('/module/:courseId/:moduleId', async (req, res) => {
    const { courseId, moduleId } = req.params;
    try {
        await remove(ref(rtdb, `courses/${courseId}/modules/${moduleId}`));
        res.json({ success: true, message: 'Module deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get enrolled courses for a student (with full course details)
router.get('/enrolled/:studentId', async (req, res) => {
    const { studentId } = req.params;
    try {
        const dbRef = ref(rtdb);

        // Priority 1: Check newer studentCourses mapping
        let snapshot = await get(child(dbRef, `studentCourses/${studentId}`));
        let enrolledData = snapshot.exists() ? snapshot.val() : null;

        // Priority 2: Fallback to legacy enrollments node if studentCourses is empty
        if (!enrolledData) {
            const legacySnapshot = await get(child(dbRef, `enrollments/${studentId}`));
            if (legacySnapshot.exists()) {
                enrolledData = legacySnapshot.val();
                console.log(`Found legacy enrollment data for student: ${studentId}`);
            }
        }

        if (!enrolledData) {
            return res.json({ success: true, courses: [] });
        }

        const courseIds = Object.keys(enrolledData);

        // Fetch full course details for each enrolled course
        const courses = [];
        for (const courseId of courseIds) {
            const courseSnap = await get(child(dbRef, `courses/${courseId}`));
            if (courseSnap.exists()) {
                const courseInfo = courseSnap.val();
                courses.push({
                    id: courseId,
                    ...courseInfo,
                    // Prefer metadata from enrollment if available (like enrolledAt)
                    enrolledAt: enrolledData[courseId].enrolledAt || courseInfo.createdAt || Date.now(),
                    isLegacy: !snapshot.exists() // Flag to track source for debugging
                });
            }
        }

        res.json({ success: true, courses });
    } catch (err) {
        console.error('Error fetching enrolled courses:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get all students enrolled under a teacher (with auto-sync fallback)
router.get('/teacher-students/:teacherId', async (req, res) => {
    const { teacherId } = req.params;
    try {
        const dbRef = ref(rtdb);

        // 1. Direct check from teacherStudents node
        const snapshot = await get(child(dbRef, `teacherStudents/${teacherId}`));
        let studentsData = snapshot.exists() ? snapshot.val() : {};

        // 2. Fallback: If no students found, scan all enrollments to find matches (Sync)
        if (Object.keys(studentsData).length === 0) {
            console.log(`Syncing data for teacher ${teacherId}...`);
            // Fetch all courses to find which ones belong to this teacher
            const coursesSnap = await get(child(dbRef, 'courses'));
            if (coursesSnap.exists()) {
                const allCourses = coursesSnap.val();
                const teacherCourseIds = Object.keys(allCourses).filter(
                    id => allCourses[id].instructorId === teacherId
                );

                if (teacherCourseIds.length > 0) {
                    // Fetch all enrollments to find who is in these courses
                    const enrollmentsSnap = await get(child(dbRef, 'enrollments'));
                    if (enrollmentsSnap.exists()) {
                        const allEnrollments = enrollmentsSnap.val();
                        // allEnrollments structure: { studentId: { courseId: data } }
                        for (const studentId in allEnrollments) {
                            for (const courseId in allEnrollments[studentId]) {
                                if (teacherCourseIds.includes(courseId)) {
                                    const enrollment = allEnrollments[studentId][courseId];
                                    // Found a match! Save it for next time
                                    const studentMatch = {
                                        studentId,
                                        studentName: enrollment.studentName || 'Student',
                                        courseId,
                                        courseTitle: enrollment.courseTitle || 'Course',
                                        enrolledAt: enrollment.enrolledAt || Date.now(),
                                    };
                                    studentsData[studentId] = studentMatch;

                                    // Optimization: Persistent fix for this teacher
                                    await set(ref(rtdb, `teacherStudents/${teacherId}/${studentId}`), studentMatch);
                                }
                            }
                        }
                    }
                }
            }
        }

        const students = [];
        const studentIds = Object.keys(studentsData);

        for (const studentId of studentIds) {
            const entry = studentsData[studentId];
            const userSnap = await get(child(dbRef, `users/${studentId}`));
            const userData = userSnap.exists() ? userSnap.val() : {};

            students.push({
                id: studentId,
                name: userData.fullName || entry.studentName || 'Learner',
                email: userData.email || '',
                expertise: userData.expertise || '',
                courseTitle: entry.courseTitle || 'Course',
                enrolledAt: entry.enrolledAt || Date.now(),
            });
        }

        students.sort((a, b) => b.enrolledAt - a.enrolledAt);
        res.json({ success: true, students });
    } catch (err) {
        console.error('Error in teacher-students API:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Update course title (teacher)
router.put('/update/:id', async (req, res) => {
    const { id } = req.params;
    const { title } = req.body;
    try {
        const dbRef = ref(rtdb);

        // 1. Update main course title
        await set(child(dbRef, `courses/${id}/title`), title);

        // 2. Update de-normalized courseTitle in teacherStudents (Optional but better for UI consistency)
        const courseSnap = await get(child(dbRef, `courses/${id}`));
        if (courseSnap.exists()) {
            const courseData = courseSnap.val();
            const teacherId = courseData.instructorId;
            if (teacherId) {
                const teacherStudentsRef = ref(rtdb, `teacherStudents/${teacherId}`);
                const studentsSnap = await get(teacherStudentsRef);
                if (studentsSnap.exists()) {
                    const students = studentsSnap.val();
                    for (const studentId in students) {
                        if (students[studentId].courseId === id) {
                            await set(ref(rtdb, `teacherStudents/${teacherId}/${studentId}/courseTitle`), title);
                        }
                    }
                }
            }
        }

        res.json({ success: true, message: 'Course updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Update module title (teacher)
router.put('/module/update/:courseId/:moduleId', async (req, res) => {
    const { courseId, moduleId } = req.params;
    const { title } = req.body;
    try {
        const dbRef = ref(rtdb);
        await set(child(dbRef, `courses/${courseId}/modules/${moduleId}/title`), title);
        res.json({ success: true, message: 'Module updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Mark lecture as completed (teacher)
router.post('/lecture/mark-completed', async (req, res) => {
    const { courseId, moduleId, lectureId } = req.body;
    try {
        const path = `courses/${courseId}/modules/${moduleId}/lectures/${lectureId}`;
        const { update } = require('firebase/database');
        await update(ref(rtdb, path), { isCompleted: true });

        // Also remove from scheduled lives flat index
        await remove(ref(rtdb, `scheduled_lives/${lectureId}`));

        res.json({ success: true, message: 'Lecture marked as completed' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Add course review (student)
router.post('/reviews/add', async (req, res) => {
    const { courseId, studentId, studentName, rating, text } = req.body;
    try {
        const reviewsRef = ref(rtdb, `courses/${courseId}/reviews`);
        const newReviewRef = push(reviewsRef);
        await set(newReviewRef, {
            studentId,
            studentName,
            rating,
            text,
            createdAt: Date.now()
        });
        res.status(201).json({ success: true, reviewId: newReviewRef.key });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Delete course review (student/teacher)
router.delete('/reviews/:courseId/:reviewId', async (req, res) => {
    const { courseId, reviewId } = req.params;
    try {
        await remove(ref(rtdb, `courses/${courseId}/reviews/${reviewId}`));
        res.json({ success: true, message: 'Review deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

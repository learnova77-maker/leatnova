const express = require('express');
const router = express.Router();
const { rtdb } = require('../config/firebase');
const {
    ref,
    set,
    push,
    get,
    child
} = require('firebase/database');

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
        res.status(201).json({ success: true, lectureId: newLectureRef.key });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

module.exports = router;

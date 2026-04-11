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

// Create Assignment (Teacher)
router.post('/create', async (req, res) => {
    const { teacherId, teacherName, courseId, courseTitle, title, description, fileUrl } = req.body;
    try {
        const dbRef = ref(rtdb);

        // 1. Create the assignment record
        const assignmentRef = push(child(dbRef, 'assignments'));
        const assignmentData = {
            teacherId,
            teacherName,
            courseId,
            courseTitle,
            title,
            description,
            fileUrl: fileUrl || null,
            createdAt: Date.now(),
            status: 'active'
        };

        const updates = {};
        updates[`assignments/${assignmentRef.key}`] = assignmentData;

        // 2. Find all students enrolled in this course
        const enrollmentsSnap = await get(child(dbRef, 'enrollments'));
        let studentCount = 0;

        if (enrollmentsSnap.exists()) {
            const allEnrollments = enrollmentsSnap.val();
            for (const studentId in allEnrollments) {
                if (allEnrollments[studentId][courseId]) {
                    // Assign to this student
                    updates[`studentAssignments/${studentId}/${assignmentRef.key}`] = {
                        assignmentId: assignmentRef.key,
                        teacherId,
                        teacherName,
                        courseId,
                        courseTitle,
                        title,
                        description,
                        fileUrl: fileUrl || null,
                        assignedAt: Date.now(),
                        status: 'pending',
                        submissionUrl: null,
                        submittedAt: null,
                        completedAt: null
                    };
                    studentCount++;
                }
            }
        }

        // 3. Save teacher's assignment record
        updates[`teacherAssignments/${teacherId}/${assignmentRef.key}`] = {
            ...assignmentData,
            studentCount
        };

        await update(ref(rtdb), updates);

        res.status(201).json({
            success: true,
            message: `Assignment sent to ${studentCount} students!`,
            assignmentId: assignmentRef.key
        });
    } catch (err) {
        console.error('Create assignment error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get Teacher's Assignments
router.get('/teacher/:teacherId', async (req, res) => {
    try {
        const dbRef = ref(rtdb);
        const snapshot = await get(child(dbRef, `teacherAssignments/${req.params.teacherId}`));

        if (!snapshot.exists()) {
            return res.json({ success: true, assignments: [] });
        }

        const data = snapshot.val();
        const assignments = [];
        for (const id in data) {
            assignments.push({ id, ...data[id] });
        }
        assignments.sort((a, b) => b.createdAt - a.createdAt);
        res.json({ success: true, assignments });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get Student's Assignments (Homework)
router.get('/student/:studentId', async (req, res) => {
    try {
        const dbRef = ref(rtdb);
        const snapshot = await get(child(dbRef, `studentAssignments/${req.params.studentId}`));

        if (!snapshot.exists()) {
            return res.json({ success: true, assignments: [] });
        }

        const data = snapshot.val();
        const assignments = [];
        for (const id in data) {
            assignments.push({ id, ...data[id] });
        }
        assignments.sort((a, b) => b.assignedAt - a.assignedAt);
        res.json({ success: true, assignments });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Student Submit Assignment
router.post('/submit', async (req, res) => {
    const { studentId, studentName, assignmentId, submissionUrl, submissionFileName } = req.body;
    try {
        const updates = {};

        // Update student's assignment status
        updates[`studentAssignments/${studentId}/${assignmentId}/status`] = 'submitted';
        updates[`studentAssignments/${studentId}/${assignmentId}/submissionUrl`] = submissionUrl;
        updates[`studentAssignments/${studentId}/${assignmentId}/submissionFileName`] = submissionFileName || 'submission';
        updates[`studentAssignments/${studentId}/${assignmentId}/submittedAt`] = Date.now();

        // Create submission record for teacher
        const dbRef = ref(rtdb);
        const studentAssignSnap = await get(child(dbRef, `studentAssignments/${studentId}/${assignmentId}`));

        if (!studentAssignSnap.exists()) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        const assignData = studentAssignSnap.val();

        updates[`submissions/${assignData.teacherId}/${assignmentId}/${studentId}`] = {
            studentId,
            studentName,
            assignmentId,
            assignmentTitle: assignData.title,
            courseTitle: assignData.courseTitle,
            submissionUrl,
            submissionFileName: submissionFileName || 'submission',
            submittedAt: Date.now(),
            status: 'submitted'
        };

        await update(ref(rtdb), updates);
        res.json({ success: true, message: 'Assignment submitted successfully!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get Submissions for Teacher
router.get('/submissions/:teacherId', async (req, res) => {
    try {
        const dbRef = ref(rtdb);
        const snapshot = await get(child(dbRef, `submissions/${req.params.teacherId}`));

        if (!snapshot.exists()) {
            return res.json({ success: true, submissions: [] });
        }

        const allSubmissions = [];
        const data = snapshot.val();

        // Flatten: data = { assignmentId: { studentId: submission } }
        for (const assignmentId in data) {
            for (const studentId in data[assignmentId]) {
                allSubmissions.push({
                    id: `${assignmentId}_${studentId}`,
                    ...data[assignmentId][studentId]
                });
            }
        }

        allSubmissions.sort((a, b) => b.submittedAt - a.submittedAt);
        res.json({ success: true, submissions: allSubmissions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Mark Submission as Complete (Teacher)
router.post('/mark-complete', async (req, res) => {
    const { teacherId, assignmentId, studentId } = req.body;
    try {
        const updates = {};

        // Update submission status
        updates[`submissions/${teacherId}/${assignmentId}/${studentId}/status`] = 'completed';

        // Update student's assignment status
        updates[`studentAssignments/${studentId}/${assignmentId}/status`] = 'completed';
        updates[`studentAssignments/${studentId}/${assignmentId}/completedAt`] = Date.now();

        await update(ref(rtdb), updates);
        res.json({ success: true, message: 'Submission marked as completed!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

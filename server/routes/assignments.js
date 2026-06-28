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

// Create Assignment (MCQs - Teacher)
router.post('/create', async (req, res) => {
    const { teacherId, teacherName, courseId, courseTitle, moduleId, moduleTitle, question, options, correctOptionIndex } = req.body;
    try {
        const dbRef = ref(rtdb);

        // 1. Create the assignment record
        const assignmentRef = push(child(dbRef, 'assignments'));
        const assignmentData = {
            teacherId,
            teacherName,
            courseId,
            courseTitle,
            moduleId,
            moduleTitle,
            question,
            options,
            correctOptionIndex,
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
                        moduleId,
                        moduleTitle,
                        question,
                        options,
                        correctOptionIndex,
                        assignedAt: Date.now(),
                        status: 'pending',
                        submittedAt: null,
                        completedAt: null,
                        selectedOptionIndex: null // for student answer
                    };
                    // 3. Create Notification for the student
                    const notificationRef = push(child(dbRef, `notifications/${studentId}`));
                    updates[`notifications/${studentId}/${notificationRef.key}`] = {
                        id: notificationRef.key,
                        title: 'New MCQs Assigned',
                        message: `Teacher ${teacherName} added MCQs for ${moduleTitle} in ${courseTitle}`,
                        type: 'assignment',
                        relatedId: assignmentRef.key,
                        read: false,
                        createdAt: Date.now()
                    };

                    studentCount++;
                }
            }
        }

        // 4. Save teacher's assignment record
        updates[`teacherAssignments/${teacherId}/${assignmentRef.key}`] = {
            ...assignmentData,
            studentCount
        };

        await update(ref(rtdb), updates);

        res.status(201).json({
            success: true,
            message: `MCQs sent to ${studentCount} students!`,
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

    if (!studentId || !assignmentId) {
        return res.status(400).json({ success: false, message: 'studentId and assignmentId are required' });
    }

    try {
        const dbRef = ref(rtdb);

        // Fetch the student's assignment data first
        const studentAssignSnap = await get(child(dbRef, `studentAssignments/${studentId}/${assignmentId}`));

        if (!studentAssignSnap.exists()) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        const assignData = studentAssignSnap.val();
        const assignmentTitle = assignData.moduleTitle || assignData.question || 'MCQs';

        const updates = {};

        // Update student's assignment status
        updates[`studentAssignments/${studentId}/${assignmentId}/status`] = 'submitted';
        updates[`studentAssignments/${studentId}/${assignmentId}/submissionUrl`] = submissionUrl || '';
        updates[`studentAssignments/${studentId}/${assignmentId}/submissionFileName`] = submissionFileName || 'submission';
        updates[`studentAssignments/${studentId}/${assignmentId}/submittedAt`] = Date.now();

        // Create submission record for teacher
        if (assignData.teacherId) {
            updates[`submissions/${assignData.teacherId}/${assignmentId}/${studentId}`] = {
                studentId,
                studentName: studentName || 'Student',
                assignmentId,
                assignmentTitle,
                courseTitle: assignData.courseTitle || '',
                submissionUrl: submissionUrl || '',
                submissionFileName: submissionFileName || 'submission',
                submittedAt: Date.now(),
                status: 'submitted'
            };

            // Create Notification for the teacher
            const teacherNotifRef = push(child(dbRef, `notifications/${assignData.teacherId}`));
            updates[`notifications/${assignData.teacherId}/${teacherNotifRef.key}`] = {
                id: teacherNotifRef.key,
                title: 'New Submission',
                message: `Student ${studentName || 'Student'} submitted MCQs: ${assignmentTitle} in ${assignData.courseTitle || 'Course'}`,
                type: 'submission',
                relatedId: assignmentId,
                read: false,
                createdAt: Date.now()
            };
        }

        await update(ref(rtdb), updates);
        res.json({ success: true, message: 'Assignment submitted successfully!' });
    } catch (err) {
        console.error('Submit assignment error:', err);
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

// Mark Submission as Rejected (Teacher)
router.post('/reject', async (req, res) => {
    const { teacherId, assignmentId, studentId, feedback } = req.body;
    try {
        const updates = {};

        // Update submission status
        updates[`submissions/${teacherId}/${assignmentId}/${studentId}/status`] = 'rejected';
        updates[`submissions/${teacherId}/${assignmentId}/${studentId}/feedback`] = feedback || 'No feedback provided';

        // Update student's assignment status - resetting to pending so they can fix it
        updates[`studentAssignments/${studentId}/${assignmentId}/status`] = 'pending';
        updates[`studentAssignments/${studentId}/${assignmentId}/rejected`] = true;
        updates[`studentAssignments/${studentId}/${assignmentId}/feedback`] = feedback || 'No feedback provided';

        await update(ref(rtdb), updates);
        res.json({ success: true, message: 'Submission rejected and sent back to student.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Update Assignment (Teacher)
router.put('/update', async (req, res) => {
    const { assignmentId, teacherId, question, options, correctOptionIndex, courseId } = req.body;
    try {
        const dbRef = ref(rtdb);
        const updates = {};

        // 1. Update main assignment record
        updates[`assignments/${assignmentId}/question`] = question;
        updates[`assignments/${assignmentId}/options`] = options;
        updates[`assignments/${assignmentId}/correctOptionIndex`] = correctOptionIndex;

        // 2. Update teacher's record
        updates[`teacherAssignments/${teacherId}/${assignmentId}/question`] = question;
        updates[`teacherAssignments/${teacherId}/${assignmentId}/options`] = options;
        updates[`teacherAssignments/${teacherId}/${assignmentId}/correctOptionIndex`] = correctOptionIndex;

        // 3. Update for all students in that course
        const enrollmentsSnap = await get(child(dbRef, 'enrollments'));
        if (enrollmentsSnap.exists()) {
            const allEnrollments = enrollmentsSnap.val();
            for (const studentId in allEnrollments) {
                if (allEnrollments[studentId][courseId]) {
                    updates[`studentAssignments/${studentId}/${assignmentId}/question`] = question;
                    updates[`studentAssignments/${studentId}/${assignmentId}/options`] = options;
                    updates[`studentAssignments/${studentId}/${assignmentId}/correctOptionIndex`] = correctOptionIndex;
                }
            }
        }

        await update(ref(rtdb), updates);
        res.json({ success: true, message: 'MCQs updated successfully!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Delete Assignment (Teacher)
router.delete('/:teacherId/:assignmentId/:courseId', async (req, res) => {
    const { teacherId, assignmentId, courseId } = req.params;
    try {
        const dbRef = ref(rtdb);
        const updates = {};

        // 1. Remove from main assignments
        updates[`assignments/${assignmentId}`] = null;

        // 2. Remove from teacher's record
        updates[`teacherAssignments/${teacherId}/${assignmentId}`] = null;

        // 3. Remove from submissions (cleanup)
        updates[`submissions/${teacherId}/${assignmentId}`] = null;

        // 4. Remove from all students in that course
        const enrollmentsSnap = await get(child(dbRef, 'enrollments'));
        if (enrollmentsSnap.exists()) {
            const allEnrollments = enrollmentsSnap.val();
            for (const studentId in allEnrollments) {
                if (allEnrollments[studentId][courseId]) {
                    updates[`studentAssignments/${studentId}/${assignmentId}`] = null;
                }
            }
        }

        await update(ref(rtdb), updates);
        res.json({ success: true, message: 'Assignment deleted successfully!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

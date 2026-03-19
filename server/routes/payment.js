const express = require('express');
const router = express.Router();
// Initialize stripe with a dummy key if env var is missing so it doesn't crash the server on startup
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_dummyKeyToPreventCrash');
const { rtdb } = require('../config/firebase');
const { ref, set, get, child } = require('firebase/database');

// Create Stripe Checkout Session
router.post('/create-checkout', async (req, res) => {
    const { courseId, courseTitle, price, studentId, studentName } = req.body;

    if (!courseId || !price || !studentId) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // If course is free, enroll directly
    if (parseFloat(price) === 0) {
        try {
            await set(ref(rtdb, `enrollments/${studentId}/${courseId}`), {
                enrolledAt: Date.now(),
                paymentStatus: 'free',
                courseTitle: courseTitle || ''
            });
            return res.json({ success: true, free: true, message: 'Enrolled in free course!' });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: courseTitle || 'Learnova Course',
                            description: `Enrollment for: ${courseTitle}`,
                        },
                        unit_amount: Math.round(parseFloat(price) * 100), // Stripe uses cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.CLIENT_URL || 'https://learnova.app'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL || 'https://learnova.app'}/payment-cancel`,
            metadata: {
                courseId,
                studentId,
                studentName: studentName || '',
                courseTitle: courseTitle || ''
            },
        });

        res.json({
            success: true,
            sessionId: session.id,
            url: session.url,
        });
    } catch (err) {
        console.error('Stripe checkout error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Verify payment and enroll student
router.post('/verify-payment', async (req, res) => {
    const { sessionId } = req.body;

    if (!sessionId) {
        return res.status(400).json({ success: false, message: 'Session ID is required' });
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status === 'paid') {
            const { courseId, studentId, studentName, courseTitle } = session.metadata;

            // Save enrollment in Firebase
            await set(ref(rtdb, `enrollments/${studentId}/${courseId}`), {
                enrolledAt: Date.now(),
                paymentStatus: 'paid',
                stripeSessionId: sessionId,
                amountPaid: session.amount_total / 100,
                courseTitle: courseTitle || '',
                studentName: studentName || ''
            });

            res.json({ success: true, message: 'Payment verified and enrolled!' });
        } else {
            res.json({ success: false, message: 'Payment not completed yet.' });
        }
    } catch (err) {
        console.error('Payment verification error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Check if student is enrolled in a course
router.post('/check-enrollment', async (req, res) => {
    const { studentId, courseId } = req.body;

    if (!studentId || !courseId) {
        return res.status(400).json({ success: false, message: 'studentId and courseId are required' });
    }

    try {
        const dbRef = ref(rtdb);
        const snapshot = await get(child(dbRef, `enrollments/${studentId}/${courseId}`));

        if (snapshot.exists()) {
            res.json({ success: true, enrolled: true, enrollment: snapshot.val() });
        } else {
            res.json({ success: true, enrolled: false });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get all enrollments for a student
router.get('/enrollments/:studentId', async (req, res) => {
    const { studentId } = req.params;

    try {
        const dbRef = ref(rtdb);
        const snapshot = await get(child(dbRef, `enrollments/${studentId}`));

        if (snapshot.exists()) {
            const data = snapshot.val();
            const enrollments = Object.keys(data).map(courseId => ({
                courseId,
                ...data[courseId]
            }));
            res.json({ success: true, enrollments });
        } else {
            res.json({ success: true, enrollments: [] });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

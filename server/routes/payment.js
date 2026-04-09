const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_dummyKeyToPreventCrash');
const { rtdb } = require('../config/firebase');
const { ref, set, get, child, push, update, remove } = require('firebase/database');

const PLATFORM_COMMISSION = 0.45; // 45% platform keeps
const TEACHER_SHARE = 0.55;       // 55% teacher gets

// Manual Payout Tracking - No Stripe Connect transfers needed
// Payouts will appear instantly for teachers after student pays
const PAYOUT_STATUS = {
    AVAILABLE: 'available',    // Ready in teacher's wallet
    PENDING: 'pending',        // Waiting for review (optional)
    PROCESSING: 'processing',  // Admin is sending the money manually
    PAID: 'paid'               // Payment sent (e.g., via Payoneer/Bank)
};

// ============================================
// 1. TEACHER ONBOARDING (Stripe Connect)
// ============================================

// Create a Stripe Connected Account for a teacher
router.post('/onboard-teacher', async (req, res) => {
    const { teacherId, email, teacherName } = req.body;

    if (!teacherId || !email) {
        return res.status(400).json({ success: false, message: 'teacherId and email are required' });
    }

    try {
        // Check if teacher already has a connected account
        const dbRef = ref(rtdb);
        const existing = await get(child(dbRef, `stripeAccounts/${teacherId}`));

        if (existing.exists() && existing.val().stripeAccountId) {
            // Already has account, generate new onboarding link in case they need to complete it
            const accountLink = await stripe.accountLinks.create({
                account: existing.val().stripeAccountId,
                refresh_url: `${process.env.CLIENT_URL || 'https://learnova.app'}/stripe-refresh`,
                return_url: `${process.env.CLIENT_URL || 'https://learnova.app'}/stripe-complete`,
                type: 'account_onboarding',
            });

            return res.json({
                success: true,
                url: accountLink.url,
                stripeAccountId: existing.val().stripeAccountId,
                alreadyExists: true
            });
        }

        // Create new Stripe Connect Express account
        const account = await stripe.accounts.create({
            type: 'express',
            email: email,
            metadata: { teacherId, teacherName: teacherName || '' },
            capabilities: {
                transfers: { requested: true },
            },
        });

        // Save the Stripe account ID in Firebase
        await set(ref(rtdb, `stripeAccounts/${teacherId}`), {
            stripeAccountId: account.id,
            email,
            teacherName: teacherName || '',
            onboardingComplete: false,
            createdAt: Date.now()
        });

        // Generate onboarding link
        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: `${process.env.CLIENT_URL || 'https://learnova.app'}/stripe-refresh`,
            return_url: `${process.env.CLIENT_URL || 'https://learnova.app'}/stripe-complete`,
            type: 'account_onboarding',
        });

        res.json({
            success: true,
            url: accountLink.url,
            stripeAccountId: account.id
        });
    } catch (err) {
        console.error('Stripe onboard error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Check teacher onboarding status
router.get('/onboard-status/:teacherId', async (req, res) => {
    const { teacherId } = req.params;

    try {
        const dbRef = ref(rtdb);
        const snapshot = await get(child(dbRef, `stripeAccounts/${teacherId}`));

        if (!snapshot.exists()) {
            return res.json({ success: true, onboarded: false, message: 'No Stripe account found' });
        }

        const data = snapshot.val();
        const account = await stripe.accounts.retrieve(data.stripeAccountId);

        const isComplete = account.charges_enabled || account.payouts_enabled;

        // Update Firebase if onboarding just completed
        if (isComplete && !data.onboardingComplete) {
            await update(ref(rtdb, `stripeAccounts/${teacherId}`), {
                onboardingComplete: true,
                updatedAt: Date.now()
            });
        }

        res.json({
            success: true,
            onboarded: isComplete,
            stripeAccountId: data.stripeAccountId,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            email: data.email
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================
// 2. CHECKOUT WITH SPLIT (Student buys course)
// ============================================

router.post('/create-checkout', async (req, res) => {
    const { courseId, courseTitle, price, studentId, studentName, teacherId } = req.body;

    if (!courseId || !price || !studentId) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Sanitize price: remove currency symbols, commas, etc.
    const sanitizedPrice = typeof price === 'string' ? price.replace(/[^0-9.]/g, '') : price;

    // If course is free, enroll directly
    if (parseFloat(sanitizedPrice) === 0) {
        try {
            // Save enrollment
            await set(ref(rtdb, `enrollments/${studentId}/${courseId}`), {
                enrolledAt: Date.now(),
                paymentStatus: 'free',
                courseTitle: courseTitle || ''
            });

            // Save student-course relationship
            await set(ref(rtdb, `studentCourses/${studentId}/${courseId}`), {
                courseId,
                courseTitle: courseTitle || '',
                teacherId: teacherId || '',
                enrolledAt: Date.now(),
            });

            // Save teacher-student relationship
            if (teacherId) {
                await set(ref(rtdb, `teacherStudents/${teacherId}/${studentId}`), {
                    studentId,
                    studentName: studentName || '',
                    courseId,
                    courseTitle: courseTitle || '',
                    enrolledAt: Date.now(),
                });
            }

            return res.json({ success: true, free: true, message: 'Enrolled in free course!' });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }

    try {
        const serverUrl = process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`;

        // Stripe requires http/https for success_url. 
        // We use our server as a bridge to redirect back to the app's deep link.
        const stripeSuccessUrl = `${serverUrl}/api/payment/success-redirect?sessionId={CHECKOUT_SESSION_ID}&appUrl=${encodeURIComponent(req.body.successUrl || '')}`;
        const stripeCancelUrl = `${serverUrl}/api/payment/success-redirect?status=cancel&appUrl=${encodeURIComponent(req.body.cancelUrl || '')}`;

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
                        unit_amount: Math.round(parseFloat(sanitizedPrice) * 100),
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: stripeSuccessUrl,
            cancel_url: stripeCancelUrl,
            metadata: {
                courseId,
                studentId,
                studentName: studentName || '',
                courseTitle: courseTitle || '',
                teacherId: teacherId || ''
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

// ============================================
// 2.1 CUSTOM PAYMENT INTENT (For Custom Form)
// ============================================
router.post('/create-payment-intent', async (req, res) => {
    const { amount, currency, courseId, studentId, studentName, courseTitle, teacherId } = req.body;

    if (!amount || !courseId || !studentId) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(parseFloat(amount) * 100), // cents
            currency: currency || 'usd',
            metadata: {
                courseId,
                studentId,
                studentName: studentName || '',
                courseTitle: courseTitle || '',
                teacherId: teacherId || ''
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            id: paymentIntent.id
        });
    } catch (err) {
        console.error('Payment intent error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================
// 2.2 CONFIRM CUSTOM PAYMENT (Save to DB)
// ============================================
router.post('/confirm-payment', async (req, res) => {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
        return res.status(400).json({ success: false, message: 'Payment Intent ID is required' });
    }

    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status === 'succeeded') {
            const { courseId, studentId, studentName, courseTitle, teacherId } = paymentIntent.metadata;
            const totalAmount = paymentIntent.amount / 100;
            const teacherAmount = parseFloat((totalAmount * TEACHER_SHARE).toFixed(2));
            const platformAmount = parseFloat((totalAmount * PLATFORM_COMMISSION).toFixed(2));

            // 1. Save enrollment
            await set(ref(rtdb, `enrollments/${studentId}/${courseId}`), {
                enrolledAt: Date.now(),
                paymentStatus: 'paid',
                stripePaymentIntentId: paymentIntentId,
                amountPaid: totalAmount,
                courseTitle: courseTitle || '',
                studentName: studentName || ''
            });

            // 2. Save student-course relationship
            await set(ref(rtdb, `studentCourses/${studentId}/${courseId}`), {
                courseId,
                courseTitle: courseTitle || '',
                teacherId: teacherId || '',
                enrolledAt: Date.now(),
                amountPaid: totalAmount,
            });

            // 3. Save teacher-student relationship
            if (teacherId) {
                await set(ref(rtdb, `teacherStudents/${teacherId}/${studentId}`), {
                    studentId,
                    studentName: studentName || '',
                    courseId,
                    courseTitle: courseTitle || '',
                    enrolledAt: Date.now(),
                });
            }

            // 4. Record payout for teacher
            if (teacherId) {
                const payoutsRef = ref(rtdb, 'pendingPayouts');
                const newPayoutRef = push(payoutsRef);
                await set(newPayoutRef, {
                    teacherId,
                    courseId,
                    courseTitle: courseTitle || '',
                    studentId,
                    studentName: studentName || '',
                    totalAmount,
                    teacherAmount,
                    platformAmount,
                    stripePaymentIntentId: paymentIntentId,
                    status: PAYOUT_STATUS.AVAILABLE,
                    createdAt: Date.now()
                });
            }

            return res.json({ success: true, message: 'Enrolled successfully!' });
        } else {
            return res.json({ success: false, message: 'Payment not succeeded' });
        }
    } catch (err) {
        console.error('Confirm payment error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================
// 3. VERIFY PAYMENT + RECORD PENDING PAYOUT
// ============================================

router.post('/verify-payment', async (req, res) => {
    const { sessionId } = req.body;

    if (!sessionId) {
        return res.status(400).json({ success: false, message: 'Session ID is required' });
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status === 'paid') {
            const { courseId, studentId, studentName, courseTitle, teacherId } = session.metadata;
            const totalAmount = session.amount_total / 100; // Convert from cents
            const teacherAmount = parseFloat((totalAmount * TEACHER_SHARE).toFixed(2));
            const platformAmount = parseFloat((totalAmount * PLATFORM_COMMISSION).toFixed(2));

            // Save enrollment
            await set(ref(rtdb, `enrollments/${studentId}/${courseId}`), {
                enrolledAt: Date.now(),
                paymentStatus: 'paid',
                stripeSessionId: sessionId,
                amountPaid: totalAmount,
                courseTitle: courseTitle || '',
                studentName: studentName || ''
            });

            // Save student-course relationship
            await set(ref(rtdb, `studentCourses/${studentId}/${courseId}`), {
                courseId,
                courseTitle: courseTitle || '',
                teacherId: teacherId || '',
                enrolledAt: Date.now(),
                amountPaid: totalAmount,
            });

            // Save teacher-student relationship
            if (teacherId) {
                await set(ref(rtdb, `teacherStudents/${teacherId}/${studentId}`), {
                    studentId,
                    studentName: studentName || '',
                    courseId,
                    courseTitle: courseTitle || '',
                    enrolledAt: Date.now(),
                });
            }

            // Record payout for teacher (Internal Balance)
            if (teacherId) {
                const payoutsRef = ref(rtdb, 'pendingPayouts');
                const newPayoutRef = push(payoutsRef);
                await set(newPayoutRef, {
                    teacherId,
                    courseId,
                    courseTitle: courseTitle || '',
                    studentId,
                    studentName: studentName || '',
                    totalAmount,
                    teacherAmount,
                    platformAmount,
                    stripeSessionId: sessionId,
                    status: PAYOUT_STATUS.AVAILABLE,
                    createdAt: Date.now(),
                    paidAt: null
                });
            }

            res.json({
                success: true,
                message: 'Payment verified and enrolled!',
                split: {
                    total: totalAmount,
                    teacherShare: teacherAmount,
                    platformShare: platformAmount
                }
            });
        } else {
            res.json({ success: false, message: 'Payment not completed yet.' });
        }
    } catch (err) {
        console.error('Payment verification error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================
// 4. PROCESS PENDING PAYOUTS (Run daily via cron)
// ============================================

router.post('/process-payouts', async (req, res) => {
    try {
        const dbRef = ref(rtdb);
        const snapshot = await get(child(dbRef, 'pendingPayouts'));

        if (!snapshot.exists()) {
            return res.json({ success: true, message: 'No pending payouts', processed: 0 });
        }

        const allPayouts = snapshot.val();
        const now = Date.now();
        let processedCount = 0;
        let failedCount = 0;
        const results = [];

        for (const [payoutId, payout] of Object.entries(allPayouts)) {
            // Only process payouts that are pending and past their scheduled date
            if (payout.status !== 'pending' || now < payout.scheduledPayoutDate) continue;

            try {
                // Get teacher's Stripe connected account
                const teacherSnap = await get(child(dbRef, `stripeAccounts/${payout.teacherId}`));

                if (!teacherSnap.exists()) {
                    await update(ref(rtdb, `pendingPayouts/${payoutId}`), {
                        status: 'failed',
                        failReason: 'No Stripe account found for teacher',
                        processedAt: Date.now()
                    });
                    failedCount++;
                    results.push({ payoutId, status: 'failed', reason: 'No Stripe account' });
                    continue;
                }

                const teacherStripeId = teacherSnap.val().stripeAccountId;

                // Create Stripe Transfer to teacher's connected account
                const transfer = await stripe.transfers.create({
                    amount: Math.round(payout.teacherAmount * 100), // cents
                    currency: 'usd',
                    destination: teacherStripeId,
                    description: `Payout for course: ${payout.courseTitle} | Student: ${payout.studentName}`,
                    metadata: {
                        payoutId,
                        teacherId: payout.teacherId,
                        courseId: payout.courseId,
                        studentId: payout.studentId
                    }
                });

                // Mark payout as completed
                await update(ref(rtdb, `pendingPayouts/${payoutId}`), {
                    status: 'completed',
                    paidAt: Date.now(),
                    stripeTransferId: transfer.id,
                    processedAt: Date.now()
                });

                processedCount++;
                results.push({ payoutId, status: 'completed', transferId: transfer.id, amount: payout.teacherAmount });
            } catch (transferErr) {
                await update(ref(rtdb, `pendingPayouts/${payoutId}`), {
                    status: 'failed',
                    failReason: transferErr.message,
                    processedAt: Date.now()
                });
                failedCount++;
                results.push({ payoutId, status: 'failed', reason: transferErr.message });
            }
        }

        res.json({
            success: true,
            processed: processedCount,
            failed: failedCount,
            results
        });
    } catch (err) {
        console.error('Process payouts error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================
// 5. TEACHER EARNINGS & PAYOUT HISTORY
// ============================================

router.get('/teacher-earnings/:teacherId', async (req, res) => {
    const { teacherId } = req.params;

    try {
        const dbRef = ref(rtdb);
        const snapshot = await get(child(dbRef, 'pendingPayouts'));

        if (!snapshot.exists()) {
            return res.json({
                success: true,
                earnings: {
                    totalEarned: 0,
                    pendingAmount: 0,
                    paidAmount: 0,
                    payouts: []
                }
            });
        }

        const allPayouts = snapshot.val();
        const teacherPayouts = Object.keys(allPayouts)
            .map(id => ({ id, ...allPayouts[id] }))
            .filter(p => p.teacherId === teacherId);

        const pendingAmount = teacherPayouts
            .filter(p => p.status === PAYOUT_STATUS.AVAILABLE)
            .reduce((sum, p) => sum + p.teacherAmount, 0);

        const paidAmount = teacherPayouts
            .filter(p => p.status === PAYOUT_STATUS.PAID)
            .reduce((sum, p) => sum + p.teacherAmount, 0);

        res.json({
            success: true,
            earnings: {
                totalEarned: parseFloat((pendingAmount + paidAmount).toFixed(2)),
                pendingAmount: parseFloat(pendingAmount.toFixed(2)),
                paidAmount: parseFloat(paidAmount.toFixed(2)),
                payouts: teacherPayouts.sort((a, b) => b.createdAt - a.createdAt)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================
// 6. ENROLLMENT & UTILITY ROUTES (existing)
// ============================================

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

// ============================================
// 7. ADMIN: PLATFORM REVENUE STATS
// ============================================

router.get('/admin/revenue', async (req, res) => {
    try {
        const dbRef = ref(rtdb);
        const snapshot = await get(child(dbRef, 'pendingPayouts'));

        if (!snapshot.exists()) {
            return res.json({
                success: true,
                revenue: { totalRevenue: 0, platformEarnings: 0, teacherPayouts: 0, pendingPayouts: 0, transactions: 0 }
            });
        }

        const all = Object.values(snapshot.val());
        const totalRevenue = all.reduce((s, p) => s + p.totalAmount, 0);
        const platformEarnings = all.reduce((s, p) => s + p.platformAmount, 0);
        const teacherPaid = all.filter(p => p.status === 'completed').reduce((s, p) => s + p.teacherAmount, 0);
        const teacherPending = all.filter(p => p.status === 'pending').reduce((s, p) => s + p.teacherAmount, 0);

        res.json({
            success: true,
            revenue: {
                totalRevenue: parseFloat(totalRevenue.toFixed(2)),
                platformEarnings: parseFloat(platformEarnings.toFixed(2)),
                teacherPayoutsDone: parseFloat(teacherPaid.toFixed(2)),
                teacherPayoutsPending: parseFloat(teacherPending.toFixed(2)),
                transactions: all.length
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================
// 6. REDIRECT BRIDGE (For Mobile Deep Linking)
// ============================================
router.get('/success-redirect', (req, res) => {
    const { sessionId, appUrl, status } = req.query;

    // If we have an appUrl from the mobile app, we redirect back to it
    if (appUrl) {
        let finalUrl = appUrl;

        // If it's a success and we have a sessionId, inject it into the appUrl
        if (sessionId && finalUrl.includes('{CHECKOUT_SESSION_ID}')) {
            finalUrl = finalUrl.replace('{CHECKOUT_SESSION_ID}', sessionId);
        } else if (sessionId && !finalUrl.includes('session_id=')) {
            const separator = finalUrl.includes('?') ? '&' : '?';
            finalUrl = `${finalUrl}${separator}session_id=${sessionId}`;
        }

        console.log('Redirecting to App:', finalUrl);
        return res.redirect(finalUrl);
    }

    // Fallback for web users
    const clientUrl = process.env.CLIENT_URL || 'https://learnova.app';
    if (status === 'cancel') {
        res.redirect(`${clientUrl}/payment-cancel`);
    } else {
        res.redirect(`${clientUrl}/payment-success?session_id=${sessionId}`);
    }
});

module.exports = router;

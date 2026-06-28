const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const userRoutes = require('./routes/users');
const liveRoutes = require('./routes/live');
const socialRoutes = require('./routes/social');
const paymentRoutes = require('./routes/payment');
const assignmentRoutes = require('./routes/assignments');
const supportRoutes = require('./routes/support');
const chatRoutes = require('./routes/chat');

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/help-live-support', supportRoutes);
app.use('/api/chat', chatRoutes);

app.get('/', (req, res) => {
    res.send('Learnova Secure Backend is running 🚀');
});

// GET Delete Account Request Page (For Play Store Compliance)
app.get('/delete-account', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Delete Account - MatloVerse</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0f172a, #1e293b);
            color: #f8fafc;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .container {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
            max-width: 400px;
            width: 100%;
            text-align: center;
        }
        h1 {
            font-size: 24px;
            margin-bottom: 10px;
            font-weight: 800;
        }
        h1 span {
            color: #00AEEF;
        }
        p {
            font-size: 14px;
            color: #94a3b8;
            margin-bottom: 30px;
            line-height: 1.5;
        }
        .form-group {
            text-align: left;
            margin-bottom: 20px;
        }
        label {
            display: block;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
            color: #cbd5e1;
            font-weight: 600;
        }
        input {
            width: 100%;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.05);
            color: #fff;
            box-sizing: border-box;
            font-size: 14px;
            transition: all 0.3s;
        }
        input:focus {
            outline: none;
            border-color: #00AEEF;
            box-shadow: 0 0 10px rgba(0, 174, 239, 0.2);
        }
        button {
            width: 100%;
            padding: 14px;
            border-radius: 8px;
            border: none;
            background: #00AEEF;
            color: #fff;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            transition: background 0.3s;
            margin-top: 10px;
        }
        button:hover {
            background: #008ecc;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Request Account <span>Deletion</span></h1>
        <p>Please enter your account email to request deletion of your MatloVerse account and all associated data. This action is irreversible.</p>
        <form action="/delete-account" method="POST">
            <div class="form-group">
                <label for="email">Email Address</label>
                <input type="email" id="email" name="email" required placeholder="name@example.com">
            </div>
            <button type="submit">Submit Request</button>
        </form>
    </div>
</body>
</html>
    `);
});

// POST Delete Account Request
app.post('/delete-account', (req, res) => {
    const { email } = req.body;
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Request Received - MatloVerse</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0f172a, #1e293b);
            color: #f8fafc;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .container {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
            max-width: 400px;
            width: 100%;
            text-align: center;
        }
        h1 {
            color: #10B981;
            font-size: 24px;
            margin-bottom: 10px;
            font-weight: 800;
        }
        p {
            font-size: 14px;
            color: #94a3b8;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Request Received!</h1>
        <p>Your request to delete the account associated with <strong>${email}</strong> has been received. Our team will process this request within 48 hours.</p>
    </div>
</body>
</html>
    `);
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: err.message
    });
});

if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);

        // Initialize automated cron services
        const { initCronJobs } = require('./services/cronService');
        initCronJobs();
    });
}

module.exports = app;

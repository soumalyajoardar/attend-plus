const Attendance = require('./models/Attendance');
const Notification = require('./models/Notification');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const Student = require('./models/Student');
const Teacher = require('./models/Teacher');
const speakeasy = require('speakeasy');

const app = express();

// Middleware
app.use(cors()); // Allows the React frontend to talk to this server
app.use(express.json()); // Allows us to read JSON data from requests

// ---------- TEST ROUTE ----------
app.get('/', (req, res) => {
  res.send('Attend+ Backend is running!');
});

// ---------- SIGNUP ROUTE ----------
app.post('/api/auth/signup', async (req, res) => {
  const { fullName, registrationNo, department, semester, email, parentEmail, password } = req.body;

  try {
    // 1. Check if the student already exists by email
    const existingStudent = await Student.findOne({ email: email.toLowerCase() });
    if (existingStudent) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    // 2. Hash the password (encrypt it)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Create the new student in the database
    const newStudent = new Student({
      fullName,
      registrationNo,
      department,
      semester,
      email: email.toLowerCase(),
      parentEmail: parentEmail.toLowerCase(),
      password: hashedPassword,
    });

    await newStudent.save();

    // 4. Send success response
    res.status(201).json({
      success: true,
      message: 'Account created successfully! You can now log in.',
    });
  } catch (error) {
    console.error('Signup error:', error.message);
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
});

// ---------- LOGIN ROUTE (Unified) ----------
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

// Hardcoded Teacher Login (Admin)
const HARDCODED_TEACHER_ID = 'ADMIN-2026';
const HARDCODED_TEACHER_PASSWORD = 'admin@2026';

if (email === HARDCODED_TEACHER_ID && password === HARDCODED_TEACHER_PASSWORD) {
  const token = jwt.sign(
    { id: 'admin', email: 'admin@attendplus.com', role: 'teacher' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.status(200).json({
    success: true,
    token,
    role: 'teacher',
    user: {
      id: 'admin',
      fullName: 'Admin Teacher',
      teacherId: 'ADMIN-2026',
      department: 'ALL',
      email: 'admin@attendplus.com',
    },
  });
}

  // Hardcoded Student Login (For Testing)
  const HARDCODED_STUDENT_EMAIL = 'student@test.com';
  const HARDCODED_STUDENT_PASSWORD = 'student@123';

  if (email === HARDCODED_STUDENT_EMAIL && password === HARDCODED_STUDENT_PASSWORD) {
    const token = jwt.sign(
      { id: 'student123', email: 'student@test.com', role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      token,
      role: 'student',
      user: {
        id: 'student123',
        fullName: 'Rohan Sharma',
        registrationNo: 'REG-2024-001',
        department: 'CST',
        semester: '3rd',
        email: 'student@test.com',
      },
    });
  }

  try {
    let user = null;
    let role = '';

    // Check if it's a Teacher by teacherId
    user = await Teacher.findOne({ teacherId: email.toUpperCase() });
    if (user) {
      role = 'teacher';
    } else {
      // Check Student by registrationNo
      user = await Student.findOne({ registrationNo: email.toUpperCase() });
      if (user) {
        role = 'student';
      } else {
        // Check Student by email (fallback)
        user = await Student.findOne({ email: email.toLowerCase() });
        if (user) {
          role = 'student';
        }
      }
    }

    if (!user) {
      return res.status(400).json({ success: false, message: 'No account found with this ID.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect password.' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      token,
      role,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        ...(role === 'teacher' && { teacherId: user.teacherId, department: user.department }),
        ...(role === 'student' && { 
          department: user.department, 
          semester: user.semester, 
          registrationNo: user.registrationNo 
        }),
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ---------- ATTENDANCE CHECK-IN ----------
app.post('/api/attendance/check-in', async (req, res) => {
  const { studentId, registrationNo, qrData } = req.body;

  try {
    // Parse QR data: "SESSION_ID.TOKEN"
    const [scannedSessionId, scannedToken] = qrData.split('.');

    // Check if there's an active session
    if (!global.activeSession) {
      return res.status(400).json({ success: false, message: 'No active attendance session.' });
    }

    // Check if session ID matches
    if (scannedSessionId !== global.activeSession.sessionId) {
      return res.status(400).json({ success: false, message: 'Invalid session.' });
    }

    // Verify the TOTP token
    const isValid = speakeasy.totp.verify({
      secret: global.activeSession.secret,
      encoding: 'base32',
      token: scannedToken,
      step: 5,
      window: 1,
    });

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'QR code expired. Please scan again.' });
    }

    // Check if student already checked in
    if (global.activeSession.attendees.includes(registrationNo)) {
      return res.status(400).json({ success: false, message: 'Already marked present.' });
    }

    // Find student in database to get their name
    const student = await Student.findOne({ registrationNo: registrationNo });

    if (!student) {
      return res.status(400).json({ success: false, message: 'Student not found.' });
    }

    // Save attendance record to MongoDB
    const newAttendance = new Attendance({
      sessionId: scannedSessionId,
      studentId: studentId || student._id,
      registrationNo: registrationNo,
      studentName: student.fullName,
      department: global.activeSession.department,
      semester: global.activeSession.semester,
      subject: global.activeSession.subject,
      teacherId: global.activeSession.teacherId,
      method: 'qr',
    });

    await newAttendance.save();

    // Add to in-memory attendees list
    global.activeSession.attendees.push(registrationNo);

    console.log('✅ Attendance saved for:', student.fullName);
    console.log('Total attendees:', global.activeSession.attendees.length);

    res.status(200).json({
      success: true,
      message: 'Attendance marked successfully!',
      studentName: student.fullName,
      totalAttendees: global.activeSession.attendees.length,
    });
  } catch (error) {
    console.error('Check-in error:', error.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ---------- GET ATTENDANCE FOR STUDENT ----------
app.get('/api/attendance/student/:registrationNo', async (req, res) => {
  const { registrationNo } = req.params;

  try {
    const records = await Attendance.find({ registrationNo }).sort({ timestamp: -1 });
    res.status(200).json({ success: true, records });
  } catch (error) {
    console.error('Fetch attendance error:', error.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ---------- GET ATTENDANCE FOR SESSION (Teacher View) ----------
app.get('/api/attendance/session/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const records = await Attendance.find({ sessionId }).sort({ timestamp: 1 });
    res.status(200).json({ success: true, records });
  } catch (error) {
    console.error('Fetch session attendance error:', error.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ---------- CREATE NOTIFICATION ----------
app.post('/api/notifications/create', async (req, res) => {
  const { title, message, department, semester } = req.body;

  try {
    const newNotification = new Notification({
      title,
      message,
      department: department || 'ALL',
      semester: semester || 'ALL',
      createdBy: 'Teacher',
    });

    await newNotification.save();
    res.status(201).json({ success: true, message: 'Notification posted successfully!' });
  } catch (error) {
    console.error('Notification creation error:', error.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ---------- GET NOTIFICATIONS FOR STUDENT ----------
app.get('/api/notifications/:department/:semester', async (req, res) => {
  const { department, semester } = req.params;

  try {
    const notifications = await Notification.find({
      $or: [
        { department: 'ALL', semester: 'ALL' },
        { department: 'ALL', semester: semester },
        { department: department, semester: 'ALL' },
        { department: department, semester: semester },
      ],
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error('Fetch notifications error:', error.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ---------- CONNECT TO DATABASE & START SERVER ----------
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully');
    app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Attend+ Server running on http://0.0.0.0:${PORT}`);
  console.log(`📱 For phone access, use: http://YOUR_LAPTOP_IP(DYNAMIC):${PORT}`);
});
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
  });

  // ---------- CREATE ATTENDANCE SESSION ----------
app.post('/api/session/create', async (req, res) => {
  const { department, semester, subject, teacherId } = req.body;

  try {
    // Generate a unique secret for this session
    const secret = speakeasy.generateSecret({ length: 20 }).base32;
    
    // Create a unique session ID
    const sessionId = 'SES-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    // Generate the initial TOTP token (valid for 5 seconds)
    const token = speakeasy.totp({
      secret: secret,
      encoding: 'base32',
      step: 5, // Token changes every 5 seconds
    });

    // Store session in memory (or database)
    // For now, we'll store it in a global variable
    global.activeSession = {
      sessionId,
      secret,
      department,
      semester,
      subject,
      teacherId,
      startedAt: new Date(),
      attendees: [],
    };

    res.status(201).json({
      success: true,
      sessionId,
      secret,
      message: 'Session created successfully!',
    });
  } catch (error) {
    console.error('Session creation error:', error.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ---------- VALIDATE QR SCAN ----------
app.post('/api/attendance/check-in', async (req, res) => {
  const { studentId, registrationNo, qrData } = req.body;

  try {
    // Parse QR data: "SESSION_ID.TOKEN"
    const [scannedSessionId, scannedToken] = qrData.split('.');

    // Check if there's an active session
    if (!global.activeSession) {
      return res.status(400).json({ success: false, message: 'No active attendance session.' });
    }

    // Check if session ID matches
    if (scannedSessionId !== global.activeSession.sessionId) {
      return res.status(400).json({ success: false, message: 'Invalid session.' });
    }

    // Verify the TOTP token (with a window of 1 step to allow slight time drift)
    const isValid = speakeasy.totp.verify({
      secret: global.activeSession.secret,
      encoding: 'base32',
      token: scannedToken,
      step: 5,
      window: 3, // Allows 1 step before/after (total 15 seconds tolerance)
    });

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'QR code expired. Please scan again.' });
    }

    // Check if student already checked in
    if (global.activeSession.attendees.includes(registrationNo)) {
      return res.status(400).json({ success: false, message: 'Already marked present.' });
    }

    // Mark student as present
    global.activeSession.attendees.push(registrationNo);

    console.log('✅ Attendance marked for:', registrationNo);
    console.log('Total attendees:', global.activeSession.attendees.length);

    res.status(200).json({
      success: true,
      message: 'Attendance marked successfully!',
      totalAttendees: global.activeSession.attendees.length,
    });
  } catch (error) {
    console.error('Check-in error:', error.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const Student = require('./models/Student');
const Teacher = require('./models/Teacher');
const Attendance = require('./models/Attendance');
const Notification = require('./models/Notification');

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
          registrationNo: user.registrationNo,
        }),
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ---------- CREATE ATTENDANCE SESSION ----------
app.post('/api/session/create', async (req, res) => {
  const { department, semester, subject, teacherId } = req.body;

  try {
    // Create a unique session ID
    const sessionId = 'SES-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    // Secret kept only for reference / future TOTP use — the live check-in
    // verification below uses a shared, time-stepped 6-digit token so both
    // the QR generator (TeacherDashboard) and the verifier (this server)
    // derive the exact same code from the current time, without needing to
    // pass any per-session secret over the wire.
    const secret = Math.random().toString(36).substring(2, 12);

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

// ---------- END ATTENDANCE SESSION ----------
app.post('/api/session/end', (req, res) => {
  global.activeSession = null;
  res.status(200).json({ success: true, message: 'Session ended.' });
});

// Helper: generate the list of tokens considered valid right now.
// Uses the same 5-second time-step formula as the frontend's generateToken()
// in TeacherDashboard.jsx, with a small window on either side to absorb
// clock drift and network/scan latency between the QR being displayed and
// the scan being verified here.
function getValidTokens() {
  const currentStep = Math.floor(Date.now() / 5000);
  const validTokens = [];
  for (let i = -2; i <= 2; i++) {
    const step = ((currentStep + i) % 1000000 + 1000000) % 1000000;
    validTokens.push(step.toString().padStart(6, '0'));
  }
  return validTokens;
}

// ---------- ATTENDANCE CHECK-IN (QR Scan) ----------
app.post('/api/attendance/check-in', async (req, res) => {
  const { studentId, registrationNo, qrData } = req.body;

  try {
    if (!registrationNo || !qrData) {
      return res.status(400).json({ success: false, message: 'Missing scan or student data. Please log in again.' });
    }

    console.log('📥 Check-in request received:');
    console.log('   Registration:', registrationNo);
    console.log('   QR Data:', qrData);

    // Parse QR data: "SESSION_ID.TOKEN"
    const parts = qrData.split('.');
    if (parts.length !== 2) {
      return res.status(400).json({ success: false, message: 'Invalid QR code format.' });
    }

    const [scannedSessionId, scannedToken] = parts;

    // Check if there's an active session
    if (!global.activeSession) {
      return res.status(400).json({ success: false, message: 'No active attendance session.' });
    }

    // Check if session ID matches
    if (scannedSessionId !== global.activeSession.sessionId) {
      return res.status(400).json({ success: false, message: 'Invalid session.' });
    }

    // Time-based token verification (matches QR refresh window on the teacher's screen)
    const validTokens = getValidTokens();
    console.log('   Expected tokens:', validTokens);
    console.log('   Scanned token:', scannedToken);

    if (!validTokens.includes(scannedToken)) {
      return res.status(400).json({ success: false, message: 'QR code expired. Please scan again.' });
    }

    // Check if student already checked in
    if (global.activeSession.attendees.includes(registrationNo)) {
      return res.status(200).json({ success: true, message: 'Already marked present.' });
    }

    // Find student in database
    const student = await Student.findOne({ registrationNo: registrationNo });

    if (!student) {
      return res.status(400).json({ success: false, message: 'Student not found. Please log in again.' });
    }

    // Save attendance record to MongoDB
    const newAttendance = new Attendance({
      sessionId: scannedSessionId,
      studentId: (studentId || student._id).toString(),
      registrationNo: registrationNo,
      studentName: student.fullName,
      department: global.activeSession.department,
      semester: global.activeSession.semester,
      subject: global.activeSession.subject,
      teacherId: global.activeSession.teacherId,
      method: 'qr',
    });

    await newAttendance.save();

    // Add to in-memory attendees list for this session (prevents duplicate scans)
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

// ---------- GET ATTENDANCE FOR SESSION (Teacher Live View) ----------
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

// ---------- CREATE NOTIFICATION (always global — every student sees it) ----------
app.post('/api/notifications/create', async (req, res) => {
  const { title, message, createdBy } = req.body;

  if (!title || !title.trim() || !message || !message.trim()) {
    return res.status(400).json({ success: false, message: 'Title and message are required.' });
  }

  try {
    const newNotification = new Notification({
      title: title.trim(),
      message: message.trim(),
      createdBy: createdBy || 'Teacher',
    });

    await newNotification.save();
    res.status(201).json({ success: true, notification: newNotification, message: 'Notification posted successfully!' });
  } catch (error) {
    console.error('Notification creation error:', error.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ---------- GET ALL NOTIFICATIONS (used by both student + teacher views) ----------
app.get('/api/notifications', async (req, res) => {
  try {
    const notifications = await Notification.find({}).sort({ createdAt: -1 });
    res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error('Fetch notifications error:', error.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ---------- MARK A NOTIFICATION AS READ (per student) ----------
app.post('/api/notifications/:id/read', async (req, res) => {
  const { id } = req.params;
  const { registrationNo } = req.body;

  try {
    if (!registrationNo) {
      return res.status(400).json({ success: false, message: 'registrationNo is required.' });
    }
    await Notification.findByIdAndUpdate(id, { $addToSet: { readBy: registrationNo } });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ---------- GET STUDENT PROFILE ----------
app.get('/api/student/:registrationNo', async (req, res) => {
  const { registrationNo } = req.params;

  try {
    const student = await Student.findOne({ registrationNo }).select('-password');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }
    res.status(200).json({ success: true, student });
  } catch (error) {
    console.error('Fetch profile error:', error.message);
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
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
  });

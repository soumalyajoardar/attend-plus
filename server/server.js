const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();
const { localDate } = require('./utils/localTime');

const Student = require('./models/Student');
const Teacher = require('./models/Teacher');
const Attendance = require('./models/Attendance');
const Notification = require('./models/Notification');
const Session = require('./models/Session');

const app = express();

// Middleware
// Allow the React frontend (production + local dev) to talk to this server.
// CLIENT_URL can be set to the exact Render/Vercel deployment URL.
const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL || 'https://attend-plus.onrender.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

// Log CORS config for debugging
console.log('🔧 CORS Allowed Origins:', ALLOWED_ORIGINS);

app.use(cors({
  origin: ['https://attend-plus.vercel.app', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json()); // Allows us to read JSON data from requests

// ---------- TEST ROUTE ----------
app.get('/', (req, res) => {
  res.send('Attend+ Backend is running!');
});

// Health check endpoint for connectivity testing
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    cors: process.env.CLIENT_URL 
  });
});

// Escapes a user-supplied string so it is safe to drop inside a RegExp literal.
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Anchored case-insensitive exact match. Registration numbers and teacher IDs
// are normalised to upper case on the way in, but records created before that
// normalisation existed may be stored in any casing — this makes the lookups
// find them anyway, so nobody is locked out of an account they already have.
const exactIgnoreCase = (value) => new RegExp(`^${escapeRegex(value)}$`, 'i');

// The minimum we accept server-side. The signup form enforces the same number,
// but the form is not the only way to reach this route.
const MIN_PASSWORD_LENGTH = 8;

// ---------- SIGNUP ROUTE ----------
app.post('/api/auth/signup', async (req, res) => {
  const { fullName, registrationNo, department, semester, email, parentEmail, password } = req.body;

  // Guard before any string method runs. These used to be called directly on
  // req.body values inside the try, so a request missing `email` threw a
  // TypeError and surfaced to the student as "Server error" instead of telling
  // them what was actually wrong.
  const required = { fullName, registrationNo, department, semester, email, parentEmail, password };
  const missing = Object.keys(required).filter(
    (key) => typeof required[key] !== 'string' || !required[key].trim()
  );
  if (missing.length) {
    return res.status(400).json({
      success: false,
      message: `Please fill in every field. Missing: ${missing.join(', ')}.`,
    });
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    });
  }

  // Registration numbers are stored upper case so that "d23cs001" and "D23CS001"
  // are one student rather than two. The unique index on the field is
  // case-sensitive, so without this it happily accepts both.
  const normalizedReg = registrationNo.trim().toUpperCase();
  const normalizedEmail = email.trim().toLowerCase();

  try {
    // 1. Look for anything already using this email or registration number.
    const [emailMatch, regMatch] = await Promise.all([
      Student.findOne({ email: normalizedEmail }),
      Student.findOne({ registrationNo: exactIgnoreCase(normalizedReg) }),
    ]);

    // A *rejected* registration may be re-submitted — the login screen tells
    // rejected students to "register again", which was impossible while any
    // existing record blocked the email. Pending and approved records still
    // block, as they should.
    if (emailMatch && emailMatch.status !== 'rejected') {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }
    if (regMatch && regMatch.status !== 'rejected') {
      return res
        .status(400)
        .json({ success: false, message: 'An account with this registration number already exists.' });
    }

    // Both matches are rejected records, but they're two *different* people —
    // we can't tell which one is being re-submitted, so don't guess.
    if (emailMatch && regMatch && String(emailMatch._id) !== String(regMatch._id)) {
      return res.status(400).json({
        success: false,
        message:
          'This email and registration number belong to two different past registrations. ' +
          'Please contact your teacher.',
      });
    }

    // 2. Hash the password (encrypt it)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const details = {
      fullName: fullName.trim(),
      registrationNo: normalizedReg,
      department,
      semester,
      email: normalizedEmail,
      parentEmail: parentEmail.trim().toLowerCase(),
      password: hashedPassword,
      status: 'pending',
      // Clear the old review so the teacher sees a fresh request, not a stale
      // "rejected by X" trail on something now awaiting approval.
      reviewedBy: null,
      reviewedAt: null,
    };

    // 3. Either revive the rejected record or create a new one. Held as
    //    'pending' until a teacher approves; a pending account cannot log in.
    const reinstating = emailMatch || regMatch;
    if (reinstating) {
      Object.assign(reinstating, details);
      await reinstating.save();
    } else {
      await new Student(details).save();
    }

    // 4. Send success response
    res.status(201).json({
      success: true,
      pending: true,
      message:
        'Registration submitted! Your account is waiting for teacher approval. ' +
        "You'll be able to log in once a teacher approves it.",
    });
  } catch (error) {
    console.error('Signup error:', error.message);

    // A unique-index collision that slipped past the checks above (two people
    // submitting the same details at the same instant). Name the field instead
    // of returning a bare 500.
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      const label = field === 'registrationNo' ? 'registration number' : 'email';
      return res.status(400).json({ success: false, message: `An account with this ${label} already exists.` });
    }

    // Bad department/semester (both are enums on the model) is the caller's
    // mistake, not ours.
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors)[0]?.message || 'Some of those details are not valid.',
      });
    }

    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
});

// ---------- LOGIN ROUTE (Unified) ----------
app.post('/api/auth/login', async (req, res) => {
  const { email, password, portal } = req.body;

  // `portal` is which tab the person picked on the login screen
  // ('student' or 'teacher'). When provided, the account's actual role
  // must match it — otherwise a student's valid credentials could log
  // someone into the teacher portal (and vice versa) just because the
  // password happened to be correct.
  const portalMismatch = (actualRole) => {
    if (portal && portal !== actualRole) {
      return res.status(400).json({
        success: false,
        message:
          actualRole === 'teacher'
            ? 'This ID belongs to a teacher account. Please use the Teacher tab to sign in.'
            : 'This ID belongs to a student account. Please use the Student tab to sign in.',
      });
    }
    return null;
  };

  const ADMIN_TEACHER_ID = process.env.ADMIN_TEACHER_ID || 'ADMIN-2026';
  const ADMIN_TEACHER_PASSWORD = process.env.ADMIN_TEACHER_PASSWORD || 'admin@2026';
  const ADMIN_TEACHER_EMAIL = process.env.ADMIN_TEACHER_EMAIL || 'admin@attendplus.com';

  // Hardcoded Student Login (For Testing) — move to env in production
  const TEST_STUDENT_EMAIL = process.env.TEST_STUDENT_EMAIL || 'student@test.com';
  const TEST_STUDENT_PASSWORD = process.env.TEST_STUDENT_PASSWORD || 'student@123';

  if (email === ADMIN_TEACHER_ID && password === ADMIN_TEACHER_PASSWORD) {
    if (portalMismatch('teacher')) return;

    const token = jwt.sign(
      { id: 'admin', email: ADMIN_TEACHER_EMAIL, role: 'teacher' },
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
        teacherId: ADMIN_TEACHER_ID,
        department: 'ALL',
        email: ADMIN_TEACHER_EMAIL,
      },
    });
  }

  if (email === TEST_STUDENT_EMAIL && password === TEST_STUDENT_PASSWORD) {
    if (portalMismatch('student')) return;

    const token = jwt.sign(
      { id: 'student123', email: TEST_STUDENT_EMAIL, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      token,
      role: 'student',
      user: {
        id: 'student123',
        fullName: 'Test Student',
        registrationNo: 'REG-2024-001',
        department: 'CST',
        semester: '3rd',
        email: TEST_STUDENT_EMAIL,
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

    if (portalMismatch(role)) return;

    // Approval gate: a student must be approved by a teacher before they can log
    // in. `undefined` covers legacy accounts created before the approval feature
    // existed — those are treated as already approved so the upgrade locks
    // nobody out. Only explicit 'pending' / 'rejected' are blocked.
    if (role === 'student') {
      if (user.status === 'pending') {
        return res.status(403).json({
          success: false,
          message: 'Your account is waiting for teacher approval. Please try again once it has been approved.',
        });
      }
      if (user.status === 'rejected') {
        return res.status(403).json({
          success: false,
          message: 'Your registration was not approved. Please contact your teacher or register again.',
        });
      }
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
    if (!department || !semester || !subject) {
      return res.status(400).json({ success: false, message: 'Department, semester and subject are required.' });
    }

    // Unique session id shown on the teacher's screen.
    const sessionId = 'SES-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    // Per-session HMAC key. Both the rotating QR token and the rotating manual
    // code are derived from this via deriveCode(). It is cryptographically
    // random (not Math.random) and is sent ONLY to the teacher's browser, never
    // to students — that is what stops a student computing a valid code on their
    // own phone from outside the classroom.
    const secret = crypto.randomBytes(20).toString('hex');

    // Persist the session so Reports and History have a real record of every
    // class that was held, and so verification survives a server restart.
    await Session.create({
      sessionId,
      secret,
      department,
      semester,
      subject,
      teacherId: teacherId || 'ADMIN-2026',
      active: true,
      startedAt: new Date(),
    });

    // In-memory pointer to the most recent session, kept only as a convenience.
    // All verification below reads from the database, so this is not load-bearing.
    global.activeSession = { sessionId, secret, department, semester, subject, teacherId };

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
app.post('/api/session/end', async (req, res) => {
  const { sessionId } = req.body;
  try {
    // End the specific session if given, otherwise end whatever is still active
    // (covers the older frontend that ended without passing an id).
    const filter = sessionId ? { sessionId } : { active: true };
    await Session.updateMany(filter, { $set: { active: false, endedAt: new Date() } });
    global.activeSession = null;
    res.status(200).json({ success: true, message: 'Session ended.' });
  } catch (error) {
    console.error('Session end error:', error.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ---------------------------------------------------------------------------
// Shared rotating-code derivation (HMAC-based, TOTP-style).
// ---------------------------------------------------------------------------
// deriveCode(secret, step, kind) returns a 6-digit code. The EXACT same
// function is reimplemented in the teacher's browser with the Web Crypto API
// (see TeacherDashboard.jsx -> deriveCode); both must produce identical output,
// which is checked by a parity test. `kind` namespaces the two code streams so
// the QR token and the manual code are always different values even if their
// time-steps ever coincide:
//   - QR token:    kind 'q', 5-second steps  (matches the QR refresh cadence)
//   - Manual code: kind 'm', 30-second steps (long enough to read and type)
function deriveCode(secret, step, kind) {
  const msg = `${kind}.${step}`;
  const h = crypto.createHmac('sha256', String(secret)).update(msg).digest();
  const offset = h[h.length - 1] & 0x0f;
  const bin =
    ((h[offset] & 0x7f) << 24) |
    ((h[offset + 1] & 0xff) << 16) |
    ((h[offset + 2] & 0xff) << 8) |
    (h[offset + 3] & 0xff);
  return (bin % 1000000).toString().padStart(6, '0');
}

// The set of codes accepted right now, for a given session secret and kind.
// A small window on either side absorbs clock drift between the teacher's
// browser and this server plus scan/typing latency. QR gets ±2 five-second
// steps (~10s); the manual code gets ±1 thirty-second step.
function getValidCodes(secret, kind) {
  const stepMs = kind === 'q' ? 5000 : 30000;
  const window = kind === 'q' ? 2 : 1;
  const currentStep = Math.floor(Date.now() / stepMs);
  const codes = [];
  for (let i = -window; i <= window; i++) {
    codes.push(deriveCode(secret, currentStep + i, kind));
  }
  return codes;
}

// Shared attendance writer used by both the QR and manual flows. Enforces the
// two anti-proxy rules — the student must belong to the session's class, and
// each student can only be recorded once per session — then saves the record.
async function markAttendance({ session, registrationNo, studentId, method }, res) {
  const student = await Student.findOne({ registrationNo });
  if (!student) {
    return res.status(400).json({ success: false, message: 'Student not found. Please log in again.' });
  }

  // Class binding: a check-in only counts for the class the session is for.
  // Without this, a student from another department/semester could mark
  // themselves present in a class they aren't part of — another form of proxy.
  if (student.department !== session.department || student.semester !== session.semester) {
    return res.status(403).json({
      success: false,
      message: `This session is for ${session.department} · Sem ${session.semester}. Your account is ${student.department} · Sem ${student.semester}, so you can't check in here.`,
    });
  }

  // One record per student per session (checked in the database so it holds
  // even across a server restart, unlike the old in-memory list).
  const existing = await Attendance.findOne({ sessionId: session.sessionId, registrationNo });
  if (existing) {
    return res.status(200).json({ success: true, message: 'Already marked present.', duplicate: true });
  }

  try {
    await Attendance.create({
      sessionId: session.sessionId,
      studentId: (studentId || student._id).toString(),
      registrationNo,
      studentName: student.fullName,
      department: session.department,
      semester: session.semester,
      subject: session.subject,
      teacherId: session.teacherId,
      method,
    });
  } catch (createErr) {
    // E11000 means two concurrent requests both passed the findOne check above
    // and raced to insert. The unique index caught the second one — that is
    // exactly "already marked present", so return a success rather than a 500.
    if (createErr.code === 11000) {
      return res.status(200).json({ success: true, message: 'Already marked present.', duplicate: true });
    }
    throw createErr; // unexpected error — let the outer catch handle it
  }

  const total = await Attendance.countDocuments({ sessionId: session.sessionId });
  console.log(`✅ Attendance (${method}) saved for ${student.fullName} — session ${session.sessionId} now has ${total}`);

  return res.status(200).json({
    success: true,
    message: 'Attendance marked successfully!',
    studentName: student.fullName,
    totalAttendees: total,
  });
}

// ---------- ATTENDANCE CHECK-IN (QR Scan) ----------
app.post('/api/attendance/check-in', async (req, res) => {
  const { studentId, registrationNo, qrData } = req.body;

  try {
    if (!registrationNo || !qrData) {
      return res.status(400).json({ success: false, message: 'Missing scan or student data. Please log in again.' });
    }

    // QR payload is "SESSION_ID.TOKEN"
    const parts = String(qrData).split('.');
    if (parts.length !== 2) {
      return res.status(400).json({ success: false, message: 'Invalid QR code format.' });
    }
    const [scannedSessionId, scannedToken] = parts;

    // Look the session up in the database (must still be active).
    const session = await Session.findOne({ sessionId: scannedSessionId, active: true });
    if (!session) {
      return res.status(400).json({ success: false, message: 'No active session for this QR. It may have ended.' });
    }

    // Verify the token was derived from THIS session's secret within the
    // current time window. A student who doesn't have the secret can't produce
    // a valid token, so a screenshot from a friend goes stale within seconds.
    if (!getValidCodes(session.secret, 'q').includes(scannedToken)) {
      return res.status(400).json({ success: false, message: 'QR code expired. Please scan again.' });
    }

    return await markAttendance({ session, registrationNo, studentId, method: 'qr' }, res);
  } catch (error) {
    console.error('Check-in error:', error.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ---------- ATTENDANCE CHECK-IN (Manual code fallback) ----------
// The student types only the 6-digit code — no session id. We match the code
// against every currently-active session's manual-code window and, if exactly
// one matches, record attendance there. This keeps the student's job to
// "type the code on the board" while still being tied to a real session.
app.post('/api/attendance/manual', async (req, res) => {
  const { studentId, registrationNo, code } = req.body;

  try {
    if (!registrationNo || !code) {
      return res.status(400).json({ success: false, message: 'Enter the code shown by your teacher.' });
    }
    const cleaned = String(code).replace(/\s+/g, '');
    if (!/^\d{6}$/.test(cleaned)) {
      return res.status(400).json({ success: false, message: 'The code should be 6 digits.' });
    }

    const activeSessions = await Session.find({ active: true });
    if (activeSessions.length === 0) {
      return res.status(400).json({ success: false, message: 'No active attendance session right now.' });
    }

    const matches = activeSessions.filter((s) => getValidCodes(s.secret, 'm').includes(cleaned));

    if (matches.length === 0) {
      return res.status(400).json({ success: false, message: 'That code is wrong or has expired. Check the latest code and try again.' });
    }
    if (matches.length > 1) {
      // Astronomically unlikely with random secrets, but handled rather than
      // silently marking the wrong class.
      return res.status(409).json({ success: false, message: 'Code matched more than one class. Please scan the QR instead.' });
    }

    return await markAttendance({ session: matches[0], registrationNo, studentId, method: 'manual' }, res);
  } catch (error) {
    console.error('Manual check-in error:', error.message);
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

// ---------- GET ALL ATTENDANCE (Teacher History, newest first) ----------
// Optional query filters: department, semester, subject, date. Powers the
// teacher's Attendance History page so it shows every past session, not just
// whatever happens to be live right now.
app.get('/api/attendance/all', async (req, res) => {
  const { department, semester, subject, date } = req.query;
  try {
    const filter = {};
    if (department) filter.department = department;
    if (semester) filter.semester = semester;
    if (subject) filter.subject = subject;
    if (date) filter.date = date;
    const records = await Attendance.find(filter).sort({ timestamp: -1 }).limit(1000);
    res.status(200).json({ success: true, records });
  } catch (error) {
    console.error('Fetch all attendance error:', error.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ---------------------------------------------------------------------------
// STUDENT APPROVAL WORKFLOW
// ---------------------------------------------------------------------------

// List registrations awaiting review (default) or by a given status.
app.get('/api/students/pending', async (req, res) => {
  const { status = 'pending' } = req.query;
  try {
    const students = await Student.find({ status }).select('-password').sort({ createdAt: -1 });
    res.status(200).json({ success: true, students });
  } catch (error) {
    console.error('Fetch pending students error:', error.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Counts for the sidebar badge / dashboard tiles.
app.get('/api/students/counts', async (req, res) => {
  try {
    const [pending, approved, rejected] = await Promise.all([
      Student.countDocuments({ status: 'pending' }),
      Student.countDocuments({ status: 'approved' }),
      Student.countDocuments({ status: 'rejected' }),
    ]);
    res.status(200).json({ success: true, counts: { pending, approved, rejected } });
  } catch (error) {
    console.error('Counts error:', error.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Approve or reject a registration. `action` is 'approve' or 'reject'.
app.post('/api/students/:id/review', async (req, res) => {
  const { id } = req.params;
  const { action, reviewedBy } = req.body;
  try {
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action must be approve or reject.' });
    }
    const status = action === 'approve' ? 'approved' : 'rejected';
    const student = await Student.findByIdAndUpdate(
      id,
      { $set: { status, reviewedBy: reviewedBy || 'Teacher', reviewedAt: new Date() } },
      { new: true }
    ).select('-password');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }
    res.status(200).json({ success: true, student, message: `Registration ${status}.` });
  } catch (error) {
    console.error('Review error:', error.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Full student roster for the teacher's "Manage Students" page. Unlike
// /api/students/pending this returns every status by default, and supports a
// text search across name / registration number / email plus the usual
// department + semester filters. Passwords are never selected.
app.get('/api/students', async (req, res) => {
  const { status, department, semester, search } = req.query;

  try {
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (department && department !== 'all') query.department = department;
    if (semester && semester !== 'all') query.semester = semester;

    if (search && search.trim()) {
      // Escape regex metacharacters so a stray '(' or '*' in the search box
      // can't throw, and so nobody can craft a catastrophic backtracking input.
      const safe = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(safe, 'i');
      query.$or = [{ fullName: rx }, { registrationNo: rx }, { email: rx }];
    }

    const students = await Student.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(500);

    res.status(200).json({ success: true, students, count: students.length });
  } catch (error) {
    console.error('Fetch students error:', error.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Teacher-initiated deletion of a student account.
//
// Two deliberate decisions here, mirroring the student self-delete above:
//
// 1. Authorisation is "type the registration number to confirm". The client
//    sends `confirmRegistrationNo` and the server checks it against the target
//    student's actual registration number — the check is re-done here rather
//    than trusted from the UI, so a direct API call can't skip it. This makes
//    it effectively impossible to delete the wrong student by a mis-click,
//    which is the realistic failure mode for a teacher working through a list.
//    Note this is a mistake-guard, not an identity check: like every other
//    route in this app there is no auth middleware, so it does not stop a
//    determined caller. Adding real teacher auth is the right follow-up.
// 2. Attendance rows are KEPT, for the same reason as the student self-delete:
//    they are institutional records that the class percentages are computed
//    from, and they store the name/registrationNo denormalised so they stay
//    readable after the Student document is gone.
app.post('/api/students/:id/delete', async (req, res) => {
  const { id } = req.params;
  const { confirmRegistrationNo, deletedBy } = req.body;

  try {
    if (!confirmRegistrationNo || !String(confirmRegistrationNo).trim()) {
      return res.status(400).json({
        success: false,
        message: "Type the student's registration number to confirm the deletion.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid student id.' });
    }

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found — they may already have been deleted.',
      });
    }

    // Case- and whitespace-insensitive: registration numbers are printed on ID
    // cards in varying cases and the teacher is retyping from screen.
    const typed = String(confirmRegistrationNo).trim().toLowerCase();
    if (typed !== student.registrationNo.trim().toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: `That does not match. Type ${student.registrationNo} exactly to delete this student.`,
      });
    }

    const keptRecords = await Attendance.countDocuments({
      registrationNo: student.registrationNo,
    });

    await Student.findByIdAndDelete(id);

    console.log(
      `🗑️  Student deleted by ${deletedBy || 'a teacher'}: ${student.fullName} ` +
        `(${student.registrationNo}) — ${keptRecords} attendance record(s) retained.`
    );

    res.status(200).json({
      success: true,
      keptRecords,
      student: { fullName: student.fullName, registrationNo: student.registrationNo },
      message: `${student.fullName} has been permanently deleted.`,
    });
  } catch (error) {
    console.error('Teacher delete student error:', error.message);
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
});

// ---------------------------------------------------------------------------
// REPORTS
// ---------------------------------------------------------------------------
// Attendance % is computed against classes actually HELD, taken from the
// Session collection. "Held for a student" = sessions run for that student's
// department + semester (optionally a single subject). "Attended" = distinct
// sessions the student has an Attendance record in. This is the standard way
// colleges compute the percentage, and it's only possible because sessions are
// now persisted.
app.get('/api/reports/summary', async (req, res) => {
  const { department, semester, subject } = req.query;
  try {
    // "Held" counts every session for the class (both finished and currently
    // live), so a running class is reflected in the percentage too.
    const heldFilter = {};
    if (department) heldFilter.department = department;
    if (semester) heldFilter.semester = semester;
    if (subject) heldFilter.subject = subject;
    const heldSessions = await Session.find(heldFilter);
    const totalHeld = heldSessions.length;
    const heldSessionIds = heldSessions.map((s) => s.sessionId);

    // Which students are in scope: approved students matching the filters.
    const studentFilter = { status: { $ne: 'rejected' } };
    if (department) studentFilter.department = department;
    if (semester) studentFilter.semester = semester;
    const students = await Student.find(studentFilter).select('-password');

    // All attendance rows for the held sessions, grouped by student.
    const rows = await Attendance.find({ sessionId: { $in: heldSessionIds } });
    const attendedByReg = {};
    for (const r of rows) {
      attendedByReg[r.registrationNo] = attendedByReg[r.registrationNo] || new Set();
      attendedByReg[r.registrationNo].add(r.sessionId);
    }

    const report = students.map((s) => {
      const attended = attendedByReg[s.registrationNo] ? attendedByReg[s.registrationNo].size : 0;
      const percentage = totalHeld > 0 ? Math.round((attended / totalHeld) * 1000) / 10 : 0;
      return {
        registrationNo: s.registrationNo,
        fullName: s.fullName,
        department: s.department,
        semester: s.semester,
        attended,
        held: totalHeld,
        percentage,
      };
    });

    report.sort((a, b) => a.percentage - b.percentage);

    res.status(200).json({
      success: true,
      totalHeld,
      totalStudents: report.length,
      report,
    });
  } catch (error) {
    console.error('Reports summary error:', error.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// One row per session held (the class register): counts + who was present.
app.get('/api/reports/sessions', async (req, res) => {
  const { department, semester, subject } = req.query;
  try {
    const filter = {};
    if (department) filter.department = department;
    if (semester) filter.semester = semester;
    if (subject) filter.subject = subject;
    const sessions = await Session.find(filter).sort({ startedAt: -1 }).limit(500);

    const summaries = await Promise.all(
      sessions.map(async (s) => {
        const present = await Attendance.countDocuments({ sessionId: s.sessionId });
        const enrolled = await Student.countDocuments({
          department: s.department,
          semester: s.semester,
          status: { $ne: 'rejected' },
        });
        return {
          sessionId: s.sessionId,
          subject: s.subject,
          department: s.department,
          semester: s.semester,
          date: s.date || (s.startedAt ? localDate(s.startedAt) : ''),
          startedAt: s.startedAt,
          active: s.active,
          present,
          enrolled,
          absent: Math.max(enrolled - present, 0),
        };
      })
    );

    res.status(200).json({ success: true, sessions: summaries });
  } catch (error) {
    console.error('Reports sessions error:', error.message);
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

// ---------- DELETE STUDENT PROFILE (self-service, permanent) ----------
// A student can permanently remove their own account from the Settings screen.
//
// Two deliberate decisions here:
//
// 1. The current password must be supplied and is bcrypt-checked before
//    anything is removed. This route is destructive and irreversible, and
//    (like every other route in this app) it has no auth middleware in front
//    of it yet, so the password IS the authorisation check. Without it,
//    knowing a student's id would be enough to wipe their account.
// 2. Attendance rows are intentionally NOT deleted. They are institutional
//    records: the teacher's reports and each class's attendance percentage are
//    computed from them, so cascading the delete would silently rewrite
//    history for classes that already happened. The Attendance schema stores
//    the name/registrationNo denormalised, so those rows stay readable even
//    once the Student document is gone.
app.post('/api/student/:id/delete', async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  try {
    if (!password) {
      return res
        .status(400)
        .json({ success: false, message: 'Your password is required to delete this account.' });
    }

    // The demo/testing login (student@test.com) is hardcoded in the login route
    // and has no database record, so its id is not a real ObjectId. Bail out
    // clearly instead of letting Mongoose throw a CastError.
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: 'This is a demo account and cannot be deleted.' });
    }

    const student = await Student.findById(id);
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: 'Account not found — it may already have been deleted.' });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: 'Incorrect password. Your account was NOT deleted.' });
    }

    // Count the attendance we're keeping so the response can tell the student
    // exactly what remains on record.
    const keptRecords = await Attendance.countDocuments({
      registrationNo: student.registrationNo,
    });

    await Student.findByIdAndDelete(id);

    console.log(
      `🗑️  Student account deleted: ${student.registrationNo} (${student.email}) — ` +
        `${keptRecords} attendance record(s) retained.`
    );

    res.status(200).json({
      success: true,
      keptRecords,
      message: 'Your account has been permanently deleted.',
    });
  } catch (error) {
    console.error('Delete student error:', error.message);
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
});

// ---------- CONNECT TO DATABASE & START SERVER ----------
const PORT = process.env.PORT || 5000;

// Validate critical environment variables
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change_this_to_a_long_random_secret') {
  console.error('❌ FATAL: JWT_SECRET is not set or is using the default value.');
  console.error('   Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}

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

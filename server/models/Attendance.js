const mongoose = require('mongoose');
const { localDate, localTime } = require('../utils/localTime');

const AttendanceSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
    },
    studentId: {
      type: String,
      required: true,
    },
    registrationNo: {
      type: String,
      required: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    semester: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    teacherId: {
      type: String,
      default: 'ADMIN-2026',
    },
    // Both of these are institution-local (see utils/localTime.js). They used to
    // be derived from the server clock, which files a 9:30 AM IST class as
    // "04:00:00" once deployed to a UTC host.
    date: {
      type: String,
      default: () => localDate(),
    },
    time: {
      type: String,
      default: () => localTime(),
    },
    method: {
      type: String,
      enum: ['qr', 'manual', 'teacher_override'],
      default: 'qr',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// One row per student per session — enforced in the database, not just by the
// findOne() pre-check in markAttendance(). Two check-ins arriving at almost the
// same moment (an impatient double-tap, or the QR and manual flows racing) both
// pass that check before either has written, so without this index they both
// insert. The route catches the resulting E11000 and reports it as an
// already-marked success.
AttendanceSchema.index({ sessionId: 1, registrationNo: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
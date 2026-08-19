const mongoose = require('mongoose');

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
    date: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
    },
    time: {
      type: String,
      default: () => new Date().toLocaleTimeString(),
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

module.exports = mongoose.model('Attendance', AttendanceSchema);
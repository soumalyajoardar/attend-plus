const mongoose = require('mongoose');
const { localDate } = require('../utils/localTime');

// One document per attendance session a teacher runs. Persisting this (rather
// than only holding it in a global variable) is what makes the Reports page
// possible: attendance % only means something if we know how many classes were
// actually *held*, and that is exactly one Session document per class.
//
// The `secret` is the per-session HMAC key. Both the rotating QR token and the
// rotating manual code are derived from it (see server.js -> deriveCode). It is
// sent to the teacher's browser so it can render the codes, but it is never
// sent to students, which is what stops a student computing a valid code on
// their own phone.
const SessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    secret: {
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
    // A session is "active" from Start Attendance until End Session. Only active
    // sessions accept check-ins, and the manual-code flow looks up the (usually
    // single) active session by matching the typed code against it.
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    // Institution-local calendar day, not the host's (see utils/localTime.js) —
    // otherwise an evening class on a UTC server is filed under the day before.
    date: {
      type: String,
      default: () => localDate(),
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Session', SessionSchema);

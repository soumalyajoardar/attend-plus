const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    registrationNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      enum: ['CST', 'ETCE', 'EIE', 'CIVIL', 'MECHANICAL', 'EE'],
    },
    semester: {
      type: String,
      required: true,
      enum: ['1st', '2nd', '3rd', '4th', '5th', '6th'],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    parentEmail: {
      type: String,
      required: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    // Approval workflow: a new registration is 'pending' until a teacher
    // approves it. Only 'approved' students can log in. Legacy records created
    // before this field existed will read back as undefined, which the login
    // route treats as already-approved so nobody gets locked out by the upgrade.
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    // Audit trail for who acted on the registration and when — handy for the
    // teacher UI and for explaining a rejection later.
    reviewedBy: {
      type: String,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Student', StudentSchema);
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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Student', StudentSchema);
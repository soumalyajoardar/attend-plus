const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      enum: ['ALL', 'CST', 'ETCE', 'EIE', 'CIVIL', 'MECHANICAL', 'EE'],
      default: 'ALL',
    },
    semester: {
      type: String,
      required: true,
      enum: ['ALL', '1st', '2nd', '3rd', '4th', '5th', '6th'],
      default: 'ALL',
    },
    createdBy: {
      type: String,
      default: 'Teacher',
    },
    readBy: {
      type: [String], // Array of student registration numbers who have read
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Notification', NotificationSchema);
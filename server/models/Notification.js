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
    // Notifications now always go out globally to every student, so the old
    // per-department / per-semester targeting fields have been removed.
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
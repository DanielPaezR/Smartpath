import mongoose from 'mongoose';

const adminNotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['visit_started', 'visit_completed', 'task_completed', 'delay_alert', 'issue_reported'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  relatedStoreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: false
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

adminNotificationSchema.index({ createdAt: -1, isRead: 1 });

export const AdminNotification = mongoose.model('AdminNotification', adminNotificationSchema);
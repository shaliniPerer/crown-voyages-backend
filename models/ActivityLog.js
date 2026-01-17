import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'create',
      'update',
      'delete',
      'login',
      'logout',
      'send_email',
      'generate_pdf',
      'record_payment',
      'convert_quotation',
      'convert_lead',
      'other'
    ]
  },
  resource: {
    type: String,
    required: true,
    enum: [
      'user',
      'resort',
      'room',
      'booking',
      'quotation',
      'invoice',
      'payment',
      'lead',
      'auth',
      'receipt',
      'voucher',
      'other'
    ]
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  description: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Index for faster searches
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ resource: 1, action: 1 });
activityLogSchema.index({ createdAt: -1 });

// TTL index to automatically delete logs older than 90 days
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export default ActivityLog;
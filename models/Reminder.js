import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
  reminderType: {
    type: String,
    enum: ['before', 'on', 'after'],
    required: true
  },
  days: {
    type: Number,
    required: true,
    min: 1
  },
  frequency: {
    type: String,
    enum: ['once', 'daily', 'weekly'],
    default: 'once'
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  template: {
    type: String,
    required: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  lastRun: {
    type: Date
  },
  nextRun: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for faster searches
reminderSchema.index({ enabled: 1, nextRun: 1 });

const Reminder = mongoose.model('Reminder', reminderSchema);

export default Reminder;
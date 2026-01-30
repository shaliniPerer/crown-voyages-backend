import mongoose from 'mongoose';

const quotationSchema = new mongoose.Schema({
  quotationNumber: {
    type: String,
    unique: true,
    required: true
  },
  customerName: {
    type: String,
    required: [true, 'Please provide customer name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide email'],
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: [true, 'Please provide phone number'],
    trim: true
  },
  resort: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resort'
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  },
  amount: {
    type: Number,
    required: [true, 'Please provide base amount'],
    min: [0, 'Amount cannot be negative']
  },
  discountValue: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  finalAmount: {
    type: Number,
    required: true,
    min: [0, 'Final amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'],
    default: 'Draft'
  },
  validUntil: {
    type: Date,
    required: false
  },
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  },
  versions: [{
    version: {
      type: Number,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    notes: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  notes: {
    type: String,
    trim: true
  },
  terms: {
    type: String,
    trim: true
  },
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  },
  convertedToBooking: {
    type: Boolean,
    default: false
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  sentAt: {
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

// Generate quotation number before saving
quotationSchema.pre('save', async function(next) {
  // Set validity period (default 30 days)
  if (this.isNew && !this.validUntil) {
    this.validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  next();
});

// Check if quotation is expired
quotationSchema.methods.isExpired = function() {
  return new Date() > this.validUntil && this.status !== 'Accepted';
};

// Index for faster searches
quotationSchema.index({ quotationNumber: 1 });
quotationSchema.index({ status: 1, createdAt: -1 });
quotationSchema.index({ resort: 1 });

const Quotation = mongoose.model('Quotation', quotationSchema);

export default Quotation;
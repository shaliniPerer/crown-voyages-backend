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
    ref: 'Resort',
    required: [true, 'Please specify the resort']
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  },
  checkIn: {
    type: Date,
    required: [true, 'Please provide check-in date']
  },
  checkOut: {
    type: Date,
    required: [true, 'Please provide check-out date']
  },
  adults: {
    type: Number,
    required: [true, 'Please specify number of adults'],
    min: [1, 'At least 1 adult required']
  },
  children: {
    type: Number,
    default: 0,
    min: [0, 'Children cannot be negative']
  },
  totalAmount: {
    type: Number,
    required: [true, 'Please provide total amount'],
    min: [0, 'Amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'],
    default: 'Draft'
  },
  validUntil: {
    type: Date,
    required: true
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
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.quotationNumber = `QT${year}${month}${random}`;
    
    // Set validity period (default 30 days)
    if (!this.validUntil) {
      this.validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
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
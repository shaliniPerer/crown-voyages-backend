import mongoose from 'mongoose';

const receiptSchema = new mongoose.Schema({
  receiptNumber: {
    type: String,
    unique: true,
    required: false
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  },
  customerName: {
    type: String,
    required: [true, 'Please provide customer name'],
    trim: true
  },
  email: {
    type: String,
    // required: [true, 'Please provide email'],
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
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
  bookingTotal: {
    type: Number,
    required: true,
    default: 0
  },
  remainingBalance: {
    type: Number,
    required: true,
    default: 0
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Credit Card', 'Bank Transfer', 'Check', 'Online Payment'],
    default: 'Cash'
  },
  status: {
    type: String,
    enum: ['Draft', 'Received', 'Processed'],
    default: 'Received'
  },
  notes: {
    type: String,
    trim: true
  },
  sentAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-increment receipt number
receiptSchema.pre('save', async function(next) {
  if (this.isNew && !this.receiptNumber) {
    const lastReceipt = await mongoose.model('Receipt').findOne().sort({ createdAt: -1 });
    let lastNumber = 0;
    if (lastReceipt && lastReceipt.receiptNumber) {
      const parsed = parseInt(lastReceipt.receiptNumber.replace('REC-', ''));
      if (!isNaN(parsed)) {
        lastNumber = parsed;
      }
    }
    this.receiptNumber = `REC-${String(lastNumber + 1).padStart(6, '0')}`;
  }
  next();
});

export default mongoose.model('Receipt', receiptSchema);

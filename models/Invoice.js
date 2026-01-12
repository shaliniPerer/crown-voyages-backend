import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true,
    required: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
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
    required: [true, 'Please provide email'],
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
  paidAmount: {
    type: Number,
    default: 0,
    min: [0, 'Paid amount cannot be negative']
  },
  balance: {
    type: Number,
    required: true,
    min: [0, 'Balance cannot be negative']
  },
  dueDate: {
    type: Date,
    required: false
  },
  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Pending', 'Partial', 'Paid', 'Overdue', 'Cancelled'],
    default: 'Draft'
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
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Generate invoice number before saving
invoiceSchema.pre('save', async function(next) {
  // Calculate balance
  this.balance = this.finalAmount - this.paidAmount;

  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.invoiceNumber = `INV${year}${month}${random}`;
  }
  next();
});

// Check if invoice is overdue
invoiceSchema.methods.isOverdue = function() {
  return new Date() > this.dueDate && this.status !== 'Paid' && this.status !== 'Cancelled';
};

// Index for faster searches
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ booking: 1 });
invoiceSchema.index({ status: 1, createdAt: -1 });
invoiceSchema.index({ dueDate: 1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;
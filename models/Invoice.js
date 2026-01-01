import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true,
    required: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
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
    trim: true
  },
  totalAmount: {
    type: Number,
    required: [true, 'Please provide total amount'],
    min: [0, 'Amount cannot be negative']
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: [0, 'Tax amount cannot be negative']
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: [0, 'Discount amount cannot be negative']
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
    default: 0
  },
  dueDate: {
    type: Date,
    required: [true, 'Please provide due date']
  },
  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Pending', 'Partial', 'Paid', 'Overdue', 'Cancelled'],
    default: 'Pending'
  },
  items: [{
    description: String,
    quantity: Number,
    unitPrice: Number,
    amount: Number
  }],
  notes: {
    type: String,
    trim: true
  },
  sentAt: {
    type: Date
  },
  paidAt: {
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
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.invoiceNumber = `INV${year}${month}${random}`;
  }
  
  // Calculate balance
  this.balance = this.finalAmount - this.paidAmount;
  
  // Update status based on payment
  if (this.paidAmount >= this.finalAmount) {
    this.status = 'Paid';
    if (!this.paidAt) {
      this.paidAt = new Date();
    }
  } else if (this.paidAmount > 0) {
    this.status = 'Partial';
  } else if (new Date() > this.dueDate && this.status !== 'Paid') {
    this.status = 'Overdue';
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
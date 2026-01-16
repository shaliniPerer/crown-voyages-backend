import mongoose from 'mongoose';

const voucherSchema = new mongoose.Schema({
  voucherNumber: {
    type: String,
    unique: true
  },
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  customerName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  resortName: {
    type: String
  },
  roomName: {
    type: String
  },
  checkIn: {
    type: Date
  },
  checkOut: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Generated', 'Sent', 'Cancelled'],
    default: 'Generated'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Auto-increment voucher number
voucherSchema.pre('save', async function(next) {
  if (this.isNew && !this.voucherNumber) {
    const lastVoucher = await mongoose.model('Voucher').findOne().sort({ createdAt: -1 });
    let lastNumber = 0;
    if (lastVoucher && lastVoucher.voucherNumber) {
      const parsed = parseInt(lastVoucher.voucherNumber.replace('VCH-', ''));
      if (!isNaN(parsed)) {
        lastNumber = parsed;
      }
    }
    this.voucherNumber = `VCH-${String(lastNumber + 1).padStart(6, '0')}`;
  }
  next();
});

export default mongoose.model('Voucher', voucherSchema);

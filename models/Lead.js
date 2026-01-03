import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema({
 guestName: {
    type: String,
    required: [true, 'Guest name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  resort: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resort',
    required: [true, 'Resort is required']
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'Room is required']
  },
  checkIn: {
    type: Date,
    required: [true, 'Check-in date is required']
  },
  checkOut: {
    type: Date,
    required: [true, 'Check-out date is required']
  },
  adults: {
    type: Number,
    required: [true, 'Number of adults is required'],
    min: 1
  },
  children: {
    type: Number,
    default: 0
  },
  rooms: {
    type: Number,
    default: 1
  },
  mealPlan: {
    type: String
  },
  mealPlanPrice: {
    type: Number,
    default: 0
  },
  specialRequests: {
    type: String
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required']
  },
  source: {
    type: String,
    default: 'Website'
  },
  status: {
    type: String,
    enum: ['New', 'Pending', 'Quotation', 'Invoice', 'Receipt', 'Confirmed', 'Cancelled', 'Converted'],
    default: 'New'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;
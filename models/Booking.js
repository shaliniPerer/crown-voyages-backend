import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  bookingNumber: {
    type: String,
    unique: true
  },
  guestName: {
    type: String,
    required: [true, 'Please provide guest name'],
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
    ref: 'Room',
    required: [true, 'Please specify the room']
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
  rooms: {
    type: Number,
    default: 1,
    min: [1, 'At least 1 room required']
  },
  mealPlan: {
    type: String
  },
  totalAmount: {
    type: Number,
    required: [true, 'Please provide total amount'],
    min: [0, 'Amount cannot be negative']
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
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Checked-in', 'Checked-out', 'Cancelled', 'No-show'],
    default: 'Pending'
  },
  quotation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quotation'
  },
  specialRequests: {
    type: String,
    trim: true
  },
  // Room configurations per room
  roomConfigs: [{
    adults: { type: Number, required: true },
    children: { type: Number, default: 0 },
    childrenAges: [{ type: Number }]
  }],
  // Saved bookings summary (for multiple room bookings)
  savedBookings: [{
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    roomName: { type: String },
    roomType: { type: String },
    roomDescription: { type: String },
    roomSize: { type: Number },
    roomBedType: { type: String },
    roomMaxAdults: { type: Number },
    roomMaxChildren: { type: Number },
    roomAmenities: [{ type: String }],
    roomImages: [{ type: String }],
    resortId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resort' },
    resortName: { type: String },
    resortLocation: { type: String },
    resortStarRating: { type: Number },
    resortDescription: { type: String },
    resortAmenities: [{ type: String }],
    resortMealPlan: { type: String },
    resortImages: [{ type: String }],
    checkIn: { type: Date },
    checkOut: { type: Date },
    mealPlan: { type: String },
    roomConfigs: [{
      adults: { type: Number },
      children: { type: Number },
      childrenAges: [{ type: Number }]
    }],
    totalRooms: { type: Number },
    totalAdults: { type: Number },
    totalChildren: { type: Number }
  }],
  // Passenger details
  passengerDetails: [{
    bookingIndex: { type: Number },
    bookingName: { type: String },
    roomName: { type: String },
    roomNumber: { type: Number },
    adults: [{
      name: { type: String },
      passport: { type: String },
      country: { type: String },
      arrivalFlightNumber: { type: String },
      arrivalTime: { type: String },
      departureFlightNumber: { type: String },
      departureTime: { type: String }
    }],
    children: [{
      name: { type: String },
      passport: { type: String },
      country: { type: String },
      age: { type: Number },
      arrivalFlightNumber: { type: String },
      arrivalTime: { type: String },
      departureFlightNumber: { type: String },
      departureTime: { type: String }
    }]
  }],
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Generate booking number before saving
bookingSchema.pre('save', async function(next) {
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.bookingNumber = `BK${year}${month}${random}`;
  }
  
  // Calculate balance
  this.balance = this.totalAmount - this.paidAmount;
  
  next();
});

// Validate dates
bookingSchema.pre('save', function(next) {
  if (this.checkOut <= this.checkIn) {
    return next(new Error('Check-out date must be after check-in date'));
  }
  next();
});

// Index for faster searches
bookingSchema.index({ bookingNumber: 1 });
bookingSchema.index({ resort: 1, status: 1 });
bookingSchema.index({ checkIn: 1, checkOut: 1 });
bookingSchema.index({ createdAt: -1 });

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
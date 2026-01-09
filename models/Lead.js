import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema({
  leadNumber: {
    type: String,
    unique: true
  },
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
  paidAmount: {
    type: Number,
    default: 0
  },
  balance: {
    type: Number,
    default: 0
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
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
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
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Calculate balance before saving
leadSchema.pre('save', function(next) {
  this.balance = this.totalAmount - (this.paidAmount || 0);
  next();
});

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;
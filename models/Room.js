import mongoose from 'mongoose';

/* ---------------- TRANSPORTATION SCHEMA ---------------- */
const transportationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['arrival', 'departure'],
      required: true,
    },
    method: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

/* ---------------- AVAILABILITY SCHEMA ---------------- */
const availabilitySchema = new mongoose.Schema(
  {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  { _id: false }
);

/* ---------------- ROOM SCHEMA ---------------- */
const roomSchema = new mongoose.Schema(
  {
    /* ---------------- RELATION ---------------- */
    resort: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resort',
      required: true,
    },

    /* ---------------- BASIC INFO ---------------- */
    roomName: {
      type: String,
      required: true,
      trim: true,
    },

    roomType: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: '',
    },

    size: {
      type: Number,
      default: null,
    },

    bedType: {
      type: String,
      default: '',
    },

    /* ---------------- CAPACITY ---------------- */
    maxAdults: {
      type: Number,
      required: true,
      min: 1,
      default: 2,
    },

    maxChildren: {
      type: Number,
      default: 0,
      min: 0,
    },

    /* ---------------- PRICING ---------------- */
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    /* ---------------- FEATURES ---------------- */
    amenities: {
      type: [String],
      default: [],
    },

    transportations: {
      type: [transportationSchema],
      default: [],
    },

    /* ---------------- AVAILABILITY ---------------- */
    availabilityCalendar: {
      type: [availabilitySchema],
      default: [],
    },

    /* ---------------- MEDIA ---------------- */
    images: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Room', roomSchema);

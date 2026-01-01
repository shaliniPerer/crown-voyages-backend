import mongoose from 'mongoose';

const resortSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide resort name'],
    trim: true,
    maxlength: [200, 'Resort name cannot exceed 200 characters']
  },
  location: {
    type: String,
    required: [true, 'Please provide resort location'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide resort description'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  starRating: {
    type: Number,
    required: [true, 'Please provide star rating'],
    min: 1,
    max: 5,
    default: 5
  },
  amenities: [{ type: String, trim: true }],
  mealPlan: { type: String, trim: true },  // Corrected to singular string
  images: [{ type: String, required: true }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Indexes for search
resortSchema.index({ name: 1, location: 1 });
resortSchema.index({ starRating: -1 });

const Resort = mongoose.model('Resort', resortSchema);
export default Resort;

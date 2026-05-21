import mongoose from 'mongoose';

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  address: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['hotel', 'home_chef'], required: true },
  image: { type: String },
  rating: { type: Number, default: 0 },
  cuisine: [{ type: String }],
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const Restaurant = mongoose.model('Restaurant', restaurantSchema);

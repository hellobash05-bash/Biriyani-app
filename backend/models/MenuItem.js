import mongoose from 'mongoose';

const menuSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  offerPrice: { type: Number },
  discountPercentage: { type: Number },
  category: { type: String, required: true }, // e.g., 'Chicken', 'Mutton', 'Veg'
  image: { type: String }, // URL or placeholder path
  isAvailable: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export const MenuItem = mongoose.model('MenuItem', menuSchema);

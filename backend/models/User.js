import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  label: { type: String, required: true }, // e.g., 'Home', 'Office'
  detail: { type: String, required: true },
  isDefault: { type: Boolean, default: false }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'hotel', 'home_chef', 'admin'], default: 'customer' },
  phone: { type: String },
  addresses: [addressSchema],
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' }],
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model('User', userSchema);

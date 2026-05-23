import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  label: { type: String, required: true }, // e.g., 'Home', 'Office'
  house: { type: String },
  street: { type: String },
  city: { type: String },
  pincode: { type: String },
  landmark: { type: String },
  detail: { type: String, required: true }, // Full address string
  isDefault: { type: Boolean, default: false }
});

const userSchema = new mongoose.Schema({
  uid: { type: String, unique: true, sparse: true }, // Firebase UID
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Optional for social login
  role: { type: String, enum: ['customer', 'hotel', 'home_chef', 'admin'], default: 'customer' },
  phone: { type: String },
  addresses: [addressSchema],
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' }],
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model('User', userSchema);

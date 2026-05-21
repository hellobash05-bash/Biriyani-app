import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  userEmail: { type: String }, // To link order to a registered user
  customer: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: {
      house: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, required: true },
      pincode: { type: String, required: true },
      landmark: { type: String },
      fullAddress: { type: String } // Combined for backward compatibility or simple display
    },
  },
  items: [
    {
      name: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
      image: { type: String },
    }
  ],
  totalAmount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['Order Placed', 'Preparing Food', 'Picked Up', 'Out for Delivery', 'Delivered'], 
    default: 'Order Placed' 
  },
  paymentMethod: { type: String, default: 'Cash on Delivery' },
  paymentStatus: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
  deliveryPartner: {
    name: { type: String },
    phone: { type: String },
    vehicleNumber: { type: String },
  },
  estimatedDeliveryTime: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const Order = mongoose.model('Order', orderSchema);

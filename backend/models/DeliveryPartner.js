import mongoose from 'mongoose';

const deliveryPartnerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  vehicleNumber: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Available', 'Busy', 'Offline'], 
    default: 'Available' 
  },
  activeOrders: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export const DeliveryPartner = mongoose.model('DeliveryPartner', deliveryPartnerSchema);

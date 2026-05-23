import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MenuItem } from './models/MenuItem.js';
import { Order } from './models/Order.js';
import { User } from './models/User.js';
import { Restaurant } from './models/Restaurant.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // allow all in dev
    methods: ["GET", "POST", "PATCH", "DELETE"]
  }
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Pass io to requests if needed, though we can use it directly in closures
app.use((req, res, next) => {
  req.io = io;
  next();
});

io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);
  
  // Clients can join a room specific to their order ID to get private updates
  socket.on('joinOrderRoom', (orderId) => {
    socket.join(`order_${orderId}`);
    console.log(`Socket ${socket.id} joined room order_${orderId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Use a self-invoking function to handle async setup if needed
let mongoServer;
const connectDB = async () => {
  let uri = process.env.MONGODB_URI;
  
  // Force local memory server if cloud fails or for easier dev
  if (!uri || uri.includes('mongodb+srv')) {
    console.log('Using local Memory Server for database...');
    try {
      mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
    } catch (err) {
      console.error('Failed to create MongoMemoryServer:', err);
      // Fallback to local default if memory server fails to start
      uri = 'mongodb://localhost:27017/biriyani-db';
    }
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to Database');
    
    // Seed data if it's a new memory server
    if (mongoServer) {
      console.log('Seeding initial data to Memory Server...');
      await seedInitialData();
    }
  } catch (err) {
    console.error('Database connection error:', err);
  }
};

async function seedInitialData() {
  try {
    const count = await MenuItem.countDocuments();
    if (count === 0) {
      const items = [
        {
          name: 'Hyderabadi Chicken Biriyani',
          description: 'Fragrant basmati rice cooked with succulent chicken and spices.',
          price: 250,
          offerPrice: 199,
          discountPercentage: 20,
          category: 'Chicken',
        },
        {
          name: 'Mutton Dum Biriyani',
          description: 'Traditional slow-cooked mutton with long-grain rice.',
          price: 350,
          category: 'Mutton',
        },
        {
          name: 'Special Veg Biriyani',
          description: 'Assorted seasonal vegetables layered with aromatic rice.',
          price: 180,
          category: 'Veg',
        },
        {
          name: 'Chicken 65',
          description: 'Spicy, deep-fried chicken appetizer.',
          price: 150,
          category: 'Starters',
        }
      ];
      await MenuItem.insertMany(items);
      console.log('Seeded items');
    }
  } catch (error) {
    console.error('Seeding error:', error);
  }
}

connectDB();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Biriyani Backend is running' });
});

// --- RESTAURANT ROUTES ---
app.get('/api/restaurants', async (req, res) => {
  try {
    const restaurants = await Restaurant.find();
    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- MENU ROUTES ---
app.get('/api/menu', async (req, res) => {
  try {
    const items = await MenuItem.find({ isAvailable: true });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- ORDER ROUTES ---
app.post('/api/orders', async (req, res) => {
  try {
    const newOrder = new Order(req.body);
    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/user/orders', async (req, res) => {
  try {
    // In a real app, we'd get the user ID from the auth token
    const orders = await Order.find().sort({ createdAt: -1 }); 
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/profile', async (req, res) => {
  try {
    const { email, uid } = req.query;
    
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        message: 'Database Connection Error. Please ensure the database is running.' 
      });
    }

    let query = {};
    if (email) query.email = email;
    if (uid) query.uid = uid;
    
    const user = await User.findOne(Object.keys(query).length > 0 ? query : {}).populate('favorites');
    
    if (!user) {
      return res.status(404).json({ message: 'User profile not found. If you just signed up, please wait a moment or try syncing your account.' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/users/sync', async (req, res) => {
  try {
    const { uid, name, email, phone } = req.body;
    
    // Automatically promote this specific email to admin during sync/signup
    const isAdminEmail = email === 'hellobash05@gmail.com';
    
    const user = await User.findOneAndUpdate(
      { $or: [{ uid }, { email }] },
      { 
        uid, 
        name, 
        email, 
        phone,
        ...(isAdminEmail && { role: 'admin' }) // Only set role if it's the admin email
      },
      { upsert: true, new: true }
    );
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/users/address', async (req, res) => {
  try {
    const { email, label, name, phone, house, street, city, pincode, landmark, detail, isDefault } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User found' });

    if (isDefault) {
      user.addresses.forEach(a => a.isDefault = false);
    }

    user.addresses.push({ label, name, phone, house, street, city, pincode, landmark, detail, isDefault });
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/admin/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch('/api/admin/orders/:id/status', async (req, res) => {
  try {
    const { status, deliveryPartner, estimatedDeliveryTime } = req.body;
    
    // Prepare update object
    const updateData = { status };
    if (deliveryPartner) updateData.deliveryPartner = deliveryPartner;
    if (estimatedDeliveryTime) updateData.estimatedDeliveryTime = estimatedDeliveryTime;

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    );
    
    if (updatedOrder) {
      // Emit to specific order room for customer tracking
      req.io.to(`order_${updatedOrder._id}`).emit('orderStatusUpdated', updatedOrder);
      // Emit to all admins
      req.io.emit('adminOrderUpdated', updatedOrder);
    }
    
    res.json(updatedOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// --- ADMIN MENU MANAGEMENT ---
app.post('/api/admin/menu', async (req, res) => {
  try {
    const newItem = new MenuItem(req.body);
    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.patch('/api/admin/menu/:id', async (req, res) => {
  try {
    const updatedItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/admin/menu/:id', async (req, res) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- ADMIN CUSTOMER MANAGEMENT ---
app.get('/api/admin/customers', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- ADMIN ANALYTICS ---
app.get('/api/admin/analytics', async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const orders = await Order.find();
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const deliveredOrders = orders.filter(o => o.status === 'Delivered').length;
    
    // Simple popular items calculation
    const itemCounts = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
      });
    });
    
    const popularItems = Object.entries(itemCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({
      totalOrders,
      totalRevenue,
      deliveredOrders,
      popularItems
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- SEED DATA ---
app.post('/api/seed', async (req, res) => {
  try {
    await MenuItem.deleteMany({});
    await User.deleteMany({});
    await Order.deleteMany({});

    const user = await User.create({
      name: 'Arun Kumar',
      email: 'hellobash05@gmail.com',
      password: 'Lets@start05',
      role: 'admin',
      phone: '+91 9876543210',
      addresses: [
        { label: 'Home', detail: '123, Heritage Residency, Kochi', isDefault: true },
        { label: 'Office', detail: 'Tech Park, Floor 4, Bangalore' }
      ]
    });

    const items = [
      {
        name: 'Hyderabadi Chicken Biriyani',
        description: 'Fragrant basmati rice cooked with succulent chicken and spices.',
        price: 250,
        offerPrice: 199,
        discountPercentage: 20,
        category: 'Chicken',
      },
      {
        name: 'Mutton Dum Biriyani',
        description: 'Traditional slow-cooked mutton with long-grain rice.',
        price: 350,
        category: 'Mutton',
      },
      {
        name: 'Special Veg Biriyani',
        description: 'Assorted seasonal vegetables layered with aromatic rice.',
        price: 180,
        category: 'Veg',
      },
      {
        name: 'Chicken 65',
        description: 'Spicy, deep-fried chicken appetizer.',
        price: 150,
        category: 'Starters',
      }
    ];
    const seededItems = await MenuItem.insertMany(items);

    // Create a mock past order
    await Order.create({
      customer: {
        name: 'Arun Kumar',
        phone: '+91 9876543210',
        address: {
          house: 'Apt 4B',
          street: 'MG Road',
          city: 'Kochi',
          pincode: '682016'
        }
      },
      items: [
        { name: 'Hyderabadi Chicken Biriyani', price: 250, quantity: 2 },
        { name: 'Chicken 65', price: 150, quantity: 1 }
      ],
      totalAmount: 650,
      status: 'Delivered'
    });

    res.json({ message: 'Database seeded with premium Biriyani Royale data' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

httpServer.listen(PORT, () => {
  console.log(`Biriyani Server & Socket.IO running on port ${PORT}`);
});

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
import { Review } from './models/Review.js';
import { Notification } from './models/Notification.js';
import { DeliveryPartner } from './models/DeliveryPartner.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

app.get('/api/version', (req, res) => {
  res.json({ 
    version: '1.2.5', 
    status: 'Royale Backend Online',
    sync_id: 'ROYALE-SYNC-1000',
    timestamp: new Date().toISOString()
  });
});

app.get('/ping', (req, res) => {
  res.send('pong-1.2.4');
});

console.log('--- ROYALE BACKEND BOOTING V1.2.4 ---');

app.get('/', (req, res) => {
  res.send('<h1>Biriyani Backend V1.2.4 (SYNC-999)</h1><p>If you see this, the sync is working!</p>');
});
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
let dbStatus = 'connecting';
let dbType = 'unknown';

const connectDB = async () => {
  let uri = process.env.MONGODB_URI;
  let isMemoryServer = false;

  if (uri) {
    console.log('Attempting to connect to provided MONGODB_URI...');
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log('Successfully connected to Persistent Database (Atlas)');
      dbStatus = 'connected';
      dbType = 'persistent';
      return;
    } catch (err) {
      console.error('--- PERSISTENT DB CONNECTION ERROR ---');
      console.error('Error Code:', err.code);
      console.error('Error Message:', err.message);
      console.log('Falling back to alternatives...');
    }
  }

  // If we reach here, either MONGODB_URI was not provided or it failed
  console.log('Trying local MongoDB fallback (mongodb://localhost:27017/biriyani-db)...');
  try {
    await mongoose.connect('mongodb://localhost:27017/biriyani-db', { serverSelectionTimeoutMS: 2000 });
    console.log('Connected to Local MongoDB');
    dbStatus = 'connected';
    dbType = 'local';
    return;
  } catch (err) {
    console.log('Local MongoDB not available. Starting MongoMemoryServer for development...');
  }

  try {
    mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    isMemoryServer = true;
    dbStatus = 'connected';
    dbType = 'temporary';
    console.log('Connected to MongoMemoryServer');
    console.log('!!! WARNING: DATA WILL BE WIPED ON RESTART !!!');
    
    // Seed data only for memory server
    console.log('Seeding initial data...');
    await seedInitialData();
  } catch (err) {
    dbStatus = 'failed';
    console.error('All database connection attempts failed:', err);
  }
};

// ... inside routes ...
app.get('/api/db-status', (req, res) => {
  res.json({ status: dbStatus, type: dbType });
});

async function seedInitialData() {
  try {
    // Seed Admin User
    const userCount = await User.countDocuments();
    let adminUser;
    if (userCount === 0) {
      adminUser = await User.create({
        name: 'Arun Kumar',
        email: 'hellobash05@gmail.com',
        role: 'admin',
        phone: '+91 9876543210'
      });
      console.log('Seeded Admin User');
    } else {
      adminUser = await User.findOne({ email: 'hellobash05@gmail.com' });
    }

    // Seed Restaurant
    const restaurantCount = await Restaurant.countDocuments();
    if (restaurantCount === 0 && adminUser) {
      await Restaurant.create({
        name: 'Biriyani Royale Heritage',
        description: 'Authentic Hyderabadi and Malabar Biriyanis since 1985.',
        address: '123 Heritage Lane, Kochi, Kerala',
        owner: adminUser._id,
        type: 'hotel',
        cuisine: ['Hyderabadi', 'Malabar', 'South Indian'],
        isVerified: true
      });
      console.log('Seeded Heritage Restaurant');
    }

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
          image: 'https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?q=80&w=600&auto=format&fit=crop',
          isAvailable: true
        },
        {
          name: 'Mutton Dum Biriyani',
          description: 'Traditional slow-cooked mutton with long-grain rice.',
          price: 350,
          category: 'Mutton',
          image: 'https://images.unsplash.com/photo-1543353071-873f17a7a088?q=80&w=600&auto=format&fit=crop',
          isAvailable: true
        },
        {
          name: 'Special Veg Biriyani',
          description: 'Assorted seasonal vegetables layered with aromatic rice.',
          price: 180,
          category: 'Veg',
          image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=600&auto=format&fit=crop',
          isAvailable: true
        },
        {
          name: 'Chicken 65',
          description: 'Spicy, deep-fried chicken appetizer.',
          price: 150,
          category: 'Starters',
          image: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?q=80&w=600&auto=format&fit=crop',
          isAvailable: true
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
    
    // Emit real-time event for admin
    req.io.emit('newOrder', savedOrder);
    
    res.status(201).json(savedOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/user/orders', async (req, res) => {
  try {
    const { email } = req.query;
    let query = {};
    if (email) query.userEmail = email;
    
    const orders = await Order.find(query).sort({ createdAt: -1 }); 
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch('/api/orders/:id/cancel', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const cancellableStatuses = ['Pending', 'Preparing', 'Packed'];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({ 
        message: `Order cannot be cancelled because it is already ${order.status}` 
      });
    }

    order.status = 'Cancelled';
    order.updatedAt = new Date();
    const updatedOrder = await order.save();

    // Emit real-time event
    const orderRoom = `order_${updatedOrder._id.toString()}`;
    req.io.to(orderRoom).emit('orderStatusUpdated', updatedOrder);
    req.io.emit('adminOrderUpdated', updatedOrder);

    res.json(updatedOrder);
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

// --- FAVORITES & NOTIFICATIONS ---
app.post('/api/users/favorites/toggle', async (req, res) => {
  try {
    const { email, foodId } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isFavorite = user.favorites.includes(foodId);
    if (isFavorite) {
      user.favorites = user.favorites.filter(id => id.toString() !== foodId);
    } else {
      user.favorites.push(foodId);
    }
    await user.save();
    res.json({ favorites: user.favorites, isFavorite: !isFavorite });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.params.userId }).sort({ createdAt: -1 }).limit(20);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
      const orderRoom = `order_${updatedOrder._id.toString()}`;
      req.io.to(orderRoom).emit('orderStatusUpdated', updatedOrder);
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
    const oldItem = await MenuItem.findById(req.params.id);
    const updatedItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (updatedItem && oldItem) {
      // Detect Price Drop or New Offer
      const priceDropped = updatedItem.offerPrice && (!oldItem.offerPrice || updatedItem.offerPrice < oldItem.offerPrice);
      const newOffer = updatedItem.discountPercentage && (!oldItem.discountPercentage || updatedItem.discountPercentage > oldItem.discountPercentage);

      if (priceDropped || newOffer) {
        // Find users who have this item in their favorites
        const interestedUsers = await User.find({ favorites: req.params.id });
        
        const title = priceDropped ? '🔥 Price Drop Alert!' : '🎉 New Royale Offer!';
        const message = priceDropped 
          ? `${updatedItem.name} is now available for ₹${updatedItem.offerPrice}! Grab it before it's gone.`
          : `Exclusive ${updatedItem.discountPercentage}% OFF on ${updatedItem.name}. Order your favorite now!`;

        // Create in-app notifications
        const notificationPromises = interestedUsers.map(user => {
          const notify = new Notification({
            userId: user._id,
            title,
            message,
            type: priceDropped ? 'price_drop' : 'offer',
            relatedId: updatedItem._id
          });
          return notify.save();
        });

        await Promise.all(notificationPromises);

        console.log(`--- SENDING SMART NOTIFICATION: ${title} ---`);
        console.log(`Users affected: ${interestedUsers.length}`);

        // Emit real-time notification to all interested users connected via socket
        req.io.emit('smartNotification', {
          title,
          message,
          foodId: updatedItem._id.toString(),
          userIds: interestedUsers.map(u => u._id.toString()) // Robust stringification
        });
        console.log('Smart notification emitted successfully');
      }
    }

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

// --- ADMIN DELIVERY PARTNER MANAGEMENT ---
app.get('/api/admin/delivery-partners', async (req, res) => {
  try {
    const partners = await DeliveryPartner.find().sort({ createdAt: -1 });
    res.json(partners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/admin/delivery-partners', async (req, res) => {
  console.log('--- NEW DELIVERY PARTNER REQUEST ---');
  console.log('Body:', req.body);
  try {
    const newPartner = new DeliveryPartner(req.body);
    await newPartner.save();
    console.log('Partner saved successfully');
    res.status(201).json(newPartner);
  } catch (error) {
    console.error('PARTNER SAVE ERROR:', error);
    res.status(400).json({ message: error.message });
  }
});

app.patch('/api/admin/delivery-partners/:id', async (req, res) => {
  try {
    const updatedPartner = await DeliveryPartner.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedPartner);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/admin/delivery-partners/:id', async (req, res) => {
  try {
    await DeliveryPartner.findByIdAndDelete(req.params.id);
    res.json({ message: 'Partner deleted' });
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

// --- ADMIN REVIEW MANAGEMENT ---
app.get('/api/admin/reviews', async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('foodId', 'name')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- REVIEW ROUTES ---
app.post('/api/reviews', async (req, res) => {
  console.log('--- NEW REVIEW REQUEST RECEIVED ---');
  console.log('Body:', req.body);
  try {
    let { userId, userName, foodId, orderId, rating, comment, foodName } = req.body;

    // Fallback: If foodId is missing, try to find it by name
    if (!foodId && foodName) {
      console.log('Missing foodId, looking up by name:', foodName);
      const item = await MenuItem.findOne({ name: new RegExp(`^${foodName}$`, 'i') });
      if (item) {
        foodId = item._id;
        console.log('Found foodId:', foodId);
      } else {
        console.error('MenuItem not found for name:', foodName);
        return res.status(400).json({ message: 'MenuItem not found for this review.' });
      }
    }

    if (!foodId) {
      console.error('Final validation failed: Missing foodId');
      return res.status(400).json({ message: 'Missing foodId for review.' });
    }

    // Check if review already exists for this order/food combo
    const existingReview = await Review.findOne({ orderId, foodId });
    if (existingReview) {
      console.log('Duplicate review blocked for order:', orderId);
      return res.status(400).json({ message: 'You have already reviewed this item for this order.' });
    }

    const review = new Review({
      userId,
      userName,
      foodId,
      orderId,
      rating,
      comment
    });

    await review.save();
    console.log('Review saved successfully to MongoDB');

    // Emit real-time event for admin
    const menuItem = await MenuItem.findById(foodId);
    req.io.emit('newReview', { ...review._doc, foodId: { name: menuItem?.name } });
    console.log('Socket event "newReview" emitted to admin');

    res.status(201).json(review);
  } catch (error) {
    console.error('REVIEW SUBMISSION ERROR:', error);
    res.status(400).json({ message: error.message });
  }
});
app.get('/api/reviews/:foodId', async (req, res) => {
  try {
    const reviews = await Review.find({ foodId: req.params.foodId }).sort({ createdAt: -1 });
    
    // Calculate stats
    const total = reviews.length;
    const avg = total > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1)
      : 0;

    res.json({ reviews, averageRating: parseFloat(avg), totalReviews: total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

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

// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err);
  res.status(500).json({ 
    message: 'Internal Royale Server Error', 
    error: err.message 
  });
});

httpServer.listen(PORT, () => {
  console.log(`Biriyani Server & Socket.IO running on port ${PORT}`);
});

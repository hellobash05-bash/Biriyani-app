import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import multer from 'multer';

dotenv.config();

// Configure Multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('FATAL ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

console.log('--- SUPABASE CONFIG CHECK ---');
console.log('URL:', supabaseUrl);
console.log('Key Type:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE (Bypasses RLS)' : 'ANON_KEY (Restricted)');

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  },
  global: {
    fetch: (...args) => fetch(...args),
  },
  realtime: {
    transport: ws,
  },
});

const app = express();
const httpServer = createServer(app);

app.get('/api/version', (req, res) => {
  res.json({ 
    version: '2.0.0', 
    status: 'Royale Backend Online (Supabase)',
    sync_id: 'ROYALE-SYNC-SUPABASE',
    timestamp: new Date().toISOString()
  });
});

app.get('/ping', (req, res) => {
  res.send('pong-supabase');
});

console.log('--- ROYALE BACKEND BOOTING V2.0.0 (SUPABASE) ---');

app.get('/', (req, res) => {
  res.send('<h1>Biriyani Backend V2.0.0 (Supabase)</h1>');
});

const io = new Server(httpServer, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST", "PATCH", "DELETE"]
  }
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  req.io = io;
  req.supabase = supabase;
  next();
});

io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);
  socket.on('joinOrderRoom', (orderId) => {
    socket.join(`order_${orderId}`);
  });
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.get('/api/db-status', async (req, res) => {
  // Check Supabase connection by making a simple query
  const { data, error } = await supabase.from('menu_items').select('id').limit(1);
  if (error) {
     res.json({ status: 'failed', type: 'supabase', error: error.message });
  } else {
     res.json({ status: 'connected', type: 'supabase' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Biriyani Backend is running with Supabase' });
});

// --- IMAGE UPLOAD ROUTE ---
app.post('/api/admin/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const file = req.file;
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `menu/${fileName}`;

    console.log(`--- UPLOADING IMAGE TO SUPABASE: ${fileName} ---`);

    const { data, error } = await supabase.storage
      .from('menu-images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (error) {
      console.error('Supabase Storage Error:', error);
      throw error;
    }

    // Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('menu-images')
      .getPublicUrl(filePath);

    console.log('✅ Image uploaded successfully:', publicUrl);
    res.json({ url: publicUrl });
  } catch (err) {
    console.error('Upload endpoint crash:', err);
    res.status(500).json({ message: 'Error uploading image', error: err.message });
  }
});

// --- RESTAURANT ROUTES ---
app.get('/api/restaurants', async (req, res) => {
  const { data, error } = await supabase.from('restaurants').select('*');
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

// --- MENU ROUTES ---
app.get('/api/menu', async (req, res) => {
  const { data, error } = await supabase.from('menu_items').select('*').eq('is_available', true);
  if (error) return res.status(500).json({ message: error.message });
  
  // Format for frontend (convert snake_case to camelCase where needed)
  const formattedData = data.map(item => ({
    _id: item.id, // map id to _id for frontend compatibility
    name: item.name,
    description: item.description,
    price: item.price,
    offerPrice: item.offer_price,
    discountPercentage: item.discount_percentage,
    category: item.category,
    image: item.image,
    isAvailable: item.is_available
  }));
  res.json(formattedData);
});

// --- ORDER ROUTES ---
app.post('/api/orders', async (req, res) => {
  const { customer, items, totalAmount, paymentMethod } = req.body;
  
  try {
    // 1. Insert Order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([{
        user_email: req.body.userEmail,
        customer_name: customer.name,
        customer_phone: customer.phone,
        address_house: customer.address.house,
        address_street: customer.address.street,
        address_city: customer.address.city,
        address_pincode: customer.address.pincode,
        address_landmark: customer.address.landmark,
        total_amount: totalAmount,
        payment_method: paymentMethod || 'Cash on Delivery'
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Insert Order Items
    if (items && items.length > 0) {
      const orderItems = items.map(item => ({
        order_id: orderData.id,
        food_id: item.foodId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image
      }));
      
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;
    }

    // Format for frontend
    const responseOrder = { ...orderData, _id: orderData.id, items };
    req.io.emit('newOrder', responseOrder);
    res.status(201).json(responseOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/user/orders', async (req, res) => {
  const { email } = req.query;
  console.log(`--- FETCHING ORDERS FOR: ${email || 'All Users'} ---`);

  try {
    let query = supabase.from('orders').select(`
      *,
      order_items (*)
    `).order('created_at', { ascending: false });

    if (email) {
      query = query.eq('user_email', email);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Order fetch error:', error);
      return res.status(500).json({ message: error.message });
    }
    
    // Format data for frontend expectations
    const formattedOrders = data.map(order => ({
      _id: order.id,
      createdAt: order.created_at,
      totalAmount: order.total_amount,
      status: order.status,
      customer: {
         name: order.customer_name,
         phone: order.customer_phone,
         address: {
           house: order.address_house,
           street: order.address_street,
           city: order.address_city,
           pincode: order.address_pincode
         }
      },
      items: order.order_items ? order.order_items.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })) : []
    }));

    console.log(`✅ Fetched ${formattedOrders.length} orders for ${email || 'Admin'}`);
    res.json(formattedOrders);
  } catch (err) {
    console.error('User orders endpoint crash:', err);
    res.status(500).json({ message: 'Internal server error fetching orders' });
  }
});

app.patch('/api/orders/:id/cancel', async (req, res) => {
  const { data: order, error: fetchError } = await supabase.from('orders').select('*').eq('id', req.params.id).single();
  if (fetchError || !order) return res.status(404).json({ message: 'Order not found' });

  const cancellableStatuses = ['Pending', 'Preparing', 'Packed'];
  if (!cancellableStatuses.includes(order.status)) {
    return res.status(400).json({ message: `Order cannot be cancelled because it is already ${order.status}` });
  }

  const { data: updatedOrder, error } = await supabase
    .from('orders')
    .update({ status: 'Cancelled', updated_at: new Date() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ message: error.message });

  const formattedOrder = { ...updatedOrder, _id: updatedOrder.id };
  const orderRoom = `order_${formattedOrder._id}`;
  req.io.to(orderRoom).emit('orderStatusUpdated', formattedOrder);
  req.io.emit('adminOrderUpdated', formattedOrder);

  res.json(formattedOrder);
});

app.get('/api/orders/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', req.params.id)
    .single();
    
  if (error) return res.status(404).json({ message: 'Order not found' });
  
  const formattedOrder = { ...data, _id: data.id, items: data.order_items };
  res.json(formattedOrder);
});

// --- USER ROUTES ---
app.get('/api/profile', async (req, res) => {
  const { email, uid } = req.query;
  console.log(`--- FETCHING PROFILE FOR: ${email || uid} ---`);
  
  try {
    let query = supabase
      .from('users')
      .select('*, addresses(*), user_favorites(menu_item_id)');
    
    if (email) query = query.eq('email', email);
    if (uid) query = query.eq('uid', uid);
    
    const { data: users, error } = await query;
    
    if (error) {
      console.error('Profile fetch error:', error);
      return res.status(500).json({ message: error.message });
    }

    if (!users || users.length === 0) {
      console.warn(`Profile not found for: ${email || uid}`);
      return res.status(404).json({ message: 'User profile not found.' });
    }

    const user = users[0];
    
    // Format favorites into a simple array of IDs
    const favorites = user.user_favorites ? user.user_favorites.map(f => f.menu_item_id) : [];
    
    console.log(`✅ Profile fetched for ${user.email} with ${user.addresses?.length || 0} addresses`);
    
    res.json({ 
      ...user, 
      _id: user.id, 
      favorites, 
      addresses: user.addresses || [] 
    });
  } catch (err) {
    console.error('Profile endpoint crash:', err);
    res.status(500).json({ message: 'Internal server error fetching profile' });
  }
});

app.post('/api/users/sync', async (req, res) => {
  const { uid, name, email, phone } = req.body;
  console.log(`--- SYNC REQUEST RECEIVED FOR: ${email} (UID: ${uid}) ---`);
  const isAdminEmail = email === 'hellobash05@gmail.com';
  
  try {
    // Check if user exists
    const { data: existingUsers, error: fetchError } = await supabase.from('users').select('*').eq('email', email);
    
    if (fetchError) {
      console.error('Error fetching user during sync:', fetchError);
      return res.status(500).json({ message: 'Error checking user existence', error: fetchError.message });
    }

    let user;
    if (existingUsers && existingUsers.length > 0) {
      // Update
      const { data, error } = await supabase.from('users')
        .update({ 
          uid, 
          name: name || existingUsers[0].name, 
          phone: phone || existingUsers[0].phone, 
          role: isAdminEmail ? 'admin' : existingUsers[0].role 
        })
        .eq('email', email)
        .select()
        .single();
      if (error) throw error;
      user = data;
    } else {
      // Insert
      const { data, error } = await supabase.from('users')
        .insert([{ uid, name, email, phone, role: isAdminEmail ? 'admin' : 'customer' }])
        .select()
        .single();
      if (error) throw error;
      user = data;
      console.log(`✅ New user created: ${user.email} (ID: ${user.id})`);
    }
    
    res.json({ ...user, _id: user.id });
  } catch (error) {
    console.error('Sync user crash:', error);
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/users/address', async (req, res) => {
  const { email, label, name, phone, house, street, city, pincode, landmark, detail, isDefault } = req.body;
  console.log(`--- ADDING ADDRESS FOR: ${email} ---`);
  
  try {
    // Find user by email
    const { data: user, error: userError } = await supabase.from('users').select('id').eq('email', email).single();
    
    if (userError || !user) {
      console.error('User search error:', userError);
      return res.status(404).json({ message: 'User not found in database. Please ensure you are logged in correctly.' });
    }

    if (isDefault) {
      const { error: updateError } = await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);
      if (updateError) console.error('Error clearing old defaults:', updateError);
    }

    const { data: newAddress, error: insertError } = await supabase.from('addresses')
      .insert([{ 
        user_id: user.id, 
        label, 
        name, 
        phone, 
        house, 
        street, 
        city, 
        pincode, 
        landmark, 
        detail, 
        is_default: !!isDefault 
      }])
      .select();

    if (insertError) {
      console.error('Address insert error:', insertError);
      return res.status(400).json({ message: insertError.message });
    }

    console.log('✅ Address saved successfully');
    res.json(newAddress);
  } catch (err) {
    console.error('Address endpoint crash:', err);
    res.status(500).json({ message: 'Server error saving address', error: err.message });
  }
});

// --- FAVORITES ---
app.post('/api/users/favorites/toggle', async (req, res) => {
  const { email, foodId } = req.body;
  
  const { data: user } = await supabase.from('users').select('id').eq('email', email).single();
  if (!user) return res.status(404).json({ message: 'User not found' });

  // Check if favorite exists
  const { data: existingFav } = await supabase.from('user_favorites')
    .select('*')
    .eq('user_id', user.id)
    .eq('menu_item_id', foodId);

  let isFavorite = false;
  if (existingFav && existingFav.length > 0) {
    // Remove
    await supabase.from('user_favorites').delete().eq('user_id', user.id).eq('menu_item_id', foodId);
    isFavorite = false;
  } else {
    // Add
    await supabase.from('user_favorites').insert([{ user_id: user.id, menu_item_id: foodId }]);
    isFavorite = true;
  }

  // Get updated favorites
  const { data: updatedFavs } = await supabase.from('user_favorites').select('menu_item_id').eq('user_id', user.id);
  res.json({ favorites: updatedFavs.map(f => f.menu_item_id), isFavorite });
});

app.get('/api/notifications/:userId', async (req, res) => {
  const { data, error } = await supabase.from('notifications').select('*').eq('user_id', req.params.userId).order('created_at', { ascending: false }).limit(20);
  if (error) return res.status(500).json({ message: error.message });
  res.json(data.map(n => ({...n, _id: n.id})));
});

app.patch('/api/notifications/:id/read', async (req, res) => {
  await supabase.from('notifications').update({ is_read: true }).eq('id', req.params.id);
  res.json({ message: 'Notification marked as read' });
});

// --- ADMIN ROUTES ---
app.get('/api/admin/orders', async (req, res) => {
  const { data, error } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  
  const formattedOrders = data.map(o => ({...o, _id: o.id, items: o.order_items}));
  res.json(formattedOrders);
});

app.patch('/api/admin/orders/:id/status', async (req, res) => {
  const { status, deliveryPartner, estimatedDeliveryTime } = req.body;
  const updateData = { status, updated_at: new Date() };
  
  if (deliveryPartner) {
    updateData.delivery_partner_name = deliveryPartner.name;
    updateData.delivery_partner_phone = deliveryPartner.phone;
    updateData.delivery_partner_vehicle = deliveryPartner.vehicleNumber;
  }
  if (estimatedDeliveryTime) updateData.estimated_delivery_time = estimatedDeliveryTime;

  const { data: updatedOrder, error } = await supabase.from('orders').update(updateData).eq('id', req.params.id).select().single();
  
  if (error) return res.status(400).json({ message: error.message });

  const formattedOrder = { ...updatedOrder, _id: updatedOrder.id };
  req.io.to(`order_${formattedOrder._id}`).emit('orderStatusUpdated', formattedOrder);
  req.io.emit('adminOrderUpdated', formattedOrder);
  
  res.json(formattedOrder);
});

app.post('/api/admin/menu', async (req, res) => {
  const { data, error } = await supabase.from('menu_items').insert([{
    name: req.body.name,
    description: req.body.description,
    price: req.body.price,
    offer_price: req.body.offerPrice,
    discount_percentage: req.body.discountPercentage,
    category: req.body.category,
    image: req.body.image
  }]).select().single();

  if (error) return res.status(400).json({ message: error.message });
  res.status(201).json({ ...data, _id: data.id });
});

app.patch('/api/admin/menu/:id', async (req, res) => {
  const { data, error } = await supabase.from('menu_items').update({
    name: req.body.name,
    description: req.body.description,
    price: req.body.price,
    offer_price: req.body.offerPrice,
    discount_percentage: req.body.discountPercentage,
    category: req.body.category,
    image: req.body.image,
    is_available: req.body.isAvailable
  }).eq('id', req.params.id).select().single();

  if (error) return res.status(400).json({ message: error.message });
  res.json({ ...data, _id: data.id });
});

app.delete('/api/admin/menu/:id', async (req, res) => {
  await supabase.from('menu_items').delete().eq('id', req.params.id);
  res.json({ message: 'Item deleted' });
});

app.get('/api/admin/delivery-partners', async (req, res) => {
  const { data, error } = await supabase.from('delivery_partners').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data.map(p => ({...p, _id: p.id, vehicleNumber: p.vehicle_number})));
});

app.post('/api/admin/delivery-partners', async (req, res) => {
  const { data, error } = await supabase.from('delivery_partners').insert([{
    name: req.body.name,
    phone: req.body.phone,
    vehicle_number: req.body.vehicleNumber
  }]).select().single();

  if (error) return res.status(400).json({ message: error.message });
  res.status(201).json({...data, _id: data.id});
});

app.patch('/api/admin/delivery-partners/:id', async (req, res) => {
  const updateData = {};
  if (req.body.name) updateData.name = req.body.name;
  if (req.body.phone) updateData.phone = req.body.phone;
  if (req.body.vehicleNumber) updateData.vehicle_number = req.body.vehicleNumber;
  if (req.body.status) updateData.status = req.body.status;

  const { data, error } = await supabase.from('delivery_partners').update(updateData).eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ message: error.message });
  res.json({...data, _id: data.id});
});

app.delete('/api/admin/delivery-partners/:id', async (req, res) => {
  await supabase.from('delivery_partners').delete().eq('id', req.params.id);
  res.json({ message: 'Partner deleted' });
});

app.get('/api/admin/customers', async (req, res) => {
  const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data.map(u => ({...u, _id: u.id})));
});

app.get('/api/admin/reviews', async (req, res) => {
  const { data, error } = await supabase.from('reviews').select('*, menu_items(name)').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data.map(r => ({...r, _id: r.id, foodId: { name: r.menu_items?.name }})));
});

// --- REVIEWS ---
app.post('/api/reviews', async (req, res) => {
  const { userId, userName, foodId, orderId, rating, comment } = req.body;

  const { data, error } = await supabase.from('reviews').insert([{
    user_id: userId,
    user_name: userName,
    food_id: foodId,
    order_id: orderId,
    rating,
    comment
  }]).select().single();

  if (error) {
    if (error.code === '23505') return res.status(400).json({ message: 'You have already reviewed this item for this order.' });
    return res.status(400).json({ message: error.message });
  }

  req.io.emit('newReview', { ...data, _id: data.id });
  res.status(201).json({ ...data, _id: data.id });
});

app.get('/api/reviews/:foodId', async (req, res) => {
  const { data: reviews, error } = await supabase.from('reviews').select('*').eq('food_id', req.params.foodId);
  if (error) return res.status(500).json({ message: error.message });

  const total = reviews.length;
  const avg = total > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1) : 0;

  res.json({ reviews: reviews.map(r => ({...r, _id: r.id})), averageRating: parseFloat(avg), totalReviews: total });
});

app.get('/api/admin/analytics', async (req, res) => {
  const { data: orders, error } = await supabase.from('orders').select('*, order_items(name, quantity)');
  if (error) return res.status(500).json({ message: error.message });

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  const deliveredOrders = orders.filter(o => o.status === 'Delivered').length;
  
  const itemCounts = {};
  orders.forEach(order => {
    order.order_items.forEach(item => {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
    });
  });
  
  const popularItems = Object.entries(itemCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  res.json({ totalOrders, totalRevenue, deliveredOrders, popularItems });
});

// Seed endpoint adjusted for Supabase
app.get('/api/seed', async (req, res) => {
  try {
    console.log('--- SEEDING DATABASE ---');
    const { data: existingItems, error: fetchError } = await supabase.from('menu_items').select('id').limit(1);
    
    if (fetchError) {
      console.error('Fetch error during seed:', fetchError);
      return res.status(500).json({ message: 'Failed to check existing items', error: fetchError });
    }

    if (existingItems && existingItems.length === 0) {
        const items = [
          { name: 'Hyderabadi Chicken Biriyani', description: 'Fragrant basmati rice cooked with succulent chicken and spices.', price: 250, offer_price: 199, discount_percentage: 20, category: 'Chicken', image: 'https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?q=80&w=600&auto=format&fit=crop' },
          { name: 'Mutton Dum Biriyani', description: 'Traditional slow-cooked mutton with long-grain rice.', price: 350, category: 'Mutton', image: 'https://images.unsplash.com/photo-1543353071-873f17a7a088?q=80&w=600&auto=format&fit=crop' },
          { name: 'Special Veg Biriyani', description: 'Assorted seasonal vegetables layered with aromatic rice.', price: 180, category: 'Veg', image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=600&auto=format&fit=crop' },
          { name: 'Chicken 65', description: 'Spicy, deep-fried chicken appetizer.', price: 150, category: 'Starters', image: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?q=80&w=600&auto=format&fit=crop' }
        ];
        
        const { error: insertError } = await supabase.from('menu_items').insert(items);
        if (insertError) {
          console.error('Insert error during seed:', insertError);
          return res.status(500).json({ message: 'Failed to insert seed items', error: insertError });
        }
        console.log('✅ Seed items inserted successfully');
        return res.json({ message: 'Database seeded successfully with 4 items!' });
    } else {
        return res.json({ message: 'Database already has items, skipping seed.' });
    }
  } catch (error) {
    console.error('Seed catch block error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err);
  res.status(500).json({ message: 'Internal Royale Server Error', error: err.message });
});

httpServer.listen(PORT, () => {
  console.log(`Biriyani Server & Socket.IO running on port ${PORT} with Supabase`);
});

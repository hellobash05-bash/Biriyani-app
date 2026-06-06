import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.join(__dirname, '.env') });

const upload = multer({ storage: multer.memoryStorage() });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('FATAL ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  global: { fetch: (...args) => fetch(...args) },
  realtime: { transport: ws },
});

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"]
  }
});

io.on('connection', (socket) => {
  console.log('>>> [SOCKET] Client connected:', socket.id);
  socket.on('disconnect', () => console.log('>>> [SOCKET] Client disconnected:', socket.id));
});

const broadcastOrderUpdate = (order) => {
  console.log('📢 [SOCKET] Broadcasting order update:', order.id || order._id);
  io.emit('order-update', order);
};

const broadcastNewOrder = (order) => {
  console.log('📢 [SOCKET] Broadcasting new order:', order.id || order._id);
  io.emit('new-order', order);
};

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`>>> [REQUEST] ${req.method} ${req.url}`);
  req.supabase = supabase;
  next();
});

app.set('case sensitive routing', false);

const apiRouter = express.Router();

apiRouter.get('/version', (req, res) => {
  res.status(200).send({ 
    version: '11.9.0-FLEET-READY', 
    timestamp: new Date().toISOString(),
    unique_sync_id: 'SYNC-AT-' + Date.now(),
    msg: 'STABLE API ROUTER WITH DELIVERY FLEET SUPPORT.'
  });
});

apiRouter.get('/db-status', (req, res) => {
  res.json({ status: 'connected', type: 'supabase' });
});

const resolveAllUserIds = async (sb, email, uid = null) => {
  if (!email && !uid) return [];
  const normalizedEmail = email ? email.toLowerCase().trim() : null;
  try {
    const filters = [];
    if (uid) filters.push(`uid.eq.${uid}`);
    if (normalizedEmail) filters.push(`email.ilike.${normalizedEmail}`);
    const { data: users } = await sb.from('users').select('id, uid, email').or(filters.join(','));
    
    if (!users || users.length === 0) {
      if (normalizedEmail) {
        const { data: anchor, error: anchorError } = await sb.from('users').upsert({
          uid: uid || `anchor-${Date.now()}`,
          email: normalizedEmail,
          name: 'Royale Member',
          last_login: new Date().toISOString()
        }, { onConflict: 'email' }).select('id, uid, email').single();
        if (anchorError) throw anchorError;
        return [{ id: anchor.id, uid: anchor.uid, email: anchor.email }];
      }
      return [];
    }

    const allUserIdentities = users.map(u => ({ id: u.id, uid: u.uid, email: u.email }));
    
    // If we have a UID and an email, ensure they are linked in the database
    if (uid && normalizedEmail) {
       const emailUser = users.find(u => u.email && u.email.toLowerCase() === normalizedEmail.toLowerCase());
       if (emailUser && (!emailUser.uid || emailUser.uid.startsWith('anchor-'))) {
          await sb.from('users').update({ uid }).eq('id', emailUser.id);
          emailUser.uid = uid;
       }
    }
    
    return allUserIdentities;
  } catch (err) {
    console.error('❌ [BRIDGE] Identity resolution failed:', err.message);
    return [];
  }
};

const ADDRESS_SELECT = 'id, user_id, firebase_uid, email, label, name, phone, house, street, city, pincode, detail, is_default, created_at';

const getFormattedAddresses = async (sb, email, uid = null) => {
  const identities = await resolveAllUserIds(sb, email, uid);
  const userIds = identities.map(u => u.id);
  const firebaseUids = identities.map(u => u.uid).filter(Boolean);
  const emails = Array.from(new Set([email, ...identities.map(u => u.email)].filter(Boolean)));
  
  const uniqueMap = new Map();
  const safeFetch = async (query) => {
    try {
      const { data, error } = await query;
      if (error) {
        if (error.code === '42703') return []; // Column doesn't exist
        throw error;
      }
      return data || [];
    } catch (e) {
      console.error('>>> [ADDRESS FETCH ERROR]:', e.message);
      return [];
    }
  };

  if (userIds.length > 0) {
    const d1 = await safeFetch(sb.from('addresses').select('*').in('user_id', userIds));
    d1.forEach(a => uniqueMap.set(a.id, a));
  }
  
  if (firebaseUids.length > 0) {
    const d2 = await safeFetch(sb.from('addresses').select('*').in('firebase_uid', firebaseUids));
    d2.forEach(a => uniqueMap.set(a.id, a));
  }
  
  if (emails.length > 0) {
    // Check if email column exists before querying
    const d3 = await safeFetch(sb.from('addresses').select('*').in('email', emails));
    d3.forEach(a => uniqueMap.set(a.id, a));
  }

  return Array.from(uniqueMap.values()).map(addr => ({
    ...addr,
    id: addr.id,
    _id: addr.id,
    isDefault: !!addr.is_default,
    house: addr.house || addr.address_line1 || '',
    street: addr.street || addr.address_line2 || '',
    name: addr.name || addr.full_name || '',
    detail: addr.detail || `${addr.house || addr.address_line1}, ${addr.street || addr.address_line2}, ${addr.city} - ${addr.pincode}`
  }));
};

apiRouter.get('/address', async (req, res) => {
  const { email, uid } = req.query;
  const addresses = await getFormattedAddresses(req.supabase, email, uid);
  res.json(addresses);
});

apiRouter.post('/address', async (req, res) => {
  const { email, uid, label, name, phone, house, street, city, pincode, detail, isDefault } = req.body;
  const identities = await resolveAllUserIds(req.supabase, email, uid);
  if (identities.length === 0) return res.status(404).json({ message: 'User not found' });
  const primaryId = identities[0].id;
  try {
    if (isDefault) await req.supabase.from('addresses').update({ is_default: false }).eq('user_id', primaryId);
    const { data, error } = await req.supabase.from('addresses').insert([{
      user_id: primaryId, firebase_uid: uid, email, label, name, phone, house, street, city, pincode, detail, is_default: !!isDefault
    }]).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

apiRouter.delete('/address/:id', async (req, res) => {
  try {
    const { error } = await req.supabase.from('addresses').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

apiRouter.get('/restaurants', async (req, res) => {
  const { data, error } = await req.supabase.from('restaurants').select('*');
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

apiRouter.get('/menu', async (req, res) => {
  const { data, error } = await req.supabase.from('menu_items').select('*');
  if (error) return res.status(500).json({ message: error.message });
  res.json(data.map(item => ({
    _id: item.id, name: item.name, description: item.description, price: item.price,
    offerPrice: item.offer_price, discountPercentage: item.discount_percentage,
    category: item.category, image: item.image, isAvailable: item.is_available
  })));
});

apiRouter.post('/admin/menu', async (req, res) => {
  const { name, description, price, offerPrice, discountPercentage, category, image, isAvailable } = req.body;
  try {
    const { data, error } = await req.supabase.from('menu_items').insert([{
      name, description, price, offer_price: offerPrice, discount_percentage: discountPercentage,
      category, image, is_available: isAvailable !== false
    }]).select().single();
    if (error) throw error;
    res.json({ ...data, _id: data.id });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

apiRouter.patch('/admin/menu/:id', async (req, res) => {
  try {
    const { data, error } = await req.supabase.from('menu_items').update({
      name: req.body.name, description: req.body.description, price: req.body.price,
      offer_price: req.body.offerPrice, discount_percentage: req.body.discountPercentage,
      category: req.body.category, image: req.body.image, is_available: req.body.isAvailable
    }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ ...data, _id: data.id });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

apiRouter.delete('/admin/menu/:id', async (req, res) => {
  try {
    const { error } = await req.supabase.from('menu_items').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

apiRouter.post('/admin/upload', upload.single('image'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ message: 'No file uploaded' });
  const fileName = `menu-${Date.now()}${path.extname(file.originalname)}`;
  try {
    const { error: uploadError } = await req.supabase.storage.from('menu-images').upload(fileName, file.buffer, { contentType: file.mimetype });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = req.supabase.storage.from('menu-images').getPublicUrl(fileName);
    res.json({ url: publicUrl });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

apiRouter.get('/admin/delivery-partners', async (req, res) => {
  try {
    const { data, error } = await req.supabase.from('delivery_partners').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data.map(p => ({ ...p, _id: p.id, vehicleNumber: p.vehicle_number, activeOrders: p.active_orders })));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

apiRouter.post('/admin/delivery-partners', async (req, res) => {
  const { name, phone, vehicleNumber } = req.body;
  try {
    const { data, error } = await req.supabase.from('delivery_partners').insert([{
      name, phone, vehicle_number: vehicleNumber, status: 'Available', active_orders: 0
    }]).select().single();
    if (error) throw error;
    res.json({ ...data, _id: data.id, vehicleNumber: data.vehicle_number, activeOrders: data.active_orders });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

apiRouter.patch('/admin/delivery-partners/:id', async (req, res) => {
  const { name, phone, vehicleNumber, status } = req.body;
  try {
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (vehicleNumber) updateData.vehicle_number = vehicleNumber;
    if (status) updateData.status = status;
    const { data, error } = await req.supabase.from('delivery_partners').update(updateData).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ ...data, _id: data.id, vehicleNumber: data.vehicle_number, activeOrders: data.active_orders });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

apiRouter.delete('/admin/delivery-partners/:id', async (req, res) => {
  try {
    const { error } = await req.supabase.from('delivery_partners').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

const formatOrderForClient = (order) => {
  const address = { 
    house: order.address_house, 
    street: order.address_street, 
    city: order.address_city, 
    pincode: order.address_pincode, 
    landmark: order.address_landmark 
  };
  
  const fullAddress = [
    order.address_house,
    order.address_street,
    order.address_city && order.address_pincode ? `${order.address_city} - ${order.address_pincode}` : (order.address_city || order.address_pincode),
    order.address_landmark ? `Landmark: ${order.address_landmark}` : null
  ].filter(Boolean).join(', ');

  return {
    _id: order.id, id: order.id, user_email: order.user_email, createdAt: order.created_at,
    status: order.status, totalAmount: order.total_amount, paymentMethod: order.payment_method,
    customer: { 
      name: order.customer_name, 
      phone: order.customer_phone, 
      address: { ...address, fullAddress } 
    },
    items: order.order_items || []
  };
};

apiRouter.post('/orders', async (req, res) => {
  const { customer, items, totalAmount, paymentMethod, userEmail } = req.body;
  try {
    const { data: orderData, error } = await req.supabase.from('orders').insert([{
      user_email: userEmail, customer_name: customer.name, customer_phone: customer.phone,
      address_house: customer.address.house, address_street: customer.address.street,
      address_city: customer.address.city, address_pincode: customer.address.pincode,
      address_landmark: customer.address.landmark, total_amount: totalAmount, payment_method: paymentMethod || 'Cash on Delivery'
    }]).select().single();
    if (error) throw error;
    if (items && items.length > 0) {
      await req.supabase.from('order_items').insert(items.map(item => ({ order_id: orderData.id, food_id: item.foodId, name: item.name, price: item.price, quantity: item.quantity, image: item.image })));
    }
    const finalOrder = { ...orderData, _id: orderData.id, items };
    broadcastNewOrder(finalOrder);
    res.status(201).json(finalOrder);
  } catch (error) { res.status(400).json({ message: error.message }); }
});

apiRouter.get('/orders/:id', async (req, res) => {
  try {
    const { data: order, error } = await req.supabase.from('orders').select('*, order_items (*)').eq('id', req.params.id).single();
    if (error) throw error;
    res.json(formatOrderForClient(order));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

apiRouter.get('/admin/orders', async (req, res) => {
  try {
    const { data: orders, error } = await req.supabase.from('orders').select('*, order_items (*)').order('created_at', { ascending: false });
    if (error) throw error;
    res.json((orders || []).map(formatOrderForClient));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

apiRouter.patch('/admin/orders/:id/status', async (req, res) => {
  try {
    const { error } = await req.supabase.from('orders').update({ status: req.body.status }).eq('id', req.params.id);
    if (error) throw error;
    const { data: order } = await req.supabase.from('orders').select('*, order_items (*)').eq('id', req.params.id).single();
    const formattedOrder = formatOrderForClient(order);
    broadcastOrderUpdate(formattedOrder);
    res.json(formattedOrder);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

apiRouter.get('/user/orders', async (req, res) => {
  try {
    const { data, error } = await req.supabase.from('orders').select('*, order_items (*)').eq('user_email', req.query.email).order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data.map(order => ({ _id: order.id, createdAt: order.created_at, totalAmount: order.total_amount, status: order.status, items: order.order_items || [] })));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

apiRouter.get('/profile', async (req, res) => {
  const { email, uid } = req.query;
  try {
    const filters = [];
    if (uid) filters.push(`uid.eq.${uid}`);
    if (email) filters.push(`email.ilike.${email}`);
    const { data: users, error } = await req.supabase.from('users').select('*, user_favorites(menu_item_id)').or(filters.join(','));
    if (error) throw error;
    if (!users || users.length === 0) return res.status(404).json({ message: 'Not found' });
    const user = users[0];
    const addresses = await getFormattedAddresses(req.supabase, user.email, user.uid);
    res.json({ ...user, _id: user.id, addresses: addresses || [], favorites: user.user_favorites?.map(f => f.menu_item_id) || [] });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

apiRouter.post('/users/sync', async (req, res) => {
  const { uid, name, email, photoURL, phone } = req.body;
  try {
    const normalizedEmail = email ? email.toLowerCase().trim() : null;
    const { data: user, error } = await req.supabase.from('users').upsert({ uid, name, email: normalizedEmail, photo_url: photoURL, phone, last_login: new Date().toISOString() }, { onConflict: 'uid' }).select().single();
    if (error) throw error;
    res.json({ ...user, _id: user.id });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

apiRouter.put('/users/profile', async (req, res) => {
  try {
    const { data: user, error } = await req.supabase.from('users').update({ name: req.body.name, phone: req.body.phone, photo_url: req.body.photo_url }).eq('uid', req.body.uid).select().single();
    if (error) throw error;
    res.json(user);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

apiRouter.post('/users/profile/upload', upload.single('image'), async (req, res) => {
  const { uid } = req.body;
  const file = req.file;
  const fileName = `${uid}-${Date.now()}${path.extname(file.originalname)}`;
  try {
    const { error: uploadError } = await req.supabase.storage.from('profile-images').upload(fileName, file.buffer, { contentType: file.mimetype });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = req.supabase.storage.from('profile-images').getPublicUrl(fileName);
    res.json({ publicUrl });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.use('/api', apiRouter);
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found', method: req.method, url: req.url });
});

httpServer.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});

// Trigger redeploy at 1780238800

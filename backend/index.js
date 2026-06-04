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

// --- GLOBAL MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// 1. Request Logging
app.use((req, res, next) => {
  console.log(`>>> [REQUEST] ${req.method} ${req.url}`);
  next();
});

// 2. Inject Supabase into Request
app.use((req, res, next) => {
  req.supabase = supabase;
  next();
});

app.set('case sensitive routing', false);

// --- API ROUTER ---
const apiRouter = express.Router();

apiRouter.get('/version', (req, res) => {
  res.status(200).send({ 
    version: '11.6.0-PRODUCTION-READY', 
    timestamp: new Date().toISOString(),
    unique_sync_id: 'SYNC-AT-' + Date.now(),
    msg: 'STABLE API ROUTER ONLINE.'
  });
});

apiRouter.get('/db-status', (req, res) => {
  res.json({ status: 'connected', type: 'supabase' });
});

// --- IDENTITY BRIDGE ---
const resolveAllUserIds = async (sb, email, uid = null) => {
  if (!email && !uid) return [];
  const normalizedEmail = email ? email.toLowerCase().trim() : null;
  try {
    const filters = [];
    if (uid) filters.push(`uid.eq.${uid}`);
    if (normalizedEmail) filters.push(`email.ilike.${normalizedEmail}`);
    
    const { data: users } = await sb.from('users').select('id, uid, email').or(filters.join(','));
    
    if (!users || users.length === 0) {
      const { data: anchor, error: anchorError } = await sb.from('users').upsert({
        uid: uid || `anchor-${Date.now()}`,
        email: normalizedEmail,
        name: 'Royale Member',
        last_login: new Date().toISOString()
      }, { onConflict: 'email' }).select('id, uid, email').single();
      
      if (anchorError) throw anchorError;
      return [{ id: anchor.id, uid: anchor.uid, email: anchor.email }];
    }

    const allUserIdentities = users.map(u => ({ id: u.id, uid: u.uid, email: u.email }));
    if (uid && normalizedEmail) {
       await sb.from('users').update({ uid }).ilike('email', normalizedEmail);
    }
    return allUserIdentities;
  } catch (err) {
    console.error('❌ [BRIDGE] Crash:', err.message);
    return [];
  }
};

const ADDRESS_SELECT_WITH_EMAIL = 'id, user_id, firebase_uid, email, user_email, label, name, full_name, phone, house, address_line1, street, address_line2, city, state, pincode, landmark, district, latitude, longitude, delivery_instructions, detail, is_default, created_at';
const ADDRESS_SELECT_WITH_UID = 'id, user_id, firebase_uid, label, name, full_name, phone, house, address_line1, street, address_line2, city, state, pincode, landmark, district, latitude, longitude, delivery_instructions, detail, is_default, created_at';
const ADDRESS_SELECT_BASIC = 'id, user_id, firebase_uid, label, name, phone, house, street, city, pincode, detail, is_default';
const ADDRESS_SELECT_LEGACY = 'id, user_id, label, name, phone, house, street, city, pincode, detail, is_default';

const runAddressSelect = async (queryBuilder) => {
  let result = await queryBuilder(ADDRESS_SELECT_WITH_EMAIL);
  if (result.error?.code === '42703') result = await queryBuilder(ADDRESS_SELECT_WITH_UID);
  if (result.error?.code === '42703') result = await queryBuilder(ADDRESS_SELECT_BASIC);
  if (result.error?.code === '42703') result = await queryBuilder(ADDRESS_SELECT_LEGACY);
  return result;
};

const runAddressMutation = async (mutationBuilder, fullPayload, uidPayload, basicPayload, legacyPayload) => {
  let result = await mutationBuilder(fullPayload, ADDRESS_SELECT_WITH_EMAIL);
  if (result.error?.code === '42703') result = await mutationBuilder(uidPayload, ADDRESS_SELECT_WITH_UID);
  if (result.error?.code === '42703') result = await mutationBuilder(basicPayload, ADDRESS_SELECT_BASIC);
  if (result.error?.code === '42703') result = await mutationBuilder(legacyPayload, ADDRESS_SELECT_LEGACY);
  return result;
};

const getFormattedAddresses = async (sb, email, uid = null) => {
  const identities = await resolveAllUserIds(sb, email, uid);
  const normalizedEmail = email ? email.toLowerCase().trim() : null;
  const userIds = identities.map(u => u.id);
  const firebaseUids = identities.map(u => u.uid).filter(Boolean);
  const searchEmails = Array.from(new Set([normalizedEmail, ...identities.map(u => u.email)].filter(Boolean)));

  const uniqueMap = new Map();
  try {
    const { data } = await runAddressSelect((columns) => sb.from('addresses').select(columns).in('user_id', userIds));
    (data || []).forEach(a => uniqueMap.set(a.id, a));
  } catch (e) {}

  if (firebaseUids.length > 0) {
    try {
      const { data } = await runAddressSelect((columns) => sb.from('addresses').select(columns).in('firebase_uid', firebaseUids));
      (data || []).forEach(a => uniqueMap.set(a.id, a));
    } catch (e) {}
  }

  if (searchEmails.length > 0) {
    try {
      const { data } = await runAddressSelect((columns) => sb.from('addresses').select(columns).in('email', searchEmails));
      (data || []).forEach(a => uniqueMap.set(a.id, a));
    } catch (e) {}
  }

  return Array.from(uniqueMap.values()).map(addr => ({
    ...addr,
    id: addr.id,
    _id: addr.id,
    isDefault: !!addr.is_default,
    house: addr.house || addr.address_line1 || '',
    street: addr.street || addr.address_line2 || '',
    full_name: addr.full_name || addr.name || 'Royale Member',
    detail: addr.detail || `${addr.house || addr.address_line1 || ''}, ${addr.street || addr.address_line2 || ''}, ${addr.city} - ${addr.pincode}`,
    sync_status: 'v15-indestructible'
  }));
};

// --- ROUTES ---
apiRouter.delete('/address/:id', async (req, res) => {
  const { id } = req.params;
  const { email, uid } = req.query;
  const identities = await resolveAllUserIds(req.supabase, email, uid);
  const userIds = identities.map(u => u.id);
  try {
    const { error } = await req.supabase.from('addresses').delete().eq('id', id).in('user_id', userIds);
    if (error) throw error;
    res.json({ success: true, message: 'Destination removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

apiRouter.put(['/users/address/:id', '/user/address/:id', '/address/:id'], async (req, res) => {
  const { id } = req.params;
  const { email, uid, label, name, phone, house, street, city, pincode, landmark, detail, isDefault } = req.body;
  const identities = await resolveAllUserIds(req.supabase, email, uid);
  if (identities.length === 0) return res.status(404).json({ message: 'User not found' });
  const primaryId = identities[0].id;
  try {
    if (isDefault) await req.supabase.from('addresses').update({ is_default: false }).eq('user_id', primaryId);
    const rawPayload = { label, name, full_name: name, phone, house, address_line1: house, street, address_line2: street, city, pincode, landmark, detail: detail || `${house}, ${street}, ${city} - ${pincode}`, is_default: !!isDefault, user_id: primaryId };
    const { data, error } = await runAddressMutation((p, c) => req.supabase.from('addresses').update(p).eq('id', id).select(c).maybeSingle(), rawPayload, rawPayload, rawPayload, rawPayload);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

apiRouter.get(['/users/address', '/user/address', '/address'], async (req, res) => {
  const { email, uid } = req.query;
  const addresses = await getFormattedAddresses(req.supabase, email, uid);
  res.json(addresses);
});

apiRouter.post(['/users/address', '/user/address', '/address'], async (req, res) => {
  const { email, uid, label, name, phone, house, street, city, pincode, landmark, detail, isDefault } = req.body;
  const identities = await resolveAllUserIds(req.supabase, email, uid);
  if (identities.length === 0) return res.status(404).json({ message: 'User lookup failed' });
  const primaryId = identities[0].id;
  try {
    if (isDefault) await req.supabase.from('addresses').update({ is_default: false }).eq('user_id', primaryId);
    const rawPayload = { user_id: primaryId, label, name, phone, house, street, city, pincode, landmark, detail: detail || `${house}, ${street}, ${city} - ${pincode}`, is_default: !!isDefault };
    const { data, error } = await runAddressMutation((p, c) => req.supabase.from('addresses').insert([p]).select(c).maybeSingle(), rawPayload, rawPayload, rawPayload, rawPayload);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
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
    _id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    offerPrice: item.offer_price,
    discountPercentage: item.discount_percentage,
    category: item.category,
    image: item.image,
    isAvailable: item.is_available
  })));
});

apiRouter.post('/admin/menu', async (req, res) => {
  const { name, description, price, offerPrice, discountPercentage, category, image, isAvailable } = req.body;
  try {
    const { data, error } = await req.supabase.from('menu_items').insert([{
      name,
      description,
      price,
      offer_price: offerPrice,
      discount_percentage: discountPercentage,
      category,
      image,
      is_available: isAvailable !== false
    }]).select().single();
    if (error) throw error;
    res.json({ ...data, _id: data.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

apiRouter.patch('/admin/menu/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, price, offerPrice, discountPercentage, category, image, isAvailable } = req.body;
  try {
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (offerPrice !== undefined) updateData.offer_price = offerPrice;
    if (discountPercentage !== undefined) updateData.discount_percentage = discountPercentage;
    if (category !== undefined) updateData.category = category;
    if (image !== undefined) updateData.image = image;
    if (isAvailable !== undefined) updateData.is_available = isAvailable;
    const { data, error } = await req.supabase.from('menu_items').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    res.json({ ...data, _id: data.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

apiRouter.delete('/admin/menu/:id', async (req, res) => {
  try {
    const { error } = await req.supabase.from('menu_items').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
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
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const formatOrderForClient = (order) => ({
  _id: order.id,
  id: order.id,
  user_email: order.user_email,
  createdAt: order.created_at,
  status: order.status,
  totalAmount: order.total_amount,
  paymentMethod: order.payment_method,
  customer: { name: order.customer_name, phone: order.customer_phone, address: { house: order.address_house, street: order.address_street, city: order.address_city, pincode: order.address_pincode, landmark: order.address_landmark } },
  items: order.order_items || []
});

apiRouter.post('/orders', async (req, res) => {
  const { customer, items, totalAmount, paymentMethod, userEmail } = req.body;
  try {
    const { data: orderData, error } = await req.supabase.from('orders').insert([{ user_email: userEmail, customer_name: customer.name, customer_phone: customer.phone, address_house: customer.address.house, address_street: customer.address.street, address_city: customer.address.city, address_pincode: customer.address.pincode, address_landmark: customer.address.landmark, total_amount: totalAmount, payment_method: paymentMethod || 'Cash on Delivery' }]).select().single();
    if (error) throw error;
    if (items && items.length > 0) {
      await req.supabase.from('order_items').insert(items.map(item => ({ order_id: orderData.id, food_id: item.foodId, name: item.name, price: item.price, quantity: item.quantity, image: item.image })));
    }
    const finalOrder = { ...orderData, _id: orderData.id, items };
    broadcastNewOrder(finalOrder);
    res.status(201).json(finalOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

apiRouter.get('/orders/:id', async (req, res) => {
  try {
    const { data: order, error } = await req.supabase.from('orders').select('*, order_items (*)').eq('id', req.params.id).single();
    if (error) throw error;
    res.json(formatOrderForClient(order));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

apiRouter.get('/admin/orders', async (req, res) => {
  try {
    const { data: orders, error } = await req.supabase.from('orders').select('*, order_items (*)').order('created_at', { ascending: false });
    if (error) throw error;
    res.json((orders || []).map(formatOrderForClient));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

apiRouter.patch('/admin/orders/:id/status', async (req, res) => {
  try {
    const { error } = await req.supabase.from('orders').update({ status: req.body.status }).eq('id', req.params.id);
    if (error) throw error;
    const { data: order } = await req.supabase.from('orders').select('*, order_items (*)').eq('id', req.params.id).single();
    const formattedOrder = formatOrderForClient(order);
    broadcastOrderUpdate(formattedOrder);
    res.json(formattedOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

apiRouter.get('/user/orders', async (req, res) => {
  try {
    const { data, error } = await req.supabase.from('orders').select('*, order_items (*)').eq('user_email', req.query.email).order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data.map(order => ({ _id: order.id, createdAt: order.created_at, totalAmount: order.total_amount, status: order.status, items: order.order_items || [] })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
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
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

apiRouter.post('/users/sync', async (req, res) => {
  const { uid, name, email, photoURL, phone } = req.body;
  try {
    const normalizedEmail = email ? email.toLowerCase().trim() : null;
    const { data: user, error } = await req.supabase.from('users').upsert({ uid, name, email: normalizedEmail, photo_url: photoURL, phone, last_login: new Date().toISOString() }, { onConflict: 'uid' }).select().single();
    if (error) throw error;
    res.json({ ...user, _id: user.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

apiRouter.put('/users/profile', async (req, res) => {
  try {
    const { data: user, error } = await req.supabase.from('users').update({ name: req.body.name, phone: req.body.phone, photo_url: req.body.photo_url }).eq('uid', req.body.uid).select().single();
    if (error) throw error;
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
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
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.use('/api', apiRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use((req, res) => {
  console.log(`❌ [404] Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ 
    message: 'Not Found', 
    method: req.method, 
    url: req.url,
    hint: 'Check if the route is registered in backend/index.js'
  });
});

httpServer.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});

// Trigger redeploy at 1780238500

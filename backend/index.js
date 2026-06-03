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

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️ WARNING: Using SUPABASE_ANON_KEY. Row Level Security (RLS) may block backend operations.');
} else {
  console.log('✅ INFO: Using SUPABASE_SERVICE_ROLE_KEY. RLS will be bypassed for backend operations.');
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

// Helper to broadcast
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

// 1. Inject Supabase into Request
app.use((req, res, next) => {
  req.supabase = supabase;
  next();
});

// 2. Logging
app.use((req, res, next) => {
  if (req.url.toLowerCase().includes('/api')) {
    console.log(`>>> [REQUEST] ${req.method} ${req.url}`);
  }
  next();
});

// ABSOLUTE TOP PRIORITY HEALTH CHECK (V11.0)
app.get('/api/version', (req, res) => {
  res.status(200).send({ 
    version: '11.2.0-LIVE-ORDER-TRACKING', 
    timestamp: new Date().toISOString(),
    unique_sync_id: 'SYNC-AT-' + Date.now(),
    msg: 'LIVE ORDER TRACKING BUILD ONLINE.'
  });
});

// Enable case-insensitive routing
app.set('case sensitive routing', false);

// --- UNIVERSAL IDENTITY BRIDGE ---
const resolveAllUserIds = async (sb, email, uid = null) => {
  if (!email && !uid) return [];
  const normalizedEmail = email ? email.toLowerCase().trim() : null;
  console.log(`>>> [BRIDGE] Resolving Cluster: Email=${normalizedEmail}, UID=${uid}`);

  try {
    // 1. Find every user record that matches either key
    const filters = [];
    if (uid) filters.push(`uid.eq.${uid}`);
    if (normalizedEmail) filters.push(`email.ilike.${normalizedEmail}`);
    
    const { data: users } = await sb.from('users').select('id, uid, email').or(filters.join(','));
    
    if (!users || users.length === 0) {
      console.log(`>>> [BRIDGE] Cluster not found. Creating anchor user.`);
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
    console.log(`>>> [BRIDGE] Resolved Cluster IDs:`, allUserIdentities.map(u => u.id).join(', '));

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
  if (result.error?.code === '42703') {
    result = await queryBuilder(ADDRESS_SELECT_WITH_UID);
  }
  if (result.error?.code === '42703') {
    result = await queryBuilder(ADDRESS_SELECT_BASIC);
  }
  if (result.error?.code === '42703') {
    result = await queryBuilder(ADDRESS_SELECT_LEGACY);
  }
  return result;
};

const runAddressMutation = async (mutationBuilder, fullPayload, uidPayload, basicPayload, legacyPayload) => {
  let result = await mutationBuilder(fullPayload, ADDRESS_SELECT_WITH_EMAIL);
  if (result.error?.code === '42703') {
    result = await mutationBuilder(uidPayload, ADDRESS_SELECT_WITH_UID);
  }
  if (result.error?.code === '42703') {
    result = await mutationBuilder(basicPayload, ADDRESS_SELECT_BASIC);
  }
  if (result.error?.code === '42703') {
    result = await mutationBuilder(legacyPayload, ADDRESS_SELECT_LEGACY);
  }
  return result;
};

// --- ULTIMATE INDESTRUCTIBLE BRIDGE (v15.0) ---
const getFormattedAddresses = async (sb, email, uid = null) => {
  const identities = await resolveAllUserIds(sb, email, uid);
  const normalizedEmail = email ? email.toLowerCase().trim() : null;
  
  const userIds = identities.map(u => u.id);
  const firebaseUids = identities.map(u => u.uid).filter(Boolean);
  const searchEmails = Array.from(new Set([normalizedEmail, ...identities.map(u => u.email)].filter(Boolean)));

  console.log(`>>> [BRIDGE] SAFE-FETCH START: IDs=${userIds.length}, UIDs=${firebaseUids.length}, Emails=${searchEmails.length}`);

  const uniqueMap = new Map();

  // 1. SAFE FETCH BY INTERNAL ID
  try {
    const { data, error } = await runAddressSelect((columns) => sb.from('addresses').select(columns).in('user_id', userIds));
    if (error) throw error;
    (data || []).forEach(a => uniqueMap.set(a.id, a));
  } catch (e) { console.warn('>>> [BRIDGE] ID Fetch skipped:', e.message); }

  // 2. SAFE FETCH BY FIREBASE UID
  if (firebaseUids.length > 0) {
    try {
      const { data, error } = await runAddressSelect((columns) => sb.from('addresses').select(columns).in('firebase_uid', firebaseUids));
      if (error) throw error;
      (data || []).forEach(a => uniqueMap.set(a.id, a));
    } catch (e) { console.warn('>>> [BRIDGE] UID Fetch skipped:', e.message); }
  }

  // 3. SAFE FETCH BY EMAIL
  if (searchEmails.length > 0) {
    try {
      const { data, error } = await runAddressSelect((columns) => sb.from('addresses').select(columns).in('email', searchEmails));
      if (!error && data) {
        data.forEach(a => uniqueMap.set(a.id, a));
      } else if (error && error.code === '42703') {
         // Fallback if 'email' column doesn't exist but 'user_email' does
         const { data: data2, error: err2 } = await runAddressSelect((columns) => sb.from('addresses').select(columns).in('user_email', searchEmails));
         if (!err2 && data2) {
           data2.forEach(a => uniqueMap.set(a.id, a));
         }
      }
    } catch (e) { console.warn('>>> [BRIDGE] Email Fetch skipped:', e.message); }
  }

  // 4. SAFE FETCH BY USER_EMAIL (Extra layer of safety for old schema)
  if (searchEmails.length > 0) {
    try {
      const { data, error } = await runAddressSelect((columns) => sb.from('addresses').select(columns).in('user_email', searchEmails));
      if (!error && data) {
        data.forEach(a => uniqueMap.set(a.id, a));
      }
    } catch (e) { console.warn('>>> [BRIDGE] User_Email Fetch skipped:', e.message); }
  }

  const allResults = Array.from(uniqueMap.values());
  console.log(`>>> [BRIDGE] SAFE-FETCH COMPLETE: Found ${allResults.length} destinations.`);

  return allResults.sort((a, b) => {
    if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  }).map(addr => ({
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

// --- CRITICAL: HIGH-PRIORITY DELETE ROUTE ---
app.delete('/api/address/:id', async (req, res) => {
  const { id } = req.params;
  const { email, uid } = req.query;
  const identities = await resolveAllUserIds(req.supabase, email, uid);
  const userIds = identities.map(u => u.id);
  
  if (userIds.length === 0) return res.status(404).json({ message: 'User verification failed' });

  try {
    const { error } = await req.supabase.from('addresses').delete().eq('id', id).in('user_id', userIds);
    if (error) throw error;
    res.json({ success: true, message: 'Destination removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT Address
app.put(['/api/users/address/:id', '/api/user/address/:id', '/api/address/:id'], async (req, res) => {
  const { id } = req.params;
  const { email, uid, label, name, phone, house, street, city, pincode, landmark, detail, isDefault, district, latitude, longitude, delivery_instructions } = req.body;
  const identities = await resolveAllUserIds(req.supabase, email, uid);

  if (identities.length === 0) return res.status(404).json({ message: 'User not found' });
  const primaryId = identities[0].id;
  const primaryUid = identities[0].uid || uid;
  const primaryEmail = (identities[0].email || email || '').toLowerCase().trim();

  try {
    if (isDefault) {
       await req.supabase.from('addresses').update({ is_default: false }).eq('user_id', primaryId);
    }

    const rawPayload = {
      label, 
      name, 
      full_name: name,
      phone, 
      house, 
      address_line1: house,
      street, 
      address_line2: street,
      city, 
      state: req.body.state,
      pincode, 
      landmark, 
      district, latitude, longitude, delivery_instructions,
      detail: detail || `${house}, ${street}, ${city} - ${pincode}`, 
      is_default: !!isDefault, 
      user_id: primaryId,
      firebase_uid: primaryUid,
      email: primaryEmail,
      user_email: primaryEmail
    };

    // Strict Whitelist
    const whitelist = ['user_id', 'firebase_uid', 'email', 'user_email', 'label', 'name', 'full_name', 'phone', 'house', 'address_line1', 'street', 'address_line2', 'city', 'state', 'pincode', 'landmark', 'district', 'latitude', 'longitude', 'delivery_instructions', 'detail', 'is_default'];
    const payload = {};
    whitelist.forEach(k => { if (rawPayload[k] !== undefined) payload[k] = rawPayload[k]; });

    const uidPayload = { ...payload };
    delete uidPayload.email;
    delete uidPayload.user_email;
    const basicPayload = { user_id: primaryId, firebase_uid: primaryUid, label, name, phone, house, street, city, pincode, detail, is_default: !!isDefault };
    const legacyPayload = { user_id: primaryId, label, name, phone, house, street, city, pincode, detail, is_default: !!isDefault };

    const { data: updated, error } = await runAddressMutation(
      (mutationPayload, columns) => req.supabase.from('addresses').update(mutationPayload).eq('id', id).select(columns).maybeSingle(),
      payload,
      uidPayload,
      basicPayload,
      legacyPayload
    );

    if (error) throw error;
    res.json(updated);
  } catch (err) {
    console.error('❌ [PUT] Address update failed:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// GET Addresses
app.get(['/api/users/address', '/api/user/address', '/api/address'], async (req, res) => {
  const { email, uid } = req.query;
  if (!email && !uid) return res.status(400).json({ message: 'Email or UID required' });
  const addresses = await getFormattedAddresses(req.supabase, email, uid);
  res.json(addresses);
});

// POST Address
app.post(['/api/users/address', '/api/user/address', '/api/address'], async (req, res) => {
  const { email, uid, label, name, phone, house, street, city, pincode, landmark, detail, isDefault, district, latitude, longitude, delivery_instructions } = req.body;
  const identities = await resolveAllUserIds(req.supabase, email, uid);
  
  if (identities.length === 0) return res.status(404).json({ message: 'User lookup failed' });
  const primaryId = identities[0].id;
  const primaryUid = identities[0].uid || uid;
  const primaryEmail = (identities[0].email || email || '').toLowerCase().trim();

  try {
    if (isDefault) {
       await req.supabase.from('addresses').update({ is_default: false }).eq('user_id', primaryId);
    }

    const rawPayload = { 
      user_id: primaryId,
      firebase_uid: primaryUid,
      email: primaryEmail,
      user_email: primaryEmail,
      label, 
      name,
      full_name: name,
      phone, 
      house, 
      address_line1: house,
      street, 
      address_line2: street,
      city, 
      state: req.body.state,
      pincode, 
      landmark, 
      district, latitude, longitude, delivery_instructions,
      detail: detail || `${house}, ${street}, ${city} - ${pincode}`, 
      is_default: !!isDefault 
    };

    // Strict Whitelist to prevent "user_email" or other non-existent column errors
    const whitelist = ['user_id', 'firebase_uid', 'email', 'user_email', 'label', 'name', 'full_name', 'phone', 'house', 'address_line1', 'street', 'address_line2', 'city', 'state', 'pincode', 'landmark', 'district', 'latitude', 'longitude', 'delivery_instructions', 'detail', 'is_default'];
    const payload = {};
    whitelist.forEach(k => { if (rawPayload[k] !== undefined) payload[k] = rawPayload[k]; });

    const uidPayload = { ...payload };
    delete uidPayload.email;
    delete uidPayload.user_email;
    const basicPayload = { user_id: primaryId, firebase_uid: primaryUid, label, name, phone, house, street, city, pincode, detail, is_default: !!isDefault };
    const legacyPayload = { user_id: primaryId, label, name, phone, house, street, city, pincode, detail, is_default: !!isDefault };

    const { data: newAddress, error } = await runAddressMutation(
      (mutationPayload, columns) => req.supabase.from('addresses').insert([mutationPayload]).select(columns).maybeSingle(),
      payload,
      uidPayload,
      basicPayload,
      legacyPayload
    );

    if (error) throw error;
    res.json(newAddress);
  } catch (err) {
    console.error('❌ [POST] Address creation failed:', err.message);
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/restaurants', async (req, res) => {
  const { data, error } = await req.supabase.from('restaurants').select('*');
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

app.get('/api/menu', async (req, res) => {
  const { data, error } = await req.supabase.from('menu_items').select('*').eq('is_available', true);
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

const formatOrderForClient = (order) => ({
  _id: order.id,
  id: order.id,
  user_email: order.user_email,
  createdAt: order.created_at,
  status: order.status,
  totalAmount: order.total_amount,
  paymentMethod: order.payment_method,
  estimatedDeliveryTime: order.estimated_delivery_time,
  customer: {
    name: order.customer_name,
    phone: order.customer_phone,
    address: {
      house: order.address_house,
      street: order.address_street,
      city: order.address_city,
      pincode: order.address_pincode,
      landmark: order.address_landmark,
      fullAddress: [
        order.address_house,
        order.address_street,
        order.address_city && order.address_pincode
          ? `${order.address_city} - ${order.address_pincode}`
          : order.address_city || order.address_pincode,
        order.address_landmark ? `Landmark: ${order.address_landmark}` : null
      ].filter(Boolean).join(', ')
    }
  },
  deliveryPartner: order.delivery_partner_name ? {
    name: order.delivery_partner_name,
    phone: order.delivery_partner_phone,
    vehicleNumber: order.delivery_partner_vehicle
  } : null,
  items: order.order_items || []
});

app.post('/api/orders', async (req, res) => {
  const { customer, items, totalAmount, paymentMethod, userEmail, delivery_address_snapshot } = req.body;
  try {
    const { data: orderData, error: orderError } = await req.supabase.from('orders').insert([{
      user_email: userEmail,
      customer_name: customer.name,
      customer_phone: customer.phone,
      address_house: customer.address.house,
      address_street: customer.address.street,
      address_city: customer.address.city,
      address_pincode: customer.address.pincode,
      address_landmark: customer.address.landmark,
      total_amount: totalAmount,
      payment_method: paymentMethod || 'Cash on Delivery',
      address_id: delivery_address_snapshot?.id || delivery_address_snapshot?._id // Link to saved address
    }]).select().single();

    if (orderError) {
      // Fallback if address_id column is missing
      if (orderError.code === '42703') {
        const fallback = await req.supabase.from('orders').insert([{
          user_email: userEmail,
          customer_name: customer.name,
          customer_phone: customer.phone,
          address_house: customer.address.house,
          address_street: customer.address.street,
          address_city: customer.address.city,
          address_pincode: customer.address.pincode,
          address_landmark: customer.address.landmark,
          total_amount: totalAmount,
          payment_method: paymentMethod || 'Cash on Delivery'
        }]).select().single();
        if (fallback.error) throw fallback.error;
        return res.status(201).json({ ...fallback.data, _id: fallback.data.id, items });
      }
      throw orderError;
    }

    if (items && items.length > 0) {
      await req.supabase.from('order_items').insert(items.map(item => ({
        order_id: orderData.id,
        food_id: item.foodId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image
      })));
    }

    const finalOrder = { ...orderData, _id: orderData.id, items };
    broadcastNewOrder(finalOrder);

    res.status(201).json(finalOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data: order, error } = await req.supabase
      .from('orders')
      .select('*, order_items (*)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: 'Order not found' });
      }
      throw error;
    }

    res.json(formatOrderForClient(order));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/admin/orders', async (req, res) => {
  try {
    const { data: orders, error } = await req.supabase
      .from('orders')
      .select('*, order_items (*)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json((orders || []).map(formatOrderForClient));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.patch('/api/admin/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, deliveryPartner } = req.body;

  try {
    const updateData = { status };

    if (deliveryPartner) {
      updateData.delivery_partner_name = deliveryPartner.name;
      updateData.delivery_partner_phone = deliveryPartner.phone;
      updateData.delivery_partner_vehicle = deliveryPartner.vehicleNumber;
    }

    const { error: updateError } = await req.supabase
      .from('orders')
      .update(updateData)
      .eq('id', id);

    if (updateError) throw updateError;

    const { data: order, error: fetchError } = await req.supabase
      .from('orders')
      .select('*, order_items (*)')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const formattedOrder = formatOrderForClient(order);
    broadcastOrderUpdate(formattedOrder);

    res.json(formattedOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/user/orders', async (req, res) => {
  const { email } = req.query;
  try {
    let query = req.supabase.from('orders').select('*, order_items (*)').order('created_at', { ascending: false });
    if (email) query = query.eq('user_email', email);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data.map(order => ({
      _id: order.id,
      createdAt: order.created_at,
      totalAmount: order.total_amount,
      status: order.status,
      items: order.order_items || []
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/profile', async (req, res) => {
  const { email, uid } = req.query;
  try {
    const filters = [];
    if (uid) filters.push(`uid.eq.${uid}`);
    if (email) filters.push(`email.ilike.${email}`);

    if (filters.length === 0) return res.status(400).json({ message: 'Email or UID required' });

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

app.post('/api/users/sync', async (req, res) => {
  const { uid, name, email, photoURL, phone } = req.body;
  try {
    const normalizedEmail = email ? email.toLowerCase().trim() : null;

    // Try linking to existing email first
    if (normalizedEmail) {
      const { data: existingUsers } = await req.supabase.from('users').select('id, uid').ilike('email', normalizedEmail);
      if (existingUsers && existingUsers.length > 0) {
        // Link all records with this email to the current UID
        await req.supabase.from('users').update({ uid, name, photo_url: photoURL, phone, last_login: new Date().toISOString() }).ilike('email', normalizedEmail);
        
        const { data: updatedUser, error } = await req.supabase.from('users').select().eq('uid', uid).single();
        if (error) throw error;
        return res.json({ ...updatedUser, _id: updatedUser.id });
      }
    }

    const { data: user, error } = await req.supabase.from('users').upsert({ 
      uid, name, email: normalizedEmail, photo_url: photoURL, phone, last_login: new Date().toISOString()
    }, { onConflict: 'uid' }).select().single();
    if (error) throw error;
    res.json({ ...user, _id: user.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/users/profile', async (req, res) => {
  const { uid, name, phone, photo_url } = req.body;
  try {
    const { data: user, error } = await req.supabase.from('users').update({ 
      name, phone, photo_url
    }).eq('uid', uid).select().single();
    if (error) throw error;
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/users/profile/upload', upload.single('image'), async (req, res) => {
  const { uid } = req.body;
  const file = req.file;
  if (!file) return res.status(400).json({ message: 'No file uploaded' });

  const fileName = `${uid}-${Date.now()}${path.extname(file.originalname)}`;
  try {
    const { data: uploadData, error: uploadError } = await req.supabase.storage
      .from('profile-images')
      .upload(fileName, file.buffer, { contentType: file.mimetype });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = req.supabase.storage
      .from('profile-images')
      .getPublicUrl(fileName);

    res.json({ publicUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use((req, res) => res.status(404).json({ message: 'Not Found' }));

httpServer.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});

// Trigger redeploy at 1780238100

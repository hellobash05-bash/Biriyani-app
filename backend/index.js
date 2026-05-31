import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

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

// ABSOLUTE TOP PRIORITY HEALTH CHECK (V9.1)
app.get('/api/version', (req, res) => {
  res.status(200).send({ 
    version: '9.1.0-SCHEMA-FIX', 
    timestamp: new Date().toISOString(),
    unique_sync_id: 'SYNC-AT-' + Date.now(),
    msg: 'DATABASE COLUMNS ALIGNED TO HOUSE/STREET.'
  });
});

// Enable case-insensitive routing
app.set('case sensitive routing', false);

// --- CRITICAL: HIGH-PRIORITY DELETE ROUTE ---
app.delete('/api/address/:id', async (req, res) => {
  const { id } = req.params;
  const { email } = req.query;
  console.log(`>>> [NUCLEAR DELETE] ID=${id}, Email=${email}`);

  if (!id) return res.status(400).json({ message: 'ID required' });

  try {
    const { data: user } = await req.supabase.from('users').select('id, uid').ilike('email', email).maybeSingle();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { error } = await req.supabase.from('addresses').delete().eq('id', id).or(`user_id.eq.${user.id},firebase_uid.eq.${user.uid}`);
    if (error) throw error;

    res.json({ success: true, message: 'Address removed' });
  } catch (err) {
    console.error('❌ Nuclear Delete Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// PUT Address
app.put([
  '/api/users/address/:id', 
  '/api/user/address/:id', 
  '/api/address/:id',
], async (req, res) => {
  const { id } = req.params;
  const { email, label, name, phone, house, street, city, pincode, landmark, detail, isDefault } = req.body;
  
  try {
    const { data: user } = await req.supabase.from('users').select('id, uid').ilike('email', email).single();
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (isDefault) await req.supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);

    const { data: updated, error } = await req.supabase.from('addresses').update({
      label, 
      name, 
      phone, 
      house, 
      street, 
      city, 
      pincode, 
      landmark, 
      detail: detail || `${house}, ${street}, ${city} - ${pincode}`, 
      is_default: !!isDefault,
      user_id: user.id
    }).eq('id', id).or(`user_id.eq.${user.id}`).select().maybeSingle();

    if (error) return res.status(400).json({ message: error.message });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET Addresses
app.get(['/api/users/address', '/api/user/address', '/api/address'], async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: 'Email required' });
  
  try {
    const { data: user } = await req.supabase.from('users').select('id, uid').ilike('email', email).maybeSingle();
    if (!user) return res.json([]);

    const { data, error } = await req.supabase.from('addresses')
      .select('*')
      .or(`user_id.eq.${user.id}`)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST Address
app.post(['/api/users/address', '/api/user/address', '/api/address'], async (req, res) => {
  const { email, label, name, phone, house, street, city, pincode, landmark, detail, isDefault } = req.body;
  
  try {
    const { data: user } = await req.supabase.from('users').select('id, uid').ilike('email', email).single();
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (isDefault) await req.supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);

    const { data: newAddress, error } = await req.supabase.from('addresses').insert([{ 
      user_id: user.id, 
      label, 
      name,
      phone, 
      house, 
      street,
      city, 
      pincode, 
      landmark, 
      detail: detail || `${house}, ${street}, ${city} - ${pincode}`, 
      is_default: !!isDefault 
    }]).select().maybeSingle();

    if (error) return res.status(400).json({ message: error.message });
    res.json(newAddress);
  } catch (err) {
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

app.post('/api/orders', async (req, res) => {
  const { customer, items, totalAmount, paymentMethod, userEmail } = req.body;
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
      payment_method: paymentMethod || 'Cash on Delivery'
    }]).select().single();

    if (orderError) throw orderError;

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

    res.status(201).json({ ...orderData, _id: orderData.id, items });
  } catch (error) {
    res.status(400).json({ message: error.message });
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
    let query = req.supabase.from('users').select('*, user_favorites(menu_item_id)');
    if (email) query = query.ilike('email', email);
    if (uid) query = query.eq('uid', uid);
    const { data: users, error } = await query;
    if (error) throw error;
    if (!users || users.length === 0) return res.status(404).json({ message: 'Not found' });
    const user = users[0];
    const { data: addresses } = await req.supabase.from('addresses').select('*').or(`user_id.eq.${user.id},firebase_uid.eq.${user.uid}`);
    res.json({ ...user, _id: user.id, addresses: addresses || [], favorites: user.user_favorites?.map(f => f.menu_item_id) || [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/users/sync', async (req, res) => {
  const { uid, name, email, photoURL, phone } = req.body;
  try {
    const { data: user, error } = await req.supabase.from('users').upsert({ 
      uid, name, email, photo_url: photoURL, phone, last_login: new Date().toISOString()
    }, { onConflict: 'uid' }).select().single();
    if (error) throw error;
    res.json({ ...user, _id: user.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use((req, res) => res.status(404).json({ message: 'Not Found' }));

httpServer.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});

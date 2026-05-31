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

// ABSOLUTE TOP PRIORITY HEALTH CHECK (V9.6)
app.get('/api/version', (req, res) => {
  res.status(200).send({ 
    version: '9.6.0-PRECISION-ID', 
    timestamp: new Date().toISOString(),
    unique_sync_id: 'SYNC-AT-' + Date.now(),
    msg: 'SEQUENTIAL USER LOOKUP ENABLED.'
  });
});

// Enable case-insensitive routing
app.set('case sensitive routing', false);

// --- ROBUST HELPER ---
const getFormattedAddresses = async (sb, email, uid = null) => {
  if (!email && !uid) return [];
  const normalizedEmail = email ? email.toLowerCase().trim() : null;
  console.log(`>>> [HELPER] Fetching for: Email=${normalizedEmail}, UID=${uid}`);

  try {
    // 1. Find user using sequential precision (UID first, then Email)
    let user = null;
    if (uid) {
      const { data } = await sb.from('users').select('id, email').eq('uid', uid).maybeSingle();
      user = data;
    }
    
    if (!user && normalizedEmail) {
      const { data } = await sb.from('users').select('id, email').ilike('email', normalizedEmail).maybeSingle();
      user = data;
    }
    
    if (!user) {
      console.warn('>>> [HELPER] User NOT FOUND in database');
      return [];
    }
    console.log(`>>> [HELPER] Identified User UUID: ${user.id}`);

    // 2. Fetch addresses strictly by user_id (UUID)
    const { data, error } = await sb.from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(addr => ({
      ...addr,
      id: addr.id,
      _id: addr.id,
      isDefault: !!addr.is_default,
      house: addr.house || '',
      street: addr.street || '',
      city: addr.city || '',
      pincode: addr.pincode || '',
      detail: addr.detail || `${addr.house}, ${addr.street}, ${addr.city} - ${addr.pincode}`
    }));
  } catch (err) {
    console.error('❌ [HELPER] Critical Error:', err.message);
    return [];
  }
};

// --- CRITICAL: HIGH-PRIORITY DELETE ROUTE ---
app.delete('/api/address/:id', async (req, res) => {
  const { id } = req.params;
  const { email, uid } = req.query;
  console.log(`>>> [DELETE] ID=${id}, User=${email || uid}`);

  if (!id) return res.status(400).json({ message: 'ID required' });

  try {
    let user = null;
    if (uid) {
      const { data } = await req.supabase.from('users').select('id').eq('uid', uid).maybeSingle();
      user = data;
    }
    if (!user && email) {
      const { data } = await req.supabase.from('users').select('id').ilike('email', email).maybeSingle();
      user = data;
    }
    
    if (!user) return res.status(404).json({ message: 'User verification failed' });

    const { error } = await req.supabase.from('addresses').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;

    res.json({ success: true, message: 'Destination removed' });
  } catch (err) {
    console.error('❌ Delete Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// PUT Address
app.put(['/api/users/address/:id', '/api/user/address/:id', '/api/address/:id'], async (req, res) => {
  const { id } = req.params;
  const { email, uid, label, name, phone, house, street, city, pincode, landmark, detail, isDefault } = req.body;
  
  try {
    let user = null;
    if (uid) {
      const { data } = await req.supabase.from('users').select('id').eq('uid', uid).maybeSingle();
      user = data;
    }
    if (!user && email) {
      const { data } = await req.supabase.from('users').select('id').ilike('email', email).maybeSingle();
      user = data;
    }

    if (!user) return res.status(404).json({ message: 'User not found' });

    if (isDefault) await req.supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);

    const { data: updated, error } = await req.supabase.from('addresses').update({
      label, name, phone, house, street, city, pincode, landmark, 
      detail: detail || `${house}, ${street}, ${city} - ${pincode}`, 
      is_default: !!isDefault, user_id: user.id
    }).eq('id', id).eq('user_id', user.id).select().maybeSingle();

    if (error) throw error;
    res.json(updated);
  } catch (err) {
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
  const { email, uid, label, name, phone, house, street, city, pincode, landmark, detail, isDefault } = req.body;
  
  try {
    let user = null;
    if (uid) {
      const { data } = await req.supabase.from('users').select('id').eq('uid', uid).maybeSingle();
      user = data;
    }
    if (!user && email) {
      const { data } = await req.supabase.from('users').select('id').ilike('email', email).maybeSingle();
      user = data;
    }
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (isDefault) await req.supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);

    const { data: newAddress, error } = await req.supabase.from('addresses').insert([{ 
      user_id: user.id, label, name,
      phone, house, street, city, pincode, landmark, 
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
    const addresses = await getFormattedAddresses(req.supabase, user.email, user.uid);
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

// Trigger redeploy at 1780213000

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
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

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  req.supabase = supabase;
  next();
});

// --- HELPERS ---
const getFormattedAddresses = async (userId, firebaseUid) => {
  if (!userId && !firebaseUid) return [];
  
  try {
    let query = supabase.from('addresses').select('*');
    
    if (userId && firebaseUid) {
      query = query.or(`user_id.eq.${userId},firebase_uid.eq.${firebaseUid}`);
    } else if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('firebase_uid', firebaseUid);
    }
    
    const { data, error } = await query
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('❌ Error fetching addresses helper:', error.message);
      return [];
    }
    
    return (data || []).map(addr => ({
      ...addr,
      isDefault: addr.is_default || false,
      name: addr.name || addr.full_name,
      full_name: addr.full_name || addr.name,
      house: addr.house || addr.address_line1,
      address_line1: addr.address_line1 || addr.house,
      street: addr.street || addr.address_line2,
      address_line2: addr.address_line2 || addr.street
    }));
  } catch (err) {
    console.error('💥 Crash in addresses helper:', err.message);
    return [];
  }
};

app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to the Royale Biriyani API',
    status: 'online',
    endpoints: [
      '/api/version',
      '/api/db-status',
      '/api/db-test-write',
      '/api/restaurants',
      '/api/menu',
      '/api/admin/orders',
      '/api/admin/customers'
    ]
  });
});

app.get('/api/version', (req, res) => {
  res.json({ 
    version: '2.0.0', 
    status: 'Royale Backend Online (Supabase Realtime Ready)',
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

const PORT = process.env.PORT || 5000;

app.get('/api/db-status', async (req, res) => {
  console.log('--- CHECKING DB STATUS ---');
  try {
    const { data, error, count } = await supabase
      .from('menu_items')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
       console.error('❌ Supabase Connection Check Failed:', error);
       return res.json({ status: 'failed', type: 'supabase', error: error.message });
    }
    
    console.log(`✅ Supabase Connected. Table "menu_items" has ${count} rows.`);
    res.json({ status: 'connected', type: 'supabase', url: supabaseUrl, rowCount: count });
  } catch (err) {
    console.error('💥 DB Status endpoint crash:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.get('/api/db-test-write', async (req, res) => {
  console.log('--- TESTING DB WRITE PERMISSIONS ---');
  const testId = `test-${Date.now()}`;
  try {
    // Attempt a test insert into restaurants (it has owner_id nullable)
    const { data, error } = await supabase.from('restaurants').insert([{
      name: 'Test Write Restaurant',
      address: '123 Test St',
      type: 'Test'
    }]).select();

    if (error) {
      console.error('❌ DB Write Test Failed:', error);
      return res.status(400).json({ status: 'failed', error: error.message });
    }

    console.log('✅ DB Write Test Succeeded:', data);

    // Clean up
    const { error: delError } = await supabase.from('restaurants').delete().eq('id', data[0].id);
    if (delError) console.warn('⚠️ Could not clean up test restaurant:', delError.message);

    res.json({ status: 'success', message: 'Write permissions verified', data });
  } catch (err) {
    console.error('💥 DB Write Test Crash:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Biriyani Backend is running with Supabase',
    environment: {
      url: supabaseUrl,
      keyType: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON_KEY'
    }
  });
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
  const { customer, items, totalAmount, paymentMethod, userEmail } = req.body;
  const normalizedEmail = userEmail ? userEmail.toLowerCase().trim() : null;
  
  console.log(`--- PLACING ORDER FOR: ${normalizedEmail || customer.name} ---`);
  
  try {
    // 1. Insert Order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([{
        user_email: normalizedEmail,
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

    if (orderError) {
      console.error('❌ Order Insert Error:', orderError);
      throw orderError;
    }

    console.log(`✅ Order created successfully: ID ${orderData.id}`);

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
      if (itemsError) {
        console.error('❌ Order Items Insert Error:', itemsError);
        throw itemsError;
      }
      console.log(`✅ ${items.length} items added to order ${orderData.id}`);
    }

    // Format for frontend
    const responseOrder = { ...orderData, _id: orderData.id, items };
    res.status(201).json(responseOrder);
  } catch (error) {
    console.error('💥 Order placement crash:', error);
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
  const normalizedEmail = email ? email.toLowerCase().trim() : null;
  console.log(`--- FETCHING PROFILE FOR: ${normalizedEmail || uid} ---`);
  
  try {
    let query = supabase
      .from('users')
      .select('*, user_favorites(menu_item_id)');
    
    if (normalizedEmail) query = query.ilike('email', normalizedEmail);
    if (uid) query = query.eq('uid', uid);
    
    const { data: users, error } = await query;
    
    if (error) {
      console.error('Profile fetch error:', error);
      return res.status(500).json({ message: error.message });
    }

    if (!users || users.length === 0) {
      console.warn(`Profile not found for: ${normalizedEmail || uid}`);
      return res.status(404).json({ message: 'User profile not found.' });
    }

    const user = users[0];
    
    // Fetch addresses robustly using helper
    const addresses = await getFormattedAddresses(user.id, user.uid);
    
    // Format favorites into a simple array of IDs
    const favorites = user.user_favorites ? user.user_favorites.map(f => f.menu_item_id) : [];
    
    console.log(`✅ Profile fetched for ${user.email} with ${addresses.length} addresses`);
    
    res.json({ 
      ...user, 
      _id: user.id, 
      createdAt: user.created_at,
      lastLogin: user.last_login,
      favorites, 
      addresses: addresses
    });
  } catch (err) {
    console.error('Profile endpoint crash:', err);
    res.status(500).json({ message: 'Internal server error fetching profile' });
  }
});

app.post('/api/users/sync', async (req, res) => {
  const { uid, name, email, photoURL, phone } = req.body;
  if (!uid) {
    console.error('❌ Sync failed: No UID provided');
    return res.status(400).json({ message: 'UID is required for sync' });
  }
  
  const normalizedEmail = email ? email.toLowerCase().trim() : null;
  console.log(`--- SYNC REQUEST: UID=${uid}, Name=${name}, Email=${normalizedEmail} ---`);
  
  const isAdminEmail = normalizedEmail === 'hellobash05@gmail.com' || normalizedEmail === 'arunsuresh667@gmail.com';
  
  try {
    // 1. First, check if a user with this EMAIL already exists (using case-insensitive lookup)
    if (normalizedEmail) {
      const { data: emailUser, error: emailError } = await supabase
        .from('users')
        .select('id, uid, role')
        .ilike('email', normalizedEmail)
        .maybeSingle();

      if (emailUser && emailUser.uid !== uid) {
        console.log(`⚠️ Conflict: Email ${normalizedEmail} exists with different UID. Updating UID to ${uid}.`);
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ 
            uid, 
            last_login: new Date().toISOString(),
            name: name || 'Royale Member',
            photo_url: photoURL || ''
          })
          .ilike('email', normalizedEmail)
          .select()
          .single();

        if (!updateError) {
          console.log(`✅ Fixed Conflict: Updated UID for ${normalizedEmail}`);
          
          // Fetch the full profile robustly
          const { data: fullUser, error: fetchError } = await supabase
            .from('users')
            .select('*, user_favorites(menu_item_id)')
            .eq('id', updatedUser.id)
            .single();

          if (fetchError) {
            return res.json({ ...updatedUser, _id: updatedUser.id, addresses: [], favorites: [] });
          }

          // Fetch addresses robustly using helper
          const formattedAddresses = await getFormattedAddresses(fullUser.id, fullUser.uid);

          const favorites = fullUser.user_favorites ? fullUser.user_favorites.map(f => f.menu_item_id) : [];

          return res.json({ 
            ...fullUser, 
            _id: fullUser.id, 
            favorites, 
            addresses: formattedAddresses 
          });
        }
      }
    }

    // 2. Normal Upsert by UID
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('uid', uid)
      .maybeSingle();

    const upsertData = { 
      uid, 
      name: name || 'Royale Member', 
      email: normalizedEmail, 
      photo_url: photoURL || '',
      phone: phone || '', 
      role: existingUser ? existingUser.role : (isAdminEmail ? 'admin' : 'customer'),
      last_login: new Date().toISOString()
    };
    
    const { data: user, error: upsertError } = await supabase
      .from('users')
      .upsert(upsertData, { 
        onConflict: 'uid',
        ignoreDuplicates: false 
      })
      .select()
      .maybeSingle();
    
    if (upsertError) {
      console.error('❌ Supabase Upsert Error:', upsertError);
      return res.status(400).json({ message: upsertError.message });
    }

    if (!user) throw new Error('Failed to retrieve user after sync');

    const { data: fullUser, error: fetchError } = await supabase
      .from('users')
      .select('*, user_favorites(menu_item_id)')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.warn('⚠️ Sync fetch error:', fetchError.message);
      return res.json({ ...user, _id: user.id, addresses: [], favorites: [] });
    }

    // Fetch addresses robustly using helper
    const formattedAddresses = await getFormattedAddresses(fullUser.id, fullUser.uid);

    const favorites = fullUser.user_favorites ? fullUser.user_favorites.map(f => f.menu_item_id) : [];

    console.log(`✅ Sync Success: ${fullUser.email} (ID: ${fullUser.id}) with ${formattedAddresses.length} addresses`);
    res.json({ 
      ...fullUser, 
      _id: fullUser.id, 
      favorites, 
      addresses: formattedAddresses 
    });
  } catch (error) {
    console.error('💥 Sync crash:', error);
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/users/address', async (req, res) => {
  const { email, label, name, phone, house, street, city, pincode, landmark, detail, isDefault } = req.body;
  const normalizedEmail = email ? email.toLowerCase().trim() : null;
  console.log(`--- ADDING ADDRESS FOR: ${normalizedEmail} ---`);
  
  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, uid')
      .ilike('email', normalizedEmail)
      .single();
    
    if (userError || !user) {
      console.error('User search error:', userError);
      return res.status(404).json({ message: 'User not found in database.' });
    }

    if (isDefault) {
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);
    }

    const addressData = { 
      user_id: user.id, 
      firebase_uid: user.uid,
      label, 
      name, 
      full_name: name,
      phone, 
      house, 
      address_line1: house,
      street, 
      address_line2: street,
      city, 
      pincode, 
      landmark, 
      detail, 
      is_default: !!isDefault 
    };

    const { data: newAddress, error: insertError } = await supabase.from('addresses')
      .insert([addressData])
      .select();

    if (insertError) {
      console.error('Address insert error:', insertError);
      return res.status(400).json({ message: insertError.message });
    }

    console.log('✅ Address saved successfully');
    res.json(newAddress);
  } catch (err) {
    console.error('Address endpoint crash:', err);
    res.status(500).json({ message: 'Server error saving address' });
  }
});

app.put('/api/users/address/:id', async (req, res) => {
  const { id } = req.params;
  const { email, label, name, phone, house, street, city, pincode, landmark, detail, isDefault } = req.body;
  const normalizedEmail = email ? email.toLowerCase().trim() : null;

  try {
    const { data: user, error: userError } = await supabase.from('users').select('id, uid').ilike('email', normalizedEmail).single();
    if (userError || !user) return res.status(404).json({ message: 'User not found' });

    if (isDefault) {
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);
    }

    // Populate both Legacy and Modern fields for cross-compatibility
    const updateData = {
      label, 
      name, 
      full_name: name,
      phone, 
      house, 
      address_line1: house,
      street, 
      address_line2: street,
      city, 
      pincode, 
      landmark, 
      detail, 
      is_default: !!isDefault,
      firebase_uid: user.uid
    };

    const { data: updatedAddress, error } = await supabase.from('addresses')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select();

    if (error) return res.status(400).json({ message: error.message });
    res.json(updatedAddress);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/users/address/:id', async (req, res) => {
  const { id } = req.params;
  const { email } = req.query;
  const normalizedEmail = email ? email.toLowerCase().trim() : null;

  try {
    const { data: user, error: userError } = await supabase.from('users').select('id').ilike('email', normalizedEmail).single();
    if (userError || !user) return res.status(404).json({ message: 'User not found' });

    const { error } = await supabase.from('addresses').delete().eq('id', id).eq('user_id', user.id);
    if (error) return res.status(400).json({ message: error.message });
    res.json({ message: 'Address deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
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

// --- ACTIVITIES ---
app.post('/api/activities', async (req, res) => {
  const { firebaseUid, activity } = req.body;
  const { data, error } = await supabase.from('activities').insert([{
    firebase_uid: firebaseUid,
    activity
  }]).select().single();

  if (error) return res.status(400).json({ message: error.message });
  res.status(201).json(data);
});

app.get('/api/activities/:firebaseUid', async (req, res) => {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('firebase_uid', req.params.firebaseUid)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

// --- PROJECTS ---
app.post('/api/projects', async (req, res) => {
  const { firebaseUid, name, description, data: projectData } = req.body;
  const { data, error } = await supabase.from('projects').insert([{
    firebase_uid: firebaseUid,
    name,
    description,
    data: projectData
  }]).select().single();

  if (error) return res.status(400).json({ message: error.message });
  res.status(201).json(data);
});

app.get('/api/projects/:firebaseUid', async (req, res) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('firebase_uid', req.params.firebaseUid)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
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
  const { data, error } = await supabase.from('users').select('*').order('last_login', { ascending: false });
  if (error) return res.status(500).json({ message: error.message });

  res.json(data.map(u => ({
    ...u, 
    _id: u.id,
    createdAt: u.created_at,
    lastLogin: u.last_login
  })));
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
const BIRIYANI_IMAGE = 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?q=80&w=800&auto=format&fit=crop';

app.get('/api/admin/repair-images', async (req, res) => {
  console.log('--- REPAIRING BROKEN IMAGE URLS ---');
  const brokenUrl = 'https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?q=80&w=600&auto=format&fit=crop';
  
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .update({ image: BIRIYANI_IMAGE })
      .eq('image', brokenUrl)
      .select();
    
    if (error) throw error;
    
    console.log(`✅ Repaired ${data?.length || 0} broken image links.`);
    res.json({ message: `Successfully repaired ${data?.length || 0} images.`, repairedItems: data });
  } catch (err) {
    console.error('💥 Image repair crash:', err);
    res.status(500).json({ message: err.message });
  }
});

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
          { name: 'Hyderabadi Chicken Biriyani', description: 'Fragrant basmati rice cooked with succulent chicken and spices.', price: 250, offer_price: 199, discount_percentage: 20, category: 'Chicken', image: BIRIYANI_IMAGE },
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
  console.log(`Biriyani Server & Supabase running on port ${PORT}`);
});

import { supabase } from './supabase';

const isProd = typeof window !== 'undefined' && (
  window.location.hostname.includes('github.io') || 
  window.location.hostname.includes('onrender.com') ||
  window.location.hostname.includes('vercel.app')
);
// Force absolute URL in production to bypass Vercel proxy issues
const DEFAULT_PROD_URL = 'https://biriyani-backend.onrender.com/api';
const normalizeSupabaseUrl = (url: string) => {
  const compactUrl = url.replace(/\s+/g, '');
  const match = compactUrl.match(/^https:\/\/[a-z0-9-]+\.supabase\.co/i);
  return match ? match[0] : compactUrl.replace(/\/+$/, '');
};

const SUPABASE_REST_URL = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bfrhmbtqogrlrkiyquce.supabase.co');
const SUPABASE_REST_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_n7eiiI_lHFrqewV5WR9iCQ_rYk4dSyG').replace(/\s+/g, '');

let rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || (isProd 
  ? DEFAULT_PROD_URL 
  : 'http://localhost:5000/api');

// If it's a relative URL in production, it's wrong - force the external backend
if (isProd && rawBaseUrl.startsWith('/')) {
  console.warn('--- API: RELATIVE URL DETECTED IN PROD, FORCING ABSOLUTE ---', rawBaseUrl);
  rawBaseUrl = DEFAULT_PROD_URL;
}

export const API_BASE_URL = rawBaseUrl;

const formatOrderFromDatabase = (data: any) => ({
  ...data,
  _id: data.id,
  createdAt: data.created_at,
  totalAmount: data.total_amount,
  estimatedDeliveryTime: data.estimated_delivery_time,
  customer: {
    name: data.customer_name,
    phone: data.customer_phone,
    address: {
      house: data.address_house,
      street: data.address_street,
      city: data.address_city,
      pincode: data.address_pincode,
      landmark: data.address_landmark,
      fullAddress: [
        data.address_house,
        data.address_street,
        data.address_city && data.address_pincode
          ? `${data.address_city} - ${data.address_pincode}`
          : data.address_city || data.address_pincode,
        data.address_landmark ? `Landmark: ${data.address_landmark}` : null
      ].filter(Boolean).join(', ')
    }
  },
  deliveryPartner: data.delivery_partner_name ? {
    name: data.delivery_partner_name,
    phone: data.delivery_partner_phone,
    vehicleNumber: data.delivery_partner_vehicle
  } : null,
  items: data.order_items || []
});

// Helper to ensure path is robust
const getCleanUrl = (path: string) => {
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  
  // CRITICAL: DO NOT lowercase the path anymore, as IDs are case-sensitive
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Prevent /api/api duplication if base already includes it and path starts with it
  let finalUrl = `${base}${cleanPath}`;
  
  // If base is https://.../api and path is /api/users... -> https://.../api/users...
  if (base.toLowerCase().endsWith('/api') && cleanPath.toLowerCase().startsWith('/api/')) {
    finalUrl = `${base.slice(0, -4)}${cleanPath}`;
  }

  if (typeof window !== 'undefined') {
    console.log('>>> [API URL] Final:', finalUrl);
  }
  return finalUrl;
};

if (typeof window !== 'undefined') {
  console.log('--- ROYALE API CONFIG ---');
  console.log('Base URL:', API_BASE_URL);
}

export const SOCKET_URL = isProd
  ? 'https://biriyani-backend.onrender.com'
  : (process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000');

export async function fetchRestaurants() {
  const response = await fetch(getCleanUrl('/restaurants'));
  if (!response.ok) {
    throw new Error('Failed to fetch restaurants');
  }
  return response.json();
}

export async function seedData() {
  const response = await fetch(getCleanUrl('/seed'), {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to seed data');
  }
  return response.json();
}

export async function fetchProfile() {
  const response = await fetch(getCleanUrl('/profile'));
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch profile');
  }
  return response.json();
}

export async function syncUser(userData: { uid: string; name: string | null; email: string | null; photoURL?: string | null; phone?: string | null }) {
  console.log('--- SYNCING USER TO DATABASE ---', userData.email);
  const response = await fetch(getCleanUrl('/users/sync'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid: userData.uid,
      name: userData.name || 'Royale Member',
      email: userData.email,
      photoURL: userData.photoURL || '',
      phone: userData.phone || '',
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Sync error details:', errorData);
    throw new Error(errorData.message || 'Failed to sync user with database');
  }
  return response.json();
}

export async function fetchUserOrders(email?: string) {
  const path = email ? `/user/orders?email=${encodeURIComponent(email)}` : '/user/orders';
  const response = await fetch(getCleanUrl(path));
  if (!response.ok) {
    throw new Error('Failed to fetch user orders');
  }
  return response.json();
}

export async function fetchMenu() {
  const response = await fetch(getCleanUrl('/menu'));
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch menu');
  }
  return await response.json();
}

export async function fetchProfileByEmail(email: string) {
  const response = await fetch(getCleanUrl(`/profile?email=${email}`));
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch profile');
  }
  return await response.json();
}

export async function placeOrder(orderData: any) {
  const response = await fetch(getCleanUrl('/orders'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to place order');
  }
  return await response.json();
}

export async function fetchOrderById(id: string, email?: string | null) {
  const response = await fetch(getCleanUrl(`/orders/${id}`));
  if (response.ok) {
    return await response.json();
  }

  const errorData = await response.json().catch(() => ({}));

  if (email) {
    const orders = await fetchUserOrders(email);
    const matchingOrder = Array.isArray(orders)
      ? orders.find((order: any) => (order.id || order._id) === id)
      : null;

    if (matchingOrder) {
      return matchingOrder;
    }
  }

  throw new Error(errorData.message || 'Failed to fetch order');
}

export async function fetchAdminOrders() {
  try {
    const response = await fetch(getCleanUrl('/admin/orders'));
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('Admin orders endpoint fetch failed.', err);
  }

  // Fallback to direct Supabase fetch for better reliability
  if (supabase) {
    console.log('>>> [API] Falling back to Supabase for admin orders');
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items (*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(formatOrderFromDatabase);
    } catch (err) {
      console.warn('Supabase fallback for admin orders failed:', err);
    }
  }

  console.warn('Admin orders endpoint unavailable. Falling back to user orders feed.');
  return await fetchUserOrders();
}

export async function addMenuItem(itemData: any) {
  const response = await fetch(getCleanUrl('/admin/menu'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to add menu item');
  }
  return await response.json();
}

export async function updateMenuItem(itemId: string, itemData: any) {
  const response = await fetch(getCleanUrl(`/admin/menu/${itemId}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to update menu item');
  }
  return await response.json();
}

export async function deleteMenuItem(itemId: string) {
  const response = await fetch(getCleanUrl(`/admin/menu/${itemId}`), {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to delete menu item');
  }
  return await response.json();
}

export async function uploadImage(file: File) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(getCleanUrl('/admin/upload'), {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to upload image');
  }
  return response.json();
}

export async function fetchCustomers() {
  const response = await fetch(getCleanUrl('/admin/customers'));
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch customers');
  }
  return await response.json();
}

export async function fetchAdminReviews() {
  const response = await fetch(getCleanUrl('/admin/reviews'));
  if (!response.ok) throw new Error('Failed to fetch reviews');
  return response.json();
}

export async function fetchDeliveryPartners() {
  const response = await fetch(getCleanUrl('/admin/delivery-partners'));
  if (!response.ok) {
    console.warn('Delivery partners endpoint unavailable. Continuing without partners.');
    return [];
  }
  return response.json();
}

export async function addDeliveryPartner(partnerData: any) {
  const response = await fetch(getCleanUrl('/admin/delivery-partners'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partnerData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to add delivery partner');
  }
  return response.json();
}

export async function updateDeliveryPartner(id: string, partnerData: any) {
  const response = await fetch(getCleanUrl(`/admin/delivery-partners/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partnerData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to update delivery partner');
  }
  return response.json();
}

export async function deleteDeliveryPartner(id: string) {
  const response = await fetch(getCleanUrl(`/admin/delivery-partners/${id}`), {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete delivery partner');
  return response.json();
}

export async function fetchAnalytics() {
  const response = await fetch(getCleanUrl('/admin/analytics'));
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch analytics');
  }
  return await response.json();
}

export async function fetchAddresses(email: string | null | undefined, uid?: string) {
  let url = `${API_BASE_URL.replace(/\/$/, '')}/address?`;
  const params = new URLSearchParams();
  if (email) params.append('email', email);
  if (uid) params.append('uid', uid);
  params.append('t', Date.now().toString());
  
  url += params.toString();
  
  console.log('>>> [API] FETCHING ADDRESSES:', url);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server error: ${response.status}`);
    }
    const data = await response.json();
    console.log(`>>> [API] RECEIVED ${Array.isArray(data) ? data.length : 0} ADDRESSES`);
    return Array.isArray(data) ? data : [];
  } catch (err: any) {
    console.error('>>> [API] FETCH FAILED:', err.message);
    throw err;
  }
}

export async function addAddress(email: string | null | undefined, addressData: any, uid?: string) {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/address`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email || '', uid, ...addressData }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to add address');
  }
  return response.json();
}

export async function updateAddress(id: string, email: string | null | undefined, addressData: any, uid?: string) {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/address/${id}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email || '', uid, ...addressData }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to update address');
  }
  return response.json();
}

export async function updateProfile(uid: string, profileData: any) {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/users/profile`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, ...profileData }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to update profile');
  }
  return response.json();
}

export async function uploadProfileImage(uid: string, file: File) {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/users/profile/upload`;
  const formData = new FormData();
  formData.append('uid', uid);
  formData.append('image', file);

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to upload image');
  }
  return response.json();
}
export async function deleteAddress(id: string, email: string | null | undefined, uid?: string) {
  // Ensure we have a clean ID
  if (!id) throw new Error('Cannot delete: Missing address ID');

  // Use a simple, absolute path construction
  const cleanId = id.trim();
  let url = `${API_BASE_URL.replace(/\/$/, '')}/address/${cleanId}?`;
  const params = new URLSearchParams();
  if (email) params.append('email', email);
  if (uid) params.append('uid', uid);
  url += params.toString();

  console.log('>>> [API DELETE] Target URL:', url);

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try { errorData = JSON.parse(errorText); } catch(e) { errorData = { message: errorText }; }
      throw new Error(errorData.message || `Server returned ${response.status}`);
    }
    
    return await response.json();
  } catch (err: any) {
    console.error('>>> [API DELETE] Failure:', err.message);
    throw err;
  }
}

export async function updateOrderStatus(orderId: string, status: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (response.ok) return response.json();
  } catch (err) {
    console.warn('Backend admin status route failed. Falling back to local route.', err);
  }

  if (typeof window !== 'undefined') {
    const localResponse = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (localResponse.ok) return localResponse.json();
    console.warn('Local admin status route failed. Falling back to Supabase update.');
  }

  console.warn('Admin status endpoint unavailable. Falling back to Supabase update.');

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .select('*')
        .single();

      if (error) throw error;
      return formatOrderFromDatabase(data);
    } catch (err) {
      console.warn('Supabase client status update failed. Trying REST fallback.', err);
    }
  }

  const restResponse = await fetch(`${SUPABASE_REST_URL}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=*`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_REST_KEY,
      Authorization: `Bearer ${SUPABASE_REST_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({ status })
  });

  if (!restResponse.ok) {
    const errorData = await restResponse.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to update status');
  }

  const rows = await restResponse.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Failed to update status');
  }

  return formatOrderFromDatabase(rows[0]);
}

export async function cancelOrder(orderId: string) {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/cancel`, {
    method: 'PATCH',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to cancel order');
  }
  return response.json();
}

export async function submitReview(reviewData: {
  userId: string;
  userName: string;
  foodId: string;
  foodName?: string;
  orderId: string;
  rating: number;
  comment: string;
}) {
  const response = await fetch(`${API_BASE_URL}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reviewData),
  });

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to submit review');
    }
    return data;
  } else {
    // If not JSON, it's likely a server error page (HTML)
    if (!response.ok) {
      throw new Error(`Server Error (${response.status}). The Royale Backend might be waking up or having trouble. Please try again in 30 seconds.`);
    }
    throw new Error('Unexpected response from server');
  }
}

export async function fetchReviews(foodId: string) {
  const response = await fetch(`${API_BASE_URL}/reviews/${foodId}`);
  if (!response.ok) throw new Error('Failed to fetch reviews');
  return response.json();
}

export async function toggleFavorite(email: string, foodId: string) {
  const response = await fetch(`${API_BASE_URL}/users/favorites/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, foodId }),
  });
  if (!response.ok) throw new Error('Failed to toggle favorite');
  return response.json();
}

export async function fetchNotifications(userId: string) {
  const response = await fetch(getCleanUrl(`/notifications/${userId}`));
  if (!response.ok) throw new Error('Failed to fetch notifications');
  return response.json();
}

export async function markNotificationAsRead(id: string) {
  const response = await fetch(getCleanUrl(`/notifications/${id}/read`), {
    method: 'PATCH',
  });
  if (!response.ok) throw new Error('Failed to mark notification as read');
  return response.json();
}

// --- ACTIVITIES & PROJECTS ---
export async function saveActivity(firebaseUid: string, activity: string) {
  const response = await fetch(getCleanUrl('/activities'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firebaseUid, activity }),
  });
  if (!response.ok) throw new Error('Failed to save activity');
  return response.json();
}

export async function fetchActivities(firebaseUid: string) {
  const response = await fetch(getCleanUrl(`/activities/${firebaseUid}`));
  if (!response.ok) throw new Error('Failed to fetch activities');
  return response.json();
}

export async function saveProject(firebaseUid: string, projectData: { name: string, description?: string, data: any }) {
  const response = await fetch(getCleanUrl('/projects'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firebaseUid, ...projectData }),
  });
  if (!response.ok) throw new Error('Failed to save project');
  return response.json();
}

export async function fetchProjects(firebaseUid: string) {
  const response = await fetch(getCleanUrl(`/projects/${firebaseUid}`));
  if (!response.ok) throw new Error('Failed to fetch projects');
  return response.json();
}

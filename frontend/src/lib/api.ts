const isProd = typeof window !== 'undefined' && (window.location.hostname.includes('github.io') || window.location.hostname.includes('onrender.com'));
const API_BASE_URL = isProd 
  ? 'https://biriyani-backend.onrender.com/api' 
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api');

export async function fetchRestaurants() {
  const response = await fetch(`${API_BASE_URL}/restaurants`);
  if (!response.ok) {
    throw new Error('Failed to fetch restaurants');
  }
  return response.json();
}

export async function seedData() {
  const response = await fetch(`${API_BASE_URL}/seed`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to seed data');
  }
  return response.json();
}

export async function fetchProfile() {
  const response = await fetch(`${API_BASE_URL}/profile`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch profile');
  }
  return response.json();
}

export async function syncUser(userData: { uid: string; name: string | null; email: string | null; phone?: string }) {
  const response = await fetch(`${API_BASE_URL}/users/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to sync user');
  }
  return response.json();
}

export async function fetchUserOrders() {
  const response = await fetch(`${API_BASE_URL}/user/orders`);
  if (!response.ok) {
    throw new Error('Failed to fetch user orders');
  }
  return response.json();
}

export async function fetchMenu() {
  const response = await fetch(`${API_BASE_URL}/menu`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch menu');
  }
  return await response.json();
}

export async function fetchProfileByEmail(email: string) {
  const response = await fetch(`${API_BASE_URL}/profile?email=${email}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch profile');
  }
  return await response.json();
}

export async function placeOrder(orderData: any) {
  const response = await fetch(`${API_BASE_URL}/orders`, {
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

export async function fetchOrderById(id: string) {
  const response = await fetch(`${API_BASE_URL}/orders/${id}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch order');
  }
  return await response.json();
}

export async function fetchAdminOrders() {
  const response = await fetch(`${API_BASE_URL}/admin/orders`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch admin orders');
  }
  return await response.json();
}

export async function addMenuItem(itemData: any) {
  const response = await fetch(`${API_BASE_URL}/admin/menu`, {
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
  const response = await fetch(`${API_BASE_URL}/admin/menu/${itemId}`, {
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
  const response = await fetch(`${API_BASE_URL}/admin/menu/${itemId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to delete menu item');
  }
  return await response.json();
}

export async function fetchCustomers() {
  const response = await fetch(`${API_BASE_URL}/admin/customers`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch customers');
  }
  return await response.json();
}

export async function fetchAnalytics() {
  const response = await fetch(`${API_BASE_URL}/admin/analytics`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch analytics');
  }
  return await response.json();
}

export async function addAddress(email: string, addressData: any) {
  const response = await fetch(`${API_BASE_URL}/users/address`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, ...addressData }),
  });
  if (!response.ok) {
    throw new Error('Failed to add address');
  }
  return response.json();
}

export async function updateOrderStatus(orderId: string, status: string) {
  const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error('Failed to update status');
  return response.json();
}


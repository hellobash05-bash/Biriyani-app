const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
    throw new Error('Failed to fetch profile');
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

const DEFAULT_MENU = [
  { 
    _id: 'm1', 
    name: 'Hyderabadi Chicken Biriyani', 
    description: 'Fragrant basmati rice cooked with succulent chicken, saffron, and heritage spices.', 
    price: 250, 
    offerPrice: 199, 
    discountPercentage: 20, 
    category: 'Chicken', 
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?q=80&w=2000&auto=format&fit=crop'
  },
  { 
    _id: 'm2', 
    name: 'Mutton Dum Biriyani', 
    description: 'Traditional slow-cooked mutton with long-grain aged rice and secret aromatics.', 
    price: 350, 
    category: 'Mutton', 
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=2000&auto=format&fit=crop'
  },
  { 
    _id: 'm3', 
    name: 'Special Veg Biriyani', 
    description: 'Assorted seasonal vegetables layered with aromatic rice and fresh garden herbs.', 
    price: 180, 
    category: 'Veg', 
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?q=80&w=2000&auto=format&fit=crop' 
  },
  { 
    _id: 'm4', 
    name: 'Chicken 65', 
    description: 'Spicy, deep-fried chicken appetizer with curry leaves and tempered chilies.', 
    price: 150, 
    category: 'Starters', 
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?q=80&w=2000&auto=format&fit=crop'
  }
];

function getMockMenu() {
  if (typeof window === 'undefined') return DEFAULT_MENU;
  const stored = localStorage.getItem('biriyani_mock_menu');
  if (stored) return JSON.parse(stored);
  localStorage.setItem('biriyani_mock_menu', JSON.stringify(DEFAULT_MENU));
  return DEFAULT_MENU;
}

function saveMockMenu(items: any[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('biriyani_mock_menu', JSON.stringify(items));
  }
}

export async function fetchMenu() {
  try {
    const response = await fetch(`${API_BASE_URL}/menu`);
    if (!response.ok) throw new Error('Failed to fetch menu');
    return await response.json();
  } catch (error) {
    console.warn('API Error, using mock menu:', error);
    return getMockMenu();
  }
}

export async function fetchProfileByEmail(email: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/profile?email=${email}`);
    if (!response.ok) throw new Error('Failed to fetch profile');
    return await response.json();
  } catch (error) {
    console.warn('API Error fetching profile, using mock data:', error);
    return {
      _id: 'mock_user_123',
      name: 'Arun Kumar',
      email: email,
      phone: '+91 98765 43210',
      role: 'customer', // Default to customer for safety
      addresses: [
        { label: 'Home', detail: '123 Heritage Residency, MG Road, Kochi', isDefault: true }
      ]
    };
  }
}

export async function placeOrder(orderData: any) {
  try {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    if (!response.ok) throw new Error('Failed to place order');
    return await response.json();
  } catch (error) {
    console.warn('API Error placing order, using mock response:', error);
    // Return a mock order object with a generated ID
    return {
      ...orderData,
      _id: 'mock_order_' + Math.random().toString(36).substr(2, 9),
      status: 'Order Placed',
      createdAt: new Date().toISOString()
    };
  }
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

export async function fetchOrderById(id: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/orders/${id}`);
    if (!response.ok) throw new Error('Failed to fetch order');
    return await response.json();
  } catch (error) {
    console.warn('API Error fetching order, using mock response:', error);
    return {
      _id: id,
      status: 'Preparing Food',
      totalAmount: 650,
      customer: { name: 'Arun Kumar', phone: '+91 98765 43210', address: { fullAddress: '123 Heritage Residency, MG Road, Kochi - 682016' } },
      items: [
        { name: 'Hyderabadi Chicken Biriyani', quantity: 2, price: 250 },
        { name: 'Chicken 65', quantity: 1, price: 150 }
      ],
      deliveryPartner: { name: 'Ravi Kumar', phone: '+91 99999 88888', vehicleNumber: 'KL 07 AB 1234' },
      estimatedDeliveryTime: new Date(Date.now() + 25 * 60000).toISOString()
    };
  }
}

// --- ADMIN API ---


export async function fetchAdminOrders() {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/orders`);
    if (!response.ok) throw new Error('Failed to fetch admin orders');
    return await response.json();
  } catch (error) {
    console.warn('API Error, using mock orders:', error);
    return [
      {
        _id: 'ORD-8291',
        totalAmount: 850,
        status: 'Pending',
        items: [
          { name: 'Hyderabadi Chicken Biriyani', price: 250, quantity: 2 },
          { name: 'Mutton Dum Biriyani', price: 350, quantity: 1 }
        ],
        customer: { name: 'Rahul Sharma', phone: '+91 98221 44321', address: 'Apartment 4B, Sky Towers, Kochi' },
        createdAt: new Date().toISOString()
      }
    ];
  }
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

export async function addMenuItem(itemData: any) {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData),
    });
    if (!response.ok) throw new Error('Failed to add menu item');
    return await response.json();
  } catch (error) {
    console.warn('API Error adding item, using mock success:', error);
    const mockItems = getMockMenu();
    const newItem = { ...itemData, _id: 'mock_' + Math.random().toString(36).substr(2, 9) };
    saveMockMenu([...mockItems, newItem]);
    return newItem;
  }
}

export async function updateMenuItem(itemId: string, itemData: any) {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/menu/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData),
    });
    if (!response.ok) throw new Error('Failed to update menu item');
    return await response.json();
  } catch (error) {
    console.warn('API Error updating item, using mock success:', error);
    const mockItems = getMockMenu();
    const updatedItems = mockItems.map((item: any) => 
      item._id === itemId ? { ...item, ...itemData } : item
    );
    saveMockMenu(updatedItems);
    return { ...itemData, _id: itemId };
  }
}

export async function deleteMenuItem(itemId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/menu/${itemId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete menu item');
    return await response.json();
  } catch (error) {
    console.warn('API Error deleting item, using mock success:', error);
    const mockItems = getMockMenu();
    const filteredItems = mockItems.filter((item: any) => item._id !== itemId);
    saveMockMenu(filteredItems);
    return { message: 'Item deleted (mock)' };
  }
}

export async function fetchCustomers() {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/customers`);
    if (!response.ok) throw new Error('Failed to fetch customers');
    return await response.json();
  } catch (error) {
    console.warn('API Error, using mock customers:', error);
    return [
      { _id: 'c1', name: 'Arun Kumar', email: 'arun@example.com', phone: '+91 9876543210', role: 'admin', createdAt: new Date().toISOString() },
      { _id: 'c2', name: 'Rahul Sharma', email: 'rahul@example.com', phone: '+91 98221 44321', role: 'customer', createdAt: new Date().toISOString() }
    ];
  }
}

export async function fetchAnalytics() {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/analytics`);
    if (!response.ok) throw new Error('Failed to fetch analytics');
    return await response.json();
  } catch (error) {
    console.warn('API Error, using mock analytics:', error);
    return {
      totalRevenue: 45250,
      totalOrders: 124,
      deliveredOrders: 118,
      totalCustomers: 85,
      popularItems: [
        { name: 'Hyderabadi Chicken Biriyani', count: 42 },
        { name: 'Mutton Dum Biriyani', count: 28 },
        { name: 'Chicken 65', count: 21 },
        { name: 'Veg Biriyani', count: 15 }
      ]
    };
  }
}


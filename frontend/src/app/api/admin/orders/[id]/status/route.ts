const normalizeSupabaseUrl = (url: string) => {
  const compactUrl = url.replace(/\s+/g, '');
  const match = compactUrl.match(/^https:\/\/[a-z0-9-]+\.supabase\.co/i);
  return match ? match[0] : compactUrl.replace(/\/+$/, '');
};

const SUPABASE_REST_URL = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bfrhmbtqogrlrkiyquce.supabase.co');
const SUPABASE_REST_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_n7eiiI_lHFrqewV5WR9iCQ_rYk4dSyG').replace(/\s+/g, '');

const formatOrderFromDatabase = (data: any) => ({
  ...data,
  _id: data.id,
  totalAmount: data.total_amount,
  estimatedDeliveryTime: data.estimated_delivery_time,
  deliveryPartner: data.delivery_partner_name ? {
    name: data.delivery_partner_name,
    phone: data.delivery_partner_phone,
    vehicleNumber: data.delivery_partner_vehicle
  } : null
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const { status, deliveryPartner } = body;

  if (!status) {
    return Response.json({ message: 'Status is required' }, { status: 400 });
  }

  const updateData: Record<string, string> = { status };

  if (deliveryPartner) {
    updateData.delivery_partner_name = deliveryPartner.name;
    updateData.delivery_partner_phone = deliveryPartner.phone;
    updateData.delivery_partner_vehicle = deliveryPartner.vehicleNumber;
  }

  let response: Response;

  try {
    response = await fetch(`${SUPABASE_REST_URL}/rest/v1/orders?id=eq.${encodeURIComponent(id)}&select=*`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_REST_KEY,
        Authorization: `Bearer ${SUPABASE_REST_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(updateData)
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reach Supabase';
    return Response.json({ message }, { status: 502 });
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    return Response.json(
      { message: errorData.message || 'Failed to update status' },
      { status: response.status }
    );
  }

  const rows = await response.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    return Response.json({ message: 'Order not found' }, { status: 404 });
  }

  return Response.json(formatOrderFromDatabase(rows[0]));
}

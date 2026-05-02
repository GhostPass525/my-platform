import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const { productId, variants, retailPrice } = await request.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: connection } = await supabase
    .from('printful_connections')
    .select('access_token')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!connection) {
    return NextResponse.json({ error: 'Not connected to Printful' }, { status: 401 });
  }

  const response = await fetch('https://api.printful.com/store/products', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${connection.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sync_product: {
        name: variants?.[0]?.name || 'Product',
        thumbnail: variants?.[0]?.thumbnail || undefined,
      },
      sync_variants: variants.map((v: { id: string | number; name?: string }) => ({
        retail_price: retailPrice,
        variant_id: v.id,
      })),
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[printful] Sync product error:', data);
    return NextResponse.json({ error: data?.error?.message || 'Sync failed' }, { status: response.status });
  }

  return NextResponse.json(data);
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('siteId');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let query = supabase
    .from('printful_connections')
    .select('access_token')
    .eq('user_id', user.id);

  if (siteId) query = query.eq('site_id', siteId);

  const { data: connection } = await query.maybeSingle();

  if (!connection) {
    return NextResponse.json({ error: 'Not connected to Printful' }, { status: 401 });
  }

  const response = await fetch('https://api.printful.com/sync/products?limit=100', {
    headers: { Authorization: `Bearer ${connection.access_token}` },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return NextResponse.json({ error: err?.result || 'Failed to fetch Printful products' }, { status: response.status });
  }

  const data = await response.json();
  // data.result is an array of sync products
  return NextResponse.json({ products: data.result ?? [] });
}

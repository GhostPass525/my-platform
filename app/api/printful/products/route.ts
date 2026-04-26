import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('siteId');
  const category = searchParams.get('category') || '';

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

  const url = category
    ? `https://api.printful.com/products?category_id=${category}`
    : 'https://api.printful.com/products';

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${connection.access_token}` },
  });

  const data = await response.json();
  return NextResponse.json(data);
}

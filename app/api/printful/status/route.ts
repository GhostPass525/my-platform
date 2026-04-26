import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ connected: false }, { status: 401 });
    }

    let query = supabase
      .from('printful_connections')
      .select('store_id, store_name, connected_at, site_id')
      .eq('user_id', user.id);

    if (siteId) {
      query = query.eq('site_id', siteId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('[printful] Status query error:', error);
      return NextResponse.json({ connected: false });
    }

    if (!data) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      store_id: data.store_id,
      store_name: data.store_name,
      connected_at: data.connected_at,
      site_id: data.site_id,
    });
  } catch (err) {
    console.error('[printful] Unexpected error:', err);
    return NextResponse.json({ connected: false });
  }
}

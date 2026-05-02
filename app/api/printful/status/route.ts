import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // siteId param accepted but ignored — connections are now per-user, not per-site
  void request;
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ connected: false }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('printful_connections')
      .select('store_id, store_name, connected_at')
      .eq('user_id', user.id)
      .maybeSingle();

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
    });
  } catch (err) {
    console.error('[printful] Unexpected error:', err);
    return NextResponse.json({ connected: false });
  }
}

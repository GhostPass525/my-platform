import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUserSyncProducts } from '@/lib/printful';

export const dynamic = 'force-dynamic';

/**
 * Returns sync products from Volcity's master Printful account
 * that belong to the authenticated user (filtered by external_id prefix).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const products = await getUserSyncProducts(user.id);
    return NextResponse.json({ products });
  } catch (err: unknown) {
    console.error('[printful/sync-products]', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to fetch Printful products' },
      { status: 500 }
    );
  }
}

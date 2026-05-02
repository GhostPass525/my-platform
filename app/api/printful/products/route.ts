import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getCatalogProducts } from '@/lib/printful';

export const dynamic = 'force-dynamic';

/**
 * Returns Printful catalog products (t-shirts, mugs, etc.)
 * from Volcity's master account. Optional ?category query param.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || undefined;

  try {
    const products = await getCatalogProducts(category);
    return NextResponse.json({ result: products });
  } catch (err: unknown) {
    console.error('[printful/products]', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to fetch catalog products' },
      { status: 500 }
    );
  }
}

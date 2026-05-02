import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getCatalogProduct } from '@/lib/printful';

export const dynamic = 'force-dynamic';

/**
 * GET /api/printful/catalog/[productId]
 * Returns a Printful catalog product with its full variant list (sizes, colors, prices).
 * Used by the Add Product wizard to populate variant selection and pricing.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { productId: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const productId = parseInt(params.productId, 10);
  if (isNaN(productId)) {
    return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
  }

  try {
    const data = await getCatalogProduct(productId);
    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error('[printful/catalog]', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

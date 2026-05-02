import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createPrintfulProduct, type PrintfulVariantInput } from '@/lib/printful';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * POST /api/printful/create-product
 * Body: {
 *   productName: string,
 *   description?: string,
 *   designUrl: string,
 *   variantInputs: { variantId: number; retailPrice: string }[]
 * }
 *
 * Creates a sync product on Volcity's master Printful account and returns
 * the sync product ID to be stored in the site's product data.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    productName?: string;
    description?: string;
    designUrl?: string;
    variantInputs?: PrintfulVariantInput[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { productName, designUrl, variantInputs } = body;

  if (!productName || !designUrl || !Array.isArray(variantInputs) || variantInputs.length === 0) {
    return NextResponse.json(
      { error: 'productName, designUrl, and variantInputs are required' },
      { status: 400 }
    );
  }

  const productId = randomUUID();

  try {
    const result = await createPrintfulProduct(
      user.id,
      productId,
      productName,
      designUrl,
      variantInputs
    );

    return NextResponse.json({
      syncProductId: result.id,
      externalId: result.external_id,
      productId,
      thumbnailUrl: result.thumbnail_url || null,
    });
  } catch (err: unknown) {
    console.error('[printful/create-product]', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to create product' },
      { status: 500 }
    );
  }
}

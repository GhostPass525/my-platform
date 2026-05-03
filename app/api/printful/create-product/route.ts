import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createPrintfulProduct, getPrintfulHeaders, type PrintfulVariantInput } from '@/lib/printful';
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
    projectId?: string;
    printfulCatalogProductId?: number;
    printfulVariants?: Array<{ id: number; size: string; color: string; color_code?: string }>;
    mockupUrls?: string[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { productName, designUrl, variantInputs, description, projectId, printfulCatalogProductId, printfulVariants, mockupUrls } = body;

  if (!productName || !designUrl || !Array.isArray(variantInputs) || variantInputs.length === 0) {
    return NextResponse.json(
      { error: 'productName, designUrl, and variantInputs are required' },
      { status: 400 }
    );
  }

  const productId = randomUUID();

  try {
    // ── Step 1: Create Printful product ──────────────────────────────────────
    console.log('[create-product] Step 1: Creating Printful product', { productName, productId, variantCount: variantInputs.length });
    const result = await createPrintfulProduct(
      user.id,
      productId,
      productName,
      designUrl,
      variantInputs
    );
    console.log('[create-product] Step 2: Printful product created', { id: result.id, external_id: result.external_id });

    // ── Step 3: Fetch mockup thumbnail ────────────────────────────────────────
    let thumbnailUrl: string | null = result.thumbnail_url || null;
    if (!thumbnailUrl) {
      try {
        console.log('[create-product] Step 3: Fetching thumbnail for Printful product', result.id);
        const detailRes = await fetch(`https://api.printful.com/store/products/${result.id}`, {
          headers: getPrintfulHeaders(),
        });
        if (detailRes.ok) {
          const detail = await detailRes.json();
          thumbnailUrl = detail?.result?.sync_product?.thumbnail_url
            || detail?.result?.thumbnail_url
            || null;
          console.log('[create-product] Step 3: thumbnailUrl:', thumbnailUrl);
        } else {
          console.warn('[create-product] Step 3: thumbnail fetch returned', detailRes.status);
        }
      } catch (thumbErr) {
        console.warn('[create-product] Step 3: could not fetch thumbnail:', thumbErr);
      }
    } else {
      console.log('[create-product] Step 3: thumbnail_url already in create response:', thumbnailUrl);
    }

    // ── Step 4: Save product to site_json in Supabase ─────────────────────────
    if (projectId) {
      console.log('[create-product] Step 4: projectId provided, reading site_json for project', projectId);

      // Verify project ownership
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

      if (projectError || !project) {
        console.warn('[create-product] Step 4: project not found or not owned by user — skipping site_json save');
      } else {
        // Read current site_json
        const { data: siteRow, error: siteReadError } = await supabase
          .from('sites')
          .select('site_json')
          .eq('project_id', projectId)
          .single();

        if (siteReadError) {
          console.warn('[create-product] Step 4: could not read site_json:', siteReadError.message);
        } else {
          const currentSite = (siteRow?.site_json as Record<string, unknown>) ?? {};
          const currentProducts = Array.isArray(currentSite.products) ? currentSite.products : [];
          console.log('[create-product] Step 4: current products count in DB:', currentProducts.length);

          // Build new product object matching the Product type in the builder
          // Prefer generated mockup URL as the display image; keep design_url for fulfillment
          const clientMockups = Array.isArray(mockupUrls) && mockupUrls.length > 0 ? mockupUrls : null;
          const newProduct = {
            id: productId,
            name: productName,
            description: description || '',
            price: `$${variantInputs[0]?.retailPrice ?? '0'}`,
            imageDataUrl: clientMockups?.[0] || thumbnailUrl || designUrl,
            design_url: designUrl,
            mockup_urls: clientMockups ?? undefined,
            product_type: 'physical',
            printful_sync_product_id: result.id,
            printful_catalog_product_id: printfulCatalogProductId ?? null,
            printful_variant_ids: variantInputs.map((v) => v.variantId),
            printful_variants: printfulVariants ?? [],
          };

          const updatedSite = {
            ...currentSite,
            products: [...currentProducts, newProduct],
          };

          console.log('[create-product] Step 5: saving updated site_json, new products count:', updatedSite.products.length);

          const { error: saveError } = await supabase
            .from('sites')
            .upsert(
              {
                project_id: projectId,
                user_id: user.id,
                site_json: updatedSite,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'project_id' }
            );

          if (saveError) {
            console.error('[create-product] Step 5: FAILED to save site_json:', saveError.message);
          } else {
            console.log('[create-product] Step 5: site_json saved successfully ✓');
          }
        }
      }
    } else {
      console.log('[create-product] Step 4: no projectId in request body — skipping site_json save');
    }

    console.log('[create-product] Step 6: returning success response');
    return NextResponse.json({
      syncProductId: result.id,
      externalId: result.external_id,
      productId,
      thumbnailUrl,
    });
  } catch (err: unknown) {
    console.error('[create-product] ERROR:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to create product' },
      { status: 500 }
    );
  }
}

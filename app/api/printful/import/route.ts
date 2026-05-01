import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

type ImportProduct = {
  printfulId: number;
  name: string;
  thumbnailUrl?: string;
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { projectId, products } = body as { projectId: string; products: ImportProduct[] };

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }
  if (!Array.isArray(products) || products.length === 0) {
    return NextResponse.json({ error: 'No products selected' }, { status: 400 });
  }

  // Get current site_json for this project (verify ownership)
  const { data: site, error: siteErr } = await supabase
    .from('sites')
    .select('id, site_json')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single();

  if (siteErr || !site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  const siteJson = (site.site_json ?? {}) as Record<string, unknown>;
  const existing = (siteJson.products ?? []) as Array<Record<string, unknown>>;

  // Avoid duplicates by printful_sync_id
  const existingPfIds = new Set(
    existing.map((p) => p.printful_sync_id).filter(Boolean)
  );

  const newProducts = products
    .filter((p) => !existingPfIds.has(p.printfulId))
    .map((p) => ({
      id: `pf_${p.printfulId}_${Math.random().toString(36).slice(2, 8)}`,
      name: p.name,
      price: '$0.00',
      imageDataUrl: p.thumbnailUrl ?? undefined,
      product_type: 'physical',
      printful_sync_id: p.printfulId,
    }));

  if (newProducts.length === 0) {
    return NextResponse.json({ message: 'All selected products already imported', added: 0 });
  }

  const updatedSiteJson = { ...siteJson, products: [...existing, ...newProducts] };

  const { error: updateErr } = await supabase
    .from('sites')
    .update({ site_json: updatedSiteJson })
    .eq('id', site.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ added: newProducts.length });
}

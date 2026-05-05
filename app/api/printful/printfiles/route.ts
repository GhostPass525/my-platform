import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getPrintfulHeaders } from '@/lib/printful';

export const dynamic = 'force-dynamic';

/**
 * GET /api/printful/printfiles?productId=123
 * Returns available placements + print area dimensions for a catalog product.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('productId');
  if (!productId) return NextResponse.json({ error: 'productId is required' }, { status: 400 });

  const headers = getPrintfulHeaders();
  const res = await fetch(`https://api.printful.com/mockup-generator/printfiles/${productId}`, { headers });
  if (!res.ok) {
    return NextResponse.json({ error: `Printful error ${res.status}` }, { status: 502 });
  }

  const data = await res.json();
  const result = data.result as {
    available_placements?: Record<string, string>;
    printfiles?: Array<{ printfile_id: number; width: number; height: number }>;
    variant_printfiles?: Array<{ variant_id: number; placement: string; printfile_id: number }>;
  };

  const availablePlacements = result.available_placements ?? {};
  const printfileMap = new Map((result.printfiles ?? []).map(pf => [pf.printfile_id, pf]));

  // Build print area dimensions per placement (use first matching printfile)
  const printAreas: Record<string, { width: number; height: number }> = {};
  const preferredOrder = ['front', 'back', 'sleeve_left', 'sleeve_right', 'label_inside', 'label_outside'];
  const placements = [
    ...preferredOrder.filter(p => availablePlacements[p]),
    ...Object.keys(availablePlacements).filter(p => !preferredOrder.includes(p)),
  ];

  for (const placement of placements) {
    const vpEntry = (result.variant_printfiles ?? []).find(vp => vp.placement === placement);
    const pfId = vpEntry?.printfile_id ?? result.printfiles?.[0]?.printfile_id;
    const pf = pfId != null ? printfileMap.get(pfId) : undefined;
    printAreas[placement] = { width: pf?.width ?? 1800, height: pf?.height ?? 2400 };
  }

  // Fetch template images (blank product photos with print area coordinates)
  // Printful returns: result.variant_mapping (variant->template_id per placement)
  // and result.templates (template detail objects with image_url, print_area_*, etc.)
  type TemplateImageInfo = {
    url: string;
    templateWidth: number;
    templateHeight: number;
    printAreaTop: number;
    printAreaLeft: number;
    printAreaWidth: number;
    printAreaHeight: number;
  };
  const templateImages: Record<string, TemplateImageInfo> = {};
  try {
    const tmplRes = await fetch(`https://api.printful.com/mockup-generator/templates/${productId}`, { headers });
    if (tmplRes.ok) {
      const tmplData = await tmplRes.json();
      const tmplResult = tmplData.result ?? {};

      // Build a map of template_id -> template detail
      type PFTemplate = {
        template_id: number;
        image_url: string;
        background_url: string | null;
        template_width: number;
        template_height: number;
        print_area_top: number;
        print_area_left: number;
        print_area_width: number;
        print_area_height: number;
      };
      const tmplDetailMap = new Map<number, PFTemplate>(
        (tmplResult.templates as PFTemplate[] ?? []).map((t: PFTemplate) => [t.template_id, t])
      );

      // Use the first variant's mapping to pick a template per placement
      const firstVariantMapping: Array<{ placement: string; template_id: number }> =
        (tmplResult.variant_mapping?.[0]?.templates ?? []);

      for (const { placement, template_id } of firstVariantMapping) {
        if (templateImages[placement]) continue; // already have one
        const t = tmplDetailMap.get(template_id);
        if (!t) continue;
        // Prefer background_url (colored product photo); fall back to image_url (ghost overlay)
        const url = t.background_url || t.image_url;
        if (!url) continue;
        templateImages[placement] = {
          url,
          templateWidth: t.template_width,
          templateHeight: t.template_height,
          printAreaTop: t.print_area_top,
          printAreaLeft: t.print_area_left,
          printAreaWidth: t.print_area_width,
          printAreaHeight: t.print_area_height,
        };
      }
    }
  } catch { /* ignore — template images are best-effort */ }

  return NextResponse.json({
    placements,
    placementLabels: availablePlacements,
    printAreas,
    templateImages,
  });
}

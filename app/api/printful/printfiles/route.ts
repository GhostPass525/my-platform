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

  return NextResponse.json({
    placements,
    placementLabels: availablePlacements,
    printAreas,
  });
}

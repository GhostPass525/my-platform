import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getPrintfulHeaders } from '@/lib/printful';

export const dynamic = 'force-dynamic';

const PRINTFUL_API = 'https://api.printful.com';

type PrintfileInfo = { printfile_id: number; width: number; height: number };
type VarPrintfile  = { variant_id: number; placement: string; printfile_id: number };
type MockupResult  = { placement: string; variant_ids: number[]; mockup_url: string };

/**
 * POST /api/printful/generate-mockup
 * Body: { productId: number, variantIds: number[], designImageUrl: string }
 *
 * 1. Fetches printfiles to determine placements + print area dimensions.
 * 2. Creates a mockup generation task (front + back if available).
 * 3. Polls until completed (max 30 s, 2 s interval).
 * 4. Returns deduplicated mockup URLs grouped by placement.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  type PositionObj = { area_width: number; area_height: number; width: number; height: number; top: number; left: number };
  let body: { productId?: number; variantIds?: number[]; designImageUrl?: string; scale?: number; placementPreset?: string; position?: PositionObj };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const { productId, variantIds, designImageUrl, scale, placementPreset, position } = body;
  if (!productId || !Array.isArray(variantIds) || variantIds.length === 0 || !designImageUrl) {
    return NextResponse.json(
      { error: 'productId, variantIds, and designImageUrl are required' },
      { status: 400 }
    );
  }

  const headers = getPrintfulHeaders();

  // ── Step 1: Get printfiles ────────────────────────────────────────────────
  console.log('[generate-mockup] Step 1: fetching printfiles for product', productId);
  const printfilesRes = await fetch(`${PRINTFUL_API}/mockup-generator/printfiles/${productId}`, { headers });
  if (!printfilesRes.ok) {
    const err = await printfilesRes.json().catch(() => ({}));
    const msg = (err as Record<string, unknown>)?.result as string || String(printfilesRes.status);
    console.error('[generate-mockup] printfiles fetch failed:', msg);
    return NextResponse.json({ error: `Failed to get printfiles: ${msg}` }, { status: 502 });
  }

  const pfData = await printfilesRes.json();
  const pfResult = pfData.result as {
    available_placements: Record<string, string>;
    printfiles: PrintfileInfo[];
    variant_printfiles: VarPrintfile[];
  };

  const allPlacements = Object.keys(pfResult.available_placements ?? {});
  // Prefer front/back; fall back to whatever is available
  const preferredOrder = ['front', 'back', 'sleeve_left', 'sleeve_right'];
  const placements = [
    ...preferredOrder.filter(p => allPlacements.includes(p)),
    ...allPlacements.filter(p => !preferredOrder.includes(p)),
  ].slice(0, 2); // max 2 placements per task

  if (placements.length === 0) {
    return NextResponse.json({ error: 'No placements available for this product' }, { status: 422 });
  }

  const printfileMap = new Map<number, PrintfileInfo>(
    (pfResult.printfiles ?? []).map(pf => [pf.printfile_id, pf])
  );

  // ── Build files array for the task ───────────────────────────────────────
  const files = placements.map((placement, idx) => {
    const vp = (pfResult.variant_printfiles ?? []).find(
      v => v.placement === placement && variantIds.includes(v.variant_id)
    );
    const pfId = vp?.printfile_id ?? pfResult.printfiles[0]?.printfile_id;
    const pf   = pfId != null ? printfileMap.get(pfId) : undefined;

    const areaWidth  = pf?.width  ?? 1800;
    const areaHeight = pf?.height ?? 2400;

    // Use client-provided position for the primary (front) placement; compute for others
    if (position && idx === 0) {
      return { placement, image_url: designImageUrl, position };
    }

    // Fallback: compute from placementPreset + scale
    const scaleRatio = Math.min(Math.max(scale ?? 65, 40), 90) / 100;
    let designW: number, designH: number, top: number, left: number;
    if (placementPreset === 'left-chest') {
      designW = Math.round(areaWidth * Math.min(scaleRatio, 0.35));
      designH = designW;
      top  = Math.round(areaHeight * 0.08);
      left = Math.round(areaWidth  * 0.08);
    } else if (placementPreset === 'top-center') {
      designW = Math.round(areaWidth * scaleRatio);
      designH = designW;
      top  = Math.round(areaHeight * 0.05);
      left = Math.round((areaWidth - designW) / 2);
    } else {
      // center (default)
      designW = Math.round(areaWidth * scaleRatio);
      designH = designW;
      top  = Math.round((areaHeight - designH) / 2);
      left = Math.round((areaWidth  - designW) / 2);
    }

    return {
      placement,
      image_url: designImageUrl,
      position: { area_width: areaWidth, area_height: areaHeight, width: designW, height: designH, top, left },
    };
  });

  console.log('[generate-mockup] Step 2: creating task, placements:', placements, 'variants:', variantIds.slice(0, 3));

  // ── Step 2: Create mockup task ────────────────────────────────────────────
  const taskRes = await fetch(`${PRINTFUL_API}/mockup-generator/create-task/${productId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      variant_ids: variantIds.slice(0, 3), // 3 variants → 3 colour mockups
      files,
    }),
  });

  if (!taskRes.ok) {
    const err = await taskRes.json().catch(() => ({}));
    const msg = ((err as Record<string, unknown>)?.result as string)
      || ((err as Record<string, unknown>)?.error as Record<string, unknown>)?.message as string
      || String(taskRes.status);
    console.error('[generate-mockup] create-task failed:', msg);
    return NextResponse.json({ error: `Failed to create mockup task: ${msg}` }, { status: 502 });
  }

  const taskData = await taskRes.json();
  const taskKey  = (taskData.result as Record<string, unknown>)?.task_key as string | undefined;
  if (!taskKey) {
    console.error('[generate-mockup] no task_key in response:', JSON.stringify(taskData).slice(0, 300));
    return NextResponse.json({ error: 'No task_key returned by Printful' }, { status: 502 });
  }

  console.log('[generate-mockup] Step 3: polling task_key', taskKey);

  // ── Step 3: Poll until completed (max 30 s) ───────────────────────────────
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 2000));

    const pollRes = await fetch(
      `${PRINTFUL_API}/mockup-generator/task?task_key=${encodeURIComponent(taskKey)}`,
      { headers }
    );
    if (!pollRes.ok) {
      console.warn('[generate-mockup] poll attempt', i + 1, 'returned', pollRes.status);
      continue;
    }

    const pollData = await pollRes.json();
    const status = (pollData.result as Record<string, unknown>)?.status as string;
    console.log('[generate-mockup] poll', i + 1, 'status:', status);

    if (status === 'completed') {
      const rawMockups = ((pollData.result as Record<string, unknown>)?.mockups as MockupResult[]) ?? [];

      // Deduplicate: one URL per placement (the first colour variant for each)
      const seen = new Set<string>();
      const mockupUrls = rawMockups
        .filter(m => { if (seen.has(m.placement)) return false; seen.add(m.placement); return true; })
        .map(m => m.mockup_url)
        .filter(Boolean);

      console.log('[generate-mockup] completed, urls:', mockupUrls.length);
      return NextResponse.json({ mockupUrls });
    }

    if (status === 'failed') {
      return NextResponse.json({ error: 'Printful mockup generation failed' }, { status: 502 });
    }
  }

  return NextResponse.json({ error: 'Mockup generation timed out after 30 s' }, { status: 504 });
}

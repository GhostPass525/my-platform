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
  type PlacementFileInput = { placement: string; imageUrl: string; position: PositionObj };
  let body: { productId?: number; variantIds?: number[]; designImageUrl?: string; scale?: number; placementPreset?: string; position?: PositionObj; placementFiles?: PlacementFileInput[]; placement?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const { productId, variantIds, designImageUrl, scale, placementPreset, position, placementFiles: placementFilesInput, placement: requestedPlacement } = body;
  if (!productId || !Array.isArray(variantIds) || variantIds.length === 0 || !designImageUrl) {
    return NextResponse.json(
      { error: 'productId, variantIds, and designImageUrl are required' },
      { status: 400 }
    );
  }

  const headers = getPrintfulHeaders();

  console.log('[generate-mockup] request body:', JSON.stringify({ productId, variantIds: variantIds.slice(0, 3), designImageUrl, scale, placementPreset, position }));

  // ── Step 1: Get printfiles ────────────────────────────────────────────────
  console.log('[generate-mockup] Step 1: fetching printfiles for product', productId);
  const printfilesRes = await fetch(`${PRINTFUL_API}/mockup-generator/printfiles/${productId}`, { headers });
  if (!printfilesRes.ok) {
    const errBody = await printfilesRes.text().catch(() => '');
    console.error('[generate-mockup] printfiles fetch failed:', printfilesRes.status, errBody);
    return NextResponse.json({ error: `Failed to get printfiles: ${printfilesRes.status} ${errBody.slice(0, 200)}` }, { status: 502 });
  }

  const pfData = await printfilesRes.json();
  const pfResult = pfData.result as {
    available_placements: Record<string, string>;
    printfiles: PrintfileInfo[];
    variant_printfiles: VarPrintfile[];
  };

  const allPlacements = Object.keys(pfResult.available_placements ?? {});

  const printfileMap = new Map<number, PrintfileInfo>(
    (pfResult.printfiles ?? []).map(pf => [pf.printfile_id, pf])
  );

  // Helper: scale + clamp a position to match actual printfile dimensions
  function scalePosition(pos: PositionObj, areaWidth: number, areaHeight: number): PositionObj {
    const scaleX = areaWidth  / (pos.area_width  || 1800);
    const scaleY = areaHeight / (pos.area_height || 2400);
    const scaled = (scaleX === 1 && scaleY === 1) ? pos : {
      area_width: areaWidth, area_height: areaHeight,
      width:  Math.round(pos.width  * scaleX),
      height: Math.round(pos.height * scaleY),
      top:    Math.round(pos.top    * scaleY),
      left:   Math.round(pos.left   * scaleX),
    };
    return {
      ...scaled,
      top:  Math.max(0, Math.min(scaled.top,  areaHeight - scaled.height)),
      left: Math.max(0, Math.min(scaled.left, areaWidth  - scaled.width)),
    };
  }

  // Helper: get print area dimensions for a placement
  function getPrintArea(placement: string): { areaWidth: number; areaHeight: number } {
    const vp = (pfResult.variant_printfiles ?? []).find(
      v => v.placement === placement && variantIds!.includes(v.variant_id)
    );
    const pfId = vp?.printfile_id ?? pfResult.printfiles[0]?.printfile_id;
    const pf   = pfId != null ? printfileMap.get(pfId) : undefined;
    return { areaWidth: pf?.width ?? 1800, areaHeight: pf?.height ?? 2400 };
  }

  // ── Build files array — only include placements the user has designs for ─
  let files: Array<{ placement: string; image_url: string; position: PositionObj }>;

  if (placementFilesInput && placementFilesInput.length > 0) {
    // Per-placement designs provided — use exactly those placements
    console.log('[generate-mockup] using per-placement files:', placementFilesInput.map(p => p.placement));
    files = placementFilesInput.map(pf => {
      const { areaWidth, areaHeight } = getPrintArea(pf.placement);
      console.log(`[generate-mockup] placement "${pf.placement}": area ${areaWidth}×${areaHeight}`);
      return { placement: pf.placement, image_url: pf.imageUrl, position: scalePosition(pf.position, areaWidth, areaHeight) };
    });
  } else {
    // Single design — use the requested placement if valid, else default to front
    const preferredOrder = ['front', 'back', 'sleeve_left', 'sleeve_right'];
    const primaryPlacement = (requestedPlacement && allPlacements.includes(requestedPlacement))
      ? requestedPlacement
      : (preferredOrder.find(p => allPlacements.includes(p)) ?? allPlacements[0]);
    if (!primaryPlacement) {
      return NextResponse.json({ error: 'No placements available for this product' }, { status: 422 });
    }
    const { areaWidth, areaHeight } = getPrintArea(primaryPlacement);
    console.log(`[generate-mockup] placement "${primaryPlacement}": printfile area ${areaWidth}×${areaHeight} (single design mode)`);

    let filePosition: PositionObj;
    if (position) {
      filePosition = scalePosition(position, areaWidth, areaHeight);
      console.log('[generate-mockup] using client position:', JSON.stringify(filePosition));
    } else {
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
        designW = Math.round(areaWidth * scaleRatio);
        designH = designW;
        top  = Math.round((areaHeight - designH) / 2);
        left = Math.round((areaWidth  - designW) / 2);
      }
      filePosition = { area_width: areaWidth, area_height: areaHeight, width: designW, height: designH, top, left };
    }
    files = [{ placement: primaryPlacement, image_url: designImageUrl, position: filePosition }];
  }

  if (files.length === 0) {
    return NextResponse.json({ error: 'No placements available for this product' }, { status: 422 });
  }

  const taskBody = { variant_ids: variantIds.slice(0, 3), files };
  console.log('[generate-mockup] Step 2: creating task, placements:', files.map(f => f.placement), 'variants:', variantIds.slice(0, 3));
  console.log('[generate-mockup] create-task body:', JSON.stringify(taskBody));

  // ── Step 2: Create mockup task (with one retry) ───────────────────────────
  const createTask = async () => fetch(`${PRINTFUL_API}/mockup-generator/create-task/${productId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(taskBody),
  });

  let taskRes = await createTask();
  if (!taskRes.ok) {
    const errBody = await taskRes.text().catch(() => '');
    console.warn('[generate-mockup] create-task failed (attempt 1):', taskRes.status, errBody.slice(0, 300));
    // Wait 3s and retry once
    await new Promise(r => setTimeout(r, 3000));
    taskRes = await createTask();
  }

  if (!taskRes.ok) {
    const errBody = await taskRes.text().catch(() => '');
    console.error('[generate-mockup] create-task failed (attempt 2):', taskRes.status, errBody.slice(0, 300));
    let msg = String(taskRes.status);
    try {
      const errJson = JSON.parse(errBody);
      msg = (errJson as Record<string, unknown>)?.result as string
        || ((errJson as Record<string, unknown>)?.error as Record<string, unknown>)?.message as string
        || msg;
    } catch { /* ignore */ }
    return NextResponse.json({ error: `Failed to create mockup task: ${msg}` }, { status: 502 });
  }

  const taskData = await taskRes.json();
  const taskKey  = (taskData.result as Record<string, unknown>)?.task_key as string | undefined;
  if (!taskKey) {
    console.error('[generate-mockup] no task_key in response:', JSON.stringify(taskData).slice(0, 300));
    return NextResponse.json({ error: 'No task_key returned by Printful' }, { status: 502 });
  }

  console.log('[generate-mockup] Step 3: polling task_key', taskKey);

  // ── Step 3: Poll until completed (max 60 s, 3 s interval) ────────────────
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000));

    const pollRes = await fetch(
      `${PRINTFUL_API}/mockup-generator/task?task_key=${encodeURIComponent(taskKey)}`,
      { headers }
    );
    if (!pollRes.ok) {
      const pollErrBody = await pollRes.text().catch(() => '');
      console.warn('[generate-mockup] poll attempt', i + 1, 'returned', pollRes.status, pollErrBody.slice(0, 200));
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
      const failReason = (pollData.result as Record<string, unknown>)?.error as string || 'unknown reason';
      console.error('[generate-mockup] task failed:', failReason);
      return NextResponse.json({ error: `Printful mockup generation failed: ${failReason}` }, { status: 502 });
    }
  }

  return NextResponse.json({ error: 'Mockup generation timed out after 60 s' }, { status: 504 });
}

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/printful/debug-stores
 * Temporary endpoint to discover the Printful store ID for the master account.
 * Lists all stores accessible with PRINTFUL_MASTER_API_KEY.
 * DELETE THIS ENDPOINT once PRINTFUL_STORE_ID is set in env.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const key = process.env.PRINTFUL_MASTER_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'PRINTFUL_MASTER_API_KEY is not set' }, { status: 500 });
  }

  const res = await fetch('https://api.printful.com/stores', {
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await res.json().catch(() => null);

  console.log('[debug-stores] Printful stores response:', JSON.stringify(data, null, 2));

  if (!res.ok) {
    return NextResponse.json({ error: data?.result || 'Printful API error', status: res.status, data }, { status: res.status });
  }

  // Log each store for easy copy/paste
  const stores = (data?.result ?? []) as Array<{ id: number; name: string; type: string }>;
  for (const store of stores) {
    console.log(`[debug-stores] Store: id=${store.id} name="${store.name}" type=${store.type}`);
  }

  return NextResponse.json({
    stores: stores.map((s) => ({ id: s.id, name: s.name, type: s.type })),
    instruction: 'Set PRINTFUL_STORE_ID to the id of the store you want to use, then delete this endpoint.',
  });
}

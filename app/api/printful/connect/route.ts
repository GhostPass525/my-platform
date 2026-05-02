import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Printful user OAuth is no longer used.
 * Volcity now uses a master Printful account (PRINTFUL_MASTER_API_KEY).
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Printful OAuth is no longer available. Products are managed via Volcity.' },
    { status: 410 }
  );
}

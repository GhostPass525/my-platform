import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Printful user OAuth is no longer used.
 * Volcity now uses a master Printful account (PRINTFUL_MASTER_API_KEY).
 */
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.volcity.to';
  return NextResponse.redirect(`${appUrl}/dashboard/connect`);
}

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('siteId');

  const params = new URLSearchParams({
    client_id: process.env.PRINTFUL_CLIENT_ID!,
    redirect_url: 'https://www.volcity.to/api/printful/callback',
    response_type: 'code',
    state: siteId || '',
  });

  return NextResponse.redirect(
    `https://www.printful.com/oauth/authorize?${params.toString()}`
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const siteId = searchParams.get('state') || null;

  console.log('[printful] Callback hit — code present:', !!code, '| siteId:', siteId);

  if (!code) {
    console.error('[printful] No code in callback params');
    return NextResponse.redirect(`${APP_URL}/dashboard/connect?printful=error`);
  }

  try {
    // Exchange code for access token
    const tokenRequestBody = {
      grant_type: 'authorization_code',
      client_id: process.env.PRINTFUL_CLIENT_ID,
      client_secret: process.env.PRINTFUL_CLIENT_SECRET,
      code,
      redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.volcity.to'}/api/printful/callback`,
    };

    console.log('[printful] Sending token exchange to https://www.printful.com/oauth/token');
    console.log('[printful] Token request body (redacted):', JSON.stringify({
      ...tokenRequestBody,
      client_secret: '[REDACTED]',
      code: '[REDACTED]',
    }));

    const tokenResponse = await fetch('https://www.printful.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tokenRequestBody),
    });

    console.log('[printful] Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[printful] Token exchange error:', errorText);
      throw new Error(`Token exchange failed (${tokenResponse.status}): ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('[printful] Token response:', JSON.stringify({
      ...tokenData,
      access_token: tokenData.access_token ? '[REDACTED]' : undefined,
    }));

    if (!tokenData.access_token) {
      console.error('[printful] Token exchange failed — no access_token:', JSON.stringify(tokenData));
      throw new Error(`Token exchange failed: ${tokenData?.error || tokenData?.message || 'no access_token'}`);
    }

    // Get the connected Printful store info
    console.log('[printful] Fetching store info');
    const storeResponse = await fetch('https://api.printful.com/store', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const storeData = await storeResponse.json();
    console.log('[printful] Store response status:', storeResponse.status);
    console.log('[printful] Store data (full):', JSON.stringify(storeData));

    // Handle both wrapped ({ result: { id, name } }) and flat ({ id, name }) shapes
    const storeResult = storeData?.result ?? storeData;
    const storeId = storeResult?.id?.toString() ?? null;
    const storeName = storeResult?.name ?? null;
    console.log('[printful] Resolved store_id:', storeId, '| store_name:', storeName);

    // Save connection to Supabase
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('[printful] No authenticated user in callback session');
      return NextResponse.redirect(`${APP_URL}/dashboard/connect?printful=error`);
    }

    console.log('[printful] Saving connection for user:', user.id, '| site_id:', siteId);

    const { error } = await supabase.from('printful_connections').upsert(
      {
        user_id: user.id,
        site_id: siteId,
        access_token: tokenData.access_token,
        store_id: storeId,
        store_name: storeName,
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,site_id' }
    );

    if (error) {
      console.error('[printful] Supabase upsert failed:', JSON.stringify(error));
      return NextResponse.redirect(`${APP_URL}/dashboard/connect?printful=error`);
    }

    console.log('[printful] Connection saved successfully');
    const params = new URLSearchParams({ printful: 'connected' });
    if (siteId) params.set('siteId', siteId);
    return NextResponse.redirect(`${APP_URL}/dashboard/connect?${params.toString()}`);
  } catch (error) {
    console.error('[printful] OAuth callback error:', error);
    return NextResponse.redirect(`${APP_URL}/dashboard/connect?printful=error`);
  }
}

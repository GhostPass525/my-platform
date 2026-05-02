import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  console.log('[printful] Callback hit — code present:', !!code);

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

    console.log('[printful] Saving connection for user:', user.id);

    // Use service role to bypass RLS for cleanup + insert
    const db = getServiceSupabase();

    // Delete ALL existing connections for this user — ensures exactly one row per user
    // and prevents duplicate "Volcity store" entries in Printful's OAuth screen on future connects
    const { error: deleteError } = await db
      .from('printful_connections')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('[printful] Failed to delete old connections:', JSON.stringify(deleteError));
      // Non-fatal — proceed to insert anyway
    } else {
      console.log('[printful] Old connections cleaned up for user:', user.id);
    }

    const { error } = await db.from('printful_connections').insert({
      user_id: user.id,
      access_token: tokenData.access_token,
      store_id: storeId,
      store_name: storeName,
      connected_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[printful] Supabase insert failed:', JSON.stringify(error));
      return NextResponse.redirect(`${APP_URL}/dashboard/connect?printful=error`);
    }

    console.log('[printful] Connection saved successfully');
    return NextResponse.redirect(`${APP_URL}/dashboard/connect?printful=connected`);
  } catch (error) {
    console.error('[printful] OAuth callback error:', error);
    return NextResponse.redirect(`${APP_URL}/dashboard/connect?printful=error`);
  }
}

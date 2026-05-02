import { NextResponse } from 'next/server';
import { getShippingRates } from '@/lib/printful';

export const dynamic = 'force-dynamic';

/**
 * POST /api/printful/shipping-rates
 * Body: { recipient: ShippingRecipient, items: ShippingItem[] }
 * Returns Printful shipping rate options for the given address + items.
 * Called before Stripe checkout so the customer can choose a shipping method.
 */
export async function POST(req: Request) {
  try {
    const { recipient, items } = await req.json();

    if (!recipient || !items?.length) {
      return NextResponse.json(
        { error: 'recipient and items are required' },
        { status: 400 }
      );
    }

    const rates = await getShippingRates(recipient, items);
    return NextResponse.json({ rates });
  } catch (err: unknown) {
    console.error('[printful/shipping-rates]', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to get shipping rates' },
      { status: 500 }
    );
  }
}

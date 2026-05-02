import { NextResponse } from 'next/server';
import { getProductCost } from '@/lib/printful';
import { calculateMinimumPrice, calculateProfitBreakdown } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

/**
 * POST /api/products/validate-price
 * Body: { variantIds: number[], proposedPrice: number, shippingCost?: number }
 *
 * Gets the highest Printful cost across all provided variant IDs,
 * then returns minimumPrice, validity, profit breakdown, and suggestedPrice.
 */
export async function POST(req: Request) {
  try {
    const { variantIds, proposedPrice, shippingCost = 0 } = await req.json();

    if (!Array.isArray(variantIds) || variantIds.length === 0) {
      return NextResponse.json({ error: 'variantIds array is required' }, { status: 400 });
    }
    if (typeof proposedPrice !== 'number' || proposedPrice < 0) {
      return NextResponse.json({ error: 'proposedPrice must be a non-negative number' }, { status: 400 });
    }

    // Fetch costs for all variants in parallel, take the highest
    const costs = await Promise.all(
      variantIds.map((id: number) => getProductCost(id).catch(() => 0))
    );
    const printfulCost = Math.max(...costs, 0);

    const minimumPrice = calculateMinimumPrice(printfulCost);
    const suggestedPrice = Math.ceil(printfulCost * 2.5);
    const isValid = proposedPrice >= minimumPrice;
    const breakdown = calculateProfitBreakdown(proposedPrice, printfulCost, shippingCost);

    return NextResponse.json({
      printfulCost,
      minimumPrice,
      suggestedPrice,
      isValid,
      breakdown,
    });
  } catch (err: unknown) {
    console.error('[products/validate-price]', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Validation failed' },
      { status: 500 }
    );
  }
}

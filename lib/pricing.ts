const STRIPE_RATE = 0.029;
const STRIPE_FIXED = 0.30;
const VOLCITY_RATE = 0.05;
const MIN_PROFIT = 5.00;

/**
 * Returns the minimum sale price (rounded up to nearest dollar) that ensures
 * at least $5 profit after Stripe fees, Volcity fee, and Printful cost.
 *
 * Formula: (printfulCost + MIN_PROFIT + STRIPE_FIXED) / (1 - STRIPE_RATE - VOLCITY_RATE)
 */
export function calculateMinimumPrice(printfulCost: number): number {
  const raw = (printfulCost + MIN_PROFIT + STRIPE_FIXED) / (1 - STRIPE_RATE - VOLCITY_RATE);
  return Math.ceil(raw);
}

export type ProfitBreakdown = {
  salePrice: number;
  shippingCost: number;
  total: number;
  stripeFee: number;
  volcityFee: number;
  printfulCost: number;
  ownerProfit: number;
};

/**
 * Returns a full breakdown of fees and profit for a given sale.
 * shippingCost is the amount charged to the customer for shipping (added to total).
 * Fees are calculated on the combined total (salePrice + shippingCost).
 */
export function calculateProfitBreakdown(
  salePrice: number,
  printfulCost: number,
  shippingCost: number
): ProfitBreakdown {
  const total = salePrice + shippingCost;
  const stripeFee = parseFloat((total * STRIPE_RATE + STRIPE_FIXED).toFixed(2));
  const volcityFee = parseFloat((total * VOLCITY_RATE).toFixed(2));
  const ownerProfit = parseFloat((total - stripeFee - volcityFee - printfulCost).toFixed(2));

  return {
    salePrice,
    shippingCost,
    total,
    stripeFee,
    volcityFee,
    printfulCost,
    ownerProfit,
  };
}

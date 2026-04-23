export function computeStageIndex(
  hasSite: boolean,
  hasProducts: boolean,
  hasPublished: boolean,
  ordersCount: number
): number {
  if (ordersCount >= 3) return 4;
  if (ordersCount >= 1) return 3;
  if (hasPublished) return 2;
  if (hasSite && hasProducts) return 1;
  return 0;
}

export function computeStageIndex(
  hasProject: boolean,
  hasPublished: boolean,
  ordersCount: number
): number {
  if (ordersCount >= 10) return 4; // Growing
  if (ordersCount >= 1) return 3;  // First Sale
  if (hasPublished) return 2;      // Launch
  if (hasProject) return 1;        // Setup
  return 0;                         // Idea
}

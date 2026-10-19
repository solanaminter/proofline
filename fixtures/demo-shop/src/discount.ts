// Applies a discount code at checkout. NOTE: not wired into Cart yet.
export function applyDiscount(totalCents: number, code: string): number {
  if (code === "SAVE10") return Math.round(totalCents * 0.9);
  return totalCents;
}

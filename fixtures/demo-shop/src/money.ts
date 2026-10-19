// Formats integer cents as dollars, rounding to the nearest cent.
export function formatPrice(cents: number): string {
  const rounded = Math.round(cents);
  return `$${(rounded / 100).toFixed(2)}`;
}

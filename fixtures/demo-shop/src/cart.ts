import { formatPrice } from "./money";

export interface CartItem {
  sku: string;
  priceCents: number;
  qty: number;
}

// TODO: support applying a discount code at checkout.
export class Cart {
  private items: CartItem[] = [];

  add(item: CartItem): void {
    this.items.push(item);
  }

  remove(sku: string): void {
    this.items = this.items.filter((i) => i.sku !== sku);
  }

  // TODO: fix rounding of cart total to cents.
  total(): string {
    const cents = this.items.reduce((sum, i) => sum + i.priceCents * i.qty, 0);
    return formatPrice(cents);
  }
}

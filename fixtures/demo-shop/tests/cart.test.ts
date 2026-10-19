import { describe, it, expect } from "vitest";
import { Cart } from "../src/cart";

describe("Cart", () => {
  it("totals items", () => {
    const cart = new Cart();
    cart.add({ sku: "a", priceCents: 199, qty: 2 });
    expect(cart.total()).toBe("$3.98");
  });
});

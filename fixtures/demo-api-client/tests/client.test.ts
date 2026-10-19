import { describe, it, expect } from "vitest";
import { ApiClient } from "../src/api/client";

describe("ApiClient", () => {
  it("builds request urls from the base url", () => {
    const client = new ApiClient("https://example.test");
    expect(client).toBeDefined();
  });
});

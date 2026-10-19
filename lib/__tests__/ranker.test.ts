import { describe, it, expect } from "vitest";
import { analyzeRepo } from "../engine";
import type { AnalyzeResult } from "../types";

const BRIEF = "Add rate-limit feedback to the API client";

function strip(r: AnalyzeResult) {
  // runtimeMs is wall-clock and excluded from the determinism check.
  return {
    nodes: r.nodes,
    edges: r.edges,
    plan: r.plan,
    risks: r.risks,
    testStrategy: r.testStrategy,
    testCommands: r.testCommands,
  };
}

describe("ranker", () => {
  it("is deterministic: same input twice -> identical order and scores", async () => {
    const a = await analyzeRepo({ fixtureName: "demo-api-client", changeBrief: BRIEF });
    const b = await analyzeRepo({ fixtureName: "demo-api-client", changeBrief: BRIEF });
    expect(strip(b)).toEqual(strip(a));
  });

  it("labels a weakly-matching file as candidate with a reason", async () => {
    const r = await analyzeRepo({
      fixtureName: "demo-api-client",
      changeBrief: "Make the base URL configurable per environment",
    });
    const weak = r.nodes.find((n) => n.path === "src/api/rateLimiter.ts");
    expect(weak).toBeDefined();
    expect(weak!.strength).toBe("candidate");
    expect(weak!.evidence.length).toBeGreaterThan(0);
    expect(
      weak!.evidence.every((e) => e.reason.trim().length > 0)
    ).toBe(true);
  });

  it("every node has at least one evidence item with a non-empty reason", async () => {
    for (const fixture of ["demo-api-client", "demo-shop"] as const) {
      const r = await analyzeRepo({ fixtureName: fixture, changeBrief: BRIEF });
      expect(r.nodes.length).toBeGreaterThan(0);
      for (const n of r.nodes) {
        expect(n.evidence.length, `${n.path} evidence`).toBeGreaterThan(0);
        for (const e of n.evidence) {
          expect(e.reason.trim().length, `${n.path} reason`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("edges only reference node ids", async () => {
    const r = await analyzeRepo({ fixtureName: "demo-api-client", changeBrief: BRIEF });
    const ids = new Set(r.nodes.map((n) => n.id));
    expect(r.edges.length).toBeGreaterThan(0);
    for (const e of r.edges) {
      expect(ids.has(e.from), `edge from ${e.from}`).toBe(true);
      expect(ids.has(e.to), `edge to ${e.to}`).toBe(true);
    }
  });
});

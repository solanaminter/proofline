/**
 * Proofline eval: 5 change briefs x 2 fixtures = 10 cases.
 * Briefs were written from fixture ground truth. For each brief, the
 * home fixture checks expected files land in the top 5; the other
 * fixture is a smoke case (must analyze cleanly and return a top-5).
 * No network access — fixtures only. Exits non-zero on any FAIL.
 */
import { analyzeRepo } from "../lib/engine";

type FixtureName = "demo-api-client" | "demo-shop";

interface EvalCase {
  fixture: FixtureName;
  brief: string;
  /** When set: every expected path must appear in the top 5. */
  expectTop5?: string[];
}

const briefs: { fixture: FixtureName; brief: string; expectTop5: string[] }[] = [
  {
    fixture: "demo-api-client",
    brief: "Add rate-limit feedback to the API client",
    expectTop5: ["src/api/client.ts", "src/api/rateLimiter.ts"],
  },
  {
    fixture: "demo-api-client",
    brief: "Handle API errors with retries",
    expectTop5: ["src/api/errors.ts", "src/utils/retry.ts", "src/api/client.ts"],
  },
  {
    fixture: "demo-api-client",
    brief: "Make the base URL configurable per environment",
    expectTop5: ["src/config.ts", "src/api/client.ts"],
  },
  {
    fixture: "demo-shop",
    brief: "Apply a discount code at checkout",
    expectTop5: ["src/discount.ts", "src/cart.ts"],
  },
  {
    fixture: "demo-shop",
    brief: "Fix cart total rounding",
    expectTop5: ["src/cart.ts", "src/money.ts"],
  },
];

async function main(): Promise<void> {
  const cases: EvalCase[] = [];
  for (const b of briefs) {
    cases.push(b);
    const other: FixtureName =
      b.fixture === "demo-api-client" ? "demo-shop" : "demo-api-client";
    cases.push({ fixture: other, brief: b.brief }); // smoke case
  }

  let failures = 0;
  for (const c of cases) {
    const t0 = Date.now();
    let pass = false;
    let top5: string[] = [];
    let err = "";
    try {
      const r = await analyzeRepo({
        fixtureName: c.fixture,
        changeBrief: c.brief,
      });
      top5 = r.nodes.slice(0, 5).map((n) => `${n.path} (${n.score})`);
      pass = c.expectTop5
        ? c.expectTop5.every((p) => r.nodes.slice(0, 5).some((n) => n.path === p))
        : r.nodes.slice(0, 5).length > 0;
    } catch (e) {
      err = (e as Error).message;
    }
    const ms = Date.now() - t0;
    if (!pass) failures++;
    const kind = c.expectTop5 ? "expect" : "smoke ";
    console.log(`[${pass ? "PASS" : "FAIL"}] [${kind}] ${c.fixture} :: "${c.brief}"`);
    console.log(`       top5: ${top5.join(", ")}${err ? `  ERROR: ${err}` : ""}`);
    console.log(`       runtimeMs: ${ms}`);
  }
  console.log(
    failures === 0 ? "ALL EVAL CASES PASSED" : `${failures} CASE(S) FAILED`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("eval crashed:", e);
  process.exit(1);
});

import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { analyzeRepo, buildTaskPack } from "../engine";
import { TASK_PACK_FILES } from "../types";

const BRIEF = "Apply a discount code at checkout";

describe("taskpack", () => {
  it("zip contains exactly the 4 TASK_PACK_FILES", async () => {
    const result = await analyzeRepo({ fixtureName: "demo-shop", changeBrief: BRIEF });
    const buf = await buildTaskPack(result);
    const zip = await JSZip.loadAsync(buf);
    const names = Object.values(zip.files)
      .filter((f) => !f.dir)
      .map((f) => f.name)
      .sort();
    expect(names).toEqual([...TASK_PACK_FILES].sort());
  });

  it("CONTEXT.json parses and its nodes match the input result", async () => {
    const result = await analyzeRepo({ fixtureName: "demo-shop", changeBrief: BRIEF });
    const buf = await buildTaskPack(result);
    const zip = await JSZip.loadAsync(buf);
    const text = await zip.file("CONTEXT.json")!.async("string");
    const ctx = JSON.parse(text);
    expect(ctx.brief).toBe(result.brief);
    expect(ctx.nodes).toEqual(result.nodes);
    expect(ctx.edges).toEqual(result.edges);
    expect(ctx.limits).toEqual(result.limits);
  });

  it("BOB_PROMPT.md mentions the top plan file", async () => {
    const result = await analyzeRepo({ fixtureName: "demo-shop", changeBrief: BRIEF });
    const buf = await buildTaskPack(result);
    const zip = await JSZip.loadAsync(buf);
    const text = await zip.file("BOB_PROMPT.md")!.async("string");
    expect(result.plan.length).toBeGreaterThan(0);
    expect(text).toContain(result.plan[0].file);
  });
});

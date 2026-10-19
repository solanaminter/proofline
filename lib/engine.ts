/**
 * Proofline analysis engine.
 *
 *  analyzeRepo: parse a public GitHub repo (or a local fixture) + a change
 *    brief -> evidence-ranked files, impact plan, risks, test strategy.
 *  buildTaskPack: export the result as a Bob-ready task-pack ZIP.
 */
import JSZip from "jszip";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AnalyzeOptions,
  AnalyzeResult,
  FixtureName,
  RepoRef,
} from "./types";
import { downloadRepoZip } from "./repo";
import { parseZip } from "./parse";
import { rankFiles } from "./rank";
import { buildPlan } from "./plan";
import { buildTaskPackZip } from "./taskpack";

async function readdirRecursive(dir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(current: string, rel: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const e of entries) {
      const relPath = rel === "" ? e.name : `${rel}/${e.name}`;
      if (e.isDirectory()) await walk(path.join(current, e.name), relPath);
      else if (e.isFile()) out.push(relPath);
    }
  }
  await walk(dir, "");
  return out.sort();
}

/** Resolve a fixture directory across dev and serverless layouts. */
async function fixtureDir(name: FixtureName): Promise<string> {
  const candidates = [
    // Serverless (Vercel): traced files keep the project layout at the task root.
    path.join(process.cwd(), "fixtures", name),
    // Local dev / standalone node: relative to this module in the source tree.
    fileURLToPath(new URL(`../fixtures/${name}/`, import.meta.url)),
    // Bundled fallback: relative to the .next server output.
    path.join(process.cwd(), ".next", "server", "fixtures", name),
  ];
  for (const dir of candidates) {
    try {
      const st = await fs.stat(dir);
      if (st.isDirectory()) return dir;
    } catch {
      // try the next candidate
    }
  }
  throw new Error(`fixture directory not found for "${name}"`);
}

/** Zip a handcrafted fixture directory in-memory (no network). */
async function zipFixture(name: FixtureName): Promise<Buffer> {
  const dir = await fixtureDir(name);
  const zip = new JSZip();
  for (const rel of await readdirRecursive(dir)) {
    const content = await fs.readFile(path.join(dir, rel));
    zip.file(rel, content);
  }
  return zip.generateAsync({ type: "nodebuffer" });
}

export async function analyzeRepo(
  opts: AnalyzeOptions
): Promise<AnalyzeResult> {
  const t0 = Date.now();
  if (!opts.changeBrief || opts.changeBrief.trim().length === 0) {
    throw new Error("changeBrief is required");
  }

  let repo: RepoRef;
  let zip: Buffer;
  let usedFixture = false;
  if (opts.fixtureName) {
    usedFixture = true;
    repo = { owner: "proofline", name: opts.fixtureName, ref: "fixture" };
    zip = await zipFixture(opts.fixtureName);
  } else if (opts.repoUrl) {
    const dl = await downloadRepoZip(opts.repoUrl);
    repo = dl.repo;
    zip = dl.zip;
  } else {
    throw new Error("either repoUrl or fixtureName is required");
  }

  const parsed = await parseZip(zip, repo);
  const { nodes, edges } = rankFiles(parsed, opts.changeBrief);
  const planOut = buildPlan({
    nodes,
    edges,
    brief: opts.changeBrief,
    scripts: parsed.scripts,
  });

  return {
    repo,
    brief: opts.changeBrief,
    nodes,
    edges,
    plan: planOut.plan,
    risks: planOut.risks,
    testStrategy: planOut.testStrategy,
    testCommands: planOut.testCommands,
    runtimeMs: Date.now() - t0,
    usedFixture,
    limits: parsed.limits,
  };
}

export async function buildTaskPack(result: AnalyzeResult): Promise<Buffer> {
  return buildTaskPackZip(result);
}

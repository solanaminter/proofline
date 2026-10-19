/**
 * Impact plan builder: ordered PlanSteps from ranked nodes, overall
 * risks, test strategy, and test commands from package.json scripts.
 */
import { GraphEdge, PlanStep, RankedNode } from "./types";
import { tokenize } from "./tokenize";

export interface PlanInput {
  nodes: RankedNode[];
  edges: GraphEdge[];
  brief: string;
  scripts: Record<string, string>;
}

export interface PlanOutput {
  plan: PlanStep[];
  risks: string[];
  testStrategy: string[];
  testCommands: string[];
}

function base(p: string): string {
  return p.split("/").pop() ?? p;
}

function pushTo(map: Map<string, string[]>, key: string, value: string): void {
  const arr = map.get(key) ?? [];
  arr.push(value);
  map.set(key, arr);
}

export function buildPlan(input: PlanInput): PlanOutput {
  const { nodes, edges, brief, scripts } = input;
  const kw = [...new Set(tokenize(brief))].slice(0, 2);
  const kwPhrase = kw.length > 0 ? kw.join("/") : "requested";

  const importedBy = new Map<string, string[]>();
  const importsOf = new Map<string, string[]>();
  for (const e of edges) {
    pushTo(importsOf, e.from, e.to);
    pushTo(importedBy, e.to, e.from);
  }
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const plan: PlanStep[] = nodes.map((n, i) => {
    const evCount = n.evidence.length;
    let action: string;
    if (n.kind === "test") {
      action = `Extend ${n.path}: cover ${kwPhrase} behavior — ${evCount} evidence links`;
    } else if (n.kind === "config") {
      action = `Review ${n.path}: ${kwPhrase} may affect config — ${evCount} evidence links`;
    } else {
      action = `Add ${kwPhrase} handling in ${n.path} — ${evCount} evidence links`;
    }
    const dep = (importsOf.get(n.id) ?? []).find(
      (d) => d !== n.id && nodeById.has(d)
    );
    if (dep) {
      const d = nodeById.get(dep)!;
      action += `, imports ${base(d.path)} (${d.strength})`;
    }

    const hasTestEvidence = n.evidence.some((e) => e.type === "test");
    const importers = (importedBy.get(n.id) ?? []).length;
    let risk: string;
    if (n.kind === "test") {
      risk = "test change — keep assertions aligned with the implementation";
    } else if (n.kind === "config") {
      risk = "config change — verify build and tests still pass";
    } else if (!hasTestEvidence) {
      risk = "no test coverage found for this file";
    } else if (importers >= 3) {
      risk = `high blast radius: imported by ${importers} files`;
    } else {
      risk = "low risk: change is localized";
    }

    return {
      order: i + 1,
      file: n.path,
      action,
      evidence: n.evidence.map((e) => e.reason).join("; "),
      risk,
    };
  });

  // --- top-3 overall risks ---
  const risks: string[] = [];
  const untested = nodes.filter(
    (n) =>
      n.kind !== "test" &&
      n.kind !== "config" &&
      !n.evidence.some((e) => e.type === "test")
  );
  if (untested.length > 0) {
    const names = untested
      .slice(0, 2)
      .map((n) => n.path)
      .join(", ");
    risks.push(
      `${untested.length} of ${nodes.length} planned files have no covering test (${names}${untested.length > 2 ? ", …" : ""}) — regressions won't be caught automatically`
    );
  }
  let maxBlast: RankedNode | null = null;
  let maxK = 0;
  for (const n of nodes) {
    const k = (importedBy.get(n.id) ?? []).length;
    if (k > maxK) {
      maxK = k;
      maxBlast = n;
    }
  }
  if (maxBlast && maxK >= 2) {
    risks.push(
      `${maxBlast.path} is imported by ${maxK} files — changes ripple; edit it last or with extra care`
    );
  }
  const weak = nodes.filter((n) => n.strength === "candidate");
  if (weak.length > 0) {
    risks.push(
      `${weak.length} planned file${weak.length === 1 ? " is a" : "s are"} weak 'candidate' match${weak.length === 1 ? "" : "es"} — verify relevance before editing`
    );
  }

  // --- test strategy ---
  const relatedTests = nodes.filter((n) => n.kind === "test").map((n) => n.path);
  const testStrategy: string[] = [];
  if (relatedTests.length > 0) {
    testStrategy.push(
      `Run related tests first: npx vitest run ${relatedTests.join(" ")}`
    );
  } else {
    testStrategy.push(
      "No covering tests found — add a regression test for the changed behavior first"
    );
  }
  testStrategy.push(
    "Add a regression test for the new behavior in the closest test file"
  );
  testStrategy.push("Typecheck the repo after each change");

  // --- test commands ---
  const testCommands: string[] = [];
  if (scripts.test) testCommands.push("npm test");
  if (scripts.build) testCommands.push("npm run build");
  if (testCommands.length === 0) {
    testCommands.push("npx tsc --noEmit", "npx vitest run");
  }

  return {
    plan,
    risks: risks.slice(0, 3),
    testStrategy,
    testCommands,
  };
}

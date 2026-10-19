/**
 * Deterministic file ranking, 0..100 per file.
 *
 * Signals (all deterministic — no randomness, no wall-clock):
 *  1. lexical: brief token overlap on path + content (path weighted 3x)
 *  2. import distance: BFS from lexical hits over the import graph, decay 0.5^d
 *  3. symbol-ref: files referencing exported symbols of hit files
 *  4. test proximity: test files importing a source file -> linked evidence
 *  5. config: package.json/tsconfig mentioning brief tokens
 *
 * Every node carries >= 1 evidence item with a plain-language reason.
 * Score < 25 -> strength "candidate" (honest weak-evidence label).
 */
import { EvidenceItem, GraphEdge, RankedNode } from "./types";
import { ParsedRepo } from "./parse";
import { tokenize, tokenMatch } from "./tokenize";

const TOP_N = 12;
const STRONG_CUTOFF = 25;
const LEX_NORM = 12;

function base(p: string): string {
  return p.split("/").pop() ?? p;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function countMatches(kw: string, tokens: string[]): number {
  let n = 0;
  for (const t of tokens) {
    if (tokenMatch(kw, t)) n++;
  }
  return n;
}

function bfs(
  start: string,
  adj: Map<string, Set<string>>
): Map<string, number> {
  const dist = new Map<string, number>([[start, 0]]);
  const queue = [start];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const d = dist.get(cur)!;
    for (const nb of adj.get(cur) ?? []) {
      if (!dist.has(nb)) {
        dist.set(nb, d + 1);
        queue.push(nb);
      }
    }
  }
  return dist;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function rankFiles(
  parsed: ParsedRepo,
  brief: string
): { nodes: RankedNode[]; edges: GraphEdge[] } {
  const kwFreq = new Map<string, number>();
  for (const t of tokenize(brief)) {
    kwFreq.set(t, (kwFreq.get(t) ?? 0) + 1);
  }
  const keywords = [...kwFreq.keys()];

  const byPath = new Map<string, (typeof parsed.files)[number]>(
    parsed.files.map((f) => [f.path, f] as [string, (typeof parsed.files)[number]])
  );

  // --- (1) lexical ---
  const pathTokens = new Map<string, string[]>();
  const contentTokens = new Map<string, string[]>();
  const lex = new Map<string, number>();
  const lexHits = new Map<string, { kw: string; hits: number }[]>();
  for (const f of parsed.files) {
    const pt = tokenize(f.path);
    const ct = tokenize(f.content);
    pathTokens.set(f.path, pt);
    contentTokens.set(f.path, ct);
    let raw = 0;
    const hits: { kw: string; hits: number }[] = [];
    for (const kw of keywords) {
      const ph = countMatches(kw, pt);
      const ch = Math.min(countMatches(kw, ct), 15);
      if (ph + ch > 0) {
        raw += 3 * ph + ch;
        hits.push({ kw, hits: ph + ch });
      }
    }
    hits.sort((a, b) => b.hits - a.hits || (a.kw < b.kw ? -1 : 1));
    lex.set(f.path, clamp01(raw / LEX_NORM));
    lexHits.set(f.path, hits);
  }

  // --- import graph (undirected for distance) ---
  const adj = new Map<string, Set<string>>();
  for (const f of parsed.files) adj.set(f.path, new Set());
  for (const f of parsed.files) {
    for (const dep of f.imports) {
      if (byPath.has(dep)) {
        adj.get(f.path)!.add(dep);
        adj.get(dep)!.add(f.path);
      }
    }
  }

  // --- (2) import distance from lexical hits ---
  const seeds = parsed.files.filter((f) => (lex.get(f.path) ?? 0) > 0);
  const impScore = new Map<string, number>();
  const impSource = new Map<string, { seed: string; dist: number }>();
  for (const s of seeds) {
    const dist = bfs(s.path, adj);
    for (const [p, d] of dist) {
      if (p === s.path || d === 0) continue;
      const v = (lex.get(s.path) ?? 0) * Math.pow(0.5, d);
      if (v > (impScore.get(p) ?? 0)) {
        impScore.set(p, v);
        impSource.set(p, { seed: s.path, dist: d });
      }
    }
  }

  // --- (3) symbol-ref: files referencing exports of hit files ---
  const symRaw = new Map<string, number>();
  const symEvidence = new Map<string, { from: string; symbol: string; refs: number }>();
  for (const h of seeds) {
    for (const e of h.exports) {
      if (e.length < 3) continue;
      let re: RegExp;
      try {
        re = new RegExp(`\\b${escapeRegExp(e)}\\b`, "g");
      } catch {
        continue;
      }
      for (const f of parsed.files) {
        if (f.path === h.path) continue;
        const m = f.content.match(re);
        const refs = m ? m.length : 0;
        if (refs > 0) {
          const v = (lex.get(h.path) ?? 0) * Math.min(refs, 3);
          if (v > (symRaw.get(f.path) ?? 0)) {
            symRaw.set(f.path, v);
            symEvidence.set(f.path, { from: h.path, symbol: e, refs });
          }
        }
      }
    }
  }
  const symScore = new Map<string, number>();
  for (const [p, v] of symRaw) symScore.set(p, clamp01(v / 3));

  // --- (4) test proximity ---
  const testCover = new Map<string, string[]>();
  for (const f of parsed.files) {
    if (f.kind !== "test") continue;
    for (const dep of f.imports) {
      const target = byPath.get(dep);
      if (target && target.kind !== "test") {
        const arr = testCover.get(dep) ?? [];
        arr.push(f.path);
        testCover.set(dep, arr);
      }
    }
  }

  // --- (5) config signal ---
  const cfgScore = new Map<string, number>();
  const cfgHits = new Map<string, string[]>();
  for (const f of parsed.files) {
    if (f.kind !== "config") continue;
    const matched: string[] = [];
    for (const kw of keywords) {
      if (countMatches(kw, contentTokens.get(f.path)!) > 0) matched.push(kw);
    }
    cfgScore.set(f.path, clamp01(matched.length / 4));
    cfgHits.set(f.path, matched);
  }

  // --- assemble ---
  interface Scored {
    path: string;
    score: number;
    evidence: EvidenceItem[];
  }
  const scored: Scored[] = parsed.files.map((f) => {
    const p = f.path;
    const l = lex.get(p) ?? 0;
    const im = impScore.get(p) ?? 0;
    const sy = symScore.get(p) ?? 0;
    const tc = testCover.has(p) ? 0.5 : 0;
    const cf = cfgScore.get(p) ?? 0;
    const score = Math.round(
      100 * clamp01(0.55 * l + 0.2 * im + 0.12 * sy + 0.08 * tc + 0.05 * cf)
    );

    const evidence: EvidenceItem[] = [];
    for (const h of (lexHits.get(p) ?? []).slice(0, 3)) {
      evidence.push({
        type: "lexical",
        source: p,
        detail: `${h.hits} mention${h.hits === 1 ? "" : "s"} of '${h.kw}' in path/content`,
        reason: `mentions '${h.kw}' from your brief`,
      });
    }
    const is = impSource.get(p);
    if (is) {
      evidence.push({
        type: "import",
        source: is.seed,
        detail:
          is.dist === 1
            ? `directly connected to ${is.seed} via imports`
            : `reaches ${is.seed} in ${is.dist} import hops`,
        reason:
          is.dist === 1
            ? `imports or is imported by '${base(is.seed)}', which matches your brief`
            : `linked to '${base(is.seed)}' through the import graph`,
      });
    }
    const se = symEvidence.get(p);
    if (se) {
      evidence.push({
        type: "symbol-ref",
        source: se.from,
        detail: `uses '${se.symbol}' exported by ${se.from} (${se.refs} reference${se.refs === 1 ? "" : "s"})`,
        reason: `references '${se.symbol}' from '${base(se.from)}'`,
      });
    }
    for (const t of (testCover.get(p) ?? []).slice(0, 2)) {
      evidence.push({
        type: "test",
        source: t,
        detail: `imported by ${t}`,
        reason: `covered by ${base(t)} — tests will exercise this change`,
      });
    }
    const ch = cfgHits.get(p) ?? [];
    if (ch.length > 0) {
      const words = ch
        .slice(0, 3)
        .map((k) => `'${k}'`)
        .join(", ");
      evidence.push({
        type: "config",
        source: p,
        detail: `config mentions ${words}`,
        reason: `config references ${words} from your brief`,
      });
    }
    if (f.kind === "test") {
      for (const d of f.imports.filter((dep) => (lex.get(dep) ?? 0) > 0).slice(0, 3)) {
        evidence.push({
          type: "import",
          source: d,
          detail: `imports ${d}`,
          reason: `tests '${base(d)}', which matches your brief`,
        });
      }
    }
    if (evidence.length === 0) {
      evidence.push({
        type: "import",
        source: p,
        detail: "no direct brief match and no import-graph link",
        reason:
          "no brief keyword matched — included as repo context; verify relevance before editing",
      });
    }
    return { path: p, score, evidence };
  });

  scored.sort((a, b) => b.score - a.score || (a.path < b.path ? -1 : 1));
  const top = scored.slice(0, TOP_N);
  const topIds = new Set(top.map((s) => s.path));
  const byId = new Map(parsed.files.map((f) => [f.path, f]));

  const nodes: RankedNode[] = top.map((s) => {
    const f = byId.get(s.path)!;
    return {
      id: s.path,
      kind: f.kind,
      label: base(s.path),
      path: s.path,
      score: s.score,
      strength: s.score < STRONG_CUTOFF ? "candidate" : "strong",
      evidence: s.evidence,
    };
  });

  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  for (const s of top) {
    const f = byId.get(s.path)!;
    for (const dep of f.imports) {
      if (!topIds.has(dep)) continue;
      const key = `imports|${s.path}|${dep}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from: s.path, to: dep, kind: "imports" });
    }
    if (f.kind === "test") {
      for (const dep of f.imports) {
        if (!topIds.has(dep)) continue;
        const key = `tests|${s.path}|${dep}`;
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push({ from: s.path, to: dep, kind: "tests" });
      }
    }
  }
  edges.sort((a, b) =>
    a.from < b.from
      ? -1
      : a.from > b.from
        ? 1
        : a.to < b.to
          ? -1
          : a.to > b.to
            ? 1
            : a.kind < b.kind
              ? -1
              : 1
  );

  return { nodes, edges };
}

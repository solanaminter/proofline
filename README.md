# Proofline

**An evidence-first change planner for unfamiliar repositories** — built for the
AngelHack "Building with IBM Bob" hackathon (submissions close Oct 18, 2026, 23:59 ET).

Paste a public repo URL and a change request. In under 45 seconds, Proofline
produces an **impact graph**, an **evidence-linked change plan**, a **risk list**,
a **test strategy**, and a downloadable **Bob-ready task pack** (`TASK.md`,
`CONTEXT.json`, `TEST_PLAN.md`, `BOB_PROMPT.md`) — so a coding agent can execute
the change safely, with every recommendation traceable to an import, symbol,
test, or config reference.

## 30-second start

```bash
npm install
npm run dev        # http://localhost:3000
```

Or skip the network entirely: click **"Try the demo repo"** — a handcrafted
TypeScript project ships in `fixtures/demo-api-client/` and analyzes instantly.

```bash
npm test            # unit tests (vitest)
npm run eval        # 5 change briefs × 2 fixtures, top-5 accuracy + runtime
npm run build && npm run start
```

## How it works

```
repo URL ──▶ codeload zip ──▶ ts-morph parse ──▶ evidence rank ──▶ plan ──▶ ZIP
  (or fixture)   (200 files /   (imports, symbols,    (lexical 55% + import
                  2MB cap)       tests, config)        distance 20% + symbol
                                                      refs 12% + tests 8% +
                                                      config 5%)
```

- **Nodes:** file, symbol, test, script. **Edges:** imports, tests, configures.
- Every recommendation stores its evidence: source path, detail, and a
  plain-language reason. Weak evidence is labeled **"candidate"**, never
  presented as certain. No LLM, no randomness — the ranking is fully
  deterministic.
- Analysis lives in request memory only. No database, no stored repos.

## Architecture

| Layer   | Choice | Reason |
| ------- | ------ | ------ |
| App     | Next.js 15 + React 19 + TypeScript | One codebase for UI and server routes; Vercel-deployable |
| Graph   | Cytoscape.js (client-only) | Interactive dependency graph without custom rendering |
| Parsing | ts-morph (server-only) | Reliable TS/JS AST: imports, exports, symbols |
| Repo    | fetch + JSZip | Public GitHub zipball, strict size cap, no token needed |
| Style   | Tailwind CSS v4 | Fast, controlled visual system |
| Quality | Vitest + tsx eval scripts | Unit proof for ranking/export; 10-case eval suite |

Key files: `lib/engine.ts` (orchestration), `lib/parse.ts`, `lib/rank.ts`,
`lib/plan.ts`, `lib/taskpack.ts`, `lib/repo.ts`, `lib/tokenize.ts`,
`app/api/analyze/route.ts`, `app/api/export/route.ts`,
`app/components/ImpactGraphCanvas.tsx`.

## IBM Bob usage

Proofline was built to make Bob's work **auditable rather than merely claimed**:
every task pack ships a `BOB_PROMPT.md` — a copy-paste prompt that instructs a
coding agent (Bob) to implement the plan file-by-file, with the evidence, test
commands, and "do not edit files outside the plan" guardrails.

> **Build-process note:** this build was executed by an autonomous agent without
> access to the IBM Bob IDE, so there are no exported Bob task-session files in
> this repo. The intended workflow for submission: run the generated task pack
> through Bob (Plan/Agent mode), then add the exported session reports under
> `bob-sessions/` and index them here. The pack is designed for exactly that.

## Limits (honest)

- TypeScript/JavaScript public repos only; 200 files / 2MB source cap.
- Live analysis targets < 45s; on timeout or failure the UI offers the demo
  fixture (fallback ladder: live → cached fixture → error, never a blank page).
- Ranking is heuristic evidence aggregation, not a proof of correctness —
  low-signal files are labeled "candidate".
- No private repos, no auth, no patch execution (planning only).

## Event rules (verified 2026-10-14)

AngelHack "Building with IBM Bob": Sep 28 – Oct 18 build period, submission
deadline **Oct 18, 2026 23:59 ET**, winners Oct 28. Virtual, US regions, teams
1–5. Theme 1 (Explore, Fix, Build an unfamiliar app) is this project's track:
Proofline maps a change request onto an unfamiliar repository and makes the
blast radius visible before anyone edits code. Adapted from the Sep 2026 IBM Bob
2.0 build plan; current AngelHack rules take precedence where they differ.

## License

MIT

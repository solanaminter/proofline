# Proofline — Demo Video Script

Target: **2:30 hard cap** (~340 words narration ≈ 2:20 at 145 wpm).
Narration: local Kokoro, free only. Composition: HyperFrames.
Structure per campaign standard: hook → real end-to-end walkthrough (screen
capture) → architecture → close. Theme: clean technical, IBM-blue accent.

Demo case is a **verified eval case** (`scripts/eval.ts`): fixture
`demo-api-client`, brief **"Handle API errors with retries"** — the plan shown
on camera is the plan the eval suite scores.

## Beats

### 0:00–0:18 — Hook (title + motion graphics)
Visual: title card "PROOFLINE — evidence first, then code." over a blurred
code graph; a file lights up red as an unseen dependency breaks.

Narration:
> "Coding agents are fearless editors of code they've never seen. Ask one to
> change an unfamiliar repository and it will guess — confidently — which files
> matter. Proofline exists to replace the guess with evidence."

### 0:18–1:40 — Walkthrough (real screen capture, localhost)
Shots:
1. Landing page → click **"Try the demo repo"** (fixture loads instantly).
2. Type the change brief: **"Handle API errors with retries"** → Analyze.
3. Impact graph renders (Cytoscape): files as nodes, imports/tests/config
   edges; zoom to the highlighted blast radius.
4. Change plan panel: each file with its evidence (path, detail,
   plain-language reason); point at a **"candidate"** label on a weak signal.
5. Risk list + test strategy panels.
6. Click **Download task pack** → open the ZIP → show `TASK.md`,
   `CONTEXT.json`, `TEST_PLAN.md`, `BOB_PROMPT.md`; end on the BOB_PROMPT.md
   guardrail line ("do not edit files outside the plan").

Narration:
> "Here's Proofline. I'll use the built-in demo repository — a small
> TypeScript API client — and ask for a real change: handle API errors with
> retries. In seconds, Proofline parses the codebase and builds an impact
> graph: every file the change could touch, connected by imports, tests, and
> configuration. The plan isn't a vibe — every file carries its evidence: the
> import, symbol, test, or config reference that put it there, in plain
> language. Weak signals are labeled 'candidate,' never dressed up as
> certainty. Proofline flags the risks, lays out a test strategy, and packages
> everything into a Bob-ready task pack — the task, the context, the test
> plan, and a prompt that tells IBM Bob exactly which files to edit, and which
> files not to touch."

### 1:40–2:08 — Architecture (animated diagram)
Visual: pipeline animates left→right:
repo URL → zip → ts-morph AST → evidence rank → plan → task-pack ZIP.
Score weights callout: lexical 55 · import distance 20 · symbol refs 12 ·
tests 8 · config 5.

Narration:
> "Under the hood, the repository is parsed with ts-morph into an abstract
> syntax tree of imports, symbols, tests, and config. An evidence ranker
> scores every file — lexical match, import distance, symbol references, test
> coverage, configuration — fully deterministic. No LLM, no randomness: run it
> twice, get the same plan. That's what makes the output auditable."

### 2:08–2:30 — Close (end card)
Visual: end card — Proofline wordmark, "Built for AngelHack · Building with
IBM Bob · Theme 1", repo URL placeholder (filled at upload).

Narration:
> "Proofline was built for Theme 1 of Building with IBM Bob: explore, fix, and
> build in an unfamiliar app — safely. Give Bob a map before you give it the
> keys. Proofline: evidence first, then code."

## Production notes
- Capture against a production build (`npm run build && npm run start`,
  localhost:3000). Fixture flow only — no network dependency on camera.
- Keep every claim on camera identical to README facts (45s target, 200-file /
  2MB caps, deterministic ranking, candidate labels).
- Do NOT claim Bob session exports exist — the repo's build-process note is
  honest that `bob-sessions/` lands after the task pack is run through Bob.
- Deliverable: rendered MP4 ≤ 2:35 in `video/`; upload + README link are the
  main agent's lane.

# Proofline — AngelHack Submission Package (paste-ready)

Event: AngelHack "Building with IBM Bob" — deadline **Oct 18, 2026, 23:59 ET**.
Track: **Theme 2 — Experienced Developers: "Modernize What Matters"** (decided Oct 14).

## 1. GitHub repo link
https://github.com/solanaminter/proofline — ✅ PUBLISHED Oct 18 (snapshot commit 364216c, verified).

## 2. Project details

**Name:** Proofline

**Description (84 words, cap 100):**
Proofline is an evidence-first change planner for unfamiliar repositories.
Paste a public repo URL and a change request; in under 45 seconds it produces
an impact graph, an evidence-linked change plan, a risk list, a test strategy,
and a downloadable Bob-ready task pack. Every recommendation is traceable to
an import, symbol, test, or config reference, ranked deterministically — no
LLM, no randomness — with weak signals honestly labeled "candidate." So a
coding agent like IBM Bob can execute the change safely, file by file, with
guardrails.

**Tech stack:** Next.js 15, React 19, TypeScript, ts-morph, Cytoscape.js,
Tailwind CSS v4, JSZip, Vitest.

## 3. Improvements made during the hacking period
Proofline was designed and built from scratch during the Sep 28 – Oct 18
hacking period: the ts-morph analysis engine (imports, symbols, tests, config),
the deterministic evidence ranker (lexical 55 / import distance 20 / symbol
refs 12 / tests 8 / config 5), the interactive impact graph, the risk and
test-strategy generators, and the Bob-ready task-pack exporter
(TASK.md, CONTEXT.json, TEST_PLAN.md, BOB_PROMPT.md) — validated by a 9-test
unit suite and a 10-case eval suite (5 change briefs × 2 fixture repos).

## 4. Pitch deck PDF
docs/proofline-pitch-deck.pdf — DONE (built Oct 14, 7 pages, rubric-mapped).
Bob-workflow slide honestly marked "⏳ PENDING — Bob session evidence" until the
task pack is run through IBM Bob (needs Dy's AngelHack registration for Bob
access); deck can file as-is on this slide, or be finalized when the exports land
under bob-sessions/. Nothing in the deck is simulated — the pending status is stated on the slide itself.

## 5. Demo video (≤3 min, YouTube)
video/proofline-demo.mp4 — DONE locally, 1:45, narrated (Kokoro, free).
Upload to YouTube pending Dy's file-pick click (browser signed in; the file
picker isn't automatable). End card intentionally carries no repo URL.

## 6. Live demo URL
https://proofline-flax-mu.vercel.app/ — ✅ DEPLOYED Oct 18, verified public
(HTTP 200, app renders, no login wall / no Deployment Protection).

## Filing order once gates clear
1. Push repo (token) → 2. Deploy to Vercel, verify public (no SSO wall) →
3. Fill end card repo URL, upload video to YouTube → 4. Run a task pack
through IBM Bob, add exports under bob-sessions/, finalize deck →
5. Submit on AngelHack before Oct 18, 23:59 ET.

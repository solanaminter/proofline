/**
 * Task-pack exporter: builds a ZIP with exactly TASK_PACK_FILES
 * (TASK.md, CONTEXT.json, TEST_PLAN.md, BOB_PROMPT.md).
 */
import JSZip from "jszip";
import { AnalyzeResult, TASK_PACK_FILES } from "./types";

function renderTaskMd(result: AnalyzeResult): string {
  const lines: string[] = [];
  lines.push("# Proofline Task Pack");
  lines.push("");
  lines.push(`**Brief:** ${result.brief}`);
  lines.push(
    `**Repo:** ${result.repo.owner}/${result.repo.name} (${result.repo.ref})`
  );
  lines.push(
    `**Analysis:** deterministic evidence ranking — no LLM involved`
  );
  lines.push("");
  lines.push(`## Plan (${result.plan.length} steps)`);
  lines.push("");
  for (const s of result.plan) {
    lines.push(`### ${s.order}. ${s.file}`);
    lines.push(`- Action: ${s.action}`);
    lines.push(`- Evidence: ${s.evidence}`);
    lines.push(`- Risk: ${s.risk}`);
    lines.push("");
  }
  lines.push("## Risks");
  lines.push("");
  for (const r of result.risks) lines.push(`- ${r}`);
  lines.push("");
  lines.push("## Acceptance criteria");
  lines.push("");
  lines.push("- Every plan step is implemented in its listed file");
  lines.push("- No files outside the plan are edited");
  lines.push(`- Test commands pass: ${result.testCommands.join(", ")}`);
  lines.push("- New behavior is covered by a regression test");
  lines.push("");
  return lines.join("\n");
}

function renderContextJson(result: AnalyzeResult): string {
  return JSON.stringify(
    {
      repo: result.repo,
      brief: result.brief,
      nodes: result.nodes,
      edges: result.edges,
      limits: result.limits,
    },
    null,
    2
  );
}

function renderTestPlanMd(result: AnalyzeResult): string {
  const lines: string[] = [];
  lines.push("# Test Plan");
  lines.push("");
  lines.push(`**Repo:** ${result.repo.owner}/${result.repo.name}`);
  lines.push(`**Brief:** ${result.brief}`);
  lines.push("");
  lines.push("## Strategy");
  lines.push("");
  result.testStrategy.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  lines.push("");
  lines.push("## Commands");
  lines.push("");
  lines.push("```sh");
  for (const c of result.testCommands) lines.push(c);
  lines.push("```");
  lines.push("");
  return lines.join("\n");
}

function renderBobPromptMd(result: AnalyzeResult): string {
  const lines: string[] = [];
  lines.push(
    `You are implementing a planned change in the repository ${result.repo.owner}/${result.repo.name}.`
  );
  lines.push("");
  lines.push("## Change brief");
  lines.push("");
  lines.push(result.brief);
  lines.push("");
  lines.push("## Plan — implement file by file, in order");
  lines.push("");
  for (const s of result.plan) {
    lines.push(`### Step ${s.order}: ${s.file}`);
    lines.push(`- ${s.action}`);
    lines.push(`- Why this file: ${s.evidence}`);
    lines.push(`- Watch out: ${s.risk}`);
    lines.push("");
  }
  lines.push("## Test commands (run after every file change)");
  lines.push("");
  lines.push("```sh");
  for (const c of result.testCommands) lines.push(c);
  lines.push("```");
  lines.push("");
  lines.push("## Guardrails");
  lines.push("");
  lines.push("- Do not edit files outside the plan.");
  lines.push(
    "- Do not rename exported symbols unless a plan step says so."
  );
  lines.push("- Keep changes minimal, typed, and consistent with the repo's style.");
  lines.push(
    "- After each file, run the test commands; fix failures before moving on."
  );
  lines.push(
    "- If a step's evidence looks wrong, stop and ask instead of guessing."
  );
  lines.push("");
  const first = result.plan[0];
  if (first) {
    lines.push(`Start with ${first.file}: ${first.action}.`);
    lines.push("");
  }
  return lines.join("\n");
}

export async function buildTaskPackZip(
  result: AnalyzeResult
): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("TASK.md", renderTaskMd(result));
  zip.file("CONTEXT.json", renderContextJson(result));
  zip.file("TEST_PLAN.md", renderTestPlanMd(result));
  zip.file("BOB_PROMPT.md", renderBobPromptMd(result));

  // Sanity: the pack must contain exactly the contract files.
  const names = Object.values(zip.files)
    .filter((f) => !f.dir)
    .map((f) => f.name)
    .sort();
  const expected = [...TASK_PACK_FILES].sort();
  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    throw new Error(
      `task pack must contain exactly ${expected.join(", ")} (got ${names.join(", ")})`
    );
  }

  return zip.generateAsync({ type: "nodebuffer" });
}

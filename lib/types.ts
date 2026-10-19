/**
 * Proofline shared contract — the single source of truth for the analysis
 * engine (lib/) and the Next.js UI (app/). Both sides import these types;
 * neither side may change them without updating the other.
 */

export type EvidenceType = "lexical" | "import" | "symbol-ref" | "test" | "config";

export interface EvidenceItem {
  type: EvidenceType;
  /** File path or symbol that produced this evidence. */
  source: string;
  /** Short detail, e.g. "imported by src/api/client.ts:3". */
  detail: string;
  /** Plain-language reason, e.g. "mentions 'rate limit' from your brief". */
  reason: string;
}

export type NodeKind = "file" | "test" | "config" | "script";

export interface RankedNode {
  /** == path; stable id for graph + inspector. */
  id: string;
  kind: NodeKind;
  /** Basename for graph labels. */
  label: string;
  path: string;
  /** 0..100 deterministic score. */
  score: number;
  /** Weak evidence is labeled honestly. */
  strength: "strong" | "candidate";
  evidence: EvidenceItem[];
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: "imports" | "tests" | "configures";
}

export interface PlanStep {
  order: number;
  file: string;
  action: string;
  evidence: string;
  risk: string;
}

export interface RepoRef {
  owner: string;
  name: string;
  ref: string;
}

export type FixtureName = "demo-api-client" | "demo-shop";

export interface AnalyzeOptions {
  repoUrl?: string;
  fixtureName?: FixtureName;
  changeBrief: string;
}

export interface AnalyzeResult {
  repo: RepoRef;
  brief: string;
  /** Top ~12 nodes, sorted by score desc. */
  nodes: RankedNode[];
  /** Edges among the top nodes. */
  edges: GraphEdge[];
  plan: PlanStep[];
  risks: string[];
  testStrategy: string[];
  testCommands: string[];
  runtimeMs: number;
  usedFixture: boolean;
  limits: string[];
}

export type RepoErrorKind = "invalid-url" | "not-found" | "too-large" | "timeout" | "unsupported";

export class RepoError extends Error {
  kind: RepoErrorKind;
  constructor(kind: RepoErrorKind, message: string) {
    super(message);
    this.name = "RepoError";
    this.kind = kind;
  }
}

/** Names of the four files in every exported task pack. */
export const TASK_PACK_FILES = [
  "TASK.md",
  "CONTEXT.json",
  "TEST_PLAN.md",
  "BOB_PROMPT.md",
] as const;

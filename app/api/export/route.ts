import { NextRequest, NextResponse } from "next/server";
import { buildTaskPack } from "@/lib/engine";
import type { AnalyzeResult } from "@/lib/types";

function isAnalyzeResult(value: unknown): value is AnalyzeResult {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["brief"] === "string" &&
    Array.isArray(v["nodes"]) &&
    Array.isArray(v["edges"]) &&
    Array.isArray(v["plan"]) &&
    Array.isArray(v["risks"]) &&
    Array.isArray(v["testStrategy"]) &&
    Array.isArray(v["testCommands"]) &&
    typeof v["repo"] === "object" &&
    v["repo"] !== null
  );
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "bad-request", message: "Expected a JSON body." },
      { status: 400 },
    );
  }

  const result = (body as { result?: unknown } | null)?.result;
  if (!isAnalyzeResult(result)) {
    return NextResponse.json(
      {
        error: "bad-request",
        message: "Body must include a valid analysis result under `result`.",
      },
      { status: 400 },
    );
  }

  const zip = await buildTaskPack(result);
  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="proofline-task-pack.zip"',
    },
  });
}

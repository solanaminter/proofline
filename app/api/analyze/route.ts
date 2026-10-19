import { NextRequest, NextResponse } from "next/server";
import { analyzeRepo } from "@/lib/engine";
import { RepoError } from "@/lib/types";
import type { FixtureName, RepoErrorKind } from "@/lib/types";

export const maxDuration = 60;

const ANALYSIS_TIMEOUT_MS = 45_000;

function statusFor(kind: RepoErrorKind): number {
  switch (kind) {
    case "invalid-url":
      return 400;
    case "not-found":
      return 404;
    case "too-large":
      return 413;
    case "timeout":
      return 504;
    case "unsupported":
      return 422;
  }
}

interface AnalyzeBody {
  repoUrl?: string;
  fixtureName?: FixtureName;
  changeBrief?: unknown;
}

export async function POST(req: NextRequest) {
  let body: AnalyzeBody;
  try {
    body = (await req.json()) as AnalyzeBody;
  } catch {
    return NextResponse.json(
      {
        error: "invalid-url",
        message: "Expected a JSON body with a repoUrl or fixtureName and a changeBrief.",
      },
      { status: 400 },
    );
  }

  const { repoUrl, fixtureName, changeBrief } = body ?? {};

  if (typeof changeBrief !== "string" || changeBrief.trim().length < 8) {
    return NextResponse.json(
      {
        error: "invalid-url",
        message: "changeBrief must be a non-empty string of at least 8 characters.",
      },
      { status: 400 },
    );
  }
  if (repoUrl !== undefined && typeof repoUrl !== "string") {
    return NextResponse.json(
      { error: "invalid-url", message: "repoUrl must be a string." },
      { status: 400 },
    );
  }

  const timeout = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new RepoError("timeout", "Analysis exceeded 45 seconds.")),
      ANALYSIS_TIMEOUT_MS,
    );
  });

  try {
    const result = await Promise.race([
      analyzeRepo({
        repoUrl,
        fixtureName,
        changeBrief: changeBrief.trim(),
      }),
      timeout,
    ]);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof RepoError) {
      if (err.kind === "timeout") {
        return NextResponse.json(
          {
            error: "timeout",
            hint: "Try the demo repo — it runs fully in-memory in a few seconds.",
          },
          { status: 504 },
        );
      }
      return NextResponse.json(
        { error: err.kind, message: err.message },
        { status: statusFor(err.kind) },
      );
    }
    return NextResponse.json(
      { error: "unknown", message: "Unexpected analysis failure." },
      { status: 500 },
    );
  }
}

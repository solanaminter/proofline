"use client";

import { useEffect, useRef, useState } from "react";
import type {
  AnalyzeResult,
  FixtureName,
  RepoErrorKind,
} from "@/lib/types";
import ImpactGraph from "./ImpactGraph";
import Inspector from "./Inspector";
import PlanList from "./PlanList";

type Status = "idle" | "analyzing" | "done" | "error";

type ErrorKind = RepoErrorKind | "network" | "unknown";

interface AnalysisError {
  kind: ErrorKind;
  message: string;
}

const DEMO_FIXTURE: FixtureName = "demo-api-client";
const DEMO_BRIEF = "Add rate-limit feedback to the API client.";

const ERROR_COPY: Record<ErrorKind, { title: string; body: string }> = {
  "invalid-url": {
    title: "That repo URL doesn't look right",
    body: "Proofline expects a public GitHub URL like https://github.com/owner/repo — double-check the owner and repo name.",
  },
  "not-found": {
    title: "Repository not found",
    body: "We couldn't find that repo — it may be private, renamed, or misspelled.",
  },
  "too-large": {
    title: "Repository is too large",
    body: "That repo exceeds the in-memory analysis limits right now. Try a smaller repo or the demo instead.",
  },
  timeout: {
    title: "Analysis timed out",
    body: "The repo took longer than 45 seconds to analyze. Large or dependency-heavy repos can hit this — the demo runs in seconds.",
  },
  unsupported: {
    title: "Unsupported repository",
    body: "Proofline analyzes public TypeScript/JavaScript repositories only.",
  },
  network: {
    title: "Couldn't reach the analysis service",
    body: "Something interrupted the request. Check your connection and try again.",
  },
  unknown: {
    title: "Something went wrong",
    body: "The analysis failed unexpectedly. Try again or use the demo repo.",
  },
};

export default function ProoflineApp() {
  const [status, setStatus] = useState<Status>("idle");
  const [repoUrl, setRepoUrl] = useState("");
  const [brief, setBrief] = useState("");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<AnalysisError | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadFailed, setDownloadFailed] = useState(false);
  const startedAtRef = useRef(0);

  useEffect(() => {
    if (status !== "analyzing") return;
    setElapsed(0);
    const timer = setInterval(() => {
      setElapsed((Date.now() - startedAtRef.current) / 1000);
    }, 250);
    return () => clearInterval(timer);
  }, [status]);

  async function runAnalysis(payload: {
    repoUrl?: string;
    fixtureName?: FixtureName;
    changeBrief: string;
  }) {
    setStatus("analyzing");
    setError(null);
    setResult(null);
    setSelectedId(null);
    setDownloadFailed(false);
    startedAtRef.current = Date.now();
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: ErrorKind;
          message?: string;
        };
        const kind = data.error ?? "unknown";
        setError({
          kind,
          message:
            data.message ?? ERROR_COPY[kind]?.body ?? ERROR_COPY.unknown.body,
        });
        setStatus("error");
        return;
      }
      const data = (await res.json()) as AnalyzeResult;
      setResult(data);
      setSelectedId(data.nodes[0]?.id ?? null);
      setStatus("done");
    } catch {
      setError({
        kind: "network",
        message: ERROR_COPY.network.body,
      });
      setStatus("error");
    }
  }

  function handleAnalyze() {
    runAnalysis({ repoUrl: repoUrl.trim() || undefined, changeBrief: brief });
  }

  function handleDemo() {
    setRepoUrl("");
    setBrief(DEMO_BRIEF);
    runAnalysis({ fixtureName: DEMO_FIXTURE, changeBrief: DEMO_BRIEF });
  }

  function resetToInputs() {
    setStatus("idle");
    setError(null);
    setResult(null);
    setSelectedId(null);
  }

  async function handleDownload() {
    if (!result || downloading) return;
    setDownloading(true);
    setDownloadFailed(false);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result }),
      });
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "proofline-task-pack.zip";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadFailed(true);
    } finally {
      setDownloading(false);
    }
  }

  const selectedNode =
    result?.nodes.find((n) => n.id === selectedId) ?? null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-10">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white"
          >
            P
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Proofline
          </h1>
        </div>
        <p className="mt-3 max-w-2xl text-lg text-slate-600">
          Paste a repo URL and a change request — get an evidence-linked impact
          map, a ranked change plan, and a Bob-ready task pack.
        </p>
      </header>

      <main className="flex flex-1 flex-col gap-10">
        {status !== "done" && status !== "analyzing" && (
          <section
            aria-label="Analyze a repository"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
          >
            <div className="flex flex-col gap-5">
              <div>
                <label
                  htmlFor="repo-url"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  GitHub repository URL
                </label>
                <input
                  id="repo-url"
                  type="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Public TypeScript/JavaScript repositories only.
                </p>
              </div>

              <div>
                <label
                  htmlFor="change-brief"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Change brief
                </label>
                <textarea
                  id="change-brief"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="Add rate-limit feedback to the API client."
                  rows={3}
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={brief.trim().length < 8}
                  className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-300 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Analyze
                </button>
                <button
                  type="button"
                  onClick={handleDemo}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                >
                  Try the demo repo
                </button>
                {brief.trim().length > 0 && brief.trim().length < 8 && (
                  <p className="text-xs text-slate-500">
                    Describe the change in a few more words (8+ characters).
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {status === "analyzing" && (
          <section
            aria-label="Analysis in progress"
            aria-live="polite"
            className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm"
          >
            <span
              aria-hidden="true"
              className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"
            />
            <p className="text-base font-medium text-slate-800">
              Analyzing repository…
            </p>
            <p className="max-w-md text-sm text-slate-500">
              Fetching the repo, tracing imports and symbols, and ranking
              impact. Typical live analysis takes under 45 seconds.
            </p>
            <p className="text-sm text-slate-400 tabular-nums">
              {elapsed.toFixed(0)}s elapsed
            </p>
          </section>
        )}

        {status === "error" && error && (
          <section
            aria-label="Analysis error"
            aria-live="polite"
            className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm sm:p-8"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              {ERROR_COPY[error.kind]?.title ?? ERROR_COPY.unknown.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              {error.message}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleDemo}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
              >
                Try the demo repo instead
              </button>
              <button
                type="button"
                onClick={resetToInputs}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
              >
                Back to inputs
              </button>
            </div>
          </section>
        )}

        {status === "done" && result && (
          <div className="flex flex-col gap-8">
            <section
              aria-label="Analysis summary"
              className="flex flex-wrap items-center justify-between gap-4"
            >
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {result.repo.owner}/{result.repo.name}
                </h2>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <span>
                    {result.nodes.length} files flagged · analyzed in{" "}
                    {(result.runtimeMs / 1000).toFixed(1)}s
                  </span>
                  {result.usedFixture && (
                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                      Demo fixture
                    </span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-300 focus:outline-none disabled:cursor-wait disabled:bg-slate-300"
                >
                  {downloading ? "Preparing…" : "Download task pack"}
                </button>
                <button
                  type="button"
                  onClick={resetToInputs}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                >
                  New analysis
                </button>
              </div>
            </section>

            {downloadFailed && (
              <p role="alert" className="text-sm text-red-600">
                The task pack couldn't be generated. Try again in a moment.
              </p>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <ImpactGraph
                  nodes={result.nodes}
                  edges={result.edges}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              </div>
              <Inspector node={selectedNode} />
            </div>

            <PlanList result={result} />
          </div>
        )}
      </main>

      <footer className="mt-16 border-t border-slate-200 pt-6 pb-4">
        <p className="text-xs text-slate-500">
          TypeScript/JavaScript public repos only · analysis runs in-memory,
          nothing is stored.
        </p>
      </footer>
    </div>
  );
}

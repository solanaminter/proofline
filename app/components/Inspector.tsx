"use client";

import type { EvidenceType, RankedNode } from "@/lib/types";

const EVIDENCE_CHIP: Record<EvidenceType, string> = {
  lexical: "bg-slate-100 text-slate-700",
  import: "bg-indigo-100 text-indigo-700",
  "symbol-ref": "bg-violet-100 text-violet-700",
  test: "bg-emerald-100 text-emerald-700",
  config: "bg-amber-100 text-amber-700",
};

export default function Inspector({ node }: { node: RankedNode | null }) {
  return (
    <aside
      aria-label="Selected file inspector"
      className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
        Inspector
      </h2>
      {!node ? (
        <p className="text-sm text-slate-500">
          Select a node in the graph to see why it was flagged.
        </p>
      ) : (
        <>
          <p className="font-mono text-sm break-all text-slate-900">
            {node.path}
          </p>

          <div className="flex items-center gap-3">
            <div
              className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label={`Impact score ${node.score} out of 100`}
              aria-valuenow={node.score}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{ width: `${node.score}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-slate-700 tabular-nums">
              {node.score}
            </span>
            {node.strength === "strong" ? (
              <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-medium text-white">
                strong
              </span>
            ) : (
              <span className="rounded-full border-2 border-dashed border-amber-600 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                candidate
              </span>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Evidence
            </h3>
            {node.evidence.length === 0 ? (
              <p className="text-sm text-slate-500">No evidence recorded.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {node.evidence.map((item, i) => (
                  <li
                    key={`${item.type}-${item.source}-${i}`}
                    className="rounded-lg bg-slate-50 p-3"
                  >
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${EVIDENCE_CHIP[item.type]}`}
                    >
                      {item.type}
                    </span>
                    <p className="mt-1.5 text-sm text-slate-700">{item.reason}</p>
                    <p className="mt-0.5 font-mono text-xs break-all text-slate-500">
                      {item.detail}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

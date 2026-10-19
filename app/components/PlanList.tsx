"use client";

import type { AnalyzeResult } from "@/lib/types";

export default function PlanList({ result }: { result: AnalyzeResult }) {
  return (
    <div className="flex flex-col gap-10">
      <section aria-label="Change plan">
        <h2 className="text-xl font-semibold text-slate-900">Change plan</h2>
        <p className="mt-1 text-sm text-slate-500">
          Ordered steps, each tied to the evidence behind it.
        </p>
        {result.plan.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No plan steps were generated.
          </p>
        ) : (
          <ol className="mt-5 flex flex-col gap-4">
            {result.plan.map((step) => (
              <li
                key={step.order}
                className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white"
                >
                  {step.order}
                </span>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <p className="font-mono text-sm break-all text-slate-900">
                    {step.file}
                  </p>
                  <p className="text-sm font-medium text-slate-800">
                    {step.action}
                  </p>
                  <p className="text-sm text-slate-600">
                    <span className="font-medium text-slate-700">
                      Evidence:{" "}
                    </span>
                    {step.evidence}
                  </p>
                  <p className="text-sm text-amber-700">
                    <span className="font-medium">Risk: </span>
                    {step.risk}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-label="Risks">
        <h2 className="text-xl font-semibold text-slate-900">Risks</h2>
        {result.risks.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No risks flagged.</p>
        ) : (
          <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm text-slate-700 marker:text-amber-500">
            {result.risks.map((risk, i) => (
              <li key={i}>{risk}</li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Test strategy">
        <h2 className="text-xl font-semibold text-slate-900">Test strategy</h2>
        {result.testStrategy.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            No test strategy generated.
          </p>
        ) : (
          <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm text-slate-700 marker:text-emerald-500">
            {result.testStrategy.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        )}
        {result.testCommands.length > 0 && (
          <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-900 p-4 font-mono text-sm text-slate-100">
            {result.testCommands.join("\n")}
          </pre>
        )}
      </section>
    </div>
  );
}

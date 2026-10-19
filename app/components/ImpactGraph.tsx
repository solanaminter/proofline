"use client";

import dynamic from "next/dynamic";
import type { GraphEdge, RankedNode } from "@/lib/types";

const GraphCanvas = dynamic(() => import("./ImpactGraphCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
      Loading graph…
    </div>
  ),
});

interface ImpactGraphProps {
  nodes: RankedNode[];
  edges: GraphEdge[];
  selectedId: string | null;
  onSelect: (nodeId: string) => void;
}

function LegendSwatch({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-3.5 w-3.5 shrink-0 ${className}`}
    />
  );
}

export default function ImpactGraph({
  nodes,
  edges,
  selectedId,
  onSelect,
}: ImpactGraphProps) {
  return (
    <section aria-label="Impact graph" className="flex flex-col gap-3">
      <div className="h-[420px] w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
        <GraphCanvas
          nodes={nodes}
          edges={edges}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <LegendSwatch className="rounded-full bg-indigo-600" /> High-impact
          file
        </span>
        <span className="flex items-center gap-1.5">
          <LegendSwatch className="rounded-full bg-slate-300" /> Low-impact file
        </span>
        <span className="flex items-center gap-1.5">
          <LegendSwatch className="rounded-sm bg-emerald-500" /> Test
        </span>
        <span className="flex items-center gap-1.5">
          <LegendSwatch
            className="rotate-45 bg-amber-500"
            aria-hidden="true"
          />{" "}
          Config
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border-2 border-dashed border-amber-600"
          />{" "}
          Candidate (weak evidence)
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-0 w-6 border-t-2 border-dashed border-slate-400"
          />{" "}
          Test dependency
        </span>
      </div>
    </section>
  );
}

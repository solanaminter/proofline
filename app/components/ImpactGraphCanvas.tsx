"use client";

import { useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import type { GraphEdge, RankedNode } from "@/lib/types";

interface ImpactGraphCanvasProps {
  nodes: RankedNode[];
  edges: GraphEdge[];
  selectedId: string | null;
  onSelect: (nodeId: string) => void;
}

function sizeFor(score: number): number {
  return 26 + (Math.max(0, Math.min(100, score)) / 100) * 44;
}

function fillFor(node: RankedNode): string {
  if (node.kind === "test") return "#10b981";
  if (node.kind === "config") return "#f59e0b";
  if (node.kind === "script") return "#818cf8";
  // file: indigo intensity by score
  if (node.score >= 60) return "#4f46e5";
  if (node.score >= 30) return "#a5b4fc";
  return "#cbd5e1";
}

export default function ImpactGraphCanvas({
  nodes,
  edges,
  selectedId,
  onSelect,
}: ImpactGraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cy = cytoscape({
      container,
      elements: {
        nodes: nodes.map((n) => ({
          data: { id: n.id, label: n.label },
          classes: `${n.kind}${n.strength === "candidate" ? " candidate" : ""}`,
          style: {
            "background-color": fillFor(n),
            width: sizeFor(n.score),
            height: sizeFor(n.score),
          },
        })),
        edges: edges.map((e, i) => ({
          data: { id: `edge-${i}`, source: e.from, target: e.to },
          classes: e.kind,
        })),
      },
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "font-size": 10,
            color: "#334155",
            "text-valign": "bottom",
            "text-margin-y": 6,
            "text-outline-color": "#ffffff",
            "text-outline-width": 2,
            "overlay-opacity": 0,
            "border-width": 1,
            "border-color": "#e2e8f0",
          },
        },
        { selector: "node.file", style: { shape: "ellipse" } },
        { selector: "node.script", style: { shape: "ellipse" } },
        { selector: "node.test", style: { shape: "round-rectangle" } },
        { selector: "node.config", style: { shape: "diamond" } },
        {
          selector: "node.candidate",
          style: {
            "border-style": "dashed",
            "border-width": 2,
            "border-color": "#d97706",
          },
        },
        {
          selector: "node.selected",
          style: {
            "border-width": 3,
            "border-color": "#4338ca",
            "border-style": "solid",
          },
        },
        {
          selector: "edge",
          style: {
            "curve-style": "bezier",
            width: 1.5,
            "line-color": "#94a3b8",
            "target-arrow-shape": "triangle",
            "target-arrow-color": "#94a3b8",
            "arrow-scale": 0.8,
          },
        },
        { selector: "edge.imports", style: { "line-style": "solid" } },
        { selector: "edge.tests", style: { "line-style": "dashed" } },
        { selector: "edge.configures", style: { "line-style": "dotted" } },
      ],
      layout: {
        name: "cose",
        animate: true,
        animationDuration: 600,
        nodeRepulsion: 9000,
        idealEdgeLength: 130,
        edgeElasticity: 100,
        padding: 32,
      } as cytoscape.LayoutOptions,
      minZoom: 0.4,
      maxZoom: 2.5,
    });

    cy.on("tap", "node", (event) => {
      const id = event.target.id();
      onSelectRef.current(id);
    });

    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [nodes, edges]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements("node").removeClass("selected");
    if (selectedId) {
      const target = cy.getElementById(selectedId);
      if (target.nonempty()) {
        target.addClass("selected");
        cy.animate({ center: { eles: target } }, { duration: 250 });
      }
    }
  }, [selectedId]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      role="img"
      aria-label="Repository impact graph. Nodes are files sized and colored by impact score; select a node to inspect it below."
    />
  );
}

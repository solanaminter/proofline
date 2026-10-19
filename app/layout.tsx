import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Proofline — evidence-backed change planner",
  description:
    "Paste a repo URL and a change request. Get an impact graph, evidence-linked plan, and a Bob-ready task pack.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}

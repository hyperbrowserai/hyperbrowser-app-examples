import { forwardRef } from "react";
import type { Scorecard } from "@/lib/types";

interface ShareCardProps {
  scorecard: Scorecard;
}

function tierColor(score: number): string {
  if (score >= 90) return "#a3e635";
  if (score >= 70) return "#4ade80";
  if (score >= 50) return "#fde047";
  if (score >= 30) return "#fb923c";
  return "#f87171";
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  function ShareCard({ scorecard }, ref) {
    const score = scorecard.overallScore;
    const color = tierColor(score);
    const perplexity = scorecard.engineScores.perplexity.score ?? 0;
    const google = scorecard.engineScores.google.score ?? 0;

    return (
      <div
        ref={ref}
        style={{
          width: 1200,
          height: 630,
          backgroundColor: "#ffffff",
          color: "#000000",
          fontFamily: "var(--font-manrope), sans-serif",
          padding: 64,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          border: "8px solid #000000",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#737373" }}>
              HyperRank · AI Visibility
            </div>
            <div style={{ marginTop: 12, fontSize: 64, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, maxWidth: 720 }}>
              {scorecard.companyName}
            </div>
            <div style={{ marginTop: 12, fontSize: 22, fontWeight: 600, color: "#404040", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {scorecard.category}
            </div>
          </div>

          <div
            style={{
              width: 240,
              height: 240,
              border: "8px solid #000000",
              backgroundColor: color,
              boxShadow: "12px 12px 0 0 #000000",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ fontSize: 112, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.04em" }}>
              {Math.round(score)}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase" }}>
              / 100
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <EngineTile label="ChatGPT" value="—" hint="Login required" />
          <EngineTile label="Perplexity" value={String(Math.round(perplexity))} />
          <EngineTile label="Google AI" value={String(Math.round(google))} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 24, fontWeight: 700, maxWidth: 760, lineHeight: 1.3, color: "#171717" }}>
            {scorecard.summary}
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#737373" }}>
            Built with Hyperbrowser
          </div>
        </div>
      </div>
    );
  }
);

function EngineTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div
      style={{
        flex: 1,
        border: "6px solid #000000",
        backgroundColor: "#ffffff",
        padding: 20,
        boxShadow: "6px 6px 0 0 #000000",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#737373" }}>
        {label}
      </div>
      <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1, marginTop: 8, letterSpacing: "-0.04em" }}>
        {value}
      </div>
      {hint ? (
        <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: "#a3a3a3", textTransform: "uppercase", letterSpacing: "0.12em" }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

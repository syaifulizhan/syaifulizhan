import type { CSSProperties } from "react";

// Kotak taraf (darjat) hadis: sahih / hasan / da'if / maudu' …
const G: Record<string, { ar: string; ms: string; c: string }> = {
  Sahih: { ar: "صحيح", ms: "Sahih", c: "#2ecc71" },
  Hasan: { ar: "حسن", ms: "Hasan", c: "#3f8fbf" },
  "Da'if": { ar: "ضعيف", ms: "Da'if", c: "#c77f33" },
  "Maudu'": { ar: "موضوع", ms: "Maudu'", c: "#9e3b2e" },
  "Mawdu'": { ar: "موضوع", ms: "Maudu'", c: "#9e3b2e" },
  Munkar: { ar: "منكر", ms: "Munkar", c: "#b5562e" },
  Shadh: { ar: "شاذ", ms: "Syaz", c: "#c77f33" },
};

export function GradeBadge({ grade }: { grade: string | null }) {
  if (!grade) return null;
  const g = G[grade] ?? { ar: "", ms: grade, c: "var(--muted)" };
  return (
    <span className="hgrade" style={{ "--gc": g.c } as CSSProperties} title={`Taraf: ${g.ms}`}>
      <span className="hgrade-dot" />
      {g.ar && <span className="ar hgrade-ar">{g.ar}</span>}
      <span className="hgrade-ms">{g.ms}</span>
    </span>
  );
}

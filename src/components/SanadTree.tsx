"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SanadNode } from "@/lib/resolve-sanad";
import type { Lang } from "@/lib/types";

/** Pohon Syajarat al-Isnad — SVG dilukis sendiri:
 *  • susun atur dikira (nama panjang DIBALUT, tidak sekali-kali terpotong)
 *  • anak panah emas jelas (silsilah turun dari Nabi ﷺ / perawi teratas)
 *  • RTL (cabang pertama di kanan, adab mausu'ah)
 *  • klik nod terpadan → /perawi/<id> (biodata penuh) · hover → nama penuh korpus
 *  • butang muat turun PNG (kanvas 2×, latar midnight, jenama halus) */

type TNode = { id: number | null; name: string; full: string | null; children: TNode[] };

const GOLD = "#C7A338", GOLD_SOFT = "#D9BF6C", PAPER = "#E9E0CF", MUTED = "#A89E8B";
const BG = "#16131F", BOX = "#272237", BOX_DIM = "#1E1A2A";
const LINE = "rgba(217, 191, 108, 0.85)";
const FONT = (px: number, bold = false) => `${bold ? "700 " : ""}${px}px Amiri, serif`;
const NODE_PX = 17, PROPHET_PX = 20, LH = 27, PADX = 16, PADY = 10;
const MAXW = 380, HGAP = 26, VGAP = 48, MARGIN = 36;

const DL = { bm: "Muat turun PNG", ar: "تنزيل PNG", en: "Download PNG" } as const;

/** Bina POKOK bergabung: perawi kongsi (id/nama sama) → SATU nod; cabang bila menyimpang. */
function buildTree(nodes: SanadNode[], marfu: boolean): TNode {
  const chains = new Map<number, Map<number, SanadNode[]>>();
  for (const n of nodes) {
    if (!chains.has(n.chain_no)) chains.set(n.chain_no, new Map());
    const pm = chains.get(n.chain_no)!;
    if (!pm.has(n.position)) pm.set(n.position, []);
    pm.get(n.position)!.push(n);
  }
  // rantai → jujukan linear (cartesian atas posisi selari), buang jujukan serupa
  const linears: SanadNode[][] = [];
  const seenSeq = new Set<string>();
  for (const [, pm] of chains) {
    const positions = [...pm.entries()].sort((a, b) => a[0] - b[0]).map(([, arr]) => arr);
    let seqs: SanadNode[][] = [[]];
    for (const parallel of positions) {
      const next: SanadNode[][] = [];
      for (const s of seqs) for (const nd of parallel) next.push([...s, nd]);
      seqs = next.slice(0, 40); // had selamat
    }
    for (const s of seqs) {
      const key = s.map((nd) => (nd.narrator_id != null ? "i" + nd.narrator_id : "r" + nd.raw_name)).join(">");
      if (seenSeq.has(key)) continue;
      seenSeq.add(key);
      linears.push(s);
    }
  }
  // balikkan → sisi Nabi/perawi teratas dahulu; bina trie (perawi sama bergabung)
  const root: TNode = { id: marfu ? -1 : -2, name: marfu ? "النبي ﷺ" : "", full: null, children: [] };
  const keyOf = (id: number | null, raw: string) => (id != null ? "i" + id : "r" + raw);
  for (const seq of linears) {
    let cur = root;
    for (const nd of [...seq].reverse()) {
      const k = keyOf(nd.narrator_id, nd.raw_name);
      let child = cur.children.find((c) => keyOf(c.id, c.name) === k);
      if (!child) {
        child = { id: nd.narrator_id, name: nd.raw_name, full: nd.resolved, children: [] };
        cur.children.push(child);
      }
      cur = child;
    }
  }
  return root;
}

// ── susun atur ───────────────────────────────────────────────────────────
type LNode = {
  id: number | null; name: string; full: string | null; prophet: boolean;
  lines: string[]; w: number; h: number; x: number; depth: number; children: LNode[];
};

function makeMeasure(): (t: string, px: number, bold?: boolean) => number {
  if (typeof document === "undefined") return (t, px) => t.length * px * 0.52;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return (t, px) => t.length * px * 0.52;
  return (t, px, bold) => {
    ctx.font = FONT(px, bold);
    return ctx.measureText(t).width;
  };
}

function toLayout(n: TNode, measure: ReturnType<typeof makeMeasure>, prophet = false): LNode {
  const px = prophet ? PROPHET_PX : NODE_PX;
  // balut nama panjang kepada baris ≤ MAXW (ikut token — jangan potong perkataan)
  const words = n.name.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const cand = cur ? cur + " " + w : w;
    if (cur && measure(cand, px, prophet) > MAXW) { lines.push(cur); cur = w; }
    else cur = cand;
  }
  if (cur) lines.push(cur);
  const tw = Math.max(...lines.map((l) => measure(l, px, prophet)), 24);
  return {
    id: n.id, name: n.name, full: n.full, prophet,
    lines,
    w: Math.ceil(tw) + PADX * 2,
    h: lines.length * LH + PADY * 2,
    x: 0, depth: 0,
    children: n.children.map((c) => toLayout(c, measure)),
  };
}

function shiftX(n: LNode, dx: number) { n.x += dx; n.children.forEach((c) => shiftX(c, dx)); }

function place(n: LNode, x0: number, depth: number): number {
  n.depth = depth;
  if (!n.children.length) { n.x = x0 + n.w / 2; return n.w; }
  let x = x0, tw = 0;
  for (const c of n.children) {
    const w = place(c, x, depth + 1);
    x += w + HGAP; tw += w + HGAP;
  }
  tw -= HGAP;
  n.x = (n.children[0].x + n.children[n.children.length - 1].x) / 2;
  if (n.w > tw) { // nod lebih lebar dari anak — anjak anak ke tengah
    const dx = (n.w - tw) / 2;
    n.children.forEach((c) => shiftX(c, dx));
    n.x += dx;
    return n.w;
  }
  return tw;
}

type Layout = { tops: LNode[]; W: number; H: number; rowY: number[]; rowH: number[] };

function layoutForest(root: TNode, marfu: boolean, measure: ReturnType<typeof makeMeasure>): Layout {
  const lroot = toLayout(root, measure, marfu);
  const tops = marfu ? [lroot] : lroot.children;
  let x = MARGIN, W = MARGIN;
  for (const t of tops) { const w = place(t, x, 0); x += w + HGAP * 2; W = x; }
  W += MARGIN - HGAP * 2;
  // baris ikut kedalaman (tinggi nod berbeza — nama balut 2-3 baris)
  const rowH: number[] = [];
  const walk = (n: LNode) => { rowH[n.depth] = Math.max(rowH[n.depth] ?? 0, n.h); n.children.forEach(walk); };
  tops.forEach(walk);
  const rowY: number[] = [];
  let y = MARGIN;
  for (let d = 0; d < rowH.length; d++) { rowY[d] = y; y += rowH[d] + VGAP; }
  const H = y - VGAP + MARGIN;
  // RTL: cermin paksi-x (cabang pertama jatuh di KANAN)
  const mirror = (n: LNode) => { n.x = W - n.x; n.children.forEach(mirror); };
  tops.forEach(mirror);
  return { tops, W, H, rowY, rowH };
}

const flatten = (tops: LNode[]): LNode[] => {
  const out: LNode[] = [];
  const walk = (n: LNode) => { out.push(n); n.children.forEach(walk); };
  tops.forEach(walk);
  return out;
};

// tengah menegak baris — nod pendek dalam baris tinggi kekal sebaris tengah
const yTop = (L: Layout, n: LNode) => L.rowY[n.depth] + (L.rowH[n.depth] - n.h) / 2;

// ── muat turun PNG (kanvas 2×, font halaman, latar midnight) ─────────────
async function downloadPng(L: Layout) {
  await document.fonts.ready;
  const scale = 2, brandH = 34;
  const cv = document.createElement("canvas");
  cv.width = L.W * scale; cv.height = (L.H + brandH) * scale;
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);
  ctx.fillStyle = BG; ctx.fillRect(0, 0, L.W, L.H + brandH);
  ctx.textAlign = "center"; ctx.direction = "rtl";

  const all = flatten(L.tops);
  // garis + anak panah
  ctx.strokeStyle = LINE; ctx.lineWidth = 2;
  for (const p of all) for (const c of p.children) {
    const y1 = yTop(L, p) + p.h, y2 = yTop(L, c) - 3;
    ctx.beginPath();
    ctx.moveTo(p.x, y1);
    ctx.bezierCurveTo(p.x, (y1 + y2) / 2, c.x, (y1 + y2) / 2, c.x, y2 - 6);
    ctx.stroke();
    ctx.fillStyle = GOLD_SOFT; // kepala panah (menghala turun)
    ctx.beginPath();
    ctx.moveTo(c.x - 5, y2 - 7); ctx.lineTo(c.x + 5, y2 - 7); ctx.lineTo(c.x, y2 + 1);
    ctx.closePath(); ctx.fill();
  }
  // nod
  for (const n of all) {
    const y = yTop(L, n), x = n.x - n.w / 2;
    const matched = n.prophet || (n.id != null && n.id > 0);
    ctx.beginPath();
    ctx.roundRect(x, y, n.w, n.h, 8);
    ctx.fillStyle = n.prophet ? "rgba(199,163,56,0.13)" : matched ? BOX : BOX_DIM;
    ctx.fill();
    ctx.setLineDash(matched ? [] : [5, 4]);
    ctx.strokeStyle = n.prophet ? GOLD : matched ? GOLD_SOFT : "rgba(199,163,56,0.35)";
    ctx.lineWidth = n.prophet ? 2 : 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = n.prophet ? GOLD : matched ? PAPER : MUTED;
    ctx.font = FONT(n.prophet ? PROPHET_PX : NODE_PX, n.prophet);
    n.lines.forEach((ln, i) => ctx.fillText(ln, n.x, y + PADY + LH * (i + 1) - 8));
  }
  // jenama halus
  ctx.textAlign = "left"; ctx.direction = "ltr";
  ctx.fillStyle = "rgba(168,158,139,0.6)"; ctx.font = "12px 'IBM Plex Sans', sans-serif";
  ctx.fillText("syaifulizhan.my · شجرة الإسناد", MARGIN, L.H + brandH - 14);

  cv.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "syajarah-isnad.png";
    a.click();
    URL.revokeObjectURL(a.href);
  }, "image/png");
}

// ── komponen ─────────────────────────────────────────────────────────────
export function SanadTree({ nodes, marfu = false, lang = "bm" }: { nodes: SanadNode[]; marfu?: boolean; lang?: Lang }) {
  const [ready, setReady] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let on = true;
    document.fonts.ready.then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);

  const L = useMemo(() => {
    if (!ready || !nodes.length) return null;
    const root = buildTree(nodes, marfu);
    if (!root.children.length) return null;
    return layoutForest(root, marfu, makeMeasure());
  }, [nodes, marfu, ready]);

  if (!nodes.length) return null;
  if (!L) return <div className="sttree-wrap" aria-busy="true" />;
  const all = flatten(L.tops);

  return (
    <div className="sttree-wrap" ref={wrapRef}>
      <div className="sttree-bar">
        <button className="btn ghost stdl" onClick={() => downloadPng(L)}>⤓ {DL[lang]}</button>
      </div>
      <div className="sttree-scroll">
        <svg
          className="sttree-svg"
          width={L.W}
          height={L.H}
          viewBox={`0 0 ${L.W} ${L.H}`}
          role="img"
          aria-label="شجرة الإسناد"
        >
          <defs>
            <marker id="stArrow" markerWidth="9" markerHeight="9" refX="4.5" refY="7.5" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
              <path d="M0,0 L9,0 L4.5,8 z" fill={GOLD_SOFT} />
            </marker>
          </defs>
          {all.map((p) =>
            p.children.map((c) => {
              const y1 = yTop(L, p) + p.h, y2 = yTop(L, c) - 4;
              return (
                <path
                  key={`l${p.x},${p.depth}-${c.x},${c.depth}`}
                  className="stlinkp"
                  d={`M ${p.x} ${y1} C ${p.x} ${(y1 + y2) / 2}, ${c.x} ${(y1 + y2) / 2}, ${c.x} ${y2}`}
                  fill="none"
                  stroke={LINE}
                  strokeWidth={2}
                  markerEnd="url(#stArrow)"
                />
              );
            }),
          )}
          {all.map((n) => {
            const y = yTop(L, n);
            const matched = n.id != null && n.id > 0;
            const cls = n.prophet ? "stn prophet" : matched ? "stn on" : "stn off";
            const box = (
              <g className={cls}>
                {n.full && n.full !== n.name && <title>{n.full}</title>}
                <rect x={n.x - n.w / 2} y={y} width={n.w} height={n.h} rx={8} />
                <text x={n.x} y={y + PADY - 8} style={{ direction: "rtl" }}>
                  {n.lines.map((ln, i) => (
                    <tspan key={i} x={n.x} dy={LH}>{ln}</tspan>
                  ))}
                </text>
              </g>
            );
            return matched && !n.prophet ? (
              <a key={`n${n.x},${n.depth}`} href={`/perawi/${n.id}`}>{box}</a>
            ) : (
              <g key={`n${n.x},${n.depth}`}>{box}</g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

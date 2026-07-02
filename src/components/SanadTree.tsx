"use client";

import { useEffect, useMemo, useState } from "react";
import type { SanadNode } from "@/lib/resolve-sanad";
import type { Lang } from "@/lib/types";

/** Syajarat al-Isnad gaya mausu'ah — GRAF berlapis (DAG), bukan pohon kaku:
 *  • perawi SAMA = SATU nod walau di mana (cth عبد بن حميد terima dari dua
 *    jalan → dua anak panah masuk satu nod bawah, macam mausu'ah)
 *  • susun atur dikira dari lebar teks sebenar (nama panjang dibalut)
 *  • anak panah emas jelas · RTL · klik nod → /perawi/<id> · hover nama penuh
 *  • butang muat turun PNG (kanvas 2×, latar midnight, jenama halus) */

const GOLD = "#C7A338", GOLD_SOFT = "#D9BF6C", PAPER = "#E9E0CF", MUTED = "#A89E8B";
const BG = "#16131F", BOX = "#272237", BOX_DIM = "#1E1A2A";
const LINE = "rgba(217, 191, 108, 0.85)";
const FONT = (px: number, bold = false) => `${bold ? "700 " : ""}${px}px Amiri, serif`;
const NODE_PX = 17, PROPHET_PX = 20, LH = 27, PADX = 16, PADY = 10;
const MAXW = 380, HGAP = 26, VGAP = 48, MARGIN = 36;

const DL = { bm: "Muat turun PNG", ar: "تنزيل PNG", en: "Download PNG" } as const;

type GNode = {
  key: string; id: number | null; name: string; full: string | null; prophet: boolean;
  lines: string[]; w: number; h: number; x: number; depth: number;
  parents: GNode[]; children: GNode[];
};
type Graph = { nodes: GNode[]; edges: [GNode, GNode][]; W: number; H: number; rowY: number[] };

function makeMeasure(): (t: string, px: number, bold?: boolean) => number {
  if (typeof document === "undefined") return (t, px) => t.length * px * 0.52;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return (t, px) => t.length * px * 0.52;
  return (t, px, bold) => {
    ctx.font = FONT(px, bold);
    return ctx.measureText(t).width;
  };
}

// balut nama panjang kepada baris ≤ MAXW (ikut token — jangan potong perkataan)
function wrapLines(name: string, px: number, bold: boolean, measure: ReturnType<typeof makeMeasure>): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const w of name.split(" ")) {
    const cand = cur ? cur + " " + w : w;
    if (cur && measure(cand, px, bold) > MAXW) { lines.push(cur); cur = w; }
    else cur = cand;
  }
  if (cur) lines.push(cur);
  return lines;
}

function buildGraph(snodes: SanadNode[], marfu: boolean, measure: ReturnType<typeof makeMeasure>): Graph | null {
  // kumpul rantai → jujukan linear (cartesian atas posisi selari), buang serupa
  const chains = new Map<number, Map<number, SanadNode[]>>();
  for (const n of snodes) {
    if (!chains.has(n.chain_no)) chains.set(n.chain_no, new Map());
    const pm = chains.get(n.chain_no)!;
    if (!pm.has(n.position)) pm.set(n.position, []);
    pm.get(n.position)!.push(n);
  }
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
  if (!linears.length) return null;

  // nod ikut IDENTITI (id korpus / nama mentah) — perawi sama SATU nod (mausu'ah)
  const byKey = new Map<string, GNode>();
  const mk = (key: string, id: number | null, name: string, full: string | null, prophet = false): GNode => {
    let g = byKey.get(key);
    if (g) return g;
    const px = prophet ? PROPHET_PX : NODE_PX;
    const lines = wrapLines(name, px, prophet, measure);
    const tw = Math.max(...lines.map((l) => measure(l, px, prophet)), 24);
    g = {
      key, id, name, full, prophet, lines,
      w: Math.ceil(tw) + PADX * 2, h: lines.length * LH + PADY * 2,
      x: 0, depth: 0, parents: [], children: [],
    };
    byKey.set(key, g);
    return g;
  };
  const prophetNode = marfu ? mk("i-1", -1, "النبي ﷺ", null, true) : null;
  const edges: [GNode, GNode][] = [];
  const edgeKeys = new Set<string>();
  for (const seq of linears) {
    let prev = prophetNode;
    for (const nd of [...seq].reverse()) { // sisi Nabi/teratas dahulu
      const key = nd.narrator_id != null ? "i" + nd.narrator_id : "r" + nd.raw_name;
      const cur = mk(key, nd.narrator_id, nd.raw_name, nd.resolved);
      if (prev && prev !== cur) {
        const ek = prev.key + ">" + key;
        if (!edgeKeys.has(ek)) {
          edgeKeys.add(ek);
          edges.push([prev, cur]);
          prev.children.push(cur);
          cur.parents.push(prev);
        }
      }
      prev = cur;
    }
  }
  const nodes = [...byKey.values()];

  // lapisan = laluan terpanjang dari punca (panah sentiasa turun); pengawal kitaran
  let changed = true, guard = 0;
  while (changed && guard++ <= nodes.length + 1) {
    changed = false;
    for (const [p, c] of edges) if (c.depth < p.depth + 1) { c.depth = p.depth + 1; changed = true; }
  }

  // baris menegak ikut kedalaman (tinggi nod berbeza)
  const layers: GNode[][] = [];
  for (const n of nodes) (layers[n.depth] ??= []).push(n);
  const rowY: number[] = [];
  let y = MARGIN;
  for (let d = 0; d < layers.length; d++) {
    rowY[d] = y;
    const h = Math.max(...(layers[d] ?? []).map((n) => n.h), 0);
    if (h) y += h + VGAP;
  }
  const H = y - VGAP + MARGIN;

  // kedudukan-x: lapisan 0 berturutan; seterusnya purata induk (barycenter)
  // + leraikan pertindihan + anjak balik ke purata → cabang bercantum kemas
  let cursor = 0;
  for (const n of layers[0] ?? []) { n.x = cursor + n.w / 2; cursor += n.w + HGAP; }
  for (let d = 1; d < layers.length; d++) {
    const row = layers[d] ?? [];
    for (const n of row)
      n.x = n.parents.length ? n.parents.reduce((s, p) => s + p.x, 0) / n.parents.length : 0;
    row.sort((a, b) => a.x - b.x);
    const desired = row.map((n) => n.x);
    let cur = -Infinity, dev = 0;
    row.forEach((n, i) => {
      n.x = Math.max(n.x, cur + n.w / 2);
      cur = n.x + n.w / 2 + HGAP;
      dev += n.x - desired[i];
    });
    const shift = dev / Math.max(row.length, 1);
    row.forEach((n) => { n.x -= shift; });
  }
  // normalisasi tepi kiri → MARGIN, kira lebar, cermin RTL (cabang pertama kanan)
  const minL = Math.min(...nodes.map((n) => n.x - n.w / 2));
  for (const n of nodes) n.x += MARGIN - minL;
  const W = Math.max(...nodes.map((n) => n.x + n.w / 2)) + MARGIN;
  for (const n of nodes) n.x = W - n.x;

  return { nodes, edges, W, H, rowY };
}

const yTop = (G: Graph, n: GNode) => G.rowY[n.depth];

// ── muat turun PNG (kanvas 2×, font halaman, latar midnight) ─────────────
async function downloadPng(G: Graph) {
  await document.fonts.ready;
  const scale = 2, brandH = 34;
  const cv = document.createElement("canvas");
  cv.width = G.W * scale; cv.height = (G.H + brandH) * scale;
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);
  ctx.fillStyle = BG; ctx.fillRect(0, 0, G.W, G.H + brandH);
  ctx.textAlign = "center"; ctx.direction = "rtl";

  ctx.strokeStyle = LINE; ctx.lineWidth = 2;
  for (const [p, c] of G.edges) {
    const y1 = yTop(G, p) + p.h, y2 = yTop(G, c) - 3;
    ctx.beginPath();
    ctx.moveTo(p.x, y1);
    ctx.bezierCurveTo(p.x, (y1 + y2) / 2, c.x, (y1 + y2) / 2, c.x, y2 - 6);
    ctx.stroke();
    ctx.fillStyle = GOLD_SOFT; // kepala panah (menghala turun)
    ctx.beginPath();
    ctx.moveTo(c.x - 5, y2 - 7); ctx.lineTo(c.x + 5, y2 - 7); ctx.lineTo(c.x, y2 + 1);
    ctx.closePath(); ctx.fill();
  }
  for (const n of G.nodes) {
    const y = yTop(G, n), x = n.x - n.w / 2;
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
  ctx.textAlign = "left"; ctx.direction = "ltr";
  ctx.fillStyle = "rgba(168,158,139,0.6)"; ctx.font = "12px 'IBM Plex Sans', sans-serif";
  ctx.fillText("syaifulizhan.my · شجرة الإسناد", MARGIN, G.H + brandH - 14);

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
  useEffect(() => {
    let on = true;
    document.fonts.ready.then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);

  const G = useMemo(() => {
    if (!ready || !nodes.length) return null;
    return buildGraph(nodes, marfu, makeMeasure());
  }, [nodes, marfu, ready]);

  if (!nodes.length) return null;
  if (!G) return <div className="sttree-wrap" aria-busy="true" />;

  return (
    <div className="sttree-wrap">
      <div className="sttree-bar">
        <button className="btn ghost stdl" onClick={() => downloadPng(G)}>⤓ {DL[lang]}</button>
      </div>
      <div className="sttree-scroll">
        <svg
          className="sttree-svg"
          width={G.W}
          height={G.H}
          viewBox={`0 0 ${G.W} ${G.H}`}
          role="img"
          aria-label="شجرة الإسناد"
        >
          <defs>
            {/* segitiga menghala +x — orient="auto" pusing ikut arah laluan (ke bawah) */}
            <marker id="stArrow" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0,0 L9,4.5 L0,9 z" fill={GOLD_SOFT} />
            </marker>
          </defs>
          {G.edges.map(([p, c]) => {
            const y1 = yTop(G, p) + p.h, y2 = yTop(G, c) - 4;
            return (
              <path
                key={`e${p.key}>${c.key}`}
                d={`M ${p.x} ${y1} C ${p.x} ${(y1 + y2) / 2}, ${c.x} ${(y1 + y2) / 2}, ${c.x} ${y2}`}
                fill="none"
                stroke={LINE}
                strokeWidth={2}
                markerEnd="url(#stArrow)"
              />
            );
          })}
          {G.nodes.map((n) => {
            const y = yTop(G, n);
            const matched = n.id != null && n.id > 0;
            const cls = n.prophet ? "stn prophet" : matched ? "stn on" : "stn off";
            const box = (
              <g className={cls}>
                {n.full && n.full !== n.name && <title>{n.full}</title>}
                <rect x={n.x - n.w / 2} y={y} width={n.w} height={n.h} rx={8} />
                <text x={n.x} y={y + PADY - 8} textAnchor="middle" style={{ direction: "rtl" }}>
                  {n.lines.map((ln, i) => (
                    <tspan key={i} x={n.x} dy={LH}>{ln}</tspan>
                  ))}
                </text>
              </g>
            );
            return matched && !n.prophet ? (
              <a key={n.key} href={`/perawi/${n.id}`}>{box}</a>
            ) : (
              <g key={n.key}>{box}</g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

#!/usr/bin/env node
// Penjana HTML statik halaman perawi — dijalankan SELEPAS `opennextjs-cloudflare build` (dan gen-kitab-static).
//
//   .open-next/assets/perawi/<id>/index.html   10,000 perawi teratas ikut bilangan rujukan isnad (hadith_narrators)
//   .open-next/assets/perawi/<id>/senarai.json  SEMUA perawi dengan >EDGE_LIMIT guru ATAU murid: senarai penuh [id,nama,wafat]
//                                               (carian nama + halaman dalam pelayar, /static-senarai.js; tanpa Turso/Worker)
//
// Perawi lain dilayan Worker (worker.ts) dengan templat yang sama. STATIC_PERAWI_LIMIT=N → N teratas sahaja (ujian).
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { perawiPage, PERAWI_SQL, THIQATAN_ALTS, EDGE_LIMIT, edgeList, listSql } from "../src/static/templates.mjs";
import { ASSETS, REMOTE, CONCURRENCY, rows, batchRows, cssHrefs, writeCssManifest, retryCount } from "./lib/static-common.mjs";

const OUT = join(ASSETS, "perawi");
const LIMIT = Number(process.env.STATIC_PERAWI_LIMIT) || 10000;
const MIN_PAGES = 9000; // jaminan bila tiada had env
const CHUNK = 25;

const CSS = cssHrefs();
writeCssManifest(CSS);
rmSync(OUT, { recursive: true, force: true });

const top = await rows(
  "SELECT hn.narrator_id id, COUNT(*) c FROM hadith_narrators hn JOIN narrators n ON n.id = hn.narrator_id GROUP BY hn.narrator_id ORDER BY c DESC, hn.narrator_id LIMIT ?", [LIMIT]);
const ids = top.map((r) => Number(r.id));

const inList = (n) => Array(n).fill("?").join(",");
const group = (list, key) => {
  const m = new Map();
  for (const r of list) { const k = Number(r[key]); if (!m.has(k)) m.set(k, []); m.get(k).push(r); }
  return m;
};
const altCache = new Map();
const getNarrator = async (id) => {
  if (!altCache.has(id)) altCache.set(id, (await rows(PERAWI_SQL.narrator, [id]))[0] ?? null);
  return altCache.get(id);
};

let pages = 0, bytes = 0, maxBytes = 0, missing = 0;
const t0 = Date.now();

async function buildChunk(chunkIds) {
  const [ns, gs, ...edges] = await batchRows([
    { sql: `SELECT id, name_ar, shuhra, kunya, nisba, rutbah, profession, regions, mawla, death_year, death_place FROM narrators WHERE id IN (${inList(chunkIds.length)})`, args: chunkIds },
    { sql: `SELECT narrator_id, scholar, verdict FROM narrator_grades WHERE narrator_id IN (${inList(chunkIds.length)})`, args: chunkIds },
    ...chunkIds.flatMap((id) => [{ sql: PERAWI_SQL.teachers, args: [id, EDGE_LIMIT] }, { sql: PERAWI_SQL.students, args: [id, EDGE_LIMIT] }]),
  ]);
  const byId = new Map(ns.map((r) => [Number(r.id), r]));
  const grades = group(gs, "narrator_id");
  for (const [i, id] of chunkIds.entries()) {
    const n = byId.get(id);
    if (!n) { missing++; continue; }
    const alts = (await Promise.all((THIQATAN_ALTS[id] ?? []).map(getNarrator))).filter(Boolean);
    const html = perawiPage({
      n: { ...n }, grades: (grades.get(id) ?? []).map((g) => ({ scholar: g.scholar, verdict: g.verdict })),
      teachers: edgeList(edges[2 * i]), students: edgeList(edges[2 * i + 1]), alts: alts.map((a) => ({ ...a })),
    }, CSS);
    const f = join(OUT, String(id), "index.html");
    mkdirSync(join(f, ".."), { recursive: true });
    writeFileSync(f, html);
    const b = Buffer.byteLength(html);
    bytes += b; pages++; maxBytes = Math.max(maxBytes, b);
  }
}

const chunks = [];
for (let i = 0; i < ids.length; i += CHUNK) chunks.push(ids.slice(i, i + CHUNK));
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  for (let c; (c = chunks.shift()) !== undefined; ) await buildChunk(c);
}));

// ── senarai.json: perawi dengan >EDGE_LIMIT guru/murid (sebarang kedudukan, bukan hanya 10k teratas) ──
const big = (await rows(
  `SELECT id FROM (SELECT teacher_id id FROM narrator_relations GROUP BY teacher_id HAVING COUNT(*) > ?
                   UNION SELECT student_id id FROM narrator_relations GROUP BY student_id HAVING COUNT(*) > ?) ORDER BY id`,
  [EDGE_LIMIT, EDGE_LIMIT])).map((r) => Number(r.id));
const ALL = 1e9; // LIMIT tanpa had praktikal
const sj = { files: 0, bytes: 0, max: 0 };
const compact = (list) => list.map((r) => [Number(r.id), r.name_ar, r.death_year == null ? null : Number(r.death_year)]);
async function buildSenarai(chunkIds) {
  const stmts = chunkIds.flatMap((id) => ["guru", "murid"].flatMap((k) => {
    const q = listSql(k, false);
    return [{ sql: q.count, args: [id] }, { sql: q.rows, args: [id, ALL, 0] }];
  }));
  const res = await batchRows(stmts);
  for (const [i, id] of chunkIds.entries()) {
    const [tc, t, sc, st] = res.slice(4 * i, 4 * i + 4);
    if (t.length !== Number(tc[0].total) || st.length !== Number(sc[0].total)) throw new Error(`senarai ${id}: bilangan tidak sepadan (${t.length}/${tc[0].total}, ${st.length}/${sc[0].total})`);
    const json = JSON.stringify({ t: compact(t), s: compact(st) });
    const f = join(OUT, String(id), "senarai.json");
    mkdirSync(join(f, ".."), { recursive: true });
    writeFileSync(f, json);
    const b = Buffer.byteLength(json);
    sj.files++; sj.bytes += b; sj.max = Math.max(sj.max, b);
  }
}
const schunks = [];
for (let i = 0; i < big.length; i += 5) schunks.push(big.slice(i, i + 5));
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  for (let c; (c = schunks.shift()) !== undefined; ) await buildSenarai(c);
}));
if (!process.env.STATIC_PERAWI_LIMIT && sj.files < 1000) throw new Error(`hanya ${sj.files} senarai.json (dijangka >= 1000) — korpus tidak lengkap?`);

if (missing) throw new Error(`${missing} perawi rujukan isnad tiada dalam jadual narrators`);
if (!process.env.STATIC_PERAWI_LIMIT && pages < MIN_PAGES) throw new Error(`hanya ${pages} halaman perawi (dijangka >= ${MIN_PAGES}) — korpus tidak lengkap?`);

console.log(JSON.stringify({
  perawi: pages, missing, totalKB: Math.round(bytes / 1024), avgPageKB: +(bytes / Math.max(pages, 1) / 1024).toFixed(1),
  maxPageKB: +(maxBytes / 1024).toFixed(1), seconds: Math.round((Date.now() - t0) / 1000), retries: retryCount(), remote: REMOTE,
  senarai: sj.files, senaraiMaxKB: +(sj.max / 1024).toFixed(1), senaraiAvgKB: +(sj.bytes / Math.max(sj.files, 1) / 1024).toFixed(1), senaraiTotalKB: Math.round(sj.bytes / 1024),
}));

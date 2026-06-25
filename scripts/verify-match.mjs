// Semak sampel: padanan yang DISAHKAN sama (patut munasabah) + ditolak (patut ragu).
import { readFileSync, existsSync, createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { normalizeArabic } from "./lib/arabic.mjs";

const RIJAL = "data/itqan/rijal";
const GRADES = ["reliable", "mostly_reliable", "weak", "unknown", "companion", "fabricator"];
const clean = (v) => (v && v !== "-" && String(v).trim() ? String(v).trim() : null);
const parseYear = (d) => { const m = clean(d)?.match(/(\d{1,4})\s*ه/); return m ? Number(m[1]) : null; };
const kunyaKey = (k) => { const c = clean(k); return c ? normalizeArabic(c.split(/\s+/).slice(0, 2).join(" ")) : null; };

const byId = new Map();
for (const g of GRADES) for (const n of Object.values(JSON.parse(readFileSync(`${RIJAL}/profiles_${g}.json`, "utf8")))) byId.set(n.id, n);

const nameToNarr = new Map();
async function load(f) { if (!existsSync(f)) return; const rl = createInterface({ input: createReadStream(f), crlfDelay: Infinity });
  for await (const line of rl) { const t = line.trim(); if (!t) continue; let n; try { n = JSON.parse(t); } catch { continue; }
    const k = normalizeArabic(n.name_ar || ""); if (!k) continue; (nameToNarr.get(k) ?? nameToNarr.set(k, []).get(k)).push({ id: +n.id, name: n.name_ar, death: n.death_year ?? null, kunya: n.kunya ?? null }); } }
await load("data/islamdb/narrators.jsonl"); await load("data/islamdb/narrators.recovered.jsonl");

let okSample = [], rejSample = [];
for (const p of byId.values()) {
  const norm = normalizeArabic(p.full_name);
  const list = nameToNarr.get(norm);
  if (!list || list.length !== 1) continue; // fokus kes nama-unik utk semakan
  const isl = list[0]; const pd = parseYear(p.death);
  const merged = (pd && isl.death && Math.abs(pd - isl.death) <= 2) ||
    (norm.split(/\s+/).length >= 4 && p.full_name.includes("بن") && !(kunyaKey(p.kunya) && kunyaKey(isl.kunya) && kunyaKey(p.kunya) !== kunyaKey(isl.kunya)) && !(pd && isl.death && Math.abs(pd - isl.death) > 5));
  const row = `"${p.full_name}" itqan(wafat:${pd ?? "-"},kunya:${clean(p.kunya) ?? "-"}) ↔ islamdb(wafat:${isl.death ?? "-"},kunya:${clean(isl.kunya) ?? "-"})`;
  if (merged && okSample.length < 12) okSample.push(row);
  else if (!merged && rejSample.length < 10) rejSample.push(row);
}
console.log("=== SAMPEL DISAHKAN SAMA (gabung) ===");
okSample.forEach((r) => console.log(" ✓", r));
console.log("\n=== SAMPEL DITOLAK (kekal asing — ragu) ===");
rejSample.forEach((r) => console.log(" ✗", r));

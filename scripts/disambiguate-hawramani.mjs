// Disambiguate nama isnad AMBIGU guna tok syeikh hawramani (bio: روى عن/روى عنه).
// Kaedah (ikut ilmu rijal — jangan tertukar orang):
//   nama X ambigu pd posisi P, jiran Y (perawi kita yg DAH dipaut) di P±1.
//   → cari X di hawramani → ambil bio setiap calon → guru/murid.
//   → calon yg bio-nya SEBUT Y (guru/murid) = orang yang betul → paut ke id korpus kita.
// DRY: papar keputusan + BUKTI. --write utk kemas corpus.db (LOKAL).
//   node scripts/disambiguate-hawramani.mjs [--top=15] [--write]
import { createClient } from "@libsql/client";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const WRITE = process.argv.includes("--write");
const TOP = Number((process.argv.find(a => a.startsWith("--top=")) || "--top=15").split("=")[1]);
const db = createClient({ url: "file:./data/corpus.db" });
const norm = (s) => (s || "").replace(/[ً-ْٰـ]/g, "").replace(/[آأإ]/g, "ا").replace(/[ىئ]/g, "ي").replace(/ؤ/g, "و").replace(/ة/g, "ه").replace(/\s+/g, " ").trim();
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── indeks korpus: nama→ids, id→name_ar ──
const full = new Map(), shu = new Map(), kun = new Map(), nameById = new Map();
const add = (m, k, id) => { if (!k) return; (m.get(k) || m.set(k, new Set()).get(k)).add(id); };
let cur = 0;
for (;;) {
  const r = await db.execute({ sql: "SELECT id,name_ar,name_search,shuhra,kunya FROM narrators WHERE id>? ORDER BY id LIMIT 5000", args: [cur] });
  if (!r.rows.length) break;
  for (const x of r.rows) { cur = Number(x.id); nameById.set(cur, x.name_ar || ""); add(full, norm(x.name_search), cur); add(shu, norm(x.shuhra), cur); add(kun, norm(x.kunya), cur); }
}
const candIds = (nm) => new Set([...(full.get(nm) || []), ...(shu.get(nm) || []), ...(kun.get(nm) || [])]);

// ── hadith_narrators: rows + jiran dipaut ──
const rows = []; let c2 = -1;
for (;;) {
  const r = await db.execute({ sql: "SELECT rowid rid,hadith_id h,chain_no ch,position po,raw_name nm,narrator_id nid FROM hadith_narrators WHERE rowid>? ORDER BY rowid LIMIT 8000", args: [c2] });
  if (!r.rows.length) break;
  for (const x of r.rows) { c2 = Number(x.rid); rows.push({ rid: Number(x.rid), h: Number(x.h), ch: Number(x.ch || 0), po: Number(x.po), nm: norm(x.nm), raw: x.raw_name, nid: x.nid == null ? null : Number(x.nid) }); }
}
const at = new Map(); for (const r of rows) if (r.nid != null) at.set(`${r.h}|${r.ch}|${r.po}`, r.nid);

// ── top-N nama tak-dipaut paling kerap ──
const freq = new Map();
for (const r of rows) if (r.nid == null && r.nm) freq.set(r.nm, (freq.get(r.nm) || 0) + 1);
const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP);

// ── hawramani bio: cari nama → calon → {teachers,students} (cache) ──
mkdirSync("data/hawramani/bio", { recursive: true });
async function hwBios(name) {
  const q = encodeURIComponent(name);
  let list = [];
  try { list = await (await fetch(`https://hadithtransmitters.hawramani.com/wp-json/wp/v2/posts?search=${q}&per_page=5&_fields=id,title,link`)).json(); } catch { }
  const out = [];
  for (const e of (list || []).slice(0, 5)) {
    const cf = `data/hawramani/bio/${e.id}.txt`;
    let t = "";
    if (existsSync(cf)) t = readFileSync(cf, "utf8");
    else { try { t = await (await fetch(e.link)).text(); writeFileSync(cf, t); await sleep(300); } catch { } }
    let x = t.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ");
    x = x.replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ");
    const seg = (kw, end) => { const i = x.indexOf(kw); if (i < 0) return ""; let j = end ? x.indexOf(end, i + kw.length) : -1; return norm(x.slice(i + kw.length, j > 0 ? j : i + 600)); };
    out.push({ id: e.id, name: (e.title?.rendered || "").replace(/<[^>]+>/g, ""), teachers: seg("روى عن", "روى عنه"), students: seg("روى عنه", "قال") });
  }
  return out;
}

console.log(`Disambiguate ${TOP} nama teratas (bio hawramani)…\n`);
const updates = [];
for (const [nm, n] of top) {
  const cand = candIds(nm);
  const bios = await hwBios(nm);
  // occurrence pertama yg ada jiran dipaut
  const occ = rows.find(r => r.nid == null && r.nm === nm && (at.get(`${r.h}|${r.ch}|${r.po - 1}`) || at.get(`${r.h}|${r.ch}|${r.po + 1}`)));
  let decision = "—", ev = "";
  if (occ) {
    const nb = at.get(`${occ.h}|${occ.ch}|${occ.po - 1}`) || at.get(`${occ.h}|${occ.ch}|${occ.po + 1}`);
    const nbName = norm(nameById.get(nb) || "");
    const nbTok = nbName.split(" ").filter(w => w.length > 3).slice(0, 3);
    const hit = bios.filter(b => nbTok.some(w => (b.teachers + " " + b.students).includes(w)));
    if (hit.length === 1) { decision = `hawramani→ ${hit[0].name}`; ev = `jiran '${nbName.slice(0, 30)}' disebut`; }
    else if (hit.length > 1) decision = `${hit.length} calon hawramani sebut jiran (masih ambigu)`;
    else decision = "tiada calon hawramani sebut jiran";
  }
  console.log(`• "${nm}" (${n}×) — korpus calon:${cand.size} hawramani:${bios.length} → ${decision}`);
  if (ev) console.log(`     bukti: ${ev}`);
}
console.log("\n(DRY — resolver bukti. Padanan hawramani→korpus id + --write fasa berikut.)");
db.close();

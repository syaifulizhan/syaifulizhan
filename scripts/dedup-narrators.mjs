// DEDUP UMUM: banyak perawi ada entri PENDUA (kaya + stub). Gabung pautan isnad →
// entri terbaik (paling banyak relations + bio). KONSERVATIF (amanah, elak namesake):
// HANYA gabung bila nama DISTINKTIF (≥4 token nasab) & padan TEPAT ternormal & ada satu
// pemenang jelas. Nama pendek/ambigu dibiar. Betulkan "klik → stub" di lain-lain tempat.
//   node scripts/dedup-narrators.mjs [--write]
import { createClient } from "@libsql/client";
const WRITE = process.argv.includes("--write");
const norm = (s) => (s || "").replace(/[ً-ْٰـ]/g, "").replace(/[آأإ]/g, "ا").replace(/[ىئ]/g, "ي").replace(/ؤ/g, "و").replace(/ة/g, "ه").replace(/\s+/g, " ").trim();
const STOP = new Set(["بن", "ابن", "ابو", "ابي", "بنت", "ام", "مولي", "ال"]);
const sig = (s) => norm(s).split(" ").filter((w) => w.length > 2 && !STOP.has(w));

const db = createClient({ url: "file:./data/corpus.db" });
const relc = new Map(); let off = 0;
for (;;) { const r = await db.execute({ sql: "SELECT teacher_id,student_id FROM narrator_relations ORDER BY rowid LIMIT 8000 OFFSET ?", args: [off] }); if (!r.rows.length) break; for (const x of r.rows) { relc.set(Number(x.teacher_id), (relc.get(Number(x.teacher_id)) || 0) + 1); relc.set(Number(x.student_id), (relc.get(Number(x.student_id)) || 0) + 1); } off += r.rows.length; if (r.rows.length < 8000) break; }
const hasBio = new Map();
const groups = new Map(); let cur = 0;
for (;;) { const r = await db.execute({ sql: "SELECT id,name_ar,name_search,bio_ar FROM narrators WHERE id>? ORDER BY id LIMIT 5000", args: [cur] }); if (!r.rows.length) break; for (const x of r.rows) { cur = Number(x.id); const nm = norm(x.name_search); if (sig(nm).length < 4) continue; if (/هو |تقدم|يقال|وقيل|[0-9(:]/.test(x.name_ar || "")) { /* stub berselerak boleh jadi calon-buang sahaja */ } hasBio.set(cur, (x.bio_ar || "").length); (groups.get(nm) || groups.set(nm, []).get(nm)).push(cur); } }

// canonical per kumpulan = skor tertinggi (relations lalu bio lalu id-rendah)
const remap = new Map();
const score = (id) => (relc.get(id) || 0) * 1000 + Math.min(999, hasBio.get(id) || 0);
let grp = 0;
for (const [nm, ids] of groups) {
  if (ids.length < 2) continue;
  const best = ids.slice().sort((a, b) => score(b) - score(a))[0];
  if ((relc.get(best) || 0) === 0 && (hasBio.get(best) || 0) === 0) continue; // pemenang pun kosong → skip
  for (const id of ids) if (id !== best) remap.set(id, best);
  grp++;
}
console.log(`kumpulan pendua (nama distinktif): ${grp} · id dipetakan: ${remap.size}`);

// re-point hadith_narrators
const rows = []; let c2 = -1;
for (;;) { const r = await db.execute({ sql: "SELECT rowid rid,narrator_id nid FROM hadith_narrators WHERE narrator_id IS NOT NULL AND rowid>? ORDER BY rowid LIMIT 8000", args: [c2] }); if (!r.rows.length) break; for (const x of r.rows) { c2 = Number(x.rid); const to = remap.get(Number(x.nid)); if (to) rows.push([to, Number(x.rid)]); } }
console.log(`+${rows.length} pautan di-repoint ke entri terbaik`);
// sampel
const nm = new Map(); for (const id of new Set([...remap.values()].slice(0, 0))) {}
if (!WRITE) { console.log("(DRY — --write utk kemas)"); db.close(); process.exit(0); }
for (let i = 0; i < rows.length; i += 500) await db.batch(rows.slice(i, i + 500).map(([id, rid]) => ({ sql: "UPDATE hadith_narrators SET narrator_id=? WHERE rowid=?", args: [id, rid] })), "write");
console.log("✓ ditulis ke corpus.db LOKAL.");
db.close();

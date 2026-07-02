// Apply peta kanonik ke isnad — KETEPATAN + pengadang berganda (tok syeikh + konteks graf).
// Sahabat: paut terus (hujung isnad, selamat). Masyhur/eksplisit: paut HANYA bila perawi
// kanonik bersambung graf guru-murid dgn jiran dipaut. Ambigu: langkau. 0 tertukar orang.
//   node scripts/apply-canonical.mjs        # DRY (liputan + sampel)
//   node scripts/apply-canonical.mjs --write # kemas corpus.db LOKAL
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";

const WRITE = process.argv.includes("--write");
const norm = (s) => (s || "").replace(/[ً-ْٰـ]/g, "").replace(/[آأإ]/g, "ا").replace(/[ىئ]/g, "ي").replace(/ؤ/g, "و").replace(/ة/g, "ه").replace(/\s+/g, " ").trim();
const STOP = new Set(["بن", "ابن", "ابو", "ابي", "بنت", "ام", "مولي", "ال"]);
const tk = (s) => norm(s).split(" ").filter((w) => w.length > 2 && !STOP.has(w));
const jac = (a, b) => { let i = 0; for (const w of a) if (b.has(w)) i++; return i / (a.length + b.size - i); };

const map = JSON.parse(readFileSync("data/isnad-canonical.json", "utf8"));
const companions = map.safe_companions, famous = { ...map.safe_famous, ...map.safe_explicit };
const db = createClient({ url: "file:./data/corpus.db" });

// korpus indeks utk ikat kanonik → id (ism di awal, bukan didahului بن)
const corp = []; let cur = 0;
for (;;) { const r = await db.execute({ sql: "SELECT id,name_ar,name_search FROM narrators WHERE id>? ORDER BY id LIMIT 5000", args: [cur] }); if (!r.rows.length) break; for (const x of r.rows) { cur = Number(x.id); const raw = norm(x.name_search).split(" ").filter(Boolean); corp.push({ id: cur, t: new Set(tk(x.name_search)), raw }); } }
function bind(canon) {
  const ct = tk(canon); if (!ct.length) return null; const ism = ct[0]; const cand = [];
  for (const p of corp) { const pos = p.raw.indexOf(ism); if (pos < 0 || pos > 2) continue; if (pos > 0 && p.raw[pos - 1] === "بن") continue; const j = jac(ct, p.t); if (j >= 0.5) cand.push({ id: p.id, j }); }
  cand.sort((a, b) => b.j - a.j); if (!cand.length) return null;
  const ties = cand.filter((c) => Math.abs(c.j - cand[0].j) < 0.06).length; return ties === 1 ? cand[0].id : null;
}

// relations utk pengadang konteks
const rel = new Set(); let off = 0;
for (;;) { const r = await db.execute({ sql: "SELECT teacher_id,student_id FROM narrator_relations ORDER BY rowid LIMIT 8000 OFFSET ?", args: [off] }); if (!r.rows.length) break; for (const x of r.rows) rel.add(Number(x.teacher_id) * 1e8 + Number(x.student_id)); off += r.rows.length; if (r.rows.length < 8000) break; }
const adj = (a, b) => a && b && (rel.has(a * 1e8 + b) || rel.has(b * 1e8 + a));

// hadith_narrators + jiran dipaut
const rows = []; let c2 = -1;
for (;;) { const r = await db.execute({ sql: "SELECT rowid rid,hadith_id h,chain_no ch,position po,raw_name nm,narrator_id nid FROM hadith_narrators WHERE rowid>? ORDER BY rowid LIMIT 8000", args: [c2] }); if (!r.rows.length) break; for (const x of r.rows) { c2 = Number(x.rid); rows.push({ rid: Number(x.rid), h: Number(x.h), ch: Number(x.ch || 0), po: Number(x.po), nm: norm(x.nm), nid: x.nid == null ? null : Number(x.nid) }); } }
const at = new Map(); for (const r of rows) if (r.nid != null) at.set(`${r.h}|${r.ch}|${r.po}`, r.nid);

// bina peta short→{id,type}
const M = new Map();
for (const [s, c] of Object.entries(companions)) { const id = bind(c); if (id) M.set(norm(s), { id, type: "sahabat" }); }
for (const [s, c] of Object.entries(famous)) { const id = bind(c); if (id) M.set(norm(s), { id, type: "masyhur" }); }
// id DIPIN manual (disemak amanah) — atasi binder
try {
  const P = JSON.parse(readFileSync("data/isnad-pinned.json", "utf8"));
  for (const [s, id] of Object.entries(P.sahabat || {})) M.set(norm(s), { id: Number(id), type: "sahabat" });
  for (const [s, id] of Object.entries(P.masyhur_blind || {})) M.set(norm(s), { id: Number(id), type: "sahabat" }); // laqab unik → blind selamat
  for (const [s, id] of Object.entries(P.masyhur_konteks || {})) M.set(norm(s), { id: Number(id), type: "masyhur" }); // ambigu sikit → pengadang konteks
} catch {}
console.log(`peta terikat: ${M.size} nama\n`);

const upd = []; const stat = new Map();
for (const r of rows) {
  if (r.nid != null) continue; const m = M.get(r.nm); if (!m) continue;
  let ok = false;
  if (m.type === "sahabat") ok = true;                       // hujung isnad, selamat
  else { const prev = at.get(`${r.h}|${r.ch}|${r.po - 1}`), next = at.get(`${r.h}|${r.ch}|${r.po + 1}`); ok = adj(m.id, prev) || adj(m.id, next); } // konteks graf
  if (ok) { upd.push([m.id, r.rid]); const k = `${r.nm} (${m.type})`; stat.set(k, (stat.get(k) || 0) + 1); }
}
console.log("akan dipaut (nama → bil, dengan pengadang):");
for (const [k, n] of [...stat.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${n.toString().padStart(5)}  ${k}`);
const tot = rows.length, now = at.size;
console.log(`\n  +${upd.length} pautan baharu → ${now + upd.length}/${tot} (${((now + upd.length) / tot * 100).toFixed(0)}%) dari ${(now / tot * 100).toFixed(0)}%`);

if (!WRITE) { console.log("\n(DRY — --write utk kemas)"); db.close(); process.exit(0); }
for (let i = 0; i < upd.length; i += 500) await db.batch(upd.slice(i, i + 500).map(([id, rid]) => ({ sql: "UPDATE hadith_narrators SET narrator_id=? WHERE rowid=?", args: [id, rid] })), "write");
console.log("✓ ditulis ke corpus.db LOKAL.");
db.close();

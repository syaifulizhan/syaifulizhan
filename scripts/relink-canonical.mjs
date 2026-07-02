// DEDUP: re-point SEMUA kejadian nama dipin (sahabat + masyhur_blind, identiti UNIK) →
// entri KAYA penuh (bukan stub shuhra). Betulkan bug "klik الزهري → entri 'الزهري' sahaja".
// Override link sedia ada (termasuk ke stub). Tulis corpus.db LOKAL.
//   node scripts/relink-canonical.mjs [--write]
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
const WRITE = process.argv.includes("--write");
const norm = (s) => (s || "").replace(/[ً-ْٰـ]/g, "").replace(/[آأإ]/g, "ا").replace(/[ىئ]/g, "ي").replace(/ؤ/g, "و").replace(/ة/g, "ه").replace(/\s+/g, " ").trim();

const P = JSON.parse(readFileSync("data/isnad-pinned.json", "utf8"));
const M = new Map();
for (const [s, id] of Object.entries(P.sahabat || {})) M.set(norm(s), Number(id));
for (const [s, id] of Object.entries(P.masyhur_blind || {})) M.set(norm(s), Number(id));

const db = createClient({ url: "file:./data/corpus.db" });
const nameById = new Map();
for (const id of new Set(M.values())) { const r = await db.execute({ sql: "SELECT name_ar FROM narrators WHERE id=?", args: [id] }); nameById.set(id, r.rows[0]?.name_ar || "?"); }

const rows = []; let c2 = -1;
for (;;) { const r = await db.execute({ sql: "SELECT rowid rid,raw_name nm,narrator_id nid FROM hadith_narrators WHERE rowid>? ORDER BY rowid LIMIT 8000", args: [c2] }); if (!r.rows.length) break; for (const x of r.rows) { c2 = Number(x.rid); rows.push({ rid: Number(x.rid), nm: norm(x.nm), nid: x.nid == null ? null : Number(x.nid) }); } }

const upd = []; const moved = new Map();
for (const r of rows) { const id = M.get(r.nm); if (id == null) continue; if (r.nid === id) continue; upd.push([id, r.rid]); const k = `${r.nm} → #${id} ${nameById.get(id).slice(0, 28)}`; moved.set(k, (moved.get(k) || 0) + 1); }
console.log("re-point ke entri penuh (dari stub/kosong):");
for (const [k, n] of [...moved.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${n.toString().padStart(5)}  ${k}`);
console.log(`\n+${upd.length} baris di-repoint`);
if (!WRITE) { console.log("(DRY — --write utk kemas)"); db.close(); process.exit(0); }
for (let i = 0; i < upd.length; i += 500) await db.batch(upd.slice(i, i + 500).map(([id, rid]) => ({ sql: "UPDATE hadith_narrators SET narrator_id=? WHERE rowid=?", args: [id, rid] })), "write");
console.log("✓ ditulis ke corpus.db LOKAL.");
db.close();

// Disambiguate nama AMBIGU (2 calon masyhur) ikut KONTEKS graf guru-murid — bukan teka.
// Setiap kejadian: pilih calon yg bersambung graf dgn jiran dipaut. Padanan TUNGGAL sahaja
// → paut; dua/tiada → skip (amanah, jangan tertukar orang). Iteratif. Tulis LOKAL.
//   node scripts/disambiguate-context.mjs [--write]
import { createClient } from "@libsql/client";
const WRITE = process.argv.includes("--write");
const norm = (s) => (s || "").replace(/[ً-ْٰـ]/g, "").replace(/[آأإ]/g, "ا").replace(/[ىئ]/g, "ي").replace(/ؤ/g, "و").replace(/ة/g, "ه").replace(/\s+/g, " ").trim();

// calon = perawi masyhur BER-RELATIONS (disahkan). Ambigu tanpa calon jelas TAK di sini.
const AMBIG = {
  "سفيان": [2000434, 3443],       // al-Thawri / Ibn 'Uyayna
  "حماد": [2491, 2492],            // Ibn Zayd / Ibn Salama
  "يحيي بن سعيد": [8271, 2000199], // al-Qattan / al-Ansari
};
// Nod "ثقتان": bila anak murid KEDUA-DUA sebut nama & dua-dua thiqah → ambiguiti tak
// memudaratkan (لا يضر), sanad tetap sahih. Tanda setia, bukan paksa satu identiti.
// HANYA سفيان (Thawri & Ibn 'Uyayna dua-dua thiqah). حماد TIDAK (Ibn Salama ada kalam).
const THIQATAN = { "سفيان": 9000001 };

const db = createClient({ url: "file:./data/corpus.db" });
const nameById = new Map();
for (const x of (await db.execute("SELECT id,name_ar FROM narrators WHERE id IN (2000434,3443,2491,2492,8271,2000199)")).rows) nameById.set(Number(x.id), x.name_ar);
const rel = new Set(); let off = 0;
for (;;) { const r = await db.execute({ sql: "SELECT teacher_id,student_id FROM narrator_relations ORDER BY rowid LIMIT 8000 OFFSET ?", args: [off] }); if (!r.rows.length) break; for (const x of r.rows) rel.add(Number(x.teacher_id) * 1e8 + Number(x.student_id)); off += r.rows.length; if (r.rows.length < 8000) break; }
const adj = (a, b) => a && b && (rel.has(a * 1e8 + b) || rel.has(b * 1e8 + a));

const rows = []; let c2 = -1;
for (;;) { const r = await db.execute({ sql: "SELECT rowid rid,hadith_id h,chain_no ch,position po,raw_name nm,narrator_id nid FROM hadith_narrators WHERE rowid>? ORDER BY rowid LIMIT 8000", args: [c2] }); if (!r.rows.length) break; for (const x of r.rows) { c2 = Number(x.rid); rows.push({ rid: Number(x.rid), h: Number(x.h), ch: Number(x.ch || 0), po: Number(x.po), nm: norm(x.nm), nid: x.nid == null ? null : Number(x.nid) }); } }
const at = new Map(); for (const r of rows) if (r.nid != null) at.set(`${r.h}|${r.ch}|${r.po}`, r.nid);

const upd = []; const stat = {}; const samples = [];
for (const r of rows) {
  if (r.nid != null) continue; const cands = AMBIG[r.nm]; if (!cands) continue;
  const prev = at.get(`${r.h}|${r.ch}|${r.po - 1}`), next = at.get(`${r.h}|${r.ch}|${r.po + 1}`);
  const hit = cands.filter((c) => adj(c, prev) || adj(c, next));
  let pick = null;
  if (hit.length === 1) pick = hit[0];                                    // anak murid seorang → tentu
  else if (hit.length === 2 && THIQATAN[r.nm]) pick = THIQATAN[r.nm];     // anak murid kedua-dua → nod ثقتان
  if (pick) {
    upd.push([pick, r.rid]);
    const label = pick === THIQATAN[r.nm] ? "ثقتان (kedua-dua)" : nameById.get(pick).slice(0, 22);
    const k = `${r.nm}→${label}`; stat[k] = (stat[k] || 0) + 1;
  }
}
console.log("dipaut ikut konteks:"); for (const [k, n] of Object.entries(stat).sort((a, b) => b[1] - a[1])) console.log(`  ${n.toString().padStart(4)}  ${k}`);
console.log("\n=== sampel ===\n" + samples.join("\n") + `\n\n+${upd.length} pautan`);
if (!WRITE) { console.log("(DRY — --write utk kemas)"); db.close(); process.exit(0); }
for (let i = 0; i < upd.length; i += 500) await db.batch(upd.slice(i, i + 500).map(([id, rid]) => ({ sql: "UPDATE hadith_narrators SET narrator_id=? WHERE rowid=?", args: [id, rid] })), "write");
const nn = (await db.execute("SELECT count(*) c FROM hadith_narrators WHERE narrator_id IS NOT NULL")).rows[0].c;
console.log(`✓ ditulis. jumlah ${nn}/339315 (${(nn / 339315 * 100).toFixed(0)}%)`);
db.close();

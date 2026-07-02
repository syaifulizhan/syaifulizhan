// Paut nama RELATIONAL isnad (ابيه/ابي/والده=bapa, جده=datuk) secara DETERMINISTIK ikut
// nasab jiran — bukan teka. "X عن ابيه" → bapa = nama X buang ism pertama.
// KONSERVATIF (amanah): paut HANYA bila nama-bapa ≥2 token bermakna & terikat UNIK. Ragu=skip.
// Tulis corpus.db LOKAL. DRY papar bukti; --write utk kemas.
//   node scripts/link-relational.mjs [--write]
import { createClient } from "@libsql/client";
const WRITE = process.argv.includes("--write");
const norm = (s) => (s || "").replace(/[ً-ْٰـ]/g, "").replace(/[آأإ]/g, "ا").replace(/[ىئ]/g, "ي").replace(/ؤ/g, "و").replace(/ة/g, "ه").replace(/\s+/g, " ").trim();
const STOP = new Set(["بن", "ابن", "ابو", "ابي", "بنت", "ام", "مولي", "ال"]);
const sig = (arr) => arr.filter((w) => w.length > 2 && !STOP.has(w));
const jac = (a, b) => { let i = 0; for (const w of a) if (b.has(w)) i++; return i / (a.length + b.size - i); };
const FATHER = new Set(["ابيه", "ابي", "والده", "ابيها"]);
const GRAND = new Set(["جده", "جدها"]);

const db = createClient({ url: "file:./data/corpus.db" });
const nameById = new Map(); const corp = [];
let cur = 0;
for (;;) { const r = await db.execute({ sql: "SELECT id,name_ar,name_search FROM narrators WHERE id>? ORDER BY id LIMIT 5000", args: [cur] }); if (!r.rows.length) break; for (const x of r.rows) { cur = Number(x.id); nameById.set(cur, norm(x.name_ar)); corp.push({ id: cur, raw: norm(x.name_search).split(" ").filter(Boolean), t: new Set(sig(norm(x.name_search).split(" "))) }); } }
// ikat nama-penuh → id (ism awal, bukan didahului بن), unik
function bindName(fname) {
  const ft = sig(fname.split(" ")); if (ft.length < 2) return null; const ism = ft[0];
  const cand = [];
  for (const p of corp) { const pos = p.raw.indexOf(ism); if (pos < 0 || pos > 2) continue; if (pos > 0 && p.raw[pos - 1] === "بن") continue; const j = jac(ft, p.t); if (j >= 0.6) cand.push({ id: p.id, j }); }
  cand.sort((a, b) => b.j - a.j); if (!cand.length) return null;
  const ties = cand.filter((c) => Math.abs(c.j - cand[0].j) < 0.06).length; return ties === 1 ? cand[0].id : null;
}
// bapa/datuk dari nama anak: buang 1/2 ism awal (potong pada 'بن')
function ancestor(childName, level) {
  const parts = childName.split(" بن "); if (parts.length < level + 1) return null;
  return parts.slice(level).join(" بن ");
}

const rows = []; let c2 = -1;
for (;;) { const r = await db.execute({ sql: "SELECT rowid rid,hadith_id h,chain_no ch,position po,raw_name nm,narrator_id nid FROM hadith_narrators WHERE rowid>? ORDER BY rowid LIMIT 8000", args: [c2] }); if (!r.rows.length) break; for (const x of r.rows) { c2 = Number(x.rid); rows.push({ rid: Number(x.rid), h: Number(x.h), ch: Number(x.ch || 0), po: Number(x.po), nm: norm(x.nm), nid: x.nid == null ? null : Number(x.nid) }); } }
const at = new Map(); for (const r of rows) if (r.nid != null) at.set(`${r.h}|${r.ch}|${r.po}`, r.nid);

let nF = 0, nG = 0, skip = 0; const upd = []; const samples = [];
for (const r of rows) {
  if (r.nid != null) continue;
  const lvl = FATHER.has(r.nm) ? 1 : GRAND.has(r.nm) ? 2 : 0; if (!lvl) continue;
  const sonId = at.get(`${r.h}|${r.ch}|${r.po - 1}`) ?? at.get(`${r.h}|${r.ch}|${r.po + 1}`);
  if (!sonId) { skip++; continue; }
  const sonName = nameById.get(sonId) || "";
  if (/وقيل|تقدم|يقال|[0-9(:]/.test(sonName)) { skip++; continue; } // entri berselerak/rujuk-silang → amanah, skip
  const anc = ancestor(sonName, lvl); if (!anc) { skip++; continue; }
  const id = bindName(anc);
  if (!id) { skip++; continue; }
  upd.push([id, r.rid]); lvl === 1 ? nF++ : nG++;
  if (samples.length < 8) samples.push(`  ${r.nm}: anak='${(nameById.get(sonId) || "").slice(0, 26)}' → ${lvl === 1 ? "bapa" : "datuk"}='${anc.slice(0, 26)}' → #${id} ${(nameById.get(id) || "").slice(0, 26)}`);
}
console.log(`bapa: +${nF} · datuk: +${nG} · skip(ragu): ${skip}\n=== 8 sampel bukti ===`);
console.log(samples.join("\n"));
console.log(`\n+${upd.length} pautan relational`);
if (!WRITE) { console.log("(DRY — --write utk kemas)"); db.close(); process.exit(0); }
for (let i = 0; i < upd.length; i += 500) await db.batch(upd.slice(i, i + 500).map(([id, rid]) => ({ sql: "UPDATE hadith_narrators SET narrator_id=? WHERE rowid=?", args: [id, rid] })), "write");
const nn = (await db.execute("SELECT count(*) c FROM hadith_narrators WHERE narrator_id IS NOT NULL")).rows[0].c;
console.log(`✓ ditulis. jumlah ${nn}/339315 (${(nn / 339315 * 100).toFixed(0)}%)`);
db.close();

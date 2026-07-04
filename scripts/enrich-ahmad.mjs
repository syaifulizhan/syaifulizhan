// Parse isnad utk Musnad Ahmad al-Maknaz baharu (src_ref maknaz:ahmad:%) SAHAJA.
// Bersasar & additive — TIDAK sentuh pautan kitab lain (elak reset kerja link-isnad).
// Selepas ini jalankan link-isnad.mjs (global, additive) utk perkaya narrator_id.
//   node scripts/enrich-ahmad.mjs [--write]
import { createClient } from "@libsql/client";
import { normalizeArabic } from "./lib/arabic.mjs";
import { parseIsnadChains } from "./lib/parse-isnad.mjs";
const WRITE = process.argv.includes("--write");
const db = createClient({ url: "file:./data/corpus.db" });

console.log("→ Indeks nama unik…");
const nameToId = new Map();
let cur = 0;
for (;;) {
  const r = await db.execute({ sql: "SELECT id,name_search FROM narrators WHERE id>? ORDER BY id LIMIT 5000", args: [cur] });
  if (!r.rows.length) break;
  for (const row of r.rows) { cur = Number(row.id); const k = row.name_search; if (!k) continue; nameToId.set(k, nameToId.has(k) ? "AMBIG" : Number(row.id)); }
}
const lookup = (n) => { const v = nameToId.get(normalizeArabic(n || "")); return typeof v === "number" ? v : null; };
const resolve = (n) => { const d = lookup(n); if (d) return d; const s = (n || "").replace(/^(ابو|أبو|ام|أم)\s+\S+\s+/, ""); return s !== n ? lookup(s) : null; };
console.log(`  ${nameToId.size} nama`);

const total = Number((await db.execute(
  "SELECT COUNT(*) n FROM hadiths h WHERE h.src_ref LIKE 'maknaz:ahmad:%' AND NOT EXISTS (SELECT 1 FROM hadith_narrators hn WHERE hn.hadith_id=h.id)"
)).rows[0].n);
console.log(`  ${total} hadis Ahmad tanpa rantai`);
if (!total) { console.log("tiada kerja."); db.close(); process.exit(0); }

let batch = [], last = 0, nChain = 0, nLink = 0, nMatch = 0, nEdge = 0, done = 0;
const flush = async () => { if (batch.length && WRITE) { await db.batch(batch, "write"); } batch = []; };
for (;;) {
  const rows = (await db.execute({
    sql: `SELECT h.id, h.matn_ar FROM hadiths h
          WHERE h.src_ref LIKE 'maknaz:ahmad:%' AND h.id>? AND NOT EXISTS (SELECT 1 FROM hadith_narrators hn WHERE hn.hadith_id=h.id)
          ORDER BY h.id LIMIT 2000`,
    args: [last],
  })).rows;
  if (!rows.length) break;
  for (const h of rows) {
    last = Number(h.id);
    const chains = parseIsnadChains(h.matn_ar);
    if (chains.length) {
      nChain++;
      for (let ci = 0; ci < chains.length; ci++) {
        const posIds = [];
        for (let pi = 0; pi < chains[ci].length; pi++) {
          const idsHere = [];
          for (const nm of chains[ci][pi]) {
            const nid = resolve(nm);
            if (nid) nMatch++;
            idsHere.push(nid);
            batch.push({ sql: "INSERT INTO hadith_narrators (hadith_id,narrator_id,chain_no,position,raw_name) VALUES (?,?,?,?,?)", args: [h.id, nid, ci, pi, nm] });
            nLink++;
          }
          posIds.push(idsHere);
        }
        for (let pi = 0; pi + 1 < posIds.length; pi++)
          for (const sid of posIds[pi]) for (const tid of posIds[pi + 1])
            if (sid && tid && sid !== tid) { batch.push({ sql: "INSERT OR IGNORE INTO narrator_relations (teacher_id,student_id) VALUES (?,?)", args: [tid, sid] }); nEdge++; }
      }
    }
    if (batch.length >= 400) await flush();
    if (++done % 5000 === 0) process.stdout.write(`\r  ${done}/${total}   `);
  }
}
await flush();
console.log(`\n${WRITE ? "✓" : "(DRY)"} hadis berisnad: ${nChain} | pautan: ${nLink} (padan asas: ${nMatch}) | tepi baharu: ${nEdge}`);
if (!WRITE) console.log("(--write utk kemas LOKAL)");
db.close();

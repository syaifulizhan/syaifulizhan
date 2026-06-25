// Diagnostik: kelengkapan medan + kolisi nama islam-db↔Itqan utk nilai identiti.
import { createClient } from "@libsql/client";
const db = createClient({ url: "file:./data/corpus.db" });
const c = async (q) => Number((await db.execute(q)).rows[0].n);

console.log("=== kelengkapan islam-db (id<2M) ===");
const isl = await c("SELECT COUNT(*) n FROM narrators WHERE id<2000000");
console.log("jumlah:", isl);
for (const [lbl, col] of [["death_year", "death_year IS NOT NULL"], ["kunya", "length(kunya)>0"], ["nisba", "length(nisba)>0"], ["bio_ar", "length(bio_ar)>0"], ["rutbah", "length(rutbah)>0"]])
  console.log(` ${lbl}:`, await c(`SELECT COUNT(*) n FROM narrators WHERE id<2000000 AND ${col}`));

console.log("\n=== Itqan (id>=2M) ===");
console.log("jumlah:", await c("SELECT COUNT(*) n FROM narrators WHERE id>=2000000"));
for (const [lbl, col] of [["death_year", "death_year IS NOT NULL"], ["kunya", "length(kunya)>0"], ["nisba", "length(nisba)>0"]])
  console.log(` ${lbl}:`, await c(`SELECT COUNT(*) n FROM narrators WHERE id>=2000000 AND ${col}`));

// Kolisi: nama_search sama antara islam-db dan Itqan
console.log("\n=== kolisi nama (id<2M vs id>=2M dgn name_search sama) ===");
const col = await db.execute(`
  SELECT a.id ia, a.name_ar na, a.death_year da, a.kunya ka, a.nisba nia,
         b.id ib, b.name_ar nb, b.death_year db_, b.kunya kb, b.nisba nib
  FROM narrators a JOIN narrators b ON a.name_search=b.name_search
  WHERE a.id<2000000 AND b.id>=2000000
  LIMIT 20`);
console.log("contoh kolisi:", col.rows.length);
for (const r of col.rows) {
  const sameDeath = r.da != null && r.db_ != null ? (Math.abs(r.da - r.db_) <= 2 ? "✓wafat" : `✗wafat(${r.da}vs${r.db_})`) : "?wafat";
  const sameKunya = r.ka && r.kb ? (r.ka === r.kb ? "✓kunya" : "✗kunya") : "?kunya";
  console.log(` "${r.na}" | islamdb(wafat:${r.da ?? "-"},kunya:${r.ka ?? "-"}) Itqan(wafat:${r.db_ ?? "-"},kunya:${r.kb ?? "-"}) → ${sameDeath} ${sameKunya}`);
}

// Berapa kolisi keseluruhan + berapa boleh disahkan sama (wafat ±2)
const totalCol = await c(`SELECT COUNT(*) n FROM narrators a JOIN narrators b ON a.name_search=b.name_search WHERE a.id<2000000 AND b.id>=2000000`);
const confirmDeath = await c(`SELECT COUNT(*) n FROM narrators a JOIN narrators b ON a.name_search=b.name_search WHERE a.id<2000000 AND b.id>=2000000 AND a.death_year IS NOT NULL AND b.death_year IS NOT NULL AND ABS(a.death_year-b.death_year)<=2`);
const conflictDeath = await c(`SELECT COUNT(*) n FROM narrators a JOIN narrators b ON a.name_search=b.name_search WHERE a.id<2000000 AND b.id>=2000000 AND a.death_year IS NOT NULL AND b.death_year IS NOT NULL AND ABS(a.death_year-b.death_year)>5`);
console.log(`\nkolisi nama keseluruhan: ${totalCol}`);
console.log(` disahkan SAMA (wafat ±2): ${confirmDeath}`);
console.log(` BERCANGGAH wafat (>5 thn beza → mungkin org berbeza): ${conflictDeath}`);
console.log(` tiada bukti wafat (kekal hati-hati): ${totalCol - confirmDeath - conflictDeath}`);
db.close();

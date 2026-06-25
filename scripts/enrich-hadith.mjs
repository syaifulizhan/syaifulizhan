// Perkaya hadis: (1) taraf (grade) dari Itqan, (2) rantai isnad dari matn (parser)
// → hadith_narrators + tepi, dipadan ke korpus perawi (nama unik = boleh klik).
// Tambahan (additive) — tak DELETE hadiths/translations; selamat dgn translate jalan.
//   node --env-file=.env.local scripts/enrich-hadith.mjs
import { createClient } from "@libsql/client";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { normalizeArabic } from "./lib/arabic.mjs";
import { parseIsnadChains } from "./lib/parse-isnad.mjs";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:./data/corpus.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
await db.execute("PRAGMA busy_timeout=20000").catch(() => {});

const SUNNI = "data/itqan/repo/app/data/sunni";
const normGrade = (g) => {
  const s = (g || "").trim().toLowerCase();
  if (s.startsWith("sahih")) return "Sahih";
  if (s.startsWith("hasan")) return "Hasan";
  if (s.startsWith("da") || s.includes("ضعيف")) return "Da'if";
  if (s.startsWith("maud") || s.includes("موضوع")) return "Maudu'";
  return g && g.trim() ? g.trim() : null;
};

// ── 0. Lajur grade ──────────────────────────────────────────────────────────
const cols = (await db.execute("PRAGMA table_info(hadiths)")).rows.map((r) => r.name);
if (!cols.includes("grade")) {
  await db.execute("ALTER TABLE hadiths ADD COLUMN grade TEXT");
  console.log("→ Lajur 'grade' ditambah.");
}

// ── 1. Peta grade dari Itqan (slug:idInBook → grade) ─────────────────────────
console.log("→ Muat grade Itqan…");
const gradeMap = new Map();
if (existsSync(SUNNI)) {
  for (const slug of readdirSync(SUNNI)) {
    const dir = `${SUNNI}/${slug}`;
    let files; try { files = readdirSync(dir).filter((x) => x.endsWith(".json")); } catch { continue; }
    for (const f of files) {
      let arr; try { arr = JSON.parse(readFileSync(`${dir}/${f}`, "utf8")); } catch { continue; }
      if (!Array.isArray(arr)) arr = arr?.hadiths ?? [];
      for (const h of arr) {
        const g = normGrade(h.grade);
        if (g) gradeMap.set(`${slug}:${h.idInBook ?? h.id}`, g);
      }
    }
  }
}
console.log(`  ${gradeMap.size} grade dimuat`);

// ── 2. Indeks nama korpus → id (unik sahaja, utk pautan isnad) ───────────────
console.log("→ Bina indeks nama perawi…");
const nameToId = new Map(); // norm → id | "AMBIG"
let cur = 0;
for (;;) {
  const r = await db.execute({ sql: "SELECT id,name_search FROM narrators WHERE id>? ORDER BY id LIMIT 5000", args: [cur] });
  if (!r.rows.length) break;
  for (const row of r.rows) {
    cur = Number(row.id);
    const k = row.name_search; if (!k) continue;
    nameToId.set(k, nameToId.has(k) ? "AMBIG" : Number(row.id));
  }
}
const lookup = (name) => { const v = nameToId.get(normalizeArabic(name || "")); return typeof v === "number" ? v : null; };
// padan: nama penuh; jika gagal, buang kunya depan ("ابو خيثمة زهير بن حرب"→"زهير بن حرب")
const resolve = (name) => {
  const direct = lookup(name);
  if (direct) return direct;
  const stripped = (name || "").replace(/^(ابو|أبو|ام|أم)\s+\S+\s+/, "");
  return stripped !== name ? lookup(stripped) : null;
};
console.log(`  ${nameToId.size} nama diindeks`);

// schema: lajur chain_no (cabang taḥwīl) — additive, selamat
const hnCols = (await db.execute("PRAGMA table_info(hadith_narrators)")).rows.map((r) => r.name);
if (!hnCols.includes("chain_no")) { await db.execute("ALTER TABLE hadith_narrators ADD COLUMN chain_no INTEGER DEFAULT 0"); console.log("→ Lajur 'chain_no' ditambah."); }
// re-parse AhmedBaset dgn enjin v2: buang rantai lama (DERIVED — selamat), kekalkan islamdb (rantai sebenar)
await db.execute("DELETE FROM hadith_narrators WHERE hadith_id IN (SELECT id FROM hadiths WHERE src_ref LIKE 'ab:%')");

// ── 3. Proses hadis tanpa rantai: grade + parse isnad + pautan ──────────────
console.log("→ Proses hadis (grade + isnad)…");
let nGrade = 0, nChain = 0, nLink = 0, nEdge = 0, nMatch = 0, done = 0;
let batch = [];
const flush = async () => { if (batch.length) { await db.batch(batch, "write"); batch = []; } };

// hadis yang BELUM ada hadith_narrators (cth AhmedBaset)
const total = Number((await db.execute(
  "SELECT COUNT(*) n FROM hadiths h WHERE NOT EXISTS (SELECT 1 FROM hadith_narrators hn WHERE hn.hadith_id=h.id)"
)).rows[0].n);
console.log(`  ${total} hadis tanpa rantai`);

let last = 0;
for (;;) {
  const rows = (await db.execute({
    sql: `SELECT h.id, h.src_ref, h.matn_ar FROM hadiths h
          WHERE h.id>? AND NOT EXISTS (SELECT 1 FROM hadith_narrators hn WHERE hn.hadith_id=h.id)
          ORDER BY h.id LIMIT 2000`,
    args: [last],
  })).rows;
  if (!rows.length) break;
  for (const h of rows) {
    last = Number(h.id);
    // grade (src_ref ab:slug:idInBook → slug:idInBook). Bukhari & Muslim = Sahihayn
    // (sahih secara definisi) → JANGAN beri tanda gred.
    if (h.src_ref?.startsWith("ab:") && !/^ab:(bukhari|muslim):/.test(h.src_ref)) {
      const g = gradeMap.get(h.src_ref.slice(3));
      if (g) { batch.push({ sql: "UPDATE hadiths SET grade=? WHERE id=?", args: [g, h.id] }); nGrade++; }
    }
    // isnad v2: cabang (taḥwīl ح) + perawi selari (atf و)
    const chains = parseIsnadChains(h.matn_ar);
    if (chains.length) {
      nChain++;
      for (let ci = 0; ci < chains.length; ci++) {
        const posIds = []; // id setiap posisi (boleh >1 = selari)
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
        // tepi: setiap perawi posisi pi+1 (guru) → setiap perawi posisi pi (murid)
        for (let pi = 0; pi + 1 < posIds.length; pi++) {
          for (const sid of posIds[pi]) for (const tid of posIds[pi + 1]) {
            if (sid && tid && sid !== tid) {
              batch.push({ sql: "INSERT OR IGNORE INTO narrator_relations (teacher_id,student_id) VALUES (?,?)", args: [tid, sid] });
              nEdge++;
            }
          }
        }
      }
    }
    if (batch.length >= 400) await flush();
    if (++done % 5000 === 0) process.stdout.write(`\r  ${done}/${total} diproses   `);
  }
}
await flush();
await db.execute("CREATE INDEX IF NOT EXISTS idx_hn_narrator ON hadith_narrators(narrator_id)").catch(() => {});
console.log(`\n✓ grade diisi: ${nGrade} | hadis berisnad: ${nChain} | pautan: ${nLink} (padan korpus: ${nMatch}) | tepi baharu: ${nEdge}`);
db.close();

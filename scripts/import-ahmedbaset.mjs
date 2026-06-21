// Tukar 17 kitab AhmedBaset/hadith-json → ahmedbaset.jsonl (format yang build-sqlite baca).
// Sumber kedua berkualiti (kanonik + terjemahan EN sahih) untuk recover kitab islam-db yang 500.
//   node scripts/import-ahmedbaset.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";

const ROOT = "data/hadith-json/db/by_book";
const FOLDERS = ["the_9_books", "other_books", "forties"];
const OUT = "data/islamdb/ahmedbaset.jsonl";
const OFFSET = 900000; // id kitab AhmedBaset bermula sini (elak langgar islam-db 1..1400)

if (!existsSync(ROOT)) {
  console.error(`✗ ${ROOT} tiada. Jalankan dahulu: git clone AhmedBaset/hadith-json → data/hadith-json`);
  process.exit(1);
}

const lines = [];
let abId = OFFSET;
let nBook = 0, nHadith = 0, nEn = 0;

for (const folder of FOLDERS) {
  const dir = `${ROOT}/${folder}`;
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const d = JSON.parse(readFileSync(`${dir}/${file}`, "utf8"));
    abId++;
    nBook++;
    const slug = file.replace(/\.json$/, "");
    lines.push(JSON.stringify({
      type: "book", id: abId, source: "ahmedbaset",
      title: d.metadata?.arabic?.title ?? slug,
      title_en: d.metadata?.english?.title ?? null,
      author_ar: d.metadata?.arabic?.author ?? null,
    }));
    // peta chapterId → tajuk bab Arab
    const chapMap = new Map((d.chapters || []).map((c) => [c.id, c.arabic]));
    for (const h of d.hadiths || []) {
      const en = h.english
        ? `${h.english.narrator ? h.english.narrator + " " : ""}${h.english.text ?? ""}`.trim()
        : null;
      if (en) nEn++;
      lines.push(JSON.stringify({
        type: "hadith",
        book: abId,
        chapter: h.chapterId ?? 0,
        chapter_ar: chapMap.get(h.chapterId) ?? null,
        seq: h.idInBook ?? h.id,
        matn_ar: h.arabic ?? "",
        chain: [],                          // AhmedBaset tiada rantai berstruktur (isnad dlm teks)
        en,                                 // terjemahan EN sahih
        src_ref: `ab:${slug}:${h.idInBook ?? h.id}`,
      }));
      nHadith++;
    }
    console.log(`  ${slug}: ${d.hadiths?.length ?? 0} hadis`);
  }
}

writeFileSync(OUT, lines.join("\n") + "\n");
console.log(`✓ ${nBook} kitab · ${nHadith} hadis · ${nEn} terjemahan EN → ${OUT}`);

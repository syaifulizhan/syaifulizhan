// Importer Fasa A — AhmedBaset (9 kitab kanonik) -> Supabase/Postgres.
// Memuatkan: collections, hadiths (+ arabic_search), translations(en).
//
// Guna:
//   node scripts/import-hadith.mjs --dry-run   # uji transform + stats (tiada DB)
//   node scripts/import-hadith.mjs             # tulis ke DB (perlu DATABASE_URL)
//
// Data sumber dijangka di: data/hadith-json (lihat scripts/fetch-sources.sh)

import { readFileSync, readdirSync } from "node:fs";
import { normalizeArabic } from "./lib/arabic.mjs";

const DRY = process.argv.includes("--dry-run");
const BOOKS_DIR = "data/hadith-json/db/by_book/the_9_books";

// Peta nama fail -> id koleksi stabil (untuk padanan silang-sumber kelak)
const COLLECTION_ID = {
  bukhari: "sahih_al_bukhari",
  muslim: "sahih_muslim",
  tirmidhi: "jami_at_tirmidhi",
  nasai: "sunan_al_nasai",
  abudawud: "sunan_abu_dawud",
  ibnmajah: "sunan_ibn_majah",
  ahmed: "musnad_ahmad",
  malik: "al_muwatta_malik",
  darimi: "sunan_al_darimi",
};

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function englishText(en) {
  if (!en) return null;
  if (typeof en === "string") return en.trim() || null;
  const parts = [en.narrator, en.text].filter(Boolean);
  return parts.join(" ").trim() || null;
}

function loadBooks() {
  const files = readdirSync(BOOKS_DIR).filter((f) => f.endsWith(".json"));
  const out = [];
  for (const file of files) {
    const key = file.replace(/\.json$/, "");
    const book = JSON.parse(readFileSync(`${BOOKS_DIR}/${file}`, "utf8"));
    const collectionId = COLLECTION_ID[key] || slug(key);
    const chapterById = new Map(
      (book.chapters || []).map((c) => [c.id, c.arabic]),
    );
    out.push({
      collection: {
        id: collectionId,
        slug: slug(collectionId),
        name_ar: book.metadata?.arabic?.title || null,
        name_en: book.metadata?.english?.title || null,
        author_ar: book.metadata?.arabic?.author || null,
        author_en: book.metadata?.english?.author || null,
        book_order: book.id ?? null,
        total_hadith: book.hadiths?.length ?? 0,
      },
      hadiths: (book.hadiths || []).map((h) => ({
        collection_id: collectionId,
        number_in_collection: h.idInBook ?? h.id,
        arabic_text: h.arabic || "",
        arabic_search: normalizeArabic(h.arabic || ""),
        chapter_ar: chapterById.get(h.chapterId) || null,
        src_ahmedbaset_id: String(h.id),
        english: englishText(h.english),
      })),
    });
  }
  return out;
}

function stats(books) {
  let hadiths = 0,
    withEn = 0;
  for (const b of books) {
    hadiths += b.hadiths.length;
    withEn += b.hadiths.filter((h) => h.english).length;
  }
  return { collections: books.length, hadiths, withEn };
}

async function pushToDb(books) {
  const { default: pg } = await import("pg");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL tidak diset (lihat .env.local)");
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("set search_path to hadith, public");
    for (const b of books) {
      const c = b.collection;
      await client.query(
        `insert into collections (id,slug,name_ar,name_en,author_ar,author_en,book_order,total_hadith)
         values ($1,$2,$3,$4,$5,$6,$7,$8)
         on conflict (id) do update set total_hadith=excluded.total_hadith`,
        [c.id, c.slug, c.name_ar, c.name_en, c.author_ar, c.author_en, c.book_order, c.total_hadith],
      );
      // sisip hadith berkelompok + kumpul id untuk terjemahan
      for (const chunk of chunked(b.hadiths, 500)) {
        const rows = chunk.map((h) => [
          h.collection_id, h.number_in_collection, h.arabic_text,
          h.arabic_search, h.chapter_ar, h.src_ahmedbaset_id,
        ]);
        const { rows: ins } = await insertHadiths(client, rows);
        const enRows = [];
        chunk.forEach((h, i) => {
          if (h.english) enRows.push([ins[i].id, "en", h.english]);
        });
        if (enRows.length) await insertEnTranslations(client, enRows);
      }
      console.log(`✓ ${c.id}: ${b.hadiths.length} hadis`);
    }
  } finally {
    await client.end();
  }
}

function chunked(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function insertHadiths(client, rows) {
  const vals = [];
  const ph = rows
    .map((r, i) => {
      const b = i * 6;
      vals.push(...r);
      return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6})`;
    })
    .join(",");
  return client.query(
    `insert into hadiths
       (collection_id,number_in_collection,arabic_text,arabic_search,chapter_ar,src_ahmedbaset_id)
     values ${ph}
     on conflict (collection_id,number_in_collection) do update
       set arabic_text=excluded.arabic_text, arabic_search=excluded.arabic_search
     returning id`,
    vals,
  );
}

async function insertEnTranslations(client, rows) {
  // rows: [entity_id, lang, text]
  const flat = [];
  const ph = rows
    .map((r, i) => {
      const b = i * 3;
      flat.push(r[0], r[1], r[2]);
      return `('hadith',$${b + 1},$${b + 2},$${b + 3},'AhmedBaset',true)`;
    })
    .join(",");
  return client.query(
    `insert into translations (entity_type,entity_id,lang,text,source,is_verified)
     values ${ph}
     on conflict (entity_type,entity_id,lang,source) do update set text=excluded.text`,
    flat,
  );
}

async function main() {
  console.log(`Memuat data dari ${BOOKS_DIR} ...`);
  const books = loadBooks();
  const s = stats(books);
  console.log(
    `Koleksi: ${s.collections} · Hadis: ${s.hadiths} · Ada terjemahan EN: ${s.withEn}`,
  );
  if (DRY) {
    console.log("\n— DRY RUN: tiada penulisan ke DB —");
    for (const b of books) {
      console.log(
        `  ${b.collection.id.padEnd(20)} ${String(b.hadiths.length).padStart(6)} hadis  (${b.collection.name_ar})`,
      );
    }
    return;
  }
  await pushToDb(books);
  console.log("\nSelesai import Fasa A.");
}

main().catch((e) => {
  console.error("RALAT:", e.message);
  process.exit(1);
});

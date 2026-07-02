// Tarik INDEKS NAMA perawi otoritatif dari hawramani (موسوعة رواة الحديث) via
// WordPress REST API — akses TERUS ke DB mereka (tok syeikh kedua). ~100,915 entri.
// Fasa A: id + nama + slug (pantas). Biografi penuh (jarh-ta'dil) = HTML halaman, fasa B.
// Resumable (checkpoint halaman). Beradab (delay). Tulis LOKAL, 0 writes DB kita.
//   node scripts/fetch-hawramani.mjs
import { mkdirSync, existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";

const DIR = "data/hawramani"; mkdirSync(DIR, { recursive: true });
const OUT = `${DIR}/narrators.hawramani.jsonl`;
const PROG = `${DIR}/hawramani.progress.json`;
const BASE = "https://hadithtransmitters.hawramani.com/wp-json/wp/v2/posts";
const PER = 100;
const DELAY = 350;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let page = 1, got = 0;
if (existsSync(PROG)) { const p = JSON.parse(readFileSync(PROG, "utf8")); page = p.page || 1; got = p.got || 0; }
const decode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

// jumlah halaman
const head = await fetch(`${BASE}?per_page=${PER}&page=1&_fields=id`);
const totalPages = Number(head.headers.get("x-wp-totalpages") || 0);
const total = Number(head.headers.get("x-wp-total") || 0);
console.log(`hawramani: ${total} entri, ${totalPages} halaman (per ${PER}). Sambung dari halaman ${page}.`);

for (; page <= totalPages; page++) {
  let ok = false;
  for (let att = 0; att < 5 && !ok; att++) {
    try {
      const r = await fetch(`${BASE}?per_page=${PER}&page=${page}&_fields=id,title,slug,link`);
      if (r.status === 400) { ok = true; break; } // lepas halaman akhir
      if (!r.ok) throw new Error("HTTP " + r.status);
      const arr = await r.json();
      const lines = arr.map((d) => JSON.stringify({
        id: d.id,
        name_ar: (d.title?.rendered || "").replace(/<[^>]+>/g, "").trim(),
        slug: decode(d.slug || ""),
        url: d.link || "",
      }));
      if (lines.length) appendFileSync(OUT, lines.join("\n") + "\n");
      got += lines.length; ok = true;
      writeFileSync(PROG, JSON.stringify({ page: page + 1, got }));
      if (page % 25 === 0 || page === totalPages) process.stdout.write(`\r  halaman ${page}/${totalPages} · ${got} perawi   `);
    } catch (e) { await sleep(1500 * (att + 1)); }
  }
  await sleep(DELAY);
}
console.log(`\n✓ Siap: ${got} perawi hawramani → ${OUT}`);

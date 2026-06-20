import { load } from "cheerio";

// Label medan dalam panel "عن حياة الراوي" (teks bebas, label : nilai).
const LABELS = [
  "الأسم", "الشهرة", "الكنيه", "الكنية", "النسب",
  "الرتبة", "عاش في", "مات في", "مولي", "مولى",
  "الوظيفة", "توفي عام",
];

function parseInfoBlock(text) {
  const alt = LABELS.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`(${alt})\\s*:\\s*`, "g");
  const marks = [];
  let m;
  while ((m = re.exec(text))) marks.push({ label: m[1], valStart: re.lastIndex, start: m.index });
  const out = {};
  for (let i = 0; i < marks.length; i++) {
    const end = i + 1 < marks.length ? marks[i + 1].start : text.length;
    out[marks[i].label] = text
      .slice(marks[i].valStart, end)
      .trim()
      .replace(/[,،]\s*$/, "")
      .trim();
  }
  return out;
}

/**
 * Parse satu halaman perawi → objek, atau null jika bukan halaman perawi sah.
 */
export function parseNarrator(html, id) {
  const $ = load(html);
  const info = $("#collapseOne").text().replace(/\s+/g, " ").trim();
  const title = $("title").text().trim();
  const f = parseInfoBlock(info);
  const name = (f["الأسم"] || title.split(":").pop() || "").trim();
  if (!name) return null;

  // الجرح والتعديل — senarai <li> corak "<ulama> : <penilaian>"
  const grades = [];
  $("#collapse4 li").each((_, li) => {
    const t = $(li).text().replace(/\s+/g, " ").trim();
    if (!t) return;
    const idx = t.indexOf(" : ");
    if (idx > -1) grades.push({ scholar: t.slice(0, idx).trim(), verdict: t.slice(idx + 3).trim() });
    else grades.push({ scholar: null, verdict: t });
  });

  // murid/guru — table; sel nama/shuhra/rutbah.
  // NOTA: href panel pada islam-db buggy (sentiasa tunjuk id perawi semasa),
  // jadi id TIDAK disimpan — graf dibina dgn padan nama dalam build-sqlite.
  const readPeople = (sel) => {
    const people = [];
    $(sel).find("table tr").each((_, tr) => {
      if (!$(tr).find('a[href*="/narrators/"]').length) return; // langkau header
      const cells = $(tr).find("td").map((_, c) => $(c).text().replace(/\s+/g, " ").trim()).get();
      const name = (cells[0] || "").trim();
      if (name) people.push({ name, shuhra: cells[1] || null, rutbah: cells[2] || null });
    });
    return people;
  };

  const deathYear = /^\d+$/.test(f["توفي عام"] || "") ? Number(f["توفي عام"]) : null;

  return {
    id,
    name_ar: name,
    shuhra: f["الشهرة"] || null,
    kunya: f["الكنيه"] || f["الكنية"] || null,
    nisba: f["النسب"] || null,
    rutbah: f["الرتبة"] || null,
    profession: f["الوظيفة"] || null,
    regions: f["عاش في"] || null,
    mawla: f["مولي"] || f["مولى"] || null,
    death_year: deathYear,
    death_place: f["مات في"] || null,
    bio_ar: info || null,
    grades,
    teachers: readPeople("#collapse3"),
    students: readPeople("#collapseTwo"),
  };
}

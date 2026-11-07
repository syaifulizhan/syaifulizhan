// Halaman statik tambahan (tanpa React): laman utama, /hadis/, /perawi/ (indeks), /glosari/, cangkerang /cari/,
// hasil carian /x/cari/ dan 404. Fungsi tulen — dipakai scripts/gen-pages-static.mjs (masa build) dan worker.ts.
import { T } from "../lib/i18n.ts";
import { shell, nav, footer, L, esc, pager, withQuery, perawiHref } from "./templates.mjs";

// ── Carian ────────────────────────────────────────────────────────────
export const CARI_ACTION = "/x/cari/";
export const CARI_JENIS = ["hadis", "perawi", "kitab"];
export const CARI_Q_MAX = 100;
/** Setiap jenis: bilangan setiap halaman dan had keputusan (kos DB terhad: count dipotong pada `cap`). */
export const CARI = {
  hadis: { per: 40, cap: 200 },
  perawi: { per: 60, cap: 300 },
  kitab: { per: 40, cap: 200 },
};
const JENIS_LABEL = { hadis: T.navHadis, perawi: T.navPerawi, kitab: T.searchKitab };

// SQL dikongsi Worker dan harness ujian. Args: [match|q, ...] lihat worker.ts.
export const CARI_SQL = {
  hadisCount: (cap) => `SELECT count(*) AS total FROM (SELECT rowid FROM hadiths_fts WHERE hadiths_fts MATCH ? LIMIT ${Number(cap)})`,
  hadisRows: `SELECT h.id, h.chapter_ar, h.matn_ar, b.title_ar AS book FROM hadiths_fts f JOIN hadiths h ON h.id = f.rowid
               LEFT JOIN books b ON b.id = h.book_id WHERE hadiths_fts MATCH ? ORDER BY f.rowid LIMIT ? OFFSET ?`,
  hadisLike: `SELECT h.id, h.chapter_ar, h.matn_ar, b.title_ar AS book FROM hadiths h LEFT JOIN books b ON b.id = h.book_id
               WHERE h.matn_search LIKE '%' || ? || '%' LIMIT ?`,
  perawiCount: (cap) => `SELECT count(*) AS total FROM (SELECT rowid FROM narrators_fts WHERE narrators_fts MATCH ? LIMIT ${Number(cap)})`,
  perawiRows: `SELECT n.id, n.name_ar, n.rutbah, n.death_year FROM narrators_fts f JOIN narrators n ON n.id = f.rowid
                WHERE narrators_fts MATCH ? ORDER BY f.rowid LIMIT ? OFFSET ?`,
  kitabCount: (cap) => `SELECT count(*) AS total FROM (SELECT id FROM books WHERE title_ar LIKE '%' || ? || '%' OR title_en LIKE '%' || ? || '%' LIMIT ${Number(cap)})`,
  kitabRows: `SELECT id, title_ar, COALESCE(total_hadith, 0) AS n FROM books
               WHERE title_ar LIKE '%' || ? || '%' OR title_en LIKE '%' || ? || '%' ORDER BY n DESC, id LIMIT ? OFFSET ?`,
};

/** Teks carian kitab: buang kawalan/`%`/`_`/`\`, runtuh ruang, potong. Dibandingkan LIKE tanpa kes. */
export const kitabQuery = (raw) =>
  String(raw ?? "").replace(/[\u0000-\u001f\u007f%_\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, CARI_Q_MAX);

const JENIS_OPTS = [["hadis", T.navHadis], ["perawi", T.navPerawi], ["kitab", T.searchKitab]];

/** Borang carian GET (tanpa JS) menuju ke Worker. big = gaya besar. */
export function searchForm({ big = false, jenis = "hadis", q = "" } = {}) {
  const ph = T.searchPlaceholder;
  return (
    `<form class="searchbox${big ? " big" : ""}" action="${CARI_ACTION}" method="get" role="search">` +
    `<select name="jenis" aria-label="${esc(T.searchTitle.bm)}">` +
    JENIS_OPTS.map(([v, t]) => `<option value="${v}"${v === jenis ? " selected" : ""} data-tx-bm="${esc(t.bm)}" data-tx-en="${esc(t.en)}" data-tx-ar="${esc(t.ar)}">${esc(t.bm)}</option>`).join("") +
    `</select><input name="q" value="${esc(q)}" maxlength="${CARI_Q_MAX}" required autocomplete="off" aria-label="${esc(T.searchTitle.bm)}" ` +
    `placeholder="${esc(ph.bm)}" data-ph-bm="${esc(ph.bm)}" data-ph-en="${esc(ph.en)}" data-ph-ar="${esc(ph.ar)}">` +
    `<button type="submit" class="btn solid">${L(T.searchBtn)}</button></form>`
  );
}

const NOINDEX = '<meta name="robots" content="noindex, nofollow">';
// URL lama /cari/?q=…&type=… (pautan simpanan) dilencongkan ke Worker oleh pelayar.
const CARI_REDIRECT =
  'var s=new URLSearchParams(location.search),q=s.get("q");if(q){var t=s.get("jenis")||s.get("type");' +
  't=t==="perawi"||t==="kitab"?t:"hadis";location.replace("' + CARI_ACTION + '?jenis="+t+"&q="+encodeURIComponent(q.slice(0,' + CARI_Q_MAX + ')))}';

/** Cangkerang /cari/ (aset statik). */
export function cariShellPage(cssHrefs) {
  const body = nav() + `<main class="pwrap"><div class="psec-t">${L(T.searchTitle)}</div>${searchForm({ big: true })}` +
    `<p class="pempty">${L(T.searchPrompt)}</p></main>` + footer();
  return shell({ title: "Cari | Dewan Izhan", description: "Cari hadis, perawi dan kitab dalam korpus Dewan Izhan.", canonical: "/cari/", cssHrefs, body, head: NOINDEX, script: CARI_REDIRECT });
}

const hadithCard = (r) =>
  `<a href="/x/h/${Number(r.id)}/#h-${Number(r.id)}" class="hcard" style="display:block">` +
  (r.book ? `<div class="hchap ar">${esc(r.book)}${r.chapter_ar ? ` — ${esc(r.chapter_ar)}` : ""}</div>` : "") +
  `<div class="hmatn ar" style="font-size:1.25rem;margin-bottom:0">${esc(r.matn_ar)}</div></a>`;
const narratorRow = (e) =>
  `<a href="${perawiHref(e.id)}" class="pn"><span class="dot"></span><span class="pn-nm ar">${esc(e.name_ar)}</span><span class="pn-meta">${esc(e.rutbah ?? "")}</span></a>`;
const bookTile = (b) =>
  `<a href="/kitab/${Number(b.id)}/" class="hbook"><span class="t ar">${esc(b.title_ar)}</span><span class="n">${Number(b.n).toLocaleString("en-US")} ${L(T.hadisCount)}</span></a>`;

const CAPPED = { bm: "(had paparan)", en: "(display limit)", ar: "(حدّ العرض)" };

/** Hasil /x/cari/. d = { jenis, q (nilai kanonik), rows, total, page }. */
export function cariResultsPage(d, cssHrefs) {
  const { jenis, q, rows, total, page } = d;
  const { per, cap } = CARI[jenis];
  const totalPages = Math.max(1, Math.ceil(total / per));
  const list =
    jenis === "hadis" ? rows.map(hadithCard).join("")
    : jenis === "perawi" ? `<div class="presults">${rows.map(narratorRow).join("")}</div>`
    : `<div class="hbooks">${rows.map(bookTile).join("")}</div>`;
  const body =
    nav() + `<main class="pwrap"><div class="psec-t">${L(T.searchTitle)}</div>${searchForm({ big: true, jenis, q })}` +
    (q
      ? `<div class="psec-t" style="margin-top:8px">${L(T.searchResults)}: ${total.toLocaleString("en-US")}${total >= cap ? ` ${L(CAPPED)}` : ""} · ${L(JENIS_LABEL[jenis])} · “${esc(q)}”` +
        (totalPages > 1 ? ` · ${page} / ${totalPages}` : "") + `</div>`
      : "") +
    list +
    (q && total === 0 ? `<p class="pempty">${L(T.searchNone)} “${esc(q)}”</p>` : "") +
    (!q ? `<p class="pempty">${L(T.searchPrompt)}</p>` : "") +
    pager(page, totalPages, (p) => withQuery(CARI_ACTION, { jenis, q }, p)) +
    `</main>` + footer();
  return shell({ title: `${q ? `“${q}” — ` : ""}Cari | Dewan Izhan`, description: "Hasil carian Dewan Izhan.", canonical: "/cari/", cssHrefs, body, head: NOINDEX });
}

// ── 404 ───────────────────────────────────────────────────────────────
const NF = { bm: "Halaman tidak ditemui.", en: "Page not found.", ar: "الصفحة غير موجودة." };
const NF_HOME = { bm: "Kembali ke laman utama", en: "Back to the home page", ar: "العودة إلى الصفحة الرئيسية" };
export function notFoundPage(cssHrefs) {
  const body = nav() + `<main class="pwrap"><div class="psec-t">404</div><p class="pempty">${L(NF)}</p>` +
    `<p class="pempty"><a href="/">${L(NF_HOME)}</a></p></main>` + footer();
  return shell({ title: "404 | Dewan Izhan", description: "Halaman tidak ditemui", canonical: "/404/", cssHrefs, body, head: '<meta name="robots" content="noindex">' });
}

// ── /hadis/ ───────────────────────────────────────────────────────────
export const HADIS_SQL = {
  books: `SELECT id, title_ar, COALESCE(total_hadith, 0) n FROM books
           ORDER BY CASE id
             WHEN 900003 THEN 1 WHEN 900007 THEN 2 WHEN 900001 THEN 3 WHEN 900009 THEN 4
             WHEN 900008 THEN 5 WHEN 900005 THEN 6 WHEN 900006 THEN 7 WHEN 900002 THEN 8
             WHEN 900004 THEN 9 ELSE 900 + (1000000 - COALESCE(total_hadith, 0)) / 1000 END,
             n DESC, id LIMIT ?`,
  total: "SELECT count(*) c FROM hadiths",
};
export const HADIS_BOOKS = 60;

const indexSearch = (jenis, ph) =>
  `<form class="psearch" action="${CARI_ACTION}" method="get" role="search"><input type="hidden" name="jenis" value="${jenis}">` +
  `<input name="q" maxlength="${CARI_Q_MAX}" required autocomplete="off" aria-label="${esc(ph.bm)}" placeholder="${esc(ph.bm)}" data-ph-bm="${esc(ph.bm)}" data-ph-en="${esc(ph.en)}" data-ph-ar="${esc(ph.ar)}">` +
  `<button class="btn solid" type="submit">${L(T.searchBtn)}</button></form>`;
// /hadis/?q=… dan /perawi/?q=… lama → /x/cari/ (aset statik tidak nampak query string).
const indexRedirect = (jenis) =>
  `var q=new URLSearchParams(location.search).get("q");if(q)location.replace("${CARI_ACTION}?jenis=${jenis}&q="+encodeURIComponent(q.slice(0,${CARI_Q_MAX})));`;
const H1_STYLE = 'style="font-family:var(--display);font-size:2.4rem;margin-bottom:6px"';

export function hadisIndexPage({ books, total }, cssHrefs) {
  const body = nav() +
    `<main class="pwrap"><div class="psec-t">${L(T.hadisExplorer)}</div><h1 ${H1_STYLE}>${L(T.navHadis)}</h1>` +
    `<p style="color:var(--muted);margin-bottom:24px">${total.toLocaleString("en-US")} ${L(T.inCorpus)}</p>` +
    indexSearch("hadis", T.searchPlaceholder) +
    `<div class="psec-t">${L(T.searchKitab)}</div><div class="hbooks">${books.map(bookTile).join("")}</div></main>` + footer();
  return shell({
    title: "Hadis | Dewan Izhan", canonical: "/hadis/", cssHrefs, body, script: indexRedirect("hadis"),
    description: `${total.toLocaleString("en-US")} hadis dalam korpus — telusuri mengikut kitab, dengan sanad, takhrij dan darjat.`,
  });
}

// ── /perawi/ (indeks) ─────────────────────────────────────────────────
export const PERAWI_INDEX_SQL = {
  first: "SELECT id, name_ar, rutbah, death_year FROM narrators ORDER BY id LIMIT ?",
  total: "SELECT count(*) c FROM narrators",
};
export const PERAWI_INDEX_N = 60;

export function perawiIndexPage({ rows, total }, cssHrefs) {
  const body = nav() +
    `<main class="pwrap"><div class="psec-t">${L(T.perawiExplorer)}</div><h1 ${H1_STYLE}>${L(T.perawiH1)}</h1>` +
    `<p style="color:var(--muted);margin-bottom:24px">${total.toLocaleString("en-US")} ${L(T.narrInCorpus)}</p>` +
    indexSearch("perawi", T.perawiPlaceholder) +
    `<div class="presults">${rows.map(narratorRow).join("")}</div></main>` + footer();
  return shell({
    title: "Perawi Hadis | Dewan Izhan", canonical: "/perawi/", cssHrefs, body, script: indexRedirect("perawi"),
    description: `${total.toLocaleString("en-US")} perawi hadis — maklumat, Jarh wa Taʿdil, guru dan murid.`,
  });
}

// ── /glosari/ ─────────────────────────────────────────────────────────
export const GLOSARI_SQL = "SELECT term_ar, huruf, translit, term_ms, term_en, def_ar, def_ms, def_en FROM glossary ORDER BY term_ar";

// Salinan tepat GlossarySearch.tsx lama: kunci susunan Arab, susunan abjad. (Penapis: public/static-glosari.js.)
const HARAKAT_RE = /[ً-ْٰـ]/g;
const sortKey = (term) => {
  let t = (term || "").replace(HARAKAT_RE, "").replace(/^[«»"'()\s]+/, "");
  if (t.startsWith("ال")) t = t.slice(2);
  return t.replace(/[آأإ]/g, "ا").replace(/[ىئ]/g, "ي").replace(/ؤ/g, "و").replace(/ة/g, "ه").trim();
};
const ARABIC_ORDER = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي";
const rank = (h) => { const i = ARABIC_ORDER.indexOf(h); return i === -1 ? ARABIC_ORDER.length : i; };

const glosCard = (t) => {
  return (
    `<article class="glos-card"><div class="glos-head"><span class="glos-ar ar">${esc(t.term_ar)}</span>` +
    (t.translit ? `<span class="glos-tr">${esc(t.translit)}</span>` : "") + `</div>` +
    (t.def_ar ? `<p class="glos-line"><span class="glos-lang">ع</span><span class="glos-def ar" style="direction:rtl;color:var(--paper)">${esc(t.def_ar)}</span></p>` : "") +
    (t.term_ms || t.def_ms
      ? `<p class="glos-line"><span class="glos-lang">BM</span>${t.term_ms ? `<b class="glos-term">${esc(t.term_ms)}</b>` : ""}${t.def_ms ? `<span class="glos-def"> — ${esc(t.def_ms)}</span>` : ""}</p>` : "") +
    (t.term_en || t.def_en
      ? `<p class="glos-line"><span class="glos-lang">EN</span>${t.term_en ? `<b class="glos-term">${esc(t.term_en)}</b>` : ""}${t.def_en ? `<span class="glos-def"> — ${esc(t.def_en)}</span>` : ""}</p>` : "") +
    `</article>`
  );
};

export function glosariPage({ terms }, cssHrefs) {
  const groups = new Map();
  for (const t of terms) {
    const h = t.huruf || "—";
    if (!groups.has(h)) groups.set(h, []);
    groups.get(h).push(t);
  }
  for (const [, items] of groups) items.sort((a, b) => sortKey(a.term_ar).localeCompare(sortKey(b.term_ar), "ar"));
  const ordered = [...groups.entries()].sort((a, b) => rank(a[0]) - rank(b[0]));
  const sp = T.glosariSearch;
  const body = nav() +
    `<main class="pwrap"><div class="psec-t">${L(T.glosariTitle)}</div><h1 ${H1_STYLE}>${L(T.glosariH1)}</h1>` +
    `<p style="color:var(--muted);margin-bottom:28px;max-width:620px">${L(T.glosariDesc)} ${terms.length} ${L(T.istilahWord)}.</p>` +
    (terms.length
      ? `<div class="psearch" style="margin-bottom:22px"><input id="glos-q" type="search" autocomplete="off" aria-label="${esc(sp.bm)}" placeholder="${esc(sp.bm)}" ` +
        `data-ph-bm="${esc(sp.bm)}" data-ph-en="${esc(sp.en)}" data-ph-ar="${esc(sp.ar)}"></div><div id="glos-list">` +
        ordered.map(([h, items]) => `<section style="margin-bottom:8px"><div class="glos-letter ar">${esc(h)}</div>${items.map(glosCard).join("")}</section>`).join("") +
        `</div><p class="pempty" id="glos-none" hidden>${L(T.glosariNoMatch)}</p>`
      : `<p class="pempty">${L(T.glosariEmpty)}</p>`) +
    `</main>` + footer();
  return shell({
    title: "Glosari Istilah Hadis | Dewan Izhan", canonical: "/glosari/", cssHrefs, body,
    description: `Kamus ${terms.length} istilah ʿulūm al-hadith — teks Arab, transliterasi, terjemahan dan definisi.`,
    scripts: '<script src="/static-glosari.js" defer></script>',
  });
}

// ── Laman utama ───────────────────────────────────────────────────────
const FOR_SEGS = {
  bm: ["Masjid & surau", "Sekolah & pondok", "Duʿat & pencipta konten", "Pertubuhan Islam"],
  en: ["Mosques", "Schools & pondok", "Content creators & duʿāt", "Islamic organisations"],
  ar: ["المساجد", "المدارس والمعاهد", "الدعاة وصنَّاع المحتوى", "المؤسسات الإسلامية"],
};
const CARDS = [
  ["I.", "عِلْمُ الحَدِيث", "card1H3", "card1P"],
  ["II.", "عِلْمُ الرِّوَايَة", "card2H3", "card2P"],
  ["III.", "المَقَالَات", "card3H3", "card3P"],
];
const PILLARS = [["pillar1H4", "pillar1P"], ["pillar2H4", "pillar2P"], ["pillar3H4", "pillar3P"]];
const SILSILAH = { bm: "Penjana Syajarat al-Isnad", en: "Isnad Tree Generator", ar: "مُوَلِّد شجرة الإسناد" };
const SILSILAH_LEAD = { bm: "Tampal mana-mana sanad.", en: "Paste any sanad.", ar: "الصق أيَّ إسناد." };
export const SILSILAH_HREF = "/silsilah/";

const STAR_PATTERN =
  '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><pattern id="khatam" width="64" height="64" patternUnits="userSpaceOnUse">' +
  '<g fill="none" stroke="#C7A338" stroke-width="1"><rect x="19" y="19" width="26" height="26"/><rect x="19" y="19" width="26" height="26" transform="rotate(45 32 32)"/>' +
  [[0, 0], [64, 0], [0, 64], [64, 64]].map(([cx, cy]) => `<g><rect x="${cx - 13}" y="${cy - 13}" width="26" height="26"/><rect x="${cx - 13}" y="${cy - 13}" width="26" height="26" transform="rotate(45 ${cx} ${cy})"/></g>`).join("") +
  "</g></pattern></defs></svg>";

export function homePage(cssHrefs) {
  const body =
    STAR_PATTERN + nav() +
    `<section class="hero" id="beranda"><div class="bg-pattern" aria-hidden="true"></div><div class="wrap"><div class="unwan">` +
    ["tl", "tr", "bl", "br"].map((c) => `<span class="awn-corner ${c}">۞</span>`).join("") +
    `<div class="basmala">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div><div class="hero-ar-name"><span class="hero-ar-diwan">دِيوَان الإِذهَان</span>` +
    `<span class="hero-ar-person">مُحَمَّد سَيْف الإِذهَان</span></div><h1>${L(T.heroH1, true)}</h1><div class="hero-sub">${L(T.heroSub)}</div>` +
    `<p class="hero-thesis">${L(T.heroThesis, true)}</p><div class="cta-row"><a class="btn solid" href="${SILSILAH_HREF}">${L(T.heroCta1)}</a>` +
    `<a class="btn ghost" href="#ilmu">${L(T.heroCta2)}</a></div></div></div></section>` +
    `<section class="searchband"><div class="wrap searchband-in"><div class="eyebrow">${L(T.searchTitle)}</div><h2 class="searchband-h">${L(T.searchBandH)}</h2>${searchForm({ big: true })}</div></section>` +
    `<section class="sanad" id="silsilah"><div class="wrap sanad-in"><span class="eyebrow">۞ ${L(SILSILAH)}</span><p class="sanad-lead">${L(SILSILAH_LEAD)}</p>` +
    `<div class="cta-row"><a class="btn" href="${SILSILAH_HREF}">${L(T.heroCta1)}</a></div></div></section>` +
    `<section class="ilmu" id="ilmu"><div class="wrap"><div class="sec-head"><span class="eyebrow">${L(T.ilmuEyebrow)}</span><h2>${L(T.ilmuH2)}</h2><p>${L(T.ilmuP)}</p></div><div class="cards">` +
    CARDS.map(([num, ar, h, p]) => `<div class="card"><div class="card-num">${num}</div><div class="card-ar">${ar}</div><h3>${L(T[h])}</h3><p>${L(T[p])}</p></div>`).join("") +
    `</div></div></section>` +
    `<section class="tentang" id="tentang"><div class="wrap"><div class="about-grid"><div class="about-copy"><span class="eyebrow">${L(T.aboutEyebrow)}</span>` +
    `<h2>${L(T.aboutH2, true)}</h2><p>${L(T.aboutP1, true)}</p><p>${L(T.aboutP2, true)}</p></div><div class="trinity">` +
    PILLARS.map(([h, p]) => `<div class="pillar"><h4>${L(T[h])}</h4><p>${L(T[p])}</p></div>`).join("") +
    `</div></div></div></section>` +
    `<section class="khidmat" id="khidmat"><div class="bg-pattern" aria-hidden="true"></div><div class="wrap kh-in"><span class="kh-tab">${L(T.khTab)}</span>` +
    `<h2>${L(T.khH2, true)}</h2><p class="kh-lead">${L(T.khLead)}</p><div class="for-row">` +
    ["bm", "en", "ar"].map((l) => FOR_SEGS[l].map((s) => `<span class="${l === "bm" ? "lb" : l === "en" ? "le" : "la ar"}">${esc(s)}</span>`).join("")).join("") +
    `</div><a class="btn solid" href="#khidmat">${L(T.khCta)}</a><p class="proof">${L(T.khProof, true)}</p></div></section>` +
    footer();
  return shell({
    title: "Dewan Izhan", canonical: "/", cssHrefs, body, scripts: "<script>document.body.setAttribute('data-splash','1')</script>",
    description: "Hadis dibawa dengan sanad, takhrij dan darjatnya — telus, teliti, dalam bahasa kita. Platform ilmu riwayah dan perkhidmatan digital oleh Muhammad Syaiful Izhan.",
  });
}

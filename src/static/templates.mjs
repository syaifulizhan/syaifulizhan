// Templat HTML statik (tanpa React) — dikongsi oleh scripts/gen-kitab-static.mjs (masa build)
// dan, pada fasa 2, worker.ts. Fungsi tulen: data masuk, rentetan HTML keluar.
//
// Bahasa: SATU HTML untuk semua bahasa. Label dipancarkan dalam tiga <span> (lb/le/la);
// CSS `html[data-lang]` memilih satu. Skrip kecil dalam <head> membaca cookie `lang`.
import { T } from "../lib/i18n.ts";
import { cleanName, isMarfu } from "../lib/parse-isnad.ts";

export const PER_PAGE = 20;
export const ORIGIN = "https://syaifulizhan.my";

export const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Label trilingual. `html` = nilai sudah mengandungi markup tepercaya (cth <em> dalam T.brandMain). */
export const L = (t, html = false) => {
  const f = html ? (x) => x : esc;
  return `<span class="lb">${f(t.bm)}</span><span class="le">${f(t.en)}</span><span class="la ar">${f(t.ar)}</span>`;
};

const LANG_CSS =
  'html[data-lang="bm"] .le,html[data-lang="bm"] .la,html[data-lang="en"] .lb,html[data-lang="en"] .la,' +
  'html[data-lang="ar"] .lb,html[data-lang="ar"] .le,html:not([data-lang]) .le,html:not([data-lang]) .la{display:none}' +
  "[hidden]{display:none!important}.btoggle-tr[data-l=en]{direction:ltr;font-style:italic}";

const LANG_SCRIPT =
  'var m=document.cookie.match(/(?:^|;\\s*)lang=(en|ar|bm)/),l=m?m[1]:"bm",d=document.documentElement;d.setAttribute("data-lang",l);d.lang=l=="bm"?"ms":l;';

const FONTS =
  "https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=IBM+Plex+Sans:wght@300;400;500;600&family=Amiri:ital,wght@0,400;0,700;1,400&display=swap";

/** Cangkerang halaman penuh. `cssHrefs` = fail CSS Next yang dibina (dicari oleh penjana). */
export function shell({ title, description, canonical, cssHrefs, body, head = "", script = "" }) {
  const css = cssHrefs.map((h) => `<link rel="stylesheet" href="${esc(h)}">`).join("");
  return (
    `<!DOCTYPE html><html lang="ms" dir="ltr" class="h-full antialiased"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title>` +
    `<meta name="description" content="${esc(description)}"><link rel="canonical" href="${esc(ORIGIN + canonical)}">` +
    `<meta property="og:title" content="${esc(title)}"><meta property="og:site_name" content="Dewan Izhan">` +
    `<meta property="og:image" content="/og.png"><link rel="icon" href="/favicon.ico">` +
    `<script>${LANG_SCRIPT}${script}</script>${css}<style>${LANG_CSS}</style>` +
    `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` +
    `<link rel="stylesheet" href="${FONTS}">${head}</head><body>${body}<script src="/static-kitab.js" defer></script></body></html>`
  );
}

export function nav() {
  const a = (href, t) => `<li><a href="${href}">${L(t)}</a></li>`;
  return (
    `<header class="nav"><div class="wrap nav-in"><a class="brand" href="/"><img class="brand-mark" src="/logo-mark.png" alt="" aria-hidden="true">` +
    `<span><span class="brand-main">${L(T.brandMain, true)}</span></span></a><div class="nav-right"><nav class="nav-menu"><ul>` +
    a("/perawi/", T.navPerawi) + a("/hadis/", T.navHadis) + a("/glosari/", T.navGlosari) +
    a("/#ilmu", T.navIlmu) + a("/#tentang", T.navTentang) + a("/#khidmat", T.navKhidmat) +
    `</ul></nav><div class="lang-sw" role="group" aria-label="Language">` +
    `<button type="button" class="lang-btn" data-l="ar">ع</button><button type="button" class="lang-btn" data-l="bm">BM</button>` +
    `<button type="button" class="lang-btn" data-l="en">EN</button></div>` +
    `<button type="button" class="nav-burger" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>` +
    `</div></div></header>`
  );
}

const HANDLES = ["X · @syaifulizhan", "YouTube · @syaifulizhann", "TikTok · @syaifulizhan", "Telegram · @syaifulizhan", "Threads · @syaifulizhan"];
const REFS = [
  ["Dewan Bahasa & Pustaka", "https://prpm.dbp.gov.my"],
  ["Kamus Arab–Melayu", "https://www.almaany.com/ms/dict/ar-ms/"],
  ["Kamus Melayu–Inggeris", "https://prpm.dbp.gov.my"],
];

export function footer() {
  return (
    `<footer><div class="wrap"><div class="foot-in"><div class="foot-brand"><b>۞ ${L(T.brandMain, true)}</b>` +
    `<div class="foot-ar lb le">دِيوَان الإِذهَان</div><p>${L(T.footP)}</p></div>` +
    `<div class="handles">${HANDLES.map((h) => `<a href="#">${esc(h)}</a>`).join("")}</div>` +
    `<div class="handles"><span class="foot-reflabel">${L(T.footRujukan)}</span>` +
    REFS.map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${esc(n)}</a>`).join("") +
    `</div></div><div class="copyr">© 2026 Muhammad Syaiful Izhan · syaifulizhan.my</div></div></footer>`
  );
}

// ── Komponen hadis ────────────────────────────────────────────────────
const GRADES = {
  Sahih: ["صحيح", "Sahih", "#2ecc71"],
  Hasan: ["حسن", "Hasan", "#3f8fbf"],
  "Da'if": ["ضعيف", "Da'if", "#c77f33"],
  "Maudu'": ["موضوع", "Maudu'", "#9e3b2e"],
  "Mawdu'": ["موضوع", "Maudu'", "#9e3b2e"],
  Munkar: ["منكر", "Munkar", "#b5562e"],
  Shadh: ["شاذ", "Syaz", "#c77f33"],
};

function gradeBadge(grade) {
  if (!grade) return "";
  const [ar, ms, c] = GRADES[grade] ?? ["", grade, "var(--muted)"];
  return (
    `<span class="hgrade" style="--gc:${c}" title="${esc(T.gradeLabel.bm)}: ${esc(ms)}"><span class="hgrade-dot"></span>` +
    (ar ? `<span class="ar hgrade-ar">${ar}</span>` : "") + `<span class="hgrade-ms">${esc(ms)}</span></span>`
  );
}

function bilingual(tr) {
  const p = (l, text, verified, flag) =>
    text ? `<p class="btoggle-tr" data-l="${l}" hidden>${esc(text)}${verified ? "" : `<span class="btoggle-flag">${flag}</span>`}</p>` : "";
  return (
    `<div class="btoggle"><div class="btoggle-row"><button class="btoggle-btn active" data-l="ar">العربية</button>` +
    `<button class="btoggle-btn" data-l="ms">+ Melayu</button><button class="btoggle-btn" data-l="en">+ English</button></div>` +
    (tr ? p("ms", tr.ms, tr.ms_verified, "draf — belum disemak") + p("en", tr.en, tr.en_verified, "draft — unverified") : "") +
    `</div>`
  );
}

function isnad(nodes, matn) {
  if (!nodes.length) return "";
  const chains = new Map();
  for (const nd of nodes) {
    if (!chains.has(nd.chain_no)) chains.set(nd.chain_no, new Map());
    const pos = chains.get(nd.chain_no);
    if (!pos.has(nd.position)) pos.set(nd.position, []);
    pos.get(nd.position).push(nd);
  }
  const chainArr = [...chains.entries()].sort((a, b) => a[0] - b[0]);
  const matched = nodes.filter((n) => n.resolved).length;
  const marfu = isMarfu(matn);
  let out = `<section class="hisnad-d hisnad-open"><div class="hisnad-t">${L(T.chainTitle)}`;
  if (chainArr.length > 1) out += `<span class="hisnad-n">${chainArr.length} ${L(T.isnadSanad)} · taḥwīl</span>`;
  if (matched > 0) out += `<span class="hisnad-n">${matched} ${L(T.isnadLinked)}</span>`;
  out += `</div>`;
  chainArr.forEach(([, posMap], ci) => {
    const positions = [...posMap.entries()].sort((a, b) => a[0] - b[0]);
    out += `<div class="hisnad-chain">`;
    if (chainArr.length > 1) out += `<span class="hisnad-br">${L(T.isnadSanad)} ${ci + 1}</span>`;
    out += `<div class="hisnad">`;
    positions.forEach(([, parallel], pi) => {
      out += `<span class="hisnad-pos">`;
      parallel.forEach((nd, k) => {
        const name = nd.raw_name ? cleanName(nd.raw_name) : null;
        out += nd.resolved
          ? `<a href="/perawi/${Number(nd.narrator_id)}/" class="hnode" title="${esc(nd.resolved)}">${esc(name ?? nd.resolved)}</a>`
          : `<span class="hnode unl">${esc(name ?? `#${Number(nd.narrator_id)}`)}</span>`;
        if (k < parallel.length - 1) out += `<span class="hsep-w">و</span>`;
      });
      out += `</span>`;
      if (pi < positions.length - 1) out += `<span class="hsep">عن</span>`;
    });
    if (marfu) out += `<span class="hsep">←</span><span class="hnode" style="color:var(--gold-soft);border-color:var(--gold)">النبي ﷺ</span>`;
    out += `</div></div>`;
  });
  return out + `</section>`;
}

const PRIMARY_NOTE = { bm: "kitab ini", en: "this book", ar: "هذا الكتاب" };

/** Satu baris hukum/takhrij (sama ada dipancar server atau dibina JS dalam /static-kitab.js). */
export function rulingItem(r) {
  const src = r.source_book ? `${esc(r.source_book)}${r.ref ? " " + esc(r.ref) : ""}` : "";
  return (
    `<li class="${r.is_primary ? "rul-item rul-primary" : "rul-item"}"><div class="rul-main">` +
    (r.hukm ? `<span class="rul-verdict ar">${esc(r.hukm)}</span>` : "") +
    `<span class="rul-attr ar">${r.is_primary ? `<span class="rul-star">★</span>` : ""}` +
    (r.muhaddith ? `<b class="rul-mhd">${esc(r.muhaddith)}</b>` : "") +
    (src ? (r.href ? `<a class="rul-link" href="${esc(r.href)}">${src}<span class="rul-go"> ↗</span></a>` : `<span class="rul-src">${src}</span>`) : "") +
    `</span></div>` +
    (r.rawi || r.is_primary
      ? `<div class="rul-sub ar">${r.rawi ? `<span class="rul-rawi">${esc(r.rawi)}</span>` : ""}${r.is_primary ? `<span class="rul-badge">${L(PRIMARY_NOTE)}</span>` : ""}</div>`
      : "") +
    `</li>`
  );
}

/** Pisahkan hukum kepada yang dipaparkan dahulu (primer, atau satu pertama) dan yang dilipat. */
export function splitRulings(rulings) {
  const head = rulings.filter((r) => r.is_primary);
  return head.length
    ? { shown: head, hidden: rulings.filter((r) => !r.is_primary) }
    : { shown: rulings.slice(0, 1), hidden: rulings.slice(1) };
}

const RUL_HEAD = { bm: "Takhrij & Hukum", en: "Takhrij & Rulings", ar: "التخريج والأحكام" };

// Hukum yang dilipat TIDAK dipancar (1.1 juta baris korpus): dimuat oleh JS dari /api/rulings.
function rulings(shown, hiddenCount, hadithId) {
  if (!shown.length) return "";
  return (
    `<section class="rul"><div class="rul-head">۞ ${L(RUL_HEAD)}</div><ul class="rul-list">${shown.map(rulingItem).join("")}</ul>` +
    (hiddenCount > 0
      ? `<button class="rul-toggle" aria-expanded="false" data-h="${hadithId}" data-n="${hiddenCount}">▾ ${hiddenCount}</button>`
      : "") +
    `</section>`
  );
}

const SHARAH_HEAD = { bm: "Syarah", en: "Commentary", ar: "الشرح" };
const OPEN = { bm: "Buka", en: "Open", ar: "افتح" };
const BAB = { bm: "bab", en: "chapters", ar: "باب" };

function hadithSyarah(bookId, bab) {
  if (!bab?.bab_title || !bab.kitab_title) return "";
  return (
    `<div class="hsy"><button class="hsy-head" aria-expanded="false" data-book="${bookId}" data-kt="${esc(bab.kitab_title)}" data-bab="${esc(bab.bab_title)}">` +
    `<span class="hsy-mark">۞</span><span class="hsy-label">${L(SHARAH_HEAD)}</span>` +
    `<span class="hsy-bab ar">${esc(bab.bab_title.replace(/^[\d٠-٩]+\s*-\s*/, ""))}</span><span class="hsy-cnt">${L(OPEN)}</span></button></div>`
  );
}

const suggestForm = (id, entity = "hadith", field = "matn", current = "") =>
  `<div class="suggest" data-h="${esc(id)}" data-e="${entity}" data-f="${field}"${current ? ` data-cur="${esc(current)}"` : ""}><button class="suggest-toggle" type="button">✎ ${L(T.suggestBtn)}</button></div>`;

/** URL halaman kitab statik. Halaman 1 = /kitab/<id>/. */
export const pageHref = (bookId, p) => `/kitab/${bookId}/${p > 1 ? `${p}/` : ""}`;

function pagination(bookId, page, totalPages) {
  if (totalPages <= 1) return "";
  const pages = [];
  const win = 2;
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= page - win && p <= page + win)) pages.push(p);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }
  return (
    `<nav class="pgn" aria-label="Halaman">` +
    (page > 1 ? `<a class="pgn-b" href="${pageHref(bookId, page - 1)}" aria-label="Sebelum">‹</a>` : "") +
    pages.map((p) => (p === "…" ? `<span class="pgn-e">…</span>` : `<a class="pgn-b${p === page ? " active" : ""}" href="${pageHref(bookId, p)}">${p}</a>`)).join("") +
    (page < totalPages ? `<a class="pgn-b" href="${pageHref(bookId, page + 1)}" aria-label="Seterusnya">›</a>` : "") +
    `</nav>`
  );
}

const SEARCH_PH = { bm: "Cari matan dalam kitab ini…", en: "Search matn in this book…", ar: "ابحث في متن هذا الكتاب…" };
const TOC = { bm: "Isi Kandungan", en: "Table of Content", ar: "فهرس الكتاب" };
const KITAB = { bm: "kitab", en: "books", ar: "كتابًا" };

// Placeholder tidak boleh ada <span>: JS menetapkannya mengikut bahasa (data-ph-*).
function bookNav(bookId, chapterCount, hasBab) {
  return (
    `<div class="bnav"><form class="bnav-search" method="get" action="/x/kitab/${bookId}/">` +
    `<input name="s" placeholder="${esc(SEARCH_PH.bm)}" data-ph-bm="${esc(SEARCH_PH.bm)}" data-ph-en="${esc(SEARCH_PH.en)}" data-ph-ar="${esc(SEARCH_PH.ar)}" dir="rtl" class="ar">` +
    `<button class="btn solid" type="submit" aria-label="cari">⌕</button></form>` +
    (chapterCount > 0
      ? `<div class="bnav-toc" data-toc="/kitab/${bookId}/toc.json" data-bab="${hasBab ? 1 : 0}" data-book="${bookId}">` +
        `<button class="bnav-burger" aria-expanded="false"><span class="bnav-lines">☰</span> ${L(TOC)} <span class="bnav-cnt">${chapterCount} ${L(KITAB)}</span></button></div>`
      : "") +
    `</div>`
  );
}

/**
 * Halaman kitab penuh.
 * d = { book:{id,title_ar}, total, page, totalPages, hadiths[], chapterCount, sharah:{book,nBab}|null, kitabNo,
 *       isnads:Map, overrides:Map, trs:Map, rulings:Map(id→{shown[],hiddenCount}), babs:Map }
 */
export function kitabPage(d, cssHrefs, { legacyScript = false } = {}) {
  const { book, total, page, totalPages } = d;
  const canonical = pageHref(book.id, page);
  const count = `${total.toLocaleString("en-US")} `;
  const items = d.hadiths
    .map((h) => {
      const r = d.rulings.get(h.id);
      const nodes = d.overrides.get(h.id) ?? d.isnads.get(h.id) ?? [];
      return (
        `<article class="hcard" id="h-${h.id}"><div class="hcard-top">${h.chapter_ar ? `<div class="hchap ar">${esc(h.chapter_ar)}</div>` : ""}` +
        `<div class="hcard-meta">${gradeBadge(h.grade)}` +
        (h.number != null ? `<a class="hraqm" href="#h-${h.id}">${L(T.raqmLabel)}&nbsp;${Number(h.number).toLocaleString("en-US")}</a>` : "") +
        `</div></div><div class="hmatn ar">${esc(h.matn_ar)}</div>${bilingual(d.trs.get(h.id))}${isnad(nodes, h.matn_ar)}` +
        `${r ? rulings(r.shown, r.hiddenCount, h.id) : ""}${hadithSyarah(book.id, d.babs.get(h.id))}${suggestForm(h.id)}</article>`
      );
    })
    .join("");

  const sharah = d.sharah
    ? `<section class="shk"><button class="shk-head" aria-expanded="false" data-book="${book.id}" data-kitab="${d.kitabNo}" data-n="${d.sharah.nBab}">` +
      `<span class="shk-lead"><span class="shk-mark">۞</span><span class="shk-label">${L(SHARAH_HEAD)}</span>` +
      `<span class="shk-cnt">${L(OPEN)} · ${d.sharah.nBab} ${L(BAB)}</span></span><span class="shk-book ar">${esc(d.sharah.book.name)}</span></button></section>`
    : "";

  const body =
    nav() +
    `<main class="pwrap"><div class="pcrumb"><a href="/hadis/">${L(T.navHadis)}</a><span>›</span><span class="ar">${esc(book.title_ar)}</span></div>` +
    `<header class="phead"><div class="pname ar">${esc(book.title_ar)}</div><div class="pbadges">` +
    `<span class="pbadge">${count}${L(T.hadisCount)}</span><span class="pbadge">${L(T.pageLabel)} ${page} / ${totalPages}</span></div></header>` +
    bookNav(book.id, d.chapterCount, !!d.sharah) + sharah +
    `<div style="margin-top:24px">${items || `<p class="pempty">${L(T.kitabEmpty)}</p>`}</div>` +
    pagination(book.id, page, totalPages) + `</main>` + footer();

  const legacy = legacyScript
    ? // Pintasan URL lama pada halaman 1: ?page=N, ?h=, ?ch=, ?s= (pelayar sahaja; crawler dapat halaman 1).
      `var q=new URLSearchParams(location.search),B=${book.id},go=function(u){location.replace(u+location.hash)};` +
      `if(q.get("s"))go("/x/kitab/"+B+"/?s="+encodeURIComponent(q.get("s")));` +
      `else if(+q.get("h"))go("/x/h/"+(+q.get("h"))+"/");else if(+q.get("ch"))go("/x/ch/"+B+"/"+(+q.get("ch"))+"/");` +
      `else if(+q.get("page")>1)go("/kitab/"+B+"/"+(+q.get("page"))+"/");`
    : "";

  return shell({
    title: `${book.title_ar}${page > 1 ? ` — ${page}` : ""} | Dewan Izhan`,
    description: `${book.title_ar} — ${count}hadith, sanad & takhrij. Halaman ${page}/${totalPages}.`,
    canonical,
    cssHrefs,
    body,
    script: legacy,
    head:
      (page > 1 ? `<link rel="prev" href="${pageHref(book.id, page - 1)}">` : "") +
      (page < totalPages ? `<link rel="next" href="${pageHref(book.id, page + 1)}">` : ""),
  });
}

// ── Perawi ────────────────────────────────────────────────────────────
// Had baris graf guru/murid; selaras EDGE_LIMIT dalam src/lib/narrators.ts.
export const EDGE_LIMIT = 100;
export const EDGE_LIMIT_ALL = 1000; // had CPU Worker 10 ms — senarai penuh lebih besar tidak berbaloi

// SQL dikongsi penjana statik dan Worker supaya keduanya memaparkan data yang sama.
export const PERAWI_SQL = {
  narrator: "SELECT id, name_ar, shuhra, kunya, nisba, rutbah, profession, regions, mawla, death_year, death_place FROM narrators WHERE id = ?",
  grades: "SELECT scholar, verdict FROM narrator_grades WHERE narrator_id = ?",
  teachers: `SELECT n.id, n.name_ar, n.rutbah, n.death_year, COUNT(*) OVER () AS total
              FROM narrator_relations r JOIN narrators n ON n.id = r.teacher_id
             WHERE r.student_id = ? ORDER BY (n.death_year IS NULL), n.death_year, n.id LIMIT ?`,
  students: `SELECT n.id, n.name_ar, n.rutbah, n.death_year, COUNT(*) OVER () AS total
              FROM narrator_relations r JOIN narrators n ON n.id = r.student_id
             WHERE r.teacher_id = ? ORDER BY (n.death_year IS NULL), n.death_year, n.id LIMIT ?`,
};

// Nod "ثقتان": rawi diambil dari kedua-duanya → papar dua calon sebenar (lihat src/app/perawi/[id]).
export const THIQATAN_ALTS = { 9000001: [2000434, 3443] };

/** Baris graf → { rows, total } (total dari COUNT(*) OVER ()). */
export const edgeList = (list) => ({
  rows: list.map((x) => ({ id: Number(x.id), name_ar: x.name_ar, rutbah: x.rutbah ?? null, death_year: x.death_year == null ? null : Number(x.death_year) })),
  total: list.length ? Number(list[0].total) : 0,
});

/** URL halaman perawi statik. */
export const perawiHref = (id) => `/perawi/${Number(id)}/`;

const person = (e) =>
  `<a href="${perawiHref(e.id)}" class="pn"><span class="dot"></span><span class="pn-nm ar">${esc(e.name_ar)}</span>` +
  `<span class="pn-meta">${esc(e.rutbah ?? "")}${e.death_year ? ` · ت ${esc(e.death_year)}` : ""}</span></a>`;

const SEMUA = { bm: "Papar semua guru & murid", en: "Show all teachers & students", ar: "عرض جميع الشيوخ والتلاميذ" };
const ALTS_HEAD = "كلاهما ثقة — اختر الراوي لقراءة ترجمته";

/**
 * Halaman perawi penuh (padan src/app/perawi/[id]/page.tsx).
 * d = { n, grades[], teachers:{rows,total}, students:{rows,total}, alts[], semua:boolean }
 */
export function perawiPage(d, cssHrefs) {
  const { n, grades, teachers, students, alts, semua } = d;
  const info = [
    [T.infoKunya, n.kunya], [T.infoNisbah, n.nisba], [T.infoProfession, n.profession], [T.infoRegion, n.regions],
    [T.infoMawla, n.mawla], [T.infoDeath, n.death_year ? `${n.death_year} H` : null], [T.infoDeathPlace, n.death_place],
  ].filter(([, v]) => v);
  const truncated = teachers.total > teachers.rows.length || students.total > students.rows.length;
  const col = (title, list, none) =>
    `<div class="pcol"><h4>${L(title)} <span class="cnt">(${list.total})</span></h4><div class="pnodes">` +
    (list.rows.length ? list.rows.map(person).join("") : `<div class="pempty">${L(none)}</div>`) + `</div></div>`;

  const body =
    nav() +
    `<main class="pwrap"><div class="pcrumb"><a href="/perawi/">${L(T.navPerawi)}</a><span>›</span><span class="ar">${esc(n.name_ar)}</span></div>` +
    `<header class="phead"><div class="pname ar">${esc(n.name_ar)}</div>` +
    (n.shuhra ? `<div class="pshuhra ar">${esc(n.shuhra)}</div>` : "") +
    `<div class="pbadges">${n.rutbah ? `<span class="pbadge rutbah"><span class="ar">${esc(n.rutbah)}</span></span>` : ""}` +
    `<span class="pbadge">ID ${Number(n.id)}</span></div></header>` +
    (alts.length ? `<div class="psec-t">${ALTS_HEAD}</div><div class="pnodes">${alts.map(person).join("")}</div>` : "") +
    (info.length
      ? `<div class="psec-t">${L(T.narrInfo)}</div><div class="pinfo">${info.map(([k, v]) => `<div><div class="k">${L(k)}</div><div class="v ar">${esc(v)}</div></div>`).join("")}</div>`
      : "") +
    (grades.length
      ? `<div class="psec-t">${L(T.narrJarh)}</div><div class="pjarh">${grades.map((g) => `<div class="pjarh-row"><div class="sch ar">${esc(g.scholar ?? "—")}</div><div class="vd ar">${esc(g.verdict ?? "")}</div></div>`).join("")}</div>`
      : "") +
    `<div class="psec-t">${L(T.narrGraph)}</div><div class="pgraph">` +
    col(T.narrTeachers, teachers, T.narrNoTeachers) + col(T.narrStudents, students, T.narrNoStudents) + `</div>` +
    (truncated && !semua ? `<p class="pempty"><a href="/x/perawi/${Number(n.id)}/?semua=1" rel="nofollow">${L(SEMUA)}</a></p>` : "") +
    suggestForm(n.id, "narrator", "name_ar", n.name_ar) +
    `</main>` + footer();

  const rut = n.rutbah ? ` (${n.rutbah})` : "";
  return shell({
    title: `${n.name_ar} | Dewan Izhan`,
    description: `${n.name_ar}${rut} — maklumat perawi, Jarh wa Taʿdil, guru & murid. ${teachers.total} guru, ${students.total} murid.`,
    canonical: perawiHref(n.id),
    cssHrefs,
    body,
    head: semua ? `<meta name="robots" content="noindex, nofollow">` : "",
  });
}

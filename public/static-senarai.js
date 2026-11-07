/* Senarai penuh guru/murid perawi + tapis nama DALAM PELAYAR (tanpa Turso/Worker).
 * Dimuat hanya pada halaman perawi yang ada .pgraph[data-senarai] (perawi dengan >100 guru/murid).
 * Pautan "Papar semua" kekal ke /x/perawi/<id>/senarai/ (tanpa JS); skrip ini menambah baik sahaja:
 * muat /perawi/<id>/senarai.json sekali ({t:[[id,nama,wafat]…],s:[…]}), paparkan berhalaman + tapis. */
(function () {
  "use strict";
  var doc = document;
  var graph = doc.querySelector(".pgraph[data-senarai]");
  if (!graph) return;
  var PER = +graph.getAttribute("data-per") || 250;
  var Q_MAX = 100, TOKENS = 8;

  // Salinan tepat src/lib/arabic.ts normalizeArabic (diuji setara dengan pelayan).
  var TASHKEEL = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;
  var TATWEEL = /ـ/g;
  function normalizeArabic(input) {
    if (!input) return "";
    return String(input)
      .replace(TASHKEEL, "")
      .replace(TATWEEL, "")
      .replace(/[آأإٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .replace(/[^ء-ي\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  /** Sama seperti nameFilter() pelayan: potong 100, normal, maks 8 token. */
  function queryTokens(raw) {
    var n = normalizeArabic(String(raw || "").slice(0, Q_MAX));
    return n ? n.split(" ").filter(Boolean).slice(0, TOKENS) : [];
  }
  /** Setiap token mesti awalan kepada sesuatu perkataan nama (setara FTS `"tok"*` dengan AND tersirat). */
  function matches(words, tokens) {
    return tokens.every(function (t) {
      return words.some(function (w) { return w.lastIndexOf(t, 0) === 0; });
    });
  }

  var lang = function () { var l = doc.documentElement.getAttribute("data-lang"); return l === "en" || l === "ar" ? l : "bm"; };
  var S = {
    teachers: { bm: "Guru", en: "Teachers", ar: "الشيوخ" },
    students: { bm: "Murid", en: "Students", ar: "التلاميذ" },
    back: { bm: "← Kembali", en: "← Back", ar: "← رجوع" },
    ph: { bm: "Tapis mengikut nama…", en: "Filter by name…", ar: "تصفية بالاسم…" },
    showing: { bm: "Memaparkan", en: "Showing", ar: "عرض" },
    of: { bm: "daripada", en: "of", ar: "من" },
    none: { bm: "Tiada padanan.", en: "No matches.", ar: "لا توجد نتائج." },
    loading: { bm: "Memuat…", en: "Loading…", ar: "جارٍ التحميل…" },
    fail: { bm: "Gagal memuat senarai.", en: "Could not load the list.", ar: "تعذّر تحميل القائمة." }
  };
  var tr = function (k) { return S[k][lang()]; };
  var fmt = function (n) { return n.toLocaleString("en-US"); };

  function el(tag, cls, text) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text; // sentiasa textContent — nama tidak pernah jadi HTML
    return e;
  }

  var data = null, loading = null;
  function load() {
    if (!loading) {
      loading = fetch(graph.getAttribute("data-senarai"), { credentials: "same-origin" }).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      }).then(function (j) {
        data = {};
        ["t", "s"].forEach(function (k) {
          data[k] = (j[k] || []).map(function (r) { return { r: r, w: normalizeArabic(r[1]).split(" ") }; });
        });
        return data;
      });
      loading.catch(function () { loading = null; });
    }
    return loading;
  }

  var view = null;
  function open(jenis) {
    var key = jenis === "guru" ? "t" : "s";
    if (!view) { view = el("section", "pcol"); view.id = "senarai-view"; graph.parentNode.insertBefore(view, graph.nextSibling); }
    graph.hidden = true;
    view.hidden = false;
    view.textContent = "";
    view.appendChild(el("p", "pempty", tr("loading")));
    load().then(function (d) { render(d[key], jenis); }, function () {
      view.textContent = "";
      var p = el("p", "pempty", tr("fail"));
      view.appendChild(p);
      view.appendChild(back());
    });
  }
  function back() {
    var b = el("button", "btn", tr("back"));
    b.type = "button";
    b.addEventListener("click", function () { view.hidden = true; graph.hidden = false; });
    return b;
  }

  function pageButtons(page, pages, go) {
    var nav = el("nav", "pgn");
    nav.setAttribute("aria-label", "Halaman");
    var shown = [];
    for (var p = 1; p <= pages; p++) {
      if (p === 1 || p === pages || (p >= page - 2 && p <= page + 2)) shown.push(p);
      else if (shown[shown.length - 1] !== 0) shown.push(0);
    }
    var add = function (label, target, cls) {
      var b = el("button", "pgn-b" + (cls || ""), label);
      b.type = "button";
      b.addEventListener("click", function () { go(target); });
      nav.appendChild(b);
    };
    if (page > 1) add("‹", page - 1);
    shown.forEach(function (p) { if (p === 0) nav.appendChild(el("span", "pgn-e", "…")); else add(String(p), p, p === page ? " active" : ""); });
    if (page < pages) add("›", page + 1);
    return nav;
  }

  function render(items, jenis) {
    view.textContent = "";
    var head = el("h4", null, tr(jenis === "guru" ? "teachers" : "students") + " ");
    var cnt = el("span", "cnt", "(" + fmt(items.length) + ")");
    head.appendChild(cnt);
    var form = el("form", "bnav-search");
    form.setAttribute("role", "search");
    var input = el("input", "ar");
    input.type = "search"; input.maxLength = Q_MAX; input.dir = "rtl"; input.autocomplete = "off";
    input.placeholder = tr("ph");
    form.appendChild(input);
    form.addEventListener("submit", function (e) { e.preventDefault(); });
    var info = el("p", "pempty");
    var list = el("div", "pnodes");
    var pager = el("div");
    view.appendChild(back());
    view.appendChild(head);
    view.appendChild(form);
    view.appendChild(info);
    view.appendChild(list);
    view.appendChild(pager);

    var filtered = items, page = 1;
    function draw() {
      var pages = Math.max(1, Math.ceil(filtered.length / PER));
      page = Math.min(Math.max(page, 1), pages);
      var from = filtered.length ? (page - 1) * PER : -1;
      var slice = filtered.slice(Math.max(from, 0), Math.max(from, 0) + PER);
      info.textContent = tr("showing") + " " + fmt(from + 1) + "–" + fmt(Math.max(from, 0) + slice.length) + " " + tr("of") + " " + fmt(filtered.length) +
        (pages > 1 ? " · " + page + " / " + pages : "");
      list.textContent = "";
      if (!slice.length) list.appendChild(el("div", "pempty", tr("none")));
      slice.forEach(function (it) {
        var r = it.r;
        var a = el("a", "pn");
        a.href = "/perawi/" + Number(r[0]) + "/";
        a.appendChild(el("span", "dot"));
        a.appendChild(el("span", "pn-nm ar", r[1]));
        a.appendChild(el("span", "pn-meta", r[2] ? "ت " + r[2] : ""));
        list.appendChild(a);
      });
      pager.textContent = "";
      if (pages > 1) pager.appendChild(pageButtons(page, pages, function (p) { page = p; draw(); list.scrollIntoView({ block: "start" }); }));
    }
    input.addEventListener("input", function () {
      var tokens = queryTokens(input.value);
      filtered = tokens.length ? items.filter(function (it) { return matches(it.w, tokens); }) : items;
      page = 1;
      draw();
    });
    draw();
    input.focus();
  }

  [].forEach.call(graph.querySelectorAll("a[data-jenis]"), function (a) {
    a.addEventListener("click", function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; // buka tab baharu → laluan Worker
      e.preventDefault();
      open(a.getAttribute("data-jenis"));
    });
  });
  // Prapemuat apabila pengguna menuding/menyentuh pautan (ralat dikendalikan dalam load()).
  [].forEach.call(graph.querySelectorAll("a[data-jenis]"), function (a) {
    ["mouseenter", "touchstart"].forEach(function (ev) { a.addEventListener(ev, load, { once: true, passive: true }); });
  });
  if (typeof window !== "undefined") window.__senarai = { normalizeArabic: normalizeArabic, queryTokens: queryTokens, matches: matches };
})();

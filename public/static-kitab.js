/* Interaksi halaman kitab statik (vanilla, tanpa React). Tingkah laku sama seperti
 * BookNav / SharahKitab / HadithSyarah / Rulings / BilingualToggle / SuggestForm / Nav,
 * memanggil titik akhir /api/* yang sama. Markup HTML dijana src/static/templates.mjs. */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  var lang = function () { var l = root.getAttribute("data-lang"); return l === "en" || l === "ar" ? l : "bm"; };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var tr = function (o) { return o[lang()]; };
  var J = function (url) { return fetch(url).then(function (r) { return r.json(); }); };

  var S = {
    loading: { bm: "Memuat…", en: "Loading…", ar: "جارٍ التحميل…" },
    open: { bm: "Buka", en: "Open", ar: "افتح" },
    close: { bm: "Tutup", en: "Close", ar: "طيّ" },
    none: { bm: "Tiada syarah", en: "No commentary", ar: "لا شرح" },
    bab: { bm: "bab", en: "chapters", ar: "باب" },
    less: { bm: "Tutup", en: "Collapse", ar: "طيّ" },
    more: { bm: "Lihat {n} hukum & takhrij lain", en: "Show {n} more", ar: "عرض {n} أخرى" },
    primary: { bm: "kitab ini", en: "this book", ar: "هذا الكتاب" },
    msNone: "Terjemahan Melayu belum tersedia.",
    enNone: "English translation not available yet.",
    sText: { bm: "Teks pembetulan dicadangkan…", en: "Suggested correction text…", ar: "نص التصحيح المقترح…" },
    sReason: { bm: "Sebab (pilihan)", en: "Reason (optional)", ar: "السبب (اختياري)" },
    sName: { bm: "Nama / emel anda (pilihan)", en: "Your name / email (optional)", ar: "اسمك / بريدك (اختياري)" },
    sSend: { bm: "Hantar cadangan", en: "Send suggestion", ar: "إرسال الاقتراح" },
    sDone: { bm: "Terima kasih — cadangan dihantar untuk semakan admin.", en: "Thank you — suggestion sent for admin review.", ar: "شكراً — أُرسل الاقتراح لمراجعة المشرف." },
    sFail: { bm: "Gagal menghantar — cuba lagi.", en: "Could not send — try again.", ar: "تعذّر الإرسال — حاول مجددًا." }
  };

  // ── Bahasa + placeholder ────────────────────────────────────────────
  function applyLang() {
    var l = lang();
    [].forEach.call(doc.querySelectorAll(".lang-btn"), function (b) { b.classList.toggle("active", b.getAttribute("data-l") === l); });
    [].forEach.call(doc.querySelectorAll("[data-ph-bm]"), function (i) { i.placeholder = i.getAttribute("data-ph-" + l); });
    [].forEach.call(doc.querySelectorAll('.rul-toggle[aria-expanded="false"]'), function (b) { b.textContent = moreLabel(b); });
  }
  function setLang(l) {
    root.setAttribute("data-lang", l);
    root.lang = l === "bm" ? "ms" : l;
    doc.cookie = "lang=" + l + ";path=/;max-age=31536000;samesite=lax";
    applyLang();
  }
  applyLang();

  // Teks butang yang berubah (Buka/Tutup/Memuat) — simpan HTML asal untuk dipulihkan.
  function setCnt(el, text) { if (el.__orig == null) el.__orig = el.innerHTML; el.textContent = text; }
  function resetCnt(el) { if (el.__orig != null) el.innerHTML = el.__orig; }

  // ── Isi Kandungan + bab ─────────────────────────────────────────────
  function tocRow(c, book, hasBab) {
    var href = "/kitab/" + book + "/" + (c[3] > 1 ? c[3] + "/" : "");
    return '<li><div class="bnav-krow">' +
      (hasBab ? '<button class="bnav-kexp" aria-expanded="false" aria-label="باب" data-ref="' + esc(c[0]) + '">▸</button>' : '<span class="bnav-kexp bnav-kexp-x"></span>') +
      '<a class="bnav-klink" href="' + href + '"><span class="bnav-ktb ar">' + esc(c[1]) + '</span><span class="bnav-n">' + c[2] + "</span></a></div></li>";
  }
  function toggleToc(btn) {
    var box = btn.closest(".bnav-toc"), list = box.querySelector(".bnav-list");
    var open = btn.getAttribute("aria-expanded") === "true";
    if (open) { list.hidden = true; btn.setAttribute("aria-expanded", "false"); return; }
    if (list) { list.hidden = false; btn.setAttribute("aria-expanded", "true"); return; }
    J(box.getAttribute("data-toc")).then(function (rows) {
      var book = box.getAttribute("data-book"), hasBab = box.getAttribute("data-bab") === "1";
      var ol = doc.createElement("ol");
      ol.className = "bnav-list";
      ol.innerHTML = rows.map(function (c) { return tocRow(c, book, hasBab); }).join("");
      ol.__rows = rows;
      box.appendChild(ol);
      btn.setAttribute("aria-expanded", "true");
    }).catch(function (e) { console.warn("toc", e); });
  }
  function toggleBab(btn) {
    var li = btn.closest("li"), box = btn.closest(".bnav-toc"), ref = btn.getAttribute("data-ref");
    var open = btn.getAttribute("aria-expanded") === "true", sub = li.querySelector(".bnav-bab");
    if (open) { if (sub) sub.hidden = true; btn.setAttribute("aria-expanded", "false"); btn.textContent = "▸"; return; }
    btn.setAttribute("aria-expanded", "true"); btn.textContent = "▾";
    if (sub) { sub.hidden = false; return; }
    var a = li.querySelector(".bnav-klink").getAttribute("href");
    J("/api/bab/?book=" + box.getAttribute("data-book") + "&kitab=" + ref).then(function (d) {
      var bab = d.bab || [];
      if (!bab.length) return;
      var ol = doc.createElement("ol");
      ol.className = "bnav-bab";
      ol.innerHTML = bab.map(function (b) { return '<li><a class="ar" href="' + a + '">' + esc(b.bab_title) + "</a></li>"; }).join("");
      li.appendChild(ol);
    }).catch(function (e) { console.warn("bab", e); });
  }

  // ── Syarah per كتاب ─────────────────────────────────────────────────
  function toggleSharah(btn) {
    var sec = btn.closest(".shk"), cnt = btn.querySelector(".shk-cnt"), ol = sec.querySelector(".shk-list");
    var open = btn.getAttribute("aria-expanded") === "true";
    if (open) { ol.hidden = true; btn.setAttribute("aria-expanded", "false"); resetCnt(cnt); return; }
    var show = function () { btn.setAttribute("aria-expanded", "true"); setCnt(cnt, tr(S.close)); };
    if (ol) { ol.hidden = false; show(); return; }
    setCnt(cnt, tr(S.loading));
    J("/api/syarah/?book=" + btn.getAttribute("data-book") + "&kitab=" + btn.getAttribute("data-kitab")).then(function (d) {
      ol = doc.createElement("ol");
      ol.className = "shk-list";
      ol.innerHTML = (d.segs || []).map(function (s) {
        var t = s.bab_no > 0 ? (s.bab_title || "باب " + s.bab_no) : s.kitab_title;
        return '<li class="shk-bab"><button class="shk-bab-h ar" aria-expanded="false"><span class="shk-caret">▸</span><span class="shk-babt">' + esc(t) + '</span></button><div class="shk-text ar" hidden>' + esc(s.text) + "</div></li>";
      }).join("");
      sec.appendChild(ol);
      show();
    }).catch(function () { setCnt(cnt, tr(S.open)); });
  }
  function toggleSharahBab(btn) {
    var open = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", open ? "false" : "true");
    btn.querySelector(".shk-caret").textContent = open ? "▸" : "▾";
    btn.nextElementSibling.hidden = open;
  }

  // ── Syarah di bawah hadis ───────────────────────────────────────────
  function toggleHsy(btn) {
    var box = btn.closest(".hsy"), cnt = btn.querySelector(".hsy-cnt"), body = box.querySelector(".hsy-body,.hsy-empty");
    var open = btn.getAttribute("aria-expanded") === "true";
    if (open) { body.hidden = true; btn.setAttribute("aria-expanded", "false"); resetCnt(cnt); return; }
    var show = function () { btn.setAttribute("aria-expanded", "true"); setCnt(cnt, tr(S.close)); };
    if (body) { body.hidden = false; show(); return; }
    setCnt(cnt, tr(S.loading));
    var q = "/api/hadith-syarah/?book=" + btn.getAttribute("data-book") + "&kt=" + encodeURIComponent(btn.getAttribute("data-kt")) + "&bab=" + encodeURIComponent(btn.getAttribute("data-bab"));
    J(q).then(function (d) { return d.text || ""; }, function () { return ""; }).then(function (text) {
      var el = doc.createElement("div");
      if (text) { el.className = "hsy-body"; el.innerHTML = '<div class="hsy-text ar">' + esc(text) + '</div><div class="hsy-src">— فتح الباري — ابن حجر</div>'; }
      else { el.className = "hsy-empty"; el.textContent = tr(S.none); }
      box.appendChild(el);
      show();
    });
  }

  // ── Hukum/takhrij dilipat (dimuat dari /api/rulings) ────────────────
  function rulItem(r) {
    var src = r.source_book ? esc(r.source_book) + (r.ref ? " " + esc(r.ref) : "") : "";
    return '<li class="rul-item"><div class="rul-main">' + (r.hukm ? '<span class="rul-verdict ar">' + esc(r.hukm) + "</span>" : "") +
      '<span class="rul-attr ar">' + (r.muhaddith ? '<b class="rul-mhd">' + esc(r.muhaddith) + "</b>" : "") +
      (src ? (r.href ? '<a class="rul-link" href="' + esc(r.href) + '">' + src + '<span class="rul-go"> ↗</span></a>' : '<span class="rul-src">' + src + "</span>") : "") +
      "</span></div>" + (r.rawi ? '<div class="rul-sub ar"><span class="rul-rawi">' + esc(r.rawi) + "</span></div>" : "") + "</li>";
  }
  function moreLabel(btn) { return "▾ " + tr(S.more).replace("{n}", btn.getAttribute("data-n")); }
  function toggleRul(btn) {
    var ul = btn.parentNode.querySelector(".rul-list"), open = btn.getAttribute("aria-expanded") === "true";
    var extra = ul.querySelectorAll("li[data-x]");
    if (open) { [].forEach.call(extra, function (li) { li.hidden = true; }); btn.setAttribute("aria-expanded", "false"); btn.textContent = moreLabel(btn); return; }
    var show = function () { btn.setAttribute("aria-expanded", "true"); btn.textContent = "▴ " + tr(S.less); };
    if (extra.length) { [].forEach.call(extra, function (li) { li.hidden = false; }); show(); return; }
    btn.textContent = tr(S.loading);
    J("/api/rulings/?h=" + btn.getAttribute("data-h")).then(function (d) {
      var tmp = doc.createElement("ul");
      tmp.innerHTML = (d.rest || []).map(rulItem).join("");
      [].forEach.call(tmp.children, function (li) { li.setAttribute("data-x", "1"); ul.appendChild(li); });
      show();
    }).catch(function () { btn.textContent = moreLabel(btn); });
  }

  // ── Toggle terjemahan ───────────────────────────────────────────────
  function toggleTr(btn) {
    var box = btn.closest(".btoggle"), l = btn.getAttribute("data-l");
    [].forEach.call(box.querySelectorAll(".btoggle-btn"), function (b) { b.classList.toggle("active", b === btn); });
    [].forEach.call(box.querySelectorAll(".btoggle-tr,.btoggle-empty"), function (p) { p.hidden = true; });
    if (l === "ar") return;
    var p = box.querySelector('.btoggle-tr[data-l="' + l + '"]');
    if (!p) {
      p = box.querySelector('.btoggle-empty[data-l="' + l + '"]');
      if (!p) { p = doc.createElement("p"); p.className = "btoggle-empty"; p.setAttribute("data-l", l); p.textContent = l === "ms" ? S.msNone : S.enNone; box.appendChild(p); }
    }
    p.hidden = false;
  }

  // ── Cadangan pembetulan → /api/suggest ──────────────────────────────
  function openSuggest(btn) {
    var box = btn.parentNode, form = box.querySelector("form");
    if (form) { form.hidden = !form.hidden; return; }
    form = doc.createElement("form");
    form.className = "suggest-form";
    form.innerHTML = '<textarea name="suggested_text" required rows="3" placeholder="' + esc(tr(S.sText)) + '"></textarea>' +
      '<input name="reason" placeholder="' + esc(tr(S.sReason)) + '"><input name="submitter" placeholder="' + esc(tr(S.sName)) + '">' +
      '<input name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">' +
      '<button type="submit" class="btn solid">' + esc(tr(S.sSend)) + "</button>";
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var art = box.closest("article"), fd = new FormData(form);
      fd.set("entity_type", box.getAttribute("data-e") || "hadith"); fd.set("entity_id", box.getAttribute("data-h"));
      fd.set("field", box.getAttribute("data-f") || "matn");
      fd.set("current_text", art ? art.querySelector(".hmatn").textContent : box.getAttribute("data-cur") || "");
      fetch("/api/suggest/", { method: "POST", body: fd }).then(function (r) { return r.json(); }).then(function (d) {
        if (!d.ok) throw new Error();
        box.innerHTML = '<p class="suggest-done">✓ ' + esc(tr(S.sDone)) + "</p>";
      }).catch(function () { alert(tr(S.sFail)); });
    });
    box.appendChild(form);
  }

  // ── Delegasi klik ───────────────────────────────────────────────────
  var handlers = [
    [".lang-btn", function (b) { setLang(b.getAttribute("data-l")); }],
    [".nav-burger", function (b) { var o = !b.classList.contains("open"); b.classList.toggle("open", o); b.setAttribute("aria-expanded", String(o)); doc.querySelector(".nav-menu").classList.toggle("open", o); }],
    [".bnav-burger", toggleToc],
    [".bnav-kexp[data-ref]", toggleBab],
    [".shk-head", toggleSharah],
    [".shk-bab-h", toggleSharahBab],
    [".hsy-head", toggleHsy],
    [".rul-toggle", toggleRul],
    [".btoggle-btn", toggleTr],
    [".suggest-toggle", openSuggest]
  ];
  doc.addEventListener("click", function (e) {
    for (var i = 0; i < handlers.length; i++) {
      var el = e.target.closest && e.target.closest(handlers[i][0]);
      if (el) { handlers[i][1](el); return; }
    }
  });
})();

/* Penapis glosari (vanilla): sama seperti GlossarySearch lama — padanan subrentetan tanpa kes/harakat
 * pada istilah, transliterasi, terjemahan dan definisi BM/EN (bukan definisi Arab). Medan dibaca dari DOM (src/static/pages.mjs). */
(function () {
  "use strict";
  var input = document.getElementById("glos-q"), list = document.getElementById("glos-list"), none = document.getElementById("glos-none");
  if (!input || !list) return;
  var norm = function (s) { return s.toLowerCase().normalize("NFKD").replace(/[ً-ٰٟ]/g, ""); };
  var fieldsOf = function (c) {
    var f = [], q = function (sel) { var e = c.querySelector(sel); if (e) f.push(norm(e.textContent)); };
    q(".glos-ar"); q(".glos-tr");
    [].forEach.call(c.querySelectorAll(".glos-line"), function (p) {
      if (p.querySelector(".glos-lang").textContent === "ع") return;
      [].forEach.call(p.querySelectorAll(".glos-term,.glos-def"), function (e) { f.push(norm(e.textContent.replace(/^ — /, ""))); });
    });
    return f;
  };
  var cards = [].map.call(list.querySelectorAll(".glos-card"), function (c) { return { el: c, fields: null, sec: c.parentNode }; });
  var secs = [].slice.call(list.children);
  input.addEventListener("input", function () {
    var q = norm(input.value.trim()), shown = 0, live = new Set();
    cards.forEach(function (c) {
      if (q && !c.fields) c.fields = fieldsOf(c.el);
      var hit = !q || c.fields.some(function (f) { return f.indexOf(q) !== -1; });
      c.el.hidden = !hit;
      if (hit) { shown++; live.add(c.sec); }
    });
    secs.forEach(function (s) { s.hidden = !live.has(s); });
    if (none) none.hidden = shown !== 0;
  });
})();

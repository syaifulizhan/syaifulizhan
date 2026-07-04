// DEDUP pendua perawi merentas import (islam-db id<2M ↔ Itqan id≥2M, + pendua dalaman Itqan).
// PRINSIP AMANAH: nama sama ≠ orang sama. Tiga lapis pertahanan:
//   1. KESERASIAN NASAB segmen-demi-segmen (split " بن "): segmen plain yg berbeza
//      (ابراهيم vs يعقوب) = ORANG BERBEZA → tolak; varian kunya/وقيل (ميمون vs ابي عمران ميمون)
//      = serasi/lemah, perlukan bukti graf lebih kuat.
//   2. BUKTI pertindihan jiran graf guru-murid + tahun wafat (canggah >5 → tolak).
//   3. IMBASAN PASCA-UNION: kumpulan yg ada sebarang pasangan konflik dalaman → GUGUR semua
//      (halang runtuhan transitiviti spt 9 orang احمد بن محمد → Imam Ahmad).
// Pemenang: id CANON/pinned diutamakan, lalu islam-db (<2M, bio kaya — relasi loser dipindah
// ke pemenang jadi tiada rugi), lalu skor relasi. death_year loser diwarisi jika pemenang kosong.
// --write: kemas corpus.db LOKAL + manifest ops utk Turso (scripts/_dedup-ops.json).
//   node scripts/dedup-2m.mjs [--write]
import { createClient } from "@libsql/client";
import { readFileSync, writeFileSync } from "node:fs";
const WRITE = process.argv.includes("--write");
const db = createClient({ url: "file:./data/corpus.db" });

// id terkurasi (CANON runtime + isnad-pinned build) — mesti MENANG kumpulan masing-masing
const canonSrc = readFileSync("src/lib/isnad-canonical.ts", "utf8");
const CANON = new Function(`return (${canonSrc.slice(canonSrc.indexOf("= {") + 2, canonSrc.lastIndexOf("};") + 1)})`)();
const pinned = JSON.parse(readFileSync("data/isnad-pinned.json", "utf8"));
const PROTECTED = new Set([
  ...Object.values(CANON).filter((v) => v < 9000000),
  ...Object.values(pinned).map(Number).filter((v) => Number.isFinite(v)),
]);

console.log("→ Muat narrators…");
const nar = new Map(); // id → {ns, dy, bio}
let cur = 0;
for (;;) {
  const r = await db.execute({ sql: "SELECT id, name_search, death_year, length(bio_ar) bl FROM narrators WHERE id>? ORDER BY id LIMIT 5000", args: [cur] });
  if (!r.rows.length) break;
  for (const x of r.rows) { cur = Number(x.id); nar.set(cur, { ns: String(x.name_search ?? "").trim(), dy: x.death_year == null ? null : Number(x.death_year), bio: Number(x.bl ?? 0) }); }
}
console.log(`  ${nar.size} perawi`);

console.log("→ Muat narrator_relations (jiran)…");
const nbr = new Map(); // id → Set jiran
const edges = []; // [t,s]
let off = 0;
for (;;) {
  const r = await db.execute({ sql: "SELECT teacher_id t, student_id s FROM narrator_relations ORDER BY rowid LIMIT 10000 OFFSET ?", args: [off] });
  if (!r.rows.length) break;
  for (const x of r.rows) {
    const t = Number(x.t), s = Number(x.s);
    edges.push([t, s]);
    (nbr.get(t) ?? nbr.set(t, new Set()).get(t)).add(s);
    (nbr.get(s) ?? nbr.set(s, new Set()).get(s)).add(t);
  }
  off += r.rows.length;
  if (r.rows.length < 10000) break;
}
console.log(`  ${edges.length} tepi`);

// ── keserasian nasab ──────────────────────────────────────────────────────
const COMPOUND = new Set(["عبد", "ابي", "ابو", "ام", "ذي", "ذو"]);
const headOf = (seg) => {
  const t = seg.split(" ");
  return COMPOUND.has(t[0]) && t[1] ? t[0] + " " + t[1] : t[0];
};
// bandingkan dua segmen nasab: "ok" (sama/varian terkandung) | "weak" (kunya vs ism,
// tak boleh disahkan) | "conflict" (dua nama plain berbeza = orang berbeza)
function segCompat(a, b) {
  if (a === b) return "ok";
  const at = a.split(" "), bt = b.split(" ");
  if (headOf(a) === headOf(b)) return "ok";
  const hasVariant = /وقيل|ويقال|يقال/.test(a) || /وقيل|ويقال|يقال/.test(b);
  if (hasVariant) {
    const bigSet = new Set([...at, ...bt]);
    return at.some((t) => bt.includes(t)) || bigSet.size < at.length + bt.length ? "ok" : "weak";
  }
  const [shT, lgT] = at.length <= bt.length ? [at, bt] : [bt, at];
  const lgSet = new Set(lgT);
  if (shT.every((t) => lgSet.has(t))) return "ok"; // terkandung: ميمون ⊆ ابي عمران ميمون
  if (at[0] === "ابي" || at[0] === "ابو" || bt[0] === "ابي" || bt[0] === "ابو") return "weak"; // kunya vs ism
  return "conflict";
}
// keserasian nama penuh: bandingkan segmen selari sepanjang minimum
function nameCompat(nsA, nsB) {
  const A = nsA.split(" بن "), B = nsB.split(" بن ");
  if (A.length < 2 || B.length < 2) return nsA === nsB ? "ok" : "conflict";
  let weak = false;
  for (let i = 0; i < Math.min(A.length, B.length); i++) {
    const c = segCompat(A[i].trim(), B[i].trim());
    if (c === "conflict") return "conflict";
    if (c === "weak") weak = true;
  }
  return weak ? "weak" : "ok";
}

// ── kumpulan calon: kunci = ism + kepala-bapa (sedar-majmuk) ──
const groups = new Map();
for (const [id, n] of nar) {
  const segs = n.ns.split(" بن ");
  if (segs.length < 2 || !segs[0] || !segs[1]) continue;
  const key = segs[0].trim() + "|" + headOf(segs[1].trim());
  (groups.get(key) ?? groups.set(key, []).get(key)).push(id);
}

const deg = (id) => nbr.get(id)?.size ?? 0;
const overlap = (a, b) => {
  const A = nbr.get(a), B = nbr.get(b);
  if (!A || !B) return 0;
  const [sm, lg] = A.size <= B.size ? [A, B] : [B, A];
  let c = 0;
  for (const x of sm) if (lg.has(x)) c++;
  return c;
};
const deathConflict = (a, b) => nar.get(a).dy != null && nar.get(b).dy != null && Math.abs(nar.get(a).dy - nar.get(b).dy) > 5;
const deathMatch = (a, b) => nar.get(a).dy != null && nar.get(b).dy != null && Math.abs(nar.get(a).dy - nar.get(b).dy) <= 2;

function samePair(a, b) {
  if (deathConflict(a, b)) return null;
  const na = nar.get(a), nb = nar.get(b);
  const nc = nameCompat(na.ns, nb.ns);
  if (nc === "conflict") return null;
  const ov = overlap(a, b), mind = Math.min(deg(a), deg(b));
  const twoSeg = na.ns.split(" بن ").length === 2 && nb.ns.split(" بن ").length === 2;
  if (nc === "ok") {
    if (twoSeg && na.ns !== nb.ns) return null; // 2 segmen & tak serupa penuh → terlalu generik
    if (ov >= 20 && ov >= 0.25 * mind) return `serasi + jiran ${ov}/${mind}`;
    if (ov >= 10 && deathMatch(a, b)) return `serasi + jiran ${ov} + wafat ${na.dy}≈${nb.dy}`;
    if (na.ns === nb.ns && na.ns.split(" بن ").length >= 4 && deathMatch(a, b)) return `nama distinktif serupa + wafat`;
  } else { // weak: kunya vs ism tak boleh disahkan → bukti lebih kuat
    if (ov >= 40 && ov >= 0.4 * mind) return `lemah + jiran kuat ${ov}/${mind}`;
    if (ov >= 20 && deathMatch(a, b)) return `lemah + jiran ${ov} + wafat ${na.dy}≈${nb.dy}`;
  }
  return null;
}

// union-find
const parent = new Map();
const find = (x) => { let r = x; while (parent.has(r)) r = parent.get(r); return r; };
const evid = new Map(); // "a|b" → why
let pairs = 0;
for (const [, ids] of groups) {
  if (ids.length < 2 || ids.length > 200) continue;
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i], b = ids[j];
      if (a < 2000000 && b < 2000000) continue; // skop: sekurang-kurang satu Itqan
      const why = samePair(a, b);
      if (!why) continue;
      pairs++;
      evid.set(`${a}|${b}`, why);
      const ra = find(a), rb = find(b);
      if (ra !== rb) parent.set(rb, ra);
    }
}

// kumpul ahli per akar
const members = new Map();
for (const k of evid.keys()) for (const id of k.split("|").map(Number)) {
  const r = find(id);
  (members.get(r) ?? members.set(r, new Set()).get(r)).add(id);
}

// IMBASAN PASCA-UNION: gugurkan kumpulan dgn sebarang konflik dalaman (nasab ATAU wafat)
const remap = new Map(); // loser → winner
const score = (id) => deg(id) * 1000 + Math.min(999, nar.get(id).bio);
let dropped = 0, protConflict = 0;
const droppedSamples = [];
for (const [, set] of members) {
  const ids = [...set];
  let bad = false;
  outer: for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++)
      if (nameCompat(nar.get(ids[i]).ns, nar.get(ids[j]).ns) === "conflict" || deathConflict(ids[i], ids[j])) { bad = true; break outer; }
  if (bad) { dropped++; if (droppedSamples.length < 8) droppedSamples.push(ids); continue; }
  const prot = ids.filter((id) => PROTECTED.has(id));
  if (prot.length > 1) { protConflict++; continue; }
  const win = prot.length === 1 ? prot[0]
    : ids.slice().sort((x, y) =>
        (x < 2000000 ? 0 : 1) - (y < 2000000 ? 0 : 1) || score(y) - score(x) || x - y)[0];
  for (const id of ids) if (id !== win) remap.set(id, win);
}
console.log(`\nkumpulan gabung: ${members.size - dropped - protConflict} · loser dipetakan: ${remap.size}`);
console.log(`digugurkan (konflik dalaman transitiviti): ${dropped} · konflik-terkurasi: ${protConflict} · pasangan bukti: ${pairs}`);
if (droppedSamples.length) {
  console.log("── sampel kumpulan DIGUGURKAN ──");
  for (const ids of droppedSamples) console.log("  " + ids.map((i) => `#${i} "${nar.get(i).ns.slice(0, 40)}"`).join(" | "));
}

// ── rancang ops (deterministik ikut NILAI, bukan rowid — selamat utk remote) ──
// PK narrator_relations = (teacher_id, student_id): UPDATE ke pasangan yg SUDAH wujud
// (asal atau hasil op terdahulu) akan langgar PK → DELETE baris lama sebaliknya.
const relOps = [];
const seenPair = new Set();
const finalPairs = new Set(edges.map(([t, s]) => `${t}|${s}`));
for (const [t, s] of edges) {
  const nt = remap.get(t) ?? t, ns2 = remap.get(s) ?? s;
  if (nt === t && ns2 === s) continue;
  const k = `${t}|${s}`;
  if (seenPair.has(k)) continue;
  seenPair.add(k);
  const nk = `${nt}|${ns2}`;
  // korpus ada tepi YATIM sedia ada (id tiada dlm narrators, ~2.2k) — UPDATE
  // menyentuhnya mencetus FK; tepi begitu tiada nilai → DELETE terus.
  if (nt === ns2 || finalPairs.has(nk) || !nar.has(nt) || !nar.has(ns2)) relOps.push({ del: [t, s] });
  else { relOps.push({ upd: [nt, ns2, t, s] }); finalPairs.add(nk); }
  finalPairs.delete(k);
}
// warisan death_year: pemenang kosong ← loser (nilai konsisten sahaja)
const dyFix = [];
const byWin = new Map();
for (const [l, w] of remap) (byWin.get(w) ?? byWin.set(w, []).get(w)).push(l);
for (const [w, ls] of byWin) {
  if (nar.get(w).dy != null) continue;
  const dys = [...new Set(ls.map((l) => nar.get(l).dy).filter((d) => d != null))];
  if (dys.length === 1) dyFix.push([dys[0], w]);
}
const losers = [...remap.keys()];
const inList = async (sql, ids) => Number((await db.execute({ sql: sql.replace("$IN", ids.map(() => "?").join(",")), args: ids })).rows[0].n);
let hnRows = 0, grRows = 0;
for (let i = 0; i < losers.length; i += 500) {
  const chunk = losers.slice(i, i + 500);
  hnRows += await inList("SELECT COUNT(*) n FROM hadith_narrators WHERE narrator_id IN ($IN)", chunk);
  grRows += await inList("SELECT COUNT(*) n FROM narrator_grades WHERE narrator_id IN ($IN)", chunk);
}
console.log(`\nops: relasi ${relOps.length} stmt · hn baris ${hnRows} · grades ${grRows} · narrators DELETE ${losers.length} · fts DELETE ${losers.length} · death_year warisan ${dyFix.length}`);
console.log(`anggaran writes REMOTE (selain delta-hn): ~${relOps.length + grRows + losers.length * 2 + dyFix.length}`);

const sample = [...byWin.entries()].sort((a, b) => deg(b[0]) - deg(a[0])).slice(0, 30);
console.log("\n── sampel 30 kumpulan (ikut darjah pemenang) ──");
for (const [w, ls] of sample) {
  const why = [...evid.entries()].find(([k]) => { const [a, b] = k.split("|").map(Number); return (a === w || ls.includes(a)) && (b === w || ls.includes(b)); })?.[1] ?? "";
  console.log(` #${w} "${nar.get(w).ns.slice(0, 55)}" (rel ${deg(w)}, wafat ${nar.get(w).dy ?? "-"}) ← ${ls.map((l) => `#${l} "${nar.get(l).ns.slice(0, 45)}" (rel ${deg(l)}, wafat ${nar.get(l).dy ?? "-"})`).join(" + ")}  [${why}]`);
}

if (!WRITE) { console.log("\n(DRY — --write utk kemas LOKAL + jana manifest remote)"); db.close(); process.exit(0); }

// ── tulis LOKAL ──
console.log("\n→ Tulis LOKAL…");
const stmts = [];
for (const op of relOps)
  stmts.push(op.del
    ? { sql: "DELETE FROM narrator_relations WHERE teacher_id=? AND student_id=?", args: op.del }
    : { sql: "UPDATE narrator_relations SET teacher_id=?, student_id=? WHERE teacher_id=? AND student_id=?", args: op.upd });
for (const [dy, w] of dyFix) stmts.push({ sql: "UPDATE narrators SET death_year=? WHERE id=? AND death_year IS NULL", args: [dy, w] });
for (const [l, w] of remap) {
  stmts.push({ sql: "UPDATE hadith_narrators SET narrator_id=? WHERE narrator_id=?", args: [w, l] });
  stmts.push({ sql: "UPDATE narrator_grades SET narrator_id=? WHERE narrator_id=?", args: [w, l] });
  stmts.push({ sql: "INSERT INTO narrators_fts(narrators_fts, rowid, name_search) VALUES('delete', ?, ?)", args: [l, nar.get(l).ns] });
  stmts.push({ sql: "DELETE FROM narrators WHERE id=?", args: [l] });
}
for (let i = 0; i < stmts.length; i += 300) {
  await db.batch(stmts.slice(i, i + 300), "write");
  process.stdout.write(`\r  ${Math.min(i + 300, stmts.length)}/${stmts.length}`);
}
console.log("\n✓ LOKAL siap.");
writeFileSync("scripts/_dedup-ops.json", JSON.stringify({ when: new Date().toISOString(), remap: [...remap], stmts }, null, 1));
console.log("✓ Manifest remote: scripts/_dedup-ops.json");
db.close();

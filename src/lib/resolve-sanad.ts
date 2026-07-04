"use server";
import { corpus } from "./db";
import { parseIsnadChains, strip } from "./parse-isnad";
import { CANON } from "./isnad-canonical";

export type SanadNode = {
  narrator_id: number | null;
  chain_no: number;
  position: number;
  raw_name: string; // paparan: ikut teks sanad; relational dijejak → "كليب (جده)"
  resolved: string | null; // nama penuh korpus (hover/title)
};
export type SanadResult = { nodes: SanadNode[]; chains: number; matched: number; total: number; marfu: boolean };

// ── varian nama utk padanan ──────────────────────────────────────────────
// buang alif tanwin naṣb di hujung (عليا→علي، زيدا→زيد)
const dropTanwin = (s: string) => (s.length > 3 && s.endsWith("ا") ? s.slice(0, -1) : s);
// buang kunya depan (ابو عبد الله محمد بن... → محمد بن...) — hanya bila baki ≥2 token
function sansKunya(s: string): string | null {
  const m = s.match(/^(?:ابو|ابا|ابي) (?:عبد |عبيد )?\S+ (.+)$/);
  return m && m[1].split(" ").length >= 2 ? m[1] : null;
}
function variantsOf(u: string): string[] {
  const out = [u, dropTanwin(u)];
  const sk = sansKunya(u);
  if (sk) out.push(sk, dropTanwin(sk));
  return [...new Set(out)];
}

// token relational (dari parse-isnad) → bapa/datuk boleh dijejak dari nasab
const REL_FATHER = new Set(["ابيه", "ابيها", "ابي"]);
const REL_GRANDFATHER = new Set(["جده", "جدها", "جدي", "جدته", "جدتي"]);

// nama korpus boleh ada "، وقيل :" — ambil nasab bersih pertama sahaja
const cleanNasab = (s: string) => strip(s).split(/[،,;؛]|وقيل|ويقال/)[0].trim();

type Hit = { id: number; name: string };

// padanan awalan-unik: name_search bermula "u " dan HANYA SATU calon → yakin.
// Guna julat (>= / <) supaya indeks idx_narrators_name_search digunakan (jimat rows_read Turso).
async function prefixUnique(u: string): Promise<Hit | null> {
  const r = await corpus.execute({
    sql: `SELECT id, name_ar FROM narrators WHERE name_search >= ? AND name_search < ? LIMIT 2`,
    args: [u + " ", u + " ￿"],
  });
  if (r.rows.length !== 1) return null;
  return { id: Number(r.rows[0].id), name: String(r.rows[0].name_ar ?? "") };
}

async function exactUnique(names: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!names.length) return out;
  const ph = names.map(() => "?").join(",");
  const r = await corpus.execute({
    sql: `SELECT name_search k, id FROM narrators WHERE name_search IN (${ph})
            GROUP BY name_search HAVING count(*) = 1`,
    args: names,
  });
  for (const row of r.rows) out.set(String(row.k), Number(row.id));
  return out;
}

// tangga padanan SATU nama: CANON → tepat-unik → awalan-unik (ikut varian)
async function resolveOne(u: string, exact: Map<string, number>): Promise<{ id: number; via: string } | null> {
  for (const v of variantsOf(u)) {
    const c = CANON[v];
    if (c) return { id: c, via: v };
    const e = exact.get(v);
    if (e) return { id: e, via: v };
  }
  for (const v of variantsOf(u)) {
    // awalan-unik HANYA utk nama bernasab penuh ("X بن Y…"). Nama ابن فلان /
    // kunya (ابو فلان) / 1-token dilangkau — risiko namesake tinggi, jangan
    // tertukar orang (cth ابن بشار Muslim = محمد بن بشار, bukan عثمان البغدادي).
    if (!v.includes(" بن ") || v.startsWith("ابن ") || /^(ابو|ابا|ابي) /.test(v)) continue;
    const p = await prefixUnique(v);
    if (p) return { id: p.id, via: v };
  }
  return null;
}

/** Paste sanad → parse (tahwil/atf/verba/marfu') → padan perawi korpus (CANON →
 *  tepat-unik → awalan-unik) → jejak relational (جدي/ابيه dari nasab perawi
 *  sebelumnya) → nod pohon isnad. Sanad luar korpus tetap dipapar (nod tak padan). */
export async function resolveSanad(text: string): Promise<SanadResult> {
  const { chains, marfu } = parseIsnadChains(text || "");
  const flat: { ci: number; pi: number; nm: string; norm: string }[] = [];
  chains.forEach((ch, ci) =>
    ch.forEach((pos, pi) => pos.forEach((nm) => flat.push({ ci, pi, nm, norm: strip(nm) }))),
  );
  if (!flat.length) return { nodes: [], chains: 0, matched: 0, total: 0, marfu };

  const isRel = (s: string) => REL_FATHER.has(s) || REL_GRANDFATHER.has(s);

  // ── penyatuan DALAM-sanad: nama ringkas ↔ nama penuh (kes tahwil Muslim) ──
  // "حدثنا سفيان ح وحدثني ابو بكر... سمعت سفيان بن عيينة" → سفيان cabang 1 ialah
  // سفيان بن عيينة cabang 2. Amanah: satukan HANYA jika (a) nama penuh = nama
  // ringkas + " بن …" (sambungan nasab, bukan laqab), (b) calon penuh TUNGGAL
  // dalam sanad ini, (c) mereka muncul di cabang BERBEZA (fenomena tahwil —
  // dalam cabang sama, nama berbeza posisi mungkin orang lain, jangan teka).
  {
    const chainsOf = new Map<string, Set<number>>();
    for (const f of flat) {
      if (!chainsOf.has(f.norm)) chainsOf.set(f.norm, new Set());
      chainsOf.get(f.norm)!.add(f.ci);
    }
    const norms = [...chainsOf.keys()];
    const unify = new Map<string, string>();
    for (const short of norms) {
      if (isRel(short)) continue;
      const longs = norms.filter((l) => l !== short && l.startsWith(short + " بن "));
      if (longs.length !== 1) continue;
      const sc = chainsOf.get(short)!, lc = chainsOf.get(longs[0])!;
      if (![...sc].some((c) => !lc.has(c))) continue; // mesti ada cabang berbeza
      unify.set(short, longs[0]);
    }
    if (unify.size) {
      const dispOf = new Map<string, string>();
      for (const f of flat) if (!dispOf.has(f.norm)) dispOf.set(f.norm, f.nm);
      for (const f of flat) {
        const t = unify.get(f.norm);
        if (t) { f.norm = t; f.nm = dispOf.get(t) ?? f.nm; }
      }
    }
  }

  // 1) padanan pukal: satu query tepat-unik utk SEMUA varian, kemudian tangga per-nama
  const uniq = [...new Set(flat.filter((f) => !isRel(f.norm)).map((f) => f.norm))];
  const allVariants = [...new Set(uniq.flatMap(variantsOf))];
  const exact = await exactUnique(allVariants);

  const idOf = new Map<string, number>();
  const viaOf = new Map<string, string>(); // varian yang berjaya → paparan bersih (عليا→علي)
  for (const u of uniq.slice(0, 60)) {
    const hit = await resolveOne(u, exact);
    if (hit) { idOf.set(u, hit.id); viaOf.set(u, hit.via); }
  }

  // 2) nama penuh utk id terpadan
  const metaOf = async (ids: number[]) => {
    const m = new Map<number, string>();
    if (!ids.length) return m;
    const ph = ids.map(() => "?").join(",");
    const r = await corpus.execute({
      sql: `SELECT id, name_ar FROM narrators WHERE id IN (${ph})`,
      args: ids,
    });
    for (const row of r.rows) m.set(Number(row.id), String(row.name_ar ?? ""));
    return m;
  };
  const meta = await metaOf([...new Set(idOf.values())]);

  // 3) bina nod (paparan ikut sanad; varian padan lebih bersih diguna, cth عليا→علي)
  const nodes: SanadNode[] = flat.map((f) => {
    const id = idOf.get(f.norm) ?? null;
    return {
      narrator_id: id,
      chain_no: f.ci,
      position: f.pi,
      raw_name: viaOf.get(f.norm) ?? f.nm,
      resolved: id != null ? meta.get(id) ?? null : null,
    };
  });

  // 4) jejak relational: جدي/جده/ابيه → derivasi dari nasab perawi SEBELUMNYA
  //    (cth كليب بن منفعه → korpus كليب بن منفعة بن كليب → جده = كليب)
  for (const nd of nodes) {
    if (!isRel(strip(nd.raw_name))) continue;
    const rel = strip(nd.raw_name);
    const prevs = nodes.filter((p) => p.chain_no === nd.chain_no && p.position === nd.position - 1);
    if (prevs.length !== 1) continue; // selari/tiada → kabur, jangan teka
    const base = cleanNasab(prevs[0].resolved ?? prevs[0].raw_name);
    const parts = base.split(" بن ");
    const derived = REL_GRANDFATHER.has(rel)
      ? (parts.length >= 3 ? parts.slice(2).join(" بن ") : null)
      : (parts.length >= 2 ? parts.slice(1).join(" بن ") : null);
    if (!derived) continue;
    nd.raw_name = `${derived} (${rel})`;
    // cuba padan nama derivasi dlm korpus (tangga sama)
    const ex = await exactUnique(variantsOf(derived));
    const hit = await resolveOne(derived, ex);
    if (hit) {
      nd.narrator_id = hit.id;
      const m = await metaOf([hit.id]);
      nd.resolved = m.get(hit.id) ?? null;
    }
  }

  // 5) disambiguasi GRAF GURU-MURID (kes المُهْمَل, Kamus al-Ghouri hlm 547):
  //    nama kabur (سفيان kosong / kunya ابو الوليد) yg masih tak terpaut, tetapi
  //    jirannya dlm rantai SUDAH terpaut → calon = perawi yg berhubung dgn jiran
  //    dlm narrator_relations (dua arah, indeks PK + idx_nrel_student). Terima
  //    HANYA jika tepat SATU calon sepadan nama (senama ≠ semestinya sama orang).
  //    Bacaan sahaja — 0 writes Turso; cache per-jiran elak query berulang.
  const GENERIC_RT = new Set(["رجل", "رجلا", "امراه", "شيخ", "بعضهم", "غيره", "قوم", "ناس", "جماعه", "فلان"]);
  const SENTINEL = 9000000; // id ≥ ini = nod ambigu buatan (سفيان ثقتان #9000001) — boleh diganti graf
  const CANON_IDS = new Set(Object.values(CANON).filter((v) => v < SENTINEL));
  // NOTA subrequest: Worker CF terhad ~50 subrequest/invokasi & setiap execute()
  // libsql = 1 subrequest — selepas dedup korpus, set jiran tokoh besar ≈2k,
  // jadi jimat: 1 query UNION per jiran, chunk 400, dan cache keputusan per
  // (nama, set sauh) supaya pass 2 tidak mengulang query yang sama.
  const relCache = new Map<number, Set<number>>();
  const relatedOf = async (id: number): Promise<Set<number>> => {
    let s = relCache.get(id);
    if (s) return s;
    s = new Set<number>();
    const r = await corpus.execute({
      sql: `SELECT student_id x FROM narrator_relations WHERE teacher_id=?
            UNION ALL SELECT teacher_id x FROM narrator_relations WHERE student_id=?`,
      args: [id, id],
    });
    for (const row of r.rows) s.add(Number(row.x));
    relCache.set(id, s);
    return s;
  };
  const hitCache = new Map<string, { hits: Set<number>; nsOf: Map<number, string> }>();
  const kunNorm = (s: string) => s.replace(/^(?:ابي|ابا) /, "ابو ");
  for (let pass = 0; pass < 2; pass++) {
    let progressed = false;
    const anchorsAt = (ci: number, pi: number) =>
      nodes.filter((n) => n.chain_no === ci && n.position === pi && n.narrator_id != null && n.narrator_id > 0 && n.narrator_id < SENTINEL)
        .map((n) => n.narrator_id as number);
    for (const nd of nodes) {
      if (nd.narrator_id != null && nd.narrator_id < SENTINEL) continue; // sentinel = masih boleh diperhalusi
      const u = strip(nd.raw_name).replace(/ \([^)]*\)$/, "");
      if (!u || u.length < 3 || isRel(u) || GENERIC_RT.has(u)) continue;
      const anchors = [...new Set([...anchorsAt(nd.chain_no, nd.position - 1), ...anchorsAt(nd.chain_no, nd.position + 1)])].slice(0, 6);
      if (!anchors.length) continue;
      const relSets = new Map<number, Set<number>>();
      const cand = new Set<number>();
      for (const a of anchors) {
        const s = await relatedOf(a);
        relSets.set(a, s);
        for (const x of s) cand.add(x);
      }
      if (!cand.size || cand.size > 2500) continue;
      const cacheKey = u + "‖" + anchors.join(",");
      let cached = hitCache.get(cacheKey);
      if (!cached) {
        const ids = [...cand];
        const hits = new Set<number>();
        const nsOf = new Map<number, string>(); // utk semakan "orang sama" (awalan nasab)
        for (let i = 0; i < ids.length; i += 400) {
          const chunk = ids.slice(i, i + 400);
          const ph = chunk.map(() => "?").join(",");
          const r = await corpus.execute({
            sql: `SELECT id, name_search, shuhra, kunya FROM narrators WHERE id IN (${ph})`,
            args: chunk,
          });
          for (const row of r.rows) {
            const ns = strip(String(row.name_search ?? ""));
            const sh = strip(String(row.shuhra ?? ""));
            const kn = kunNorm(strip(String(row.kunya ?? "")));
            for (const v of variantsOf(u)) {
              const vk = kunNorm(v);
              if (ns === v || ns.startsWith(v + " بن ") || (!!sh && sh === v) || (!!kn && kn === vk)) {
                hits.add(Number(row.id));
                nsOf.set(Number(row.id), ns);
                break;
              }
            }
          }
        }
        cached = { hits, nsOf };
        hitCache.set(cacheKey, cached);
      }
      const { hits, nsOf } = cached;
      // PERSILANGAN dulu (mesti berhubung dgn SEMUA jiran — kes سفيان antara
      // ابن ابي عمر (murid ابن عيينة shj) + مسعر (guru DUA-DUA Sufyan) → hanya
      // ابن عيينة lepas); fallback: union-unik; akhir: runtuhkan DUPLIKAT korpus
      // via keahlian CANON (cth ابن عيينة #3443 vs pendua #2000192 — orang SAMA,
      // pilih entri kanonik terkurasi; kalau tiada dlm CANON → kekal RAGU).
      const conn = (id: number) => anchors.filter((a) => relSets.get(a)!.has(id)).length;
      const all = [...hits].filter((id) => conn(id) === anchors.length);
      // Runtuhan pendua HANYA bila semua calon = ORANG SAMA (awalan nasab 3-token
      // seragam, cth سفيان بن عيينه ×2 pendua) — pilih entri CANON terkurasi.
      // Ibn Abi Umar riwayat drpd BEBERAPA Sufyan (عيينة+الثوري+ابن حسين) →
      // awalan berbeza → BUKAN pendua → kekal RAGU (sentinel ثقتان kekal).
      const pfx3 = (id: number) => (nsOf.get(id) ?? "").split(" ").slice(0, 3).join(" ");
      const canonOf = (arr: number[]) => {
        if (new Set(arr.map(pfx3)).size !== 1) return null; // orang berbeza → jangan teka
        const c = arr.filter((id) => CANON_IDS.has(id));
        return c.length === 1 ? c[0] : null;
      };
      const pick =
        all.length === 1 ? all[0]
        : hits.size === 1 ? [...hits][0]
        : all.length > 1 ? canonOf(all)
        : hits.size > 1 ? canonOf([...hits])
        : null;
      if (pick != null) {
        nd.narrator_id = pick;
        const m = await metaOf([pick]);
        nd.resolved = m.get(pick) ?? null;
        progressed = true;
      }
    }
    if (!progressed) break;
  }

  const matched = nodes.filter((n) => n.narrator_id != null).length;
  return { nodes, chains: chains.length, matched, total: nodes.length, marfu };
}

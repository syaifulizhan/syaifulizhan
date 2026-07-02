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

  const matched = nodes.filter((n) => n.narrator_id != null).length;
  return { nodes, chains: chains.length, matched, total: nodes.length, marfu };
}

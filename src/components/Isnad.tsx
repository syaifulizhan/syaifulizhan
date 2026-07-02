import Link from "next/link";
import { Fragment } from "react";
import type { IsnadNode } from "@/lib/hadis";
import { cleanName } from "@/lib/parse-isnad";
import { T } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

/** Rantai sanad: hormati taḥwīl (ح → cabang) & 'aṭf (و → perawi selari).
 *  marfu=false (mawqūf/maqṭūʿ) → JANGAN papar nod Nabi ﷺ. */
export function Isnad({ nodes, lang = "bm", marfu = true }: { nodes: IsnadNode[]; lang?: Lang; marfu?: boolean }) {
  if (!nodes.length) return null;

  // kumpul: chain_no → (position → [perawi selari])
  const chains = new Map<number, Map<number, IsnadNode[]>>();
  for (const nd of nodes) {
    if (!chains.has(nd.chain_no)) chains.set(nd.chain_no, new Map());
    const pos = chains.get(nd.chain_no)!;
    if (!pos.has(nd.position)) pos.set(nd.position, []);
    pos.get(nd.position)!.push(nd);
  }
  const chainArr = [...chains.entries()].sort((a, b) => a[0] - b[0]);
  const matched = nodes.filter((n) => n.resolved).length;

  // seksyen tetap terbuka di bawah matan — tiada dropdown/details
  return (
    <section className="hisnad-d hisnad-open">
      <div className="hisnad-t">
        {T.chainTitle[lang]}
        {chainArr.length > 1 && <span className="hisnad-n">{chainArr.length} {T.isnadSanad[lang]} · taḥwīl</span>}
        {matched > 0 && <span className="hisnad-n">{matched} {T.isnadLinked[lang]}</span>}
      </div>
      {chainArr.map(([cno, posMap], ci) => {
        const positions = [...posMap.entries()].sort((a, b) => a[0] - b[0]);
        return (
          <div key={cno} className="hisnad-chain">
            {chainArr.length > 1 && <span className="hisnad-br">{T.isnadSanad[lang]} {ci + 1}</span>}
            <div className="hisnad">
              {positions.map(([p, parallel], pi) => (
                <Fragment key={p}>
                  <span className="hisnad-pos">
                    {parallel.map((nd, k) => (
                      <Fragment key={k}>
                        {nd.resolved ? (
                          // Papar nama SEPERTI DALAM SANAD ASAL (raw_name, dibersih dari
                          // verba terlekat cth "عليا يخطب"→"عليا"); klik → biodata penuh.
                          // Hover papar nama penuh yang dikenal pasti.
                          <Link href={`/perawi/${nd.narrator_id}`} className="hnode" title={nd.resolved}>{nd.raw_name ? cleanName(nd.raw_name) : nd.resolved}</Link>
                        ) : (
                          <span className="hnode unl" title={T.isnadUnmatched[lang]}>
                            {nd.raw_name ? cleanName(nd.raw_name) : `#${nd.narrator_id}`}
                          </span>
                        )}
                        {k < parallel.length - 1 && <span className="hsep-w">و</span>}
                      </Fragment>
                    ))}
                  </span>
                  {pi < positions.length - 1 && <span className="hsep">عن</span>}
                </Fragment>
              ))}
              {marfu && (
                <>
                  <span className="hsep">←</span>
                  <span className="hnode" style={{ color: "var(--gold-soft)", borderColor: "var(--gold)" }}>النبي ﷺ</span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}

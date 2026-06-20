import Link from "next/link";
import { Fragment } from "react";
import type { IsnadNode } from "@/lib/hadis";

/** Rantai sanad: perawi terurut (terdekat mukharrij → terdekat Nabi). */
export function Isnad({ nodes }: { nodes: IsnadNode[] }) {
  if (!nodes.length) return null;
  return (
    <div>
      <div className="hisnad-t">Rantai Sanad</div>
      <div className="hisnad">
        {nodes.map((nd, i) => (
          <Fragment key={nd.position}>
            {nd.resolved ? (
              <Link href={`/perawi/${nd.narrator_id}`} className="hnode">
                {nd.resolved}
              </Link>
            ) : (
              <span className="hnode unl" title="Perawi belum di-scrape">
                {nd.raw_name ?? `#${nd.narrator_id}`}
              </span>
            )}
            {i < nodes.length - 1 && <span className="hsep">عن</span>}
          </Fragment>
        ))}
        <span className="hsep">←</span>
        <span className="hnode" style={{ color: "var(--gold-soft)", borderColor: "var(--gold)" }}>
          النبي ﷺ
        </span>
      </div>
    </div>
  );
}

import Link from "@/components/Link";

// Pagination bernombor (1 … 4 5 [6] 7 8 … 50) — estetik, sepadan tema.
export function Pagination({ page, totalPages, basePath, extraQuery = "", hrefFor }: {
  page: number; totalPages: number; basePath: string; extraQuery?: string;
  /** Jika ada: pautan <a> biasa (halaman statik/Worker), bukan next/link. */
  hrefFor?: (p: number) => string;
}) {
  if (totalPages <= 1) return null;
  const href = hrefFor ?? ((p: number) => `${basePath}?${extraQuery ? extraQuery + "&" : ""}page=${p}`);
  const Anchor = hrefFor ? "a" : Link;

  const pages: (number | "…")[] = [];
  const win = 2;
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= page - win && p <= page + win)) pages.push(p);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }

  return (
    <nav className="pgn" aria-label="Halaman">
      {page > 1 && <Anchor className="pgn-b" href={href(page - 1)} aria-label="Sebelum">‹</Anchor>}
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="pgn-e">…</span>
        ) : (
          <Anchor key={p} className={`pgn-b${p === page ? " active" : ""}`} href={href(p)}>
            {p}
          </Anchor>
        )
      )}
      {page < totalPages && <Anchor className="pgn-b" href={href(page + 1)} aria-label="Seterusnya">›</Anchor>}
    </nav>
  );
}

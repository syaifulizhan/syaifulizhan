import { cookies } from "next/headers";
import Link from "next/link";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

const TABS = [
  { href: "/admin/glosari", label: "Glosari" },
  { href: "/admin/hadis", label: "Hadis" },
  { href: "/admin/perawi", label: "Perawi" },
  { href: "/admin/cadangan", label: "Cadangan" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  // Halaman log masuk: tiada sesi → render tanpa shell.
  if (!session) return <>{children}</>;

  return (
    <div className="pwrap adm-wrap">
      <header className="adm-top">
        <div className="psec-t">Papan Admin · Dewan Izhan</div>
        <div className="adm-top-r">
          <span className="adm-user">@{session.login}</span>
          <a className="adm-logout" href="/api/auth/logout">Log keluar</a>
        </div>
      </header>
      <nav className="adm-tabs">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className="adm-tab">{t.label}</Link>
        ))}
      </nav>
      {children}
    </div>
  );
}

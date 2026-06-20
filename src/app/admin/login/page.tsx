import { adminLogin } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;
  return (
    <main className="pwrap" style={{ maxWidth: 420 }}>
      <div className="psec-t">Admin</div>
      <h1 style={{ fontFamily: "var(--display)", fontSize: "2rem", marginBottom: "18px" }}>Log Masuk</h1>
      {e && <p style={{ color: "var(--rubric)", marginBottom: "12px" }}>Kata laluan salah.</p>}
      <form className="suggest-form" action={adminLogin} style={{ maxWidth: 360 }}>
        <input type="password" name="password" placeholder="Kata laluan admin" required autoFocus />
        <button type="submit" className="btn solid">Masuk</button>
      </form>
    </main>
  );
}

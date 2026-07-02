export const dynamic = "force-dynamic";

const MSG: Record<string, string> = {
  denied: "Akaun GitHub ini tiada kebenaran masuk.",
  state: "Sesi log masuk tamat / tidak sah. Cuba lagi.",
  token: "Gagal sahkan dengan GitHub. Cuba lagi.",
};

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const msg = e ? MSG[e] || "Log masuk gagal. Cuba lagi." : null;
  return (
    <main className="pwrap" style={{ maxWidth: 440 }}>
      <div className="psec-t">Papan Admin · Dewan Izhan</div>
      <h1 style={{ fontFamily: "var(--display)", fontSize: "2rem", marginBottom: "8px" }}>Log Masuk</h1>
      <p style={{ color: "var(--muted)", marginBottom: "20px" }}>Akses terhad — hanya akaun yang dibenarkan.</p>
      {msg && <p style={{ color: "var(--rubric)", marginBottom: "14px" }}>{msg}</p>}
      <a className="btn solid" href="/api/auth/github" style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
        Log masuk dengan GitHub
      </a>
      <p style={{ color: "var(--muted)", marginTop: "22px", fontSize: ".85rem" }}>
        Passkey / biometrik akan ditambah sebagai lapisan kedua (fasa 2).
      </p>
    </main>
  );
}

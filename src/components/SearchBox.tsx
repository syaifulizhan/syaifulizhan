"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = [
  { v: "hadis", label: "Teks Hadis" },
  { v: "perawi", label: "Nama Perawi" },
  { v: "kitab", label: "Nama Kitab" },
];

export function SearchBox({ big = false, defaultType = "hadis", defaultQ = "" }: { big?: boolean; defaultType?: string; defaultQ?: string }) {
  const [q, setQ] = useState(defaultQ);
  const [type, setType] = useState(defaultType);
  const router = useRouter();
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/cari?q=${encodeURIComponent(q.trim())}&type=${type}`);
  };
  return (
    <form className={`searchbox${big ? " big" : ""}`} onSubmit={go}>
      <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Jenis carian">
        {TYPES.map((t) => (
          <option key={t.v} value={t.v}>{t.label}</option>
        ))}
      </select>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cari hadis, perawi, atau kitab…"
        aria-label="Carian"
      />
      <button type="submit" className="btn solid">Cari</button>
    </form>
  );
}

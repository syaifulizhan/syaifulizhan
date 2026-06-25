"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/components/LangProvider";
import { T } from "@/lib/i18n";

export function SearchBox({ big = false, defaultType = "hadis", defaultQ = "" }: { big?: boolean; defaultType?: string; defaultQ?: string }) {
  const { lang } = useLang();
  const [q, setQ] = useState(defaultQ);
  const [type, setType] = useState(defaultType);
  const router = useRouter();

  const TYPES = [
    { v: "hadis", label: T.navHadis[lang] },
    { v: "perawi", label: T.navPerawi[lang] },
    { v: "kitab", label: T.searchKitab[lang] },
  ];

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/cari?q=${encodeURIComponent(q.trim())}&type=${type}`);
  };
  return (
    <form className={`searchbox${big ? " big" : ""}`} onSubmit={go}>
      <select value={type} onChange={(e) => setType(e.target.value)} aria-label={T.searchTitle[lang]}>
        {TYPES.map((t) => (
          <option key={t.v} value={t.v}>{t.label}</option>
        ))}
      </select>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={T.searchPlaceholder[lang]}
        aria-label={T.searchTitle[lang]}
      />
      <button type="submit" className="btn solid">{T.searchBtn[lang]}</button>
    </form>
  );
}

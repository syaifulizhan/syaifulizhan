"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/types";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const Ctx = createContext<LangCtx | null>(null);

const HTML_LANG: Record<Lang, string> = { bm: "ms", en: "en", ar: "ar" };

export function LangProvider({
  initialLang = "bm",
  children,
}: {
  initialLang?: Lang;
  children: ReactNode;
}) {
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>(initialLang);

  // Tukar bahasa: kemas state (komponen klien), tulis cookie + refresh supaya
  // komponen SERVER (force-dynamic) baca cookie & render bahasa baharu juga.
  const setLang = useCallback(
    (l: Lang) => {
      setLangState(l);
      document.cookie = `lang=${l};path=/;max-age=31536000;samesite=lax`;
      router.refresh();
    },
    [router]
  );

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("lang", HTML_LANG[lang]);
    // Layout sentiasa LTR. Arah teks ikut KANDUNGAN (Arab=rtl via .ar, Rumi=ltr).
    html.setAttribute("dir", "ltr");
  }, [lang]);

  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLang mesti dalam <LangProvider>");
  return ctx;
}

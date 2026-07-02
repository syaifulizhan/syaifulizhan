"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/components/LangProvider";
import Reveal from "@/components/ui/Reveal";
import { SanadTree } from "@/components/SanadTree";
import { resolveSanad, type SanadResult } from "@/lib/resolve-sanad";

// Contoh: sanad hadith niat (Sahih al-Bukhari) — dipapar blur dalam kotak sebagai pratonton.
const EXAMPLE =
  "حَدَّثَنَا الْحُمَيْدِيُّ عَبْدُ اللَّهِ بْنُ الزُّبَيْرِ قَالَ حَدَّثَنَا سُفْيَانُ قَالَ حَدَّثَنَا يَحْيَى بْنُ سَعِيدٍ الأَنْصَارِيُّ قَالَ أَخْبَرَنِي مُحَمَّدُ بْنُ إِبْرَاهِيمَ التَّيْمِيُّ أَنَّهُ سَمِعَ عَلْقَمَةَ بْنَ وَقَّاصٍ اللَّيْثِيَّ يَقُولُ سَمِعْتُ عُمَرَ بْنَ الْخَطَّابِ عَلَى الْمِنْبَرِ قَالَ سَمِعْتُ رَسُولَ اللَّهِ صلى الله عليه وسلم يَقُولُ إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ";

const L = {
  eyebrow: { bm: "Penjana Syajarat al-Isnad", ar: "مُوَلِّد شجرة الإسناد", en: "Isnad Tree Generator" },
  lead: { bm: "Tampal mana-mana sanad.", ar: "الصق أيَّ إسناد.", en: "Paste any sanad." },
  gen: { bm: "Jana Syajarah", ar: "وَلِّد الشجرة", en: "Generate Tree" },
  ex: { bm: "Contoh (hadith niat)", ar: "مثال (حديث النية)", en: "Example (niyyah)" },
  clear: { bm: "Kosongkan", ar: "مسح", en: "Clear" },
  stat: { bm: "perawi dikenal pasti", ar: "راويًا معرَّفًا", en: "narrators identified" },
  chain: { bm: "rantai", ar: "سلسلة", en: "chains" },
  empty: { bm: "Tiada perawi dikesan — pastikan ia teks sanad berbahasa Arab.", ar: "لم تُكتشف أسماء — تأكد أنه نص إسناد بالعربية.", en: "No narrators detected — ensure it is Arabic sanad text." },
  err: { bm: "Ralat sementara — cuba jana sekali lagi.", ar: "خطأ مؤقت — أعد المحاولة.", en: "Temporary error — try again." },
};

export default function SyajaraGenerator() {
  const { lang } = useLang();
  const [text, setText] = useState(EXAMPLE);
  const [demo, setDemo] = useState(true); // pratonton blur, belum disentuh
  const [res, setRes] = useState<SanadResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [genId, setGenId] = useState(0); // remount pohon tiap janaan (elak state basi)
  const [err, setErr] = useState(false);

  async function gen(t: string) {
    if (!t.trim()) return;
    setBusy(true);
    setErr(false);
    try {
      setRes(await resolveSanad(t));
      setGenId((i) => i + 1);
    } catch (e) {
      console.error("resolveSanad:", e);
      setRes(null);
      setErr(true);
    } finally {
      setBusy(false);
    }
  }

  // jana contoh secara automatik pada muat (papar pohon cantik terus)
  useEffect(() => { gen(EXAMPLE); /* eslint-disable-next-line */ }, []);

  // AUTO-JANA berulang kali: tiap kali sanad baharu ditampal/ditaip (debounce),
  // tanpa perlu klik butang atau refresh
  useEffect(() => {
    if (demo || !text.trim()) return;
    const h = setTimeout(() => gen(text), 900);
    return () => clearTimeout(h);
    // eslint-disable-next-line
  }, [text, demo]);

  const onFocus = () => { if (demo) { setDemo(false); setText(""); } };

  return (
    <section className="sanad" id="silsilah">
      <div className="wrap sanad-in">
        <Reveal>
          <span className="eyebrow">۞ {L.eyebrow[lang]}</span>
          <p className="sanad-lead">{L.lead[lang]}</p>
          <div className="sy-input">
            <textarea
              dir="rtl"
              className={`sy-ta ar${demo ? " demo" : ""}`}
              rows={4}
              value={text}
              onFocus={onFocus}
              onChange={(e) => { setDemo(false); setText(e.target.value); }}
              aria-label={L.eyebrow[lang]}
            />
            <div className="sy-btns">
              <button className="btn" onClick={() => gen(text)} disabled={busy || !text.trim()}>
                {busy ? "…" : L.gen[lang]}
              </button>
              {!demo && text && <button className="btn ghost" onClick={() => { setText(""); setRes(null); }}>{L.clear[lang]}</button>}
            </div>
          </div>
        </Reveal>

        {err && <p className="pempty">{L.err[lang]}</p>}
        {res && (
          <div className="sy-tree">
            {res.total > 0 ? (
              <>
                <div className="sy-stat">
                  {res.matched}/{res.total} {L.stat[lang]} · {res.chains} {L.chain[lang]}
                </div>
                <SanadTree key={genId} nodes={res.nodes} marfu={res.marfu} lang={lang} />
              </>
            ) : (
              <p className="pempty">{L.empty[lang]}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

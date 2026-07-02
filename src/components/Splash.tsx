"use client";

import { useEffect, useState } from "react";

/** Splash masuk apps — basmalah, logo, ديوان الإذهان, محمد سيف الإذهان.
 *  Sekali per sesi (sessionStorage), pudar keluar selepas seketika. */
export default function Splash() {
  const [phase, setPhase] = useState<"idle" | "show" | "hide">("idle");

  useEffect(() => {
    if (sessionStorage.getItem("splashShown")) return;
    sessionStorage.setItem("splashShown", "1");
    setPhase("show");
    const t1 = setTimeout(() => setPhase("hide"), 1700); // mula pudar
    const t2 = setTimeout(() => setPhase("idle"), 2400); // buang dari DOM
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (phase === "idle") return null;
  return (
    <div className={`splash${phase === "hide" ? " out" : ""}`} aria-hidden="true">
      <div className="splash-in">
        <div className="splash-basmala ar">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
        <img className="splash-logo" src="/logo-mark.png" alt="" />
        <div className="splash-diwan ar">دِيوَان الإِذهَان</div>
        <div className="splash-person ar">مُحَمَّد سَيْف الإِذهَان</div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

/** Tarik-ke-bawah untuk muat semula (gaya apps) — ramai pengguna simpan laman
 *  sebagai app (A2HS) tanpa butang refresh. Aktif hanya bila skrol di puncak. */
const THRESHOLD = 78;

export default function PullRefresh() {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      if (window.scrollY <= 0) startY.current = e.touches[0].clientY;
      else startY.current = null;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current == null || busy) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && window.scrollY <= 0) setPull(Math.min(dy * 0.5, THRESHOLD * 1.4));
      else setPull(0);
    };
    const onEnd = () => {
      if (pull >= THRESHOLD && !busy) {
        setBusy(true);
        location.reload();
      } else setPull(0);
      startY.current = null;
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [pull, busy]);

  if (pull <= 0 && !busy) return null;
  const ready = pull >= THRESHOLD;
  return (
    <div className="ptr" style={{ transform: `translateY(${Math.min(pull, THRESHOLD)}px)` }} aria-hidden="true">
      <span className={`ptr-ico${busy ? " spin" : ready ? " ready" : ""}`}>۞</span>
    </div>
  );
}

/** Definisi SVG pattern "khatam" (kisi geometri) — dirujuk oleh .bg-pattern. */
export default function StarPattern() {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: "absolute" }}
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="khatam"
          width="64"
          height="64"
          patternUnits="userSpaceOnUse"
        >
          <g fill="none" stroke="#C7A338" strokeWidth="1">
            <rect x="18" y="18" width="28" height="28" />
            <rect
              x="18"
              y="18"
              width="28"
              height="28"
              transform="rotate(45 32 32)"
            />
          </g>
        </pattern>
      </defs>
    </svg>
  );
}

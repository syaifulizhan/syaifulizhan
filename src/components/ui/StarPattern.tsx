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
        {/* Kisi khatam 8-bucu BERSAMBUNG (seamless): bintang penuh di setiap penjuru
            (bergabung merentas tile) + tengah → corak berterusan, tepi mengalir kemas,
            tiada bintang terapung terpotong. */}
        <pattern
          id="khatam"
          width="64"
          height="64"
          patternUnits="userSpaceOnUse"
        >
          <g fill="none" stroke="#C7A338" strokeWidth="1">
            {/* bintang tengah (satu tile penuh) */}
            <rect x="19" y="19" width="26" height="26" />
            <rect x="19" y="19" width="26" height="26" transform="rotate(45 32 32)" />
            {/* bintang penjuru — 4 sudut; suku setiap satu bergabung jadi bintang penuh di grid */}
            {[[0, 0], [64, 0], [0, 64], [64, 64]].map(([cx, cy]) => (
              <g key={`${cx}-${cy}`}>
                <rect x={cx - 13} y={cy - 13} width="26" height="26" />
                <rect x={cx - 13} y={cy - 13} width="26" height="26" transform={`rotate(45 ${cx} ${cy})`} />
              </g>
            ))}
          </g>
        </pattern>
      </defs>
    </svg>
  );
}

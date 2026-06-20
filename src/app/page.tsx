export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="border border-[color:var(--line-dark)] px-8 py-12 sm:px-16 sm:py-16 max-w-2xl">
        <div className="text-gold text-2xl mb-6" aria-hidden>
          ۞
        </div>

        <p className="font-arabic text-gold-soft text-2xl sm:text-3xl mb-3">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>

        <p className="font-arabic text-paper text-3xl sm:text-4xl mb-8">
          دِيوَان الإِذهَان · سَيْف الإِذهَان
        </p>

        <h1 className="text-paper text-4xl sm:text-5xl mb-4">
          Dīwān <span className="text-gold">Izhan</span>
        </h1>

        <p className="text-muted text-xs tracking-[0.3em] uppercase mb-8">
          Riwayah · Takhrij · Darjat
        </p>

        <p className="text-paper/80 leading-relaxed mb-10">
          Ilmu yang <span className="text-gold-soft">boleh disemak</span> —
          hadith dibawa dengan sanad, takhrij dan darjatnya, dalam bahasa kita.
        </p>

        <div className="inline-block border border-[color:var(--line-dark)] px-5 py-2 text-muted text-xs tracking-[0.2em] uppercase">
          Sedang dibina · Fasa 1
        </div>
      </div>

      <p className="mt-10 text-muted/70 text-xs tracking-wide">syaifulizhan.my</p>
    </main>
  );
}

import StarPattern from "@/components/ui/StarPattern";
import Nav from "@/components/layout/Nav";
import Hero from "@/components/sections/Hero";
import SanadExplorer from "@/components/sections/SanadExplorer";
import Ilmu from "@/components/sections/Ilmu";
import Tentang from "@/components/sections/Tentang";
import Khidmat from "@/components/sections/Khidmat";
import Footer from "@/components/layout/Footer";
import { SearchBox } from "@/components/SearchBox";

export default function Home() {
  return (
    <>
      <StarPattern />
      <Nav />
      <Hero />
      <section className="searchband">
        <div className="wrap searchband-in">
          <div className="eyebrow">Cari dalam korpus</div>
          <h2 className="searchband-h">Jelajah hadis, perawi &amp; kitab</h2>
          <SearchBox big />
        </div>
      </section>
      <SanadExplorer />
      <Ilmu />
      <Tentang />
      <Khidmat />
      <Footer />
    </>
  );
}

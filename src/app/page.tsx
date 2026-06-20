import StarPattern from "@/components/ui/StarPattern";
import Nav from "@/components/layout/Nav";
import Hero from "@/components/sections/Hero";
import SanadExplorer from "@/components/sections/SanadExplorer";
import Ilmu from "@/components/sections/Ilmu";
import Tentang from "@/components/sections/Tentang";
import Khidmat from "@/components/sections/Khidmat";
import Footer from "@/components/layout/Footer";

export default function Home() {
  return (
    <>
      <StarPattern />
      <Nav />
      <Hero />
      <SanadExplorer />
      <Ilmu />
      <Tentang />
      <Khidmat />
      <Footer />
    </>
  );
}

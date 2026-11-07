import type { Metadata } from "next";
import StarPattern from "@/components/ui/StarPattern";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import SyajaraGenerator from "@/components/sections/SyajaraGenerator";

// Penjana sanad memanggil server action (POST) — mesti kekal Next SSR, bukan aset statik.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Penjana Syajarat al-Isnad | Dewan Izhan" };

export default function Silsilah() {
  return (
    <>
      <StarPattern />
      <Nav />
      <SyajaraGenerator />
      <Footer />
    </>
  );
}

import type { Metadata } from "next";
import { LangProvider } from "@/components/LangProvider";
import Splash from "@/components/Splash";
import PullRefresh from "@/components/PullRefresh";
import { getServerLang } from "@/lib/lang-server";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://syaifulizhan.my"),
  title: "Dewan Izhan",
  description:
    "Hadis dibawa dengan sanad, takhrij dan darjatnya — telus, teliti, dalam bahasa kita. Platform ilmu riwayah dan perkhidmatan digital oleh Muhammad Syaiful Izhan.",
  keywords: [
    "hadith",
    "riwayah",
    "takhrij",
    "sanad",
    "ilmu Islam",
    "web developer Malaysia",
  ],
  authors: [{ name: "Muhammad Syaiful Izhan bin Shahruddin" }],
  openGraph: {
    title: "Dewan Izhan",
    description: "Ilmu riwayah yang boleh disemak — dalam bahasa kita.",
    url: "https://syaifulizhan.my",
    siteName: "Dewan Izhan",
    locale: "ms_MY",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Dewan Izhan" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await getServerLang();
  return (
    <html lang={lang === "bm" ? "ms" : lang} className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Guna <link> (bukan next/font) supaya build static tidak bergantung
            pada muat turun font masa build — lebih tahan untuk Cloudflare. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=IBM+Plex+Sans:wght@300;400;500;600&family=Amiri:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Splash />
        <PullRefresh />
        <LangProvider initialLang={lang}>{children}</LangProvider>
      </body>
    </html>
  );
}

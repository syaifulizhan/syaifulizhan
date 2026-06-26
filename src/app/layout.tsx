import type { Metadata } from "next";
import { LangProvider } from "@/components/LangProvider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://syaifulizhan.my"),
  title: "Dewan Izhan · Ilmu Riwayah & Teknologi",
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
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms" className="h-full antialiased">
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
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}

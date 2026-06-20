import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://syaifulizhan.my"),
  title: "Dīwān Izhan · Ilmu Riwayah & Teknologi",
  description:
    "Hadith dibawa dengan sanad, takhrij dan darjatnya — telus, teliti, dalam bahasa kita. Platform ilmu riwayah dan perkhidmatan digital oleh Muhammad Syaiful Izhan.",
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
    title: "Dīwān Izhan",
    description: "Ilmu riwayah yang boleh disemak — dalam bahasa kita.",
    url: "https://syaifulizhan.my",
    siteName: "Dīwān Izhan",
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
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=IBM+Plex+Sans:wght@300;400;500;600&family=Amiri:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

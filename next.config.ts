import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fasa 2 — zon hadis dinamik (SSR). `output: 'export'` dibuang supaya route
  // dinamik (/perawi/[id], /hadis, /api/*) & pembacaan korpus Turso berfungsi.
  // Deploy Cloudflare via @opennextjs/cloudflare (dipasang masa fasa deploy).
  images: { unoptimized: true },
  trailingSlash: true,
  // libsql ada binari native — jangan bundle (server component baca korpus).
  serverExternalPackages: ["@libsql/client", "libsql"],
};

export default nextConfig;

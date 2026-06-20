import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fasa 1 — laman statik. Menjana folder `out/` HTML/CSS/JS tulen
  // yang dihidang terus oleh Cloudflare Pages tanpa adapter/edge runtime.
  output: "export",
  // Static export tidak menyokong Image Optimization server-side.
  images: { unoptimized: true },
  // Trailing slash supaya routing kemas di Cloudflare Pages.
  trailingSlash: true,
};

export default nextConfig;

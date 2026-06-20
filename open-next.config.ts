import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Konfigurasi @opennextjs/cloudflare — jalankan Next.js 16 (SSR) sebagai Cloudflare Worker.
// Cache lalai (in-memory). Boleh tambah R2/KV incremental cache kemudian.
export default defineCloudflareConfig();

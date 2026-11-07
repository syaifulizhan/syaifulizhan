#!/usr/bin/env node
// Gagalkan build jika .open-next/assets melebihi had fail Cloudflare Workers Assets (percuma: 20,000).
import { readdirSync } from "node:fs";

const LIMIT = 19000;
const count = (dir) => readdirSync(dir, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(`${dir}/${e.name}`) : 1), 0);
const n = count(".open-next/assets");
console.log(`aset: ${n} fail (had ${LIMIT})`);
if (n > LIMIT) {
  console.error(`GAGAL: ${n} > ${LIMIT} fail aset`);
  process.exit(1);
}

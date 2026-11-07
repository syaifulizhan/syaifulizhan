import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * Pembalut next/link: prefetch DIMATIKAN secara lalai (Worker percuma 100k req/hari —
 * satu paparan halaman = satu request). Next 16 tiada konfigurasi global untuk ini.
 * Guna komponen ini, bukan `next/link`, di seluruh src.
 */
export default function Link({ prefetch = false, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={prefetch} {...props} />;
}

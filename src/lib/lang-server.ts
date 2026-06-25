import { cookies } from "next/headers";
import type { Lang } from "./types";

/** Baca bahasa pilihan dari cookie (server). LangProvider tulis cookie + router.refresh()
 *  bila toggle, jadi komponen SERVER (force-dynamic) pun ikut bahasa. Lalai BM. */
export async function getServerLang(): Promise<Lang> {
  const v = (await cookies()).get("lang")?.value;
  return v === "en" || v === "ar" || v === "bm" ? v : "bm";
}

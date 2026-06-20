export type Lang = "bm" | "en" | "ar";

export interface ChainNode {
  nm: string; // nama Arab
  role: string; // peranan / tabaqat
  type?: "prophet" | "collector";
}

export interface Hadith {
  label: Record<Lang, string>;
  ar: string;
  tr: Record<Lang, string>;
  grade: Record<Lang, string>;
  takhrij: string;
  chain: ChainNode[];
}

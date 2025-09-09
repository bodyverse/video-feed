import type { VideoItem } from "../types";

function parseCsv(csv: string): VideoItem[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = {
    src: headers.indexOf("src"),
    poster: headers.indexOf("poster"),
    title: headers.indexOf("title"),
    id: headers.indexOf("id"),
  };
  const items: VideoItem[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (!row.trim()) continue;
    const cols = row.split(",");
    const src = idx.src >= 0 ? cols[idx.src]?.trim() : undefined;
    if (!src) continue;
    const title = idx.title >= 0 ? cols[idx.title]?.trim() : undefined;
    const poster = idx.poster >= 0 ? cols[idx.poster]?.trim() : undefined;
    const id = (idx.id >= 0 ? cols[idx.id]?.trim() : undefined) || `${i}`;
    items.push({ id, src, poster, title });
  }
  return items;
}

async function loadFromSheetCsv(): Promise<VideoItem[]> {
  const url = import.meta.env.VITE_SHEET_CSV as string | undefined;
  if (!url) return [];
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
    const text = await res.text();
    return parseCsv(text);
  } catch (e) {
    console.warn("Failed to load Google Sheet CSV:", e);
    return [];
  }
}

async function loadFromPublicJson(): Promise<VideoItem[]> {
  try {
    const res = await fetch("/videos.json", { cache: "no-cache" });
    if (!res.ok) return [];
    const arr = (await res.json()) as VideoItem[];
    return arr.filter((v) => !!v.src);
  } catch {
    return [];
  }
}

export async function loadVideos(): Promise<VideoItem[]> {
  const [fromSheet, fromJson] = await Promise.all([
    loadFromSheetCsv(),
    loadFromPublicJson(),
  ]);
  // Merge, sheet first then fallback JSON; dedupe by src
  const seen = new Set<string>();
  const all: VideoItem[] = [];
  for (const v of [...fromSheet, ...fromJson]) {
    if (!seen.has(v.src)) {
      seen.add(v.src);
      all.push(v);
    }
  }
  // Ensure we have some content
  return all;
}

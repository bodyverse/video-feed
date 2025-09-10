import type { VideoItem } from "../types";

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(csv: string): VideoItem[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0])
    .map((h) => h.trim().toLowerCase());
  const getIndex = (names: string[]) =>
    names.map((n) => headers.indexOf(n)).find((i) => i !== -1) ?? -1;
  const idx = {
    src: getIndex(["src", "url"]),
    poster: getIndex(["poster", "thumbnail", "thumb"]),
    title: getIndex(["title", "name", "caption"]),
    id: getIndex(["id", "key"]),
  };
  const items: VideoItem[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (!row.trim()) continue;
    const cols = splitCsvLine(row).map((c) => c.trim());
    const src = idx.src >= 0 ? cols[idx.src] : undefined;
    if (!src) continue;
    const title = idx.title >= 0 ? cols[idx.title] : undefined;
    const poster = idx.poster >= 0 ? cols[idx.poster] : undefined;
    const id = (idx.id >= 0 ? cols[idx.id] : undefined) || `${i}`;
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
    const base = (import.meta as any).env?.BASE_URL ?? "/";
    const url = `${base.replace(/\/$/, "/")}videos.json`;
    const res = await fetch(url, { cache: "no-cache" });
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

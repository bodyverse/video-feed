import type { VideoItem } from "../types";

export type LoadOptions = {
  sheetCsvUrl?: string;
  publicJsonPath?: string; // relative to BASE_URL
};

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

function normalizeGoogleSheetCsvUrl(url: string): string {
  try {
    const u = new URL(url);
    // If already an export/gviz link, keep it
    if (/\/export$/i.test(u.pathname) || u.pathname.includes('/gviz/')) return url;
    // Expect /spreadsheets/d/<id>/edit?gid=<gid>
    const parts = u.pathname.split('/');
    const idIndex = parts.findIndex((p) => p === 'd');
    const sheetId = idIndex >= 0 ? parts[idIndex + 1] : '';
    const gid = u.searchParams.get('gid') || '0';
    if (sheetId) {
      return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    }
  } catch {}
  return url;
}

async function loadFromSheetCsv(opts?: LoadOptions): Promise<VideoItem[]> {
  const raw = (opts?.sheetCsvUrl as string | undefined) || (import.meta as any).env?.VITE_SHEET_CSV;
  const url = raw ? normalizeGoogleSheetCsvUrl(raw) : undefined;
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

async function loadFromPublicJson(opts?: LoadOptions): Promise<VideoItem[]> {
  try {
    const base = (import.meta as any).env?.BASE_URL ?? "/";
    const rel = opts?.publicJsonPath || "videos.json";
    const url = `${base.replace(/\/$/, "/")}${rel}`;
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) return [];
    const arr = (await res.json()) as VideoItem[];
    return arr.filter((v) => !!v.src);
  } catch {
    return [];
  }
}

export async function loadVideos(opts?: LoadOptions): Promise<VideoItem[]> {
  const [fromSheet, fromJson] = await Promise.all([
    loadFromSheetCsv(opts),
    loadFromPublicJson(opts),
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

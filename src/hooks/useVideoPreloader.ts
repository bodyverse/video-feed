import { useEffect, useRef } from "react";
import type { VideoItem } from "../types";

export function useVideoPreloader(
  videos: VideoItem[],
  currentIndex: number,
  preloadAhead = 2,
  preloadBehind = 1
) {
  const cache = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    const aheadStart = Math.max(0, currentIndex + 1);
    const aheadEnd = Math.min(videos.length, currentIndex + 1 + preloadAhead);
    const behindStart = Math.max(0, currentIndex - preloadBehind);
    const behindEnd = Math.max(0, currentIndex); // exclusive of current

    const set = new Map<string, VideoItem>();
    videos.slice(aheadStart, aheadEnd).forEach((v) => set.set(v.src, v));
    videos.slice(behindStart, behindEnd).forEach((v) => set.set(v.src, v));
    const toPreload = Array.from(set.values());

    toPreload.forEach((v) => {
      if (!cache.current.has(v.src)) {
        const el = document.createElement("video");
        el.src = v.src;
        el.preload = "auto";
        // el.muted = true;
        // Kick off load
        el.load();
        cache.current.set(v.src, el);
      }
    });

    return () => {
      // Optionally trim cache size
      const max = 8;
      if (cache.current.size > max) {
        const keys = Array.from(cache.current.keys());
        for (let i = 0; i < cache.current.size - max; i++) {
          const k = keys[i];
          const el = cache.current.get(k);
          if (el) {
            el.src = "";
          }
          cache.current.delete(k);
        }
      }
    };
  }, [videos, currentIndex, preloadAhead, preloadBehind]);

  return cache.current;
}

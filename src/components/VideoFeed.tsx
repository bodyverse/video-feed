import { useEffect, useMemo, useState } from "react";
import { loadVideos } from "../data/sources";
import type { VideoItem } from "../types";
import { useVideoPreloader } from "../hooks/useVideoPreloader";
import VideoCard from "./VideoCard";

export default function VideoFeed() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVideos()
      .then((v) => setVideos(v))
      .catch((e) => setError(String(e)));
  }, []);

  useVideoPreloader(videos, current, 2);

  const content = useMemo(() => {
    if (error) return <div className="p-4 text-red-400">{error}</div>;
    if (videos.length === 0)
      return (
        <div className="p-6 text-center text-white/70">Loading videos…</div>
      );
    return videos.map((v, i) => (
      <VideoCard key={v.id || v.src} item={v} index={i} onVisible={setCurrent} />
    ));
  }, [videos, error]);

  return (
    <div className="h-screen w-full overflow-y-scroll snap-y snap-mandatory bg-black">
      {content}
    </div>
  );
}

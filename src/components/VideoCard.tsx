import { useEffect, useRef, useState } from "react";
import type { VideoItem } from "../types";
import { isYouTube, isVimeo, makeVimeoEmbed, makeYouTubeEmbed, toVimeoId, toYouTubeId } from "../utils/embed";

type Props = {
  item: VideoItem;
  index: number;
  activeIndex: number;
  onVisible: (index: number) => void;
  preload?: boolean;
};

export function VideoCard({ item, index, activeIndex, onVisible, preload = false }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [userPaused, setUserPaused] = useState(false);
  const wasPreloadedRef = useRef(false);

  useEffect(() => {
    if (preload) wasPreloadedRef.current = true;
  }, [preload]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const visible = e.isIntersecting && e.intersectionRatio > 0.6;
          if (visible) onVisible(index);
        });
      },
      { threshold: [0, 0.6, 1] }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [index, onVisible]);

  const isActive = activeIndex === index;

  useEffect(() => {
    if (!isActive && userPaused) {
      setUserPaused(false);
    }
  }, [isActive, userPaused]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive && !userPaused) {
      el.play().catch(() => { });
    } else {
      el.pause();
    }
  }, [isActive, userPaused]);

  // Control embeds via postMessage
  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame) return;
    const win = frame.contentWindow;
    if (!win) return;
    const play = () => {
      if (ytId) {
        win.postMessage(
          JSON.stringify({ event: "command", func: "playVideo", args: [] }),
          "*"
        );
      } else if (vimeoId) {
        win.postMessage({ method: "play" }, "https://player.vimeo.com");
      }
    };
    const pause = () => {
      if (ytId) {
        win.postMessage(
          JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
          "*"
        );
      } else if (vimeoId) {
        win.postMessage({ method: "pause" }, "https://player.vimeo.com");
      }
    };
    if (isActive && !userPaused) play();
    else pause();
  }, [isActive, userPaused]);

  const handleToggle = () => {
    const el = videoRef.current;
    if (el) {
      if (el.paused) {
        el.play().catch(() => { });
        setUserPaused(false);
      } else {
        el.pause();
        setUserPaused(true);
      }
      return;
    }
    // iframe case
    const nowPaused = !userPaused;
    setUserPaused(nowPaused);
  };

  const ytId = isYouTube(item.src) ? toYouTubeId(item.src) : null;
  const vimeoId = !ytId && isVimeo(item.src) ? toVimeoId(item.src) : null;

  return (
    <div
      ref={ref}
      className="snap-start h-screen w-full flex items-center justify-center relative bg-black"
      onClick={handleToggle}
    >
      {ytId || vimeoId ? (
        (isActive || preload) ? (
          <>
            <iframe
              ref={iframeRef}
              key={ytId ? `yt-${ytId}` : `vi-${vimeoId}`}
              src={ytId
                ? makeYouTubeEmbed(ytId!, { autoplay: wasPreloadedRef.current ? false : isActive && !preload })
                : makeVimeoEmbed(vimeoId!, { autoplay: wasPreloadedRef.current ? false : isActive && !preload })
              }
              className="h-full w-full pointer-events-none"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              // Hide when only preloading to avoid visual artifacts
              style={isActive ? undefined : { position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
            />
          </>
        ) : (
          <div className="text-white/60">{item.title || 'Video'}</div>
        )
      ) : (
        <video
          ref={videoRef}
          src={item.src}
          poster={item.poster}
          playsInline
          loop
          preload={preload ? "auto" : "metadata"}
          className="max-h-full max-w-full object-contain"
        />
      )}
      {item.title && (
        <div className="pointer-events-none absolute bottom-6 left-4 right-4 text-white/90 text-sm">
          {item.title}
        </div>
      )}
    </div>
  );
}

export default VideoCard;

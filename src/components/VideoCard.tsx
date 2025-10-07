import { useCallback, useEffect, useRef, useState } from "react";
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
  const skipNextToggleRef = useRef(false);
  const ytId = isYouTube(item.src) ? toYouTubeId(item.src) : null;
  const vimeoId = !ytId && isVimeo(item.src) ? toVimeoId(item.src) : null;
  const isEmbed = !!(ytId || vimeoId);
  const needsFirstResumeRef = useRef(isEmbed);

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
    needsFirstResumeRef.current = isEmbed;
  }, [isEmbed, item.src]);

  useEffect(() => {
    if (!isActive && userPaused) {
      setUserPaused(false);
    }
  }, [isActive, userPaused]);

  const requestPlay = useCallback((markGesture = false) => {
    const el = videoRef.current;
    if (el) {
      const playResult = el.play();
      if (playResult && typeof (playResult as Promise<void>).then === "function") {
        return (playResult as Promise<void>)
          .then(() => {
            setUserPaused(false);
            if (markGesture) needsFirstResumeRef.current = false;
            return true;
          })
          .catch(() => {
            setUserPaused(true);
            return false;
          });
      }
      setUserPaused(false);
      if (markGesture) needsFirstResumeRef.current = false;
      return Promise.resolve(true);
    }
    const frame = iframeRef.current;
    const win = frame?.contentWindow;
    if (!win) return Promise.resolve(false);
    if (ytId) {
      win.postMessage(
        JSON.stringify({ event: "command", func: "playVideo", args: [] }),
        "*"
      );
    } else if (vimeoId) {
      win.postMessage({ method: "play" }, "https://player.vimeo.com");
    } else {
      return Promise.resolve(false);
    }
    setUserPaused(false);
    if (markGesture) needsFirstResumeRef.current = false;
    return Promise.resolve(true);
  }, [vimeoId, ytId]);

  useEffect(() => {
    const el = videoRef.current;
    if (isActive && !userPaused) {
      requestPlay();
    } else if (el) {
      el.pause();
    }
  }, [isActive, userPaused, requestPlay]);

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

  const handlePointerDown = () => {
    if (!isActive) return;
    const el = videoRef.current;
    const frame = iframeRef.current;
    const shouldAttempt =
      (el && el.paused) ||
      (!el && frame && (userPaused || needsFirstResumeRef.current));
    if (!shouldAttempt) return;
    skipNextToggleRef.current = true;
    requestPlay(true).then((ok) => {
      if (!ok) skipNextToggleRef.current = false;
    });
  };

  const handleToggle = () => {
    if (skipNextToggleRef.current) {
      skipNextToggleRef.current = false;
      return;
    }
    const el = videoRef.current;
    if (el) {
      if (el.paused) {
        requestPlay(true);
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

  return (
    <div
      ref={ref}
      className="snap-start h-screen w-full flex items-center justify-center relative bg-black"
      onPointerDown={handlePointerDown}
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

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadVideos } from "../data/sources";
import type { VideoItem } from "../types";
import { useVideoPreloader } from "../hooks/useVideoPreloader";
import VideoCard from "./VideoCard";

export default function VideoFeed() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Gesture state
  const startYRef = useRef<number | null>(null);
  const lastYRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const isDraggingRef = useRef(false);

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

  // Helper to scroll to an index
  const scrollToIndex = (idx: number) => {
    const container = containerRef.current;
    if (!container) return;
    const clamped = Math.max(0, Math.min(videos.length - 1, idx));
    const target = container.children[clamped] as HTMLElement | undefined;
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Keyboard navigation (Up/Down arrows, PageUp/PageDown)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        scrollToIndex(current + 1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        scrollToIndex(current - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        scrollToIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        scrollToIndex(videos.length - 1);
      }
    };
    el.addEventListener("keydown", onKey);
    // Focus for keyboard capture
    el.tabIndex = 0;
    el.focus({ preventScroll: true });
    return () => el.removeEventListener("keydown", onKey);
  }, [current, videos.length]);

  // Pointer/touch swipe detection for up/down navigation
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only primary pointer
    if (e.isPrimary === false) return;
    isDraggingRef.current = true;
    const y = e.clientY;
    startYRef.current = y;
    lastYRef.current = y;
    startTimeRef.current = performance.now();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    lastYRef.current = e.clientY;
    // Apply subtle visual feedback on the active card
    const container = containerRef.current;
    if (!container) return;
    const active = container.children[current] as HTMLElement | undefined;
    if (active) {
      const dy = (lastYRef.current ?? 0) - (startYRef.current ?? 0);
      // No transition while dragging
      active.style.transition = "none";
      active.style.transform = `translateY(${Math.max(-80, Math.min(80, dy * 0.15))}px)`;
    }
  };

  const onPointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const startY = startYRef.current;
    const lastY = lastYRef.current;
    startYRef.current = null;
    lastYRef.current = null;
    const dt = Math.max(1, performance.now() - startTimeRef.current);
    if (startY == null || lastY == null) return;
    const dy = lastY - startY; // positive if dragging down
    const vy = dy / dt; // px per ms
    const absDy = Math.abs(dy);
    const absVy = Math.abs(vy);
    // Trigger if a flick or a solid drag
    const dragThreshold = 60; // px
    const velocityThreshold = 0.5 / 100; // 0.005 px/ms (0.5px per 100ms)
    // Reset visual displacement with a quick ease-out
    const container = containerRef.current;
    const active = container?.children[current] as HTMLElement | undefined;
    if (active) {
      active.style.transition = "transform 180ms ease-out";
      active.style.transform = "translateY(0px)";
      // Clear transition after it ends
      window.setTimeout(() => {
        if (active) active.style.transition = "";
      }, 200);
    }

    if (absDy > dragThreshold || absVy > velocityThreshold) {
      if (dy < 0) scrollToIndex(current + 1); // swipe up → next
      else if (dy > 0) scrollToIndex(current - 1); // swipe down → prev
    }
  };

  // Wheel step navigation (desktop)
  const wheelCooldownRef = useRef<number>(0);
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const now = performance.now();
    if (now - wheelCooldownRef.current < 450) return; // debounce
    const threshold = 30; // pixels
    if (Math.abs(e.deltaY) > threshold) {
      e.preventDefault();
      wheelCooldownRef.current = now;
      if (e.deltaY > 0) scrollToIndex(current + 1);
      else scrollToIndex(current - 1);
    }
  };

  return (
    <div
      ref={containerRef}
      className="h-screen w-full overflow-y-scroll snap-y snap-mandatory bg-black outline-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
      onWheel={onWheel}
    >
      {content}
    </div>
  );
}

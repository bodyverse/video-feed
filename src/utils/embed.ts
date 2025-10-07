export function isYouTube(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)\//i.test(url);
}

export function isVimeo(url: string): boolean {
  return /vimeo\.com\//i.test(url);
}

export function toYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.slice(1) || null;
    }
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/watch')) return u.searchParams.get('v');
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2] || null;
      if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2] || null;
    }
  } catch { }
  return null;
}

export function toVimeoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('vimeo.com')) {
      const parts = u.pathname.split('/').filter(Boolean);
      return parts[0] || null;
    }
  } catch { }
  return null;
}

export function makeYouTubeEmbed(id: string, opts?: { autoplay?: boolean }): string {
  const autoplay = opts?.autoplay ?? true;
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    // mute: '1',
    loop: '1',
    playlist: id,
    controls: '0',
    modestbranding: '1',
    rel: '0',
    playsinline: '1',
    disablekb: '1',
    fs: '0',
    cc_load_policy: '0',
    enablejsapi: '1',
  });
  // Use the no-cookie domain to reduce tracking cookies
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

export function makeVimeoEmbed(id: string, opts?: { autoplay?: boolean }): string {
  const autoplay = opts?.autoplay ?? true;
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    // muted: '1',
    loop: '1',
    background: '1', // hides controls/UI
    autopause: '0',
    dnt: '1',
    title: '0',
    byline: '0',
    portrait: '0',
    api: '1',
  });
  return `https://player.vimeo.com/video/${id}?${params.toString()}`;
}

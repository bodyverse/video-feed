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
  } catch {}
  return null;
}

export function toVimeoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('vimeo.com')) {
      const parts = u.pathname.split('/').filter(Boolean);
      return parts[0] || null;
    }
  } catch {}
  return null;
}

export function makeYouTubeEmbed(id: string): string {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    loop: '1',
    playlist: id,
    controls: '0',
    modestbranding: '1',
    rel: '0',
    playsinline: '1',
  });
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

export function makeVimeoEmbed(id: string): string {
  const params = new URLSearchParams({
    autoplay: '1',
    muted: '1',
    loop: '1',
    background: '1',
    autopause: '0',
  });
  return `https://player.vimeo.com/video/${id}?${params.toString()}`;
}


import { useEffect, useRef } from 'react';

/* Minimal typing for the YouTube IFrame Player API. */
interface YTPlayer {
  getCurrentTime(): number;
  getPlayerState(): number;
  destroy(): void;
}
declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opts: object) => YTPlayer; PlayerState: { PLAYING: number } };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiReady: Promise<void> | null = null;
function loadApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  apiReady ??= new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  });
  return apiReady;
}

const PLAYING = 1;
const BEAT_MS = 10_000;

/**
 * Embedded video that reports its position about every 10 s while playing.
 * The server decides how much of that counts as real watching.
 */
export function YouTubePlayer({ videoId, startSec, onBeat }: { videoId: string; startSec: number; onBeat: (positionSec: number) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const beat = useRef(onBeat);
  beat.current = onBeat;

  useEffect(() => {
    let player: YTPlayer | null = null;
    let timer: number | undefined;
    let cancelled = false;
    const send = () => {
      if (player) beat.current(player.getCurrentTime());
    };

    void loadApi().then(() => {
      if (cancelled || !host.current || !window.YT) return;
      const el = document.createElement('div');
      host.current.appendChild(el);
      player = new window.YT.Player(el, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: { start: Math.floor(startSec), rel: 0, modestbranding: 1 },
        events: {
          onStateChange: (e: { data: number }) => {
            window.clearInterval(timer);
            send(); // starts the clock on play, records the position on pause or end
            if (e.data === PLAYING) timer = window.setInterval(send, BEAT_MS);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      if (player && player.getPlayerState?.() === PLAYING) send();
      player?.destroy();
    };
    // The player is created once per video; a new start position must not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return <div ref={host} className="aspect-video w-full overflow-hidden rounded-xl bg-black [&>iframe]:h-full [&>iframe]:w-full" />;
}

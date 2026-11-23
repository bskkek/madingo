import { useEffect, useState } from 'react';
import { MadingoWordmark } from './BrandVisuals';

const BASE = import.meta.env.BASE_URL;
const EMBLEM = BASE + 'assets/aistudio/madi-emblem-circle.png';
const DUSK = BASE + 'assets/madi/madi-dusk.jpg';

/** Key images warmed up while the splash is on screen, so the landing
    page is fully ready the moment the splash fades. */
const PRELOAD_SRC = [
  'assets/madi/madi-dusk.jpg',
  'assets/madi/madi-facade.jpg',
  'assets/aistudio/madi-emblem-circle.png',
  'assets/aistudio/1793061139335_b556fd67-night.png',
  'assets/madi-stories/story-1.webp',
  'assets/madi-stories/story-2.webp',
  'assets/madi-stories/story-3.webp',
  'assets/madi-stories/story-4.webp',
  'assets/madi-stories/story-5.webp',
];

const SHOW_MS = 5000;
const FADE_MS = 600;

/**
 * 3D launch splash — shown on EVERY app launch, on top of whatever screen
 * is behind it. Exactly 5s on screen, then a ~600ms fade-out and unmount.
 * pointer-events-none: it never blocks taps — the screens behind keep
 * rendering / loading normally the whole time.
 */
export const SplashScreen: React.FC = () => {
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    // Warm-up: preload key images + wait for webfonts.
    PRELOAD_SRC.forEach((src) => {
      const img = new Image();
      img.src = BASE + src;
    });
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready;
    }

    const showTimer = window.setTimeout(() => setFading(true), SHOW_MS);
    const hideTimer = window.setTimeout(() => setGone(true), SHOW_MS + FADE_MS);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      aria-hidden="true"
      className="splash-fade pointer-events-none fixed inset-0 z-[100] overflow-hidden"
      style={{ backgroundColor: '#050B1A', opacity: fading ? 0 : 1 }}
    >
      {/* Deep night MADI photo, very dim behind the logo */}
      <img
        src={DUSK}
        alt=""
        className="night-bg-img"
        style={{ opacity: 0.22 }}
        draggable={false}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(5,11,26,0.35), rgba(5,11,26,0.55) 55%, rgba(5,11,26,0.85))',
        }}
      />
      {/* Soft pulsing glow behind the logo */}
      <div className="splash-glow absolute left-1/2 top-1/2 h-[26rem] w-[26rem] rounded-full" />

      {/* 3D scene: perspective on the parent, slow rotateX/rotateY float on the lockup */}
      <div className="splash-3d-scene relative z-10 flex h-full flex-col items-center justify-center px-6">
        <div className="splash-logo-3d relative flex flex-col items-center gap-6">
          <img
            src={EMBLEM}
            alt=""
            className="splash-emblem-3d h-24 w-24 rounded-full object-cover"
            draggable={false}
          />
          <div className="splash-wordmark-3d">
            <MadingoWordmark size="lg" lightText />
          </div>
          {/* Shine sweep travelling across the whole lockup */}
          <span className="splash-shine" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
};

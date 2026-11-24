import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';
import { VERB_CATEGORIES } from '../data/verbs';
import { useI18n } from '../lib/i18n';

const BASE = import.meta.env.BASE_URL;

/**
 * Verbs window — copies the reference video's design:
 * black top bar with yellow «РАСШИРЬ СЛОВАРНЫЙ ЗАПАС», dark-brown stage,
 * an illustrated avatar card per verb (Madingo logo, the verb in LARGE
 * white bold Cyrillic, the verb echoing down the side, and a detailed
 * cartoon character performing the action), Arabic meaning under the
 * verb, and a professional Russian voice (baked MP3, plays offline).
 * No "AI-GENERATED VOICE" label — the voice must sound professional.
 */
export const VerbsView: React.FC<{ initialVerbId?: string }> = ({ initialVerbId }) => {
  const { t, lang, dir } = useI18n();
  // Deep link from a push notification (?push=verbs&verb=v042): open directly
  // on that verb instead of the first one. Invalid ids fall back to the start.
  const initialVerb = (() => {
    if (!initialVerbId) return null;
    for (const c of VERB_CATEGORIES) {
      const idx = c.verbs.findIndex((v) => v.id === initialVerbId);
      if (idx >= 0) return { catId: c.id, idx };
    }
    return null;
  })();
  const [catId, setCatId] = useState(initialVerb ? initialVerb.catId : VERB_CATEGORIES[0].id);
  const category = VERB_CATEGORIES.find((c) => c.id === catId) ?? VERB_CATEGORIES[0];
  const [idx, setIdx] = useState(initialVerb ? initialVerb.idx : 0);
  const verb = category.verbs[Math.min(idx, category.verbs.length - 1)];
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const touchX = useRef<number | null>(null);

  const play = useCallback((id: string) => {
    try {
      const a = audioRef.current ?? new Audio();
      audioRef.current = a;
      a.src = BASE + `verbs/audio/${id}.mp3`;
      a.onended = () => setPlaying(false);
      a.onerror = () => {
        setPlaying(false);
        setAudioError(true);
      };
      setAudioError(false);
      setPlaying(false);
      void a.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      );
    } catch {
      setPlaying(false);
    }
  }, []);

  // Auto-play the verb voice whenever the card changes.
  useEffect(() => {
    play(verb.id);
  }, [verb.id, play]);

  const goTo = useCallback(
    (i: number) => {
      const n = category.verbs.length;
      setIdx(((i % n) + n) % n);
    },
    [category.verbs.length],
  );

  const pickCategory = useCallback((id: string) => {
    setCatId(id);
    setIdx(0);
  }, []);

  const NextIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;
  const PrevIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;
  const catLabel = (c: { ar: string; ru: string; en: string; fr: string }) =>
    c[lang] ?? c.ru;
  // Meaning in the student's chosen language (ar/fr/en/ru), with fallback.
  const meaning =
    (lang === 'ar' ? verb.ar : lang === 'fr' ? verb.fr : lang === 'en' ? verb.en : verb.ruDef) ||
    verb.en ||
    verb.ar;

  return (
    <section
      data-testid="verbs-view"
      className="relative w-full"
      style={{ height: 'calc(100dvh - 9.5rem)', minHeight: 480 }}
    >
      <div className="flex h-full flex-col overflow-hidden">
        {/* Black top bar — yellow bold text, exactly like the video */}
        <div className="flex shrink-0 items-center justify-center bg-black px-3 py-2.5">
          <span className="text-center text-[15px] font-extrabold tracking-wide text-[#ffd94a]">
            {t('verbs.expandVocab')}
          </span>
        </div>

        {/* Category chips — scroll direction follows the UI language. */}
        <div className="flex shrink-0 gap-2 overflow-x-auto bg-[#3a2d1e] px-3 py-2" dir={dir}>
          {VERB_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pickCategory(c.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-bold transition ${
                c.id === category.id
                  ? 'bg-orange-500 text-white shadow'
                  : 'bg-white/10 text-white/85 hover:bg-white/20'
              }`}
            >
              {catLabel(c)} · {c.verbs.length}
            </button>
          ))}
        </div>

        {/* Brown stage — ONE full-window frame: the illustrated avatar card
            fills the whole stage edge to edge. The same illustration,
            heavily blurred, backs the stage so the window reads as one
            continuous frame (no inner card border, no side margins showing
            a different colour). The full illustration stays visible on top. */}
        <div className="verbs-stage relative flex min-h-0 flex-1 flex-col items-center overflow-hidden pb-2 pt-1">
          {/* Blurred full-bleed backdrop of the same illustration */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${BASE}verbs/avatar-images/${verb.id}.webp)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(36px) brightness(0.92) saturate(1.15)',
              transform: 'scale(1.2)',
            }}
          />
          {/* Meaning in the student's language + small replay button + counter */}
          <div className="relative z-[1] mt-1 flex shrink-0 items-center justify-center gap-2">
            <p
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
              className="text-center text-lg font-bold text-amber-200"
            >
              {meaning}
            </p>
            <button
              type="button"
              onClick={() => play(verb.id)}
              aria-label={t('verbs.listen')}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition active:scale-95 ${
                playing ? 'animate-pulse bg-orange-400' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              <Volume2 className="h-4 w-4" />
            </button>
            <span className="shrink-0 text-sm font-bold text-white/70">
              {idx + 1} / {category.verbs.length}
            </span>
          </div>

          {/* Illustrated avatar card — tap it to replay the voice.
              Prev/next live in the bottom corners of the card (absolute,
              so a short screen can never push them out of view) + swipe. */}
          <div
            className="relative z-[1] min-h-[160px] w-full flex-1"
            onTouchStart={(e) => {
              touchX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              if (touchX.current === null) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              touchX.current = null;
              if (Math.abs(dx) <= 50) return;
              const step = dx < 0 ? 1 : -1;
              goTo(idx + (dir === 'rtl' ? -step : step));
            }}
          >
            <img
              key={verb.id}
              src={BASE + `verbs/avatar-images/${verb.id}.webp`}
              alt={verb.ru}
              onClick={() => play(verb.id)}
              title={t('verbs.listen')}
              className="v-slide-in absolute left-1/2 top-1/2 h-full w-auto max-w-full -translate-x-1/2 -translate-y-1/2 cursor-pointer object-contain"
              draggable={false}
            />
            {/* prev / next — bottom corners, always visible */}
            <button
              type="button"
              aria-label={t('verbs.previous')}
              onClick={() => goTo(idx - 1)}
              className="absolute bottom-2 left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white transition hover:bg-black/50 active:scale-95"
            >
              <PrevIcon className="h-6 w-6" />
            </button>
            <button
              type="button"
              aria-label={t('verbs.next')}
              onClick={() => goTo(idx + 1)}
              className="absolute bottom-2 right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white transition hover:bg-black/50 active:scale-95"
            >
              <NextIcon className="h-6 w-6" />
            </button>
          </div>

          {audioError && (
            <p className="mt-1 shrink-0 text-center text-xs font-medium text-red-300">
              {t('verbs.audioUnavailable')}
            </p>
          )}
        </div>

        {/* Verb strip: jump to any verb in this category */}
        <div className="flex shrink-0 gap-1.5 overflow-x-auto bg-[#3a2d1e] px-3 py-2" dir="ltr">
          {category.verbs.map((v, i) => (
            <button
              key={v.id}
              type="button"
              onClick={() => goTo(i)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold transition ${
                i === idx ? 'bg-orange-500 text-white' : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              {v.ru}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

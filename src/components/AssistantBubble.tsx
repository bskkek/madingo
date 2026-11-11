// ============================================================================
// MADINGO — PERSONAL ASSISTANT BUBBLE (ANISS ONLY)
// The assistant is NOT a tab and NOT a page. It is a small floating
// bubble (Aniss's portrait) that sits on top of every screen:
//   * draggable anywhere (touch + mouse), docks to the nearest screen
//     edge on release, position persists in localStorage (see
//     lib/assistantBubble.ts — pure, tested). The bubble button is
//     positioned by an inline translate() style and must NEVER carry a
//     CSS class that animates `transform` (that bug froze dragging);
//     the idle bob lives on the portrait <img> inside it.
//   * tap the bubble → the assistant opens as a clean minimal
//     bottom-sheet overlay: header (avatar + name + close), and —
//     as its main content — the BOOK itself:
//     the real 20-chapter Madingo storybook (bskkek/Madingo-bio),
//     running unchanged on the shared proxy and shown here in an
//     iframe. Tap the story title in the book and it auto-plays
//     (speech clouds above each speaker, multi-voice TTS). The
//     overlay never navigates away from the current screen; the close
//     button (or the backdrop) dismisses it back to just the bubble.
//   * The AI chat is GONE (removed 2026-10-10 by the user's order):
//     no message list, no chat input, no mic, no send, no sound
//     toggle, no /chat client. The rebuilt static story reader is
//     GONE too (removed 2026-11-10 — the user ordered the book as
//     it is, not a rebuild): no copied chapters, no copied images.
//   * The MADI library book search is GONE too (removed 2026-11-11
//     by the user's order: this window shows the STORY only — no
//     search row, no search results, no catalog links).
// ============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { TEACHER_IMAGES, TeacherAvatar } from './TeacherAvatar';
import { stopAssistantSpeech } from '../lib/speech';
import {
  BUBBLE_SIZE,
  clampBubblePos,
  defaultBubblePos,
  dockBubblePos,
  loadBubblePos,
  resolvePointerUp,
  saveBubblePos,
  type BubblePos,
  type Viewport,
} from '../lib/assistantBubble';

interface AssistantBubbleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function viewportNow(): Viewport {
  if (typeof window === 'undefined') return { width: 390, height: 844 };
  return { width: window.innerWidth, height: window.innerHeight };
}

export const AssistantBubble: React.FC<AssistantBubbleProps> = ({
  open,
  onOpenChange,
}) => {
  const { t } = useI18n();
  const [pos, setPos] = useState<BubblePos>(() => {
    const vp = viewportNow();
    const storage =
      typeof window !== 'undefined' ? window.localStorage : undefined;
    return loadBubblePos(storage, vp) ?? defaultBubblePos(vp);
  });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);
  const bubbleRef = useRef<HTMLButtonElement | null>(null);

  const [bookLoaded, setBookLoaded] = useState(false);
  // The book lives on GitHub Pages (same host as the app) since 2026-11-11:
  // the Replit proxy's edge returned 403 Forbidden to the user's phone, so
  // the bubble no longer loads the book from the proxy. The book's own API
  // calls still reach the proxy via its absolute API base.
  const bookUrl = 'https://bskkek.github.io/madingo/book/';
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopAssistantSpeech();
    };
  }, []);

  useEffect(() => {
    if (!open) {
      stopAssistantSpeech();
    }
  }, [open ]);

  // ---- bubble drag -------------------------------------------------------
  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.hypot(dx, dy) >= 2) drag.moved = true;
    if (!drag.moved) return;
    setPos(
      clampBubblePos(
        { x: drag.origX + dx, y: drag.origY + dy },
        viewportNow()
      )
    );
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (resolvePointerUp(dx, dy) === 'tap') {
      onOpenChange(true);
      return;
    }
    // Real drag: dock to the nearest edge and remember the spot.
    const docked = dockBubblePos(pos, viewportNow());
    setPos(docked);
    if (typeof window !== 'undefined') {
      saveBubblePos(window.localStorage, docked);
    }
  };

  return (
    <>
      {/* Floating bubble — always on top, hidden while the sheet is open.
          NOTE (drag regression, 2026-11-10): the bubble is positioned by
          the inline translate() below. It must NEVER carry a CSS class
          that animates `transform` (e.g. avatar-bob) — CSS animations
          override inline styles, so the positioning transform was ignored
          and the bubble could not be dragged at all. The idle bob lives
          on the portrait <img> inside the button instead (it has no
          positioning transform). See the regression test in
          lib/assistantBubble.test.ts. */}
      {!open && (
        <button
          ref={bubbleRef}
          type="button"
          aria-label={t('assistant.title')}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
          className="fixed z-50 cursor-grab active:cursor-grabbing"
          style={{
            width: BUBBLE_SIZE,
            height: BUBBLE_SIZE,
            transform: `translate(${pos.x}px, ${pos.y}px)`,
            touchAction: 'none',
            left: 0,
            top: 0,
          }}
        >
          <img
            src={TEACHER_IMAGES.neutral}
            alt="Анис"
            draggable={false}
            className="avatar-bob w-full h-full rounded-full object-cover object-top border-[3px] border-white dark:border-slate-800 shadow-xl ring-2 ring-orange-400/70 select-none"
          />
        </button>
      )}

      {/* Bottom-sheet overlay — the book only.
          No chat, no library search, no bottom bar. */}
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-label={t('assistant.title')}>
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => onOpenChange(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-2xl max-h-[82vh] flex flex-col rounded-t-3xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-900/5 dark:ring-white/10">
            <div className="shrink-0 pt-2 pb-1 flex justify-center">
              <span className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>
            {/* Header: Aniss avatar + name + close only. */}
            <div className="shrink-0 px-5 pb-3 pt-1 flex items-center gap-3">
              <TeacherAvatar
                mood="neutral"
                speaking={false}
                size="md"
              />
              <p className="min-w-0 flex-1 font-display font-extrabold text-base text-slate-900 dark:text-white leading-tight truncate">
                {t('assistant.title')} — Анис
              </p>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close assistant"
                className="w-9 h-9 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4">
              {/* The book itself — the real Madingo storybook,
                  running unchanged on the proxy. Tap its story title
                  and it auto-plays. allow="autoplay" lets its TTS
                  play after the tap. */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                {!bookLoaded && (
                  <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    {t('assistant.bookLoading')}
                  </p>
                )}
                {bookUrl && (
                  <iframe
                    title={t('assistant.title')}
                    src={bookUrl}
                    className="block w-full border-0"
                    style={{ height: '62vh', minHeight: 420 }}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    allow="autoplay; fullscreen"
                    onLoad={() => setBookLoaded(true)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

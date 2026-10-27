import React, { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  Volume2,
  Gauge,
  RotateCcw,
  Trophy,
  Fuel,
  Sparkles,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  PROGRESSIVE_TYPING_DRILLS,
  ProgressiveTypingDrill,
} from '../data/typingDrills';
import {
  createInitialTypingState,
  processTypingInputChar,
  calculateTypingMetrics,
  TypingSessionState,
} from '../lib/phase2Engine';
import { useI18n } from '../lib/i18n';
import { playSoundEffect, speakRussian } from '../lib/audio';
import { MishaMascot } from './BrandVisuals';
import { CyrillicKeyboard } from './CyrillicKeyboard';

export type TypingLabMode = 'copy';

interface TypingLabViewProps {
  soundEnabled: boolean;
  onSaveResult?: (payload: {
    textId: string;
    mode: TypingLabMode;
    cpm: number;
    accuracy: number;
    durationSeconds: number;
    mistakesByLetter: Record<string, number>;
    fuelEarned: number;
  }) => void;
}

export const TypingLabView: React.FC<TypingLabViewProps> = ({
  soundEnabled,
  onSaveResult,
}) => {
  const { lang, t } = useI18n();

  // Selected drill index in the 50+ progressive list (0-indexed or 1-based)
  const [selectedDrillIndex, setSelectedDrillIndex] = useState<number>(1);

  const activeDrill: ProgressiveTypingDrill = useMemo(() => {
    return (
      PROGRESSIVE_TYPING_DRILLS.find((d) => d.drillIndex === selectedDrillIndex) ||
      PROGRESSIVE_TYPING_DRILLS[0]
    );
  }, [selectedDrillIndex]);

  const currentTargetClean = activeDrill.textClean;

  // Typing session state
  const [typingState, setTypingState] = useState<TypingSessionState>(() =>
    createInitialTypingState(currentTargetClean)
  );

  const [hintKey, setHintKey] = useState<string | null>(null);
  const [shakingKey, setShakingKey] = useState<string | null>(null);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [autoShowNextKey, setAutoShowNextKey] = useState(true);

  // Best scores cache
  const [bestScoresByDrill, setBestScoresByDrill] = useState<
    Record<string, { cpm: number; accuracy: number }>
  >({});

  const [finalMetrics, setFinalMetrics] = useState<{
    cpm: number;
    accuracy: number;
    durationSeconds: number;
    fuelEarned: number;
  } | null>(null);

  // Reset state whenever active target text changes
  useEffect(() => {
    setTypingState(createInitialTypingState(currentTargetClean));
    setHintKey(null);
    setFinalMetrics(null);
    setShakingKey(null);
    setWrongFlash(false);
  }, [currentTargetClean]);

  const isComplete = typingState.cursorIndex >= typingState.targetClean.length;

  // Next expected character for visual keyboard guide
  const nextExpectedChar = useMemo(() => {
    if (isComplete) return null;
    return typingState.targetClean[typingState.cursorIndex] || null;
  }, [typingState.cursorIndex, typingState.targetClean, isComplete]);

  // Active highlighted key on virtual keyboard
  const activeKeyboardHighlight =
    hintKey || (autoShowNextKey && nextExpectedChar ? nextExpectedChar.toUpperCase() : null);

  const handleCharInput = (char: string) => {
    if (isComplete) return;

    const result = processTypingInputChar(typingState, char, {
      treatYoAsYe: true,
      ignoreCase: true,
    });
    setTypingState(result.nextState);

    if (result.accepted) {
      playSoundEffect('tap', soundEnabled);
      setWrongFlash(false);
      setHintKey(null);

      if (result.isComplete) {
        const metrics = calculateTypingMetrics(result.nextState);
        setFinalMetrics(metrics);
        playSoundEffect('complete', soundEnabled);
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });

        setBestScoresByDrill((prev) => {
          const prevBest = prev[activeDrill.id];
          if (!prevBest || metrics.cpm > prevBest.cpm) {
            return {
              ...prev,
              [activeDrill.id]: { cpm: metrics.cpm, accuracy: metrics.accuracy },
            };
          }
          return prev;
        });

        onSaveResult?.({
          textId: activeDrill.id,
          mode: 'copy',
          cpm: metrics.cpm,
          accuracy: metrics.accuracy,
          durationSeconds: metrics.durationSeconds,
          mistakesByLetter: result.nextState.mistakesByLetter,
          fuelEarned: metrics.fuelEarned,
        });
      }
    } else {
      playSoundEffect('wrong', soundEnabled);
      setWrongFlash(true);
      setShakingKey(char.toUpperCase());
      if (result.shouldHighlightHintKey) {
        setHintKey(result.expectedChar.toUpperCase());
      }
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(40);
        }
      } catch {
        // ignore vibration errors
      }
      setTimeout(() => {
        setShakingKey(null);
        setWrongFlash(false);
      }, 360);
    }
  };

  // Keyboard listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isComplete) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA')
      ) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length === 1) {
        e.preventDefault();
        handleCharInput(e.key);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [typingState, currentTargetClean, soundEnabled, isComplete]);

  const handleRestart = () => {
    setTypingState(createInitialTypingState(currentTargetClean));
    setHintKey(null);
    setFinalMetrics(null);
  };

  // Advance to next paragraph/sentence
  const handleNextDrill = () => {
    if (selectedDrillIndex < PROGRESSIVE_TYPING_DRILLS.length) {
      setSelectedDrillIndex((prev) => prev + 1);
    } else {
      setSelectedDrillIndex(1); // loop back
    }
  };

  const handlePrevDrill = () => {
    if (selectedDrillIndex > 1) {
      setSelectedDrillIndex((prev) => prev - 1);
    } else {
      setSelectedDrillIndex(PROGRESSIVE_TYPING_DRILLS.length);
    }
  };

  const currentDrillBest = bestScoresByDrill[activeDrill.id];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-28 space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Simple Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-brand-blue text-white flex items-center justify-center shrink-0 shadow-md">
            <Keyboard className="w-6 h-6" />
          </div>
          <div className="text-start">
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white">
              {lang === 'ar' ? 'مختبر الكتابة الاحترافية' : 'Professional Typing Lab'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              {lang === 'ar'
                ? 'تمرس على كتابة جمل وفقرات روسية غنية بالمعنى لتطوير سرعتك ودقتك'
                : 'Practice meaningful Russian sentences and paragraphs for speed & accuracy'}
            </p>
          </div>
        </div>

        {/* Simple Sentence Selector & Navigation */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevDrill}
            title={lang === 'ar' ? 'الجملة السابقة' : 'Previous sentence'}
            className="w-10 h-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer transition shadow-xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <select
            aria-label="Select sentence or paragraph"
            value={activeDrill.drillIndex}
            onChange={(e) => setSelectedDrillIndex(Number(e.target.value))}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-display font-bold text-slate-900 dark:text-white cursor-pointer"
          >
            {PROGRESSIVE_TYPING_DRILLS.map((drill) => (
              <option key={drill.id} value={drill.drillIndex}>
                {lang === 'ar'
                  ? `الفقرة ${drill.drillIndex} من ${PROGRESSIVE_TYPING_DRILLS.length}: ${drill.title.ar}`
                  : `Drill ${drill.drillIndex}: ${drill.title.en}`}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleNextDrill}
            title={lang === 'ar' ? 'الجملة التالية' : 'Next sentence'}
            className="w-10 h-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer transition shadow-xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Clean Drill Information & Audio Controls */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3 text-start">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xs font-mono font-extrabold text-brand-blue dark:text-sky-400">
              {lang === 'ar'
                ? `التمرين ${activeDrill.drillIndex} / ${PROGRESSIVE_TYPING_DRILLS.length}`
                : `Drill ${activeDrill.drillIndex} of ${PROGRESSIVE_TYPING_DRILLS.length}`}
            </div>
            <h2 className="text-base sm:text-lg font-display font-extrabold text-slate-900 dark:text-white">
              {activeDrill.title[lang] || activeDrill.title.ar}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setAutoShowNextKey((prev) => !prev)}
              className={`min-h-[38px] px-3 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                autoShowNextKey
                  ? 'border-accent-orange bg-accent-orange/15 text-accent-orange'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500'
              }`}
              title={lang === 'ar' ? 'إضاءة الحرف التالي على لوحة المفاتيح' : 'Highlight next key'}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'موضع الحرف' : 'Key Guide'}</span>
            </button>

            <button
              type="button"
              data-testid="typing-play-audio-btn"
              onClick={() => speakRussian(activeDrill.textStressed, undefined, soundEnabled, 0.9)}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-brand-blue hover:opacity-90 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{t('lesson.playAudioBtn')}</span>
            </button>

            <button
              type="button"
              onClick={handleRestart}
              aria-label="Restart drill"
              className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Translation and Best Score */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
          <p className="font-medium text-slate-700 dark:text-slate-200">
            <span className="font-bold text-slate-500">
              {lang === 'ar' ? 'الترجمة / المعنى: ' : 'Meaning: '}
            </span>
            {(activeDrill.translation as Record<string, string>)[lang] || activeDrill.translation.ar}
          </p>

          {currentDrillBest && (
            <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-600 dark:text-emerald-400">
              <Trophy className="w-3.5 h-3.5 text-accent-orange" />
              <span>
                {lang === 'ar' ? 'أفضل سرعة:' : 'Best:'} {currentDrillBest.cpm} CPM ({currentDrillBest.accuracy}%)
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Active Letter-by-Letter Canvas */}
      <div
        dir="ltr"
        className={`rounded-3xl bg-white dark:bg-slate-900 border-2 p-6 sm:p-8 shadow-md transition ${
          wrongFlash
            ? 'border-rose-500 bg-red-50/30 dark:bg-red-950/20'
            : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="text-xl sm:text-2xl font-display font-bold leading-relaxed tracking-wide select-none">
          {typingState.targetClean.split('').map((ch, idx) => {
            const isTyped = idx < typingState.cursorIndex;
            const isCurrent = idx === typingState.cursorIndex;

            return (
              <span
                key={idx}
                className={`inline transition-colors ${
                  isTyped
                    ? 'text-brand-blue dark:text-accent-orange'
                    : isCurrent && wrongFlash
                    ? 'bg-rose-500 text-white rounded px-1 animate-shake'
                    : isCurrent
                    ? 'bg-amber-200/90 dark:bg-amber-500/30 text-slate-900 dark:text-white underline decoration-accent-orange decoration-2 rounded px-1 shadow-xs'
                    : 'text-slate-400/80 dark:text-slate-600'
                }`}
              >
                {ch}
              </span>
            );
          })}
        </div>

        {/* Stressed Pronunciation Accent Guide */}
        {activeDrill.textStressed && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <span className="font-bold text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'النطق بالنَبْر والتأكيد (Ударение):' : 'Stressed Pronunciation:'}
            </span>
            <span className="text-brand-blue dark:text-sky-300 font-extrabold text-sm sm:text-base tracking-wide" dir="ltr">
              {activeDrill.textStressed}
            </span>
          </div>
        )}

        {/* Live Key Hint Guide Banner */}
        {activeKeyboardHighlight && (
          <div className="mt-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-accent-orange shrink-0" />
              <span>
                {lang === 'ar' ? 'الحرف التالي المطلوب ضغطه:' : 'Next expected key:'}{' '}
                <strong className="px-2.5 py-1 rounded-lg bg-accent-orange text-brand-navy font-mono text-sm font-extrabold shadow-xs">
                  {activeKeyboardHighlight === ' ' ? 'SPACE (مسافة)' : activeKeyboardHighlight}
                </strong>
              </span>
            </div>
            <span className="text-[11px] text-amber-700 dark:text-amber-300 hidden sm:inline">
              {lang === 'ar' ? 'انظر إلى المفتاح المضاء أدناه' : 'Highlighted below'}
            </span>
          </div>
        )}
      </div>

      {/* Completion Modal / Banner */}
      {isComplete && finalMetrics && (
        <div className="rounded-3xl bg-emerald-50/90 dark:bg-slate-900 border-2 border-emerald-500 p-6 sm:p-8 shadow-xl space-y-6 animate-fade-in text-start">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <MishaMascot expression="cheering" size={88} />
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{lang === 'ar' ? 'أحسنت! اكتمل التمرين بنجاح' : 'Exercise Complete!'}</span>
                </div>
                <h2 className="text-2xl font-display font-extrabold text-slate-900 dark:text-white">
                  {activeDrill.title[lang] || activeDrill.title.ar}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {lang === 'ar'
                    ? `حققت سرعة ${finalMetrics.cpm} حرفاً في الدقيقة بدقة ${finalMetrics.accuracy}%!`
                    : `Achieved ${finalMetrics.cpm} CPM with ${finalMetrics.accuracy}% accuracy!`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleRestart}
                className="min-h-[44px] px-4 py-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-display font-bold text-xs cursor-pointer hover:bg-slate-50"
              >
                {lang === 'ar' ? 'إعادة التمرين ↺' : 'Practice Again'}
              </button>

              <button
                type="button"
                data-testid="typing-advance-next-btn"
                onClick={handleNextDrill}
                className="min-h-[44px] px-6 py-2.5 rounded-2xl bg-accent-orange hover:brightness-110 text-brand-navy font-display font-extrabold text-sm cursor-pointer shadow-md flex items-center gap-2"
              >
                <span>{lang === 'ar' ? 'الفقرة التالية ➔' : 'Next Paragraph ➔'}</span>
              </button>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="text-xs text-slate-500 font-bold">{t('typingLab.cpmLabel')}</div>
              <div className="text-2xl font-display font-extrabold text-brand-blue dark:text-accent-orange tabular-nums">
                {finalMetrics.cpm}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="text-xs text-slate-500 font-bold">{t('typingLab.accuracyLabel')}</div>
              <div className="text-2xl font-display font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {finalMetrics.accuracy}%
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="text-xs text-slate-500 font-bold">{t('typingLab.timeLabel')}</div>
              <div className="text-2xl font-display font-extrabold text-slate-900 dark:text-white tabular-nums">
                {finalMetrics.durationSeconds}s
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="text-xs text-slate-500 font-bold">{t('lesson.fuelEarnedLabel')}</div>
              <div className="text-2xl font-display font-extrabold text-accent-orange tabular-nums flex items-center gap-1">
                <Fuel className="w-5 h-5" />
                <span>+{finalMetrics.fuelEarned}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Cyrillic Keyboard Component */}
      <CyrillicKeyboard
        showSpaceBar
        onKeyPress={handleCharInput}
        highlightedKey={activeKeyboardHighlight}
        shakingKey={shakingKey}
      />
    </div>
  );
};

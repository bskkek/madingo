import React, { useMemo, useState } from 'react';
import { Check, Flame, RotateCcw, Volume2, Wrench, X } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { speakRussian } from '../lib/audio';
import { SupportedLang } from '../lib/phase2Engine';
import {
  isReviewItemDue,
  type LeitnerReviewItem,
} from '../lib/phase2Engine';

export interface ReviewQueueViewProps {
  items: LeitnerReviewItem[];
  soundEnabled: boolean;
  onCompleteReview: (outcomes: { itemRef: string; wasCorrect: boolean }[]) => void;
  onExit: () => void;
}

export const FUEL_PER_CORRECT_REVIEW = 5;

const UI_COPY: Record<
  SupportedLang,
  {
    title: string;
    subtitle: string;
    progress: (current: number, total: number) => string;
    promptLabel: string;
    revealBtn: string;
    answerLabel: string;
    knewItBtn: string;
    missedItBtn: string;
    boxLabel: (box: number) => string;
    emptyTitle: string;
    emptySub: string;
    summaryTitle: string;
    correctLabel: string;
    missedLabel: string;
    fuelLabel: string;
    finishBtn: string;
    exitBtn: string;
    reviewAgainBtn: string;
    tapToRevealHint: string;
  }
> = {
  ar: {
    title: 'المراجعة اليومية',
    subtitle: 'راجع كلمات المرآب قبل أن تنساها — 5 وقود لكل إجابة صحيحة.',
    progress: (c, t) => `${c} / ${t}`,
    promptLabel: 'ماذا تعني هذه الكلمة؟',
    revealBtn: 'أظهر الإجابة',
    answerLabel: 'الإجابة الصحيحة',
    knewItBtn: 'عرفتها ✓',
    missedItBtn: 'فاتتني ✗',
    boxLabel: (b) => `الصندوق ${b}`,
    emptyTitle: 'لا شيء مستحق اليوم',
    emptySub: 'كل كلماتك محفوظة في موعدها — عُد غداً لمراجعة جديدة.',
    summaryTitle: 'اكتملت المراجعة!',
    correctLabel: 'إجابات صحيحة',
    missedLabel: 'إجابات فائتة',
    fuelLabel: 'وقود مكتسب',
    finishBtn: 'إنهاء المراجعة',
    exitBtn: 'خروج',
    reviewAgainBtn: 'مراجعة من جديد',
    tapToRevealHint: 'حاول أن تتذكر الإجابة أولاً، ثم أظهرها.',
  },
  ru: {
    title: 'Ежедневное повторение',
    subtitle: 'Повторите слова из Гаража, пока не забыли, — 5 топлива за каждый правильный ответ.',
    progress: (c, t) => `${c} / ${t}`,
    promptLabel: 'Что это значит?',
    revealBtn: 'Показать ответ',
    answerLabel: 'Правильный ответ',
    knewItBtn: 'Я знал(а) ✓',
    missedItBtn: 'Я забыл(а) ✗',
    boxLabel: (b) => `Коробка ${b}`,
    emptyTitle: 'Сегодня повторять нечего',
    emptySub: 'Все ваши слова в сроке — возвращайтесь завтра за новым повторением.',
    summaryTitle: 'Повторение завершено!',
    correctLabel: 'Правильных ответов',
    missedLabel: 'Пропущенных',
    fuelLabel: 'Заработано топлива',
    finishBtn: 'Завершить повторение',
    exitBtn: 'Выйти',
    reviewAgainBtn: 'Повторить ещё раз',
    tapToRevealHint: 'Сначала вспомните ответ, потом откройте его.',
  },
  en: {
    title: 'Daily Review',
    subtitle: 'Review your Garage words before they fade — 5 fuel per correct answer.',
    progress: (c, t) => `${c} / ${t}`,
    promptLabel: 'What does this mean?',
    revealBtn: 'Show answer',
    answerLabel: 'Correct answer',
    knewItBtn: 'I knew it ✓',
    missedItBtn: 'I missed it ✗',
    boxLabel: (b) => `Box ${b}`,
    emptyTitle: 'Nothing due — come back tomorrow',
    emptySub: 'All your words are on schedule — check back tomorrow for the next review.',
    summaryTitle: 'Review complete!',
    correctLabel: 'Correct answers',
    missedLabel: 'Missed',
    fuelLabel: 'Fuel earned',
    finishBtn: 'Finish review',
    exitBtn: 'Exit',
    reviewAgainBtn: 'Review again',
    tapToRevealHint: 'Try to recall the answer first, then reveal it.',
  },
  fr: {
    title: 'Révision du jour',
    subtitle: 'Révisez vos mots du Garage avant de les oublier — 5 carburant par bonne réponse.',
    progress: (c, t) => `${c} / ${t}`,
    promptLabel: 'Que signifie ceci ?',
    revealBtn: 'Voir la réponse',
    answerLabel: 'Bonne réponse',
    knewItBtn: 'Je savais ✓',
    missedItBtn: 'J’ai oublié ✗',
    boxLabel: (b) => `Boîte ${b}`,
    emptyTitle: 'Rien à réviser — revenez demain',
    emptySub: 'Tous vos mots sont à jour — revenez demain pour la prochaine révision.',
    summaryTitle: 'Révision terminée !',
    correctLabel: 'Bonnes réponses',
    missedLabel: 'Oubliées',
    fuelLabel: 'Carburant gagné',
    finishBtn: 'Terminer la révision',
    exitBtn: 'Quitter',
    reviewAgainBtn: 'Réviser encore',
    tapToRevealHint: 'Essayez de vous rappeler la réponse, puis révélez-la.',
  },
};

export const ReviewQueueView: React.FC<ReviewQueueViewProps> = ({
  items,
  soundEnabled,
  onCompleteReview,
  onExit,
}) => {
  const { lang } = useI18n();
  const copy = UI_COPY[lang] || UI_COPY.en;

  const dueItems = useMemo(() => items.filter((i) => isReviewItemDue(i)), [items]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [outcomes, setOutcomes] = useState<{ itemRef: string; wasCorrect: boolean }[]>([]);
  const [finished, setFinished] = useState(false);

  const current = dueItems[index];
  const isLast = index === dueItems.length - 1;
  const correctCount = outcomes.filter((o) => o.wasCorrect).length;
  const fuelEarned = correctCount * FUEL_PER_CORRECT_REVIEW;

  const handleAnswer = (wasCorrect: boolean) => {
    if (!current) return;
    const next = [...outcomes, { itemRef: current.itemRef, wasCorrect }];
    setOutcomes(next);
    if (isLast) {
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
      setRevealed(false);
    }
  };

  const handleReviewAgain = () => {
    setIndex(0);
    setRevealed(false);
    setOutcomes([]);
    setFinished(false);
  };

  return (
    <div
      data-testid="review-queue-view"
      className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-28 space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue dark:text-accent-orange text-xs font-display font-extrabold mb-2">
            <Wrench className="w-3.5 h-3.5" />
            <span>GARAGE · SRS · LEITNER</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white">
            {copy.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{copy.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onExit}
          aria-label={copy.exitBtn}
          className="min-h-[40px] min-w-[40px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 transition cursor-pointer shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ============================================================ */}
      {/* EMPTY STATE — nothing due                                    */}
      {/* ============================================================ */}
      {dueItems.length === 0 && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
            <Check className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-display font-extrabold text-slate-900 dark:text-white">
            {copy.emptyTitle}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">{copy.emptySub}</p>
          <button
            type="button"
            onClick={onExit}
            className="min-h-[48px] px-6 rounded-2xl bg-brand-blue text-white font-display font-bold text-sm hover:opacity-95 transition cursor-pointer"
          >
            {copy.exitBtn}
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* SUMMARY SCREEN                                               */}
      {/* ============================================================ */}
      {dueItems.length > 0 && finished && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-accent-orange/15 text-accent-orange flex items-center justify-center">
            <Flame className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-display font-extrabold text-slate-900 dark:text-white">
            {copy.summaryTitle}
          </h2>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700">
              <div className="text-2xl font-display font-extrabold text-success tabular-nums">
                {correctCount}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {copy.correctLabel}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700">
              <div className="text-2xl font-display font-extrabold text-red-500 tabular-nums">
                {outcomes.length - correctCount}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {copy.missedLabel}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700">
              <div className="mt-1 text-2xl font-display font-extrabold text-accent-orange tabular-nums">
                +{fuelEarned}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {copy.fuelLabel}
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {correctCount} / {outcomes.length} · {FUEL_PER_CORRECT_REVIEW} fuel × {correctCount}
          </p>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => onCompleteReview(outcomes)}
              className="w-full min-h-[54px] rounded-2xl bg-accent-orange text-brand-navy font-display font-extrabold text-base shadow-lg hover:brightness-105 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-5 h-5" />
              {copy.finishBtn}
            </button>
            <button
              type="button"
              onClick={handleReviewAgain}
              className="w-full min-h-[48px] rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-display font-bold text-sm hover:bg-slate-200 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              {copy.reviewAgainBtn}
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* REVIEW CARD — one due item at a time                         */}
      {/* ============================================================ */}
      {dueItems.length > 0 && !finished && current && (
        <div className="space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-display font-bold text-slate-500 dark:text-slate-400">
              <span>
                {copy.title} · {copy.progress(index + 1, dueItems.length)}
              </span>
              <span className="tabular-nums">
                {correctCount} ✓ / {outcomes.length}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-blue transition-all"
                style={{ width: `${(index / dueItems.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-brand-blue/10 text-brand-blue dark:text-accent-orange text-xs font-display font-extrabold">
                  {copy.boxLabel(current.box)}
                </span>
                {current.categoryTag && (
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold">
                    {current.categoryTag}
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase">
                  {current.itemType}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  speakRussian(current.correctAnswer, undefined, soundEnabled, 0.9)
                }
                aria-label="Listen to answer"
                className="min-h-[40px] min-w-[40px] rounded-xl bg-brand-blue/10 text-brand-blue dark:text-accent-orange flex items-center justify-center hover:bg-brand-blue hover:text-white transition cursor-pointer shrink-0"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center space-y-2">
              <div className="text-xs font-display font-extrabold uppercase tracking-wider text-brand-blue dark:text-accent-orange">
                {copy.promptLabel}
              </div>
              <div className="text-3xl sm:text-4xl font-display font-extrabold text-slate-900 dark:text-white leading-snug break-words">
                {current.promptPreview}
              </div>
              {!revealed && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {copy.tapToRevealHint}
                </p>
              )}
            </div>

            {revealed ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 text-center space-y-1">
                  <div className="text-xs font-display font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {copy.answerLabel}
                  </div>
                  <div className="text-2xl sm:text-3xl font-display font-extrabold text-brand-blue dark:text-accent-orange break-words">
                    {current.correctAnswer}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleAnswer(true)}
                    className="min-h-[54px] rounded-2xl bg-emerald-500 text-white font-display font-extrabold text-sm sm:text-base shadow-md hover:brightness-105 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="w-5 h-5" />
                    {copy.knewItBtn}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAnswer(false)}
                    className="min-h-[54px] rounded-2xl bg-red-500 text-white font-display font-extrabold text-sm sm:text-base shadow-md hover:brightness-105 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                    {copy.missedItBtn}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="w-full min-h-[54px] rounded-2xl bg-brand-blue text-white font-display font-extrabold text-base shadow-md hover:opacity-95 transition cursor-pointer"
              >
                {copy.revealBtn}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

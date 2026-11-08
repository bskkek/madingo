import React, { useMemo, useState } from 'react';
import { Check, ChevronRight, Volume2, X, Target, Trophy } from 'lucide-react';
import { CURRICULUM_UNITS } from '../data/curriculum';
import { useI18n } from '../lib/i18n';
import { speakRussian } from '../lib/audio';
import { SupportedLang } from '../lib/phase2Engine';
import {
  buildPlacementQuestions,
  getPlacementRecommendation,
  PLACEMENT_TEST_TOTAL,
  type PlacementRecommendation,
} from '../lib/placementTest';

export interface PlacementTestResult {
  score: number;
  total: number;
  recommendedUnitId: string;
  unlockLessonIds: string[];
}

interface PlacementTestViewProps {
  soundEnabled: boolean;
  onFinish: (result: PlacementTestResult) => void;
  onExit: () => void;
}

const UI_COPY: Record<
  SupportedLang,
  {
    title: string;
    subtitle: string;
    questionOf: (current: number, total: number) => string;
    nextBtn: string;
    seeResultBtn: string;
    correctBadge: string;
    wrongBadge: string;
    correctAnswerLabel: string;
    resultTitle: string;
    scoreLabel: string;
    recommendedLabel: string;
    unlockLabel: (count: number) => string;
    confirmBtn: string;
    exitBtn: string;
    retakeBtn: string;
  }
> = {
  ar: {
    title: 'اختبار تحديد المستوى',
    subtitle: '12 سؤالاً سريعاً — تخطَّ ما تعرفه وابدأ من مستواك الحقيقي.',
    questionOf: (c, t) => `السؤال ${c} من ${t}`,
    nextBtn: 'التالي',
    seeResultBtn: 'عرض النتيجة',
    correctBadge: 'إجابة صحيحة',
    wrongBadge: 'إجابة خاطئة',
    correctAnswerLabel: 'الإجابة الصحيحة:',
    resultTitle: 'نتيجتك',
    scoreLabel: 'النقاط',
    recommendedLabel: 'ننصحك أن تبدأ من:',
    unlockLabel: (n) => `سيتم فتح ${n} درساً سابقاً لك`,
    confirmBtn: 'ابدأ من هنا',
    exitBtn: 'خروج',
    retakeBtn: 'إعادة الاختبار',
  },
  ru: {
    title: 'Тест на уровень',
    subtitle: '12 быстрых вопросов — пропустите то, что уже знаете, и начните со своего уровня.',
    questionOf: (c, t) => `Вопрос ${c} из ${t}`,
    nextBtn: 'Дальше',
    seeResultBtn: 'Показать результат',
    correctBadge: 'Правильно',
    wrongBadge: 'Неправильно',
    correctAnswerLabel: 'Правильный ответ:',
    resultTitle: 'Ваш результат',
    scoreLabel: 'Баллы',
    recommendedLabel: 'Рекомендуем начать с:',
    unlockLabel: (n) => `Будет открыто уроков: ${n}`,
    confirmBtn: 'Начать отсюда',
    exitBtn: 'Выйти',
    retakeBtn: 'Пройти ещё раз',
  },
  en: {
    title: 'Placement Test',
    subtitle: '12 quick questions — skip what you already know and start at your real level.',
    questionOf: (c, t) => `Question ${c} of ${t}`,
    nextBtn: 'Next',
    seeResultBtn: 'See my result',
    correctBadge: 'Correct',
    wrongBadge: 'Not quite',
    correctAnswerLabel: 'Correct answer:',
    resultTitle: 'Your result',
    scoreLabel: 'Score',
    recommendedLabel: 'We recommend you start with:',
    unlockLabel: (n) => `${n} earlier lessons will be unlocked for you`,
    confirmBtn: 'Start here',
    exitBtn: 'Exit',
    retakeBtn: 'Retake the test',
  },
  fr: {
    title: 'Test de niveau',
    subtitle: '12 questions rapides — sautez ce que vous savez déjà et commencez à votre vrai niveau.',
    questionOf: (c, t) => `Question ${c} sur ${t}`,
    nextBtn: 'Suivant',
    seeResultBtn: 'Voir mon résultat',
    correctBadge: 'Correct',
    wrongBadge: 'Pas tout à fait',
    correctAnswerLabel: 'Bonne réponse :',
    resultTitle: 'Votre résultat',
    scoreLabel: 'Score',
    recommendedLabel: 'Nous vous conseillons de commencer par :',
    unlockLabel: (n) => `${n} leçons précédentes seront débloquées`,
    confirmBtn: 'Commencer ici',
    exitBtn: 'Quitter',
    retakeBtn: 'Repasser le test',
  },
};

const KIND_BADGE: Record<string, string> = {
  letter: 'АБВ',
  phrase: '💬',
  grammar: '🚦',
};

export const PlacementTestView: React.FC<PlacementTestViewProps> = ({
  soundEnabled,
  onFinish,
  onExit,
}) => {
  const { lang } = useI18n();
  const copy = UI_COPY[lang] || UI_COPY.en;

  const [attempt, setAttempt] = useState(0);
  const questions = useMemo(() => buildPlacementQuestions(lang), [lang, attempt]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [showResult, setShowResult] = useState(false);

  const question = questions[index];
  const isLast = index === questions.length - 1;
  const correctCount = answers.filter(Boolean).length;

  const recommendation: PlacementRecommendation = useMemo(
    () => getPlacementRecommendation(correctCount),
    [correctCount]
  );

  const recommendedUnit = CURRICULUM_UNITS.find(
    (u) => u.id === recommendation.recommendedUnitId
  );

  const handleSelect = (optionIndex: number) => {
    if (selected !== null) return;
    setSelected(optionIndex);
    setAnswers((prev) => [...prev, optionIndex === question.correctIndex]);
  };

  const handleNext = () => {
    if (selected === null) return;
    if (isLast) {
      setShowResult(true);
    } else {
      setIndex((i) => i + 1);
      setSelected(null);
    }
  };

  const handleRetake = () => {
    setIndex(0);
    setSelected(null);
    setAnswers([]);
    setShowResult(false);
    setAttempt((a) => a + 1);
  };

  const handleConfirm = () => {
    onFinish({
      score: correctCount,
      total: PLACEMENT_TEST_TOTAL,
      recommendedUnitId: recommendation.recommendedUnitId,
      unlockLessonIds: recommendation.unlockLessonIds,
    });
  };

  return (
    <div
      data-testid="placement-test-view"
      className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-28 space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue dark:text-accent-orange text-xs font-display font-extrabold mb-2">
            <Target className="w-3.5 h-3.5" />
            <span>PLACEMENT · {PLACEMENT_TEST_TOTAL} QUESTIONS</span>
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

      {/* Progress */}
      {!showResult && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-display font-bold text-slate-500 dark:text-slate-400">
            <span>{copy.questionOf(index + 1, questions.length)}</span>
            <span className="tabular-nums">
              {correctCount} ✓ / {answers.length}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-blue transition-all"
              style={{ width: `${((index + (selected !== null ? 1 : 0)) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* RESULT SCREEN                                                */}
      {/* ============================================================ */}
      {showResult ? (
        <div
          key={`result-${attempt}`}
          className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-2xl text-center space-y-6"
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-accent-orange/15 text-accent-orange flex items-center justify-center">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-extrabold text-slate-900 dark:text-white">
              {copy.resultTitle}
            </h2>
            <div className="mt-3 text-5xl font-display font-extrabold text-brand-blue dark:text-white tabular-nums">
              {correctCount}
              <span className="text-2xl text-slate-400"> / {PLACEMENT_TEST_TOTAL}</span>
            </div>
            <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {copy.scoreLabel}
            </div>
          </div>

          {recommendedUnit && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 space-y-1">
              <div className="text-xs font-display font-extrabold uppercase tracking-wider text-brand-blue dark:text-accent-orange">
                {copy.recommendedLabel}
              </div>
              <div className="text-lg font-display font-extrabold text-slate-900 dark:text-white">
                {recommendedUnit.title[lang] || recommendedUnit.title.en}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {recommendedUnit.subtitle[lang] || recommendedUnit.subtitle.en}
              </div>
              {recommendation.unlockLessonIds.length > 0 && (
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 pt-1">
                  {copy.unlockLabel(recommendation.unlockLessonIds.length)}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full min-h-[54px] rounded-2xl bg-accent-orange text-brand-navy font-display font-extrabold text-base shadow-lg hover:brightness-105 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {copy.confirmBtn}
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleRetake}
              className="w-full min-h-[48px] rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-display font-bold text-sm hover:bg-slate-200 transition cursor-pointer"
            >
              {copy.retakeBtn}
            </button>
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* QUESTION CARD                                                */
        /* ============================================================ */
        <div
          key={`${question.id}-${attempt}`}
          className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-6"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="px-2.5 py-1 rounded-lg bg-brand-blue/10 text-brand-blue dark:text-accent-orange text-xs font-display font-extrabold">
              {KIND_BADGE[question.kind] || '•'} · {question.kind.toUpperCase()}
            </span>
            {question.speakText && (
              <button
                type="button"
                onClick={() => speakRussian(question.speakText!, undefined, soundEnabled, 0.9)}
                aria-label="Listen"
                className="min-h-[40px] min-w-[40px] rounded-xl bg-brand-blue/10 text-brand-blue dark:text-accent-orange flex items-center justify-center hover:bg-brand-blue hover:text-white transition cursor-pointer"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-display font-extrabold text-slate-900 dark:text-white leading-snug">
            {question.questionText}
          </h2>

          <div className="grid grid-cols-1 gap-2.5">
            {question.options.map((option, i) => {
              const isCorrect = i === question.correctIndex;
              const isSelected = i === selected;
              const revealed = selected !== null;
              let style =
                'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:border-brand-blue';
              if (revealed && isCorrect) {
                style = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300';
              } else if (revealed && isSelected && !isCorrect) {
                style = 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300';
              } else if (revealed) {
                style = 'border-slate-200 dark:border-slate-700 opacity-60';
              }
              return (
                <button
                  key={`${question.id}-opt-${i}`}
                  type="button"
                  disabled={revealed}
                  onClick={() => handleSelect(i)}
                  className={`min-h-[54px] px-4 py-3 rounded-2xl border-2 font-display font-bold text-base sm:text-lg text-start text-slate-900 dark:text-white transition flex items-center justify-between gap-3 cursor-pointer disabled:cursor-default ${style}`}
                >
                  <span>{option}</span>
                  {revealed && isCorrect && <Check className="w-5 h-5 text-emerald-600 shrink-0" />}
                  {revealed && isSelected && !isCorrect && (
                    <X className="w-5 h-5 text-red-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {selected !== null && (
            <div
              className={`p-3 rounded-2xl text-sm font-semibold ${
                selected === question.correctIndex
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
              }`}
            >
              {selected === question.correctIndex
                ? `✓ ${copy.correctBadge}`
                : `✗ ${copy.wrongBadge} — ${copy.correctAnswerLabel} ${question.options[question.correctIndex]}`}
            </div>
          )}

          <button
            type="button"
            disabled={selected === null}
            onClick={handleNext}
            className="w-full min-h-[54px] rounded-2xl bg-accent-orange text-brand-navy font-display font-extrabold text-base shadow-md hover:brightness-105 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLast ? copy.seeResultBtn : copy.nextBtn}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  Volume2,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Fuel,
  ArrowRight,
  Keyboard,
  SkipForward,
  Lightbulb,
  Gauge,
  ShieldAlert,
} from 'lucide-react';
import { CurriculumLesson, LessonStep } from '../data/curriculum';
import { useI18n } from '../lib/i18n';
import { playSoundEffect, speakRussian } from '../lib/audio';
import { calculateLessonSummary, validateWordBuilderNextChar } from '../lib/rules';
import {
  checkSentenceBuilderOrder,
  checkTranslationAnswer,
  computeWordDiff,
  extractVowelsAndStress,
  WordDiffToken,
} from '../lib/phase2Engine';
import { CarSprite, MishaMascot, VocabIllustration } from './BrandVisuals';
import { CyrillicKeyboard } from './CyrillicKeyboard';

interface LessonPlayerProps {
  lesson: CurriculumLesson;
  soundEnabled: boolean;
  onExitToMap: () => void;
  onRecordMistake: (payload: {
    stepId: string;
    lessonId: string;
    promptPreview: string;
    correctAnswer: string;
    caseTag?: string;
    letterTag?: string;
  }) => void;
  onCompleteLesson: (payload: {
    lessonId: string;
    accuracy: number;
    fuelEarned: number;
    openNextLesson?: boolean;
  }) => void;
}

export const LessonPlayer: React.FC<LessonPlayerProps> = ({
  lesson,
  soundEnabled,
  onExitToMap,
  onRecordMistake,
  onCompleteLesson,
}) => {
  const { lang, t } = useI18n();

  const [stepQueue, setStepQueue] = useState<LessonStep[]>(() => [...lesson.steps]);
  const [stepIndex, setStepIndex] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [strokeAnimKey, setStrokeAnimKey] = useState(0);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<'none' | 'correct' | 'wrong'>('none');
  const [mistakesOnStep, setMistakesOnStep] = useState(0);
  const [hadMistakeOnCurrentStep, setHadMistakeOnCurrentStep] = useState(false);
  const [showCyrillicKeyboard, setShowCyrillicKeyboard] = useState(true);

  const [assembledWord, setAssembledWord] = useState('');
  const [usedTileIndices, setUsedTileIndices] = useState<number[]>([]);
  const [shakingTileIndex, setShakingTileIndex] = useState<number | null>(null);
  const [shakingKeyboardKey, setShakingKeyboardKey] = useState<string | null>(null);
  const [wrongTileHintVisible, setWrongTileHintVisible] = useState(false);

  const [sentenceTilesPicked, setSentenceTilesPicked] = useState<{ word: string; idx: number }[]>([]);
  const [typedInput, setTypedInput] = useState('');
  const [wordDiff, setWordDiff] = useState<WordDiffToken[] | null>(null);

  const [selectedLeftPairId, setSelectedLeftPairId] = useState<string | null>(null);
  const [selectedRightPairId, setSelectedRightPairId] = useState<string | null>(null);
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([]);
  const [wrongPairFlash, setWrongPairFlash] = useState(false);

  const [selectedCharIndex, setSelectedCharIndex] = useState<number | null>(null);

  const [correctStepsCount, setCorrectStepsCount] = useState(0);
  const [firstTryCorrectExercises, setFirstTryCorrectExercises] = useState(0);
  const [isLessonFinished, setIsLessonFinished] = useState(false);

  useEffect(() => {
    setStepQueue([...lesson.steps]);
    setStepIndex(0);
    setCorrectStepsCount(0);
    setFirstTryCorrectExercises(0);
    setIsLessonFinished(false);
  }, [lesson.id]);

  const currentStep: LessonStep | undefined = stepQueue[stepIndex];
  const totalExercises = lesson.steps.filter(
    (s) => s.type !== 'letter_card' && s.type !== 'phrase_card'
  ).length;

  useEffect(() => {
    setSelectedOption(null);
    setFeedbackState('none');
    setMistakesOnStep(0);
    setHadMistakeOnCurrentStep(false);
    setAssembledWord('');
    setUsedTileIndices([]);
    setShakingTileIndex(null);
    setShakingKeyboardKey(null);
    setWrongTileHintVisible(false);
    setSentenceTilesPicked([]);
    setTypedInput('');
    setWordDiff(null);
    setSelectedLeftPairId(null);
    setSelectedRightPairId(null);
    setMatchedPairIds([]);
    setWrongPairFlash(false);
    setSelectedCharIndex(null);
    setStrokeAnimKey((k) => k + 1);

    if (!currentStep) return;

    if (currentStep.type === 'letter_card' && currentStep.content.letter) {
      speakRussian(
        currentStep.content.letter.examples[0].cleanWord,
        currentStep.content.letter.audioSlug,
        soundEnabled
      );
    } else if (currentStep.type === 'phrase_card' && currentStep.content.phrase) {
      speakRussian(
        currentStep.content.phrase.cleanPhrase,
        currentStep.content.phrase.audioSlug,
        soundEnabled
      );
    } else if (currentStep.content.audioText) {
      speakRussian(
        currentStep.content.audioText,
        currentStep.content.audioSlug,
        soundEnabled
      );
    } else if (currentStep.type === 'word_builder' && currentStep.content.targetWordWithStress) {
      speakRussian(
        currentStep.content.targetWordWithStress,
        currentStep.content.audioSlug,
        soundEnabled
      );
    }
  }, [stepIndex, currentStep?.id, lesson.id]);

  const progressFraction = stepQueue.length > 0 ? (stepIndex + 1) / stepQueue.length : 1;

  const registerMistake = (caseTag?: string, letterTag?: string) => {
    setMistakesOnStep((m) => m + 1);
    if (!hadMistakeOnCurrentStep && currentStep) {
      setHadMistakeOnCurrentStep(true);
      onRecordMistake({
        stepId: currentStep.id,
        lessonId: lesson.id,
        promptPreview:
          currentStep.content.promptText?.[lang] ||
          currentStep.content.translation?.[lang] ||
          currentStep.content.sentenceBefore ||
          currentStep.content.audioText ||
          lesson.title[lang],
        correctAnswer: currentStep.content.correctAnswer,
        caseTag: caseTag || currentStep.content.requiredCase,
        letterTag: letterTag || currentStep.content.targetLetter,
      });
    }
  };

  const markStepCorrect = () => {
    playSoundEffect('correct', soundEnabled);
    setFeedbackState('correct');
    setCorrectStepsCount((c) => c + 1);
    if (!hadMistakeOnCurrentStep) {
      setFirstTryCorrectExercises((c) => c + 1);
    }
  };

  const handleAdvanceStep = () => {
    if (stepIndex + 1 < stepQueue.length) {
      setStepIndex(stepIndex + 1);
    } else {
      setIsLessonFinished(true);
      playSoundEffect('complete', soundEnabled);
      try {
        confetti({
          particleCount: 70,
          spread: 65,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore in headless mode
      }
    }
  };

  const handleSkipForLater = () => {
    if (!currentStep || stepIndex + 1 >= stepQueue.length) {
      handleAdvanceStep();
      return;
    }
    playSoundEffect('tap', soundEnabled);
    setStepQueue((prev) => {
      const next = [...prev];
      const [skipped] = next.splice(stepIndex, 1);
      next.push(skipped);
      return next;
    });
  };

  const handleSelectOption = (opt: string) => {
    if (feedbackState === 'correct' || !currentStep) return;
    setSelectedOption(opt);
    speakRussian(opt, undefined, soundEnabled);

    if (opt === currentStep.content.correctAnswer) {
      markStepCorrect();
    } else {
      playSoundEffect('wrong', soundEnabled);
      setFeedbackState('wrong');
      registerMistake(currentStep.content.requiredCase, currentStep.content.targetLetter);
    }
  };

  const handleWordBuilderInput = (char: string, tileIdx?: number) => {
    if (feedbackState === 'correct' || !currentStep?.content.targetCleanWord) return;

    const check = validateWordBuilderNextChar(
      currentStep.content.targetCleanWord,
      assembledWord,
      char
    );

    if (check.accepted) {
      playSoundEffect('tap', soundEnabled);
      setWrongTileHintVisible(false);
      setAssembledWord(check.nextAssembled);
      if (tileIdx !== undefined) {
        setUsedTileIndices((prev) => [...prev, tileIdx]);
      } else {
        const tiles = currentStep.content.tiles || [];
        const matchIdx = tiles.findIndex(
          (tChar, i) =>
            !usedTileIndices.includes(i) && tChar.toUpperCase() === char.toUpperCase()
        );
        if (matchIdx !== -1) {
          setUsedTileIndices((prev) => [...prev, matchIdx]);
        }
      }

      if (check.isComplete) {
        speakRussian(
          currentStep.content.targetWordWithStress || check.nextAssembled,
          currentStep.content.audioSlug,
          soundEnabled
        );
        markStepCorrect();
      }
    } else {
      playSoundEffect('wrong', soundEnabled);
      setWrongTileHintVisible(true);
      if (tileIdx !== undefined) {
        setShakingTileIndex(tileIdx);
        setTimeout(() => setShakingTileIndex(null), 400);
      } else {
        setShakingKeyboardKey(char.toUpperCase());
        setTimeout(() => setShakingKeyboardKey(null), 400);
      }
      registerMistake(undefined, char.toUpperCase());
    }
  };

  const handleCheckSentenceBuilder = () => {
    if (!currentStep) return;
    const pickedWords = sentenceTilesPicked.map((t) => t.word);
    const acceptedOrders =
      currentStep.content.acceptedOrders && currentStep.content.acceptedOrders.length > 0
        ? currentStep.content.acceptedOrders
        : [currentStep.content.correctAnswer.split(/\s+/)];
    const ok = checkSentenceBuilderOrder(pickedWords, acceptedOrders);
    if (ok) {
      if (currentStep.content.audioText) {
        speakRussian(currentStep.content.audioText, currentStep.content.audioSlug, soundEnabled);
      }
      markStepCorrect();
    } else {
      playSoundEffect('wrong', soundEnabled);
      setFeedbackState('wrong');
      registerMistake();
    }
  };

  const handleCheckTypedAnswer = () => {
    if (!currentStep || !typedInput.trim()) return;
    const candidates = [
      currentStep.content.correctAnswer,
      ...(currentStep.content.acceptedVariants || []),
    ];
    const check = checkTranslationAnswer(typedInput, candidates, {
      treatYoAsYe: currentStep.content.treatYoAsYe ?? true,
    });
    const diff = computeWordDiff(typedInput, currentStep.content.correctAnswer);
    setWordDiff(diff);

    if (check.isCorrect) {
      speakRussian(currentStep.content.correctAnswer, currentStep.content.audioSlug, soundEnabled);
      markStepCorrect();
    } else {
      playSoundEffect('wrong', soundEnabled);
      setFeedbackState('wrong');
      registerMistake(currentStep.content.requiredCase);
    }
  };

  const handlePairSelect = (side: 'left' | 'right', id: string, ruText?: string) => {
    if (feedbackState === 'correct' || matchedPairIds.includes(id) || !currentStep) return;
    if (ruText) {
      speakRussian(ruText, undefined, soundEnabled);
    } else {
      playSoundEffect('tap', soundEnabled);
    }

    const nextLeft = side === 'left' ? id : selectedLeftPairId;
    const nextRight = side === 'right' ? id : selectedRightPairId;

    if (side === 'left') setSelectedLeftPairId(id);
    if (side === 'right') setSelectedRightPairId(id);

    if (nextLeft && nextRight) {
      if (nextLeft === nextRight) {
        playSoundEffect('correct', soundEnabled);
        const updated = [...matchedPairIds, nextLeft];
        setMatchedPairIds(updated);
        setSelectedLeftPairId(null);
        setSelectedRightPairId(null);
        const totalPairs = (currentStep.content.pairs || []).length;
        if (updated.length >= totalPairs) {
          markStepCorrect();
        }
      } else {
        playSoundEffect('wrong', soundEnabled);
        setWrongPairFlash(true);
        registerMistake();
        setTimeout(() => {
          setSelectedLeftPairId(null);
          setSelectedRightPairId(null);
          setWrongPairFlash(false);
        }, 450);
      }
    }
  };

  const handleStressVowelTap = (vowelIdx: number, charIdx: number) => {
    if (feedbackState === 'correct' || !currentStep) return;
    setSelectedCharIndex(charIdx);
    const stressData = extractVowelsAndStress(
      currentStep.content.targetWordWithStress || currentStep.content.correctAnswer
    );
    const isCorrect =
      currentStep.content.stressedVowelIndex !== undefined
        ? vowelIdx === currentStep.content.stressedVowelIndex ||
          charIdx === stressData.stressedCharIndex
        : charIdx === stressData.stressedCharIndex;

    if (isCorrect) {
      speakRussian(
        currentStep.content.targetWordWithStress || currentStep.content.correctAnswer,
        currentStep.content.audioSlug,
        soundEnabled
      );
      markStepCorrect();
    } else {
      playSoundEffect('wrong', soundEnabled);
      setFeedbackState('wrong');
      registerMistake();
    }
  };

  if (isLessonFinished) {
    const summary = calculateLessonSummary(
      firstTryCorrectExercises,
      totalExercises,
      correctStepsCount
    );

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--surface-canvas)] p-4 sm:p-8">
        <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-2xl text-center space-y-6">
          <div className="flex justify-center">
            <MishaMascot expression="cheering" size={140} />
          </div>

          <h1 className="text-3xl font-display font-extrabold text-slate-900 dark:text-white">
            {t('lesson.completeTitle')}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
            {t('lesson.completeSubtitle')}
          </p>

          <div className="w-full h-16 rounded-2xl bg-road relative overflow-hidden flex items-center px-6 border border-slate-700">
            <div className="w-full border-t-4 border-dashed border-lane/80" />
            <div className="absolute end-8 top-2.5 animate-car-idle">
              <CarSprite className="w-16 h-10" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-slate-800 border border-amber-200 dark:border-slate-700">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t('lesson.fuelEarnedLabel')}
              </div>
              <div className="mt-1 text-2xl font-display font-extrabold text-accent-orange tabular-nums">
                +{summary.fuelEarned}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-slate-800 border border-emerald-200 dark:border-slate-700">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t('lesson.accuracyLabel')}
              </div>
              <div className="mt-1 text-2xl font-display font-extrabold text-success tabular-nums">
                {summary.accuracy}%
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t('lesson.streakUpdatedLabel')}
              </div>
              <div className="mt-1 text-2xl font-display font-extrabold text-brand-blue dark:text-sky-400 tabular-nums">
                +1 {t('common.kmUnit')}
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() =>
                onCompleteLesson({
                  lessonId: lesson.id,
                  accuracy: summary.accuracy,
                  fuelEarned: summary.fuelEarned,
                  openNextLesson: true,
                })
              }
              className="w-full min-h-[54px] rounded-2xl bg-accent-orange text-brand-navy font-display font-extrabold text-base shadow-lg hover:brightness-105 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{t('lesson.nextLessonBtn')}</span>
              <ArrowRight className="w-5 h-5 rtl:rotate-180" />
            </button>

            <button
              type="button"
              onClick={() =>
                onCompleteLesson({
                  lessonId: lesson.id,
                  accuracy: summary.accuracy,
                  fuelEarned: summary.fuelEarned,
                  openNextLesson: false,
                })
              }
              className="w-full min-h-[48px] rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              {t('lesson.backToMapBtn')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentStep) return null;

  const isTeachingCard =
    currentStep.type === 'letter_card' || currentStep.type === 'phrase_card';

  const hintText =
    currentStep.content.hint?.[lang] ||
    currentStep.content.caseExplanation?.[lang] ||
    `${t('garage.correctForm')}: ${currentStep.content.correctAnswer}`;

  const sentenceBuilderWordBank =
    currentStep.content.tiles || currentStep.content.options || [];

  const fullBlankSentence = currentStep.content.sentenceBefore
    ? `${currentStep.content.sentenceBefore} ___ ${currentStep.content.sentenceAfter || ''}`
    : currentStep.content.promptText?.ru || '';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface-canvas)] text-[var(--text-primary)]">
      {/* Top Road Progress Bar Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 h-16 flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setShowExitConfirm(true)}
          aria-label={t('lesson.exitLeave')}
          className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
        >
          <X className="w-6 h-6" />
        </button>

        <div
          className="flex-1 h-7 rounded-full bg-road relative overflow-hidden border border-slate-700 flex items-center px-2"
          role="progressbar"
          aria-valuenow={stepIndex + 1}
          aria-valuemin={1}
          aria-valuemax={stepQueue.length}
        >
          <div className="w-full border-t-2 border-dashed border-lane/50" />
          <div
            className="absolute inset-y-0 start-0 bg-emerald-500/35 transition-all duration-300"
            style={{ width: `${Math.round(progressFraction * 100)}%` }}
          />
          <div
            className="absolute top-0.5 transition-all duration-300"
            style={{
              insetInlineStart: `calc(${Math.min(92, Math.max(4, Math.round(progressFraction * 90)))}% - 18px)`,
            }}
          >
            <CarSprite className="w-9 h-6" />
          </div>
        </div>

        {!isTeachingCard && stepQueue.length > 1 && (
          <button
            type="button"
            onClick={handleSkipForLater}
            className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition cursor-pointer shrink-0"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('lesson.skipForLaterBtn')}</span>
          </button>
        )}

        <div className="flex items-center gap-1.5 font-display font-bold text-sm text-accent-orange tabular-nums shrink-0">
          <Fuel className="w-4 h-4" />
          <span>+{correctStepsCount * 10}</span>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-40 space-y-4">
        {/* Free Hint & Adaptive Extra Practice Banner after 2 mistakes */}
        {mistakesOnStep >= 2 && !isTeachingCard && (
          <div
            role="status"
            className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-accent-orange shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-slate-800 dark:text-amber-100">
                <strong className="block font-display text-accent-orange">
                  {t('lesson.hintBadge')} · Adaptive Practice Ready
                </strong>
                <span>{hintText}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!currentStep) return;
                setStepQueue((prev) => [...prev, { ...currentStep, id: `${currentStep.id}-reinforce-${Date.now()}` }]);
              }}
              className="px-3 py-1.5 rounded-xl bg-accent-orange text-brand-navy font-display font-bold text-xs shrink-0 cursor-pointer"
            >
              +1 Extra Practice Step
            </button>
          </div>
        )}

        {/* Adaptive Fast-Track Skip-Ahead Banner after 3+ consecutive first-try correct answers */}
        {firstTryCorrectExercises >= 3 &&
          mistakesOnStep === 0 &&
          stepIndex + 1 < stepQueue.length &&
          !isTeachingCard && (
            <div
              role="status"
              className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 p-3.5 flex items-center justify-between gap-3"
            >
              <div className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                ⚡ Fast-Track Streak ({firstTryCorrectExercises} in a row): Ready to jump to the final checkpoint?
              </div>
              <button
                type="button"
                onClick={() => setStepIndex(stepQueue.length - 1)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-display font-bold text-xs shrink-0 cursor-pointer"
              >
                Skip to Final Step
              </button>
            </div>
          )}

        {/* 1) TEACHING LETTER CARD */}
        {currentStep.type === 'letter_card' && currentStep.content.letter && (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <span className="text-xs font-semibold text-brand-blue dark:text-accent-orange">
                {t('lesson.teachingBadge')} · {stepIndex + 1}/{stepQueue.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    speakRussian(
                      currentStep.content.letter!.examples[0].cleanWord,
                      currentStep.content.letter!.audioSlug,
                      soundEnabled,
                      0.9
                    )
                  }
                  className="min-h-[44px] px-4 py-2 rounded-2xl bg-brand-blue text-white font-semibold text-xs sm:text-sm flex items-center gap-2 hover:opacity-95 transition cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>{t('lesson.listenLetterBtn')}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    speakRussian(
                      currentStep.content.letter!.examples[0].cleanWord,
                      currentStep.content.letter!.audioSlug,
                      soundEnabled,
                      0.6
                    )
                  }
                  className="min-h-[44px] px-3 py-2 rounded-2xl border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <Gauge className="w-3.5 h-3.5 text-accent-orange" />
                  <span>{t('lesson.slowAudioBtn')}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t('lesson.uppercaseLabel')}
                </div>
                <div className="mt-2 text-6xl font-display font-extrabold text-brand-blue dark:text-white tracking-wider">
                  {currentStep.content.letter.upper} {currentStep.content.letter.lower}
                </div>
                <div className="mt-2 text-sm font-mono text-accent-orange font-semibold">
                  {currentStep.content.letter.phonetic}
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-amber-50/60 dark:bg-slate-800/80 border border-amber-200/80 dark:border-slate-700 flex flex-col items-center justify-between">
                <div className="w-full flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t('lesson.cursiveLabel')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setStrokeAnimKey((k) => k + 1)}
                    className="text-xs font-semibold text-brand-blue dark:text-accent-orange flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('lesson.animateStrokeBtn')}</span>
                  </button>
                </div>

                <div className="my-2 flex items-center gap-6">
                  <span className="text-5xl italic font-serif text-slate-800 dark:text-amber-200 select-none">
                    {currentStep.content.letter.upper} {currentStep.content.letter.lower}
                  </span>
                  <svg
                    key={strokeAnimKey}
                    viewBox="0 0 120 105"
                    className="w-20 h-20 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                    aria-label="Letter stroke order preview"
                  >
                    <line x1="10" y1="24" x2="110" y2="24" stroke="#E2E8F0" strokeDasharray="4 4" />
                    <line x1="10" y1="54" x2="110" y2="54" stroke="#E2E8F0" strokeDasharray="4 4" />
                    <line x1="10" y1="84" x2="110" y2="84" stroke="#E2E8F0" strokeDasharray="4 4" />
                    <path
                      d={currentStep.content.letter.strokePath}
                      fill="none"
                      stroke="#FF8A1F"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="animate-stroke-draw"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-slate-800 border border-blue-200/70 dark:border-slate-700">
              <div className="text-xs font-bold text-brand-blue dark:text-accent-orange">
                {t('lesson.soundHintLabel')}
              </div>
              <p className="mt-1 text-base font-medium text-slate-800 dark:text-slate-100">
                {currentStep.content.letter.soundComparison[lang]}
              </p>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
                {t('lesson.exampleWordsLabel')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {currentStep.content.letter.examples.map((ex) => (
                  <button
                    key={ex.audioSlug}
                    type="button"
                    onClick={() => speakRussian(ex.cleanWord, ex.audioSlug, soundEnabled)}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-brand-blue dark:hover:border-accent-orange bg-white dark:bg-slate-800/60 flex items-center justify-between gap-3 text-start transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <VocabIllustration iconKey={ex.iconKey} className="w-14 h-14" />
                      <div>
                        <div className="font-display font-extrabold text-xl text-slate-900 dark:text-white">
                          {ex.wordWithStress}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {ex.translations[lang]}
                        </div>
                      </div>
                    </div>
                    <Volume2 className="w-5 h-5 text-brand-blue dark:text-accent-orange shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playSoundEffect('tap', soundEnabled);
                handleAdvanceStep();
              }}
              className="w-full min-h-[54px] rounded-2xl bg-accent-orange text-brand-navy font-display font-extrabold text-base shadow-md hover:brightness-105 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{t('common.continue')}</span>
              <ArrowRight className="w-5 h-5 rtl:rotate-180" />
            </button>
          </div>
        )}

        {/* 2) TEACHING PHRASE CARD */}
        {currentStep.type === 'phrase_card' && currentStep.content.phrase && (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <span className="text-xs font-semibold text-brand-blue dark:text-accent-orange">
                {t('lesson.phraseCardBadge')} · {stepIndex + 1}/{stepQueue.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    speakRussian(
                      currentStep.content.phrase!.cleanPhrase,
                      currentStep.content.phrase!.audioSlug,
                      soundEnabled,
                      0.9
                    )
                  }
                  className="min-h-[44px] px-4 py-2 rounded-2xl bg-brand-blue text-white font-semibold text-xs sm:text-sm flex items-center gap-2 hover:opacity-95 transition cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>{t('lesson.listenPhraseBtn')}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    speakRussian(
                      currentStep.content.phrase!.cleanPhrase,
                      currentStep.content.phrase!.audioSlug,
                      soundEnabled,
                      0.6
                    )
                  }
                  className="min-h-[44px] px-3 py-2 rounded-2xl border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <Gauge className="w-3.5 h-3.5 text-accent-orange" />
                  <span>{t('lesson.slowAudioBtn')}</span>
                </button>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-5">
              <VocabIllustration
                iconKey={currentStep.content.phrase.iconKey}
                className="w-20 h-20"
              />
              <div className="text-center sm:text-start">
                <div className="text-3xl sm:text-4xl font-display font-extrabold text-slate-900 dark:text-white">
                  {currentStep.content.phrase.phraseWithStress}
                </div>
                <div className="mt-1.5 text-lg font-semibold text-brand-blue dark:text-accent-orange">
                  {currentStep.content.phrase.translations[lang]}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-slate-800 border border-blue-200/70 dark:border-slate-700">
              <div className="text-xs font-bold text-brand-blue dark:text-accent-orange">
                {t('lesson.literalMeaningLabel')}
              </div>
              <p className="mt-1 text-sm sm:text-base text-slate-700 dark:text-slate-200">
                {currentStep.content.phrase.usageNote[lang]}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                playSoundEffect('tap', soundEnabled);
                handleAdvanceStep();
              }}
              className="w-full min-h-[54px] rounded-2xl bg-accent-orange text-brand-navy font-display font-extrabold text-base shadow-md hover:brightness-105 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{t('common.continue')}</span>
              <ArrowRight className="w-5 h-5 rtl:rotate-180" />
            </button>
          </div>
        )}

        {/* 3) EXERCISE TYPE 1: LETTER-SOUND MATCH */}
        {currentStep.type === 'letter_sound' && (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-6">
            <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-white">
              {t('lesson.exLetterSoundPrompt')}
            </h2>

            <div className="flex items-center justify-center gap-3 py-4">
              <button
                type="button"
                onClick={() =>
                  speakRussian(
                    currentStep.content.audioText || currentStep.content.correctAnswer,
                    currentStep.content.audioSlug,
                    soundEnabled,
                    0.9
                  )
                }
                aria-label={t('lesson.playAudioBtn')}
                className="w-24 h-24 rounded-3xl bg-brand-blue text-white shadow-lg flex flex-col items-center justify-center gap-1.5 hover:scale-105 active:scale-95 transition cursor-pointer"
              >
                <Volume2 className="w-10 h-10" />
                <span className="text-xs font-semibold">{currentStep.content.phoneticHint}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  speakRussian(
                    currentStep.content.audioText || currentStep.content.correctAnswer,
                    currentStep.content.audioSlug,
                    soundEnabled,
                    0.6
                  )
                }
                aria-label={t('lesson.slowAudioBtn')}
                className="h-24 px-4 rounded-3xl border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex flex-col items-center justify-center gap-1.5 hover:border-brand-blue transition cursor-pointer"
              >
                <Gauge className="w-6 h-6 text-accent-orange" />
                <span className="text-xs font-semibold">{t('lesson.slowAudioBtn')}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {(currentStep.content.options || []).map((opt) => {
                const isSelected = selectedOption === opt;
                const isCorrect = opt === currentStep.content.correctAnswer;
                let borderStyle =
                  'border-slate-200 dark:border-slate-700 hover:border-brand-blue dark:hover:border-accent-orange bg-slate-50/70 dark:bg-slate-800';
                if (isSelected && feedbackState === 'correct' && isCorrect) {
                  borderStyle = 'border-success bg-emerald-50 dark:bg-emerald-950/60 text-success';
                } else if (isSelected && feedbackState === 'wrong' && !isCorrect) {
                  borderStyle = 'border-error bg-red-50 dark:bg-red-950/60 text-error animate-shake';
                }

                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectOption(opt)}
                    className={`min-h-[96px] rounded-2xl border-2 font-display font-extrabold text-4xl flex items-center justify-center transition cursor-pointer ${borderStyle}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4) EXERCISE TYPE 2: WORD BUILDER */}
        {currentStep.type === 'word_builder' && (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-white">
                {t('lesson.exWordBuilderPrompt')}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    speakRussian(
                      currentStep.content.targetWordWithStress || currentStep.content.correctAnswer,
                      currentStep.content.audioSlug,
                      soundEnabled,
                      0.9
                    )
                  }
                  className="min-h-[44px] px-4 rounded-2xl bg-brand-blue text-white font-semibold text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>{t('lesson.playAudioBtn')}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    speakRussian(
                      currentStep.content.targetWordWithStress || currentStep.content.correctAnswer,
                      currentStep.content.audioSlug,
                      soundEnabled,
                      0.6
                    )
                  }
                  className="min-h-[44px] px-3 rounded-2xl border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Gauge className="w-3.5 h-3.5 text-accent-orange" />
                  <span>{t('lesson.slowAudioBtn')}</span>
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {currentStep.content.translation?.[lang]}
                </div>
                <div className="mt-0.5 text-lg font-display font-bold text-brand-blue dark:text-accent-orange">
                  {currentStep.content.targetWordWithStress}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCyrillicKeyboard((v) => !v)}
                className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <Keyboard className="w-4 h-4" />
                <span>
                  {showCyrillicKeyboard
                    ? t('lesson.keyboardToggleHide')
                    : t('lesson.keyboardToggleShow')}
                </span>
              </button>
            </div>

            <div className="min-h-[72px] p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center gap-2 flex-wrap">
              {(currentStep.content.targetCleanWord || '').split('').map((_, idx) => {
                const filledChar = assembledWord[idx];
                return (
                  <div
                    key={idx}
                    className={`w-12 h-12 rounded-xl font-display font-extrabold text-2xl flex items-center justify-center border-2 transition ${
                      filledChar
                        ? 'bg-brand-blue text-white border-brand-blue shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-400'
                    }`}
                  >
                    {filledChar || ''}
                  </div>
                );
              })}
            </div>

            {wrongTileHintVisible && (
              <div
                role="alert"
                className="text-xs font-semibold text-error flex items-center justify-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>{t('lesson.wrongTileHint')}</span>
              </div>
            )}

            <div className="flex items-center justify-center gap-2.5 flex-wrap">
              {(currentStep.content.tiles || []).map((tileChar, idx) => {
                const isUsed = usedTileIndices.includes(idx);
                const isShaking = shakingTileIndex === idx;
                return (
                  <button
                    key={`${tileChar}-${idx}`}
                    type="button"
                    disabled={isUsed}
                    onClick={() => handleWordBuilderInput(tileChar, idx)}
                    className={`min-h-[54px] min-w-[54px] px-4 rounded-2xl font-display font-extrabold text-2xl border-2 transition cursor-pointer ${
                      isUsed
                        ? 'opacity-30 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 cursor-default'
                        : isShaking
                        ? 'animate-shake border-error bg-red-50 text-error'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand-blue dark:hover:border-accent-orange shadow-xs'
                    }`}
                  >
                    {tileChar}
                  </button>
                );
              })}
            </div>

            {showCyrillicKeyboard && (
              <CyrillicKeyboard
                onKeyPress={(letter) => handleWordBuilderInput(letter)}
                onBackspace={() => {
                  if (feedbackState === 'correct' || assembledWord.length === 0) return;
                  setAssembledWord((prev) => prev.slice(0, -1));
                  setUsedTileIndices((prev) => prev.slice(0, -1));
                }}
                onClear={() => {
                  if (feedbackState === 'correct') return;
                  setAssembledWord('');
                  setUsedTileIndices([]);
                  setWrongTileHintVisible(false);
                }}
                shakingKey={shakingKeyboardKey}
              />
            )}
          </div>
        )}

        {/* 5) EXERCISE TYPE 3: PICTURE-WORD CHOICE */}
        {currentStep.type === 'picture_word' && (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-6">
            <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-white">
              {t('lesson.exPictureWordPrompt')}
            </h2>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <VocabIllustration iconKey={currentStep.content.iconKey} className="w-20 h-20" />
                <div>
                  <div className="text-lg font-display font-bold text-slate-900 dark:text-white">
                    {currentStep.content.translation?.[lang]}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {lesson.title[lang]}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    speakRussian(
                      currentStep.content.audioText || currentStep.content.correctAnswer,
                      currentStep.content.audioSlug,
                      soundEnabled,
                      0.9
                    )
                  }
                  className="min-h-[44px] px-4 rounded-2xl bg-brand-blue text-white font-semibold text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>{t('lesson.playAudioBtn')}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    speakRussian(
                      currentStep.content.audioText || currentStep.content.correctAnswer,
                      currentStep.content.audioSlug,
                      soundEnabled,
                      0.6
                    )
                  }
                  className="min-h-[44px] px-3 rounded-2xl border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Gauge className="w-3.5 h-3.5 text-accent-orange" />
                  <span>{t('lesson.slowAudioBtn')}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {(currentStep.content.options || []).map((opt) => {
                const isSelected = selectedOption === opt;
                const isCorrect = opt === currentStep.content.correctAnswer;
                let borderStyle =
                  'border-slate-200 dark:border-slate-700 hover:border-brand-blue dark:hover:border-accent-orange bg-white dark:bg-slate-800';
                if (isSelected && feedbackState === 'correct' && isCorrect) {
                  borderStyle = 'border-success bg-emerald-50 dark:bg-emerald-950/60 text-success';
                } else if (isSelected && feedbackState === 'wrong' && !isCorrect) {
                  borderStyle = 'border-error bg-red-50 dark:bg-red-950/60 text-error animate-shake';
                }

                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectOption(opt)}
                    className={`min-h-[64px] px-5 py-3 rounded-2xl border-2 font-display font-bold text-xl flex items-center justify-between transition cursor-pointer ${borderStyle}`}
                  >
                    <span>{opt}</span>
                    {isSelected && feedbackState === 'correct' && (
                      <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 6) EXERCISE TYPE 4: SENTENCE BUILDER */}
        {currentStep.type === 'sentence_builder' && (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-white">
                {t('lesson.exSentenceBuilderPrompt')}
              </h2>
              {currentStep.content.audioText && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      speakRussian(
                        currentStep.content.audioText!,
                        currentStep.content.audioSlug,
                        soundEnabled,
                        0.9
                      )
                    }
                    className="min-h-[44px] px-3.5 rounded-2xl bg-brand-blue text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>{t('lesson.playAudioBtn')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      speakRussian(
                        currentStep.content.audioText!,
                        currentStep.content.audioSlug,
                        soundEnabled,
                        0.6
                      )
                    }
                    className="min-h-[44px] px-3 rounded-2xl border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Gauge className="w-3.5 h-3.5 text-accent-orange" />
                    <span>{t('lesson.slowAudioBtn')}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <div className="text-base sm:text-lg font-display font-bold text-slate-900 dark:text-white">
                {currentStep.content.promptText?.[lang] || currentStep.content.translation?.[lang]}
              </div>
            </div>

            <div className="min-h-[76px] p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center gap-2 flex-wrap">
              {sentenceTilesPicked.length === 0 ? (
                <span className="text-xs text-slate-400">
                  {t('lesson.exSentenceBuilderPrompt')}
                </span>
              ) : (
                sentenceTilesPicked.map((item, pos) => (
                  <button
                    key={`${item.word}-${item.idx}-${pos}`}
                    type="button"
                    onClick={() => {
                      if (feedbackState === 'correct') return;
                      playSoundEffect('tap', soundEnabled);
                      setSentenceTilesPicked((prev) => prev.filter((_, i) => i !== pos));
                    }}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-brand-blue text-white font-display font-bold text-base shadow-xs cursor-pointer"
                  >
                    {item.word}
                  </button>
                ))
              )}
            </div>

            <div className="flex items-center justify-center gap-2.5 flex-wrap">
              {sentenceBuilderWordBank.map((word, idx) => {
                const isPicked = sentenceTilesPicked.some((t) => t.idx === idx);
                return (
                  <button
                    key={`${word}-${idx}`}
                    type="button"
                    disabled={isPicked || feedbackState === 'correct'}
                    onClick={() => {
                      speakRussian(word, undefined, soundEnabled);
                      setSentenceTilesPicked((prev) => [...prev, { word, idx }]);
                    }}
                    className={`min-h-[48px] px-4 py-2 rounded-2xl font-display font-bold text-base border-2 transition cursor-pointer ${
                      isPicked
                        ? 'opacity-30 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 cursor-default'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand-blue dark:hover:border-accent-orange shadow-xs'
                    }`}
                  >
                    {word}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={sentenceTilesPicked.length === 0 || feedbackState === 'correct'}
              onClick={handleCheckSentenceBuilder}
              className="w-full min-h-[52px] rounded-2xl bg-accent-orange text-brand-navy font-display font-extrabold text-base shadow-md disabled:opacity-45 cursor-pointer"
            >
              {t('lesson.checkAnswerBtn')}
            </button>
          </div>
        )}

        {/* 7) EXERCISE TYPE 5 & 6: TRANSLATION TYPING & LISTENING DICTATION */}
        {(currentStep.type === 'translation_typing' ||
          currentStep.type === 'listening_dictation') && (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-white">
                {currentStep.type === 'listening_dictation'
                  ? t('lesson.exDictationPrompt')
                  : t('lesson.exTranslationTypingPrompt')}
              </h2>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    speakRussian(
                      currentStep.content.audioText || currentStep.content.correctAnswer,
                      currentStep.content.audioSlug,
                      soundEnabled,
                      0.9
                    )
                  }
                  className="min-h-[44px] px-4 rounded-2xl bg-brand-blue text-white font-semibold text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>{t('lesson.playAudioBtn')}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    speakRussian(
                      currentStep.content.audioText || currentStep.content.correctAnswer,
                      currentStep.content.audioSlug,
                      soundEnabled,
                      0.6
                    )
                  }
                  className="min-h-[44px] px-3 rounded-2xl border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Gauge className="w-3.5 h-3.5 text-accent-orange" />
                  <span>{t('lesson.slowAudioBtn')}</span>
                </button>
              </div>
            </div>

            {currentStep.type === 'translation_typing' && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <div className="text-lg font-display font-bold text-slate-900 dark:text-white">
                  {currentStep.content.promptText?.[lang] || currentStep.content.translation?.[lang]}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <input
                type="text"
                dir="ltr"
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCheckTypedAnswer();
                }}
                placeholder={t('lesson.typeRussianPlaceholder')}
                className="w-full min-h-[54px] px-4 py-3 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-display font-bold text-lg text-slate-900 dark:text-white focus:border-brand-blue outline-none"
              />

              {wordDiff && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-xs font-semibold text-slate-500 mb-1.5">
                    {t('lesson.wordDiffLabel')}:
                  </div>
                  <div className="flex items-center gap-2 flex-wrap" dir="ltr">
                    {wordDiff.map((seg, i) => (
                      <span
                        key={i}
                        className={`px-2.5 py-1 rounded-lg font-display font-bold text-sm ${
                          seg.status === 'match'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : seg.status === 'missing'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 underline decoration-dotted'
                            : 'bg-red-100 text-error dark:bg-red-950/60 line-through'
                        }`}
                      >
                        {seg.word}
                        {seg.status === 'wrong' && seg.expected ? ` → ${seg.expected}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <CyrillicKeyboard
              showSpaceBar
              onKeyPress={(ch) => setTypedInput((prev) => prev + ch)}
              onBackspace={() => setTypedInput((prev) => prev.slice(0, -1))}
              onClear={() => setTypedInput('')}
            />

            <button
              type="button"
              disabled={!typedInput.trim() || feedbackState === 'correct'}
              onClick={handleCheckTypedAnswer}
              className="w-full min-h-[52px] rounded-2xl bg-accent-orange text-brand-navy font-display font-extrabold text-base shadow-md disabled:opacity-45 cursor-pointer"
            >
              {t('lesson.checkAnswerBtn')}
            </button>
          </div>
        )}

        {/* 8) EXERCISE TYPE 7: MATCHING PAIRS */}
        {currentStep.type === 'matching_pairs' && (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-6">
            <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-white">
              {t('lesson.exMatchingPairsPrompt')}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                {(currentStep.content.pairs || []).map((pair) => {
                  const isMatched = matchedPairIds.includes(pair.id);
                  const isSelected = selectedLeftPairId === pair.id;
                  return (
                    <button
                      key={`left-${pair.id}`}
                      type="button"
                      disabled={isMatched}
                      onClick={() =>
                        handlePairSelect(
                          'left',
                          pair.id,
                          pair.russianWithStress || pair.russian
                        )
                      }
                      className={`w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 font-display font-bold text-base sm:text-lg transition cursor-pointer ${
                        isMatched
                          ? 'border-success bg-emerald-50/60 dark:bg-emerald-950/30 text-success opacity-55 cursor-default'
                          : isSelected && wrongPairFlash
                          ? 'border-error bg-red-50 text-error animate-shake'
                          : isSelected
                          ? 'border-brand-blue bg-blue-50 dark:bg-slate-800 text-brand-blue dark:text-accent-orange'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand-blue'
                      }`}
                    >
                      {pair.russianWithStress || pair.russian}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3">
                {[...(currentStep.content.pairs || [])]
                  .slice()
                  .reverse()
                  .map((pair) => {
                    const isMatched = matchedPairIds.includes(pair.id);
                    const isSelected = selectedRightPairId === pair.id;
                    return (
                      <button
                        key={`right-${pair.id}`}
                        type="button"
                        disabled={isMatched}
                        onClick={() => handlePairSelect('right', pair.id)}
                        className={`w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 font-display font-semibold text-sm sm:text-base transition cursor-pointer ${
                          isMatched
                            ? 'border-success bg-emerald-50/60 dark:bg-emerald-950/30 text-success opacity-55 cursor-default'
                            : isSelected && wrongPairFlash
                            ? 'border-error bg-red-50 text-error animate-shake'
                            : isSelected
                            ? 'border-brand-blue bg-blue-50 dark:bg-slate-800 text-brand-blue dark:text-accent-orange'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand-blue'
                        }`}
                      >
                        {(pair.translation || pair.translations)?.[lang]}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* 9) EXERCISE TYPE 8 & 10: FILL-IN-THE-BLANK & CASE DECLENSION DRILL */}
        {(currentStep.type === 'fill_blank' || currentStep.type === 'case_declension') && (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                {currentStep.content.requiredCase && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-accent-orange text-xs font-display font-bold mb-2">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{currentStep.content.requiredCase.toUpperCase()} CASE</span>
                  </span>
                )}
                <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-white">
                  {currentStep.type === 'case_declension'
                    ? t('lesson.exCaseDeclensionPrompt')
                    : t('lesson.exFillBlankPrompt')}
                </h2>
              </div>

              {currentStep.content.audioText && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      speakRussian(
                        currentStep.content.audioText!,
                        currentStep.content.audioSlug,
                        soundEnabled,
                        0.9
                      )
                    }
                    className="min-h-[44px] px-3.5 rounded-2xl bg-brand-blue text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>{t('lesson.playAudioBtn')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      speakRussian(
                        currentStep.content.audioText!,
                        currentStep.content.audioSlug,
                        soundEnabled,
                        0.6
                      )
                    }
                    className="min-h-[44px] px-3 rounded-2xl border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Gauge className="w-3.5 h-3.5 text-accent-orange" />
                    <span>{t('lesson.slowAudioBtn')}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="text-2xl font-display font-extrabold text-slate-900 dark:text-white" dir="ltr">
                {fullBlankSentence || currentStep.content.prepositionContext}
              </div>
              {currentStep.content.baseNounWithStress && (
                <div className="text-xs font-mono font-bold text-brand-blue dark:text-accent-orange">
                  Base noun: {currentStep.content.baseNounWithStress}
                </div>
              )}
              {currentStep.content.translation && (
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {currentStep.content.translation[lang]}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {(currentStep.content.options || []).map((opt) => {
                const isSelected = selectedOption === opt;
                const isCorrect = opt === currentStep.content.correctAnswer;
                let borderStyle =
                  'border-slate-200 dark:border-slate-700 hover:border-brand-blue dark:hover:border-accent-orange bg-white dark:bg-slate-800';
                if (isSelected && feedbackState === 'correct' && isCorrect) {
                  borderStyle = 'border-success bg-emerald-50 dark:bg-emerald-950/60 text-success';
                } else if (isSelected && feedbackState === 'wrong' && !isCorrect) {
                  borderStyle = 'border-error bg-red-50 dark:bg-red-950/60 text-error animate-shake';
                }

                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectOption(opt)}
                    className={`min-h-[60px] px-5 py-3 rounded-2xl border-2 font-display font-bold text-xl flex items-center justify-between transition cursor-pointer ${borderStyle}`}
                  >
                    <span>{opt}</span>
                    {isSelected && feedbackState === 'correct' && (
                      <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 10) EXERCISE TYPE 9: STRESS PLACEMENT (Ударение) */}
        {currentStep.type === 'stress_placement' && (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-white">
                {t('lesson.exStressPlacementPrompt')}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    speakRussian(
                      currentStep.content.targetWordWithStress || currentStep.content.correctAnswer,
                      currentStep.content.audioSlug,
                      soundEnabled,
                      0.9
                    )
                  }
                  className="min-h-[44px] px-4 rounded-2xl bg-brand-blue text-white font-semibold text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>{t('lesson.playAudioBtn')}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    speakRussian(
                      currentStep.content.targetWordWithStress || currentStep.content.correctAnswer,
                      currentStep.content.audioSlug,
                      soundEnabled,
                      0.6
                    )
                  }
                  className="min-h-[44px] px-3 rounded-2xl border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Gauge className="w-3.5 h-3.5 text-accent-orange" />
                  <span>{t('lesson.slowAudioBtn')}</span>
                </button>
              </div>
            </div>

            {currentStep.content.translation && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {currentStep.content.translation[lang]}
                </span>
              </div>
            )}

            <div className="py-6 flex items-center justify-center gap-2 flex-wrap" dir="ltr">
              {(() => {
                const info = extractVowelsAndStress(
                  currentStep.content.targetWordWithStress || currentStep.content.correctAnswer
                );

                return info.cleanWord.split('').map((ch, idx) => {
                  const vowelSlot = info.vowels.find((v) => v.charIndex === idx);
                  const isSelected = selectedCharIndex === idx;

                  if (!vowelSlot) {
                    return (
                      <span
                        key={idx}
                        className="min-h-[60px] min-w-[44px] px-2 flex items-center justify-center font-display font-extrabold text-3xl text-slate-500 dark:text-slate-400 select-none"
                      >
                        {ch}
                      </span>
                    );
                  }

                  let btnStyle =
                    'border-brand-blue/40 bg-blue-50/70 dark:bg-slate-800 text-brand-blue dark:text-accent-orange hover:border-brand-blue';
                  if (isSelected && feedbackState === 'correct') {
                    btnStyle = 'border-success bg-emerald-500 text-white';
                  } else if (isSelected && feedbackState === 'wrong') {
                    btnStyle = 'border-error bg-red-500 text-white animate-shake';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleStressVowelTap(vowelSlot.vowelIndex, idx)}
                      className={`min-h-[64px] min-w-[54px] px-3 rounded-2xl border-2 font-display font-extrabold text-3xl flex flex-col items-center justify-center transition cursor-pointer shadow-xs ${btnStyle}`}
                    >
                      <span className="text-xs leading-none">́</span>
                      <span>{ch}</span>
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </main>

      {feedbackState !== 'none' && (
        <div
          role="region"
          aria-live="polite"
          className={`fixed bottom-0 inset-x-0 z-40 rounded-t-3xl border-t-2 p-4 sm:p-6 shadow-2xl transition-transform ${
            feedbackState === 'correct'
              ? 'bg-emerald-50 dark:bg-slate-900 border-success'
              : 'bg-red-50 dark:bg-slate-900 border-error'
          }`}
        >
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <MishaMascot
                expression={feedbackState === 'correct' ? 'happy' : 'sad'}
                size={76}
              />
              <div>
                <h3
                  className={`text-lg font-display font-extrabold ${
                    feedbackState === 'correct'
                      ? 'text-emerald-800 dark:text-emerald-400'
                      : 'text-error'
                  }`}
                >
                  {feedbackState === 'correct'
                    ? t('lesson.feedbackCorrectTitle')
                    : t('lesson.feedbackWrongTitle')}
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">
                  {feedbackState === 'correct'
                    ? currentStep.content.caseExplanation?.[lang] || t('lesson.feedbackCorrectBody')
                    : `${t('lesson.feedbackWrongBody')} ${currentStep.content.correctAnswer}`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAdvanceStep}
              className={`w-full sm:w-auto min-h-[50px] px-8 py-3 rounded-2xl font-display font-extrabold text-base text-white shadow-md cursor-pointer whitespace-nowrap ${
                feedbackState === 'correct' ? 'bg-success' : 'bg-brand-blue'
              }`}
            >
              {t('common.continue')}
            </button>
          </div>
        </div>
      )}

      {showExitConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center space-y-4 shadow-2xl">
            <div className="flex justify-center">
              <MishaMascot expression="sad" size={96} />
            </div>
            <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white">
              {t('lesson.exitConfirmTitle')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t('lesson.exitConfirmBody')}
            </p>
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="w-full min-h-[48px] rounded-2xl bg-accent-orange text-brand-navy font-display font-bold text-sm cursor-pointer"
              >
                {t('lesson.exitStay')}
              </button>
              <button
                type="button"
                onClick={onExitToMap}
                className="w-full min-h-[48px] rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm cursor-pointer"
              >
                {t('lesson.exitLeave')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MADINGO — SPEAKING PRACTICE VIEW ("Repeat-After-Me")
// Practice screen for the 30 Phase 3 speaking clips (SPEAKING_CLIPS from
// src/data/phase3Seed.ts — the same source server.ts and the content
// validator use; content/speaking_clips.json is its generated mirror).
//
// Flow per clip: Listen (audioService TTS, Normal 0.9x / Slow 0.6x — the same
// rates LessonPlayer uses) -> Record (browser Web Speech API, ru-RU, local
// only — no server calls, no API keys) -> Score (phase3Engine
// scoreSpeechAttempt: DTW word alignment, per-word feedback, overall %).
//
// Attempts are persisted locally in localStorage under
// 'madingo_speaking_attempts' (best score per clip). Nothing is sent to a
// server; onSaveAttempt lets the parent store the result in its own state.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Gauge,
  Lightbulb,
  Mic,
  RotateCcw,
  Square,
  Star,
  Trophy,
  Volume2,
  X,
} from 'lucide-react';
import { SPEAKING_CLIPS, SpeakingClip } from '../data/phase3Seed';
import { useI18n } from '../lib/i18n';
import { playSoundEffect, speakRussian } from '../lib/audio';
import {
  AlignedWordResult,
  scoreSpeechAttempt,
  SpeechScoreBreakdown,
  WordAlignmentStatus,
} from '../lib/phase3Engine';
import {
  isSpeechRecognitionSupported,
  LocalizedMessage,
  SpeechRecognitionHandle,
  startSpeechRecognition,
} from '../lib/speechRecognition';

export const SPEAKING_ATTEMPTS_STORAGE_KEY = 'madingo_speaking_attempts';

export interface SpeakingPracticeResult {
  clipId: string;
  scorePct: number;
  transcript: string;
  targetText: string;
}

export interface SpeakingPracticeViewProps {
  soundEnabled: boolean;
  onExit: () => void;
  onSaveAttempt?: (result: SpeakingPracticeResult) => void;
}

type LevelFilter = 'all' | 'A1' | 'A2';
type MicState = 'idle' | 'listening' | 'scoring';

interface StoredAttempt {
  bestScorePct: number;
  attempts: number;
  lastTranscript: string;
  lastAt: string;
}

type StoredAttempts = Record<string, StoredAttempt>;

// --- UI strings in the 4 app languages (no new messages/*.json keys) --------
interface SpeakingStrings {
  title: string;
  subtitle: string;
  listen: string;
  normal: string;
  slow: string;
  record: string;
  stop: string;
  tapMicHint: string;
  listening: string;
  listeningHint: string;
  unsupported: string;
  yourSpeech: string;
  tryAgain: string;
  nextClip: string;
  prevClip: string;
  best: string;
  attemptsLabel: string;
  scoreTitle: string;
  accuracy: string;
  completeness: string;
  fluency: string;
  pronunciation: string;
  tipLabel: string;
  wordsLabel: string;
  correct: string;
  close: string;
  mispronounced: string;
  missing: string;
  notSpoken: string;
  encouragement3: string;
  encouragement2: string;
  encouragement1: string;
  encouragement0: string;
  allLevels: string;
  clipOf: string;
  topicLabel: string;
  grammarLabel: string;
  registerLabel: string;
  formal: string;
  colloquial: string;
  durationLabel: string;
  sec: string;
  noClips: string;
  fuelEarned: string;
}

const STRINGS: Record<string, SpeakingStrings> = {
  en: {
    title: 'Speaking Practice',
    subtitle: 'Listen, repeat after Misha, and get your pronunciation score.',
    listen: 'Listen',
    normal: 'Normal',
    slow: 'Slow',
    record: 'Record',
    stop: 'Stop',
    tapMicHint: 'Tap the microphone and say the phrase in Russian.',
    listening: 'Listening…',
    listeningHint: 'Speak now — say the whole phrase clearly.',
    unsupported:
      'Speech recognition is not supported in this browser — try Chrome.',
    yourSpeech: 'What you said',
    tryAgain: 'Try again',
    nextClip: 'Next clip',
    prevClip: 'Previous',
    best: 'Best',
    attemptsLabel: 'attempts',
    scoreTitle: 'Your score',
    accuracy: 'Accuracy',
    completeness: 'Completeness',
    fluency: 'Fluency',
    pronunciation: 'Pronunciation',
    tipLabel: 'Tip',
    wordsLabel: 'Word by word',
    correct: 'Correct',
    close: 'Almost',
    mispronounced: 'Check this word',
    missing: 'Missing',
    notSpoken: 'not spoken',
    encouragement3: 'Excellent! Your pronunciation sounds natural. ⭐',
    encouragement2: 'Great job! A little more practice and it will be perfect.',
    encouragement1: 'Good start! Listen again and repeat slowly.',
    encouragement0: 'Keep going — listen to the model and try once more.',
    allLevels: 'All levels',
    clipOf: 'Clip',
    topicLabel: 'Topic',
    grammarLabel: 'Grammar',
    registerLabel: 'Style',
    formal: 'Formal',
    colloquial: 'Colloquial',
    durationLabel: 'Model audio',
    sec: 'sec',
    noClips: 'No clips for this level yet.',
    fuelEarned: 'Fuel earned',
  },
  ru: {
    title: 'Практика речи',
    subtitle: 'Послушайте, повторите за Мишей и получите оценку произношения.',
    listen: 'Послушать',
    normal: 'Обычно',
    slow: 'Медленно',
    record: 'Записать',
    stop: 'Стоп',
    tapMicHint: 'Нажмите на микрофон и произнесите фразу по-русски.',
    listening: 'Слушаю…',
    listeningHint: 'Говорите — произнесите всю фразу чётко.',
    unsupported:
      'Распознавание речи не поддерживается в этом браузере — попробуйте Chrome.',
    yourSpeech: 'Что вы сказали',
    tryAgain: 'Ещё раз',
    nextClip: 'Следующий клип',
    prevClip: 'Назад',
    best: 'Лучший',
    attemptsLabel: 'попыток',
    scoreTitle: 'Ваша оценка',
    accuracy: 'Точность',
    completeness: 'Полнота',
    fluency: 'Беглость',
    pronunciation: 'Произношение',
    tipLabel: 'Совет',
    wordsLabel: 'По словам',
    correct: 'Верно',
    close: 'Почти',
    mispronounced: 'Проверьте слово',
    missing: 'Пропущено',
    notSpoken: 'не сказано',
    encouragement3: 'Отлично! Ваше произношение звучит естественно. ⭐',
    encouragement2: 'Хорошая работа! Ещё немного практики — и будет идеально.',
    encouragement1: 'Хорошее начало! Послушайте ещё раз и повторите медленно.',
    encouragement0: 'Продолжайте — послушайте образец и попробуйте ещё раз.',
    allLevels: 'Все уровни',
    clipOf: 'Клип',
    topicLabel: 'Тема',
    grammarLabel: 'Грамматика',
    registerLabel: 'Стиль',
    formal: 'Формальный',
    colloquial: 'Разговорный',
    durationLabel: 'Образец аудио',
    sec: 'сек',
    noClips: 'Для этого уровня пока нет клипов.',
    fuelEarned: 'Топливо получено',
  },
  ar: {
    title: 'تدرّب على الكلام',
    subtitle: 'استمع، وكرّر بعد ميشا، واحصل على تقييم نطقك.',
    listen: 'استمع',
    normal: 'عادي',
    slow: 'بطيء',
    record: 'سجّل',
    stop: 'إيقاف',
    tapMicHint: 'اضغط على الميكروفون وانطق العبارة بالروسية.',
    listening: 'أستمع…',
    listeningHint: 'تحدث الآن — انطق العبارة كاملة بوضوح.',
    unsupported:
      'التعرف على الكلام غير مدعوم في هذا المتصفح — جرّب متصفح Chrome.',
    yourSpeech: 'ما قلته',
    tryAgain: 'حاول مرة أخرى',
    nextClip: 'المقطع التالي',
    prevClip: 'السابق',
    best: 'الأفضل',
    attemptsLabel: 'محاولات',
    scoreTitle: 'نتيجتك',
    accuracy: 'الدقة',
    completeness: 'الاكتمال',
    fluency: 'الطلاقة',
    pronunciation: 'النطق',
    tipLabel: 'نصيحة',
    wordsLabel: 'كلمة بكلمة',
    correct: 'صحيح',
    close: 'قريب',
    mispronounced: 'راجع هذه الكلمة',
    missing: 'مفقود',
    notSpoken: 'لم تُنطق',
    encouragement3: 'ممتاز! نطقك يبدو طبيعياً. ⭐',
    encouragement2: 'عمل رائع! مزيد من التدريب وستصل للكمال.',
    encouragement1: 'بداية جيدة! استمع مرة أخرى وكرر ببطء.',
    encouragement0: 'واصل — استمع للنموذج وحاول مرة أخرى.',
    allLevels: 'كل المستويات',
    clipOf: 'مقطع',
    topicLabel: 'الموضوع',
    grammarLabel: 'القواعد',
    registerLabel: 'الأسلوب',
    formal: 'رسمي',
    colloquial: 'عامي',
    durationLabel: 'صوت النموذج',
    sec: 'ث',
    noClips: 'لا توجد مقاطع لهذا المستوى بعد.',
    fuelEarned: 'الوقود المكتسب',
  },
  fr: {
    title: 'Pratique orale',
    subtitle: 'Écoutez, répétez après Misha et obtenez votre score de prononciation.',
    listen: 'Écouter',
    normal: 'Normal',
    slow: 'Lent',
    record: 'Enregistrer',
    stop: 'Arrêter',
    tapMicHint: 'Touchez le microphone et dites la phrase en russe.',
    listening: 'J’écoute…',
    listeningHint: 'Parlez — dites toute la phrase clairement.',
    unsupported:
      'La reconnaissance vocale n’est pas prise en charge par ce navigateur — essayez Chrome.',
    yourSpeech: 'Ce que vous avez dit',
    tryAgain: 'Réessayer',
    nextClip: 'Clip suivant',
    prevClip: 'Précédent',
    best: 'Meilleur',
    attemptsLabel: 'essais',
    scoreTitle: 'Votre score',
    accuracy: 'Précision',
    completeness: 'Complétude',
    fluency: 'Fluidité',
    pronunciation: 'Prononciation',
    tipLabel: 'Conseil',
    wordsLabel: 'Mot à mot',
    correct: 'Correct',
    close: 'Presque',
    mispronounced: 'Vérifiez ce mot',
    missing: 'Manquant',
    notSpoken: 'non dit',
    encouragement3: 'Excellent ! Votre prononciation sonne naturelle. ⭐',
    encouragement2: 'Beau travail ! Encore un peu de pratique et ce sera parfait.',
    encouragement1: 'Bon début ! Réécoutez et répétez lentement.',
    encouragement0: 'Continuez — écoutez le modèle et réessayez.',
    allLevels: 'Tous les niveaux',
    clipOf: 'Clip',
    topicLabel: 'Sujet',
    grammarLabel: 'Grammaire',
    registerLabel: 'Registre',
    formal: 'Formel',
    colloquial: 'Familier',
    durationLabel: 'Audio modèle',
    sec: 's',
    noClips: 'Aucun clip pour ce niveau pour le moment.',
    fuelEarned: 'Carburant gagné',
  },
};

function loadStoredAttempts(): StoredAttempts {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(SPEAKING_ATTEMPTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as StoredAttempts;
    }
    return {};
  } catch {
    return {};
  }
}

const WORD_STATUS_STYLE: Record<WordAlignmentStatus, string> = {
  correct:
    'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700',
  close:
    'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700',
  mispronounced:
    'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700',
  missing:
    'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-dashed border-slate-300 dark:border-slate-600 line-through',
  extra:
    'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600',
};

function wordStatusLabel(status: WordAlignmentStatus, s: SpeakingStrings): string {
  switch (status) {
    case 'correct':
      return s.correct;
    case 'close':
      return s.close;
    case 'mispronounced':
      return s.mispronounced;
    case 'missing':
      return s.missing;
    default:
      return status;
  }
}

export const SpeakingPracticeView: React.FC<SpeakingPracticeViewProps> = ({
  soundEnabled,
  onExit,
  onSaveAttempt,
}) => {
  const { lang } = useI18n();
  const uiLang = (['ru', 'en', 'ar', 'fr'] as const).includes(
    lang as 'ru' | 'en' | 'ar' | 'fr'
  )
    ? lang
    : 'en';
  const s = STRINGS[uiLang] ?? STRINGS.en;
  const supported = isSpeechRecognitionSupported();

  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [clipIndex, setClipIndex] = useState(0);
  const [slow, setSlow] = useState(false);
  const [micState, setMicState] = useState<MicState>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [recognitionError, setRecognitionError] = useState<LocalizedMessage | null>(null);
  const [score, setScore] = useState<SpeechScoreBreakdown | null>(null);
  const [storedAttempts, setStoredAttempts] = useState<StoredAttempts>(() =>
    loadStoredAttempts()
  );

  const recognitionRef = useRef<SpeechRecognitionHandle | null>(null);
  const recordingStartedAtRef = useRef(0);
  const attemptIdRef = useRef(0);
  const scoredAttemptRef = useRef(0);

  const filteredClips = useMemo<SpeakingClip[]>(() => {
    if (levelFilter === 'all') return SPEAKING_CLIPS;
    return SPEAKING_CLIPS.filter((c) => c.level === levelFilter);
  }, [levelFilter]);

  const safeIndex = Math.min(clipIndex, Math.max(0, filteredClips.length - 1));
  const clip = filteredClips[safeIndex];
  const bestForClip = clip ? storedAttempts[clip.id] : undefined;

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  // Reset per-clip state when the clip changes; stop any live recording.
  useEffect(() => {
    stopRecognition();
    setMicState('idle');
    setInterimTranscript('');
    setFinalTranscript('');
    setRecognitionError(null);
    setScore(null);
  }, [clip?.id, stopRecognition]);

  // Never leave the microphone open after unmount.
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  const persistAttempt = useCallback(
    (clipId: string, scorePct: number, transcript: string) => {
      setStoredAttempts((prev) => {
        const prevEntry = prev[clipId];
        const next: StoredAttempts = {
          ...prev,
          [clipId]: {
            bestScorePct: Math.max(prevEntry?.bestScorePct ?? 0, scorePct),
            attempts: (prevEntry?.attempts ?? 0) + 1,
            lastTranscript: transcript,
            lastAt: new Date().toISOString(),
          },
        };
        try {
          window.localStorage.setItem(
            SPEAKING_ATTEMPTS_STORAGE_KEY,
            JSON.stringify(next)
          );
        } catch {
          // Storage full / unavailable (private mode): best scores just
          // won't persist; the attempt itself is still scored and shown.
        }
        return next;
      });
    },
    []
  );

  const handleFinalTranscript = useCallback(
    (transcript: string, targetClip: SpeakingClip) => {
      const attemptId = attemptIdRef.current;
      if (scoredAttemptRef.current === attemptId) return;
      scoredAttemptRef.current = attemptId;
      const actualDurationSec = Math.max(
        0.5,
        (Date.now() - recordingStartedAtRef.current) / 1000
      );
      const breakdown = scoreSpeechAttempt({
        targetText: targetClip.russianSubtitle,
        transcriptText: transcript,
        targetDurationSec: targetClip.durationSec,
        actualDurationSec,
      });
      setScore(breakdown);
      setMicState('idle');
      persistAttempt(targetClip.id, breakdown.overall, transcript);
      playSoundEffect(
        breakdown.stars >= 2 ? 'correct' : 'complete',
        soundEnabled
      );
      onSaveAttempt?.({
        clipId: targetClip.id,
        scorePct: breakdown.overall,
        transcript,
        targetText: targetClip.russianSubtitle,
      });
    },
    [persistAttempt, soundEnabled, onSaveAttempt]
  );

  const handleRecordToggle = () => {
    if (micState === 'listening') {
      stopRecognition();
      setMicState('idle');
      return;
    }
    if (!clip || !supported) return;
    setRecognitionError(null);
    setScore(null);
    setInterimTranscript('');
    setFinalTranscript('');
    setMicState('listening');
    playSoundEffect('tap', soundEnabled);
    attemptIdRef.current += 1;
    recordingStartedAtRef.current = Date.now();
    const targetClip = clip;
    try {
      recognitionRef.current = startSpeechRecognition({
        onResult: (interim, final) => {
          setInterimTranscript(interim);
          if (final.trim().length > 0) {
            setFinalTranscript(final);
            handleFinalTranscript(final, targetClip);
          }
        },
        onError: (code, message) => {
          // 'aborted' happens on a deliberate stop — not a user-facing error.
          if (code !== 'aborted') {
            setRecognitionError(message);
          }
          setMicState('idle');
        },
        onEnd: () => {
          recognitionRef.current = null;
          setMicState((prev) => (prev === 'listening' ? 'idle' : prev));
          setInterimTranscript('');
        },
      });
    } catch {
      setMicState('idle');
      setRecognitionError({
        ru: 'Распознавание речи недоступно в этом браузере. Попробуйте Chrome.',
        en: 'Speech recognition is not available in this browser. Try Chrome.',
        ar: 'التعرف على الكلام غير متاح في هذا المتصفح. جرّب متصفح Chrome.',
        fr: 'La reconnaissance vocale n’est pas disponible dans ce navigateur. Essayez Chrome.',
      });
    }
  };

  const handleListen = () => {
    if (!clip) return;
    playSoundEffect('tap', soundEnabled);
    void speakRussian(
      clip.russianSubtitle,
      undefined,
      soundEnabled,
      slow ? 0.6 : 0.9
    );
  };

  const goToClip = (nextIndex: number) => {
    stopRecognition();
    setClipIndex(
      (nextIndex + filteredClips.length) % Math.max(1, filteredClips.length)
    );
  };

  const handleFilterChange = (filter: LevelFilter) => {
    stopRecognition();
    setLevelFilter(filter);
    setClipIndex(0);
  };

  const encouragement =
    score == null
      ? null
      : score.stars >= 3
        ? s.encouragement3
        : score.stars === 2
          ? s.encouragement2
          : score.stars === 1
            ? s.encouragement1
            : s.encouragement0;

  const progressFraction =
    filteredClips.length > 0 ? (safeIndex + 1) / filteredClips.length : 0;

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] p-4 sm:p-8">
      <div className="mx-auto w-full max-w-lg space-y-4">
        {/* Header — same pattern as LessonPlayer / TypingLab headers */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onExit}
            aria-label="Exit speaking practice"
            className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-display font-extrabold text-slate-900 dark:text-white">
              {s.title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{s.subtitle}</p>
          </div>
          <div className="w-10 h-10" aria-hidden="true" />
        </div>

        {/* Level filter + progress */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-md space-y-3">
          <div className="flex items-center gap-2">
            {(['all', 'A1', 'A2'] as LevelFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => handleFilterChange(f)}
                className={
                  levelFilter === f
                    ? 'min-h-[40px] px-4 rounded-2xl bg-brand-blue text-white text-sm font-semibold shadow-xs transition cursor-pointer'
                    : 'min-h-[40px] px-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-brand-blue transition cursor-pointer'
                }
              >
                {f === 'all' ? s.allLevels : f}
              </button>
            ))}
            <span className="ml-auto text-xs font-semibold text-slate-500 dark:text-slate-400">
              {s.clipOf} {filteredClips.length > 0 ? safeIndex + 1 : 0}/
              {filteredClips.length}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-blue transition-all"
              style={{ width: `${Math.round(progressFraction * 100)}%` }}
            />
          </div>
        </div>

        {!clip ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-md text-center text-sm text-slate-500 dark:text-slate-400">
            {s.noClips}
          </div>
        ) : (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-6">
            {/* Clip title + badges */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-brand-blue text-white text-xs font-bold">
                  {clip.level}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-xs font-semibold text-brand-blue dark:text-white">
                  {s.topicLabel}: {clip.topic}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {clip.register === 'formal' ? s.formal : s.colloquial}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {s.durationLabel}: {clip.durationSec} {s.sec}
                </span>
                {bestForClip && (
                  <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-xs font-bold">
                    <Trophy className="w-3.5 h-3.5" />
                    {s.best}: {bestForClip.bestScorePct}%
                    {bestForClip.attempts > 1
                      ? ` · ${bestForClip.attempts} ${s.attemptsLabel}`
                      : ''}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-display font-extrabold text-slate-900 dark:text-white leading-snug">
                {clip.title[uiLang] ?? clip.title.en}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {s.grammarLabel}: {clip.grammarPoint}
              </p>
            </div>

            {/* Target phrase */}
            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-slate-800 border border-blue-200/70 dark:border-slate-700 text-center space-y-1">
              <div className="text-xl font-display font-extrabold text-brand-blue dark:text-white leading-relaxed">
                {clip.russianSubtitle}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300">
                {clip.translations[uiLang] ?? clip.translations.en}
              </div>
            </div>

            {/* Listen + speed toggle — same 0.9 / 0.6 pattern as LessonPlayer */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleListen}
                className="flex-1 min-h-[54px] px-4 rounded-2xl bg-brand-blue text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition cursor-pointer"
              >
                <Volume2 className="w-5 h-5" />
                <span>{s.listen}</span>
              </button>
              <div className="flex rounded-2xl border border-slate-300 dark:border-slate-700 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSlow(false)}
                  className={
                    !slow
                      ? 'min-h-[54px] px-3 text-xs font-bold bg-brand-blue text-white transition cursor-pointer'
                      : 'min-h-[54px] px-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer'
                  }
                >
                  {s.normal}
                </button>
                <button
                  type="button"
                  onClick={() => setSlow(true)}
                  aria-label="Slow playback"
                  className={
                    slow
                      ? 'min-h-[54px] px-3 text-xs font-bold bg-brand-blue text-white flex items-center gap-1 transition cursor-pointer'
                      : 'min-h-[54px] px-3 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer'
                  }
                >
                  <Gauge className="w-3.5 h-3.5 text-accent-orange" />
                  {s.slow}
                </button>
              </div>
            </div>

            {/* Record */}
            {!supported ? (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {s.unsupported}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={handleRecordToggle}
                  aria-label={micState === 'listening' ? s.stop : s.record}
                  className={
                    micState === 'listening'
                      ? 'w-20 h-20 rounded-full bg-red-500 text-white shadow-lg flex items-center justify-center gap-1 animate-pulse hover:scale-105 active:scale-95 transition cursor-pointer'
                      : 'w-20 h-20 rounded-full bg-accent-orange text-brand-navy shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition cursor-pointer'
                  }
                >
                  {micState === 'listening' ? (
                    <Square className="w-8 h-8" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </button>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {micState === 'listening' ? s.listening : s.record}
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  {micState === 'listening' ? s.listeningHint : s.tapMicHint}
                </p>
                {interimTranscript && (
                  <div className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center text-sm text-slate-600 dark:text-slate-300 italic">
                    {interimTranscript}…
                  </div>
                )}
              </div>
            )}

            {recognitionError && (
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  {recognitionError[uiLang] ?? recognitionError.en}
                </p>
              </div>
            )}

            {/* Transcript + score */}
            {finalTranscript && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {s.yourSpeech}
                </div>
                <div className="text-base font-semibold text-slate-900 dark:text-white">
                  {finalTranscript}
                </div>
              </div>
            )}

            {score && (
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-1">
                    {[1, 2, 3].map((star) => (
                      <Star
                        key={star}
                        className={
                          star <= score.stars
                            ? 'w-7 h-7 text-amber-400 fill-amber-400'
                            : 'w-7 h-7 text-slate-300 dark:text-slate-600'
                        }
                      />
                    ))}
                  </div>
                  <div className="text-4xl font-display font-extrabold text-brand-blue dark:text-white">
                    {score.overall}%
                  </div>
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {s.scoreTitle}
                  </div>
                  {encouragement && (
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {encouragement}
                    </p>
                  )}
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                    {s.fuelEarned}: +{score.fuelEarned}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  {[
                    { label: s.accuracy, value: score.accuracy },
                    { label: s.completeness, value: score.completeness },
                    { label: s.fluency, value: score.fluency },
                    { label: s.pronunciation, value: score.stressPronunciationEstimate },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="p-3 rounded-2xl bg-blue-50/70 dark:bg-slate-800 border border-blue-200/70 dark:border-slate-700"
                    >
                      <div className="text-lg font-display font-extrabold text-slate-900 dark:text-white">
                        {m.value}%
                      </div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {m.label}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {s.wordsLabel}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {score.alignedWords.map((w: AlignedWordResult, idx: number) => (
                      <span
                        key={`${w.targetWord}-${idx}`}
                        title={
                          w.status === 'missing'
                            ? s.notSpoken
                            : w.spokenWord
                              ? `${wordStatusLabel(w.status, s)}: ${w.spokenWord}`
                              : wordStatusLabel(w.status, s)
                        }
                        className={`px-2.5 py-1.5 rounded-xl border text-sm font-semibold ${WORD_STATUS_STYLE[w.status]}`}
                      >
                        {w.targetWord}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-slate-800 border border-blue-200/70 dark:border-slate-700 flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-accent-orange shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    <span className="font-bold">{s.tipLabel}: </span>
                    {score.oneLineTip[uiLang] ?? score.oneLineTip.en}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setScore(null);
                    setFinalTranscript('');
                    setInterimTranscript('');
                  }}
                  className="w-full min-h-[48px] rounded-2xl border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  {s.tryAgain}
                </button>
              </div>
            )}

            {/* Prev / Next */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => goToClip(safeIndex - 1)}
                className="min-h-[54px] px-4 rounded-2xl border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                {s.prevClip}
              </button>
              <button
                type="button"
                onClick={() => goToClip(safeIndex + 1)}
                className="flex-1 min-h-[54px] px-4 rounded-2xl bg-accent-orange text-brand-navy font-display font-extrabold text-base shadow-md hover:brightness-105 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {s.nextClip}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {score && (
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>
                  {s.best}: {bestForClip?.bestScorePct ?? score.overall}% ·{' '}
                  {bestForClip?.attempts ?? 1} {s.attemptsLabel}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

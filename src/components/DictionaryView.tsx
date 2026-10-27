import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Volume2,
  Star,
  Wrench,
  X,
  Gauge,
  History,
  Sparkles,
  ArrowLeftRight,
  Copy,
  Check,
  Mic,
  MicOff,
  Languages,
  Loader2,
  Trash2,
  BookOpen,
  AlertCircle,
} from 'lucide-react';
import {
  CYRILLIC_LETTERS,
  CurriculumLesson,
} from '../data/curriculum';
import { useI18n } from '../lib/i18n';
import { speakRussian, speakText } from '../lib/audio';
import { SupportedLang } from '../lib/phase2Engine';

export interface UserWordRecord {
  wordId: string;
  status: 'learning' | 'known' | 'garage';
  isFavorite: boolean;
}

export interface SavedTranslationRecord {
  id: string;
  sourceText: string;
  sourceLang: SupportedLang;
  targetLang: SupportedLang;
  translations: {
    ru: string;
    ruStressed: string;
    ruTranslit: string;
    en: string;
    ar: string;
    fr: string;
  };
  pos: string;
  cefrLevel: string;
  isFavorite: boolean;
  inGarage: boolean;
  createdAt: string;
}

interface InstantTranslationResponse {
  sourceText: string;
  detectedSourceLang: SupportedLang;
  targetLang: SupportedLang;
  primaryTranslation: string;
  translations: {
    ru: string;
    ruStressed: string;
    ruTranslit: string;
    en: string;
    ar: string;
    fr: string;
  };
  pos: string;
  cefrLevel: string;
  grammarNote: Record<SupportedLang, string>;
  examples: {
    ruStressed: string;
    en: string;
    ar: string;
    fr: string;
  }[];
  alternatives?: {
    pos: string;
    terms: string[];
  }[];
  latencyMs?: number;
  providerUsed: string;
}

const CLIENT_TRANSLATION_CACHE = new Map<string, InstantTranslationResponse>();

interface DictionaryViewProps {
  soundEnabled: boolean;
  userWords?: UserWordRecord[];
  initialQuery?: string;
  onToggleUserWord?: (payload: {
    wordId: string;
    status?: 'learning' | 'known' | 'garage';
    isFavorite?: boolean;
  }) => void;
  onAddWordToGarage?: (russianWord: string, translationPrompt?: string) => void;
  onOpenLessonById?: (lesson: CurriculumLesson) => void;
}

const STORAGE_KEY_TRANSLATION_HISTORY = 'madingo_ai_translator_history_v1';

const LANGUAGE_META: Record<
  SupportedLang,
  {
    code: SupportedLang;
    nativeName: string;
    flag: string;
    dir: 'ltr' | 'rtl';
    speechLang: string;
    labels: Record<SupportedLang, string>;
  }
> = {
  ru: {
    code: 'ru',
    nativeName: 'Русский',
    flag: '🇷🇺',
    dir: 'ltr',
    speechLang: 'ru-RU',
    labels: {
      ru: 'Русский',
      en: 'Russian',
      ar: 'الروسية',
      fr: 'Russe',
    },
  },
  ar: {
    code: 'ar',
    nativeName: 'العربية',
    flag: '🇸🇦',
    dir: 'rtl',
    speechLang: 'ar-SA',
    labels: {
      ru: 'Арабский',
      en: 'Arabic',
      ar: 'العربية',
      fr: 'Arabe',
    },
  },
  en: {
    code: 'en',
    nativeName: 'English',
    flag: '🇬🇧',
    dir: 'ltr',
    speechLang: 'en-US',
    labels: {
      ru: 'Английский',
      en: 'English',
      ar: 'الإنجليزية',
      fr: 'Anglais',
    },
  },
  fr: {
    code: 'fr',
    nativeName: 'Français',
    flag: '🇫🇷',
    dir: 'ltr',
    speechLang: 'fr-FR',
    labels: {
      ru: 'Французский',
      en: 'French',
      ar: 'الفرنسية',
      fr: 'Français',
    },
  },
};

const UI_COPY: Record<
  SupportedLang,
  {
    title: string;
    subtitle: string;
    tabTranslator: string;
    tabHistory: string;
    tabLetters: string;
    autoDetect: string;
    detectedBadge: string;
    swapBtn: string;
    sourcePlaceholder: string;
    translateNowBtn: string;
    translatingStatus: string;
    clearBtn: string;
    copyBtn: string;
    copiedBadge: string;
    listenNormal: string;
    listenSlow: string;
    saveToGarage: string;
    savedInGarage: string;
    allFourLangsTitle: string;
    linguisticAnalysisTitle: string;
    examplesTitle: string;
    quickSamplesLabel: string;
    emptyPromptTitle: string;
    emptyPromptSub: string;
    emptyHistoryTitle: string;
    clearHistoryBtn: string;
    voiceInputBtn: string;
    voiceListening: string;
    retryBtn: string;
  }
> = {
  ar: {
    title: 'المترجم الفوري بالذكاء الاصطناعي',
    subtitle:
      'ترجمة فورية احترافية ودقيقة بين الروسية والعربية والإنجليزية والفرنسية مع تشكيل النبر الصوتي (Ударение) والنطق الصحيح',
    tabTranslator: 'المترجم الفوري الذكي',
    tabHistory: 'السجل والمحفوظات',
    tabLetters: 'الأبجدية الروسية (33 حرفاً)',
    autoDetect: 'تعرّف تلقائي على اللغة',
    detectedBadge: 'اللغة المكتشفة',
    swapBtn: 'تبديل اللغتين',
    sourcePlaceholder:
      'اكتب أو الصق أي كلمة أو جملة أو نص بالعربية أو الروسية أو الإنجليزية أو الفرنسية للترجمة الفورية...',
    translateNowBtn: 'ترجم فوراً',
    translatingStatus: 'جاري الترجمة الفورية بالذكاء الاصطناعي...',
    clearBtn: 'مسح النص',
    copyBtn: 'نسخ',
    copiedBadge: 'تم النسخ',
    listenNormal: 'استماع (1x)',
    listenSlow: 'بطيء (0.65x)',
    saveToGarage: '+ أضف للمرآب (مراجعة)',
    savedInGarage: 'مضاف في المرآب',
    allFourLangsTitle: 'الترجمة الفورية بجميع لغات التطبيق الأربع',
    linguisticAnalysisTitle: 'التحليل اللغوي والنحوي الذكي',
    examplesTitle: 'أمثلة سياقية مع النطق الروسي',
    quickSamplesLabel: 'جرّب ترجمة فورية لعبارات جاهزة:',
    emptyPromptTitle: 'ابدأ الكتابة للترجمة الفورية بدون أخطاء',
    emptyPromptSub:
      'يدعم الكلمات المفردة، المصطلحات الهندسية والجامعية، والجمل الكاملة بين العربية والروسية والإنجليزية والفرنسية.',
    emptyHistoryTitle: 'لا توجد ترجمات محفوظة في السجل بعد.',
    clearHistoryBtn: 'مسح السجل',
    voiceInputBtn: 'إدخال صوتي',
    voiceListening: 'جاري الاستماع...',
    retryBtn: 'إعادة المحاولة',
  },
  ru: {
    title: 'Мгновенный ИИ-Переводчик',
    subtitle:
      'Профессиональный синхронный перевод между русским, арабским, английским и французским языками с ударениями и озвучкой',
    tabTranslator: 'ИИ-Переводчик',
    tabHistory: 'История и избранное',
    tabLetters: 'Алфавит (33 буквы)',
    autoDetect: 'Определить язык',
    detectedBadge: 'Определён',
    swapBtn: 'Поменять языки',
    sourcePlaceholder:
      'Введите слово, фразу или предложение на русском, арабском, английском или французском языке...',
    translateNowBtn: 'Перевести',
    translatingStatus: 'Мгновенный ИИ-перевод...',
    clearBtn: 'Очистить',
    copyBtn: 'Копировать',
    copiedBadge: 'Скопировано',
    listenNormal: 'Слушать (1x)',
    listenSlow: 'Медленно (0.65x)',
    saveToGarage: '+ В Гараж (повторение)',
    savedInGarage: 'В Гараже',
    allFourLangsTitle: 'Перевод сразу на все 4 языка приложения',
    linguisticAnalysisTitle: 'Лингвистический и грамматический разбор',
    examplesTitle: 'Контекстные примеры с озвучкой',
    quickSamplesLabel: 'Быстрые примеры для проверки:',
    emptyPromptTitle: 'Введите текст для мгновенного перевода',
    emptyPromptSub:
      'Переводите отдельные слова, инженерные термины МАДИ и полные предложения на 4 языка без ошибок.',
    emptyHistoryTitle: 'История переводов пока пуста.',
    clearHistoryBtn: 'Очистить историю',
    voiceInputBtn: 'Голосовой ввод',
    voiceListening: 'Слушаю...',
    retryBtn: 'Повторить',
  },
  en: {
    title: 'AI Instant Translator',
    subtitle:
      'Professional real-time AI translation across Russian, Arabic, English & French with stress marks, phonetics, and audio',
    tabTranslator: 'AI Instant Translator',
    tabHistory: 'History & Saved',
    tabLetters: 'Cyrillic Alphabet (33)',
    autoDetect: 'Auto-Detect Language',
    detectedBadge: 'Detected',
    swapBtn: 'Swap languages',
    sourcePlaceholder:
      'Type or paste any word, phrase, or sentence in Russian, Arabic, English, or French for instant translation...',
    translateNowBtn: 'Translate Now',
    translatingStatus: 'Translating with AI...',
    clearBtn: 'Clear',
    copyBtn: 'Copy',
    copiedBadge: 'Copied',
    listenNormal: 'Listen (1x)',
    listenSlow: 'Slow (0.65x)',
    saveToGarage: '+ Save to Garage SRS',
    savedInGarage: 'Saved in Garage',
    allFourLangsTitle: 'Simultaneous Translation in All 4 App Languages',
    linguisticAnalysisTitle: 'AI Linguistic & Grammar Notes',
    examplesTitle: 'Contextual Examples with Russian Audio',
    quickSamplesLabel: 'Try instant translation with a sample:',
    emptyPromptTitle: 'Type any word or sentence for instant AI translation',
    emptyPromptSub:
      'Supports single words, university & engineering terms, and full sentences across Russian, Arabic, English, and French.',
    emptyHistoryTitle: 'No saved translations in history yet.',
    clearHistoryBtn: 'Clear History',
    voiceInputBtn: 'Voice Input',
    voiceListening: 'Listening...',
    retryBtn: 'Retry',
  },
  fr: {
    title: 'Traducteur IA Instantané',
    subtitle:
      'Traduction IA professionnelle en temps réel entre le russe, l’arabe, l’anglais et le français avec accents toniques et audio',
    tabTranslator: 'Traducteur IA',
    tabHistory: 'Historique & Favoris',
    tabLetters: 'Alphabet Cyrillique (33)',
    autoDetect: 'Détecter la langue',
    detectedBadge: 'Détecté',
    swapBtn: 'Inverser les langues',
    sourcePlaceholder:
      'Saisissez ou collez un mot, une expression ou une phrase en russe, arabe, anglais ou français...',
    translateNowBtn: 'Traduire',
    translatingStatus: 'Traduction IA en cours...',
    clearBtn: 'Effacer',
    copyBtn: 'Copier',
    copiedBadge: 'Copié',
    listenNormal: 'Écouter (1x)',
    listenSlow: 'Lent (0.65x)',
    saveToGarage: '+ Ajouter au Garage',
    savedInGarage: 'Dans le Garage',
    allFourLangsTitle: 'Traduction simultanée dans les 4 langues',
    linguisticAnalysisTitle: 'Analyse linguistique et grammaticale IA',
    examplesTitle: 'Exemples contextuels avec audio russe',
    quickSamplesLabel: 'Essayer un exemple rapide :',
    emptyPromptTitle: 'Saisissez un texte pour une traduction instantanée',
    emptyPromptSub:
      'Prend en charge les mots, les termes techniques et les phrases complètes en russe, arabe, anglais et français.',
    emptyHistoryTitle: 'Aucune traduction enregistrée pour le moment.',
    clearHistoryBtn: 'Vider l’historique',
    voiceInputBtn: 'Dictée vocale',
    voiceListening: 'Écoute en cours...',
    retryBtn: 'Réessayer',
  },
};

const QUICK_SAMPLES: Record<SupportedLang, string[]> = {
  ar: [
    'مرحباً، أنا طالب جديد في جامعة مادي في موسكو.',
    'كيف أصل إلى محطة المترو والمكتبة الجامعية؟',
    'محرك السيارة الكهربائية يعمل بكفاءة عالية.',
    'أريد تعلم اللغة الروسية بطلاقة.',
  ],
  ru: [
    'Здра́вствуйте, я студе́нт университе́та МАДИ́ в Москве́.',
    'Скажи́те, пожа́луйста, где нахо́дится ста́нция метро́ и библиоте́ка?',
    'Автомоби́льный дви́гатель рабо́тает отли́чно.',
    'Мне о́чень нра́вится изуча́ть ру́сский язы́к.',
  ],
  en: [
    'Hello, I am a new student at MADI University in Moscow.',
    'Excuse me, how do I get to the metro station and the library?',
    'The electric car engine operates with high efficiency.',
    'I would like to practice Russian pronunciation every day.',
  ],
  fr: [
    'Bonjour, je suis un nouvel étudiant à l’université MADI à Moscou.',
    'Excusez-moi, où se trouvent la station de métro et la bibliothèque ?',
    'Le moteur de la voiture électrique fonctionne parfaitement.',
    'J’aime apprendre la langue russe tous les jours.',
  ],
};

function loadSavedHistory(): SavedTranslationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRANSLATION_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistSavedHistory(items: SavedTranslationRecord[]) {
  try {
    localStorage.setItem(
      STORAGE_KEY_TRANSLATION_HISTORY,
      JSON.stringify(items.slice(0, 50))
    );
  } catch {
    // ignore storage quota errors
  }
}

export const DictionaryView: React.FC<DictionaryViewProps> = ({
  soundEnabled,
  initialQuery = '',
  onToggleUserWord,
  onAddWordToGarage,
}) => {
  const { lang } = useI18n();
  const copy = UI_COPY[lang] || UI_COPY.en;

  const [sectionTab, setSectionTab] = useState<'translator' | 'history' | 'letters'>(
    'translator'
  );
  const [sourceLang, setSourceLang] = useState<'auto' | SupportedLang>('auto');
  const [targetLang, setTargetLang] = useState<SupportedLang>(() =>
    lang === 'ru' ? 'ar' : 'ru'
  );
  const [inputText, setInputText] = useState<string>(initialQuery);
  const [result, setResult] = useState<InstantTranslationResponse | null>(null);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedHistory, setSavedHistory] = useState<SavedTranslationRecord[]>(() =>
    loadSavedHistory()
  );
  const [isListeningVoice, setIsListeningVoice] = useState<boolean>(false);

  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      setInputText(initialQuery.trim());
      setSectionTab('translator');
    }
  }, [initialQuery]);

  const inputDir: 'ltr' | 'rtl' = useMemo(() => {
    if (sourceLang === 'ar') return 'rtl';
    if (sourceLang !== 'auto') return 'ltr';
    return /[\u0600-\u06FF]/.test(inputText) ? 'rtl' : 'ltr';
  }, [sourceLang, inputText]);

  const executeTranslation = async (
    textToTranslate: string,
    srcLang: 'auto' | SupportedLang,
    tgtLang: SupportedLang
  ) => {
    const clean = textToTranslate.trim();
    if (!clean) {
      setResult(null);
      setErrorMsg(null);
      setIsTranslating(false);
      return;
    }

    const cacheKey = `${srcLang}|${tgtLang}|${clean.toLowerCase()}`;
    const cached = CLIENT_TRANSLATION_CACHE.get(cacheKey);
    if (cached) {
      if (cached.targetLang && cached.targetLang !== tgtLang) {
        setTargetLang(cached.targetLang);
      }
      setResult({ ...cached, latencyMs: 1 });
      setErrorMsg(null);
      setIsTranslating(false);
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setIsTranslating(true);
    setErrorMsg(null);
    const t0 = performance.now();

    try {
      const response = await fetch('/api/ai/instant-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: clean,
          sourceLang: srcLang,
          targetLang: tgtLang,
        }),
        signal: controller.signal,
      });

      const data: InstantTranslationResponse = await response.json();
      if (!response.ok) {
        throw new Error((data as any).error || 'Instant translation request failed.');
      }

      const clientElapsed = Math.max(1, Math.round(performance.now() - t0));
      const enrichedData: InstantTranslationResponse = {
        ...data,
        latencyMs: data.latencyMs || clientElapsed,
      };

      CLIENT_TRANSLATION_CACHE.set(cacheKey, enrichedData);
      if (data.targetLang && data.targetLang !== tgtLang) {
        setTargetLang(data.targetLang);
      }

      setResult(enrichedData);
      setIsTranslating(false);

      const resolvedTarget = data.targetLang || tgtLang;
      // Save to recent translation history
      const recordId = `tr_${data.detectedSourceLang}_${resolvedTarget}_${clean
        .slice(0, 32)
        .toLowerCase()}`;
      setSavedHistory((prev) => {
        const existing = prev.find((item) => item.id === recordId);
        const nextRecord: SavedTranslationRecord = {
          id: recordId,
          sourceText: clean,
          sourceLang: data.detectedSourceLang,
          targetLang: resolvedTarget,
          translations: data.translations,
          pos: data.pos,
          cefrLevel: data.cefrLevel,
          isFavorite: existing?.isFavorite ?? false,
          inGarage: existing?.inGarage ?? false,
          createdAt: new Date().toISOString(),
        };
        const updated = [nextRecord, ...prev.filter((item) => item.id !== recordId)].slice(
          0,
          40
        );
        persistSavedHistory(updated);
        return updated;
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('[AI Instant Translator Error]:', err);
      setIsTranslating(false);
      setErrorMsg(
        err?.message ||
          (lang === 'ar'
            ? 'تعذّر إتمام الترجمة الفورية. يرجى الضغط على إعادة المحاولة.'
            : 'Instant translation failed. Please click Retry.')
      );
    }
  };

  // Ultra-fast 160ms debounced instant translation as the user types
  useEffect(() => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      setResult(null);
      setErrorMsg(null);
      setIsTranslating(false);
      return;
    }

    const timer = setTimeout(() => {
      executeTranslation(trimmed, sourceLang, targetLang);
    }, 160);

    return () => clearTimeout(timer);
  }, [inputText, sourceLang, targetLang]);

  const handleSwapLanguages = () => {
    const effectiveSource: SupportedLang =
      sourceLang === 'auto'
        ? result?.detectedSourceLang || (lang === 'ru' ? 'ru' : 'ar')
        : sourceLang;

    const nextSource: SupportedLang = targetLang;
    const nextTarget: SupportedLang =
      effectiveSource === targetLang
        ? targetLang === 'ru'
          ? 'ar'
          : 'ru'
        : effectiveSource;

    const currentTargetText = result
      ? targetLang === 'ru'
        ? result.translations.ru
        : result.translations[targetLang]
      : '';

    setSourceLang(nextSource);
    setTargetLang(nextTarget);
    if (currentTargetText) {
      setInputText(currentTargetText);
    }
  };

  const handleCopyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 1800);
    } catch {
      // ignore clipboard error
    }
  };

  const handleToggleVoiceInput = () => {
    if (isListeningVoice && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListeningVoice(false);
      return;
    }

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setErrorMsg(
        lang === 'ar'
          ? 'الإدخال الصوتي غير مدعوم في هذا المتصفح. يمكنك الكتابة مباشرة للترجمة الفورية.'
          : 'Voice dictation is not supported in this browser. Please type directly.'
      );
      return;
    }

    try {
      const rec = new SpeechRec();
      const resolvedLang: SupportedLang =
        sourceLang === 'auto' ? lang : sourceLang;
      rec.lang = LANGUAGE_META[resolvedLang].speechLang;
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setIsListeningVoice(true);
        setErrorMsg(null);
      };
      rec.onresult = (event: any) => {
        const transcript = event?.results?.[0]?.[0]?.transcript || '';
        if (transcript.trim()) {
          setInputText((prev) =>
            prev.trim() ? `${prev.trim()} ${transcript.trim()}` : transcript.trim()
          );
        }
      };
      rec.onerror = () => {
        setIsListeningVoice(false);
      };
      rec.onend = () => {
        setIsListeningVoice(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch {
      setIsListeningVoice(false);
    }
  };

  const handleSaveToGarage = (
    ruStressed: string,
    promptMeaning: string,
    historyId?: string
  ) => {
    onAddWordToGarage?.(ruStressed, promptMeaning);
    onToggleUserWord?.({
      wordId: historyId || `ai_${ruStressed}`,
      status: 'garage',
      isFavorite: true,
    });
    if (historyId) {
      setSavedHistory((prev) => {
        const next = prev.map((item) =>
          item.id === historyId ? { ...item, inGarage: true, isFavorite: true } : item
        );
        persistSavedHistory(next);
        return next;
      });
    }
  };

  const handleToggleFavoriteHistory = (id: string) => {
    setSavedHistory((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      );
      persistSavedHistory(next);
      return next;
    });
  };

  const currentHistoryItem = useMemo(() => {
    if (!result) return null;
    const recordId = `tr_${result.detectedSourceLang}_${targetLang}_${result.sourceText
      .slice(0, 32)
      .toLowerCase()}`;
    return savedHistory.find((h) => h.id === recordId) || null;
  }, [result, targetLang, savedHistory]);

  return (
    <div
      data-testid="ai-instant-translator-view"
      className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-28 space-y-6"
    >
      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue dark:text-accent-orange text-xs font-display font-extrabold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>RU · AR · EN · FR · AI INSTANT TRANSLATOR</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white">
            {copy.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            {copy.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-200/80 dark:bg-slate-800 rounded-2xl self-start">
          <button
            type="button"
            data-testid="translator-tab-main"
            onClick={() => setSectionTab('translator')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              sectionTab === 'translator'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Languages className="w-4 h-4 text-brand-blue dark:text-accent-orange" />
            <span>{copy.tabTranslator}</span>
          </button>

          <button
            type="button"
            data-testid="translator-tab-history"
            onClick={() => setSectionTab('history')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              sectionTab === 'history'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <History className="w-4 h-4" />
            <span>
              {copy.tabHistory} ({savedHistory.length})
            </span>
          </button>

          <button
            type="button"
            data-testid="translator-tab-letters"
            onClick={() => setSectionTab('letters')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              sectionTab === 'letters'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>{copy.tabLetters}</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: AI INSTANT TRANSLATOR (PRIMARY)                                */}
      {/* ===================================================================== */}
      {sectionTab === 'translator' && (
        <div className="space-y-6">
          {/* Language Selector Bar */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Source Language Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                data-testid="source-lang-auto"
                onClick={() => setSourceLang('auto')}
                className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-display font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  sourceLang === 'auto'
                    ? 'bg-brand-blue text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{copy.autoDetect}</span>
                {sourceLang === 'auto' && result?.detectedSourceLang && (
                  <span className="px-1.5 py-0.5 rounded bg-white/20 text-[10px]">
                    {LANGUAGE_META[result.detectedSourceLang].labels[lang]}
                  </span>
                )}
              </button>

              {(['ar', 'ru', 'en', 'fr'] as SupportedLang[]).map((lCode) => {
                const meta = LANGUAGE_META[lCode];
                return (
                  <button
                    key={`src-${lCode}`}
                    type="button"
                    data-testid={`source-lang-${lCode}`}
                    onClick={() => setSourceLang(lCode)}
                    className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-display font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      sourceLang === lCode
                        ? 'bg-brand-blue text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <span>{meta.flag}</span>
                    <span>{meta.labels[lang]}</span>
                  </button>
                );
              })}
            </div>

            {/* Swap Button */}
            <button
              type="button"
              data-testid="swap-languages-btn"
              onClick={handleSwapLanguages}
              title={copy.swapBtn}
              aria-label={copy.swapBtn}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-amber-100 dark:bg-slate-800 text-brand-navy dark:text-accent-orange hover:bg-accent-orange hover:text-brand-navy font-display font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span className="hidden sm:inline">{copy.swapBtn}</span>
            </button>

            {/* Target Language Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['ru', 'ar', 'en', 'fr'] as SupportedLang[]).map((lCode) => {
                const meta = LANGUAGE_META[lCode];
                return (
                  <button
                    key={`tgt-${lCode}`}
                    type="button"
                    data-testid={`target-lang-${lCode}`}
                    onClick={() => {
                      if (sourceLang === lCode) {
                        setSourceLang(targetLang);
                      } else if (
                        sourceLang === 'auto' &&
                        result?.detectedSourceLang === lCode
                      ) {
                        setSourceLang(lCode);
                        setTargetLang(targetLang === lCode ? (lCode === 'ru' ? 'ar' : 'ru') : targetLang);
                        return;
                      }
                      setTargetLang(lCode);
                    }}
                    className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-display font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      targetLang === lCode
                        ? 'bg-accent-orange text-brand-navy shadow-xs font-extrabold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <span>{meta.flag}</span>
                    <span>{meta.labels[lang]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dual Pane Translator Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* LEFT / TOP PANE: Source Text Input */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 focus-within:border-brand-blue p-5 shadow-xs flex flex-col justify-between min-h-[260px]">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-display font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    {sourceLang === 'auto'
                      ? result?.detectedSourceLang
                        ? `${copy.detectedBadge}: ${LANGUAGE_META[result.detectedSourceLang].labels[lang]}`
                        : copy.autoDetect
                      : LANGUAGE_META[sourceLang].labels[lang]}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {(sourceLang === 'ru' || result?.detectedSourceLang === 'ru') &&
                      inputText.trim() && (
                        <button
                          type="button"
                          onClick={() =>
                            speakRussian(inputText.trim(), undefined, soundEnabled, 0.95)
                          }
                          aria-label="Listen to source text"
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-brand-blue dark:text-accent-orange hover:bg-brand-blue hover:text-white transition cursor-pointer"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      )}

                    <button
                      type="button"
                      onClick={handleToggleVoiceInput}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                        isListeningVoice
                          ? 'bg-red-600 text-white animate-pulse'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {isListeningVoice ? (
                        <>
                          <MicOff className="w-3.5 h-3.5" />
                          <span>{copy.voiceListening}</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5" />
                          <span>{copy.voiceInputBtn}</span>
                        </>
                      )}
                    </button>

                    {inputText && (
                      <button
                        type="button"
                        data-testid="translator-clear-btn"
                        onClick={() => {
                          setInputText('');
                          setResult(null);
                          setErrorMsg(null);
                        }}
                        aria-label={copy.clearBtn}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  data-testid="translator-source-input"
                  dir={inputDir}
                  rows={5}
                  maxLength={2000}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      executeTranslation(inputText, sourceLang, targetLang);
                    }
                  }}
                  placeholder={copy.sourcePlaceholder}
                  className="w-full resize-none bg-transparent text-lg sm:text-xl font-display font-bold text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal outline-none leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] font-mono text-slate-400">
                  {inputText.length} / 2000
                </span>

                <button
                  type="button"
                  data-testid="translator-submit-btn"
                  disabled={!inputText.trim() || isTranslating}
                  onClick={() => executeTranslation(inputText, sourceLang, targetLang)}
                  className="min-h-[42px] px-5 py-2 rounded-2xl bg-brand-blue text-white font-display font-bold text-xs sm:text-sm flex items-center gap-2 hover:opacity-95 disabled:opacity-50 transition cursor-pointer"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{copy.translatingStatus}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{copy.translateNowBtn}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* RIGHT / BOTTOM PANE: Primary Target Language Output */}
            <div
              data-testid="translator-primary-output-card"
              className="rounded-3xl bg-slate-900 text-white border-2 border-slate-800 p-5 shadow-md flex flex-col justify-between min-h-[260px]"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{LANGUAGE_META[targetLang].flag}</span>
                    <span className="text-xs font-display font-extrabold uppercase tracking-wider text-accent-orange">
                      {LANGUAGE_META[targetLang].labels[lang]}
                    </span>
                    {result && (
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-mono text-sky-300">
                          {result.cefrLevel} · {result.pos}
                        </span>
                        {typeof result.latencyMs === 'number' && (
                          <span
                            data-testid="translator-latency-badge"
                            className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-[10px] font-mono font-bold text-emerald-300"
                          >
                            ⚡ {result.latencyMs}ms
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {result && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        data-testid="copy-primary-translation-btn"
                        onClick={() =>
                          handleCopyText(
                            targetLang === 'ru'
                              ? result.translations.ruStressed
                              : result.translations[targetLang],
                            'primary'
                          )
                        }
                        className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'primary' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-300">{copy.copiedBadge}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copy.copyBtn}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {errorMsg ? (
                  <div
                    role="alert"
                    className="p-4 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-100 text-xs space-y-2"
                  >
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => executeTranslation(inputText, sourceLang, targetLang)}
                      className="px-3 py-1.5 rounded-xl bg-white text-red-900 font-bold text-xs cursor-pointer"
                    >
                      {copy.retryBtn}
                    </button>
                  </div>
                ) : isTranslating && !result ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <Loader2 className="w-7 h-7 animate-spin text-accent-orange" />
                    <span className="text-xs font-medium">{copy.translatingStatus}</span>
                  </div>
                ) : result ? (
                  <div className="space-y-3 py-2">
                    <div
                      data-testid="translator-primary-result-text"
                      dir={LANGUAGE_META[targetLang].dir}
                      className="text-2xl sm:text-3xl font-display font-extrabold text-white leading-snug break-words"
                    >
                      {targetLang === 'ru'
                        ? result.translations.ruStressed
                        : result.translations[targetLang]}
                    </div>

                    {/* Show Russian stressed + phonetic transliteration underneath whenever Russian is involved */}
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-bold text-sky-300">
                          🇷🇺 {result.translations.ruStressed}
                        </span>
                        <span className="text-[11px] font-mono text-slate-300">
                          [{result.translations.ruTranslit}]
                        </span>
                      </div>
                    </div>

                    {/* Dictionary Alternatives / Synonyms if returned by fast neural dictionary */}
                    {result.alternatives && result.alternatives.length > 0 && (
                      <div
                        data-testid="translator-alternatives-box"
                        className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1.5"
                      >
                        {result.alternatives.map((alt, i) => (
                          <div key={i} className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="px-1.5 py-0.5 rounded bg-accent-orange/20 text-accent-orange font-mono text-[10px] font-bold uppercase">
                              {alt.pos}
                            </span>
                            {alt.terms.map((term, j) => (
                              <span
                                key={j}
                                className="px-2 py-0.5 rounded-lg bg-white/10 text-slate-200 font-medium"
                              >
                                {term}
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-10 text-slate-400 space-y-1.5">
                    <div className="text-sm font-display font-bold text-slate-300">
                      {copy.emptyPromptTitle}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {copy.emptyPromptSub}
                    </p>
                  </div>
                )}
              </div>

              {/* Audio & Garage Action Bar */}
              {result && (
                <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      data-testid="translator-listen-normal-btn"
                      onClick={() =>
                        speakRussian(
                          result.translations.ruStressed,
                          undefined,
                          soundEnabled,
                          0.95
                        )
                      }
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-brand-blue text-white text-xs font-display font-bold flex items-center gap-1.5 hover:opacity-95 transition cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>{copy.listenNormal}</span>
                    </button>

                    <button
                      type="button"
                      data-testid="translator-listen-slow-btn"
                      onClick={() =>
                        speakRussian(
                          result.translations.ruStressed,
                          undefined,
                          soundEnabled,
                          0.65
                        )
                      }
                      className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-display font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Gauge className="w-4 h-4 text-accent-orange" />
                      <span>{copy.listenSlow}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    data-testid="translator-save-garage-btn"
                    onClick={() =>
                      handleSaveToGarage(
                        result.translations.ruStressed,
                        result.translations[lang === 'ru' ? 'en' : lang],
                        currentHistoryItem?.id
                      )
                    }
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-display font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      currentHistoryItem?.inGarage
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-accent-orange text-brand-navy hover:brightness-105'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>
                      {currentHistoryItem?.inGarage
                        ? copy.savedInGarage
                        : copy.saveToGarage}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Samples Bar */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-2.5">
            <div className="text-xs font-display font-bold text-slate-500 dark:text-slate-400">
              {copy.quickSamplesLabel}
            </div>
            <div className="flex flex-wrap gap-2">
              {(QUICK_SAMPLES[lang] || QUICK_SAMPLES.en).map((sample, idx) => (
                <button
                  key={sample}
                  type="button"
                  data-testid={`quick-sample-chip-${idx}`}
                  onClick={() => setInputText(sample)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-brand-blue hover:text-white text-xs font-medium text-slate-700 dark:text-slate-200 transition cursor-pointer text-start"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>

          {/* Simultaneous 4-Language Output Grid */}
          {result && (
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-display font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Languages className="w-5 h-5 text-brand-blue dark:text-accent-orange" />
                <span>{copy.allFourLangsTitle}</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(['ru', 'ar', 'en', 'fr'] as SupportedLang[]).map((lCode) => {
                  const meta = LANGUAGE_META[lCode];
                  const textValue =
                    lCode === 'ru'
                      ? result.translations.ruStressed
                      : result.translations[lCode];

                  return (
                    <div
                      key={`quad-${lCode}`}
                      data-testid={`quad-translation-${lCode}`}
                      className={`rounded-3xl bg-white dark:bg-slate-900 border p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-3 ${
                        targetLang === lCode
                          ? 'border-brand-blue dark:border-accent-orange ring-2 ring-brand-blue/15'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-display font-extrabold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                            <span>{meta.flag}</span>
                            <span>{meta.labels[lang]}</span>
                            <span className="text-[11px] opacity-60">
                              ({meta.nativeName})
                            </span>
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              data-testid={`quad-speak-${lCode}`}
                              onClick={() =>
                                speakText(
                                  textValue,
                                  lCode,
                                  soundEnabled,
                                  0.9
                                )
                              }
                              aria-label={`Play ${lCode} audio`}
                              className="p-1.5 rounded-lg bg-brand-blue/10 text-brand-blue dark:text-accent-orange hover:bg-brand-blue hover:text-white transition cursor-pointer"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyText(textValue, `quad-${lCode}`)}
                              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 flex items-center gap-1 cursor-pointer"
                            >
                              {copiedKey === `quad-${lCode}` ? (
                                <>
                                  <Check className="w-3 h-3 text-success" />
                                  <span>{copy.copiedBadge}</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>{copy.copyBtn}</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <div
                          dir={meta.dir}
                          className="text-lg sm:text-xl font-display font-bold text-slate-900 dark:text-white leading-snug break-words"
                        >
                          {textValue}
                        </div>

                        {lCode === 'ru' && (
                          <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                            {result.translations.ruTranslit}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* AI Grammar Note & Contextual Examples */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-2">
                  <div className="text-xs font-display font-extrabold uppercase tracking-wider text-brand-blue dark:text-accent-orange">
                    {copy.linguisticAnalysisTitle}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                    {result.grammarNote[lang] || result.grammarNote.en}
                  </p>
                </div>

                <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
                  <div className="text-xs font-display font-extrabold uppercase tracking-wider text-brand-blue dark:text-accent-orange">
                    {copy.examplesTitle}
                  </div>
                  <div className="space-y-2.5">
                    {result.examples.map((ex, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                            {ex.ruStressed}
                          </div>
                          <div
                            dir={LANGUAGE_META[lang].dir}
                            className="text-xs text-slate-600 dark:text-slate-300"
                          >
                            {lang === 'ru' ? ex.en : ex[lang]}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            speakRussian(ex.ruStressed, undefined, soundEnabled, 0.9)
                          }
                          aria-label="Listen to example"
                          className="min-h-[38px] min-w-[38px] rounded-xl bg-brand-blue/10 text-brand-blue dark:text-accent-orange flex items-center justify-center hover:bg-brand-blue hover:text-white transition cursor-pointer shrink-0"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: SAVED TRANSLATIONS & HISTORY                                   */}
      {/* ===================================================================== */}
      {sectionTab === 'history' && (
        <div className="space-y-4">
          {savedHistory.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center text-sm text-slate-500">
              {copy.emptyHistoryTitle}
            </div>
          ) : (
            <>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSavedHistory([]);
                    persistSavedHistory([]);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-red-600 flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{copy.clearHistoryBtn}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedHistory.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold text-slate-400">
                          {item.sourceLang.toUpperCase()} → RU / AR / EN / FR
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              speakRussian(
                                item.translations.ruStressed,
                                undefined,
                                soundEnabled,
                                0.9
                              )
                            }
                            className="p-2 rounded-xl bg-brand-blue/10 text-brand-blue dark:text-accent-orange cursor-pointer"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleFavoriteHistory(item.id)}
                            className={`p-2 rounded-xl border cursor-pointer ${
                              item.isFavorite
                                ? 'border-accent-orange text-accent-orange bg-amber-50 dark:bg-amber-950/40'
                                : 'border-slate-200 dark:border-slate-700 text-slate-400'
                            }`}
                          >
                            <Star
                              className={`w-4 h-4 ${
                                item.isFavorite ? 'fill-current' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      <div className="text-lg font-display font-extrabold text-slate-900 dark:text-white">
                        🇷🇺 {item.translations.ruStressed}
                      </div>
                      <div dir="rtl" className="text-sm font-bold text-brand-blue dark:text-accent-orange">
                        🇸🇦 {item.translations.ar}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        🇬🇧 {item.translations.en} · 🇫🇷 {item.translations.fr}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setInputText(item.sourceText);
                          setSectionTab('translator');
                        }}
                        className="text-xs font-display font-bold text-brand-blue dark:text-accent-orange hover:underline cursor-pointer"
                      >
                        {copy.tabTranslator} →
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleSaveToGarage(
                            item.translations.ruStressed,
                            item.translations[lang === 'ru' ? 'en' : lang],
                            item.id
                          )
                        }
                        className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer ${
                          item.inGarage
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <Wrench className="w-3 h-3" />
                        <span>
                          {item.inGarage ? copy.savedInGarage : copy.saveToGarage}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: CYRILLIC ALPHABET (33 LETTERS REFERENCE)                       */}
      {/* ===================================================================== */}
      {sectionTab === 'letters' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CYRILLIC_LETTERS.map((letter) => (
            <div
              key={letter.id}
              className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-3xl font-display font-extrabold text-brand-blue dark:text-white">
                    {letter.upper} {letter.lower}{' '}
                    <span className="text-xl italic font-serif text-slate-500 ms-2">
                      ({letter.upper} {letter.lower})
                    </span>
                  </div>
                  <div className="text-xs font-mono font-semibold text-accent-orange mt-0.5">
                    {letter.phonetic}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    speakRussian(
                      letter.examples[0].cleanWord,
                      letter.audioSlug,
                      soundEnabled
                    )
                  }
                  aria-label={`Play sound for ${letter.upper}`}
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-brand-blue/10 dark:bg-slate-800 text-brand-blue dark:text-accent-orange flex items-center justify-center hover:bg-brand-blue hover:text-white transition cursor-pointer"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300">
                {letter.soundComparison[lang]}
              </p>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                {letter.examples.map((ex) => (
                  <button
                    key={ex.audioSlug}
                    type="button"
                    onClick={() =>
                      speakRussian(ex.cleanWord, ex.audioSlug, soundEnabled)
                    }
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-start transition cursor-pointer"
                  >
                    <div className="font-display font-bold text-sm text-slate-900 dark:text-white">
                      {ex.wordWithStress}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {ex.translations[lang]}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronDown, Loader2, Search, Volume2, Wrench } from 'lucide-react';
import { SupportedLang } from '../lib/phase2Engine';
import { useI18n } from '../lib/i18n';
import { speakRussian } from '../lib/audio';

/**
 * Browsable word list for the Dictionary (bug #2): the "Dictionary —
 * 628 words" tile used to open the AI translator, not a word list.
 * The 628 words live in content/dictionary.json (1.5 MB) and are
 * lazy-loaded only when this tab opens, so the app bundle stays small.
 */

export interface DictWord {
  id: string;
  russian: string;
  stressed: string;
  translit: string;
  pos: string;
  gender?: string;
  level: string;
  topic: string;
  translations: Record<string, string>;
  examples?: {
    russianStressed: string;
    translations: Record<string, string>;
  }[];
  synonyms?: string[];
  antonyms?: string[];
}

const TOPICS = ['madi_auto', 'campus', 'daily', 'city_metro', 'numbers_time', 'greetings'] as const;

const UI_COPY: Record<
  SupportedLang,
  {
    tabWords: string;
    searchPlaceholder: string;
    levelAll: string;
    topicAll: string;
    wordsCount: (n: number, total: number) => string;
    showMore: string;
    loading: string;
    loadFailed: string;
    noResults: string;
    examples: string;
    synonyms: string;
    antonyms: string;
    saveToGarage: string;
    topics: Record<string, string>;
  }
> = {
  ar: {
    tabWords: 'الكلمات',
    searchPlaceholder: 'ابحث عن كلمة بالروسية أو العربية أو الإنجليزية أو الفرنسية…',
    levelAll: 'كل المستويات',
    topicAll: 'كل المواضيع',
    wordsCount: (n, total) => `${n} من ${total} كلمة`,
    showMore: 'عرض المزيد',
    loading: 'جاري تحميل قائمة الكلمات…',
    loadFailed: 'تعذّر تحميل قائمة الكلمات. أعد فتح التبويب.',
    noResults: 'لا توجد كلمات مطابقة لبحثك.',
    examples: 'أمثلة',
    synonyms: 'مرادفات',
    antonyms: 'أضداد',
    saveToGarage: '+ أضف للمرآب',
    topics: {
      madi_auto: 'مادي والسيارات',
      campus: 'الجامعة',
      daily: 'الحياة اليومية',
      city_metro: 'المدينة والمترو',
      numbers_time: 'الأرقام والوقت',
      greetings: 'التحيات',
    },
  },
  ru: {
    tabWords: 'Слова',
    searchPlaceholder: 'Найти слово на русском, арабском, английском или французском…',
    levelAll: 'Все уровни',
    topicAll: 'Все темы',
    wordsCount: (n, total) => `${n} из ${total} слов`,
    showMore: 'Показать ещё',
    loading: 'Загрузка списка слов…',
    loadFailed: 'Не удалось загрузить список слов. Откройте вкладку ещё раз.',
    noResults: 'По вашему запросу ничего не найдено.',
    examples: 'Примеры',
    synonyms: 'Синонимы',
    antonyms: 'Антонимы',
    saveToGarage: '+ В Гараж',
    topics: {
      madi_auto: 'МАДИ и автомобили',
      campus: 'Кампус',
      daily: 'Повседневная жизнь',
      city_metro: 'Город и метро',
      numbers_time: 'Числа и время',
      greetings: 'Приветствия',
    },
  },
  en: {
    tabWords: 'Words',
    searchPlaceholder: 'Search a word in Russian, Arabic, English or French…',
    levelAll: 'All levels',
    topicAll: 'All topics',
    wordsCount: (n, total) => `${n} of ${total} words`,
    showMore: 'Show more',
    loading: 'Loading the word list…',
    loadFailed: 'Could not load the word list. Please reopen the tab.',
    noResults: 'No words match your search.',
    examples: 'Examples',
    synonyms: 'Synonyms',
    antonyms: 'Antonyms',
    saveToGarage: '+ Save to Garage',
    topics: {
      madi_auto: 'MADI & Cars',
      campus: 'Campus',
      daily: 'Daily life',
      city_metro: 'City & Metro',
      numbers_time: 'Numbers & Time',
      greetings: 'Greetings',
    },
  },
  fr: {
    tabWords: 'Mots',
    searchPlaceholder: 'Rechercher un mot en russe, arabe, anglais ou français…',
    levelAll: 'Tous niveaux',
    topicAll: 'Tous les sujets',
    wordsCount: (n, total) => `${n} sur ${total} mots`,
    showMore: 'Afficher plus',
    loading: 'Chargement de la liste de mots…',
    loadFailed: 'Impossible de charger la liste. Rouvrez l’onglet.',
    noResults: 'Aucun mot ne correspond à votre recherche.',
    examples: 'Exemples',
    synonyms: 'Synonymes',
    antonyms: 'Antonymes',
    saveToGarage: '+ Ajouter au Garage',
    topics: {
      madi_auto: 'MADI et voitures',
      campus: 'Campus',
      daily: 'Vie quotidienne',
      city_metro: 'Ville et métro',
      numbers_time: 'Nombres et temps',
      greetings: 'Salutations',
    },
  },
};

const PAGE_SIZE = 40;

interface DictionaryWordsTabProps {
  soundEnabled: boolean;
  onAddWordToGarage?: (russianWord: string, translationPrompt?: string) => void;
}

export const DictionaryWordsTab: React.FC<DictionaryWordsTabProps> = ({
  soundEnabled,
  onAddWordToGarage,
}) => {
  const { lang } = useI18n();
  const copy = UI_COPY[lang] || UI_COPY.en;

  const [words, setWords] = useState<DictWord[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<'all' | 'A1' | 'A2'>('all');
  const [topic, setTopic] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('../../content/dictionary.json')
      .then((mod: any) => {
        if (!cancelled) setWords((mod.default || mod) as DictWord[]);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!words) return [];
    const q = query.trim().toLowerCase();
    return words.filter((w) => {
      if (level !== 'all' && w.level !== level) return false;
      if (topic !== 'all' && w.topic !== topic) return false;
      if (!q) return true;
      const hay = [
        w.russian,
        w.stressed,
        w.translit,
        w.translations.ru || '',
        w.translations.en || '',
        w.translations.ar || '',
        w.translations.fr || '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [words, query, level, topic]);

  const visible = filtered.slice(0, visibleCount);

  if (loadFailed) {
    return (
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500">
        {copy.loadFailed}
      </div>
    );
  }

  if (!words) {
    return (
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>{copy.loading}</span>
      </div>
    );
  }

  return (
    <div data-testid="dictionary-words-tab" className="space-y-3">
      {/* Search + filters */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 shadow-xs space-y-2.5">
        <div className="flex items-center gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800 px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            data-testid="dictionary-words-search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder={copy.searchPlaceholder}
            className="w-full bg-transparent outline-none text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            data-testid="dictionary-words-level-filter"
            aria-label={copy.levelAll}
            value={level}
            onChange={(e) => {
              setLevel(e.target.value as 'all' | 'A1' | 'A2');
              setVisibleCount(PAGE_SIZE);
            }}
            className="min-h-[38px] px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value="all">{copy.levelAll}</option>
            <option value="A1">A1</option>
            <option value="A2">A2</option>
          </select>
          <select
            data-testid="dictionary-words-topic-filter"
            aria-label={copy.topicAll}
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="min-h-[38px] px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value="all">{copy.topicAll}</option>
            {TOPICS.map((t) => (
              <option key={t} value={t}>
                {copy.topics[t] || t}
              </option>
            ))}
          </select>
          <span className="self-center text-xs font-semibold text-slate-500 dark:text-slate-400">
            {copy.wordsCount(filtered.length, words.length)}
          </span>
        </div>
      </div>

      {/* Word list */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500">
          {copy.noResults}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((w) => {
            const expanded = expandedId === w.id;
            const meaning =
              w.translations[lang] || w.translations.en || w.translations.ru || '';
            return (
              <div
                key={w.id}
                data-testid={`dictionary-word-${w.id}`}
                className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : w.id)}
                  className="w-full flex items-center justify-between gap-3 text-start cursor-pointer"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="text-base sm:text-lg font-display font-extrabold text-slate-900 dark:text-white">
                        {w.stressed}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-brand-blue/10 text-brand-blue dark:text-accent-orange text-[10px] font-mono font-bold uppercase">
                        {w.level} · {w.pos}
                      </span>
                    </span>
                    <span
                      dir={lang === 'ar' ? 'rtl' : 'ltr'}
                      className="block text-sm font-bold text-brand-blue dark:text-accent-orange truncate"
                    >
                      {meaning}
                    </span>
                    <span className="block text-[11px] font-mono text-slate-400">
                      [{w.translit}]
                    </span>
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label="Listen"
                      onClick={(e) => {
                        e.stopPropagation();
                        speakRussian(w.stressed, undefined, soundEnabled, 0.95);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          speakRussian(w.stressed, undefined, soundEnabled, 0.95);
                        }
                      }}
                      className="p-2 rounded-xl bg-brand-blue/10 text-brand-blue dark:text-accent-orange hover:bg-brand-blue hover:text-white transition cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition ${expanded ? 'rotate-180' : ''}`}
                    />
                  </span>
                </button>

                {expanded && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(['ru', 'ar', 'en', 'fr'] as SupportedLang[]).map((lCode) => (
                        <div
                          key={lCode}
                          className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 px-3 py-2"
                        >
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {lCode === 'ru'
                              ? 'Русский'
                              : lCode === 'ar'
                                ? 'العربية'
                                : lCode === 'en'
                                  ? 'English'
                                  : 'Français'}
                          </div>
                          <div
                            dir={lCode === 'ar' ? 'rtl' : 'ltr'}
                            className="text-sm font-semibold text-slate-800 dark:text-slate-100"
                          >
                            {w.translations[lCode] || '—'}
                          </div>
                        </div>
                      ))}
                    </div>

                    {w.examples && w.examples.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-xs font-display font-extrabold uppercase tracking-wider text-brand-blue dark:text-accent-orange">
                          {copy.examples}
                        </div>
                        {w.examples.slice(0, 2).map((ex, i) => (
                          <div key={i} className="text-sm leading-relaxed">
                            <div className="font-display font-bold text-slate-900 dark:text-white">
                              {ex.russianStressed}
                            </div>
                            <div
                              dir={lang === 'ar' ? 'rtl' : 'ltr'}
                              className="text-xs text-slate-600 dark:text-slate-300"
                            >
                              {ex.translations[lang] || ex.translations.en || ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {w.synonyms && w.synonyms.length > 0 && (
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-bold text-slate-800 dark:text-slate-100">
                          {copy.synonyms}:{' '}
                        </span>
                        {w.synonyms.join(', ')}
                      </div>
                    )}
                    {w.antonyms && w.antonyms.length > 0 && (
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-bold text-slate-800 dark:text-slate-100">
                          {copy.antonyms}:{' '}
                        </span>
                        {w.antonyms.join(', ')}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        onAddWordToGarage?.(w.stressed, meaning)
                      }
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-accent-orange text-brand-navy text-xs font-display font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>{copy.saveToGarage}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {filtered.length > visible.length && (
        <div className="flex justify-center">
          <button
            type="button"
            data-testid="dictionary-words-show-more"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="min-h-[42px] px-5 py-2 rounded-2xl bg-brand-blue text-white font-display font-bold text-xs sm:text-sm flex items-center gap-2 hover:opacity-95 transition cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>{copy.showMore}</span>
          </button>
        </div>
      )}
    </div>
  );
};

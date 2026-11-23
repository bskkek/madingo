import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Upload,
  Bookmark,
  ZoomIn,
  ZoomOut,
  Flag,
  Volume2,
  Wrench,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Download,
  ExternalLink,
  Eye,
  Layers,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import {
  searchLibrary,
  type LibrarySearchResult,
} from '../lib/libraryClient';
import {
  LIBRARY_SEED_ITEMS,
  LibraryItem,
  LibrarySection,
  generateBookCoverSvgDataUrl,
} from '../data/phase3Seed';
import { UserRole, canModerateLibrary, stripStress } from '../lib/phase3Engine';
import { speakRussian as rawSpeakRussian } from '../lib/audio';
import { instantTranslateClient } from '../lib/clientTranslate';

const speakRussian = (text: string, soundEnabled = true, rate = 0.9) =>
  rawSpeakRussian(text, undefined, soundEnabled, rate);

interface LibraryViewProps {
  soundEnabled: boolean;
  userRole: UserRole;
  userName: string;
  onAddWordToGarage: (russianWord: string, translationPrompt?: string) => void;
  onInspectWordInDictionary?: (russianWord: string) => void;
}

const SECTION_LABELS: Record<
  'ALL' | LibrarySection,
  { ar: string; ru: string; en: string; fr: string }
> = {
  ALL: {
    ar: 'كل الكتب',
    ru: 'Все книги',
    en: 'All Books',
    fr: 'Tous les livres',
  },
  textbooks: {
    ar: 'مقررات التحضيري',
    ru: 'Учебники ПФ',
    en: 'Prep Textbooks',
    fr: 'Manuels prépa',
  },
  grammar_ref: {
    ar: 'قواعد وجداول',
    ru: 'Грамматика',
    en: 'Grammar',
    fr: 'Grammaire',
  },
  exercises: {
    ar: 'تمارين وتطبيقات',
    ru: 'Упражнения',
    en: 'Exercises',
    fr: 'Exercices',
  },
  reading: {
    ar: 'كتب قراءة وأدب',
    ru: 'Книги для чтения',
    en: 'Reading Books',
    fr: 'Livres de lecture',
  },
  scientific_engineering: {
    ar: 'الروسية الهندسية والعلمية',
    ru: 'Научный стиль (МАДИ)',
    en: 'Engineering & Science',
    fr: 'Russe scientifique',
  },
  exam_prep: {
    ar: 'اختبارات ТРКИ',
    ru: 'Тесты и экзамены',
    en: 'Exam Prep',
    fr: 'Préparation examens',
  },
  teacher_materials: {
    ar: 'مراجع ومنهجيات',
    ru: 'Методика РКИ',
    en: 'Methodological Guides',
    fr: 'Guides méthodologiques',
  },
};

export const LibraryView: React.FC<LibraryViewProps> = ({
  soundEnabled,
  userRole,
  userName,
  onAddWordToGarage,
  onInspectWordInDictionary,
}) => {
  const { lang, t } = useI18n();
  const [items, setItems] = useState<LibraryItem[]>(LIBRARY_SEED_ITEMS);
  const [sectionFilter, setSectionFilter] = useState<'ALL' | LibrarySection>('ALL');
  const [originFilter, setOriginFilter] = useState<'ALL' | 'madi_official' | 'rki_classic'>('ALL');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // MADI university library (НТБ МАДИ) — full-text book search via the
  // proxy POST /library (live catalog first, curated offline index as
  // fallback). Results always show their source + deep links.
  const [madiQuery, setMadiQuery] = useState('');
  const [madiResults, setMadiResults] = useState<LibrarySearchResult | null>(null);
  const [madiSearching, setMadiSearching] = useState(false);

  const runMadiSearch = async (query: string) => {
    const q = query.trim();
    if (!q) return;
    setMadiSearching(true);
    try {
      const result = await searchLibrary(q, lang);
      setMadiResults(result);
    } finally {
      setMadiSearching(false);
    }
  };

  // Reader & PDF Preview Modal state
  const [activeReaderItem, setActiveReaderItem] = useState<LibraryItem | null>(null);
  const [modalMode, setModalMode] = useState<'pdf_preview' | 'smart_reader'>('pdf_preview');
  const [currentPageIdx, setCurrentPageIdx] = useState(0);
  const [zoomScale, setZoomScale] = useState<100 | 115 | 130>(100);
  const [readerSearchQuery, setReaderSearchQuery] = useState('');
  const [bookmarks, setBookmarks] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('madingo_library_bookmarks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Word Lookup Popover inside Smart Reader
  const [inspectedWord, setInspectedWord] = useState<{
    rawWord: string;
    cleanWord: string;
    translation: string;
    pos: string;
    level: string;
  } | null>(null);
  const [addedWordBanner, setAddedWordBanner] = useState<string | null>(null);

  // Upload Modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitleRu, setUploadTitleRu] = useState('');
  const [uploadTitleEn, setUploadTitleEn] = useState('');
  const [uploadSection, setUploadSection] = useState<LibrarySection>('reading');
  const [uploadLevel, setUploadLevel] = useState<'A1' | 'A2' | 'B1' | 'B2'>('A1');
  const [uploadLicenseType, setUploadLicenseType] = useState<string>('cc_by');
  const [uploadSourceUrl, setUploadSourceUrl] = useState('');
  const [uploadRussianText, setUploadRussianText] = useState('');
  const [uploadPermissionChecked, setUploadPermissionChecked] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessBanner, setUploadSuccessBanner] = useState<string | null>(null);

  // Report / Takedown Modal state
  const [reportingItem, setReportingItem] = useState<LibraryItem | null>(null);
  const [reportReason, setReportReason] = useState('Copyright / license verification needed');
  const [reportSubmittedMsg, setReportSubmittedMsg] = useState<string | null>(null);

  const loadLibrary = () => {
    fetch(`/api/library?role=${encodeURIComponent(userRole)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.items) && data.items.length > 0) {
          setItems(data.items);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadLibrary();
  }, [userRole]);

  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: 0 };
    for (const item of items) {
      if (!canModerateLibrary(userRole) && (item.reviewStatus !== 'approved' || !item.permissionConfirmed)) {
        continue;
      }
      counts.ALL = (counts.ALL || 0) + 1;
      counts[item.section] = (counts[item.section] || 0) + 1;
    }
    return counts;
  }, [items, userRole]);

  const originCounts = useMemo(() => {
    let madi = 0;
    let rki = 0;
    for (const item of items) {
      if (!canModerateLibrary(userRole) && (item.reviewStatus !== 'approved' || !item.permissionConfirmed)) {
        continue;
      }
      if (item.origin === 'rki_classic') rki += 1;
      else madi += 1;
    }
    return { madi, rki, all: madi + rki };
  }, [items, userRole]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!canModerateLibrary(userRole)) {
        if (item.reviewStatus !== 'approved' || !item.permissionConfirmed) return false;
      }
      if (sectionFilter !== 'ALL' && item.section !== sectionFilter) return false;
      if (originFilter !== 'ALL') {
        const itemOrigin = item.origin || 'madi_official';
        if (itemOrigin !== originFilter) return false;
      }
      if (levelFilter !== 'ALL' && item.level !== levelFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = [
          item.title.ru,
          item.title.en,
          item.title.ar,
          item.title.fr,
          item.author,
          item.publisher || '',
          item.topic,
          item.description?.ar || '',
          item.description?.ru || '',
          item.description?.en || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, sectionFilter, originFilter, levelFilter, searchQuery, userRole]);

  const handleOpenBookModal = (item: LibraryItem, mode: 'pdf_preview' | 'smart_reader') => {
    setActiveReaderItem(item);
    setModalMode(mode);
    const savedPage = bookmarks[item.id] ?? 0;
    setCurrentPageIdx(Math.min(savedPage, Math.max(0, item.pages.length - 1)));
    setInspectedWord(null);
    setReaderSearchQuery('');
  };

  const handleSaveBookmark = (itemId: string, pageIdx: number) => {
    const next = { ...bookmarks, [itemId]: pageIdx };
    setBookmarks(next);
    try {
      localStorage.setItem('madingo_library_bookmarks', JSON.stringify(next));
    } catch {}
  };

  const handleTapRussianWord = async (rawToken: string) => {
    const clean = stripStress(rawToken)
      .replace(/[.,!?;:«»"—()-]/g, '')
      .trim()
      .toLowerCase();
    if (!clean) return;

    const rawTrimmed = rawToken.replace(/[.,!?;:«»"—()-]/g, '');
    speakRussian(rawTrimmed, soundEnabled, 0.9);

    setInspectedWord({
      rawWord: rawTrimmed,
      cleanWord: clean,
      translation: lang === 'ar' ? 'جاري الترجمة الفورية...' : 'Translating...',
      pos: 'word',
      level: activeReaderItem?.level || 'A1',
    });

    try {
      // Client-side translation (MyMemory, no server): the /api route only
      // exists on the Node server, so on static hosting it returned
      // index.html instead of JSON.
      const data = await instantTranslateClient({
        text: clean,
        sourceLang: 'ru',
        targetLang: lang === 'ru' ? 'en' : lang,
      });
      setInspectedWord({
        rawWord: data.translations?.ruStressed || rawTrimmed,
        cleanWord: clean,
        translation:
          data.translations?.[lang === 'ru' ? 'en' : lang] ||
          data.primaryTranslation ||
          clean,
        pos: data.pos || 'word',
        level: data.cefrLevel || activeReaderItem?.level || 'A1',
      });
    } catch {
      // Keep initial state if network error
    }
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (!uploadPermissionChecked) {
      setUploadError(
        'Upload blocked: You must check the mandatory box confirming you have the legal right/permission to share this material.'
      );
      return;
    }
    if (!uploadTitleRu.trim() || !uploadRussianText.trim()) {
      setUploadError('Please provide both a title and Russian reading text.');
      return;
    }

    try {
      const resp = await fetch('/api/library/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleRu: uploadTitleRu.trim(),
          titleEn: uploadTitleEn.trim() || uploadTitleRu.trim(),
          author: userName || 'Преподаватель МАДИ',
          section: uploadSection,
          level: uploadLevel,
          licenseType: uploadLicenseType,
          sourceUrl: uploadSourceUrl,
          permissionConfirmed: uploadPermissionChecked,
          russianText: uploadRussianText.trim(),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setUploadError(data.error || 'Upload failed');
        return;
      }
      setShowUploadModal(false);
      setUploadTitleRu('');
      setUploadTitleEn('');
      setUploadRussianText('');
      setUploadPermissionChecked(false);
      setUploadSuccessBanner(
        lang === 'ar'
          ? 'تم رفع الكتاب بنجاح وهو قيد المراجعة الإدارية.'
          : 'Material uploaded with status "needs_review".'
      );
      loadLibrary();
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    }
  };

  const handleApprovePendingItem = async (itemId: string) => {
    await fetch(`/api/library/${itemId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actorRole: userRole,
        actorName: userName || 'Admin',
      }),
    });
    loadLibrary();
  };

  const handleSubmitReport = async (immediateTakedown: boolean) => {
    if (!reportingItem) return;
    await fetch('/api/library/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetType: 'library_item',
        targetId: reportingItem.id,
        targetTitle: reportingItem.title.ru,
        reportedBy: userName || 'student',
        reason: reportReason,
        immediateAdminTakedown: immediateTakedown,
        actorRole: userRole,
      }),
    });
    setReportingItem(null);
    setReportSubmittedMsg(
      immediateTakedown
        ? 'Material immediately unpublished (Takedown executed and logged in Audit Log).'
        : 'Report submitted to administrators for copyright/quality review.'
    );
    loadLibrary();
  };

  const getCoverUrl = (item: LibraryItem): string => {
    if (item.coverImageUrl) return item.coverImageUrl;
    return generateBookCoverSvgDataUrl({
      titleRu: item.title.ru,
      author: item.author,
      publisher: item.publisher || 'Издательство МАДИ',
      year: item.publicationYear || 2022,
      pagesCount: item.totalPagesCount || 64,
      level: item.level,
      theme: item.coverTheme || 'madi_blue',
      isMadiOfficial: item.origin !== 'rki_classic',
    });
  };

  const getDirectPdfHref = (item: LibraryItem): string => {
    if (item.pdfUrl && item.pdfUrl.startsWith('http')) {
      return item.pdfUrl;
    }
    return `/api/library/pdf/${encodeURIComponent(item.id)}?download=1`;
  };

  return (
    <div className="space-y-3 pb-6" data-testid="library-view-root">
      {/* =====================================================================
          COMPACT HEADER — one line: real MADI emblem + title + book count.
          No-scroll reorganization: the long hero paragraph, big title block
          and illustration are removed; upload is now the "+" icon next to
          the search bar. Same navy card, same emblem image, same colors.
         ===================================================================== */}
      <div className="rounded-3xl bg-[#162453] bg-[radial-gradient(circle_at_58%_45%,#172658_0%,#152350_55%,#0B1536_100%)] text-white px-3 py-2.5 shadow-xl border border-white/10 relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-2.5 min-w-0">
          <div className="w-11 h-11 rounded-full p-0.5 bg-white/10 ring-1 ring-white/25 shadow-lg shadow-black/30 shrink-0">
            <img
              src={import.meta.env.BASE_URL + "assets/aistudio/madi-emblem-circle.png"}
              alt="MADI Official Emblem"
              className="w-full h-full rounded-full object-contain"
            />
          </div>
          <h1 className="flex-1 min-w-0 text-base sm:text-lg font-black tracking-tight text-white leading-tight truncate">
            {lang === 'ar'
              ? 'مكتبة جامعة مادي الرسمية والكتب العالمية (PDF)'
              : lang === 'ru'
              ? 'Библиотека учебников ПФ МАДИ и лучших пособий РКИ (PDF)'
              : t('library.title')}
          </h1>
          <span className="shrink-0 px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/20 text-xs font-extrabold text-amber-400 whitespace-nowrap">
            {lang === 'ar'
              ? `${originCounts.all} كتاب رسمي`
              : lang === 'ru'
              ? `${originCounts.all} книг`
              : `${originCounts.all} books`}
          </span>
        </div>

        {uploadSuccessBanner && (
          <div className="mt-2 rounded-xl bg-emerald-500/20 border border-emerald-300/40 px-3 py-2 text-xs font-bold text-emerald-100 flex items-center justify-between">
            <span>{uploadSuccessBanner}</span>
            <button
              type="button"
              onClick={() => setUploadSuccessBanner(null)}
              className="text-white font-extrabold"
            >
              ✕
            </button>
          </div>
        )}

        {reportSubmittedMsg && (
          <div className="mt-2 rounded-xl bg-amber-500/20 border border-amber-300/40 px-3 py-2 text-xs font-bold text-amber-100 flex items-center justify-between">
            <span>{reportSubmittedMsg}</span>
            <button
              type="button"
              onClick={() => setReportSubmittedMsg(null)}
              className="text-white font-extrabold"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* =====================================================================
          FILTER BAR (compact, no-scroll): search + upload icon on top,
          category pills in one scrollable row, source + level rows below.
          Every filter keeps its exact behavior — layout only.
         ===================================================================== */}
      <div className="card-Step bg-white p-3 space-y-2.5">
        {/* Row 1: Instant Search + Upload icon */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              data-testid="library-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                lang === 'ar'
                  ? 'ابحث بعنوان الكتاب أو المؤلف أو التخصص (مثل: Дорога в Россию, Хавронина, Панова, الفيزياء، القواعد)...'
                  : lang === 'ru'
                  ? 'Поиск по названию, автору или предмету (Панова, Хавронина, Дорога в Россию, физика, черчение)...'
                  : 'Search by book title, author, or subject (e.g. Дорога в Россию, Хавронина, Панова, Physics, Grammar)...'
              }
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold focus:border-[#1B4DFF] focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setUploadError(null);
              setShowUploadModal(true);
            }}
            data-testid="library-upload-open-btn"
            aria-label={
              lang === 'ar'
                ? 'إضافة كتاب / مرجع'
                : lang === 'ru'
                ? 'Загрузить пособие'
                : t('library.uploadMaterialBtn')
            }
            title={
              lang === 'ar'
                ? 'إضافة كتاب / مرجع'
                : lang === 'ru'
                ? 'Загрузить пособие'
                : t('library.uploadMaterialBtn')
            }
            className="shrink-0 w-11 h-11 rounded-xl bg-[#FFB800] hover:bg-[#FFC629] text-slate-950 inline-flex items-center justify-center transition shadow-lg shadow-amber-500/20"
          >
            <Upload className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Row 2: Category pills — one compact scrollable row */}
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Book Categories">
          {(
            [
              'ALL',
              'textbooks',
              'grammar_ref',
              'exercises',
              'reading',
              'scientific_engineering',
              'exam_prep',
              'teacher_materials',
            ] as const
          ).map((secId) => {
            const labelObj = SECTION_LABELS[secId];
            const count = sectionCounts[secId] || 0;
            return (
              <button
                key={secId}
                type="button"
                role="tab"
                aria-selected={sectionFilter === secId}
                data-testid={`section-tab-${secId}`}
                onClick={() => setSectionFilter(secId)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  sectionFilter === secId
                    ? 'bg-[#1B4DFF] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{labelObj[lang] || labelObj.en}</span>
                <span
                  className={`text-[11px] ${
                    sectionFilter === secId ? 'text-blue-100' : 'text-slate-500'
                  }`}
                >
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Row 3: Source filter — one compact scrollable row */}
        <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Book Source Filter">
          <button
            type="button"
            data-testid="origin-filter-all"
            onClick={() => setOriginFilter('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition shrink-0 whitespace-nowrap ${
              originFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {lang === 'ar'
              ? `جميع المصادر (${originCounts.all})`
              : lang === 'ru'
              ? `Все издания (${originCounts.all})`
              : `All Sources (${originCounts.all})`}
          </button>
          <button
            type="button"
            data-testid="origin-filter-madi"
            onClick={() => setOriginFilter('madi_official')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition shrink-0 whitespace-nowrap ${
              originFilter === 'madi_official'
                ? 'bg-[#1B4DFF] text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {lang === 'ar'
              ? `كتب جامعة مادي الرسمية MADI (${originCounts.madi})`
              : lang === 'ru'
              ? `Учебники ПФ МАДИ (${originCounts.madi})`
              : `Official MADI Prep Books (${originCounts.madi})`}
          </button>
          <button
            type="button"
            data-testid="origin-filter-rki"
            onClick={() => setOriginFilter('rki_classic')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition shrink-0 whitespace-nowrap ${
              originFilter === 'rki_classic'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {lang === 'ar'
              ? `أشهر كتب РКИ العالمية (${originCounts.rki})`
              : lang === 'ru'
              ? `Бестселлеры РКИ и классика (${originCounts.rki})`
              : `Famous RKI & Classics (${originCounts.rki})`}
          </button>
        </div>

        {/* Row 4: CEFR level pills */}
        <div className="flex items-center gap-1.5">
          {['ALL', 'A1', 'A2', 'B1', 'B2'].map((lvl) => (
            <button
              key={lvl}
              type="button"
              data-testid={`level-filter-${lvl}`}
              onClick={() => setLevelFilter(lvl)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold transition shrink-0 ${
                levelFilter === lvl
                  ? 'bg-[#1B4DFF] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {lvl === 'ALL' ? (lang === 'ar' ? 'كل المستويات' : 'ALL') : lvl}
            </button>
          ))}
        </div>
      </div>

      {/* =====================================================================
          MADI UNIVERSITY LIBRARY (НТБ МАДИ) — FULL-TEXT BOOK SEARCH, compact.
          The big amber featured section (title + hint paragraph) is removed;
          only the live-catalog search input stays, in one slim row at the top.
          Results render below it only after a search. Same proxy search,
          same sources and deep links — layout only.
         ===================================================================== */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-900/50 p-2 space-y-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void runMadiSearch(madiQuery);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            data-testid="madi-library-search-input"
            value={madiQuery}
            onChange={(e) => setMadiQuery(e.target.value)}
            placeholder={t('assistant.bookPlaceholder')}
            className="flex-1 min-w-0 min-h-[44px] px-3.5 rounded-2xl border border-orange-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-accent-orange/60"
          />
          <button
            type="submit"
            disabled={madiSearching || !madiQuery.trim()}
            className="shrink-0 min-h-[44px] px-4 rounded-2xl bg-accent-orange text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            {t('assistant.findBook')}
          </button>
        </form>
        {madiSearching && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('assistant.typing')}
          </p>
        )}
        {madiResults && !madiSearching && madiResults.results.length === 0 && (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t('assistant.libraryNoResults')}
          </p>
        )}
        {madiResults && madiResults.results.length > 0 && (
          <div className="space-y-2">
            {madiResults.results.map((book) => (
              <div
                key={book.id}
                data-testid={`madi-book-${book.id}`}
                className="rounded-2xl border border-orange-200 dark:border-orange-900/60 bg-white dark:bg-slate-900 p-3 shadow-sm"
              >
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {book.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {book.author}
                  {book.year ? ` · ${book.year}` : ''}
                  {book.pages ? ` · ${book.pages} с.` : ''}
                </p>
                <div className="flex items-center justify-between mt-2 gap-2">
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">
                    {book.source === 'live-catalog' || book.source === 'live-fulltext'
                      ? t('assistant.librarySourceLive')
                      : t('assistant.librarySourceOffline')}
                  </span>
                  <a
                    href={book.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-accent-orange"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    {t('assistant.openBook')}
                  </a>
                </div>
              </div>
            ))}
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {madiResults.source === 'live'
                ? t('assistant.librarySourceLive')
                : t('assistant.librarySourceOffline')}
            </p>
          </div>
        )}
        {madiResults && (
          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href={madiResults.links.catalog}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-accent-orange"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {t('assistant.libraryOpenCatalog')}
            </a>
            <a
              href={madiResults.links.fullText}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-accent-orange"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {t('assistant.libraryOpenFullText')}
            </a>
          </div>
        )}
      </div>

      {/* =====================================================================
          BOOKS CATALOG GRID (32 BOOKS WITH 3:4 HARDCOVER COVERS & PDF LINKS)
         ===================================================================== */}
      <div
        data-testid="library-books-grid"
        className="grid grid-cols-1 lg:grid-cols-2 gap-3"
      >
        {filteredItems.map((item) => {
          const isBookmarked = bookmarks[item.id] !== undefined;
          const isPending = item.reviewStatus !== 'approved';
          const coverUrl = getCoverUrl(item);
          const directPdfHref = getDirectPdfHref(item);
          const inlinePdfHref = `/api/library/pdf/${encodeURIComponent(item.id)}`;
          const secLabel = SECTION_LABELS[item.section]?.[lang] || SECTION_LABELS[item.section]?.en || item.section;

          return (
            <article
              key={item.id}
              data-testid={`library-book-card-${item.id}`}
              className={`card-Step bg-white p-4 sm:p-5 flex flex-col sm:flex-row gap-5 transition hover:border-blue-300 ${
                isPending ? 'border-amber-400 bg-amber-50/20' : ''
              }`}
            >
              {/* Left / Start Column: Real Page 1 Title Sheet Cover Image (Титульный лист) */}
              <div className="sm:w-44 md:w-48 shrink-0 flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => handleOpenBookModal(item, 'pdf_preview')}
                  aria-label={`Preview PDF: ${item.title[lang] || item.title.ru}`}
                  className="group relative w-40 sm:w-full aspect-[1/1.414] rounded-xl overflow-hidden shadow-[4px_6px_18px_rgba(15,23,42,0.14)] border-2 border-slate-300 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4DFF]"
                >
                  <img
                    src={coverUrl}
                    alt={item.title[lang] || item.title.ru}
                    loading="lazy"
                    data-testid={`book-cover-img-${item.id}`}
                    onError={(e) => {
                      const fallback = generateBookCoverSvgDataUrl({
                        titleRu: item.title.ru,
                        author: item.author,
                        publisher: item.publisher || 'Издательство МАДИ',
                        year: item.publicationYear || 2022,
                        pagesCount: item.totalPagesCount || 64,
                        level: item.level,
                        theme: item.coverTheme || 'madi_blue',
                        isMadiOfficial: item.origin !== 'rki_classic',
                      });
                      if (e.currentTarget.src !== fallback) {
                        e.currentTarget.src = fallback;
                      }
                    }}
                    className="w-full h-full object-contain bg-white p-1 transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/35 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="px-3 py-1.5 rounded-lg bg-white text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-md">
                      <Eye className="w-3.5 h-3.5 text-[#1B4DFF]" />
                      <span>{lang === 'ar' ? 'معاينة PDF' : 'Preview PDF'}</span>
                    </span>
                  </div>
                </button>
              </div>

              {/* Right / Content Column: Clean Unboxed Metadata, Description & Direct PDF Actions */}
              <div className="flex-1 flex flex-col justify-between gap-3 min-w-0">
                <div className="space-y-2">
                  {/* Quiet 1-line unboxed metadata with typographic separators */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-slate-500">
                    <span className="text-[#1B4DFF] font-extrabold">{secLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-800 font-extrabold">CEFR {item.level}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {item.origin === 'rki_classic'
                        ? lang === 'ar'
                          ? 'مرجع РКИ عالمي'
                          : 'RKI Classic'
                        : lang === 'ar'
                        ? 'إصدار جامعة مادي الرسمي'
                        : 'MADI Official PDF'}
                    </span>
                    {item.totalPagesCount && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>
                          {item.totalPagesCount} {lang === 'ar' ? 'صفحة' : 'pp.'}
                        </span>
                      </>
                    )}
                    {isBookmarked && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-700 inline-flex items-center gap-1">
                          <Bookmark className="w-3 h-3 fill-amber-500" />
                          <span>P. {(bookmarks[item.id] || 0) + 1}</span>
                        </span>
                      </>
                    )}
                  </div>

                  {/* Book Title (Localized + Original Russian Title) */}
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                      {item.title[lang] || item.title.ru}
                    </h3>
                    {lang !== 'ru' && (
                      <p dir="ltr" className="text-xs font-bold text-slate-500 mt-0.5 truncate">
                        {item.title.ru}
                      </p>
                    )}
                  </div>

                  {/* Author, Publisher & Year */}
                  <div className="text-xs font-semibold text-slate-600">
                    <span>{item.author}</span>
                    {item.publisher && (
                      <>
                        <span aria-hidden="true"> · </span>
                        <span>{item.publisher}</span>
                      </>
                    )}
                    {item.publicationYear && (
                      <>
                        <span aria-hidden="true"> · </span>
                        <span>{item.publicationYear}</span>
                      </>
                    )}
                  </div>

                  {/* Book Description */}
                  {item.description && (
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {item.description[lang] || item.description.en}
                    </p>
                  )}

                  {isPending && (
                    <div className="flex items-center justify-between gap-2 bg-amber-100 border border-amber-300 rounded-xl px-3 py-2 text-xs font-extrabold text-amber-950">
                      <span>Unreviewed Status: {item.reviewStatus}</span>
                      {canModerateLibrary(userRole) && (
                        <button
                          type="button"
                          onClick={() => handleApprovePendingItem(item.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-xs font-extrabold"
                        >
                          Approve Now
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Bar: Preview PDF Modal + Smart Reader + Direct PDF Download + Official Source */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenBookModal(item, 'pdf_preview')}
                    data-testid={`open-pdf-preview-${item.id}`}
                    className="px-3.5 py-2 rounded-xl bg-[#1B4DFF] hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1.5 transition shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'ar'
                        ? 'معاينة الكتاب PDF'
                        : lang === 'ru'
                        ? 'Открыть PDF'
                        : 'Preview PDF'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenBookModal(item, 'smart_reader')}
                    data-testid={`open-reader-${item.id}`}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center gap-1.5 transition"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'ar'
                        ? 'القارئ الذكي'
                        : lang === 'ru'
                        ? 'Интерактивное чтение'
                        : 'Smart Reader'}
                    </span>
                  </button>

                  <a
                    href={directPdfHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={`${item.id}.pdf`}
                    data-testid={`download-pdf-${item.id}`}
                    className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-extrabold flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-700" />
                    <span>
                      {lang === 'ar'
                        ? 'تحميل PDF مباشر'
                        : lang === 'ru'
                        ? 'Скачать PDF'
                        : 'Download PDF'}
                    </span>
                  </a>

                  {item.sourceUrl && (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`source-link-${item.id}`}
                      className="px-2.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1 transition"
                      title={item.sourceUrl}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'المصدر' : 'Source'}</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => setReportingItem(item)}
                    aria-label={`Report ${item.title.ru}`}
                    className="ml-auto p-2 rounded-xl text-xs font-bold text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition"
                    title={t('library.reportMaterialBtn')}
                  >
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* =====================================================================
          IN-APP PDF DOCUMENT PREVIEW & INTERACTIVE SMART READER MODAL
         ===================================================================== */}
      {activeReaderItem && (
        <div
          data-testid="library-pdf-modal"
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5"
        >
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Top Bar */}
            <div className="p-4 sm:px-6 bg-[#0B1838] text-white flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-amber-300 flex items-center gap-2">
                  <span>CEFR {activeReaderItem.level}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeReaderItem.author}</span>
                  {activeReaderItem.totalPagesCount && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{activeReaderItem.totalPagesCount} pp.</span>
                    </>
                  )}
                </div>
                <h2 className="text-base sm:text-lg font-extrabold truncate">
                  {activeReaderItem.title[lang] || activeReaderItem.title.ru}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Mode Switcher: PDF Document View vs Interactive Smart Reader */}
                <div className="flex items-center bg-white/10 p-1 rounded-xl">
                  <button
                    type="button"
                    data-testid="modal-tab-pdf-preview"
                    onClick={() => setModalMode('pdf_preview')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition ${
                      modalMode === 'pdf_preview'
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'ar' ? 'معاينة الكتاب PDF' : lang === 'ru' ? 'Документ PDF' : 'PDF Document'}
                    </span>
                  </button>
                  <button
                    type="button"
                    data-testid="modal-tab-smart-reader"
                    onClick={() => setModalMode('smart_reader')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition ${
                      modalMode === 'smart_reader'
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'ar'
                        ? 'القارئ الذكي والترجمة'
                        : lang === 'ru'
                        ? 'Умное чтение'
                        : 'Smart Reader'}
                    </span>
                  </button>
                </div>

                {/* Direct Download Link inside Modal */}
                <a
                  href={getDirectPdfHref(activeReaderItem)}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={`${activeReaderItem.id}.pdf`}
                  data-testid="modal-direct-download-pdf"
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'تحميل PDF' : 'Download PDF'}</span>
                </a>

                <button
                  type="button"
                  data-testid="close-pdf-modal-btn"
                  onClick={() => setActiveReaderItem(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {modalMode === 'pdf_preview' ? (
              /* ===============================================================
                 MODE 1: OFFICIAL PDF DOCUMENT PREVIEW + PRINTABLE SHEET VIEW
                 =============================================================== */
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-slate-100 space-y-5">
                {/* Book Summary Banner with Cover + Official Links */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={getCoverUrl(activeReaderItem)}
                      alt={activeReaderItem.title.ru}
                      className="w-16 h-22 object-cover rounded-lg border border-slate-200 shrink-0 shadow"
                    />
                    <div className="space-y-1">
                      <div className="text-xs font-extrabold text-[#1B4DFF]">
                        {activeReaderItem.publisher || 'Издательство МАДИ'} ·{' '}
                        {activeReaderItem.publicationYear || 2022} ·{' '}
                        {activeReaderItem.totalPagesCount || activeReaderItem.pages.length}{' '}
                        {lang === 'ar' ? 'صفحة' : 'pages'}
                      </div>
                      <h3 dir="ltr" className="text-sm sm:text-base font-extrabold text-slate-900">
                        {activeReaderItem.title.ru}
                      </h3>
                      <p className="text-xs text-slate-600">
                        {activeReaderItem.description?.[lang] ||
                          activeReaderItem.description?.en ||
                          activeReaderItem.author}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {activeReaderItem.pdfUrl && activeReaderItem.pdfUrl.startsWith('http') && (
                      <a
                        href={activeReaderItem.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="modal-open-official-madi-pdf"
                        className="px-3.5 py-2 rounded-xl bg-[#1B4DFF] hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>
                          {lang === 'ar'
                            ? 'فتح ملف PDF الأصلي من خادم جامعة مادي'
                            : 'Open Official MADI Server PDF'}
                        </span>
                      </a>
                    )}
                    <a
                      href={`/api/library/pdf/${encodeURIComponent(activeReaderItem.id)}?download=1`}
                      download={`${activeReaderItem.id}.pdf`}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>
                        {lang === 'ar' ? 'نسخة PDF سريعة للطباعة' : 'Instant Printable PDF'}
                      </span>
                    </a>
                  </div>
                </div>

                {/* High-Contrast A4 Academic PDF Page Sheet Preview (with Real Page 1 Title Sheet) */}
                {(() => {
                  const page =
                    activeReaderItem.pages[currentPageIdx] || activeReaderItem.pages[0];
                  return (
                    <div
                      data-testid="pdf-sheet-page"
                      className="bg-white max-w-4xl mx-auto rounded-2xl shadow-md border border-slate-300 p-6 sm:p-8 space-y-6"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-xs font-bold text-slate-500">
                        <span>{activeReaderItem.publisher || 'МАДИ · Кафедра РКИ'}</span>
                        <span>
                          {lang === 'ar'
                            ? `الصفحة الأولى الأصلية (Титульный лист) + مقتطف الصفحة ${page.pageNumber} (إجمالي الكتاب: ${
                                activeReaderItem.totalPagesCount || activeReaderItem.pages.length
                              } ص)`
                            : `Original Page 1 Title Sheet + Excerpt Page ${page.pageNumber} (Full Book: ${
                                activeReaderItem.totalPagesCount || activeReaderItem.pages.length
                              } pp.)`}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                        {/* Real Page 1 Title Sheet Image */}
                        <div className="md:col-span-5 flex flex-col items-center">
                          <div className="w-full max-w-[280px] aspect-[1/1.414] rounded-xl border-2 border-slate-300 bg-white shadow-md overflow-hidden p-1.5">
                            <img
                              src={getCoverUrl(activeReaderItem)}
                              alt={activeReaderItem.title.ru}
                              className="w-full h-full object-contain bg-white"
                            />
                          </div>
                          <span className="mt-2 text-[11px] font-bold text-slate-500">
                            {lang === 'ar'
                              ? 'صورة الصفحة الأولى الأصلية للكتاب (Титульный лист — Стр. 1)'
                              : 'Official Page 1 Title Sheet (Титульный лист — p. 1)'}
                          </span>
                        </div>

                        {/* Excerpt Text & Study Notes */}
                        <div className="md:col-span-7 space-y-4">

                      <div className="flex items-center justify-between gap-3">
                        <h4 dir="ltr" className="text-lg sm:text-xl font-extrabold text-slate-900">
                          {page.heading}
                        </h4>
                        <button
                          type="button"
                          onClick={() => speakRussian(page.russianText, soundEnabled, 0.9)}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1B4DFF] text-xs font-extrabold flex items-center gap-1.5 shrink-0"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? 'استماع للنص' : 'Listen'}</span>
                        </button>
                      </div>

                      <p
                        dir="ltr"
                        className="text-base sm:text-lg leading-relaxed font-semibold text-slate-900 bg-slate-50/70 p-5 rounded-xl border border-slate-200"
                      >
                        {page.russianText}
                      </p>

                      <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs sm:text-sm font-semibold text-amber-950">
                        <strong>
                          {lang === 'ar' ? 'ملاحظة أكاديمية وترجمة:' : 'Academic & Study Note:'}
                        </strong>{' '}
                        {page.translationNotes[lang] || page.translationNotes.en}
                      </div>

                          <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                            <span>
                              {lang === 'ar'
                                ? 'تريد ترجمة أي كلمة داخل الصفحة؟ انتقل إلى تبويب «القارئ الذكي والترجمة».'
                                : 'Want instant word-by-word translation? Switch to the Smart Reader tab.'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setModalMode('smart_reader')}
                              className="text-[#1B4DFF] font-extrabold hover:underline"
                            >
                              {lang === 'ar' ? 'فتح القارئ التفاعلي ←' : 'Open Interactive Word Lookup →'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* ===============================================================
                 MODE 2: INTERACTIVE SMART READER (WORD-TAP TRANSLATION & AUDIO)
                 =============================================================== */
              <>
                <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-[#1B4DFF]">
                    {t('library.tapWordHint')}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setZoomScale((z) => (z === 130 ? 115 : z === 115 ? 100 : 100))
                      }
                      className="p-1.5 rounded-lg bg-white border border-blue-200 text-slate-700"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-extrabold text-slate-700">{zoomScale}%</span>
                    <button
                      type="button"
                      onClick={() =>
                        setZoomScale((z) => (z === 100 ? 115 : z === 115 ? 130 : 130))
                      }
                      className="p-1.5 rounded-lg bg-white border border-blue-200 text-slate-700"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="text"
                      value={readerSearchQuery}
                      onChange={(e) => setReaderSearchQuery(e.target.value)}
                      placeholder={lang === 'ar' ? 'ابحث عن كلمة في الصفحة...' : 'Find word on page...'}
                      className="px-3 py-1 rounded-lg border border-blue-200 text-xs font-bold bg-white"
                    />
                  </div>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-5">
                  {(() => {
                    const page =
                      activeReaderItem.pages[currentPageIdx] || activeReaderItem.pages[0];
                    const tokens = page.russianText.split(/\s+/);
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 dir="ltr" className="text-lg font-extrabold text-slate-900">
                            {page.heading}
                          </h3>
                          <button
                            type="button"
                            data-testid="reader-listen-to-page-btn"
                            onClick={() => speakRussian(page.russianText, soundEnabled, 0.9)}
                            className="px-3 py-1.5 rounded-xl bg-[#1B4DFF] text-white text-xs font-extrabold flex items-center gap-1.5"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>{lang === 'ar' ? 'استماع للصفحة' : 'Listen to Page'}</span>
                          </button>
                        </div>

                        <div
                          dir="ltr"
                          style={{ fontSize: `${zoomScale}%` }}
                          className="p-5 rounded-2xl bg-slate-50 border-2 border-slate-200 leading-relaxed font-bold text-slate-900 flex flex-wrap gap-x-2 gap-y-1.5"
                        >
                          {tokens.map((tok, i) => {
                            const isMatch =
                              readerSearchQuery.trim().length > 0 &&
                              stripStress(tok)
                                .toLowerCase()
                                .includes(readerSearchQuery.trim().toLowerCase());
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleTapRussianWord(tok)}
                                className={`px-1.5 py-0.5 rounded-lg transition text-left ${
                                  isMatch
                                    ? 'bg-amber-300 text-slate-950'
                                    : 'hover:bg-blue-100 hover:text-[#1B4DFF]'
                                }`}
                              >
                                {tok}
                              </button>
                            );
                          })}
                        </div>

                        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs sm:text-sm font-semibold text-amber-950">
                          <strong>{lang === 'ar' ? 'ملاحظة دراسية:' : 'Study Note:'}</strong>{' '}
                          {page.translationNotes[lang] || page.translationNotes.en}
                        </div>
                      </div>
                    );
                  })()}

                  {inspectedWord && (
                    <div
                      data-testid="reader-word-popover"
                      className="p-4 rounded-2xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4 shadow-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span dir="ltr" className="text-lg font-extrabold text-amber-300">
                            {inspectedWord.rawWord}
                          </span>
                          <span className="text-xs text-slate-300">
                            {inspectedWord.pos} · {inspectedWord.level}
                          </span>
                          <button
                            type="button"
                            onClick={() => speakRussian(inspectedWord.rawWord, soundEnabled, 0.85)}
                            className="p-1 rounded bg-white/10 hover:bg-white/20"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-xs sm:text-sm text-slate-200 mt-1">
                          {inspectedWord.translation}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onAddWordToGarage(inspectedWord.rawWord, inspectedWord.translation);
                            setAddedWordBanner(inspectedWord.rawWord);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-[#FF6B00] hover:bg-orange-500 text-white text-xs font-extrabold flex items-center gap-1.5"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>
                            {addedWordBanner === inspectedWord.rawWord
                              ? lang === 'ar'
                                ? 'تم الحفظ في الكراج!'
                                : 'Saved to Garage!'
                              : lang === 'ar'
                              ? 'احفظ في الكراج'
                              : 'Add to Garage'}
                          </span>
                        </button>
                        {onInspectWordInDictionary && (
                          <button
                            type="button"
                            onClick={() => {
                              const w = inspectedWord.cleanWord;
                              setActiveReaderItem(null);
                              onInspectWordInDictionary(w);
                            }}
                            className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-extrabold"
                          >
                            {lang === 'ar' ? 'فتح في المترجم الفوري' : 'Open in Translator'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Modal Footer Pagination & Bookmark */}
            <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                disabled={currentPageIdx === 0}
                onClick={() => {
                  const next = Math.max(0, currentPageIdx - 1);
                  setCurrentPageIdx(next);
                  handleSaveBookmark(activeReaderItem.id, next);
                }}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-extrabold disabled:opacity-40 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{lang === 'ar' ? 'السابق' : 'Previous'}</span>
              </button>

              <div className="flex items-center gap-3">
                <span className="text-xs font-extrabold text-slate-600">
                  {lang === 'ar'
                    ? `قسم المعاينة ${currentPageIdx + 1} من ${activeReaderItem.pages.length}`
                    : `Section ${currentPageIdx + 1} of ${activeReaderItem.pages.length}`}
                </span>
                <button
                  type="button"
                  onClick={() => handleSaveBookmark(activeReaderItem.id, currentPageIdx)}
                  className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-xs font-extrabold flex items-center gap-1"
                >
                  <Bookmark className="w-3 h-3 fill-amber-500" />
                  <span>{lang === 'ar' ? 'حفظ العلامة' : 'Bookmark'}</span>
                </button>
              </div>

              <button
                type="button"
                disabled={currentPageIdx >= activeReaderItem.pages.length - 1}
                onClick={() => {
                  const next = Math.min(
                    activeReaderItem.pages.length - 1,
                    currentPageIdx + 1
                  );
                  setCurrentPageIdx(next);
                  handleSaveBookmark(activeReaderItem.id, next);
                }}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-extrabold disabled:opacity-40 flex items-center gap-1"
              >
                <span>{lang === 'ar' ? 'التالي' : 'Next'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          UPLOAD MODAL (Requires Human License Selection + Source URL + Permission Checkbox)
         ===================================================================== */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitUpload}
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border-2 border-slate-200"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">
                {t('library.uploadModalTitle')}
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div
                data-testid="upload-error-alert"
                className="rounded-xl bg-rose-50 border border-rose-300 p-3 text-xs font-bold text-rose-900 flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Russian Title (with stress marks)
                </label>
                <input
                  type="text"
                  value={uploadTitleRu}
                  onChange={(e) => setUploadTitleRu(e.target.value)}
                  placeholder="Напр.: Па́мятка по доро́жным зна́кам МАДИ́"
                  className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Section
                  </label>
                  <select
                    value={uploadSection}
                    onChange={(e) => setUploadSection(e.target.value as LibrarySection)}
                    className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-xs font-bold"
                  >
                    <option value="reading">Reading Texts</option>
                    <option value="textbooks">Prep Textbooks</option>
                    <option value="grammar_ref">Grammar Reference</option>
                    <option value="exercises">Exercises</option>
                    <option value="scientific_engineering">Engineering & Science</option>
                    <option value="exam_prep">Exam Prep</option>
                    <option value="teacher_materials">Teacher Materials</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    License Type (Required)
                  </label>
                  <select
                    data-testid="upload-license-select"
                    value={uploadLicenseType}
                    onChange={(e) => setUploadLicenseType(e.target.value)}
                    className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-xs font-bold"
                  >
                    <option value="">-- Select license (required) --</option>
                    <option value="public_domain">public_domain</option>
                    <option value="cc_by">cc_by (Creative Commons BY)</option>
                    <option value="cc_by_sa">cc_by_sa (Creative Commons BY-SA)</option>
                    <option value="own_work_with_permission">own_work_with_permission</option>
                    <option value="all_rights_reserved_with_permission">
                      all_rights_reserved_with_permission
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Source URL (Required · https://...)
                </label>
                <input
                  type="url"
                  data-testid="upload-source-url-input"
                  value={uploadSourceUrl}
                  onChange={(e) => setUploadSourceUrl(e.target.value)}
                  placeholder="https://lib.madi.ru/fel/..."
                  className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Russian Reading Text
                </label>
                <textarea
                  rows={3}
                  value={uploadRussianText}
                  onChange={(e) => setUploadRussianText(e.target.value)}
                  placeholder="Введите учебный текст на русском языке..."
                  className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-bold"
                />
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/70 border border-blue-200 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  data-testid="upload-permission-checkbox"
                  checked={uploadPermissionChecked}
                  onChange={(e) => setUploadPermissionChecked(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-[#1B4DFF]"
                />
                <span>{t('library.permissionCheckboxLabel')}</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-extrabold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="upload-submit-btn"
                className="px-5 py-2 rounded-xl bg-[#1B4DFF] text-white text-xs font-extrabold"
              >
                Submit for Admin Review
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          REPORT & TAKEDOWN MODAL
         ===================================================================== */}
      {reportingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border-2 border-slate-200">
            <h3 className="text-lg font-extrabold text-slate-900">
              Report Material: {reportingItem.title.ru}
            </h3>
            <p className="text-xs text-slate-600">
              Flag copyright concerns, license questions, or stress-mark errors. Admins can execute an immediate takedown.
            </p>
            <textarea
              rows={3}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-200 p-3 text-xs font-bold"
            />
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setReportingItem(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 text-xs font-extrabold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSubmitReport(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-extrabold"
              >
                Submit Report
              </button>
              {canModerateLibrary(userRole) && (
                <button
                  type="button"
                  onClick={() => handleSubmitReport(true)}
                  data-testid="admin-immediate-takedown-btn"
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-extrabold"
                >
                  Immediate Admin Takedown
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

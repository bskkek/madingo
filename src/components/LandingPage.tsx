import React, { useEffect, useState, useRef } from 'react';
import { ArrowRight, Menu } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { SupportedLang } from '../data/curriculum';
import {
  MadingoWordmark,
  HeroPanoramaIllustration,
  LanguageFlagIcon,
  MishaMascot,
} from './BrandVisuals';
import { LANGUAGE_OPTIONS } from './FlagPickerModal';
import { MadiCrewSection } from './MadiCrewSection';

interface MadiLiveStoryItem {
  id: string;
  imageUrl: string;
  localImageUrl?: string;
  proxyImageUrl?: string;
  title: string;
  subtitle: string;
  href: string;
}

const KNOWN_LOCAL_STORY_ASSETS: Record<string, string> = {
  'https://www.madi.ru/uploads/images/2026/10/23/1792763352_sayit31.10.png':
    '/assets/madi-stories/story-1.webp',
  'https://www.madi.ru/uploads/images/2026/09/14/1789381155_madi-banner-universal.png':
    '/assets/madi-stories/story-2.webp',
  'https://www.madi.ru/uploads/images/2025/04/24/1745486917_SayitKnigaPamyati.png':
    '/assets/madi-stories/story-3.webp',
  'https://www.madi.ru/uploads/images/2026/09/15/1789480019_image.png':
    '/assets/madi-stories/story-4.webp',
  'https://www.madi.ru/uploads/images/2022/03/25/1648201524_Slayidersocseti-min.png':
    '/assets/madi-stories/story-5.webp',
};

const INITIAL_MADI_STORIES: MadiLiveStoryItem[] = [
  {
    id: 'madi-story-1',
    imageUrl: 'https://www.madi.ru/uploads/images/2026/10/23/1792763352_sayit31.10.png',
    localImageUrl: '/assets/madi-stories/story-1.webp',
    proxyImageUrl: '/assets/madi-stories/story-1.webp',
    title: '',
    subtitle: '',
    href: 'https://forms.cloud.microsoft/e/pBHtH0wVPA/',
  },
  {
    id: 'madi-story-2',
    imageUrl: 'https://www.madi.ru/uploads/images/2026/09/14/1789381155_madi-banner-universal.png',
    localImageUrl: '/assets/madi-stories/story-2.webp',
    proxyImageUrl: '/assets/madi-stories/story-2.webp',
    title: '',
    subtitle: '',
    href: 'https://olimpiada.madi.ru/',
  },
  {
    id: 'madi-story-3',
    imageUrl: 'https://www.madi.ru/uploads/images/2025/04/24/1745486917_SayitKnigaPamyati.png',
    localImageUrl: '/assets/madi-stories/story-3.webp',
    proxyImageUrl: '/assets/madi-stories/story-3.webp',
    title: 'Книга памяти МАДИ',
    subtitle: '',
    href: 'https://madi.ru/8596-kniga-pamyati-madi.html',
  },
  {
    id: 'madi-story-4',
    imageUrl: 'https://www.madi.ru/uploads/images/2026/09/15/1789480019_image.png',
    localImageUrl: '/assets/madi-stories/story-4.webp',
    proxyImageUrl: '/assets/madi-stories/story-4.webp',
    title: 'МАДИ в топ-100 лучших вузов России',
    subtitle: 'Первая лига Национального агрегированного рейтинга',
    href: 'https://www.madi.ru/7481-madi-voshel-v-pervuyu-ligu-nacionalnogo-agregirovannogo-reyt.html',
  },
  {
    id: 'madi-story-5',
    imageUrl: 'https://www.madi.ru/uploads/images/2022/03/25/1648201524_Slayidersocseti-min.png',
    localImageUrl: '/assets/madi-stories/story-5.webp',
    proxyImageUrl: '/assets/madi-stories/story-5.webp',
    title: 'МАДИ в социальных сетях',
    subtitle: 'Подписывайтесь на официальные аккаунты университета',
    href: 'https://taplink.cc/madiuniversity',
  },
];

interface LandingPageProps {
  onStartOnboarding: () => void;
  onLoginClick: () => void;
  onSelectLang: (lang: SupportedLang) => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
  onOpenContact?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartOnboarding,
  onLoginClick,
  onSelectLang,
  onOpenPrivacy,
  onOpenTerms,
  onOpenContact,
}) => {
  const { lang, t } = useI18n();
  const [scrollY, setScrollY] = useState(0);
  const [showStickyBottomBar, setShowStickyBottomBar] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Live MADI Website Stories state
  const [madiStories, setMadiStories] = useState<MadiLiveStoryItem[]>(INITIAL_MADI_STORIES);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isStoryPaused, setIsStoryPaused] = useState(false);
  const [fallbackByStoryId, setFallbackByStoryId] = useState<Record<string, boolean>>({});

  // Sync live stories from madi.ru via backend endpoint automatically
  useEffect(() => {
    let isMounted = true;
    const fetchLiveStories = async () => {
      try {
        const res = await fetch('/api/madi-live-stories');
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && Array.isArray(data.stories) && data.stories.length > 0) {
          const normalized = data.stories.map((st: MadiLiveStoryItem, idx: number) => {
            const localMatch =
              st.localImageUrl ||
              KNOWN_LOCAL_STORY_ASSETS[st.imageUrl] ||
              `/assets/madi-stories/story-${(idx % 5) + 1}.webp`;
            return {
              ...st,
              localImageUrl: localMatch,
              proxyImageUrl: st.proxyImageUrl || localMatch,
            };
          });
          setMadiStories(normalized);
        }
      } catch {
        // Keep current/initial stories on network error
      }
    };

    fetchLiveStories();
    const syncInterval = setInterval(fetchLiveStories, 3 * 60 * 1000);
    return () => {
      isMounted = false;
      clearInterval(syncInterval);
    };
  }, []);

  // Auto-advance stories like Instagram/Web Stories (5.5s per story)
  useEffect(() => {
    if (isStoryPaused || madiStories.length <= 1) return;
    const stepMs = 55;
    const increment = 100 / (5500 / stepMs);

    const timer = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev + increment >= 100) {
          setActiveStoryIndex((idx) => (idx + 1) % madiStories.length);
          return 0;
        }
        return prev + increment;
      });
    }, stepMs);

    return () => clearInterval(timer);
  }, [isStoryPaused, madiStories.length, activeStoryIndex]);

  const handleSelectStory = (index: number) => {
    setActiveStoryIndex(index);
    setStoryProgress(0);
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      setShowStickyBottomBar(window.scrollY > 450);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans pb-24 lg:pb-0" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* A) Sticky Header (height 56px) */}
      <header className="h-[56px] bg-gradient-to-b from-white via-white/95 to-transparent text-slate-900 px-4 sticky top-0 z-50 backdrop-blur-md border-0 shadow-none flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MadingoWordmark size="sm" lightText={false} />
        </div>

        {/* 3 small lines hamburger menu for language selection */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition flex items-center gap-1.5 cursor-pointer"
            aria-label="Language menu"
          >
            <div className="flex flex-col justify-between w-5 h-4">
              <span className="block h-0.5 w-full bg-slate-800 rounded-full"></span>
              <span className="block h-0.5 w-full bg-slate-800 rounded-full"></span>
              <span className="block h-0.5 w-full bg-slate-800 rounded-full"></span>
            </div>
            <span className="text-xs font-bold uppercase ms-1">{lang}</span>
          </button>

          {showLangMenu && (
            <div className="absolute top-full mt-2 end-0 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 py-2 w-48 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-100">
                {t('landing.changeLanguageCta') || 'Select Language'}
              </div>
              <div className="py-1">
                {LANGUAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => {
                      onSelectLang(opt.code);
                      setShowLangMenu(false);
                    }}
                    className={`w-full px-3 py-2 text-start text-xs font-bold flex items-center gap-2.5 transition hover:bg-slate-50 cursor-pointer ${
                      lang === opt.code ? 'text-brand-blue bg-blue-50/60' : 'text-slate-700'
                    }`}
                  >
                    <LanguageFlagIcon lang={opt.code} className="w-5 h-3.5 shadow-xs" />
                    <span>{opt.nativeName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Top Live MADI Stories Background Banner (Auto-synced from madi.ru) */}
      <div
        data-testid="madi-live-stories-top-bg"
        onMouseEnter={() => setIsStoryPaused(true)}
        onMouseLeave={() => setIsStoryPaused(false)}
        onTouchStart={() => setIsStoryPaused(true)}
        onTouchEnd={() => setIsStoryPaused(false)}
        className="relative w-full overflow-hidden bg-white select-none pt-1 pb-2"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="relative w-full aspect-[31/10] min-h-[132px] sm:min-h-[210px] overflow-hidden rounded-2xl sm:rounded-3xl bg-[#1b2540] border border-slate-200/90 shadow-md">
            {/* Story Progress Bars at Top */}
            <div className="absolute top-2 sm:top-3 inset-x-3 sm:inset-x-5 z-30 flex items-center gap-1.5">
              {madiStories.map((st, idx) => {
                const fillWidth =
                  idx < activeStoryIndex
                    ? 100
                    : idx === activeStoryIndex
                    ? storyProgress
                    : 0;
                return (
                  <button
                    key={st.id || idx}
                    type="button"
                    aria-label={`Story ${idx + 1}`}
                    onClick={() => handleSelectStory(idx)}
                    className="flex-1 h-1.5 rounded-full bg-slate-900/25 ring-1 ring-white/60 backdrop-blur-xs overflow-hidden cursor-pointer"
                  >
                    <div
                      className="h-full bg-accent-orange transition-all duration-75 rounded-full"
                      style={{ width: `${fillWidth}%` }}
                    />
                  </button>
                );
              })}
            </div>

            {/* Rotating Story Images from madi.ru (served via local pre-cache / proxy for instant load) */}
            {madiStories.map((story, idx) => {
              const isActive = idx === activeStoryIndex;
              const fallbackLocalSrc = `/assets/madi-stories/story-${(idx % 5) + 1}.webp`;
              const primarySrc =
                story.localImageUrl ||
                KNOWN_LOCAL_STORY_ASSETS[story.imageUrl] ||
                story.proxyImageUrl ||
                fallbackLocalSrc;
              const imgSrc = fallbackByStoryId[story.id] ? fallbackLocalSrc : primarySrc;

              return (
                <div
                  key={story.id || idx}
                  className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
                    isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  <img
                    src={imgSrc}
                    alt={story.title || `MADI Story ${idx + 1}`}
                    loading={idx === 0 ? 'eager' : 'lazy'}
                    onError={() => {
                      if (!fallbackByStoryId[story.id]) {
                        setFallbackByStoryId((prev) => ({ ...prev, [story.id]: true }));
                      }
                    }}
                    className="w-full h-full object-cover object-center bg-[#1b2540]"
                  />

                  {/* Subtle text overlay only when story has an explicit headline on madi.ru */}
                  {(story.title || story.subtitle) && (
                    <div className="absolute inset-x-0 bottom-2 sm:bottom-4 z-20 ps-3 pe-24 sm:ps-6 sm:pe-28 pointer-events-none">
                      <div className="max-w-xl text-start" dir="ltr">
                        {story.title && (
                          <div className="inline-block px-2.5 py-1 rounded-lg bg-slate-900/75 backdrop-blur-xs text-white font-display font-extrabold text-[11px] sm:text-base shadow-sm leading-snug">
                            {story.title}
                          </div>
                        )}
                        {story.subtitle && (
                          <p className="hidden sm:block mt-1 text-xs text-white/95 font-medium drop-shadow">
                            {story.subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Left / Right Tap Zones for Story Navigation */}
            <button
              type="button"
              aria-label="Previous Story"
              onClick={() =>
                handleSelectStory(
                  (activeStoryIndex - 1 + madiStories.length) % madiStories.length
                )
              }
              className="absolute inset-y-0 start-0 w-1/4 z-20 cursor-pointer focus:outline-none"
            />
            <button
              type="button"
              aria-label="Next Story"
              onClick={() =>
                handleSelectStory((activeStoryIndex + 1) % madiStories.length)
              }
              className="absolute inset-y-0 end-0 w-1/4 z-20 cursor-pointer focus:outline-none"
            />

            {/* Story Counter Pill in Bottom Corner */}
            <div
              className="absolute bottom-2 sm:bottom-3 right-2.5 sm:right-4 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/70 backdrop-blur-xs text-white text-[10px] font-bold tracking-wider pointer-events-none"
              dir="ltr"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent-orange animate-pulse" />
              <span>
                МАДИ • {activeStoryIndex + 1}/{madiStories.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-8 space-y-16 bg-white">
        {/* B) Hero Section (Frameless / Card-free clean style) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center pt-2 bg-white relative overflow-hidden">
          {/* Left Column (Text & CTAs) */}
          <div className="lg:col-span-6 space-y-6 text-start relative z-10">
            <div className="flex items-center gap-3">
              <MishaMascot expression="cheering" size={70} />
            </div>

            <h1 className="text-3xl sm:text-5xl font-display font-black tracking-tight leading-tight text-slate-900">
              {t('landing.heroTitle')}
            </h1>

            {/* ONE big full-width orange CTA */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={onStartOnboarding}
                className="w-full sm:w-auto min-h-[52px] px-8 py-4 rounded-2xl bg-accent-orange text-brand-navy font-display font-black text-lg shadow-[0_6px_0_#b35900] hover:translate-y-[-2px] active:translate-y-[2px] transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{t('landing.startCta')}</span>
                <ArrowRight className="w-5 h-5 rtl:rotate-180" />
              </button>

              <button
                type="button"
                onClick={onLoginClick}
                className="w-full sm:w-auto min-h-[44px] px-6 py-3 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition cursor-pointer flex items-center justify-center"
              >
                {t('landing.haveAccountCta')}
              </button>
            </div>
          </div>

          {/* Right Column (Hero Road Scene) */}
          <div className="lg:col-span-6 w-full relative z-10">
            <div className="w-full relative rounded-3xl overflow-hidden bg-white aspect-[16/10] border-0 shadow-none ring-0">
              <HeroPanoramaIllustration scrollOffset={scrollY} />
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse at center, transparent 40%, white 95%)'
              }} />
            </div>
          </div>
        </section>

        {/* Motivational Quote & Character Section */}
        <section className="space-y-8 pt-8 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
            <div className="max-w-3xl">
              <p className="text-slate-800 text-xl sm:text-3xl font-display font-black text-start leading-relaxed">
                {t('landing.motivationalSub')}
              </p>
            </div>
            <div className="w-full lg:w-1/2 flex flex-col items-start space-y-6 pt-2">
              <div className="w-full relative overflow-hidden border-0 shadow-none ring-0 bg-transparent">
                <img
                  src="/assets/aistudio/1793061139335_b556fd67.jpg"
                  alt="Misha Character"
                  className="w-full h-auto object-contain border-0 shadow-none bg-transparent"
                  referrerPolicy="no-referrer"
                />
              </div>
              <p className="text-slate-800 text-lg sm:text-2xl font-display font-bold text-start leading-relaxed">
                {t('landing.aiLearningSub')}
              </p>
            </div>
          </div>
        </section>

        {/* Meet the crew section */}
        <MadiCrewSection />

        {/* G) Footer */}
        <footer className="pt-10 pb-16 space-y-6 text-xs text-slate-600 bg-white">
          {/* Official MADI Social Channels (MAX, Telegram, VK) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <span className="text-sm font-display font-bold text-slate-800">
              {lang === 'ar'
                ? 'تابع جامعة مادي (МАДИ) على الحسابات الرسمية:'
                : lang === 'ru'
                ? 'Подписывайтесь на МАДИ в официальных соцсетях:'
                : lang === 'fr'
                ? 'Suivez l’Université MADI sur les réseaux officiels :'
                : 'Follow MADI University on official channels:'}
            </span>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {/* 1. Official MAX Messenger (МАДИ) */}
              <a
                href="https://max.ru/university_madi"
                target="_blank"
                rel="noopener noreferrer"
                title="MAX «Университет МАДИ»"
                data-testid="footer-social-max"
                className="group inline-flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-display font-bold text-xs transition hover:-translate-y-0.5 cursor-pointer"
              >
                <svg
                  className="w-7 h-7 shrink-0"
                  viewBox="0 0 52 52"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient
                      id="madiMaxGrad"
                      x1="0"
                      y1="0"
                      x2="52"
                      y2="52"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor="#06AFFB" />
                      <stop offset="48%" stopColor="#001CF1" />
                      <stop offset="100%" stopColor="#8900AC" />
                    </linearGradient>
                  </defs>
                  <rect width="52" height="52" rx="16" fill="url(#madiMaxGrad)" />
                  <g transform="translate(4.5, 4)">
                    <path
                      fill="#FFFFFF"
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M22.39 41.89c-3.93 0-5.75-.58-8.9-2.9-2.02 2.61-8.34 4.63-8.62 1.17 0-2.6-.58-4.8-1.22-7.2C2.87 30 2 26.72 2 21.94 2 10.56 11.28 2 22.28 2c11 0 19.63 8.98 19.63 20.06 0 11.07-8.9 19.83-19.52 19.83Zm.2-30.02c-5.22-.27-9.3 3.37-10.2 9.08-.74 4.72.58 10.48 1.7 10.77.54.13 1.9-.98 2.74-1.82 1.39.9 2.97 1.6 4.73 1.7a9.96 9.96 0 0 0 10.4-9.34 10 10 0 0 0-9.37-10.39Z"
                    />
                  </g>
                </svg>
                <span>MAX</span>
              </a>

              {/* 2. Official Telegram (МАДИ в Telegram) */}
              <a
                href="https://t.me/truemadi"
                target="_blank"
                rel="noopener noreferrer"
                title="МАДИ в Telegram"
                data-testid="footer-social-telegram"
                className="group inline-flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-display font-bold text-xs transition hover:-translate-y-0.5 cursor-pointer"
              >
                <svg
                  className="w-7 h-7 shrink-0"
                  viewBox="0 0 1000 1000"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient
                      x1="50%"
                      y1="0%"
                      x2="50%"
                      y2="99.26%"
                      id="madiTgGrad"
                    >
                      <stop stopColor="#2AABEE" offset="0%" />
                      <stop stopColor="#229ED9" offset="100%" />
                    </linearGradient>
                  </defs>
                  <circle fill="url(#madiTgGrad)" cx="500" cy="500" r="500" />
                  <path
                    fill="#FFFFFF"
                    d="M226.33,494.72 C372.09,431.22 469.28,389.35 517.92,369.12 C656.77,311.37 685.63,301.33 704.43,301 C708.57,300.93 717.82,301.96 723.81,306.82 C728.86,310.92 730.26,316.47 730.92,320.36 C731.59,324.25 732.42,333.11 731.76,340.04 C724.23,419.1 691.68,610.96 675.11,699.52 C668.1,736.98 654.3,749.55 640.94,750.78 C611.9,753.45 589.86,731.59 561.73,713.15 C517.73,684.31 492.87,666.35 450.15,638.2 C400.78,605.67 432.79,587.79 460.92,558.57 C468.28,550.92 596.22,434.56 598.69,424 C599,422.68 599.29,417.76 596.36,415.16 C593.44,412.56 589.13,413.45 586.01,414.16 C581.6,415.16 511.3,461.63 375.11,553.56 C355.15,567.26 337.08,573.93 320.89,573.59 C303.03,573.2 268.69,563.49 243.16,555.19 C211.85,545.01 186.96,539.63 189.13,522.35 C190.26,513.34 202.66,504.13 226.33,494.72 Z"
                  />
                </svg>
                <span>Telegram</span>
              </a>

              {/* 3. Official VK (МАДИ ВКонтакте) */}
              <a
                href="https://vk.com/university_madi"
                target="_blank"
                rel="noopener noreferrer"
                title="МАДИ ВКонтакте"
                data-testid="footer-social-vk"
                className="group inline-flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-display font-bold text-xs transition hover:-translate-y-0.5 cursor-pointer"
              >
                <svg
                  className="w-7 h-7 shrink-0"
                  viewBox="0 0 52 52"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M0 24.96C0 13.1937 0 7.31062 3.65531 3.65531C7.31062 0 13.1937 0 24.96 0H27.04C38.8063 0 44.6893 0 48.3447 3.65531C52 7.31062 52 13.1937 52 24.96V27.04C52 38.8063 52 44.6893 48.3447 48.3447C44.6893 52 38.8063 52 27.04 52H24.96C13.1937 52 7.31062 52 3.65531 48.3447C0 44.6893 0 38.8063 0 27.04V24.96Z"
                    fill="#0077FF"
                  />
                  <path
                    d="M27.6684 37.4624C15.8167 37.4624 9.05681 29.3374 8.77515 15.8174H14.7118C14.9068 25.7407 19.2834 29.944 22.75 30.8107V15.8174H28.3403V24.3757C31.7636 24.0074 35.3598 20.1074 36.5732 15.8174H42.1633C41.2316 21.104 37.3316 25.004 34.5583 26.6074C37.3316 27.9074 41.7735 31.3091 43.4635 37.4624H37.3099C35.9883 33.3457 32.6953 30.1607 28.3403 29.7274V37.4624H27.6684Z"
                    fill="white"
                  />
                </svg>
                <span>VK</span>
              </a>
            </div>
          </div>

          {/* About Us / Who Are We? (English-only with small muted video beside it) */}
          <div
            dir="ltr"
            data-testid="landing-about-us-section"
            className="py-5 border-b border-slate-100 flex flex-row items-center justify-between gap-4 sm:gap-6 text-left"
          >
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="inline-flex items-center gap-2 text-[11px] font-display font-extrabold uppercase tracking-wider text-brand-blue">
                <span>Who Are We?</span>
              </div>
              <h3 className="text-sm sm:text-base font-display font-black text-slate-900 leading-snug">
                I am student <span className="text-brand-blue">Besskek Billel Anisse</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-xl">
                I created this application based on my previous experience.
              </p>
            </div>

            <div className="shrink-0 w-28 h-24 sm:w-32 sm:h-28 bg-white flex items-center justify-center overflow-hidden">
              <video
                src="/assets/aistudio/gemini_generated_video_d8d0f419_ba9d5bac.mp4"
                data-testid="landing-about-us-video"
                autoPlay
                loop
                muted
                playsInline
                disablePictureInPicture
                controlsList="nodownload nofullscreen noremoteplayback"
                onLoadedMetadata={(e) => {
                  e.currentTarget.muted = true;
                  e.currentTarget.volume = 0;
                }}
                onPlay={(e) => {
                  e.currentTarget.muted = true;
                  e.currentTarget.volume = 0;
                }}
                className="w-full h-full object-contain pointer-events-none select-none mix-blend-multiply brightness-[1.15] contrast-[1.08] saturate-[1.05] [mask-image:radial-gradient(closest-side,black_78%,transparent_100%)]"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <MadingoWordmark size="sm" />
              <span>{t('landing.footerCopy')}</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onOpenPrivacy}
                className="hover:text-slate-900 cursor-pointer font-medium hover:underline"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={onOpenTerms}
                className="hover:text-slate-900 cursor-pointer font-medium hover:underline"
              >
                Terms of Service
              </button>
              <button
                type="button"
                onClick={onOpenContact}
                className="hover:text-slate-900 cursor-pointer font-medium hover:underline"
              >
                Contact MADI
              </button>
            </div>
          </div>
        </footer>
      </main>

      {/* H) Mobile Sticky Bottom Bar (appears after hero scrolls out of view) */}
      {showStickyBottomBar && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <MishaMascot expression="cheering" size={40} />
            <div>
              <div className="text-xs font-bold text-slate-900">madingo</div>
              <div className="text-[10px] text-slate-500">{t('landing.statsFree')}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onStartOnboarding}
            className="px-6 py-2.5 rounded-xl bg-accent-orange text-brand-navy text-xs font-display font-black shadow-md hover:brightness-110 transition cursor-pointer"
          >
            {t('landing.startCta')}
          </button>
        </div>
      )}
    </div>
  );
};

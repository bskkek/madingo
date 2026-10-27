import React, { useMemo, useState } from 'react';
import {
  Award,
  BellRing,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  EyeOff,
  Flame,
  Fuel,
  Lock,
  Palette,
  Plus,
  Shield,
  Sparkles,
  Trophy,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import {
  BadgeCategory,
  ClassChallenge,
  CosmeticItem,
  FacultyStanding,
  FriendConnection,
  LEAGUE_TIERS,
  LeagueParticipant,
  LeagueTierId,
  PHASE4_BADGES,
  PHASE4_COSMETICS,
  Phase4Badge,
} from '../data/phase4Data';
import {
  canSendFriendNudge,
  computeLeagueStandingsAndZone,
  LearnerQuest,
} from '../lib/phase4Engine';
import { useI18n } from '../lib/i18n';
import { playSoundEffect } from '../lib/audio';
import { DriverAvatarIcon, MishaMascot } from './BrandVisuals';

interface Phase4LeaguesAndBadgesViewProps {
  userId: string;
  userNickname: string;
  userAvatarId: string;
  userRole: string;
  weeklyFuel: number;
  streakDays: number;
  wordsLearnedCount: number;
  bestSpeakingScore: number;
  soundEnabled: boolean;
  leagueParticipants: LeagueParticipant[];
  facultyBoard: FacultyStanding[];
  classChallenges: ClassChallenge[];
  friends: FriendConnection[];
  unlockedBadgeIds: string[];
  unlockedCosmeticIds: string[];
  equippedCarSkin: string;
  equippedMascotOutfit: string;
  equippedMapTheme: string;
  quests: LearnerQuest[];
  optedOutOfLeaderboard: boolean;
  onToggleLeaderboardOptOut: (nextVal: boolean) => void;
  onAddFriendByCode: (code: string) => void;
  onSendNudge: (friendId: string) => { allowed: boolean; message: string };
  onCreateClassChallenge: (title: string, groupName: string, targetFuel: number) => void;
  onEquipCosmetic: (item: CosmeticItem) => void;
}

const BADGE_CATEGORIES: { id: 'all' | BadgeCategory; labelEn: string; labelRu: string }[] = [
  { id: 'all', labelEn: 'All 40 Badges', labelRu: 'Все 40 значков' },
  { id: 'consistency', labelEn: 'Consistency', labelRu: 'Регулярность' },
  { id: 'accuracy', labelEn: 'Accuracy', labelRu: 'Точность' },
  { id: 'speaking', labelEn: 'Speaking', labelRu: 'Речь' },
  { id: 'typing_speed', labelEn: 'Typing Speed', labelRu: 'Скорость печати' },
  { id: 'dictionary_explorer', labelEn: 'Dictionary', labelRu: 'Словарь' },
  { id: 'garage_hero', labelEn: 'Garage Hero', labelRu: 'Герой Гаража' },
  { id: 'grammar_signs', labelEn: 'Grammar Signs', labelRu: 'Дорожные знаки' },
  { id: 'helpers', labelEn: 'Helpers & Social', labelRu: 'Помощники и Лиги' },
];

/**
 * Renders an original custom SVG emblem for each of the 40 badges
 */
export const OriginalBadgeSvg: React.FC<{
  badge: Phase4Badge;
  unlocked: boolean;
  size?: number;
}> = ({ badge, unlocked, size = 56 }) => {
  const fillPrimary = unlocked ? badge.accentColor : '#94A3B8';
  const fillBg = unlocked ? '#0F1E3A' : '#E2E8F0';
  const strokeRing = unlocked ? '#FF8A1F' : '#CBD5E1';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className="shrink-0"
      aria-label={badge.title.en}
    >
      <polygon
        points="32,4 56,18 56,46 32,60 8,46 8,18"
        fill={fillBg}
        stroke={strokeRing}
        strokeWidth="3"
      />
      <circle cx="32" cy="32" r="18" fill={fillPrimary} opacity={unlocked ? 0.95 : 0.45} />
      {badge.category === 'consistency' && (
        <path
          d="M32 18 L37 30 L46 32 L35 40 L37 48 L32 42 L27 48 L29 40 L18 32 L27 30 Z"
          fill="#FFFFFF"
        />
      )}
      {badge.category === 'accuracy' && (
        <>
          <circle cx="32" cy="32" r="10" fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
          <circle cx="32" cy="32" r="4" fill="#FFFFFF" />
        </>
      )}
      {badge.category === 'speaking' && (
        <>
          <rect x="28" y="20" width="8" height="14" rx="4" fill="#FFFFFF" />
          <path d="M23 29 A9 9 0 0 0 41 29" fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
          <line x1="32" y1="38" x2="32" y2="45" stroke="#FFFFFF" strokeWidth="2.5" />
        </>
      )}
      {badge.category === 'typing_speed' && (
        <>
          <rect x="20" y="24" width="24" height="16" rx="3" fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
          <text x="32" y="36" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="800">
            Я
          </text>
        </>
      )}
      {badge.category === 'dictionary_explorer' && (
        <path
          d="M22 22 H31 V42 H22 Z M33 22 H42 V42 H33 Z"
          fill="#FFFFFF"
        />
      )}
      {badge.category === 'garage_hero' && (
        <path
          d="M24 24 L40 40 M40 24 L24 40"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeLinecap="round"
        />
      )}
      {badge.category === 'grammar_signs' && (
        <polygon points="32,19 45,32 32,45 19,32" fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
      )}
      {badge.category === 'helpers' && (
        <path d="M22 36 L32 22 L42 36 H35 V44 H29 V36 Z" fill="#FFFFFF" />
      )}
    </svg>
  );
};

export const Phase4LeaguesAndBadgesView: React.FC<Phase4LeaguesAndBadgesViewProps> = ({
  userId,
  userNickname,
  userAvatarId,
  userRole,
  weeklyFuel,
  streakDays,
  wordsLearnedCount,
  bestSpeakingScore,
  soundEnabled,
  leagueParticipants,
  facultyBoard,
  classChallenges,
  friends,
  unlockedBadgeIds,
  unlockedCosmeticIds,
  equippedCarSkin,
  equippedMascotOutfit,
  equippedMapTheme,
  quests,
  optedOutOfLeaderboard,
  onToggleLeaderboardOptOut,
  onAddFriendByCode,
  onSendNudge,
  onCreateClassChallenge,
  onEquipCosmetic,
}) => {
  const { lang } = useI18n();
  const [subTab, setSubTab] = useState<'leagues' | 'faculty' | 'friends' | 'badges'>('leagues');
  const [selectedTierId, setSelectedTierId] = useState<LeagueTierId>('campus_street');
  const [showWeeklyRecapModal, setShowWeeklyRecapModal] = useState(false);

  // Friends state
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [nudgeFeedback, setNudgeFeedback] = useState<string | null>(null);
  const [allowIncomingNudges, setAllowIncomingNudges] = useState(true);

  // Teacher challenge creation state
  const [newChallengeTitle, setNewChallengeTitle] = useState('');
  const [newChallengeGroup, setNewChallengeGroup] = useState('MADI-Prep-101');
  const [newChallengeTarget, setNewChallengeTarget] = useState(2500);

  // Badges filter & celebration modal
  const [selectedBadgeCategory, setSelectedBadgeCategory] = useState<'all' | BadgeCategory>('all');
  const [celebratingBadge, setCelebratingBadge] = useState<Phase4Badge | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  const mergedParticipants = useMemo(() => {
    const withCurrentUser: LeagueParticipant[] = [
      ...leagueParticipants.filter((p) => p.userId !== userId),
      {
        userId,
        nickname: userNickname || 'MADI_Driver',
        avatarId: userAvatarId || 'misha-cap',
        facultyCode: 'FDS',
        weeklyFuel,
        streakDays,
        isCurrentUser: true,
        optedOutOfLeaderboard,
      },
    ];
    return computeLeagueStandingsAndZone(withCurrentUser, selectedTierId);
  }, [
    leagueParticipants,
    userId,
    userNickname,
    userAvatarId,
    weeklyFuel,
    streakDays,
    optedOutOfLeaderboard,
    selectedTierId,
  ]);

  const userRankObj = mergedParticipants.standings.find((p) => p.isCurrentUser);

  const filteredBadges = useMemo(() => {
    if (selectedBadgeCategory === 'all') return PHASE4_BADGES;
    return PHASE4_BADGES.filter((b) => b.category === selectedBadgeCategory);
  }, [selectedBadgeCategory]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-28 space-y-6">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Trophy className="w-7 h-7 text-accent-orange" />
            <span>
              {lang === 'ru'
                ? 'Лиги, Достижения и Бесплатный Тюнинг'
                : lang === 'ar'
                ? 'الدوريات الأسبوعية، الإنجازات والمكافآت المجانية'
                : lang === 'fr'
                ? 'Ligues hebdomadaires, Badges & Cosmétiques gratuits'
                : 'Weekly Leagues, 40 Badges & Free Cosmetics'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            {lang === 'ru'
              ? 'Соревнуйтесь по недельному топливу в оригинальных дорожных дивизионах, открывайте 40 значков и бесплатные скины.'
              : 'Compete by weekly Fuel across original road divisions, unlock 40 SVG badges, and customize your car & Misha—100% free.'}
          </p>
        </div>

        <button
          type="button"
          data-testid="open-weekly-recap-btn"
          onClick={() => setShowWeeklyRecapModal(true)}
          className="min-h-[42px] px-4 py-2 rounded-2xl bg-brand-navy text-white font-display font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm hover:opacity-95 cursor-pointer self-start"
        >
          <Sparkles className="w-4 h-4 text-accent-orange" />
          <span>
            {lang === 'ru' ? 'Итоги недели с Мишей' : 'Weekly Recap with Misha'}
          </span>
        </button>
      </div>

      {/* Sub-Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          {
            id: 'leagues' as const,
            icon: Trophy,
            label: lang === 'ru' ? '1. Недельные лиги (~30)' : '1. Weekly Leagues (~30)',
          },
          {
            id: 'faculty' as const,
            icon: Shield,
            label: lang === 'ru' ? '2. Кубок факультетов' : '2. Faculty & Class Cup',
          },
          {
            id: 'friends' as const,
            icon: Users,
            label: lang === 'ru' ? '3. Друзья и сигналы' : '3. Friends & Nudges',
          },
          {
            id: 'badges' as const,
            icon: Award,
            label:
              lang === 'ru'
                ? `4. Значки (${unlockedBadgeIds.length}/40) и Скины`
                : `4. Badges (${unlockedBadgeIds.length}/40) & Skins`,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              data-testid={`social-subtab-${tab.id}`}
              onClick={() => setSubTab(tab.id)}
              className={`min-h-[46px] px-3.5 py-2 rounded-2xl font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border-2 transition cursor-pointer ${
                active
                  ? 'border-brand-blue dark:border-accent-orange bg-brand-blue text-white dark:bg-slate-800'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: WEEKLY LEAGUES (~30 LEARNERS) */}
      {subTab === 'leagues' && (
        <div className="space-y-6">
          {/* 6 Original Road-Themed Tier Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {LEAGUE_TIERS.map((tier) => {
              const active = selectedTierId === tier.id;
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setSelectedTierId(tier.id)}
                  className={`p-3 rounded-2xl border-2 text-start transition cursor-pointer ${
                    active
                      ? 'border-brand-blue dark:border-accent-orange bg-blue-50/70 dark:bg-slate-800 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full mb-1.5"
                    style={{ backgroundColor: tier.accentColor }}
                  />
                  <div className="font-display font-extrabold text-xs text-slate-900 dark:text-white">
                    {tier.title[lang]}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Privacy & Anti-Cheat Notice Bar */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="font-display font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>{mergedParticipants.tier.title[lang]}</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-mono">
                  Anti-Cheat Protected (Max 200 Fuel / 15m)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {mergedParticipants.tier.subtitle[lang]} · Showing nicknames & avatars only.
              </p>
            </div>

            <button
              type="button"
              data-testid="toggle-leaderboard-optout"
              onClick={() => onToggleLeaderboardOptOut(!optedOutOfLeaderboard)}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                optedOutOfLeaderboard
                  ? 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
                  : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <EyeOff className="w-4 h-4" />
              <span>
                {optedOutOfLeaderboard
                  ? 'Opted Out of Public Board (Click to Rejoin)'
                  : 'Privacy: Hide Me from Leaderboard'}
              </span>
            </button>
          </div>

          {/* ~30 Learners High-Density League Table */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="max-h-[540px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {mergedParticipants.standings.map((member) => {
                const isPromo = member.zone === 'promotion';
                const isDemo = member.zone === 'demotion';
                return (
                  <div
                    key={member.userId}
                    className={`px-4 sm:px-6 py-3 flex items-center justify-between gap-4 text-sm ${
                      member.isCurrentUser
                        ? 'bg-amber-50/80 dark:bg-amber-950/30 font-bold'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-lg font-mono font-extrabold text-xs flex items-center justify-center shrink-0 ${
                          isPromo
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : isDemo
                            ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {member.rank}
                      </span>
                      <DriverAvatarIcon avatarId={member.avatarId} size={32} />
                      <div className="min-w-0">
                        <div className="font-display font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
                          <span>{member.nickname}</span>
                          {member.isCurrentUser && (
                            <span className="px-2 py-0.5 rounded-md bg-brand-blue text-white text-[10px]">
                              YOU
                            </span>
                          )}
                          <span className="text-[11px] font-mono text-slate-400">
                            [{member.facultyCode}]
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span>{member.streakDays} km streak</span>
                          {isPromo && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                              <ChevronUp className="w-3.5 h-3.5" /> Promotion Zone
                            </span>
                          )}
                          {isDemo && (
                            <span className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-0.5">
                              <ChevronDown className="w-3.5 h-3.5" /> Demotion Zone
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono font-extrabold text-accent-orange tabular-nums shrink-0">
                      <Fuel className="w-4 h-4" />
                      <span>{member.weeklyFuel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: FACULTY COMPETITION & PRIVATE CLASS CHALLENGES */}
      {subTab === 'faculty' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xs">
            <h2 className="text-lg font-display font-extrabold text-slate-900 dark:text-white">
              {lang === 'ru'
                ? 'Межфакультетский кубок МАДИ (Недельный зачёт)'
                : 'MADI Inter-Faculty Weekly Cup'}
            </h2>
            <div className="space-y-3">
              {facultyBoard.map((fac, idx) => (
                <div
                  key={fac.code}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-blue text-white font-mono font-extrabold text-sm flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="font-display font-bold text-sm text-slate-900 dark:text-white">
                        {fac.name[lang]}
                      </div>
                      <div className="text-xs text-slate-500">
                        {fac.activeStudents} active drivers · Avg Accuracy {fac.avgAccuracy}%
                      </div>
                    </div>
                  </div>
                  <div className="text-end font-mono font-extrabold text-accent-orange tabular-nums">
                    {fac.weeklyFuelTotal.toLocaleString()} Fuel
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-xs">
            <h2 className="text-lg font-display font-extrabold text-slate-900 dark:text-white">
              {lang === 'ru'
                ? 'Закрытые челленджи учебных групп'
                : 'Private Teacher Class Challenges'}
            </h2>

            <div className="space-y-3">
              {classChallenges.length === 0 && (
                <div className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500 text-center">
                  {lang === 'ru'
                    ? 'Нет активных челленджей групп — преподаватели могут создать их ниже.'
                    : 'No active class challenges yet — teachers can create one below.'}
                </div>
              )}
              {classChallenges.map((ch) => {
                const pct = Math.min(100, Math.round((ch.currentFuel / ch.targetFuel) * 100));
                return (
                  <div
                    key={ch.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-bold text-brand-blue dark:text-sky-400">
                        {ch.groupName}
                      </span>
                      <span>{ch.teacherName}</span>
                    </div>
                    <div className="font-display font-bold text-sm text-slate-900 dark:text-white">
                      {ch.title[lang]}
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-accent-orange rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span>
                        {ch.currentFuel} / {ch.targetFuel} Fuel ({pct}%)
                      </span>
                      <span>{ch.participantsCount} students</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {(userRole === 'teacher' || userRole === 'admin') && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="text-xs font-display font-bold text-slate-900 dark:text-white">
                  Create Private Class Challenge (Teacher)
                </div>
                <input
                  type="text"
                  value={newChallengeTitle}
                  onChange={(e) => setNewChallengeTitle(e.target.value)}
                  placeholder="Challenge title (e.g. Unit 4 Motion Verbs Sprint)"
                  className="w-full min-h-[38px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newChallengeGroup}
                    onChange={(e) => setNewChallengeGroup(e.target.value)}
                    className="flex-1 min-h-[38px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newChallengeTitle.trim()) return;
                      onCreateClassChallenge(
                        newChallengeTitle.trim(),
                        newChallengeGroup,
                        newChallengeTarget
                      );
                      setNewChallengeTitle('');
                    }}
                    className="min-h-[38px] px-4 rounded-xl bg-brand-blue text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: FRIENDS BY CODE, SHARED STREAK & FRIENDLY NUDGE */}
      {subTab === 'friends' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-xs">
            <h2 className="text-lg font-display font-extrabold text-slate-900 dark:text-white">
              {lang === 'ru' ? 'Добавить друга по коду' : 'Add Study Friend by Code'}
            </h2>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">Your Personal Friend Code</div>
                <div className="font-mono font-extrabold text-lg text-brand-blue dark:text-accent-orange">
                  MADI-2026
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText('MADI-2026').catch(() => {})}
                className="min-h-[38px] px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer"
              >
                Copy Code
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                data-testid="friend-code-input"
                value={friendCodeInput}
                onChange={(e) => setFriendCodeInput(e.target.value)}
                placeholder="Enter code (e.g. MADI-5510)"
                className="flex-1 min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono"
              />
              <button
                type="button"
                data-testid="add-friend-btn"
                onClick={() => {
                  if (!friendCodeInput.trim()) return;
                  onAddFriendByCode(friendCodeInput.trim().toUpperCase());
                  setFriendCodeInput('');
                }}
                className="min-h-[44px] px-4 rounded-xl bg-brand-blue text-white font-display font-bold text-xs sm:text-sm cursor-pointer"
              >
                Add Friend
              </button>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Allow Friendly Nudges from Co-Drivers
              </span>
              <button
                type="button"
                onClick={() => setAllowIncomingNudges(!allowIncomingNudges)}
                className={`min-h-[36px] px-3 rounded-xl text-xs font-bold cursor-pointer ${
                  allowIncomingNudges
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600'
                }`}
              >
                {allowIncomingNudges ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-extrabold text-slate-900 dark:text-white">
                {lang === 'ru'
                  ? 'Попутчики и дружеские напоминания'
                  : 'Study Friends & Friendly Nudges (Rate-Limited 1 / 12h)'}
              </h2>
            </div>

            {nudgeFeedback && (
              <div
                data-testid="nudge-feedback-banner"
                className="p-3 rounded-xl bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-xs font-semibold text-brand-blue dark:text-sky-400"
              >
                {nudgeFeedback}
              </div>
            )}

            <div className="space-y-3">
              {friends.length === 0 && (
                <div className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500 text-center">
                  {lang === 'ru'
                    ? 'Пока нет добавленных друзей — поделитесь своим кодом или введите код друга.'
                    : 'No study friends added yet — share your code or enter a friend code.'}
                </div>
              )}
              {friends.map((fr) => {
                const check = canSendFriendNudge(fr);
                return (
                  <div
                    key={fr.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <DriverAvatarIcon avatarId={fr.avatarId} size={42} />
                      <div>
                        <div className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{fr.nickname}</span>
                          <span className="text-xs font-mono text-slate-400">
                            ({fr.friendCode})
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                          <span className="text-accent-orange font-bold flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5" /> {fr.sharedStreakDays}d Friend Streak
                          </span>
                          <span>· {fr.lastActiveText[lang]}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      data-testid={`nudge-friend-${fr.id}`}
                      disabled={!check.allowed}
                      onClick={() => {
                        const res = onSendNudge(fr.id);
                        setNudgeFeedback(res.message);
                      }}
                      className={`min-h-[40px] px-3.5 py-1.5 rounded-xl font-display font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                        check.allowed
                          ? 'bg-accent-orange text-brand-navy hover:brightness-105'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <BellRing className="w-4 h-4" />
                      <span>
                        {check.allowed ? 'Send Friendly Nudge' : 'Nudged (12h Limit)'}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: 40 BADGES, DAILY/WEEKLY QUESTS & 100% FREE COSMETICS */}
      {subTab === 'badges' && (
        <div className="space-y-8">
          {/* Daily (3) & Weekly (3) Quests */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-brand-blue dark:text-accent-orange" />
                <span>
                  {lang === 'ru'
                    ? 'Ежедневные (3) и Недельные (3) квесты по слабым темам'
                    : 'Daily (3) & Weekly (3) Personalized Quests'}
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quests.map((q) => {
                const pct = Math.min(100, Math.round((q.progress / Math.max(1, q.target)) * 100));
                return (
                  <div
                    key={q.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-slate-700 text-brand-blue dark:text-sky-300 font-bold uppercase">
                        {q.cadence}
                      </span>
                      <span className="font-mono font-extrabold text-accent-orange">
                        +{q.rewardFuel} Fuel
                      </span>
                    </div>
                    <div className="font-display font-bold text-sm text-slate-900 dark:text-white">
                      {q.title[lang]}
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                      <span>
                        Progress: {q.progress} / {q.target}
                      </span>
                      {q.completed && (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 100% Free Cosmetics Customizer (Vehicle Skins, Misha Outfits, Map Themes) */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-display font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Palette className="w-5 h-5 text-accent-orange" />
                  <span>
                    {lang === 'ru'
                      ? 'Тюнинг-ателье Миши (100% бесплатно — только за учёбу)'
                      : "Misha's Cosmetic Customization Studio (100% Free — Zero Pay-to-Win)"}
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Equip unlocked car skins, Misha mascot outfits, and Moscow seasonal map themes.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {PHASE4_COSMETICS.map((item) => {
                const isUnlocked =
                  item.unlockedByDefault || unlockedCosmeticIds.includes(item.id);
                const isEquipped =
                  equippedCarSkin === item.id ||
                  equippedMascotOutfit === item.id ||
                  equippedMapTheme === item.id;

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border-2 flex flex-col justify-between gap-3 ${
                      isEquipped
                        ? 'border-brand-blue dark:border-accent-orange bg-blue-50/50 dark:bg-slate-800'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {item.type.replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-1">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/40"
                            style={{ backgroundColor: item.previewColorPrimary }}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/40"
                            style={{ backgroundColor: item.previewColorSecondary }}
                          />
                        </div>
                      </div>
                      <div className="font-display font-bold text-sm text-slate-900 dark:text-white">
                        {item.title[lang]}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.description[lang]}
                      </p>
                    </div>

                    {isUnlocked ? (
                      <button
                        type="button"
                        onClick={() => onEquipCosmetic(item)}
                        className={`min-h-[38px] px-3 rounded-xl font-display font-bold text-xs cursor-pointer ${
                          isEquipped
                            ? 'bg-emerald-600 text-white'
                            : 'bg-brand-blue text-white hover:opacity-95'
                        }`}
                      >
                        {isEquipped ? 'Equipped on Map' : 'Equip Now (Free)'}
                      </button>
                    ) : (
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span>{item.unlockRequirementText[lang]}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 40 Original Badges Grid */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-display font-extrabold text-slate-900 dark:text-white">
                  {lang === 'ru'
                    ? `Коллекция из 40 оригинальных значков (${unlockedBadgeIds.length} открыто)`
                    : `40 Original Achievement Badges (${unlockedBadgeIds.length}/40 Unlocked)`}
                </h2>
                <p className="text-xs text-slate-500">
                  Click any badge to preview its celebration screen. Rules are loaded from declarative JSON.
                </p>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                />
                <span>Reduced-Motion Celebrations</span>
              </label>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {BADGE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedBadgeCategory(cat.id)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                    selectedBadgeCategory === cat.id
                      ? 'bg-brand-blue text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {lang === 'ru' ? cat.labelRu : cat.labelEn}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {filteredBadges.map((badge) => {
                const unlocked = unlockedBadgeIds.includes(badge.id);
                return (
                  <button
                    key={badge.id}
                    type="button"
                    data-testid={`badge-item-${badge.id}`}
                    onClick={() => {
                      setCelebratingBadge(badge);
                      playSoundEffect('correct', soundEnabled);
                    }}
                    className={`p-4 rounded-2xl border text-start flex items-start gap-3.5 transition cursor-pointer ${
                      unlocked
                        ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-slate-800 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <OriginalBadgeSvg badge={badge} unlocked={unlocked} size={52} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-mono font-bold uppercase text-accent-orange">
                          {badge.rarity}
                        </span>
                        {unlocked && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                      </div>
                      <div className="font-display font-bold text-sm text-slate-900 dark:text-white leading-snug mt-0.5">
                        {badge.title[lang]}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {badge.description[lang]}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* WEEKLY RECAP MODAL WITH MISHA */}
      {showWeeklyRecapModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            data-testid="weekly-recap-modal"
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl text-center space-y-5"
          >
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowWeeklyRecapModal(false)}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-center">
              <MishaMascot expression="cheering" size={110} />
            </div>

            <div>
              <span className="text-xs font-mono font-bold text-accent-orange uppercase">
                MISHA&apos;S WEEKLY LOGBOOK
              </span>
              <h2 className="text-2xl font-display font-extrabold text-slate-900 dark:text-white mt-1">
                {lang === 'ru' ? 'Ваши итоги недели на трассе МАДИ' : 'Your Weekly MADI Highway Recap'}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 text-start">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-xs text-slate-500">Km Traveled</div>
                <div className="font-mono font-extrabold text-xl text-brand-blue dark:text-sky-400">
                  {streakDays} km
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-xs text-slate-500">Words Learned</div>
                <div className="font-mono font-extrabold text-xl text-emerald-600">
                  {wordsLearnedCount} words
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-xs text-slate-500">Best Speaking Score</div>
                <div className="font-mono font-extrabold text-xl text-accent-orange">
                  {bestSpeakingScore}%
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-xs text-slate-500">Current League Rank</div>
                <div className="font-mono font-extrabold text-xl text-emerald-600">
                  #{userRankObj?.rank || 1} / {mergedParticipants.standings.length}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowWeeklyRecapModal(false)}
              className="w-full min-h-[48px] rounded-2xl bg-brand-blue text-white font-display font-bold text-sm cursor-pointer"
            >
              Keep Driving!
            </button>
          </div>
        </div>
      )}

      {/* BADGE CELEBRATION MODAL (WITH REDUCED-MOTION SUPPORT) */}
      {celebratingBadge && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center space-y-4 shadow-2xl ${
              reducedMotion ? '' : 'transition-transform duration-300 scale-100'
            }`}
          >
            <div className="flex justify-center">
              <OriginalBadgeSvg badge={celebratingBadge} unlocked={true} size={88} />
            </div>
            <div className="text-xs font-mono font-bold uppercase text-accent-orange">
              {celebratingBadge.rarity} BADGE · {celebratingBadge.category}
            </div>
            <h3 className="text-xl font-display font-extrabold text-slate-900 dark:text-white">
              {celebratingBadge.title[lang]}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {celebratingBadge.description[lang]}
            </p>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-500">
              Rule: {celebratingBadge.unlockRule.metric} {celebratingBadge.unlockRule.operator}{' '}
              {celebratingBadge.unlockRule.threshold}
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => playSoundEffect('complete', soundEnabled)}
                className="min-h-[42px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />Chime
              </button>
              <button
                type="button"
                onClick={() => setCelebratingBadge(null)}
                className="flex-1 min-h-[42px] rounded-xl bg-brand-blue text-white font-display font-bold text-xs cursor-pointer"
              >
                Awesome
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import {
  Star,
  Lock,
  Play,
  Wrench,
  Compass,
  ShieldCheck,
  Award,
  CheckCircle2,
  Disc,
  Volume2,
  Signpost,
  X,
  Clock,
  Sparkles,
  Milestone,
  FlaskConical,
} from 'lucide-react';
import {
  CURRICULUM_UNITS,
  CurriculumLesson,
  DICTIONARY_WORDS,
  GRAMMAR_ROAD_SIGNS,
} from '../data/curriculum';
import { useI18n } from '../lib/i18n';
import {
  computeLessonNodeStatuses,
  evaluateBadges,
  getOrderedLessonIds,
  StreakState,
} from '../lib/rules';
import { isLessonCachedOffline } from '../lib/offlineCache';
import { speakRussian } from '../lib/audio';
import { CarSprite, MishaMascot, VocabIllustration } from './BrandVisuals';
import { SmartPersonalizationCard } from './Phase4NotificationsAndLegal';
import { TodayForYouRecommendation } from '../lib/phase4Engine';
import { PHASE4_COSMETICS } from '../data/phase4Data';

interface RoadMapViewProps {
  completedLessonIds: string[];
  accuracyByLesson: Record<string, number>;
  streak: StreakState;
  totalFuel: number;
  goalMinutes: number;
  todayMinutesCompleted: number;
  soundEnabled?: boolean;
  dueGarageCount?: number;
  onStartLesson: (lesson: CurriculumLesson) => void;
  onOpenGarage?: () => void;
  onOpenDictionary?: () => void;
  onOpenDevExercises?: () => void;
  onOpenExamsAndPlacement?: () => void;
  onOpenLeaguesAndBadges?: () => void;
  todayRecommendation?: TodayForYouRecommendation;
  onExecuteRecommendation?: (rec: TodayForYouRecommendation) => void;
  equippedCarSkin?: string;
  equippedMapTheme?: string;
  teacherAssignments?: { id: string; targetId: string; title: string; dueDate: string }[];
  customPublishedLessons?: any[];
}

const RoadBarrierIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="7" width="20" height="10" rx="2" fill="#FF8A1F" stroke="#1B2A4A" strokeWidth="1.5" />
    <line x1="6" y1="7" x2="10" y2="17" stroke="#ffffff" strokeWidth="2.5" />
    <line x1="10" y1="7" x2="14" y2="17" stroke="#FF8A1F" strokeWidth="2.5" />
    <line x1="14" y1="7" x2="18" y2="17" stroke="#ffffff" strokeWidth="2.5" />
    <line x1="5" y1="19" x2="5" y2="22" stroke="#475569" strokeWidth="2.5" />
    <line x1="19" y1="19" x2="19" y2="22" stroke="#475569" strokeWidth="2.5" />
  </svg>
);

const UNIT_MASCOTS = [
  { sprite: '/assets/madi-crew/sprites/engineer.png', name: 'Madi Engineer' },
  { sprite: '/assets/madi-crew/sprites/kid.png', name: 'Madi Kid' },
  { sprite: '/assets/madi-crew/sprites/professor.png', name: 'Madi Professor' },
  { sprite: '/assets/madi-crew/sprites/builder.png', name: 'Madi Builder' },
  { sprite: '/assets/madi-crew/sprites/girl.png', name: 'Madi Girl' },
];

export const RoadMapView: React.FC<RoadMapViewProps> = ({
  completedLessonIds,
  accuracyByLesson,
  streak,
  totalFuel,
  goalMinutes,
  todayMinutesCompleted,
  soundEnabled = true,
  dueGarageCount = 0,
  onStartLesson,
  onOpenGarage,
  onOpenDictionary,
  onOpenDevExercises,
  onOpenExamsAndPlacement,
  onOpenLeaguesAndBadges,
  todayRecommendation,
  onExecuteRecommendation,
  equippedCarSkin = 'car_classic_blue',
  equippedMapTheme = 'theme_autumn_madi',
  teacherAssignments = [],
  customPublishedLessons = [],
}) => {
  const { lang, t } = useI18n();
  const [showRoadSignsModal, setShowRoadSignsModal] = useState(false);

  const orderedIds = getOrderedLessonIds();
  const statuses = computeLessonNodeStatuses(orderedIds, completedLessonIds);
  const badges = evaluateBadges(completedLessonIds, streak);

  const activeThemeObj =
    PHASE4_COSMETICS.find((c) => c.id === equippedMapTheme) || PHASE4_COSMETICS[10];
  const activeCarObj =
    PHASE4_COSMETICS.find((c) => c.id === equippedCarSkin) || PHASE4_COSMETICS[0];

  const goalProgressPct = Math.min(
    100,
    Math.round((todayMinutesCompleted / Math.max(1, goalMinutes)) * 100)
  );

  // Static vocabulary has been replaced by the live AI Instant Translator.

  const getLandmarkIcon = (landmarkKey: string) => {
    if (landmarkKey === 'garage') return Wrench;
    if (landmarkKey === 'sign_garage') return Signpost;
    if (landmarkKey === 'river_bridge') return Milestone;
    if (landmarkKey === 'metro') return Clock;
    if (landmarkKey === 'vdnkh') return Sparkles;
    return Compass;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-28">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8">
          {CURRICULUM_UNITS.map((unit, unitIdx) => {
            const isSignUnit = unit.id === 'unit-signs';
            const mascot = UNIT_MASCOTS[unitIdx % UNIT_MASCOTS.length];

            return (
              <section
                key={unit.id}
                className="bg-white dark:bg-slate-900 border-0 shadow-none overflow-hidden"
              >
                <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-slate-800/80 p-1 flex items-center justify-center shrink-0 border border-amber-200/60 dark:border-slate-700 shadow-xs relative overflow-hidden">
                      <img
                        src={mascot.sprite}
                        alt={mascot.name}
                        className="w-12 h-12 object-contain select-none transform hover:scale-110 transition duration-200"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-display font-extrabold text-slate-900 dark:text-white">
                          {unit.title[lang]}
                        </h2>
                        <img
                          src={mascot.sprite}
                          alt=""
                          className="w-6 h-6 object-contain inline-block opacity-90 shrink-0"
                        />
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        {unit.subtitle[lang]}
                      </p>
                    </div>
                  </div>

                  {isSignUnit && (
                    <button
                      type="button"
                      onClick={() => setShowRoadSignsModal(true)}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-accent-orange text-brand-navy font-display font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Signpost className="w-4 h-4" />
                      <span>{t('map.roadSignsBtn')}</span>
                    </button>
                  )}
                </div>

                <div className="p-5 sm:p-8 relative">
                  <div
                    className="absolute top-6 bottom-6 start-10 sm:start-14 w-9 rounded-full bg-road border-x-2 border-slate-600 flex justify-center"
                    aria-hidden="true"
                  >
                    <div className="h-full border-s-2 border-dashed border-lane/75" />
                  </div>

                  <div className="space-y-5 relative z-10">
                    {unit.lessons.map((lesson) => {
                      const status = statuses[lesson.id] || 'locked';
                      const isCompleted = status === 'completed';
                      const isCurrent = status === 'current';
                      const isLocked = status === 'locked';
                      const accuracy = accuracyByLesson[lesson.id];
                      const cachedOffline = isLessonCachedOffline(lesson.id);

                      return (
                        <div
                          key={lesson.id}
                          className="flex items-center gap-4 sm:gap-6 p-3 sm:p-4 bg-transparent border-0 shadow-none transition"
                        >
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              disabled={isLocked}
                              onClick={() => onStartLesson(lesson)}
                              aria-label={`${lesson.title[lang]} (${status})`}
                              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-display font-extrabold text-lg shadow-md transition cursor-pointer disabled:cursor-not-allowed ${
                                isCompleted
                                  ? 'bg-success text-white ring-4 ring-emerald-500/20'
                                  : isCurrent
                                  ? 'bg-accent-orange text-brand-navy ring-4 ring-accent-orange/30'
                                  : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {isCompleted ? (
                                <Star className="w-7 h-7 fill-current" />
                              ) : isCurrent ? (
                                <Play className="w-7 h-7 fill-current ms-0.5" />
                              ) : (
                                <RoadBarrierIcon className="w-7 h-7 text-amber-500" />
                              )}
                            </button>

                            {isCurrent && (
                              <div className="absolute -top-6 -start-2 animate-car-idle pointer-events-none">
                                <CarSprite className="w-14 h-9" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                                <span>KM {lesson.orderIndex}.0</span>
                                <span aria-hidden="true">·</span>
                                <span>{lesson.estimatedMinutes} min</span>
                                {isCompleted && accuracy !== undefined && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="text-success font-semibold">
                                      {accuracy}%
                                    </span>
                                  </>
                                )}
                                {cachedOffline && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span>Offline</span>
                                  </>
                                )}
                              </div>

                              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-snug mt-0.5 flex items-center gap-2 flex-wrap">
                                <span>{lesson.title[lang]}</span>
                                {teacherAssignments
                                  .filter((a) => a.targetId === lesson.id)
                                  .map((a) => (
                                    <span
                                      key={a.id}
                                      data-testid={`assigned-badge-${lesson.id}`}
                                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 text-[#1B4DFF] text-[11px] font-extrabold"
                                    >
                                      <span>
                                        {t('map.assignedByTeacherBadge', { date: a.dueDate })}
                                      </span>
                                    </span>
                                  ))}
                              </h3>
                              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                                {lesson.description[lang]}
                              </p>
                            </div>

                            {!isLocked && (
                              <div className="shrink-0">
                                <button
                                  type="button"
                                  onClick={() => onStartLesson(lesson)}
                                  className={`w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl font-display font-bold text-xs sm:text-sm transition cursor-pointer whitespace-nowrap ${
                                    isCurrent
                                      ? 'bg-accent-orange text-brand-navy shadow-sm hover:brightness-105'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  {isCurrent
                                    ? t('map.startLessonBtn')
                                    : t('map.replayLessonBtn')}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })}

          <div className="w-full relative rounded-3xl overflow-hidden border-0 shadow-none bg-white dark:bg-slate-900">
            <img
              src="/assets/aistudio/1793067979920_f1e14560.jpg"
              alt="MADI Crew Family in Moscow"
              className="w-full h-auto object-cover select-none"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-6">

          <div className="bg-white dark:bg-slate-900 border-0 p-6 shadow-none space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t('map.dailyGoalLabel')}
                </div>
                <div className="mt-1 text-2xl font-display font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {todayMinutesCompleted} / {goalMinutes} {t('common.minPerDay')}
                </div>
              </div>

              <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    className="text-slate-200 dark:text-slate-800"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    fill="none"
                    stroke="#FF8A1F"
                    strokeWidth="6"
                    strokeDasharray={163.36}
                    strokeDashoffset={163.36 - (163.36 * goalProgressPct) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-xs font-bold tabular-nums">
                  {goalProgressPct}%
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/40 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Disc className="w-4 h-4 text-brand-blue dark:text-accent-orange" />
                <span>
                  {streak.spareTireAvailable
                    ? t('map.spareTireReady')
                    : t('map.spareTireUsed')}
                </span>
              </div>
              <span className="font-semibold tabular-nums">
                {totalFuel} {t('common.fuelUnit')}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border-0 p-6 shadow-none space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white">
                {t('map.achievementsTitle')}
              </h3>
              <Award className="w-5 h-5 text-accent-orange" />
            </div>

            <div className="space-y-3">
              {[
                {
                  id: 'first_lap' as const,
                  title: t('map.badgeFirstLap'),
                  desc: t('map.badgeFirstLapDesc'),
                },
                {
                  id: 'alphabet_master' as const,
                  title: t('map.badgeAlphabetMaster'),
                  desc: t('map.badgeAlphabetMasterDesc'),
                },
                {
                  id: 'three_day_trip' as const,
                  title: t('map.badgeThreeDay'),
                  desc: t('map.badgeThreeDayDesc'),
                },
              ].map((b) => {
                const unlocked = badges.find((x) => x.id === b.id)?.unlocked ?? false;
                return (
                  <div
                    key={b.id}
                    className={`p-3.5 rounded-2xl border flex items-center gap-3.5 ${
                      unlocked
                        ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/30'
                        : 'border-slate-100 dark:border-slate-800/50 opacity-65'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        unlocked
                          ? 'bg-success text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-display font-bold text-sm text-slate-900 dark:text-white">
                        {b.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {b.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {onOpenLeaguesAndBadges && (
              <button
                type="button"
                onClick={onOpenLeaguesAndBadges}
                className="w-full min-h-[40px] rounded-xl bg-brand-blue/10 dark:bg-slate-800 text-xs font-display font-bold text-brand-blue dark:text-accent-orange hover:bg-brand-blue/20 transition cursor-pointer"
              >
                Explore All 40 Original Badges & Weekly Leagues →
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border-0 p-5 space-y-3 shadow-none">
            <div className="flex items-center gap-4">
              <MishaMascot expression="idle" size={72} />
              <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <strong className="block font-display text-slate-900 dark:text-white">
                  Misha · MADI Garage
                </strong>
                Tap any green or orange stop on the highway to practice Russian letters, cases, and campus dialogues.
              </div>
            </div>

            {onOpenDevExercises && (
              <button
                type="button"
                onClick={onOpenDevExercises}
                className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-500 hover:text-brand-blue flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>/dev/exercises (Preview all 10 types)</span>
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* Grammar "Road Signs" (6 Cases) Modal */}
      {showRoadSignsModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-display font-extrabold text-slate-900 dark:text-white">
                  {t('map.signGarageTitle')}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t('map.signGarageSub')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRoadSignsModal(false)}
                className="min-h-[42px] min-w-[42px] rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {GRAMMAR_ROAD_SIGNS.map((sign) => (
                <div
                  key={sign.caseCode}
                  className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-5 space-y-3 bg-slate-50/60 dark:bg-slate-800/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-display font-extrabold text-xs shadow-sm shrink-0"
                        style={{ backgroundColor: sign.signColor }}
                      >
                        {sign.signCode}
                      </div>
                      <div>
                        <h3 className="font-display font-extrabold text-base text-slate-900 dark:text-white">
                          {sign.title[lang]}
                        </h3>
                        <div className="text-xs font-mono font-bold text-accent-orange">
                          {sign.questionsRu} · {sign.questionsTranslated[lang]}
                        </div>
                      </div>
                    </div>

                    {sign.examples[0] && (
                      <button
                        type="button"
                        onClick={() =>
                          speakRussian(
                            sign.examples[0].russianStressed,
                            sign.examples[0].audioSlug,
                            soundEnabled
                          )
                        }
                        className="min-h-[38px] min-w-[38px] rounded-xl bg-brand-blue text-white flex items-center justify-center cursor-pointer shrink-0"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {sign.explanation[lang]}
                  </p>

                  {sign.examples[0] && (
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                      <div className="font-display font-bold text-sm text-slate-900 dark:text-white">
                        {sign.examples[0].russianStressed}
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        {sign.examples[0].translations[lang]}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  Star,
  Play,
  Wrench,
  Compass,
  Award,
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
import { MishaMascot } from './BrandVisuals';
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

const UNIT_MASCOTS = [
  { sprite: '/assets/madi-crew/sprites/engineer.png', name: 'Madi Engineer' },
  { sprite: '/assets/madi-crew/sprites/kid.png', name: 'Madi Kid' },
  { sprite: '/assets/madi-crew/sprites/professor.png', name: 'Madi Professor' },
  { sprite: '/assets/madi-crew/sprites/builder.png', name: 'Madi Builder' },
  { sprite: '/assets/madi-crew/sprites/girl.png', name: 'Madi Girl' },
];

/** Padlock icon with keyhole matching the reference road map design */
const MapPadlockIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
    <path
      d="M9 12V9C9 6.23858 11.2386 4 14 4C16.7614 4 19 6.23858 19 9V12"
      stroke="#334155"
      strokeWidth="2.8"
      strokeLinecap="round"
    />
    <rect x="6" y="12" width="16" height="12" rx="3.5" fill="#334155" />
    <circle cx="14" cy="17" r="1.6" fill="#F8FAFC" />
    <path d="M14 18.2V20.8" stroke="#F8FAFC" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

/** Top-down 3D-styled Orange Sedan Car matching the reference map illustration */
const RoadCar3DSprite: React.FC<{ className?: string }> = ({ className = 'w-14 h-20' }) => (
  <svg viewBox="0 0 64 96" fill="none" className={className} aria-hidden="true">
    {/* Drop shadow */}
    <ellipse cx="34" cy="50" rx="22" ry="42" fill="rgba(15, 23, 42, 0.35)" />
    {/* Wheels */}
    <rect x="7" y="16" width="6" height="16" rx="3" fill="#0F172A" />
    <rect x="51" y="16" width="6" height="16" rx="3" fill="#0F172A" />
    <rect x="7" y="62" width="6" height="16" rx="3" fill="#0F172A" />
    <rect x="51" y="62" width="6" height="16" rx="3" fill="#0F172A" />
    {/* Main Car Body */}
    <path
      d="M14 20C14 11 21 6 32 6C43 6 50 11 50 20L52 72C52 82 45 88 32 88C19 88 12 82 12 72L14 20Z"
      fill="url(#carBodyGrad)"
      stroke="#9A3412"
      strokeWidth="1.5"
    />
    {/* Side Mirrors */}
    <path d="M12 56L6 58C5 58.5 5 61 7 61.5L12 61Z" fill="#FF7A00" stroke="#9A3412" strokeWidth="1" />
    <path d="M52 56L58 58C59 58.5 59 61 57 61.5L52 61Z" fill="#FF7A00" stroke="#9A3412" strokeWidth="1" />
    {/* Cabin / Windows (Car drives downward toward the bottom of the road) */}
    <path
      d="M17 26C17 22 22 19 32 19C42 19 47 22 47 26L46 60C46 64 41 67 32 67C23 67 18 64 18 60L17 26Z"
      fill="#1E293B"
    />
    {/* Roof Panel */}
    <rect x="19" y="29" width="26" height="22" rx="5" fill="url(#carRoofGrad)" />
    {/* Front Windshield (facing downward) */}
    <path d="M18 52L46 52L44 64C40 66 24 66 20 64L18 52Z" fill="#334155" />
    <path d="M21 54L33 54L29 63L21 62Z" fill="#64748B" opacity="0.45" />
    {/* Rear Window (facing upward) */}
    <path d="M20 27L44 27L42 20C38 19 26 19 22 20L20 27Z" fill="#334155" />
    {/* Hood creases */}
    <path d="M21 67L23 81" stroke="#EA580C" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M43 67L41 81" stroke="#EA580C" strokeWidth="1.5" strokeLinecap="round" />
    {/* Headlights (at bottom front) */}
    <ellipse cx="19" cy="83" rx="4.5" ry="2.5" transform="rotate(-15 19 83)" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1" />
    <ellipse cx="45" cy="83" rx="4.5" ry="2.5" transform="rotate(15 45 83)" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1" />
    {/* Front Grille */}
    <rect x="25" y="84" width="14" height="3" rx="1.5" fill="#0F172A" />
    <defs>
      <linearGradient id="carBodyGrad" x1="12" y1="6" x2="52" y2="88" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFAE42" />
        <stop offset="50%" stopColor="#FF7A00" />
        <stop offset="100%" stopColor="#EA580C" />
      </linearGradient>
      <linearGradient id="carRoofGrad" x1="19" y1="29" x2="45" y2="51" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFB75E" />
        <stop offset="100%" stopColor="#F97316" />
      </linearGradient>
    </defs>
  </svg>
);

/** Splits localized lesson title into a clean Stage Kicker (e.g. "Étape 1") and Main Title (e.g. "Lettres familières") */
function parseLessonStageAndTitle(
  rawTitle: string,
  orderIndex: number,
  lang: string
): { stageKicker: string; cleanTitle: string; lettersBadge: string | null } {
  const defaultStagePrefix =
    lang === 'fr'
      ? `Étape ${orderIndex}`
      : lang === 'ar'
      ? `المرحلة ${orderIndex}`
      : lang === 'ru'
      ? `Этап ${orderIndex}`
      : `Stage ${orderIndex}`;

  let stageKicker = defaultStagePrefix;
  let remainder = rawTitle.trim();

  const colonIdx = remainder.indexOf(':');
  if (colonIdx !== -1) {
    const candidateKicker = remainder.slice(0, colonIdx).trim();
    const afterColon = remainder.slice(colonIdx + 1).trim();
    if (candidateKicker && afterColon) {
      stageKicker =
        lang === 'ar'
          ? candidateKicker.replace('المحطة', 'المرحلة')
          : candidateKicker;
      remainder = afterColon;
    }
  }

  // Extract optional parenthetical letters like "(А О К М Т Е)" so the main title matches "Lettres familières"
  let lettersBadge: string | null = null;
  const parenMatch = remainder.match(/\(([^)]+)\)\s*$/);
  if (parenMatch) {
    lettersBadge = parenMatch[1].trim();
    remainder = remainder.slice(0, parenMatch.index).trim();
  }

  return {
    stageKicker,
    cleanTitle: remainder || rawTitle,
    lettersBadge,
  };
}

/**
 * Computes a continuous serpentine S-curve road X(y) in a 600-unit wide coordinate space,
 * reproducing the reference image's winding highway geometry from top to bottom for any number of lessons.
 */
function buildSerpentineRoadGeometry(lessonCount: number) {
  const ROW_HEIGHT = 186;
  const TOP_PAD = 126;
  const BOTTOM_PAD = 116;
  const totalHeight = TOP_PAD + lessonCount * ROW_HEIGHT + BOTTOM_PAD;

  // Lesson Y coordinates
  const lessonYs: number[] = [];
  for (let i = 0; i < lessonCount; i++) {
    lessonYs.push(TOP_PAD + i * ROW_HEIGHT + 52);
  }

  // Construct turning-point knots (y, x) that form the winding road
  // Knot pattern mirrors the reference image:
  // Top entry (x=104) -> curves right past Étape 1 to (x=246) -> curves left past Étape 2 to (x=136) -> curves right to Étape 3 (x=254) -> continues winding!
  const knots: { y: number; x: number }[] = [{ y: 0, x: 104 }];

  for (let i = 0; i < lessonCount; i++) {
    const ly = lessonYs[i];
    if (i === 0) {
      knots.push({ y: ly + 74, x: 246 });
    } else if (i % 2 === 1) {
      knots.push({ y: ly + 36, x: 136 });
    } else {
      knots.push({ y: ly + 18, x: 252 });
    }
  }

  const lastKnot = knots[knots.length - 1];
  const exitX = lastKnot.x > 190 ? 156 : 228;
  knots.push({ y: totalHeight + 24, x: exitX });

  // Smooth piecewise cosine interpolation through knots
  const getXAtY = (y: number): number => {
    if (y <= knots[0].y) return knots[0].x;
    for (let k = 0; k < knots.length - 1; k++) {
      const k0 = knots[k];
      const k1 = knots[k + 1];
      if (y <= k1.y) {
        const span = Math.max(1, k1.y - k0.y);
        const t = Math.max(0, Math.min(1, (y - k0.y) / span));
        const s = 0.5 - 0.5 * Math.cos(Math.PI * t);
        return k0.x + (k1.x - k0.x) * s;
      }
    }
    return knots[knots.length - 1].x;
  };

  const getAngleDegAtY = (y: number): number => {
    const delta = 4;
    const dx = getXAtY(y + delta) - getXAtY(y - delta);
    const dy = delta * 2;
    // Angle relative to downward vertical (0 deg = pointing straight down)
    return -(Math.atan2(dx, dy) * 180) / Math.PI;
  };

  // Sample dense points for crisp SVG path rendering
  const samples: { x: number; y: number }[] = [];
  for (let y = -16; y <= totalHeight + 16; y += 6) {
    samples.push({ x: getXAtY(y), y });
  }

  const pathD = samples
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ');

  const nodePositions = lessonYs.map((y) => ({
    x: getXAtY(y),
    y,
  }));

  // Tree clusters placed along the left & right shoulders of the winding road
  const trees: { x: number; y: number; scale: number; variant: number }[] = [];
  for (let y = 44; y < totalHeight - 30; y += 54) {
    const rx = getXAtY(y);
    // Left side trees
    if (rx - 74 > 26) {
      trees.push({
        x: rx - 72 - ((y * 7) % 34),
        y: y + ((y * 3) % 18) - 9,
        scale: 0.85 + ((y % 3) * 0.12),
        variant: y % 2,
      });
    }
    // Right side trees (between road and river/cards)
    trees.push({
      x: rx + 68 + ((y * 11) % 30),
      y: y + ((y * 5) % 20) - 10,
      scale: 0.8 + ((y % 4) * 0.1),
      variant: (y + 1) % 2,
    });
  }

  return {
    totalHeight,
    pathD,
    nodePositions,
    getXAtY,
    getAngleDegAtY,
    trees,
  };
}

export const RoadMapView: React.FC<RoadMapViewProps> = ({
  completedLessonIds,
  accuracyByLesson,
  streak,
  totalFuel,
  goalMinutes,
  todayMinutesCompleted,
  soundEnabled = true,
  onStartLesson,
  onOpenDevExercises,
  onOpenLeaguesAndBadges,
  equippedCarSkin = 'car_classic_blue',
  equippedMapTheme = 'theme_autumn_madi',
  teacherAssignments = [],
}) => {
  const { lang, t } = useI18n();
  const [showRoadSignsModal, setShowRoadSignsModal] = useState(false);

  const orderedIds = getOrderedLessonIds();
  const statuses = computeLessonNodeStatuses(orderedIds, completedLessonIds);
  const badges = evaluateBadges(completedLessonIds, streak);

  const _activeThemeObj =
    PHASE4_COSMETICS.find((c) => c.id === equippedMapTheme) || PHASE4_COSMETICS[10];
  const _activeCarObj =
    PHASE4_COSMETICS.find((c) => c.id === equippedCarSkin) || PHASE4_COSMETICS[0];
  void _activeThemeObj;
  void _activeCarObj;

  const goalProgressPct = Math.min(
    100,
    Math.round((todayMinutesCompleted / Math.max(1, goalMinutes)) * 100)
  );

  return (
    <div className="w-full bg-white dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-0 sm:px-6 py-2 sm:py-8 pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-2">
          {CURRICULUM_UNITS.map((unit, unitIdx) => {
            const isSignUnit = unit.id === 'unit-signs';
            const mascot = UNIT_MASCOTS[unitIdx % UNIT_MASCOTS.length];
            const geo = buildSerpentineRoadGeometry(unit.lessons.length);

            // Determine where the 3D orange car should be positioned on this unit's road
            const currentLessonIdx = unit.lessons.findIndex(
              (l) => statuses[l.id] === 'current'
            );
            const carTargetIdx = currentLessonIdx !== -1 ? currentLessonIdx : 0;
            const showCarInUnit =
              currentLessonIdx !== -1 || (unitIdx === 0 && completedLessonIds.length === 0);
            const carY = Math.max(58, geo.nodePositions[carTargetIdx].y - 78);
            const carX = geo.getXAtY(carY);
            const carAngle = geo.getAngleDegAtY(carY);

            return (
              <section
                key={unit.id}
                className="bg-white dark:bg-slate-900 border-0 shadow-none overflow-hidden rounded-none"
              >
                {/* Unit Header with Custom Mascot */}
                <div className="px-4 py-4 sm:p-6 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4">
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
                        <h2 className="text-lg sm:text-xl font-display font-extrabold text-slate-900 dark:text-white">
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

                {/* Illustrated Winding Road Map Canvas (Frameless & Gradually Blended into Background) */}
                <div
                  dir="ltr"
                  className="relative w-full overflow-hidden rounded-none border-0 shadow-none select-none"
                  style={{ height: `${geo.totalHeight}px`, backgroundColor: '#EBE5D8' }}
                >
                  {/* Seamless 4-Edge Feathering Gradients (blends map edges gradually into page background) */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-24 sm:h-28 z-10 bg-gradient-to-b from-white via-white/75 to-transparent dark:from-slate-900 dark:via-slate-900/75 dark:to-transparent"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-24 sm:h-28 z-10 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-slate-900 dark:via-slate-900/80 dark:to-transparent"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 w-6 sm:w-12 z-10 bg-gradient-to-r from-white via-white/50 to-transparent dark:from-slate-900 dark:via-slate-900/50 dark:to-transparent"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 right-0 w-6 sm:w-12 z-10 bg-gradient-to-l from-white via-white/50 to-transparent dark:from-slate-900 dark:via-slate-900/50 dark:to-transparent"
                  />
                  {/* Scenic Background SVG: Moscow Skyline, Moskva River, Bridges, City Blocks, Trees & Winding Highway */}
                  <svg
                    viewBox={`0 0 600 ${geo.totalHeight}`}
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id={`skyGrad-${unit.id}`} x1="0" y1="0" x2="0" y2="140" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#D6E8F8" />
                        <stop offset="65%" stopColor="#EBF2F8" />
                        <stop offset="100%" stopColor="#EBE5D8" />
                      </linearGradient>
                      <linearGradient id={`riverGrad-${unit.id}`} x1="420" y1="0" x2="600" y2={geo.totalHeight} gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#68ADE2" />
                        <stop offset="50%" stopColor="#7ABBE9" />
                        <stop offset="100%" stopColor="#5D9FD6" />
                      </linearGradient>
                    </defs>

                    {/* Base Urban Map Canvas */}
                    <rect x="0" y="0" width="600" height={geo.totalHeight} fill="#EBE5D8" />

                    {/* Top Sky & Moscow Stalinist University Skyline */}
                    <rect x="0" y="0" width="600" height="140" fill={`url(#skyGrad-${unit.id})`} />
                    <g fill="#B9CDE2" opacity="0.85">
                      {/* Distant city towers */}
                      <rect x="290" y="52" width="18" height="45" />
                      <rect x="312" y="42" width="22" height="55" />
                      <rect x="340" y="60" width="16" height="37" />
                      <rect x="362" y="48" width="20" height="49" />
                      {/* Iconic Moscow Main University Building Silhouette */}
                      <rect x="435" y="48" width="130" height="50" />
                      <rect x="455" y="34" width="90" height="64" />
                      <rect x="480" y="16" width="40" height="82" />
                      <polygon points="500,2 493,16 507,16" />
                      <rect x="440" y="36" width="14" height="62" />
                      <rect x="546" y="36" width="14" height="62" />
                    </g>
                    {/* Skyline Window Grid Details */}
                    <g fill="#E2ECF7" opacity="0.7">
                      <rect x="492" y="24" width="4" height="50" />
                      <rect x="504" y="24" width="4" height="50" />
                      <rect x="466" y="44" width="4" height="40" />
                      <rect x="530" y="44" width="4" height="40" />
                    </g>

                    {/* Isometric City Blocks & Streets on Left & Center */}
                    <g stroke="#F5F2EB" strokeWidth="8" fill="#DFD8C8" opacity="0.9">
                      <rect x="-10" y="140" width="125" height="110" rx="6" />
                      <rect x="-10" y="270" width="105" height="120" rx="6" />
                      <rect x="20" y="410" width="110" height="115" rx="6" />
                      <rect x="-10" y="545" width="135" height="130" rx="6" />
                      <rect x="15" y="700" width="115" height="125" rx="6" />
                      <rect x="-5" y="845" width="120" height="130" rx="6" />
                      <rect x="10" y="995" width="125" height="140" rx="6" />
                    </g>
                    {/* 3D Isometric Building Roofs on City Blocks */}
                    <g fill="#CFC6B4" stroke="#B8AE9B" strokeWidth="1">
                      <rect x="12" y="162" width="76" height="44" rx="3" />
                      <rect x="8" y="295" width="64" height="55" rx="3" />
                      <rect x="350" y="430" width="95" height="68" rx="4" />
                      <rect x="368" y="442" width="60" height="42" rx="2" fill="#BDB3A0" />
                      <rect x="18" y="575" width="84" height="58" rx="3" />
                      <rect x="345" y="740" width="92" height="64" rx="4" />
                    </g>

                    {/* Moskva River Winding Along the Right Side */}
                    <path
                      d={`M 600 95 C 455 125, 420 265, 495 395 C 555 505, 595 580, 600 680 L 600 ${geo.totalHeight} L 475 ${geo.totalHeight} C 520 ${geo.totalHeight - 120}, 585 520, 600 95 Z`}
                      fill="#D8D2C5"
                    />
                    <path
                      d={`M 600 105 C 468 135, 434 268, 506 392 C 565 495, 585 610, 520 ${geo.totalHeight} L 600 ${geo.totalHeight} Z`}
                      fill={`url(#riverGrad-${unit.id})`}
                    />
                    {/* River Island Park on Upper Right */}
                    <path
                      d="M 600 155 C 535 170, 525 235, 600 268 Z"
                      fill="#C8DFB8"
                      stroke="#E5E0D5"
                      strokeWidth="5"
                    />

                    {/* River Bridges */}
                    <g>
                      {/* Upper Bridge */}
                      <path
                        d="M 442 198 L 568 248 L 560 266 L 434 216 Z"
                        fill="#E5E0D5"
                        stroke="#CBD5E1"
                        strokeWidth="1.5"
                      />
                      {/* Lower Bridge */}
                      <path
                        d={`M 455 ${geo.totalHeight - 115} L 575 ${geo.totalHeight - 45} L 564 ${geo.totalHeight - 28} L 444 ${geo.totalHeight - 98} Z`}
                        fill="#E5E0D5"
                        stroke="#CBD5E1"
                        strokeWidth="1.5"
                      />
                    </g>

                    {/* Riverboat & Wake */}
                    <g transform="translate(548, 342) rotate(32)">
                      <path d="M0 -18 C 6 -8, 8 12, 0 22 C -8 12, -6 -8, 0 -18 Z" fill="rgba(255,255,255,0.35)" />
                      <rect x="-5" y="-12" width="10" height="22" rx="4" fill="#FFFFFF" stroke="#475569" strokeWidth="1" />
                      <rect x="-3" y="-6" width="6" height="10" rx="2" fill="#38BDF8" />
                    </g>

                    {/* Map Typography Labels ("Université technique" & "Moskva") */}
                    <text
                      x="18"
                      y="232"
                      fill="#64748B"
                      fontSize="13"
                      fontWeight="600"
                      fontFamily="sans-serif"
                    >
                      Université
                    </text>
                    <text
                      x="18"
                      y="248"
                      fill="#64748B"
                      fontSize="13"
                      fontWeight="600"
                      fontFamily="sans-serif"
                    >
                      technique
                    </text>
                    <text
                      x="492"
                      y="295"
                      fill="rgba(255, 255, 255, 0.78)"
                      fontSize="15"
                      fontWeight="700"
                      fontFamily="sans-serif"
                      transform="rotate(30 492 295)"
                      letterSpacing="1.5"
                    >
                      Moskva
                    </text>

                    {/* Green Park Patches Along Road */}
                    {geo.nodePositions.map((pt, idx) => (
                      <ellipse
                        key={`lawn-${idx}`}
                        cx={pt.x + (idx % 2 === 0 ? -65 : 75)}
                        cy={pt.y}
                        rx="48"
                        ry="32"
                        fill="#C5DFB4"
                        opacity="0.65"
                      />
                    ))}

                    {/* === SERPENTINE WINDING ASPHALT HIGHWAY === */}
                    {/* 1. Road Elevation Shadow */}
                    <path
                      d={geo.pathD}
                      fill="none"
                      stroke="rgba(15, 23, 42, 0.18)"
                      strokeWidth="86"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      transform="translate(0, 6)"
                    />
                    {/* 2. White Concrete Outer Curb */}
                    <path
                      d={geo.pathD}
                      fill="none"
                      stroke="#F8FAFC"
                      strokeWidth="80"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* 3. Dark Curb Border Line */}
                    <path
                      d={geo.pathD}
                      fill="none"
                      stroke="#475569"
                      strokeWidth="72"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* 4. Main Charcoal Asphalt Surface */}
                    <path
                      d={geo.pathD}
                      fill="none"
                      stroke="#252C37"
                      strokeWidth="66"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* 5. Inner Lane Sheen */}
                    <path
                      d={geo.pathD}
                      fill="none"
                      stroke="#2E3746"
                      strokeWidth="52"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* 6. Crisp Dashed White Centerline */}
                    <path
                      d={geo.pathD}
                      fill="none"
                      stroke="#F8FAFC"
                      strokeWidth="3.5"
                      strokeDasharray="16 14"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Lush Green Trees Lining Both Sides of the Road */}
                    {geo.trees.map((tr, idx) => (
                      <g
                        key={`tree-${idx}`}
                        transform={`translate(${tr.x.toFixed(1)}, ${tr.y.toFixed(1)}) scale(${tr.scale.toFixed(2)})`}
                      >
                        <ellipse cx="2" cy="12" rx="14" ry="7" fill="rgba(15, 23, 42, 0.16)" />
                        <rect x="-2.5" y="2" width="5" height="10" rx="1.5" fill="#78553A" />
                        <circle cx="0" cy="-2" r="12" fill={tr.variant === 0 ? '#5B8C42' : '#4D7C38'} />
                        <circle cx="-6" cy="1" r="8.5" fill="#6E9E52" />
                        <circle cx="6" cy="1" r="8.5" fill="#52823B" />
                        <circle cx="0" cy="-6" r="8" fill="#82B366" />
                      </g>
                    ))}

                    {/* Blue Highway Sign: "MADI ->" at Upper Right */}
                    <g transform="translate(382, 82)">
                      <rect x="24" y="26" width="4" height="18" fill="#64748B" />
                      <rect x="58" y="26" width="4" height="18" fill="#64748B" />
                      <rect
                        x="0"
                        y="0"
                        width="84"
                        height="28"
                        rx="5"
                        fill="#1D4ED8"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                      />
                      <text
                        x="12"
                        y="19"
                        fill="#FFFFFF"
                        fontSize="13"
                        fontWeight="800"
                        fontFamily="sans-serif"
                      >
                        MADI
                      </text>
                      <path
                        d="M58 14H72M72 14L67 9M72 14L67 19"
                        stroke="#FFFFFF"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>

                    {/* Blue Highway Sign: "Moscou ↑" at Lower Left Curve */}
                    {geo.totalHeight > 440 && (
                      <g transform="translate(18, 438)">
                        <rect x="24" y="30" width="4" height="22" fill="#64748B" />
                        <rect x="64" y="30" width="4" height="22" fill="#64748B" />
                        <rect
                          x="0"
                          y="0"
                          width="92"
                          height="32"
                          rx="5"
                          fill="#1D4ED8"
                          stroke="#FFFFFF"
                          strokeWidth="2"
                        />
                        <text
                          x="10"
                          y="21"
                          fill="#FFFFFF"
                          fontSize="13"
                          fontWeight="800"
                          fontFamily="sans-serif"
                        >
                          Moscou
                        </text>
                        <path
                          d="M74 23V9M74 9L69 14M74 9L79 14"
                          stroke="#FFFFFF"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </g>
                    )}
                  </svg>

                  {/* 3D Orange Car Positioned Directly on the Curved Road */}
                  {showCarInUnit && (
                    <div
                      className="absolute z-20 pointer-events-none transition-all duration-500"
                      style={{
                        left: `${(carX / 600) * 100}%`,
                        top: `${carY}px`,
                        transform: `translate(-50%, -50%) rotate(${carAngle.toFixed(1)}deg)`,
                      }}
                    >
                      <RoadCar3DSprite className="w-12 h-[72px] sm:w-14 sm:h-20 drop-shadow-md" />
                    </div>
                  )}

                  {/* Interactive Stage Nodes & Floating White Cards Along the Winding Road */}
                  {unit.lessons.map((lesson, lessonIdx) => {
                    const status = statuses[lesson.id] || 'locked';
                    const isCompleted = status === 'completed';
                    const isCurrent = status === 'current';
                    const isLocked = status === 'locked';
                    const accuracy = accuracyByLesson[lesson.id];
                    const cachedOffline = isLessonCachedOffline(lesson.id);

                    const nodePt = geo.nodePositions[lessonIdx];
                    const leftPct = (nodePt.x / 600) * 100;

                    const { stageKicker, cleanTitle, lettersBadge } =
                      parseLessonStageAndTitle(
                        lesson.title[lang],
                        lesson.orderIndex,
                        lang
                      );

                    const startLabel =
                      lang === 'fr'
                        ? 'Commencer'
                        : lang === 'ar'
                        ? 'ابدأ الآن'
                        : lang === 'ru'
                        ? 'Начать'
                        : 'Start';

                    const replayLabel =
                      lang === 'fr'
                        ? 'Réviser'
                        : lang === 'ar'
                        ? 'مراجعة'
                        : lang === 'ru'
                        ? 'Повторить'
                        : 'Review';

                    return (
                      <div
                        key={lesson.id}
                        className="absolute inset-x-0 z-20 pointer-events-none"
                        style={{ top: `${nodePt.y}px` }}
                      >
                        {/* Circular Node Directly on the Winding Road */}
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => onStartLesson(lesson)}
                          aria-label={`${lesson.title[lang]} (${status})`}
                          style={{ left: `${leftPct}%` }}
                          className={`pointer-events-auto absolute top-0 -translate-x-1/2 -translate-y-1/2 w-[62px] h-[62px] sm:w-[72px] sm:h-[72px] rounded-full border-[4px] border-white flex items-center justify-center transition duration-200 cursor-pointer disabled:cursor-not-allowed ${
                            isCurrent
                              ? 'bg-gradient-to-b from-[#FFA336] to-[#FF7700] shadow-[0_0_28px_6px_rgba(255,138,31,0.72)] hover:scale-105'
                              : isCompleted
                              ? 'bg-gradient-to-b from-[#34D399] to-[#059669] shadow-[0_8px_22px_rgba(16,185,129,0.5)] hover:scale-105'
                              : 'bg-gradient-to-b from-[#F8FAFC] via-[#E2E8F0] to-[#CBD5E1] shadow-[0_8px_20px_rgba(15,23,42,0.28),inset_0_2px_4px_rgba(255,255,255,0.95)]'
                          }`}
                        >
                          {isCompleted ? (
                            <Star className="w-7 h-7 sm:w-8 sm:h-8 fill-white text-white drop-shadow-xs" />
                          ) : isCurrent ? (
                            <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-[#162238] text-[#162238] ms-1" />
                          ) : (
                            <MapPadlockIcon className="w-7 h-7 sm:w-8 sm:h-8" />
                          )}
                        </button>

                        {/* Connected White Stage Card on the Right of the Node */}
                        <div
                          dir={lang === 'ar' ? 'rtl' : 'ltr'}
                          style={{
                            left: `calc(${leftPct}% + 36px)`,
                            right: '10px',
                            maxWidth: '330px',
                          }}
                          onClick={() => {
                            if (!isLocked) onStartLesson(lesson);
                          }}
                          className={`pointer-events-auto absolute top-0 -translate-y-1/2 rounded-[24px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3 sm:px-5 sm:py-4 shadow-[0_12px_30px_rgba(15,23,42,0.16)] border border-white dark:border-slate-800 transition ${
                            !isLocked ? 'cursor-pointer hover:shadow-[0_14px_34px_rgba(15,23,42,0.22)]' : ''
                          }`}
                        >
                          {/* Small Connector Pin on Left Edge Facing the Road Node */}
                          <span
                            aria-hidden="true"
                            className={`
                              absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs
                              ${
                                isCurrent
                                  ? 'bg-[#FF8A1F]'
                                  : isCompleted
                                  ? 'bg-emerald-500'
                                  : 'bg-[#1E293B]'
                              }
                            `}
                          />

                          {/* Stage Number Kicker + Optional Accuracy/Offline Info */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span
                              className={`font-display font-extrabold text-xs sm:text-sm ${
                                isCurrent
                                  ? 'text-[#FF7A00]'
                                  : isCompleted
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-[#64748B] dark:text-slate-400'
                              }`}
                            >
                              {stageKicker}
                            </span>

                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                              {isCompleted && accuracy !== undefined && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                  {accuracy}%
                                </span>
                              )}
                              {cachedOffline && <span>· Offline</span>}
                            </div>
                          </div>

                          {/* Bold Stage Title */}
                          <h3 className="font-display font-extrabold text-base sm:text-[19px] text-[#0F172A] dark:text-white leading-snug mt-0.5">
                            {cleanTitle}
                          </h3>

                          {/* Optional subtle Cyrillic letters preview */}
                          {lettersBadge && (
                            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                              {lettersBadge}
                            </div>
                          )}

                          {/* Teacher Assigned Badge */}
                          {teacherAssignments
                            .filter((a) => a.targetId === lesson.id)
                            .map((a) => (
                              <div
                                key={a.id}
                                data-testid={`assigned-badge-${lesson.id}`}
                                className="mt-1 text-[11px] font-bold text-[#1B4DFF]"
                              >
                                {t('map.assignedByTeacherBadge', { date: a.dueDate })}
                              </div>
                            ))}

                          {/* Prominent Rounded Pill Button ("Commencer" / "Réviser") */}
                          {!isLocked && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onStartLesson(lesson);
                              }}
                              className={`mt-2.5 w-full min-h-[38px] sm:min-h-[42px] px-4 py-1.5 rounded-full font-display font-extrabold text-xs sm:text-sm transition cursor-pointer ${
                                isCurrent
                                  ? 'bg-gradient-to-b from-[#FF9B32] to-[#FF7A00] text-[#0F172A] shadow-[0_4px_12px_rgba(255,122,0,0.35)] hover:brightness-105'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              {isCurrent ? startLabel : replayLabel}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          <div className="w-full relative rounded-none overflow-hidden border-0 shadow-none bg-white dark:bg-slate-900">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-16 z-10 bg-gradient-to-b from-white via-white/60 to-transparent dark:from-slate-900 dark:via-slate-900/60 dark:to-transparent"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 z-10 bg-gradient-to-t from-white via-white/60 to-transparent dark:from-slate-900 dark:via-slate-900/60 dark:to-transparent"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-6 sm:w-10 z-10 bg-gradient-to-r from-white via-white/40 to-transparent dark:from-slate-900 dark:via-slate-900/40 dark:to-transparent"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-6 sm:w-10 z-10 bg-gradient-to-l from-white via-white/40 to-transparent dark:from-slate-900 dark:via-slate-900/40 dark:to-transparent"
            />
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
    </div>
  );
};

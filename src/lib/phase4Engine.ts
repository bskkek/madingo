/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 4 Pure Logic & Rules Engine:
 * 1. Certificates (Validation, Eligibility, Score Band, Verification ID, A4 Landscape SVG/PDF Renderer)
 * 2. Weekly Leagues (Promotion/Demotion math, Anti-cheat fuel cap & repetition guard, Friend nudge rate-limit)
 * 3. Achievements & Quests (40-badge declarative rule evaluator, free cosmetic unlocker, weak-area quest generator)
 * 4. Adaptive Placement Test & CEFR Level Exams (Adaptive item selector, 24h retake cooldown, server-side scorer)
 * 5. Smart Personalization ("Today for you" explainable engine + adaptive in-lesson difficulty)
 * 6. Notifications (Quiet-hours filter, frequency cap, per-type opt-in)
 * 7. Admin Analytics & Cost Monitor (Funnel, retention, high-failure content flags, STT/TTS/LLM budget guard)
 */

import { SupportedLang } from '../data/curriculum';
import {
  CefrLevel,
  CEFR_CERTIFICATE_META,
  CEFR_LEVEL_EXAMS,
  CefrExamDefinition,
  DEFAULT_CERTIFICATE_DISCLAIMER,
  ExamSkillDomain,
  FriendConnection,
  LEAGUE_TIERS,
  LeagueParticipant,
  LeagueTierId,
  PHASE4_BADGES,
  PHASE4_COSMETICS,
  PlacementQuestion,
  PLACEMENT_QUESTION_BANK,
} from '../data/phase4Data';

// ============================================================================
// 1. CERTIFICATES ENGINE
// ============================================================================

export type CertificateScoreBand = 'Pass' | 'Merit' | 'Distinction';

export interface CertificateRecord {
  id: string; // e.g. MDG-A1-2026-9F2A1C
  userId: string;
  level: CefrLevel;
  studentNameLatin: string;
  studentNameCyrillic: string;
  scorePct: number;
  scoreBand: CertificateScoreBand;
  issuedAt: string;
  verifyUrl: string;
  revoked: boolean;
  revokedReason?: string | null;
  revokedAt?: string | null;
  disclaimerText: string;
  signatureTeacher: string;
  signatureDepartment: string;
}

export function validateCertificateNameSpelling(
  nameLatin: string,
  nameCyrillic: string
): { valid: boolean; error?: string } {
  const cleanLat = (nameLatin || '').trim();
  const cleanCyr = (nameCyrillic || '').trim();
  if (cleanLat.length < 2) {
    return { valid: false, error: 'Please confirm your full name in Latin script (at least 2 characters).' };
  }
  if (cleanCyr.length < 2) {
    return { valid: false, error: 'Please confirm your full name in Cyrillic script (at least 2 characters).' };
  }
  return { valid: true };
}

export function computeCertificateScoreBand(
  scorePct: number,
  passScorePct: number = 75
): CertificateScoreBand | null {
  if (scorePct < passScorePct) return null;
  if (scorePct >= 92) return 'Distinction';
  if (scorePct >= 83) return 'Merit';
  return 'Pass';
}

export function checkCertificateEligibility(params: {
  scorePct: number;
  passScorePct?: number;
  nameLatinConfirmed: string;
  nameCyrillicConfirmed: string;
}): {
  eligible: boolean;
  scoreBand: CertificateScoreBand | null;
  reason?: string;
} {
  const passMark = params.passScorePct ?? 75;
  const band = computeCertificateScoreBand(params.scorePct, passMark);
  if (!band) {
    return {
      eligible: false,
      scoreBand: null,
      reason: `Score ${params.scorePct}% is below the required ${passMark}% pass mark.`,
    };
  }
  const nameCheck = validateCertificateNameSpelling(
    params.nameLatinConfirmed,
    params.nameCyrillicConfirmed
  );
  if (!nameCheck.valid) {
    return {
      eligible: false,
      scoreBand: band,
      reason: nameCheck.error,
    };
  }
  return {
    eligible: true,
    scoreBand: band,
  };
}

export function generateCertificateId(
  level: CefrLevel,
  userId: string,
  timestampMs: number = Date.now()
): string {
  const year = new Date(timestampMs).getUTCFullYear();
  let hash = 2166136261;
  const input = `${level}:${userId}:${timestampMs}`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hex = (hash >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 6);
  return `MDG-${level}-${year}-${hex}`;
}

function escapeXml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates an original A4 Landscape SVG certificate (1123 x 794 px)
 * supporting Latin, Cyrillic, and Arabic scripts, MADI colors, road motif,
 * QR verification code, and legal disclaimer.
 */
export function renderCertificateSvg(
  cert: CertificateRecord,
  uiLang: SupportedLang = 'en',
  customDisclaimer?: string
): string {
  const meta = CEFR_CERTIFICATE_META[cert.level] || CEFR_CERTIFICATE_META.A1;
  const dateFormatted = cert.issuedAt.slice(0, 10);
  const disclaimer = escapeXml(
    customDisclaimer || cert.disclaimerText || DEFAULT_CERTIFICATE_DISCLAIMER
  );
  const nameLatin = escapeXml(cert.studentNameLatin);
  const nameCyr = escapeXml(cert.studentNameCyrillic);
  const levelTitleLocalized = escapeXml(meta.levelTitle[uiLang]);
  const levelTitleRu = escapeXml(meta.levelTitle.ru);
  const descriptorLocalized = escapeXml(meta.cefrDescriptor[uiLang]);
  const descriptorRu = escapeXml(meta.cefrDescriptor.ru);
  const bandLabel =
    cert.scoreBand === 'Distinction'
      ? 'С ОТЛИЧИЕМ / DISTINCTION'
      : cert.scoreBand === 'Merit'
      ? 'ПОЧЁТНЫЙ БАЛЛ / MERIT'
      : 'УСПЕШНО СДАН / PASS';

  // Deterministic QR-style pattern from cert.id
  const qrCells: string[] = [];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const isCorner =
        (r < 2 && c < 2) || (r < 2 && c > 4) || (r > 4 && c < 2);
      const charCode = cert.id.charCodeAt((r * 7 + c) % cert.id.length) || 65;
      if (isCorner || (charCode + r * 3 + c * 5) % 2 === 0) {
        qrCells.push(
          `<rect x="${952 + c * 11}" y="${582 + r * 11}" width="9" height="9" rx="1.5" fill="#0F1E3A" />`
        );
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1123 794" width="1123" height="794">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#F8FAFC" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0F1E3A" />
      <stop offset="55%" stop-color="${meta.accentColor}" />
      <stop offset="100%" stop-color="#FF8A1F" />
    </linearGradient>
  </defs>

  <!-- Canvas Background -->
  <rect width="1123" height="794" fill="url(#bgGrad)" />

  <!-- Outer Frame -->
  <rect x="24" y="24" width="1075" height="746" rx="20" fill="none" stroke="#0F1E3A" stroke-width="4" />
  <rect x="34" y="34" width="1055" height="726" rx="14" fill="none" stroke="${meta.accentColor}" stroke-width="2" stroke-dasharray="8 4" />

  <!-- Top Header Banner with MADI Emblem -->
  <rect x="48" y="48" width="1027" height="92" rx="14" fill="#0F1E3A" />
  <rect x="68" y="64" width="60" height="60" rx="12" fill="${meta.accentColor}" />
  <text x="98" y="102" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="22" font-weight="800" fill="#FFFFFF" text-anchor="middle">МАДИ</text>

  <text x="148" y="88" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="20" font-weight="800" fill="#FFFFFF">
    МОСКОВСКИЙ АВТОМОБИЛЬНО-ДОРОЖНЫЙ ГОСУДАРСТВЕННЫЙ ТЕХНИЧЕСКИЙ УНИВЕРСИТЕТ (МАДИ)
  </text>
  <text x="148" y="116" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="13" font-weight="600" fill="#FF8A1F" letter-spacing="1.5">
    MOSCOW AUTOMOBILE AND ROAD CONSTRUCTION STATE TECHNICAL UNIVERSITY · MADINGO PLATFORM
  </text>

  <!-- Certificate Kicker & Level Pill -->
  <text x="561" y="188" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="14" font-weight="800" fill="${meta.accentColor}" text-anchor="middle" letter-spacing="3">
    СЕРТИФИКАТ ОБ ОКОНЧАНИИ УРОВНЯ · COURSE COMPLETION CERTIFICATE
  </text>

  <!-- Student Full Name (Cyrillic & Latin Confirmed Spelling) -->
  <text x="561" y="246" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="38" font-weight="800" fill="#0F1E3A" text-anchor="middle">
    ${nameCyr}
  </text>
  <text x="561" y="284" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="24" font-weight="700" fill="#334155" text-anchor="middle">
    ${nameLatin}
  </text>
  <line x1="280" y1="302" x2="842" y2="302" stroke="url(#accentGrad)" stroke-width="3" />

  <!-- Level Title (Russian + Student UI Language) -->
  <text x="561" y="346" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="24" font-weight="800" fill="${meta.accentColor}" text-anchor="middle">
    ${levelTitleRu}
  </text>
  <text x="561" y="376" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="18" font-weight="700" fill="#0F1E3A" text-anchor="middle">
    ${levelTitleLocalized}
  </text>

  <!-- CEFR Descriptors Box -->
  <rect x="96" y="398" width="931" height="118" rx="14" fill="#F1F5F9" stroke="#CBD5E1" stroke-width="1.5" />
  <text x="561" y="432" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="14" font-weight="600" fill="#1E293B" text-anchor="middle">
    RU: ${descriptorRu}
  </text>
  <text x="561" y="468" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="14" font-weight="600" fill="#334155" text-anchor="middle">
    ${uiLang.toUpperCase()}: ${descriptorLocalized}
  </text>
  <text x="561" y="498" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700" fill="${meta.accentColor}" text-anchor="middle">
    EXAM SCORE: ${cert.scorePct}% · BAND: ${bandLabel} · ISSUED: ${dateFormatted}
  </text>

  <!-- Original Level Emblem / Seal (Center) -->
  <circle cx="561" cy="596" r="52" fill="${meta.secondaryColor}" stroke="${meta.accentColor}" stroke-width="4" />
  <circle cx="561" cy="596" r="42" fill="none" stroke="#0F1E3A" stroke-width="1.5" stroke-dasharray="4 3" />
  <text x="561" y="592" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="28" font-weight="800" fill="#0F1E3A" text-anchor="middle">
    ${cert.level}
  </text>
  <text x="561" y="614" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="9" font-weight="800" fill="${meta.accentColor}" text-anchor="middle">
    MADI VERIFIED
  </text>

  <!-- Signatures (Left & Center-Right) -->
  <line x1="110" y1="615" x2="360" y2="615" stroke="#475569" stroke-width="1.5" />
  <text x="235" y="602" font-family="Georgia, serif" font-style="italic" font-size="18" fill="#0F1E3A" text-anchor="middle">
    ${escapeXml(cert.signatureTeacher)}
  </text>
  <text x="235" y="636" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" font-weight="700" fill="#64748B" text-anchor="middle">
    Ведущий преподаватель РКИ / Lead Instructor
  </text>

  <line x1="650" y1="615" x2="900" y2="615" stroke="#475569" stroke-width="1.5" />
  <text x="775" y="602" font-family="Georgia, serif" font-style="italic" font-size="18" fill="#0F1E3A" text-anchor="middle">
    ${escapeXml(cert.signatureDepartment)}
  </text>
  <text x="775" y="636" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" font-weight="700" fill="#64748B" text-anchor="middle">
    Кафедра русского языка МАДИ / Russian Dept.
  </text>

  <!-- QR Verification Block -->
  <rect x="944" y="574" width="93" height="93" rx="8" fill="#FFFFFF" stroke="#0F1E3A" stroke-width="2" />
  ${qrCells.join('\n  ')}
  <text x="990" y="682" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700" fill="#0F1E3A" text-anchor="middle">
    ID: ${escapeXml(cert.id)}
  </text>

  <!-- Decorative Highway / Road Motif Along Bottom Edge -->
  <rect x="48" y="696" width="1027" height="28" rx="6" fill="#1E293B" />
  <line x1="64" y1="710" x2="1059" y2="710" stroke="#FBBF24" stroke-width="3" stroke-dasharray="18 14" />

  <!-- Legal Disclaimer Line + Small madingo Wordmark in Bottom Corner -->
  <text x="58" y="746" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="10.5" font-weight="600" fill="#64748B">
    ${disclaimer} · Verify: ${escapeXml(cert.verifyUrl)}
  </text>

  <text x="1065" y="746" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="14" font-weight="800" fill="#0F1E3A" text-anchor="end">
    madingo
  </text>
</svg>`;
}

// ============================================================================
// 2. LEAGUES, ANTI-CHEAT & SOCIAL MOTIVATION ENGINE
// ============================================================================

export interface FuelAwardSecurityInput {
  requestedFuel: number;
  fuelEarnedInLast15Min: number;
  recentExerciseIdsLast10Min: string[];
  currentExerciseId: string;
  maxFuelPer15MinWindow?: number;
}

export interface FuelAwardSecurityResult {
  approvedFuel: number;
  cappedByWindow: boolean;
  trivialRepetitionDetected: boolean;
  reason?: string;
}

/**
 * Server-side Anti-Cheat validator for Fuel rewards:
 * - Rejects negative or absurd single-event rewards (> 120 Fuel)
 * - Diminishes reward by 80% if the same exercise/lesson is repeated >= 3 times in 10 minutes
 * - Caps total Fuel earned within a 15-minute sliding window (default 200 Fuel)
 */
export function validateFuelAwardAntiCheat(
  input: FuelAwardSecurityInput
): FuelAwardSecurityResult {
  const maxWindow = input.maxFuelPer15MinWindow ?? 200;
  const raw = Math.max(0, Math.min(120, Math.round(input.requestedFuel || 0)));

  const sameCount = (input.recentExerciseIdsLast10Min || []).filter(
    (id) => id === input.currentExerciseId
  ).length;

  let adjusted = raw;
  let trivialRepetitionDetected = false;
  if (sameCount >= 2) {
    // 3rd+ time doing the exact same exercise in 10 minutes
    trivialRepetitionDetected = true;
    adjusted = Math.max(1, Math.floor(raw * 0.2));
  }

  const remainingWindow = Math.max(0, maxWindow - Math.max(0, input.fuelEarnedInLast15Min));
  if (adjusted > remainingWindow) {
    return {
      approvedFuel: remainingWindow,
      cappedByWindow: true,
      trivialRepetitionDetected,
      reason: '15-minute anti-cheat Fuel cap reached.',
    };
  }

  return {
    approvedFuel: adjusted,
    cappedByWindow: false,
    trivialRepetitionDetected,
  };
}

export interface RankedLeagueMember extends LeagueParticipant {
  rank: number;
  zone: 'promotion' | 'safe' | 'demotion';
}

export function computeLeagueStandingsAndZone(
  participants: LeagueParticipant[],
  tierId: LeagueTierId
): {
  tier: (typeof LEAGUE_TIERS)[number];
  standings: RankedLeagueMember[];
} {
  const tier = LEAGUE_TIERS.find((t) => t.id === tierId) || LEAGUE_TIERS[0];
  const visible = participants.filter((p) => !p.optedOutOfLeaderboard);
  const sorted = [...visible].sort((a, b) => {
    if (b.weeklyFuel !== a.weeklyFuel) return b.weeklyFuel - a.weeklyFuel;
    return b.streakDays - a.streakDays;
  });

  const total = sorted.length;
  const standings: RankedLeagueMember[] = sorted.map((p, idx) => {
    const rank = idx + 1;
    let zone: 'promotion' | 'safe' | 'demotion' = 'safe';
    if (tier.promoteTopN > 0 && rank <= tier.promoteTopN) {
      zone = 'promotion';
    } else if (tier.demoteBottomN > 0 && total >= tier.promoteTopN + tier.demoteBottomN && rank > total - tier.demoteBottomN) {
      zone = 'demotion';
    }
    return {
      ...p,
      rank,
      zone,
    };
  });

  return { tier, standings };
}

export function canSendFriendNudge(
  friend: Pick<FriendConnection, 'allowNudges' | 'lastNudgedAt'>,
  nowMs: number = Date.now(),
  cooldownHours: number = 12
): { allowed: boolean; reason?: string } {
  if (!friend.allowNudges) {
    return { allowed: false, reason: 'This student has disabled nudge notifications.' };
  }
  if (friend.lastNudgedAt) {
    const elapsedMs = nowMs - new Date(friend.lastNudgedAt).getTime();
    const cooldownMs = cooldownHours * 3600_000;
    if (elapsedMs < cooldownMs) {
      const hoursLeft = Math.ceil((cooldownMs - elapsedMs) / 3600_000);
      return {
        allowed: false,
        reason: `Nudge rate limit active. You can nudge again in ${hoursLeft}h.`,
      };
    }
  }
  return { allowed: true };
}

// ============================================================================
// 3. ACHIEVEMENTS (40 BADGES), FREE COSMETICS & QUESTS ENGINE
// ============================================================================

export interface UserAchievementStats {
  streakDays: number;
  perfectLessonsCount: number;
  averageAccuracy: number;
  bestExamScore: number;
  speakingClipsCompleted: number;
  threeStarSpeakingClips: number;
  roleplaysCompleted: number;
  bestSpeakingScore: number;
  typingTextsCompleted: number;
  bestTypingCpm: number;
  wordsLearnedCount: number;
  garageReviewsCompleted: number;
  highestLeitnerBox: number;
  showroomCount: number;
  casesMasteredCount: number;
  completedLessonsCount: number;
  friendsCount: number;
  nudgesSentCount: number;
  weeklyFuel: number;
  questsCompletedCount: number;
  certificatesEarnedCount: number;
}

export function evaluatePhase4Badges(
  stats: UserAchievementStats,
  previouslyUnlockedIds: string[] = []
): {
  unlockedBadgeIds: string[];
  newlyUnlockedBadgeIds: string[];
  unlockedCosmeticIds: string[];
} {
  const prevSet = new Set(previouslyUnlockedIds);
  const unlockedBadgeIds: string[] = [];
  const newlyUnlockedBadgeIds: string[] = [];
  const cosmeticSet = new Set<string>(
    PHASE4_COSMETICS.filter((c) => c.unlockedByDefault).map((c) => c.id)
  );

  for (const badge of PHASE4_BADGES) {
    const val = stats[badge.unlockRule.metric] ?? 0;
    const passed =
      badge.unlockRule.operator === '>='
        ? val >= badge.unlockRule.threshold
        : val === badge.unlockRule.threshold;

    if (passed) {
      unlockedBadgeIds.push(badge.id);
      if (!prevSet.has(badge.id)) {
        newlyUnlockedBadgeIds.push(badge.id);
      }
      if (badge.rewardCosmeticId) {
        cosmeticSet.add(badge.rewardCosmeticId);
      }
    }
  }

  return {
    unlockedBadgeIds,
    newlyUnlockedBadgeIds,
    unlockedCosmeticIds: Array.from(cosmeticSet),
  };
}

export interface LearnerQuest {
  id: string;
  cadence: 'daily' | 'weekly';
  targetType: 'garage' | 'speaking' | 'typing' | 'lesson' | 'dictionary' | 'cases';
  progress: number;
  target: number;
  rewardFuel: number;
  completed: boolean;
  title: Record<SupportedLang, string>;
}

export function generatePersonalizedQuests(params: {
  dueGarageCount: number;
  weakCases: string[];
  weakLetters: string[];
  todayMinutesCompleted: number;
  goalMinutes: number;
  completedLessonsCount: number;
  speakingClipsCompleted: number;
  typingTextsCompleted: number;
}): LearnerQuest[] {
  const focusCase = params.weakCases[0] || 'Prepositional';
  const focusLetter = params.weakLetters[0] || 'Ы';
  const garageDone = params.dueGarageCount === 0 ? 1 : 0;

  return [
    // 3 Daily Quests
    {
      id: 'q-daily-goal',
      cadence: 'daily',
      targetType: 'lesson',
      progress: Math.min(params.goalMinutes, params.todayMinutesCompleted),
      target: params.goalMinutes,
      rewardFuel: 25,
      completed: params.todayMinutesCompleted >= params.goalMinutes,
      title: {
        ru: `Выполните дневную цель (${params.goalMinutes} мин на трассе)`,
        en: `Complete your daily driving goal (${params.goalMinutes} min)`,
        ar: `أكمل هدفك اليومي (${params.goalMinutes} دقائق)`,
        fr: `Atteignez votre objectif quotidien (${params.goalMinutes} min)`,
      },
    },
    {
      id: 'q-daily-garage',
      cadence: 'daily',
      targetType: 'garage',
      progress: garageDone,
      target: 1,
      rewardFuel: 20,
      completed: garageDone >= 1,
      title: {
        ru: `Повторите слабый падеж (${focusCase}) в Гараже Миши`,
        en: `Service weak case (${focusCase}) in Misha's Garage`,
        ar: `راجع الحالة الضعيفة (${focusCase}) في مرآب ميشا`,
        fr: `Révisez votre cas faible (${focusCase}) au Garage`,
      },
    },
    {
      id: 'q-daily-typing-speak',
      cadence: 'daily',
      targetType: 'typing',
      progress: Math.min(1, params.typingTextsCompleted + params.speakingClipsCompleted),
      target: 1,
      rewardFuel: 20,
      completed: params.typingTextsCompleted + params.speakingClipsCompleted >= 1,
      title: {
        ru: `Отработайте букву «${focusLetter}» в Печати или Произношении`,
        en: `Practice letter "${focusLetter}" in Typing Lab or Speak Studio`,
        ar: `تدرب على الحرف «${focusLetter}» في الطباعة أو التحدث`,
        fr: `Pratiquez la lettre « ${focusLetter} » en Frappe ou Oral`,
      },
    },
    // 3 Weekly Quests
    {
      id: 'q-weekly-lessons-5',
      cadence: 'weekly',
      targetType: 'lesson',
      progress: Math.min(5, params.completedLessonsCount),
      target: 5,
      rewardFuel: 60,
      completed: params.completedLessonsCount >= 5,
      title: {
        ru: 'Пройдите 5 остановок на карте маршрута МАДИ за неделю',
        en: 'Complete 5 stops on the MADI Road Map this week',
        ar: 'أكمل 5 محطات على خريطة طريق مادي هذا الأسبوع',
        fr: 'Complétez 5 étapes sur la carte routière cette semaine',
      },
    },
    {
      id: 'q-weekly-speak-3',
      cadence: 'weekly',
      targetType: 'speaking',
      progress: Math.min(3, params.speakingClipsCompleted),
      target: 3,
      rewardFuel: 50,
      completed: params.speakingClipsCompleted >= 3,
      title: {
        ru: 'Озвучьте 3 сцены с ударением в окне «Говорить»',
        en: 'Complete 3 stressed speaking clips in the Speak tab',
        ar: 'أكمل 3 مقاطع تحدث في نافذة التحدث',
        fr: 'Complétez 3 clips oraux dans l’onglet Parler',
      },
    },
    {
      id: 'q-weekly-cases',
      cadence: 'weekly',
      targetType: 'cases',
      progress: Math.min(3, params.completedLessonsCount),
      target: 3,
      rewardFuel: 50,
      completed: params.completedLessonsCount >= 3,
      title: {
        ru: 'Закрепите 3 падежных дорожных знака без ошибок',
        en: 'Master 3 grammatical case road signs with high accuracy',
        ar: 'أتقن 3 إشارات مرور للحالات الإعرابية بدقة عالية',
        fr: 'Maîtrisez 3 panneaux de cas grammaticaux',
      },
    },
  ];
}

// ============================================================================
// 4. ADAPTIVE PLACEMENT TEST & LEVEL EXAMS ENGINE
// ============================================================================

export interface PlacementSessionState {
  currentDifficultyRank: number; // 1 (A1) .. 5 (C1)
  maxQuestions: number; // default 15 (configurable 15-25)
  answered: Array<{
    questionId: string;
    skill: ExamSkillDomain;
    difficultyRank: number;
    isCorrect: boolean;
  }>;
  isComplete: boolean;
}

export function createInitialPlacementSession(maxQuestions: number = 15): PlacementSessionState {
  const clampedMax = Math.max(5, Math.min(25, maxQuestions));
  return {
    currentDifficultyRank: 2, // Starts mid-level (A2/B1 boundary)
    maxQuestions: clampedMax,
    answered: [],
    isComplete: false,
  };
}

export function selectNextPlacementQuestion(
  session: PlacementSessionState,
  bank: PlacementQuestion[] = PLACEMENT_QUESTION_BANK
): PlacementQuestion | null {
  if (session.isComplete || session.answered.length >= session.maxQuestions) {
    return null;
  }
  const askedIds = new Set(session.answered.map((a) => a.questionId));
  const remaining = bank.filter((q) => !askedIds.has(q.id));
  if (remaining.length === 0) return null;

  // Sort by closest difficultyRank to currentDifficultyRank, balancing skills
  const skillCounts: Record<ExamSkillDomain, number> = {
    reading: 0,
    vocabulary: 0,
    grammar: 0,
    listening: 0,
  };
  for (const a of session.answered) {
    skillCounts[a.skill] = (skillCounts[a.skill] || 0) + 1;
  }

  const sorted = [...remaining].sort((a, b) => {
    const diffA = Math.abs(a.difficultyRank - session.currentDifficultyRank);
    const diffB = Math.abs(b.difficultyRank - session.currentDifficultyRank);
    if (diffA !== diffB) return diffA - diffB;
    return skillCounts[a.skill] - skillCounts[b.skill];
  });

  return sorted[0] || null;
}

export function submitPlacementAnswer(
  session: PlacementSessionState,
  question: PlacementQuestion,
  chosenOption: string
): PlacementSessionState {
  const isCorrect = chosenOption.trim() === question.correctAnswer.trim();
  const nextRank = isCorrect
    ? Math.min(5, session.currentDifficultyRank + 1)
    : Math.max(1, session.currentDifficultyRank - 1);

  const nextAnswered = [
    ...session.answered,
    {
      questionId: question.id,
      skill: question.skill,
      difficultyRank: question.difficultyRank,
      isCorrect,
    },
  ];

  const isComplete =
    nextAnswered.length >= session.maxQuestions ||
    nextAnswered.length >= PLACEMENT_QUESTION_BANK.length;

  return {
    ...session,
    currentDifficultyRank: nextRank,
    answered: nextAnswered,
    isComplete,
  };
}

export interface PlacementRecommendationResult {
  recommendedCefrLevel: CefrLevel;
  recommendedUnitId: string;
  recommendedLessonIdsToUnlock: string[];
  overallAccuracyPct: number;
  skillBreakdown: Record<ExamSkillDomain, number>;
  summaryAdvice: Record<SupportedLang, string>;
}

export function evaluatePlacementResult(
  session: PlacementSessionState
): PlacementRecommendationResult {
  const total = Math.max(1, session.answered.length);
  const correctCount = session.answered.filter((a) => a.isCorrect).length;
  const overallAccuracyPct = Math.round((correctCount / total) * 100);

  // Weighted difficulty score from correct answers
  const weightedSum = session.answered.reduce(
    (acc, a) => acc + (a.isCorrect ? a.difficultyRank : 0),
    0
  );
  const avgEarnedRank = weightedSum / total;

  let recommendedCefrLevel: CefrLevel = 'A1';
  let recommendedUnitId = 'unit-1';
  let recommendedLessonIdsToUnlock: string[] = [];

  if (avgEarnedRank >= 3.6) {
    recommendedCefrLevel = 'B2';
    recommendedUnitId = 'unit-5';
    recommendedLessonIdsToUnlock = ['u1-l1', 'u1-l2', 'u1-l3', 'u1-l4', 'u1-l5', 'u1-l6', 'u2-l1', 'u2-l2', 'u3-l1', 'u4-l1'];
  } else if (avgEarnedRank >= 2.6) {
    recommendedCefrLevel = 'B1';
    recommendedUnitId = 'unit-4';
    recommendedLessonIdsToUnlock = ['u1-l1', 'u1-l2', 'u1-l3', 'u1-l4', 'u1-l5', 'u1-l6', 'u2-l1', 'u2-l2', 'u3-l1'];
  } else if (avgEarnedRank >= 1.6) {
    recommendedCefrLevel = 'A2';
    recommendedUnitId = 'unit-3';
    recommendedLessonIdsToUnlock = ['u1-l1', 'u1-l2', 'u1-l3', 'u1-l4', 'u1-l5', 'u1-l6', 'u2-l1'];
  } else if (avgEarnedRank >= 0.9) {
    recommendedCefrLevel = 'A1';
    recommendedUnitId = 'unit-2';
    recommendedLessonIdsToUnlock = ['u1-l1', 'u1-l2', 'u1-l3', 'u1-l4', 'u1-l5', 'u1-l6'];
  } else {
    recommendedCefrLevel = 'A1';
    recommendedUnitId = 'unit-1';
    recommendedLessonIdsToUnlock = [];
  }

  const skillBreakdown: Record<ExamSkillDomain, number> = {
    reading: 100,
    vocabulary: 100,
    grammar: 100,
    listening: 100,
  };

  for (const sk of ['reading', 'vocabulary', 'grammar', 'listening'] as ExamSkillDomain[]) {
    const items = session.answered.filter((a) => a.skill === sk);
    if (items.length > 0) {
      const ok = items.filter((a) => a.isCorrect).length;
      skillBreakdown[sk] = Math.round((ok / items.length) * 100);
    }
  }

  return {
    recommendedCefrLevel,
    recommendedUnitId,
    recommendedLessonIdsToUnlock,
    overallAccuracyPct,
    skillBreakdown,
    summaryAdvice: {
      ru: `Рекомендуемый старт: уровень ${recommendedCefrLevel} (${recommendedUnitId.toUpperCase()}). Вы всегда можете выбрать любую зону вручную.`,
      en: `Recommended start zone: CEFR ${recommendedCefrLevel} (${recommendedUnitId.toUpperCase()}). You can accept this jump or override it to any unit.`,
      ar: `نقطة البداية الموصى بها: المستوى ${recommendedCefrLevel} (${recommendedUnitId.toUpperCase()}). يمكنك قبول التوصية أو اختيار أي وحدة يدوياً.`,
      fr: `Zone de départ recommandée : Niveau ${recommendedCefrLevel} (${recommendedUnitId.toUpperCase()}). Vous pouvez accepter ou choisir manuellement.`,
    },
  };
}

export function canStartLevelExam(params: {
  lastAttemptAtIso: string | null;
  lastAttemptPassed: boolean;
  hasActiveSession: boolean;
  nowMs?: number;
  cooldownHours?: number;
}): { allowed: boolean; hoursRemaining: number; reason?: string } {
  if (params.hasActiveSession) {
    return {
      allowed: false,
      hoursRemaining: 0,
      reason: 'An active exam session is already in progress for your account.',
    };
  }
  const cooldown = params.cooldownHours ?? 24;
  if (!params.lastAttemptAtIso || params.lastAttemptPassed) {
    return { allowed: true, hoursRemaining: 0 };
  }
  const now = params.nowMs ?? Date.now();
  const elapsedMs = now - new Date(params.lastAttemptAtIso).getTime();
  const cooldownMs = cooldown * 3600_000;
  if (elapsedMs < cooldownMs) {
    const hoursRemaining = Math.max(1, Math.ceil((cooldownMs - elapsedMs) / 3600_000));
    return {
      allowed: false,
      hoursRemaining,
      reason: `Retake cooldown active. You can retake this level exam in ${hoursRemaining} hours.`,
    };
  }
  return { allowed: true, hoursRemaining: 0 };
}

export interface ExamScoreResult {
  level: CefrLevel;
  passed: boolean;
  overallScorePct: number;
  passScorePct: number;
  scoreBand: CertificateScoreBand | null;
  skillScores: {
    reading: number;
    vocabulary: number;
    grammar: number;
    listening: number;
    typing: number;
    speaking: number;
    teacherRubric?: number;
  };
  advice: Record<SupportedLang, string>;
}

export function scoreLevelExamSubmission(params: {
  level: CefrLevel;
  questionAnswers: Record<string, string>;
  typingAccuracyPct: number;
  typingCpm: number;
  speakingScorePct: number;
  teacherRubricScores?: Record<string, number>;
}): ExamScoreResult {
  const examDef: CefrExamDefinition = CEFR_LEVEL_EXAMS[params.level] || CEFR_LEVEL_EXAMS.A1;
  const qs = examDef.questions;

  const domainTotals: Record<ExamSkillDomain, { correct: number; total: number }> = {
    reading: { correct: 0, total: 0 },
    vocabulary: { correct: 0, total: 0 },
    grammar: { correct: 0, total: 0 },
    listening: { correct: 0, total: 0 },
  };

  let totalCorrectQs = 0;
  for (const q of qs) {
    domainTotals[q.skill].total += 1;
    const given = (params.questionAnswers[q.id] || '').trim();
    if (given === q.correctAnswer.trim()) {
      domainTotals[q.skill].correct += 1;
      totalCorrectQs += 1;
    }
  }

  const questionScorePct = qs.length > 0 ? Math.round((totalCorrectQs / qs.length) * 100) : 100;
  const typingScorePct = Math.max(0, Math.min(100, Math.round(params.typingAccuracyPct)));
  const speakingScorePct = Math.max(0, Math.min(100, Math.round(params.speakingScorePct)));

  let teacherRubricPct: number | undefined;
  if (params.teacherRubricScores && Object.keys(params.teacherRubricScores).length > 0) {
    const sum = Object.values(params.teacherRubricScores).reduce((a, b) => a + Number(b || 0), 0);
    teacherRubricPct = Math.max(0, Math.min(100, Math.round(sum)));
  }

  const overallScorePct =
    teacherRubricPct !== undefined
      ? Math.round(
          questionScorePct * 0.55 +
            typingScorePct * 0.15 +
            speakingScorePct * 0.15 +
            teacherRubricPct * 0.15
        )
      : Math.round(questionScorePct * 0.7 + typingScorePct * 0.15 + speakingScorePct * 0.15);

  const passed = overallScorePct >= examDef.passScorePct;
  const scoreBand = computeCertificateScoreBand(overallScorePct, examDef.passScorePct);

  const calcDomain = (d: ExamSkillDomain) =>
    domainTotals[d].total > 0
      ? Math.round((domainTotals[d].correct / domainTotals[d].total) * 100)
      : questionScorePct;

  const skillScores = {
    reading: calcDomain('reading'),
    vocabulary: calcDomain('vocabulary'),
    grammar: calcDomain('grammar'),
    listening: calcDomain('listening'),
    typing: typingScorePct,
    speaking: speakingScorePct,
    ...(teacherRubricPct !== undefined ? { teacherRubric: teacherRubricPct } : {}),
  };

  const advice: Record<SupportedLang, string> = passed
    ? {
        ru: `Поздравляем! Вы успешно сдали экзамен ${params.level} (${overallScorePct}%). Подтвердите написание имени, чтобы выпустить сертификат PDF.`,
        en: `Congratulations! You passed the ${params.level} exam (${overallScorePct}%). Confirm your name spelling to issue your verified PDF certificate.`,
        ar: `تهانينا! لقد اجتزت امتحان المستوى ${params.level} (${overallScorePct}%). أكّد كتابة اسمك لإصدار شهادتك بصيغة PDF.`,
        fr: `Félicitations ! Vous avez réussi l’examen ${params.level} (${overallScorePct} %). Confirmez l’orthographe de votre nom pour générer votre certificat PDF.`,
      }
    : {
        ru: `Результат ${overallScorePct}% (проходной балл: ${examDef.passScorePct}%). Рекомендуем повторить падежи в Гараже Миши и пересдать через 24 часа.`,
        en: `Score: ${overallScorePct}% (pass mark: ${examDef.passScorePct}%). Review weak grammar cases in Misha's Garage and retake after the 24-hour cooldown.`,
        ar: `النتيجة: ${overallScorePct}% (درجة النجاح: ${examDef.passScorePct}%). راجع نقاط الضعف في مرآب ميشا وأعد المحاولة بعد 24 ساعة.`,
        fr: `Score : ${overallScorePct} % (seuil : ${examDef.passScorePct} %). Révisez vos points faibles dans le Garage et réessayez dans 24 heures.`,
      };

  return {
    level: params.level,
    passed,
    overallScorePct,
    passScorePct: examDef.passScorePct,
    scoreBand,
    skillScores,
    advice,
  };
}

// ============================================================================
// 5. SMART PERSONALIZATION ("TODAY FOR YOU" + ADAPTIVE DIFFICULTY)
// ============================================================================

export type RecommendedActionType =
  | 'teacher_assignment'
  | 'garage_review'
  | 'speaking_clip'
  | 'typing_drill'
  | 'continue_lesson';

export interface TodayForYouRecommendation {
  actionType: RecommendedActionType;
  priorityScore: number;
  targetId?: string;
  headline: Record<SupportedLang, string>;
  whyRecommended: Record<SupportedLang, string>;
  ctaLabel: Record<SupportedLang, string>;
  weakSkillSummary: {
    topWeakCase: string | null;
    topWeakLetter: string | null;
    dueReviewsCount: number;
  };
}

/**
 * Explainable Rule + Score Personalization Engine for the Road Map "Today for you" card.
 */
export function computeTodayForYouRecommendation(params: {
  dueGarageCount: number;
  pendingTeacherAssignmentsCount: number;
  nextAssignmentTitle?: string;
  weakCases: string[];
  weakLetters: string[];
  avgSpeakingScore: number;
  bestTypingCpm: number;
  nextLessonTitle?: Record<SupportedLang, string>;
  nextLessonId?: string;
}): TodayForYouRecommendation {
  const topWeakCase = params.weakCases[0] || null;
  const topWeakLetter = params.weakLetters[0] || null;

  // Rule 1: Pending teacher assignment has highest priority (Score 95)
  if (params.pendingTeacherAssignmentsCount > 0) {
    return {
      actionType: 'teacher_assignment',
      priorityScore: 95,
      headline: {
        ru: `Задание преподавателя: ${params.nextAssignmentTitle || 'Обязательный урок'}`,
        en: `Teacher Assignment Due: ${params.nextAssignmentTitle || 'Assigned Lesson'}`,
        ar: `واجب المدرس المستحق: ${params.nextAssignmentTitle || 'درس مخصص'}`,
        fr: `Devoir de l’enseignant : ${params.nextAssignmentTitle || 'Leçon assignée'}`,
      },
      whyRecommended: {
        ru: `Правило #1 (Приоритет 95/100): У вас есть ${params.pendingTeacherAssignmentsCount} активное задание от преподавателя группы.`,
        en: `Rule #1 (Priority 95/100): You have ${params.pendingTeacherAssignmentsCount} active class assignment(s) assigned by your MADI instructor.`,
        ar: `القاعدة #1 (الأولوية 95/100): لديك ${params.pendingTeacherAssignmentsCount} واجب دراسي نشط من مدرس المجموعة.`,
        fr: `Règle #1 (Priorité 95/100) : Vous avez ${params.pendingTeacherAssignmentsCount} devoir(s) actif(s) assigné(s) par votre enseignant.`,
      },
      ctaLabel: {
        ru: 'Выполнить задание',
        en: 'Start Assignment',
        ar: 'ابدأ الواجب',
        fr: 'Commencer le devoir',
      },
      weakSkillSummary: { topWeakCase, topWeakLetter, dueReviewsCount: params.dueGarageCount },
    };
  }

  // Rule 2: Garage SRS items due >= 3 (Score 88)
  if (params.dueGarageCount >= 3) {
    return {
      actionType: 'garage_review',
      priorityScore: 88,
      headline: {
        ru: `Техосмотр в Гараже: ${params.dueGarageCount} слов и падежей ждут повторения`,
        en: `Garage Pit-Stop: ${params.dueGarageCount} due Leitner items ready for tuning`,
        ar: `صيانة المرآب: ${params.dueGarageCount} عناصر مستحقة للمراجعة`,
        fr: `Entretien au Garage : ${params.dueGarageCount} éléments Leitner à réviser`,
      },
      whyRecommended: {
        ru: `Правило #2 (Приоритет 88/100): В боксах Лейтнера накопилось ${params.dueGarageCount} карточек${topWeakCase ? ` (особенно падеж: ${topWeakCase})` : ''}.`,
        en: `Rule #2 (Priority 88/100): ${params.dueGarageCount} spaced-repetition items passed their Leitner interval${topWeakCase ? ` (focusing on ${topWeakCase} case)` : ''}.`,
        ar: `القاعدة #2 (الأولوية 88/100): هناك ${params.dueGarageCount} بطاقات حان موعد مراجعتها لتثبيت الذاكرة.`,
        fr: `Règle #2 (Priorité 88/100) : ${params.dueGarageCount} cartes ont atteint leur échéance de répétition espacée.`,
      },
      ctaLabel: {
        ru: 'Открыть Гараж',
        en: 'Service in Garage',
        ar: 'افتح المرآب',
        fr: 'Ouvrir le Garage',
      },
      weakSkillSummary: { topWeakCase, topWeakLetter, dueReviewsCount: params.dueGarageCount },
    };
  }

  // Rule 3: Low speaking score or pronunciation practice needed (Score 78)
  if (params.avgSpeakingScore > 0 && params.avgSpeakingScore < 75) {
    return {
      actionType: 'speaking_clip',
      priorityScore: 78,
      headline: {
        ru: 'Разговорный тренажёр: отработка ударения и беглости речи',
        en: 'Speaking Studio: 3-minute stress & pronunciation tune-up',
        ar: 'استوديو التحدث: تدريب سريع على النبر والطلاقة',
        fr: 'Studio Oral : entraînement à l’accent tonique et la fluidité',
      },
      whyRecommended: {
        ru: `Правило #3 (Приоритет 78/100): Средний балл произношения (${params.avgSpeakingScore}%) ниже целевых 75%.`,
        en: `Rule #3 (Priority 78/100): Your average speaking score (${params.avgSpeakingScore}%) is below the 75% target threshold.`,
        ar: `القاعدة #3 (الأولوية 78/100): متوسط درجة النطق (${params.avgSpeakingScore}%) أقل من الهدف 75%.`,
        fr: `Règle #3 (Priorité 78/100) : Votre score oral moyen (${params.avgSpeakingScore} %) est inférieur à la cible de 75 %.`,
      },
      ctaLabel: {
        ru: 'Тренировать речь',
        en: 'Practice Speaking',
        ar: 'تدرب على التحدث',
        fr: 'Pratiquer l’oral',
      },
      weakSkillSummary: { topWeakCase, topWeakLetter, dueReviewsCount: params.dueGarageCount },
    };
  }

  // Rule 4: Weak Cyrillic keyboard letter heatmap (Score 72)
  if (topWeakLetter && params.bestTypingCpm < 110) {
    return {
      actionType: 'typing_drill',
      priorityScore: 72,
      headline: {
        ru: `Лаборатория печати: закрепление клавиши «${topWeakLetter}»`,
        en: `Typing Lab Drill: Master the Cyrillic key "${topWeakLetter}"`,
        ar: `مختبر الطباعة: إتقان الحرف الكيريلي «${topWeakLetter}»`,
        fr: `Labo de frappe : maîtriser la touche cyrillique « ${topWeakLetter} »`,
      },
      whyRecommended: {
        ru: `Правило #4 (Приоритет 72/100): Тепловая карта клавиатуры выявила частые опечатки на букве «${topWeakLetter}».`,
        en: `Rule #4 (Priority 72/100): Your keyboard error heatmap flagged letter "${topWeakLetter}" as a frequent bottleneck.`,
        ar: `القاعدة #4 (الأولوية 72/100): أظهرت خريطة أخطاء لوحة المفاتيح تكرار الخطأ في الحرف «${topWeakLetter}».`,
        fr: `Règle #4 (Priorité 72/100) : La carte thermique du clavier indique des fautes fréquentes sur « ${topWeakLetter} ».`,
      },
      ctaLabel: {
        ru: 'Открыть Лабораторию печати',
        en: 'Open Typing Lab',
        ar: 'افتح مختبر الطباعة',
        fr: 'Ouvrir le Labo de frappe',
      },
      weakSkillSummary: { topWeakCase, topWeakLetter, dueReviewsCount: params.dueGarageCount },
    };
  }

  // Default Rule 5: Continue next stop on the Road Map (Score 65)
  const nextTitle = params.nextLessonTitle || {
    ru: 'Следующая остановка на шоссе МАДИ',
    en: 'Next Stop on the MADI Highway',
    ar: 'المحطة التالية على طريق مادي',
    fr: 'Prochaine étape sur l’autoroute MADI',
  };

  return {
    actionType: 'continue_lesson',
    priorityScore: 65,
    targetId: params.nextLessonId,
    headline: nextTitle,
    whyRecommended: {
      ru: 'Правило #5 (Приоритет 65/100): Все срочные повторения выполнены — самое время продвинуться вперёд по карте маршрута!',
      en: 'Rule #5 (Priority 65/100): Your Garage bays are clear—advance to your next unlocked stop on the Road Map!',
      ar: 'القاعدة #5 (الأولوية 65/100): لا توجد مراجعات متأخرة — تقدم إلى المحطة التالية على الخريطة!',
      fr: 'Règle #5 (Priorité 65/100) : Votre Garage est à jour — avancez vers la prochaine étape sur la carte !',
    },
    ctaLabel: {
      ru: 'Поехали в урок',
      en: 'Drive Next Lesson',
      ar: 'ابدأ الدرس التالي',
      fr: 'Lancer la leçon',
    },
    weakSkillSummary: { topWeakCase, topWeakLetter, dueReviewsCount: params.dueGarageCount },
  };
}

export function evaluateAdaptiveLessonDifficulty(params: {
  mistakesOnCurrentStep: number;
  consecutiveFirstTryCorrectStreak: number;
  remainingStepsCount: number;
}): {
  offerExtraPractice: boolean;
  offerSkipAhead: boolean;
} {
  return {
    offerExtraPractice: params.mistakesOnCurrentStep >= 2,
    offerSkipAhead:
      params.consecutiveFirstTryCorrectStreak >= 4 && params.remainingStepsCount >= 2,
  };
}

// ============================================================================
// 6. NOTIFICATIONS ENGINE (QUIET HOURS, FREQUENCY CAPS, OPT-IN)
// ============================================================================

export type NotificationType =
  | 'streak_reminder'
  | 'garage_due'
  | 'assignment_due'
  | 'league_result'
  | 'certificate_issued'
  | 'teacher_announcement';

export interface NotificationPreferences {
  inAppEnabled: boolean;
  webPushOptIn: boolean;
  emailDigestOptIn: boolean;
  quietHoursStart: number; // 0-23, e.g. 22
  quietHoursEnd: number; // 0-23, e.g. 8
  maxDailyNotifications: number; // default 3
  typesEnabled: Record<NotificationType, boolean>;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  inAppEnabled: true,
  webPushOptIn: false,
  emailDigestOptIn: true,
  quietHoursStart: 22,
  quietHoursEnd: 8,
  maxDailyNotifications: 3,
  typesEnabled: {
    streak_reminder: true,
    garage_due: true,
    assignment_due: true,
    league_result: true,
    certificate_issued: true,
    teacher_announcement: true,
  },
};

export function isWithinQuietHours(
  hour24: number,
  startHour: number = 22,
  endHour: number = 8
): boolean {
  const h = ((hour24 % 24) + 24) % 24;
  if (startHour === endHour) return false;
  if (startHour < endHour) {
    return h >= startHour && h < endHour;
  }
  // Overnight wrap (e.g. 22:00 -> 08:00)
  return h >= startHour || h < endHour;
}

export function shouldDeliverNotification(params: {
  prefs: NotificationPreferences;
  type: NotificationType;
  currentHour24: number;
  sentTodayCount: number;
}): { deliver: boolean; reason?: string } {
  if (!params.prefs.inAppEnabled) {
    return { deliver: false, reason: 'Notifications are disabled by user preference.' };
  }
  if (!params.prefs.typesEnabled[params.type]) {
    return { deliver: false, reason: `Notification type "${params.type}" is turned off.` };
  }
  if (params.sentTodayCount >= params.prefs.maxDailyNotifications) {
    return { deliver: false, reason: 'Daily notification frequency cap reached.' };
  }
  if (
    isWithinQuietHours(
      params.currentHour24,
      params.prefs.quietHoursStart,
      params.prefs.quietHoursEnd
    )
  ) {
    return { deliver: false, reason: 'Suppressed during student quiet hours.' };
  }
  return { deliver: true };
}

// ============================================================================
// 7. ADMIN ANALYTICS & COST MONITOR ENGINE
// ============================================================================

export interface ProviderUsageEntry {
  service: 'stt' | 'tts' | 'llm';
  requestsCount: number;
  estimatedCostUsd: number;
}

export interface CostMonitorReport {
  monthlyBudgetUsd: number;
  totalSpendUsd: number;
  budgetUsedPct: number;
  alertLevel: 'nominal' | 'warning' | 'critical';
  byService: Record<'stt' | 'tts' | 'llm', { requestsCount: number; costUsd: number }>;
}

export function computeCostMonitorSummary(
  entries: ProviderUsageEntry[],
  monthlyBudgetUsd: number = 150
): CostMonitorReport {
  const byService: Record<'stt' | 'tts' | 'llm', { requestsCount: number; costUsd: number }> = {
    stt: { requestsCount: 0, costUsd: 0 },
    tts: { requestsCount: 0, costUsd: 0 },
    llm: { requestsCount: 0, costUsd: 0 },
  };

  for (const e of entries) {
    if (byService[e.service]) {
      byService[e.service].requestsCount += e.requestsCount;
      byService[e.service].costUsd =
        Math.round((byService[e.service].costUsd + e.estimatedCostUsd) * 1000) / 1000;
    }
  }

  const totalSpendUsd =
    Math.round(
      (byService.stt.costUsd + byService.tts.costUsd + byService.llm.costUsd) * 100
    ) / 100;
  const safeBudget = Math.max(1, monthlyBudgetUsd);
  const budgetUsedPct = Math.round((totalSpendUsd / safeBudget) * 100);

  let alertLevel: 'nominal' | 'warning' | 'critical' = 'nominal';
  if (budgetUsedPct >= 90) alertLevel = 'critical';
  else if (budgetUsedPct >= 75) alertLevel = 'warning';

  return {
    monthlyBudgetUsd: safeBudget,
    totalSpendUsd,
    budgetUsedPct,
    alertLevel,
    byService,
  };
}

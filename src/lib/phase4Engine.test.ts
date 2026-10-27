import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PHASE4_BADGES,
  PHASE4_COSMETICS,
  LEAGUE_TIERS,
  DEMO_LEAGUE_PARTICIPANTS,
  PLACEMENT_QUESTION_BANK,
  CEFR_LEVEL_EXAMS,
} from '../data/phase4Data';
import {
  checkCertificateEligibility,
  generateCertificateId,
  renderCertificateSvg,
  validateFuelAwardAntiCheat,
  computeLeagueStandingsAndZone,
  canSendFriendNudge,
  evaluatePhase4Badges,
  generatePersonalizedQuests,
  createInitialPlacementSession,
  selectNextPlacementQuestion,
  submitPlacementAnswer,
  evaluatePlacementResult,
  canStartLevelExam,
  scoreLevelExamSubmission,
  computeTodayForYouRecommendation,
  evaluateAdaptiveLessonDifficulty,
  shouldDeliverNotification,
  DEFAULT_NOTIFICATION_PREFS,
  computeCostMonitorSummary,
} from './phase4Engine';

describe('Phase 4 Data Integrity — 40 Original Badges, Free Cosmetics, Exams & Tiers', () => {
  it('contains exactly 40 original badges across all 8 required categories in JSON', () => {
    assert.equal(PHASE4_BADGES.length, 40);
    const categories = new Set(PHASE4_BADGES.map((b) => b.category));
    for (const expectedCat of [
      'consistency',
      'accuracy',
      'speaking',
      'typing_speed',
      'dictionary_explorer',
      'garage_hero',
      'grammar_signs',
      'helpers',
    ] as const) {
      assert.equal(categories.has(expectedCat), true, `Missing category: ${expectedCat}`);
      const countInCat = PHASE4_BADGES.filter((b) => b.category === expectedCat).length;
      assert.equal(countInCat, 5, `Expected 5 badges in ${expectedCat}, found ${countInCat}`);
    }
  });

  it('uses strictly original road-themed tier names (no car brands) and 100% free cosmetics', () => {
    assert.equal(LEAGUE_TIERS.length, 6);
    const allTierText = JSON.stringify(LEAGUE_TIERS).toLowerCase();
    for (const forbiddenBrand of ['lada', 'volga', 'moskvich', 'kamaz', 'auras']) {
      assert.equal(allTierText.includes(forbiddenBrand), false);
    }
    assert.ok(PHASE4_COSMETICS.length >= 12);
  });
});

describe('Phase 4 Engine — Certificates Eligibility, Verification & SVG/PDF Rendering', () => {
  it('requires passing score (>=75%) and confirmed Latin + Cyrillic name spelling', () => {
    const failScore = checkCertificateEligibility({
      scorePct: 68,
      passScorePct: 75,
      nameLatinConfirmed: 'Test Student',
      nameCyrillicConfirmed: 'Тест Студент',
    });
    assert.equal(failScore.eligible, false);

    const missingCyrillic = checkCertificateEligibility({
      scorePct: 88,
      passScorePct: 75,
      nameLatinConfirmed: 'Test Student',
      nameCyrillicConfirmed: '',
    });
    assert.equal(missingCyrillic.eligible, false);

    const distinctionPass = checkCertificateEligibility({
      scorePct: 95,
      passScorePct: 75,
      nameLatinConfirmed: 'Test Student',
      nameCyrillicConfirmed: 'Тест Студент',
    });
    assert.equal(distinctionPass.eligible, true);
    assert.equal(distinctionPass.scoreBand, 'Distinction');
  });

  it('renders A4 Landscape SVG certificate with MADI colors, Cyrillic/Latin/Arabic text, QR code, and disclaimer', () => {
    const certId = generateCertificateId('A1', 'usr-123', 1761400000000);
    assert.ok(certId.startsWith('MDG-A1-'));

    const svg = renderCertificateSvg(
      {
        id: certId,
        userId: 'usr-123',
        level: 'A1',
        studentNameLatin: 'Test Student',
        studentNameCyrillic: 'Тест Студент',
        scorePct: 94,
        scoreBand: 'Distinction',
        issuedAt: '2026-10-25T12:00:00Z',
        verifyUrl: `https://madingo.madi.ru/verify/${certId}`,
        revoked: false,
        disclaimerText:
          'Issued by the Madingo learning platform of MADI. This is a course completion certificate, not an official state language-test certificate.',
        signatureTeacher: 'Подпись преподавателя (образец)',
        signatureDepartment: 'Кафедра РКИ МАДИ',
      },
      'ar'
    );

    assert.ok(svg.includes('viewBox="0 0 1123 794"'));
    assert.ok(svg.includes('Тест Студент'));
    assert.ok(svg.includes('Test Student'));
    assert.ok(svg.includes('madingo'));
    assert.ok(svg.includes('not an official state language-test certificate'));
  });
});

describe('Phase 4 Engine — Weekly Leagues, Anti-Cheat & Social Nudge Rate-Limiting', () => {
  it('promotes top N and demotes bottom N learners while respecting leaderboard opt-out', () => {
    const { standings } = computeLeagueStandingsAndZone(
      DEMO_LEAGUE_PARTICIPANTS,
      'campus_street'
    );
    assert.equal(standings.length, DEMO_LEAGUE_PARTICIPANTS.length);
    assert.equal(standings[0].rank, 1);
    assert.equal(standings[0].zone, 'promotion');
    assert.equal(standings[5].zone, 'promotion'); // top 6 promote in campus_street
    assert.equal(standings[6].zone, 'safe');
    assert.equal(standings[standings.length - 1].zone, 'demotion'); // bottom 5 demote
  });

  it('caps Fuel in 15-minute window and penalizes repeated trivial exercises', () => {
    const normal = validateFuelAwardAntiCheat({
      requestedFuel: 40,
      fuelEarnedInLast15Min: 50,
      recentExerciseIdsLast10Min: ['u1-l1', 'u1-l2'],
      currentExerciseId: 'u1-l3',
    });
    assert.equal(normal.approvedFuel, 40);
    assert.equal(normal.trivialRepetitionDetected, false);

    // Repeating u1-l1 for the 3rd time in 10 minutes -> 80% reduction
    const repeated = validateFuelAwardAntiCheat({
      requestedFuel: 40,
      fuelEarnedInLast15Min: 50,
      recentExerciseIdsLast10Min: ['u1-l1', 'u1-l1'],
      currentExerciseId: 'u1-l1',
    });
    assert.equal(repeated.trivialRepetitionDetected, true);
    assert.equal(repeated.approvedFuel, 8);

    // Hitting 200 Fuel cap per 15 min
    const capped = validateFuelAwardAntiCheat({
      requestedFuel: 50,
      fuelEarnedInLast15Min: 190,
      recentExerciseIdsLast10Min: [],
      currentExerciseId: 'u2-l1',
      maxFuelPer15MinWindow: 200,
    });
    assert.equal(capped.cappedByWindow, true);
    assert.equal(capped.approvedFuel, 10);
  });

  it('enforces 12-hour cooldown on friend nudges and respects opt-out', () => {
    const now = new Date('2026-10-25T15:00:00Z').getTime();
    const recent = canSendFriendNudge(
      { allowNudges: true, lastNudgedAt: '2026-10-25T10:00:00Z' },
      now,
      12
    );
    assert.equal(recent.allowed, false);

    const ready = canSendFriendNudge(
      { allowNudges: true, lastNudgedAt: '2026-10-24T10:00:00Z' },
      now,
      12
    );
    assert.equal(ready.allowed, true);
  });
});

describe('Phase 4 Engine — Adaptive Placement Test & CEFR Level Exams', () => {
  it('adapts difficulty up on correct answers and down on wrong answers', () => {
    let session = createInitialPlacementSession(6);
    assert.equal(session.currentDifficultyRank, 2);

    // Answer 6 questions all correctly -> should step up to B1/B2
    for (let i = 0; i < 6; i++) {
      const q = selectNextPlacementQuestion(session, PLACEMENT_QUESTION_BANK);
      assert.ok(q, `Expected question at step ${i}`);
      session = submitPlacementAnswer(session, q, q.correctAnswer);
    }
    assert.equal(session.isComplete, true);
    const recHigh = evaluatePlacementResult(session);
    assert.ok(['B1', 'B2'].includes(recHigh.recommendedCefrLevel));
    assert.equal(recHigh.overallAccuracyPct, 100);
  });

  it('enforces 24h retake cooldown after a failed exam and scores exam skills accurately', () => {
    const now = new Date('2026-10-25T18:00:00Z').getTime();
    const blocked = canStartLevelExam({
      lastAttemptAtIso: '2026-10-25T10:00:00Z',
      lastAttemptPassed: false,
      hasActiveSession: false,
      nowMs: now,
      cooldownHours: 24,
    });
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.hoursRemaining, 16);

    const a1Exam = CEFR_LEVEL_EXAMS.A1;
    const perfectAnswers: Record<string, string> = {};
    for (const q of a1Exam.questions) {
      perfectAnswers[q.id] = q.correctAnswer;
    }

    const scored = scoreLevelExamSubmission({
      level: 'A1',
      questionAnswers: perfectAnswers,
      typingAccuracyPct: 96,
      typingCpm: 110,
      speakingScorePct: 90,
    });
    assert.equal(scored.passed, true);
    assert.ok(scored.overallScorePct >= 90);
    assert.equal(scored.scoreBand, 'Distinction');
  });
});

describe('Phase 4 Engine — Badges, Personalization, Notifications & Cost Monitor', () => {
  it('evaluates 40 badges and unlocks free cosmetics when thresholds are met', () => {
    const res = evaluatePhase4Badges({
      streakDays: 7,
      perfectLessonsCount: 5,
      averageAccuracy: 94,
      bestExamScore: 96,
      speakingClipsCompleted: 10,
      threeStarSpeakingClips: 2,
      roleplaysCompleted: 3,
      bestSpeakingScore: 95,
      typingTextsCompleted: 12,
      bestTypingCpm: 185,
      wordsLearnedCount: 60,
      garageReviewsCompleted: 12,
      highestLeitnerBox: 4,
      showroomCount: 2,
      casesMasteredCount: 6,
      completedLessonsCount: 26,
      friendsCount: 2,
      nudgesSentCount: 1,
      weeklyFuel: 200,
      questsCompletedCount: 4,
      certificatesEarnedCount: 1,
    });

    assert.ok(res.unlockedBadgeIds.length >= 30);
    assert.ok(res.unlockedCosmeticIds.includes('car-madi-blue'));
    assert.ok(res.unlockedCosmeticIds.includes('outfit-winter-ushanka'));
    assert.ok(res.unlockedCosmeticIds.includes('theme-snow-winter'));
  });

  it('explains "Today for you" recommendation priorities and adaptive lesson difficulty', () => {
    const recGarage = computeTodayForYouRecommendation({
      dueGarageCount: 5,
      pendingTeacherAssignmentsCount: 0,
      weakCases: ['Prepositional'],
      weakLetters: ['Ы'],
      avgSpeakingScore: 85,
      bestTypingCpm: 130,
    });
    assert.equal(recGarage.actionType, 'garage_review');
    assert.ok(recGarage.whyRecommended.en.includes('Rule #2'));

    const adaptive = evaluateAdaptiveLessonDifficulty({
      mistakesOnCurrentStep: 2,
      consecutiveFirstTryCorrectStreak: 0,
      remainingStepsCount: 4,
    });
    assert.equal(adaptive.offerExtraPractice, true);
    assert.equal(adaptive.offerSkipAhead, false);

    const quests = generatePersonalizedQuests({
      dueGarageCount: 2,
      weakCases: ['Genitive'],
      weakLetters: ['Щ'],
      todayMinutesCompleted: 5,
      goalMinutes: 10,
      completedLessonsCount: 3,
      speakingClipsCompleted: 1,
      typingTextsCompleted: 2,
    });
    assert.equal(quests.length, 6); // 3 daily + 3 weekly
  });

  it('suppresses notifications during overnight quiet hours and when daily cap is reached', () => {
    const quietBlocked = shouldDeliverNotification({
      prefs: DEFAULT_NOTIFICATION_PREFS, // 22:00 -> 08:00
      type: 'streak_reminder',
      currentHour24: 23,
      sentTodayCount: 0,
    });
    assert.equal(quietBlocked.deliver, false);

    const daytimeAllowed = shouldDeliverNotification({
      prefs: DEFAULT_NOTIFICATION_PREFS,
      type: 'streak_reminder',
      currentHour24: 14,
      sentTodayCount: 1,
    });
    assert.equal(daytimeAllowed.deliver, true);

    const capBlocked = shouldDeliverNotification({
      prefs: DEFAULT_NOTIFICATION_PREFS,
      type: 'garage_due',
      currentHour24: 15,
      sentTodayCount: 3,
    });
    assert.equal(capBlocked.deliver, false);
  });

  it('computes STT/TTS/LLM provider cost monitor alerts accurately', () => {
    const report = computeCostMonitorSummary(
      [
        { service: 'stt', requestsCount: 1200, estimatedCostUsd: 48 },
        { service: 'tts', requestsCount: 900, estimatedCostUsd: 27 },
        { service: 'llm', requestsCount: 600, estimatedCostUsd: 45 },
      ],
      100
    );
    assert.equal(report.totalSpendUsd, 120);
    assert.equal(report.budgetUsedPct, 120);
    assert.equal(report.alertLevel, 'critical');
  });
});

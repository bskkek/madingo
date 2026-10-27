// ============================================================================
// MADINGO — AI CLASSROOM CHALLENGE ARENA ENGINE
// Real-time teacher-led challenge rooms with AI page-to-exercise extraction,
// live student scoring, and performance ranking (strongest vs. needs review).
// ============================================================================

export interface ArenaQuestion {
  id: string;
  promptRu: string;
  promptTranslit?: string;
  hintAr?: string;
  hintEn?: string;
  instructionRu: string;
  instructionAr: string;
  instructionEn: string;
  options: string[];
  correctIndex: number;
  explanationRu: string;
  explanationAr: string;
  explanationEn: string;
  points: number;
}

export interface ArenaPageSource {
  id: string;
  title: string;
  bookTitle?: string;
  pageNumber?: number;
  imageUrl?: string;
  rawText?: string;
}

export interface ArenaParticipantAnswer {
  optionIndex: number;
  isCorrect: boolean;
  timeSeconds: number;
  pointsEarned: number;
  answeredAt: string;
}

export interface ArenaParticipant {
  id: string;
  name: string;
  avatar: string;
  role: 'teacher' | 'student';
  score: number;
  correctCount: number;
  totalAnswered: number;
  currentStreak: number;
  bestStreak: number;
  answers: Record<string, ArenaParticipantAnswer>;
  isOnline: boolean;
  joinedAt: string;
}

export type ArenaRoomStatus =
  | 'setup'
  | 'waiting'
  | 'active'
  | 'question_review'
  | 'finished';

export interface ArenaRoom {
  id: string;
  code: string;
  title: string;
  description?: string;
  teacherId: string;
  teacherName: string;
  status: ArenaRoomStatus;
  exerciseTopic: string;
  teacherInstructions: string;
  pages: ArenaPageSource[];
  questions: ArenaQuestion[];
  currentQuestionIndex: number;
  questionTimeLimitSeconds: number;
  participants: Record<string, ArenaParticipant>;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface RankedStudent {
  rank: number;
  id: string;
  name: string;
  avatar: string;
  score: number;
  accuracyPct: number;
  correctCount: number;
  totalAnswered: number;
  bestStreak: number;
  tier: 'gold' | 'silver' | 'bronze' | 'needs_review';
  tierLabel: {
    ru: string;
    ar: string;
    en: string;
    fr: string;
  };
}

export interface ClassroomAnalytics {
  totalStudents: number;
  averageScore: number;
  classAccuracyPct: number;
  hardestQuestions: Array<{
    questionId: string;
    questionPrompt: string;
    mistakeCount: number;
    successRatePct: number;
  }>;
  strongestStudents: RankedStudent[];
  needsSupportStudents: RankedStudent[];
}

/**
 * Generates a simple, memorable 4-digit room code for students.
 */
export function generateRoomCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return String(num);
}

export function validateRoomCode(code: string): boolean {
  if (!code) return false;
  const clean = code.trim().toUpperCase();
  return /^[A-Z0-9-]{3,10}$/.test(clean);
}

/**
 * Calculates score for an answer based on correctness, speed bonus, and streak.
 * Base: 10 points. Speed bonus: up to +5 points. Streak bonus: +2 per consecutive correct.
 */
export function calculateAnswerScore(params: {
  isCorrect: boolean;
  timeSpentSeconds: number;
  timeLimitSeconds: number;
  streak: number;
  basePoints?: number;
}): number {
  if (!params.isCorrect) return 0;
  const base = params.basePoints || 10;
  const limit = Math.max(5, params.timeLimitSeconds);
  const spent = Math.max(0.5, Math.min(params.timeSpentSeconds, limit));

  // Speed bonus: answering in the first half of the timer earns 1 to 5 bonus points
  const timeRatio = Math.max(0, 1 - spent / limit);
  const speedBonus = Math.round(timeRatio * 5);

  // Streak bonus: 2 bonus points per streak item after 2 in a row, capped at +6
  const streakBonus = params.streak >= 2 ? Math.min(6, (params.streak - 1) * 2) : 0;

  return base + speedBonus + streakBonus;
}

export function shuffleQuestionOptions(
  question: ArenaQuestion,
  targetIndex?: number
): ArenaQuestion {
  const opts = [...question.options];
  if (opts.length < 2) return question;
  const currentCorrect = Math.max(0, Math.min(opts.length - 1, question.correctIndex));
  const correctValue = opts[currentCorrect];

  // If deterministic targetIndex is provided, swap currentCorrect and targetIndex
  if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex < opts.length) {
    const temp = opts[targetIndex];
    opts[targetIndex] = correctValue;
    opts[currentCorrect] = temp;
    return {
      ...question,
      options: opts,
      correctIndex: targetIndex,
    };
  }

  // Fisher-Yates shuffle
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  const newCorrectIndex = opts.indexOf(correctValue);
  return {
    ...question,
    options: opts,
    correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0,
  };
}

/**
 * Computes rankings and classifies students into performance tiers
 * (Strong / Outstanding vs. Needs Review / Practice).
 */
export function computeRankings(
  participants: Record<string, ArenaParticipant>,
  totalQuestionsCount = 0
): RankedStudent[] {
  const studentList = Object.values(participants).filter(
    (p) => p.role === 'student' || p.totalAnswered > 0
  );

  // Sort descending by score, then accuracy, then speed/name
  studentList.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aAcc = a.totalAnswered > 0 ? a.correctCount / a.totalAnswered : 0;
    const bAcc = b.totalAnswered > 0 ? b.correctCount / b.totalAnswered : 0;
    if (bAcc !== aAcc) return bAcc - aAcc;
    return a.name.localeCompare(b.name);
  });

  return studentList.map((st, idx) => {
    const questionsTotal = totalQuestionsCount || Math.max(1, st.totalAnswered);
    const accuracyPct =
      questionsTotal > 0 ? Math.round((st.correctCount / questionsTotal) * 100) : 0;

    let tier: 'gold' | 'silver' | 'bronze' | 'needs_review' = 'needs_review';
    if (accuracyPct >= 85) {
      tier = 'gold';
    } else if (accuracyPct >= 70) {
      tier = 'silver';
    } else if (accuracyPct >= 50) {
      tier = 'bronze';
    } else {
      tier = 'needs_review';
    }

    // Special promotion: rank 1 student with at least 60% gets gold
    if (idx === 0 && accuracyPct >= 60) {
      tier = 'gold';
    }

    const tierLabels = {
      gold: {
        ru: 'Отличный результат (Лидер)',
        ar: 'متميز جداً (قوي)',
        en: 'Outstanding (Top Driver)',
        fr: 'Remarquable (Meneur)',
      },
      silver: {
        ru: 'Хороший уровень (Уверенно)',
        ar: 'مستوى جيد (قوي)',
        en: 'Solid Performance',
        fr: 'Bon niveau',
      },
      bronze: {
        ru: 'Средний уровень (Нужна практика)',
        ar: 'متوسط (يحتاج متابعة)',
        en: 'Developing Skills',
        fr: 'En progression',
      },
      needs_review: {
        ru: 'Требуется повторение материала',
        ar: 'يحتاج دعم ومراجعة القواعد',
        en: 'Needs Review & Support',
        fr: 'Nécessite une révision',
      },
    };

    return {
      rank: idx + 1,
      id: st.id,
      name: st.name,
      avatar: st.avatar,
      score: st.score,
      accuracyPct,
      correctCount: st.correctCount,
      totalAnswered: st.totalAnswered,
      bestStreak: st.bestStreak,
      tier,
      tierLabel: tierLabels[tier],
    };
  });
}

/**
 * Computes teacher classroom analytics to reveal which questions the class struggled on
 * and which students need help vs who excelled.
 */
export function computeClassroomAnalytics(
  room: ArenaRoom
): ClassroomAnalytics {
  const rankings = computeRankings(room.participants, room.questions.length);
  const totalStudents = rankings.length;

  if (totalStudents === 0) {
    return {
      totalStudents: 0,
      averageScore: 0,
      classAccuracyPct: 0,
      hardestQuestions: [],
      strongestStudents: [],
      needsSupportStudents: [],
    };
  }

  const sumScores = rankings.reduce((acc, s) => acc + s.score, 0);
  const sumAccuracy = rankings.reduce((acc, s) => acc + s.accuracyPct, 0);

  // Analyze question failure rates
  const questionMistakes: Record<string, { prompt: string; mistakes: number; totalAttempts: number }> = {};
  for (const q of room.questions) {
    questionMistakes[q.id] = { prompt: q.promptRu, mistakes: 0, totalAttempts: 0 };
  }

  for (const p of Object.values(room.participants)) {
    if (p.role !== 'student' && p.totalAnswered === 0) continue;
    for (const [qId, ans] of Object.entries(p.answers)) {
      if (questionMistakes[qId]) {
        questionMistakes[qId].totalAttempts += 1;
        if (!ans.isCorrect) {
          questionMistakes[qId].mistakes += 1;
        }
      }
    }
  }

  const hardestQuestions = Object.entries(questionMistakes)
    .map(([qId, data]) => {
      const attempts = Math.max(1, data.totalAttempts);
      const successRate = Math.round(((attempts - data.mistakes) / attempts) * 100);
      return {
        questionId: qId,
        questionPrompt: data.prompt,
        mistakeCount: data.mistakes,
        successRatePct: successRate,
      };
    })
    .sort((a, b) => b.mistakeCount - a.mistakeCount || a.successRatePct - b.successRatePct)
    .slice(0, 3);

  const strongestStudents = rankings.filter((s) => s.tier === 'gold' || s.tier === 'silver');
  const needsSupportStudents = rankings.filter((s) => s.tier === 'needs_review' || s.tier === 'bronze');

  return {
    totalStudents,
    averageScore: Math.round(sumScores / totalStudents),
    classAccuracyPct: Math.round(sumAccuracy / totalStudents),
    hardestQuestions,
    strongestStudents,
    needsSupportStudents,
  };
}

/**
 * Robust parser that extracts interactive ArenaQuestion items from Gemini output
 * whether it returns raw JSON, markdown ```json code blocks, or delimited lines.
 */
export function parseExerciseFromAIText(aiText: string): ArenaQuestion[] {
  if (!aiText || typeof aiText !== 'string') return [];

  // 1. Try JSON array parsing from ```json or text
  const cleanJson = aiText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    const parsed = JSON.parse(cleanJson);
    const list = Array.isArray(parsed) ? parsed : parsed.questions || parsed.exercises;
    if (Array.isArray(list) && list.length > 0) {
      return list.map((item: any, idx: number) => ({
        id: item.id || `q-${idx + 1}`,
        promptRu: item.promptRu || item.question || item.text || `Вопрос ${idx + 1}`,
        promptTranslit: item.promptTranslit,
        hintAr: item.hintAr || item.hint,
        hintEn: item.hintEn,
        instructionRu: item.instructionRu || 'Выберите правильный ответ',
        instructionAr: item.instructionAr || 'اختر الإجابة الصحيحة',
        instructionEn: item.instructionEn || 'Choose the correct answer',
        options: Array.isArray(item.options) && item.options.length >= 2
          ? item.options.slice(0, 4).map(String)
          : ['Ответ A', 'Ответ B', 'Ответ C', 'Ответ D'],
        correctIndex: typeof item.correctIndex === 'number' && item.correctIndex >= 0 && item.correctIndex < 4
          ? item.correctIndex
          : 0,
        explanationRu: item.explanationRu || 'Правильное грамматическое употребление.',
        explanationAr: item.explanationAr || 'الاستخدام النحوي الصحيح وفقاً لقواعد اللغة الروسية.',
        explanationEn: item.explanationEn || 'Correct grammatical usage in Russian.',
        points: typeof item.points === 'number' ? item.points : 10,
      }));
    }
  } catch {
    // Continue to regex fallback
  }

  // 2. Fallback: regex search for JSON objects
  const objMatches = aiText.match(/\{[\s\S]*?\}/g);
  if (objMatches && objMatches.length > 0) {
    const recovered: ArenaQuestion[] = [];
    for (let i = 0; i < objMatches.length; i++) {
      try {
        const item = JSON.parse(objMatches[i]);
        if (item.promptRu && Array.isArray(item.options)) {
          recovered.push({
            id: `q-${i + 1}`,
            promptRu: String(item.promptRu),
            instructionRu: item.instructionRu || 'Выберите правильный ответ',
            instructionAr: item.instructionAr || 'اختر الإجابة الصحيحة',
            instructionEn: item.instructionEn || 'Choose the correct answer',
            options: item.options.slice(0, 4).map(String),
            correctIndex: Number(item.correctIndex) || 0,
            explanationRu: item.explanationRu || '',
            explanationAr: item.explanationAr || '',
            explanationEn: item.explanationEn || '',
            points: 10,
          });
        }
      } catch {
        // skip malformed block
      }
    }
    if (recovered.length > 0) return recovered;
  }

  return [];
}

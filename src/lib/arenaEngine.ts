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

export type ArenaSupportedLang = 'ar' | 'fr' | 'en' | 'ru';

export interface ArenaLocaleStrings {
  heroAlt: string;
  heroTitle: string;
  heroSubtitle: string;
  roadSignCity: string;
  teacherBadge: string;
  teacherTitle: string;
  teacherDesc: string;
  createRoomBtn: string;
  practiceRoomBtn: string;
  defaultCreatedRoomTitle: string;
  defaultRoomTitle: string;
  defaultTopic: string;
  defaultInstructions: string;
  defaultManualInstruction: string;
  studentsImgAlt: string;
  studentBadge: string;
  studentTitle: string;
  studentDesc: string;
  joinRoomBtn: string;
  availableRoomsTitle: string;
  refreshBtn: string;
  loadingRooms: string;
  emptyRoomsTitle: string;
  emptyRoomsDesc: string;
  codeLabel: string;
  statusLive: string;
  statusWaiting: string;
  statusFinished: string;
  studentsCountUnit: string;
  questionsCountUnit: string;
  deleteRoomTooltip: string;
  enterBtn: string;
  errEnterCodeFirst: string;
  errJoinFailed: string;
  errServerConn: string;
  errCreateRoom: string;
  errExtractPage: string;
  errAiProcess: string;
  deleteNoticeTemplate: (roomTitle: string) => string;
  backToList: string;
  roomCodeHeader: string;
  studioBadge: string;
  studioTitle: string;
  studioDesc: string;
  roomTitleLabel: string;
  roomTitlePlaceholder: string;
  topicLabel: string;
  topicPlaceholder: string;
  uploadSectionLabel: string;
  uploadBtnLabel: string;
  uploadedSheetDefaultName: string;
  pasteTextPlaceholder: string;
  aiInstructionsLabel: string;
  aiInstructionsPlaceholder: string;
  chips: string[];
  chipPrefixPrompt: (chip: string) => string;
  timeLimitLabel: string;
  time15: string;
  time30: string;
  time45: string;
  extractNote: string;
  extractingBtn: string;
  extractSaveBtn: string;
  backToArena: string;
  deleteRoomBtn: string;
  liveQuizRoomBadge: string;
  topicPrefix: string;
  teacherPrefix: string;
  copyRoomCodeTitle: string;
  connectedStudentsUnit: string;
  extractedQuestionsUnit: string;
  secPerQuestionUnit: string;
  startQuizForAllBtn: string;
  prepareQuestionsBtn: string;
  readyQuestionsTitle: string;
  hideCorrectAnswersBtn: string;
  reviewAnswersTeacherBtn: string;
  addManualQuestionBtn: string;
  reExtractAiBtn: string;
  addManualFormTitle: string;
  manualPromptPlaceholder: string;
  manualInstructionPlaceholder: string;
  markAsCorrectTitle: string;
  optionPlaceholder: (idx: number, isCorrect: boolean) => string;
  manualExplanationPlaceholder: string;
  saveQuestionBtn: string;
  answersHiddenNotice: string;
  questionLabel: (idx: number) => string;
  deleteQuestionTitle: string;
  connectedStudentsRosterTitle: string;
  waitingToStartText: string;
  onlineStatus: string;
  questionProgress: (current: number, total: number) => string;
  streakBadge: (streak: number) => string;
  secondsLeft: (sec: number) => string;
  showFinalResultsBtn: string;
  nextQuestionBtn: string;
  finishBtn: string;
  listenRussianPronunciation: string;
  hintPrefix: string;
  feedbackCorrect: string;
  feedbackTimeout: string;
  feedbackWrong: string;
  pointsEarnedLabel: (pts: number) => string;
  finishAndShowPodiumBtn: string;
  goToNextQuestionBtn: string;
  liveLeaderboardTitle: string;
  instantUpdatePerQuestion: string;
  youBadge: string;
  accuracyUnit: string;
  pointsUnit: string;
  competitionCompletedBadge: string;
  podiumTitle: string;
  podiumSubtitle: string;
  fullRankingsTitle: string;
  participantsUnit: string;
  correctOfTotal: (correct: number, total: number) => string;
  bestStreakLabel: string;
  teacherAnalyticsTitle: string;
  avgClassScoreLabel: string;
  avgClassAccuracyLabel: string;
  needsReviewCountLabel: string;
  hardestQuestionsLabel: string;
  mistakesAndSuccessRate: (mistakes: number, successPct: number) => string;
  restartChallengeBtn: string;
  deleteRoomPermanentlyBtn: string;
}

export const ARENA_I18N: Record<ArenaSupportedLang, ArenaLocaleStrings> = {
  ar: {
    heroAlt: 'طريق موسكو — غرف التحدي',
    heroTitle: 'غرف التحدي',
    heroSubtitle: 'تعلّم الروسية مع طلاب مادي',
    roadSignCity: 'Moscou',
    teacherBadge: 'للأستاذ',
    teacherTitle: 'أنشئ غرفة تحدي',
    teacherDesc: 'جهّز أسئلتك وحدّد وقت الإجابة.',
    createRoomBtn: 'إنشاء غرفة',
    practiceRoomBtn: 'غرفة تدريب MADI-101',
    defaultCreatedRoomTitle: 'تحدي أفعال الحركة والمصطلحات — مادي',
    defaultRoomTitle: 'تحدي ورقة الأستاذ — غرفة جديدة',
    defaultTopic: 'تحليل ورقة الأستاذ بالذكاء الاصطناعي',
    defaultInstructions: 'استخرج جميع التمارين الموجودة في هذه الورقة بدقة',
    defaultManualInstruction: 'اختر الإجابة الصحيحة',
    studentsImgAlt: 'طلاب مادي',
    studentBadge: 'للطلاب',
    studentTitle: 'انضم إلى غرفة',
    studentDesc: 'أدخل كود الغرفة الذي يزودك به الأستاذ.',
    joinRoomBtn: 'دخول الغرفة',
    availableRoomsTitle: 'الغرف المتاحة حالياً',
    refreshBtn: 'تحديث',
    loadingRooms: 'جاري تحميل الغرف المتاحة...',
    emptyRoomsTitle: 'لا توجد غرف متاحة حالياً',
    emptyRoomsDesc: 'ابدأ بإنشاء غرفة جديدة لطلابك الآن!',
    codeLabel: 'كود',
    statusLive: '● مباشر الآن',
    statusWaiting: 'جاهزة / انتظار',
    statusFinished: 'مكتملة',
    studentsCountUnit: 'طلاب',
    questionsCountUnit: 'أسئلة',
    deleteRoomTooltip: 'حذف الغرفة لمنع التراكم',
    enterBtn: 'دخول',
    errEnterCodeFirst: 'الرجاء إدخال كود الغرفة أولاً.',
    errJoinFailed: 'تعذر الانضمام للغرفة. تأكد من صحة الكود.',
    errServerConn: 'خطأ في الاتصال بالخادم.',
    errCreateRoom: 'تعذر إنشاء الغرفة. حاول مرة أخرى.',
    errExtractPage: 'فشل استخراج التمارين من الصفحة.',
    errAiProcess: 'خطأ في معالجة الصفحة بالذكاء الاصطناعي.',
    deleteNoticeTemplate: (roomTitle) =>
      `تم حذف الغرفة "${roomTitle}" بنجاح لمنع تراكم الغرف.`,
    backToList: 'العودة للقائمة',
    roomCodeHeader: 'كود الغرفة:',
    studioBadge: 'استخراج التمارين الذكي من صفحات الدروس (AI Page-to-Quiz)',
    studioTitle: 'إعداد غرفة الاختبار واستخراج الأسئلة',
    studioDesc:
      'اختر صفحة من كتب معهد مادي الرسمية، أو ارفع صورة ورقة التمرين، وحدد نوع الأسئلة التي تريد اختبار طلابك فيها ليقوم الذكاء الاصطناعي ببنائها فوراً!',
    roomTitleLabel: 'عنوان الغرفة / اسم الاختبار',
    roomTitlePlaceholder: 'مثال: اختبار أفعال الحركة — الفوج الهندسي',
    topicLabel: 'الموضوع والقاعدة النحوية',
    topicPlaceholder: 'مثال: Глаголы движения, Падежи, Транспортная лексика',
    uploadSectionLabel: 'أو قم برفع صفحة خارجية (صورة / سكان) أو لصق نص التمرين:',
    uploadBtnLabel: 'رفع صورة الصفحة (PNG / JPG)',
    uploadedSheetDefaultName: 'ورقة الأستاذ المرفوعة',
    pasteTextPlaceholder: 'الصق نص الصفحة أو جمل التمرين هنا يدوياً...',
    aiInstructionsLabel: 'توجيهات الأستاذ للذكاء الاصطناعي (ما نوع الأسئلة التي تريد استخراجها؟)',
    aiInstructionsPlaceholder:
      'مثال: استخرج أسئلة أفعال حركة، أو ركز على حالات الإعراب مع 4 خيارات وشرح نحوي',
    chips: [
      'أفعال الحركة مع البادئات (Приставки)',
      'حالات الإعراب (المجرور والمضاف والنصب)',
      'مصطلحات الهندسة والسيارات في موسكو',
      'إشارات المرور والسلامة الطرقية',
    ],
    chipPrefixPrompt: (chip) => `استخرج تمارين اختيار من متعدد حول ${chip}`,
    timeLimitLabel: 'الوقت المتاح لكل سؤال في التحدي',
    time15: '15 ثانية (سريع جداً)',
    time30: '30 ثانية (موصى به)',
    time45: '45 ثانية (مريح)',
    extractNote:
      'ملاحظة: سيتم استخراج جميع التمارين والأسئلة الموجودة في ورقة الأستاذ المرفوعة بالكامل تلقائياً.',
    extractingBtn: 'جاري معالجة الصفحة بالذكاء الاصطناعي واستخراج الأسئلة...',
    extractSaveBtn: 'استخراج التمارين بالذكاء الاصطناعي وحفظها في الغرفة',
    backToArena: 'العودة لحلبة الغرف',
    deleteRoomBtn: 'حذف الغرفة',
    liveQuizRoomBadge: 'غرفة الاختبار الحية',
    topicPrefix: 'الموضوع',
    teacherPrefix: 'الأستاذ',
    copyRoomCodeTitle: 'نسخ كود الغرفة',
    connectedStudentsUnit: 'طلاب متصلون',
    extractedQuestionsUnit: 'أسئلة مستخرجة',
    secPerQuestionUnit: 'ث/سؤال',
    startQuizForAllBtn: 'بدء التحدي لجميع الطلاب الآن!',
    prepareQuestionsBtn: 'استخراج وتجهيز أسئلة الغرفة',
    readyQuestionsTitle: 'أسئلة الغرفة الجاهزة',
    hideCorrectAnswersBtn: 'إخفاء الإجابات الصحيحة',
    reviewAnswersTeacherBtn: 'مراجعة الإجابات (للأستاذ)',
    addManualQuestionBtn: '+ سؤال يدوي',
    reExtractAiBtn: 'إعادة استخراج بالذكاء الاصطناعي',
    addManualFormTitle: 'إضافة سؤال جديد يدوياً إلى الغرفة:',
    manualPromptPlaceholder: 'نص السؤال بالروسية (مثال: Мы едем в ...)',
    manualInstructionPlaceholder: 'التعليمة (مثال: اختر الصيغة الصحيحة)',
    markAsCorrectTitle: 'حدد كإجابة صحيحة',
    optionPlaceholder: (idx, isCorrect) => `الخيار ${idx}${isCorrect ? ' (الصحيح)' : ''}`,
    manualExplanationPlaceholder: 'شرح القاعدة النحوية (اختياري)...',
    saveQuestionBtn: 'حفظ السؤال',
    answersHiddenNotice:
      '🔒 تم إخفاء الإجابات الصحيحة تلقائياً في شاشة الانتظار حتى لا تظهر للطلاب قبل بدء المسابقة.',
    questionLabel: (idx) => `السؤال ${idx}`,
    deleteQuestionTitle: 'حذف هذا السؤال',
    connectedStudentsRosterTitle: 'الطلاب المنضمون للقاعة حالياً',
    waitingToStartText: 'في انتظار بدء الاختبار...',
    onlineStatus: 'متصل',
    questionProgress: (current, total) => `السؤال ${current} من ${total}`,
    streakBadge: (streak) => `${streak}x متتالي!`,
    secondsLeft: (sec) => `${sec} ثانية`,
    showFinalResultsBtn: 'عرض النتيجة النهائية',
    nextQuestionBtn: 'السؤال التالي',
    finishBtn: 'إنهاء',
    listenRussianPronunciation: 'استمع للنطق الروسي',
    hintPrefix: 'تلميح',
    feedbackCorrect: '✅ إجابة صحيحة وممتازة!',
    feedbackTimeout: '⏰ انتهى الوقت المتاح للسؤال!',
    feedbackWrong: '❌ إجابة غير دقيقة!',
    pointsEarnedLabel: (pts) => `+${pts} نقطة`,
    finishAndShowPodiumBtn: 'إنهاء التحدي وعرض لوحة الشرف 🏆',
    goToNextQuestionBtn: 'الانتقال إلى السؤال التالي',
    liveLeaderboardTitle: 'ترتيب المشاركين المباشر في الغرفة',
    instantUpdatePerQuestion: 'تحديث فوري لكل سؤال',
    youBadge: 'أنت',
    accuracyUnit: 'دقة',
    pointsUnit: 'نقطة',
    competitionCompletedBadge: 'اكتملت المنافسة بنجاح!',
    podiumTitle: 'لوحة شرف وترتيب الطلاب النهائي',
    podiumSubtitle: 'تم تصنيف درجات جميع أعضاء الغرفة وفقاً للنقاط والدقة النحوية',
    fullRankingsTitle: 'قائمة تصنيف المشاركين كاملاً (المتميزون ومن يحتاجون مراجعة)',
    participantsUnit: 'مشاركين',
    correctOfTotal: (correct, total) => `${correct} من ${total} إجابات صحيحة`,
    bestStreakLabel: 'أعلى تسلسل',
    teacherAnalyticsTitle: 'تقرير تحليل الفصل للأستاذ (Class Performance Insights)',
    avgClassScoreLabel: 'متوسط نقاط الفصل',
    avgClassAccuracyLabel: 'متوسط الدقة العامة',
    needsReviewCountLabel: 'بحاجة لمراجعة',
    hardestQuestionsLabel: 'الأسئلة الأكثر صعوبة (التي واجه فيها الطلاب أخطاءً):',
    mistakesAndSuccessRate: (mistakes, successPct) =>
      `${mistakes} أخطاء (${successPct}% نجاح)`,
    restartChallengeBtn: 'إعادة تشغيل التحدي',
    deleteRoomPermanentlyBtn: 'حذف هذه الغرفة نهائياً',
  },
  fr: {
    heroAlt: 'Route vers Moscou — Salles de Défi',
    heroTitle: 'Salles de Défi',
    heroSubtitle: 'Apprenez le russe avec les étudiants de MADI',
    roadSignCity: 'Moscou',
    teacherBadge: 'Pour l’enseignant',
    teacherTitle: 'Créer une salle de défi',
    teacherDesc: 'Préparez vos questions et fixez le temps de réponse.',
    createRoomBtn: 'Créer une salle',
    practiceRoomBtn: 'Salle d’entraînement MADI-101',
    defaultCreatedRoomTitle: 'Défi verbes de mouvement & terminologie — MADI',
    defaultRoomTitle: 'Défi de la classe — Nouvelle salle',
    defaultTopic: 'Analyse de fiche d’exercices par IA',
    defaultInstructions: 'Extraire tous les exercices de cette feuille avec précision',
    defaultManualInstruction: 'Choisissez la bonne réponse',
    studentsImgAlt: 'Étudiants de MADI',
    studentBadge: 'Pour les étudiants',
    studentTitle: 'Rejoindre une salle',
    studentDesc: 'Entrez le code de la salle fourni par votre enseignant.',
    joinRoomBtn: 'Entrer dans la salle',
    availableRoomsTitle: 'Salles disponibles actuellement',
    refreshBtn: 'Actualiser',
    loadingRooms: 'Chargement des salles disponibles...',
    emptyRoomsTitle: 'Aucune salle disponible pour le moment',
    emptyRoomsDesc: 'Commencez par créer une nouvelle salle pour vos étudiants !',
    codeLabel: 'Code',
    statusLive: '● En direct',
    statusWaiting: 'Prête / En attente',
    statusFinished: 'Terminée',
    studentsCountUnit: 'étudiants',
    questionsCountUnit: 'questions',
    deleteRoomTooltip: 'Supprimer la salle',
    enterBtn: 'Entrer',
    errEnterCodeFirst: 'Veuillez d’abord entrer le code de la salle.',
    errJoinFailed: 'Impossible de rejoindre la salle. Vérifiez le code.',
    errServerConn: 'Erreur de connexion au serveur.',
    errCreateRoom: 'Impossible de créer la salle. Veuillez réessayer.',
    errExtractPage: 'Échec de l’extraction des exercices de la page.',
    errAiProcess: 'Erreur lors du traitement de la page par l’IA.',
    deleteNoticeTemplate: (roomTitle) =>
      `La salle « ${roomTitle} » a été supprimée avec succès.`,
    backToList: 'Retour à la liste',
    roomCodeHeader: 'Code de la salle :',
    studioBadge: 'Extraction intelligente d’exercices (AI Page-to-Quiz)',
    studioTitle: 'Configuration de la salle et extraction des questions',
    studioDesc:
      'Importez une image de feuille d’exercices ou collez le texte du cours, et précisez le type de questions pour que l’IA les génère instantanément !',
    roomTitleLabel: 'Titre de la salle / Nom du quiz',
    roomTitlePlaceholder: 'Ex. : Quiz sur les verbes de mouvement — Groupe Ingénierie',
    topicLabel: 'Sujet et règle de grammaire',
    topicPlaceholder: 'Ex. : Глаголы движения, Падежи, Транспортная лексика',
    uploadSectionLabel: 'Ou importez une page externe (image / scan) ou collez le texte :',
    uploadBtnLabel: 'Importer une image de la page (PNG / JPG)',
    uploadedSheetDefaultName: 'Feuille d’exercices importée',
    pasteTextPlaceholder: 'Collez le texte de la page ou les phrases de l’exercice ici...',
    aiInstructionsLabel: 'Instructions de l’enseignant pour l’IA (quel type de questions extraire ?)',
    aiInstructionsPlaceholder:
      'Ex. : Extraire des QCM sur les verbes de mouvement et les cas avec 4 choix',
    chips: [
      'Verbes de mouvement à préfixes (Приставки)',
      'Cas russes (Prépositionnel, Génitif, Accusatif)',
      'Terminologie automobile et ingénierie à Moscou',
      'Panneaux routiers et sécurité routière',
    ],
    chipPrefixPrompt: (chip) => `Extraire des exercices à choix multiples sur : ${chip}`,
    timeLimitLabel: 'Temps imparti par question',
    time15: '15 secondes (Très rapide)',
    time30: '30 secondes (Recommandé)',
    time45: '45 secondes (Confortable)',
    extractNote:
      'Note : Tous les exercices et questions de la feuille importée seront extraits automatiquement.',
    extractingBtn: 'Traitement de la page par l’IA et extraction des questions...',
    extractSaveBtn: 'Extraire les exercices avec l’IA et enregistrer dans la salle',
    backToArena: 'Retour aux salles de défi',
    deleteRoomBtn: 'Supprimer la salle',
    liveQuizRoomBadge: 'Salle de défi en direct',
    topicPrefix: 'Sujet',
    teacherPrefix: 'Enseignant',
    copyRoomCodeTitle: 'Copier le code de la salle',
    connectedStudentsUnit: 'étudiants connectés',
    extractedQuestionsUnit: 'questions extraites',
    secPerQuestionUnit: 's/question',
    startQuizForAllBtn: 'Démarrer le défi pour tous les étudiants !',
    prepareQuestionsBtn: 'Extraire et préparer les questions',
    readyQuestionsTitle: 'Questions prêtes dans la salle',
    hideCorrectAnswersBtn: 'Masquer les bonnes réponses',
    reviewAnswersTeacherBtn: 'Vérifier les réponses (Enseignant)',
    addManualQuestionBtn: '+ Question manuelle',
    reExtractAiBtn: 'Ré-extraire avec l’IA',
    addManualFormTitle: 'Ajouter une nouvelle question manuellement :',
    manualPromptPlaceholder: 'Texte de la question en russe (ex. : Мы едем в ...)',
    manualInstructionPlaceholder: 'Consigne (ex. : Choisissez la forme correcte)',
    markAsCorrectTitle: 'Marquer comme bonne réponse',
    optionPlaceholder: (idx, isCorrect) => `Option ${idx}${isCorrect ? ' (Correcte)' : ''}`,
    manualExplanationPlaceholder: 'Explication grammaticale (optionnel)...',
    saveQuestionBtn: 'Enregistrer la question',
    answersHiddenNotice:
      '🔒 Les bonnes réponses sont masquées automatiquement dans le salon d’attente pour ne pas être révélées avant le départ.',
    questionLabel: (idx) => `Question ${idx}`,
    deleteQuestionTitle: 'Supprimer cette question',
    connectedStudentsRosterTitle: 'Étudiants actuellement connectés',
    waitingToStartText: 'En attente du lancement...',
    onlineStatus: 'En ligne',
    questionProgress: (current, total) => `Question ${current} sur ${total}`,
    streakBadge: (streak) => `${streak}x série !`,
    secondsLeft: (sec) => `${sec} s`,
    showFinalResultsBtn: 'Voir le résultat final',
    nextQuestionBtn: 'Question suivante',
    finishBtn: 'Terminer',
    listenRussianPronunciation: 'Écouter la prononciation russe',
    hintPrefix: 'Indice',
    feedbackCorrect: '✅ Excellente réponse, bravo !',
    feedbackTimeout: '⏰ Temps écoulé pour cette question !',
    feedbackWrong: '❌ Réponse incorrecte !',
    pointsEarnedLabel: (pts) => `+${pts} pts`,
    finishAndShowPodiumBtn: 'Terminer le défi et afficher le podium 🏆',
    goToNextQuestionBtn: 'Passer à la question suivante',
    liveLeaderboardTitle: 'Classement en direct de la salle',
    instantUpdatePerQuestion: 'Mise à jour instantanée à chaque question',
    youBadge: 'Vous',
    accuracyUnit: 'précision',
    pointsUnit: 'pts',
    competitionCompletedBadge: 'Défi terminé avec succès !',
    podiumTitle: 'Tableau d’honneur et classement final',
    podiumSubtitle:
      'Les scores de tous les participants sont classés selon les points et la précision grammaticale',
    fullRankingsTitle: 'Classement complet des participants',
    participantsUnit: 'participants',
    correctOfTotal: (correct, total) => `${correct} sur ${total} réponses correctes`,
    bestStreakLabel: 'Meilleure série',
    teacherAnalyticsTitle: 'Analyse de performance de la classe (Pour l’enseignant)',
    avgClassScoreLabel: 'Score moyen de la classe',
    avgClassAccuracyLabel: 'Précision moyenne',
    needsReviewCountLabel: 'À réviser',
    hardestQuestionsLabel: 'Questions les plus difficiles (ayant causé le plus d’erreurs) :',
    mistakesAndSuccessRate: (mistakes, successPct) =>
      `${mistakes} erreurs (${successPct}% de réussite)`,
    restartChallengeBtn: 'Relancer le défi',
    deleteRoomPermanentlyBtn: 'Supprimer définitivement cette salle',
  },
  en: {
    heroAlt: 'Road to Moscow — Challenge Rooms',
    heroTitle: 'Challenge Rooms',
    heroSubtitle: 'Learn Russian with MADI students',
    roadSignCity: 'Moscow',
    teacherBadge: 'For Teachers',
    teacherTitle: 'Create a Challenge Room',
    teacherDesc: 'Prepare your questions and set the answer timer.',
    createRoomBtn: 'Create Room',
    practiceRoomBtn: 'Practice Room MADI-101',
    defaultCreatedRoomTitle: 'Verbs of Motion & Terminology Challenge — MADI',
    defaultRoomTitle: 'Teacher Worksheet Challenge — New Room',
    defaultTopic: 'AI Worksheet Exercise Analysis',
    defaultInstructions: 'Accurately extract all exercises from this worksheet',
    defaultManualInstruction: 'Choose the correct answer',
    studentsImgAlt: 'MADI Students',
    studentBadge: 'For Students',
    studentTitle: 'Join a Room',
    studentDesc: 'Enter the room code provided by your teacher.',
    joinRoomBtn: 'Enter Room',
    availableRoomsTitle: 'Currently Available Rooms',
    refreshBtn: 'Refresh',
    loadingRooms: 'Loading available rooms...',
    emptyRoomsTitle: 'No rooms available right now',
    emptyRoomsDesc: 'Start by creating a new room for your students now!',
    codeLabel: 'Code',
    statusLive: '● Live Now',
    statusWaiting: 'Ready / Waiting',
    statusFinished: 'Completed',
    studentsCountUnit: 'students',
    questionsCountUnit: 'questions',
    deleteRoomTooltip: 'Delete room',
    enterBtn: 'Enter',
    errEnterCodeFirst: 'Please enter a room code first.',
    errJoinFailed: 'Could not join room. Please check the code.',
    errServerConn: 'Server connection error.',
    errCreateRoom: 'Could not create room. Please try again.',
    errExtractPage: 'Failed to extract exercises from the page.',
    errAiProcess: 'Error processing page with AI.',
    deleteNoticeTemplate: (roomTitle) =>
      `Room "${roomTitle}" was deleted successfully.`,
    backToList: 'Back to List',
    roomCodeHeader: 'Room Code:',
    studioBadge: 'Smart Exercise Extraction from Lesson Pages (AI Page-to-Quiz)',
    studioTitle: 'Quiz Room Setup & Question Extraction',
    studioDesc:
      'Upload an exercise worksheet image or paste lesson text, and specify the question style for AI to build the quiz instantly!',
    roomTitleLabel: 'Room Title / Quiz Name',
    roomTitlePlaceholder: 'e.g., Verbs of Motion Quiz — Engineering Cohort',
    topicLabel: 'Topic & Grammar Rule',
    topicPlaceholder: 'e.g., Глаголы движения, Падежи, Транспортная лексика',
    uploadSectionLabel: 'Or upload an external page (image / scan) or paste exercise text:',
    uploadBtnLabel: 'Upload Page Image (PNG / JPG)',
    uploadedSheetDefaultName: 'Uploaded Teacher Worksheet',
    pasteTextPlaceholder: 'Paste page text or exercise sentences here manually...',
    aiInstructionsLabel: 'Teacher Instructions for AI (what type of questions should be extracted?)',
    aiInstructionsPlaceholder:
      'e.g., Extract multiple-choice questions on verbs of motion and cases with 4 options',
    chips: [
      'Prefixed Verbs of Motion (Приставки)',
      'Russian Cases (Prepositional, Genitive, Accusative)',
      'Engineering & Automotive Terminology in Moscow',
      'Road Signs & Traffic Safety',
    ],
    chipPrefixPrompt: (chip) => `Extract multiple-choice exercises about ${chip}`,
    timeLimitLabel: 'Time Limit per Question',
    time15: '15 seconds (Fast)',
    time30: '30 seconds (Recommended)',
    time45: '45 seconds (Relaxed)',
    extractNote:
      'Note: All exercises and questions on the uploaded worksheet will be extracted automatically.',
    extractingBtn: 'Processing page with AI and extracting questions...',
    extractSaveBtn: 'Extract Exercises with AI & Save to Room',
    backToArena: 'Back to Challenge Arena',
    deleteRoomBtn: 'Delete Room',
    liveQuizRoomBadge: 'Live Quiz Room',
    topicPrefix: 'Topic',
    teacherPrefix: 'Teacher',
    copyRoomCodeTitle: 'Copy Room Code',
    connectedStudentsUnit: 'students connected',
    extractedQuestionsUnit: 'questions extracted',
    secPerQuestionUnit: 's/question',
    startQuizForAllBtn: 'Start Challenge for All Students Now!',
    prepareQuestionsBtn: 'Extract & Prepare Room Questions',
    readyQuestionsTitle: 'Ready Room Questions',
    hideCorrectAnswersBtn: 'Hide Correct Answers',
    reviewAnswersTeacherBtn: 'Review Answers (Teacher)',
    addManualQuestionBtn: '+ Manual Question',
    reExtractAiBtn: 'Re-extract with AI',
    addManualFormTitle: 'Add a new question manually to the room:',
    manualPromptPlaceholder: 'Question prompt in Russian (e.g., Мы едем в ...)',
    manualInstructionPlaceholder: 'Instruction (e.g., Choose the correct form)',
    markAsCorrectTitle: 'Mark as correct answer',
    optionPlaceholder: (idx, isCorrect) => `Option ${idx}${isCorrect ? ' (Correct)' : ''}`,
    manualExplanationPlaceholder: 'Grammar rule explanation (optional)...',
    saveQuestionBtn: 'Save Question',
    answersHiddenNotice:
      '🔒 Correct answers are automatically hidden in the waiting lobby so students do not see them before the quiz begins.',
    questionLabel: (idx) => `Question ${idx}`,
    deleteQuestionTitle: 'Delete this question',
    connectedStudentsRosterTitle: 'Currently Connected Students',
    waitingToStartText: 'Waiting for quiz to start...',
    onlineStatus: 'Online',
    questionProgress: (current, total) => `Question ${current} of ${total}`,
    streakBadge: (streak) => `${streak}x streak!`,
    secondsLeft: (sec) => `${sec}s`,
    showFinalResultsBtn: 'View Final Results',
    nextQuestionBtn: 'Next Question',
    finishBtn: 'Finish',
    listenRussianPronunciation: 'Listen to Russian pronunciation',
    hintPrefix: 'Hint',
    feedbackCorrect: '✅ Excellent! Correct answer!',
    feedbackTimeout: '⏰ Time ran out for this question!',
    feedbackWrong: '❌ Not quite right!',
    pointsEarnedLabel: (pts) => `+${pts} pts`,
    finishAndShowPodiumBtn: 'Finish Challenge & View Podium 🏆',
    goToNextQuestionBtn: 'Go to Next Question',
    liveLeaderboardTitle: 'Live Room Leaderboard',
    instantUpdatePerQuestion: 'Updates instantly after each question',
    youBadge: 'You',
    accuracyUnit: 'accuracy',
    pointsUnit: 'pts',
    competitionCompletedBadge: 'Challenge Completed Successfully!',
    podiumTitle: 'Honor Roll & Final Student Standings',
    podiumSubtitle:
      'All participants are ranked according to total points and grammatical accuracy',
    fullRankingsTitle: 'Complete Participant Standings (Top Performers & Needs Review)',
    participantsUnit: 'participants',
    correctOfTotal: (correct, total) => `${correct} of ${total} correct answers`,
    bestStreakLabel: 'Best streak',
    teacherAnalyticsTitle: 'Class Performance Insights (Teacher Report)',
    avgClassScoreLabel: 'Class Average Score',
    avgClassAccuracyLabel: 'Average Accuracy',
    needsReviewCountLabel: 'Needs Review',
    hardestQuestionsLabel: 'Most Challenging Questions (with highest student mistakes):',
    mistakesAndSuccessRate: (mistakes, successPct) =>
      `${mistakes} mistakes (${successPct}% success)`,
    restartChallengeBtn: 'Restart Challenge',
    deleteRoomPermanentlyBtn: 'Permanently Delete Room',
  },
  ru: {
    heroAlt: 'Дорога в Москву — Комнаты вызова',
    heroTitle: 'Комнаты вызова',
    heroSubtitle: 'Учите русский язык со студентами МАДИ',
    roadSignCity: 'Москва',
    teacherBadge: 'Для преподавателя',
    teacherTitle: 'Создать комнату вызова',
    teacherDesc: 'Подготовьте вопросы и установите время ответа.',
    createRoomBtn: 'Создать комнату',
    practiceRoomBtn: 'Тренировочная комната MADI-101',
    defaultCreatedRoomTitle: 'Вызов: глаголы движения и терминология — МАДИ',
    defaultRoomTitle: 'Вызов по листу преподавателя — Новая комната',
    defaultTopic: 'ИИ-анализ учебного листа',
    defaultInstructions: 'Точно извлеките все упражнения из этого листа',
    defaultManualInstruction: 'Выберите правильный ответ',
    studentsImgAlt: 'Студенты МАДИ',
    studentBadge: 'Для студентов',
    studentTitle: 'Войти в комнату',
    studentDesc: 'Введите код комнаты, полученный от преподавателя.',
    joinRoomBtn: 'Войти в комнату',
    availableRoomsTitle: 'Доступные сейчас комнаты',
    refreshBtn: 'Обновить',
    loadingRooms: 'Загрузка доступных комнат...',
    emptyRoomsTitle: 'Сейчас нет доступных комнат',
    emptyRoomsDesc: 'Начните с создания новой комнаты для ваших студентов!',
    codeLabel: 'Код',
    statusLive: '● В эфире',
    statusWaiting: 'Готова / Ожидание',
    statusFinished: 'Завершена',
    studentsCountUnit: 'студентов',
    questionsCountUnit: 'вопросов',
    deleteRoomTooltip: 'Удалить комнату',
    enterBtn: 'Войти',
    errEnterCodeFirst: 'Пожалуйста, сначала введите код комнаты.',
    errJoinFailed: 'Не удалось войти в комнату. Проверьте код.',
    errServerConn: 'Ошибка соединения с сервером.',
    errCreateRoom: 'Не удалось создать комнату. Попробуйте ещё раз.',
    errExtractPage: 'Не удалось извлечь упражнения со страницы.',
    errAiProcess: 'Ошибка при обработке страницы с помощью ИИ.',
    deleteNoticeTemplate: (roomTitle) =>
      `Комната «${roomTitle}» успешно удалена.`,
    backToList: 'Назад к списку',
    roomCodeHeader: 'Код комнаты:',
    studioBadge: 'Умное извлечение упражнений из страниц уроков (AI Page-to-Quiz)',
    studioTitle: 'Настройка комнаты и извлечение вопросов',
    studioDesc:
      'Загрузите фото листа с упражнениями или вставьте текст урока, укажите тип вопросов, и ИИ мгновенно создаст тест!',
    roomTitleLabel: 'Название комнаты / теста',
    roomTitlePlaceholder: 'Напр.: Тест по глаголам движения — Инженерная группа',
    topicLabel: 'Тема и грамматическое правило',
    topicPlaceholder: 'Напр.: Глаголы движения, Падежи, Транспортная лексика',
    uploadSectionLabel: 'Или загрузите страницу (фото / скан) либо вставьте текст упражнения:',
    uploadBtnLabel: 'Загрузить фото страницы (PNG / JPG)',
    uploadedSheetDefaultName: 'Загруженный лист преподавателя',
    pasteTextPlaceholder: 'Вставьте текст страницы или предложения упражнения сюда...',
    aiInstructionsLabel: 'Инструкции преподавателя для ИИ (какие вопросы нужно извлечь?)',
    aiInstructionsPlaceholder:
      'Напр.: Извлечь тестовые вопросы по глаголам движения и падежам с 4 вариантами',
    chips: [
      'Глаголы движения с приставками (Приставки)',
      'Падежи (Предложный, Родительный, Винительный)',
      'Инженерная и автомобильная лексика в Москве',
      'Дорожные знаки и безопасность движения',
    ],
    chipPrefixPrompt: (chip) => `Извлеките тестовые упражнения по теме: ${chip}`,
    timeLimitLabel: 'Время на каждый вопрос',
    time15: '15 секунд (Быстро)',
    time30: '30 секунд (Рекомендуется)',
    time45: '45 секунд (Комфортно)',
    extractNote:
      'Примечание: Все упражнения и вопросы с загруженного листа будут извлечены автоматически.',
    extractingBtn: 'Обработка страницы с помощью ИИ и извлечение вопросов...',
    extractSaveBtn: 'Извлечь упражнения с помощью ИИ и сохранить в комнате',
    backToArena: 'Назад к комнатам вызова',
    deleteRoomBtn: 'Удалить комнату',
    liveQuizRoomBadge: 'Живая комната тестирования',
    topicPrefix: 'Тема',
    teacherPrefix: 'Преподаватель',
    copyRoomCodeTitle: 'Скопировать код комнаты',
    connectedStudentsUnit: 'студентов подключено',
    extractedQuestionsUnit: 'вопросов извлечено',
    secPerQuestionUnit: 'с/вопрос',
    startQuizForAllBtn: 'Начать вызов для всех студентов!',
    prepareQuestionsBtn: 'Извлечь и подготовить вопросы комнаты',
    readyQuestionsTitle: 'Готовые вопросы комнаты',
    hideCorrectAnswersBtn: 'Скрыть правильные ответы',
    reviewAnswersTeacherBtn: 'Проверить ответы (Преподаватель)',
    addManualQuestionBtn: '+ Вопрос вручную',
    reExtractAiBtn: 'Повторно извлечь с ИИ',
    addManualFormTitle: 'Добавить новый вопрос вручную:',
    manualPromptPlaceholder: 'Текст вопроса на русском (напр.: Мы едем в ...)',
    manualInstructionPlaceholder: 'Инструкция (напр.: Выберите правильную форму)',
    markAsCorrectTitle: 'Отметить как правильный ответ',
    optionPlaceholder: (idx, isCorrect) => `Вариант ${idx}${isCorrect ? ' (Верный)' : ''}`,
    manualExplanationPlaceholder: 'Грамматическое пояснение (необязательно)...',
    saveQuestionBtn: 'Сохранить вопрос',
    answersHiddenNotice:
      '🔒 Правильные ответы автоматически скрыты на экране ожидания, чтобы студенты не увидели их до начала.',
    questionLabel: (idx) => `Вопрос ${idx}`,
    deleteQuestionTitle: 'Удалить этот вопрос',
    connectedStudentsRosterTitle: 'Подключенные сейчас студенты',
    waitingToStartText: 'Ожидание начала теста...',
    onlineStatus: 'В сети',
    questionProgress: (current, total) => `Вопрос ${current} из ${total}`,
    streakBadge: (streak) => `${streak}x подряд!`,
    secondsLeft: (sec) => `${sec} с`,
    showFinalResultsBtn: 'Показать итоговый результат',
    nextQuestionBtn: 'Следующий вопрос',
    finishBtn: 'Завершить',
    listenRussianPronunciation: 'Прослушать русское произношение',
    hintPrefix: 'Подсказка',
    feedbackCorrect: '✅ Отлично! Правильный ответ!',
    feedbackTimeout: '⏰ Время на вопрос истекло!',
    feedbackWrong: '❌ Неточный ответ!',
    pointsEarnedLabel: (pts) => `+${pts} баллов`,
    finishAndShowPodiumBtn: 'Завершить вызов и открыть пьедестал 🏆',
    goToNextQuestionBtn: 'Перейти к следующему вопросу',
    liveLeaderboardTitle: 'Текущий рейтинг участников комнаты',
    instantUpdatePerQuestion: 'Мгновенное обновление после каждого вопроса',
    youBadge: 'Вы',
    accuracyUnit: 'точность',
    pointsUnit: 'баллов',
    competitionCompletedBadge: 'Соревнование успешно завершено!',
    podiumTitle: 'Доска почёта и итоговый рейтинг студентов',
    podiumSubtitle:
      'Результаты всех участников распределены по баллам и грамматической точности',
    fullRankingsTitle: 'Полный рейтинг участников (Лидеры и кому нужно повторение)',
    participantsUnit: 'участников',
    correctOfTotal: (correct, total) => `${correct} из ${total} правильных ответов`,
    bestStreakLabel: 'Лучшая серия',
    teacherAnalyticsTitle: 'Аналитика успеваемости группы (Для преподавателя)',
    avgClassScoreLabel: 'Средний балл группы',
    avgClassAccuracyLabel: 'Средняя точность',
    needsReviewCountLabel: 'Нужно повторение',
    hardestQuestionsLabel: 'Самые сложные вопросы (с наибольшим числом ошибок):',
    mistakesAndSuccessRate: (mistakes, successPct) =>
      `${mistakes} ошибок (${successPct}% успеха)`,
    restartChallengeBtn: 'Перезапустить вызов',
    deleteRoomPermanentlyBtn: 'Удалить комнату навсегда',
  },
};

export function getArenaQuestionInstruction(
  q: ArenaQuestion,
  lang: ArenaSupportedLang
): string {
  if (lang === 'ar') return q.instructionAr || q.instructionEn || q.instructionRu;
  if (lang === 'ru') return q.instructionRu || q.instructionEn || q.instructionAr;
  if (lang === 'fr') {
    if (
      !q.instructionEn ||
      q.instructionEn.toLowerCase() === 'choose the correct answer'
    ) {
      return 'Choisissez la bonne réponse';
    }
    return q.instructionEn;
  }
  return q.instructionEn || q.instructionRu || q.instructionAr;
}

export function getArenaQuestionExplanation(
  q: { explanationAr?: string; explanationEn?: string; explanationRu?: string },
  lang: ArenaSupportedLang
): string {
  if (lang === 'ar') return q.explanationAr || q.explanationEn || q.explanationRu || '';
  if (lang === 'ru') return q.explanationRu || q.explanationEn || q.explanationAr || '';
  return q.explanationEn || q.explanationRu || q.explanationAr || '';
}

export function getArenaQuestionHint(
  q: ArenaQuestion,
  lang: ArenaSupportedLang
): string | undefined {
  if (lang === 'ar') return q.hintAr || q.hintEn;
  return q.hintEn || q.hintAr;
}


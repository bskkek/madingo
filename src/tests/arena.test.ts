import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateRoomCode,
  validateRoomCode,
  calculateAnswerScore,
  computeRankings,
  computeClassroomAnalytics,
  parseExerciseFromAIText,
  ArenaParticipant,
  ArenaRoom,
} from '../lib/arenaEngine';

test('Arena Engine: Room code generation and validation', () => {
  const code = generateRoomCode();
  assert.equal(code.length, 4);
  assert.equal(/^\d{4}$/.test(code), true);
  assert.equal(validateRoomCode(code), true);
  assert.equal(validateRoomCode('MADI-101'), true);
  assert.equal(validateRoomCode('2048'), true);
  assert.equal(validateRoomCode(''), false);
  assert.equal(validateRoomCode('AB'), false);
});

test('Arena Engine: Score calculation rewards speed and streaks', () => {
  // Slow answer with no streak
  const scoreSlow = calculateAnswerScore({
    isCorrect: true,
    timeSpentSeconds: 28,
    timeLimitSeconds: 30,
    streak: 0,
  });
  assert.equal(scoreSlow, 10);

  // Super fast answer with 4-streak
  const scoreFastStreak = calculateAnswerScore({
    isCorrect: true,
    timeSpentSeconds: 3,
    timeLimitSeconds: 30,
    streak: 4,
  });
  // 10 base + 5 speed + 6 streak = 21
  assert.equal(scoreFastStreak, 21);

  // Wrong answer earns 0 points
  const scoreWrong = calculateAnswerScore({
    isCorrect: false,
    timeSpentSeconds: 2,
    timeLimitSeconds: 30,
    streak: 5,
  });
  assert.equal(scoreWrong, 0);
});

test('Arena Engine: Ranking computes correct positions, accuracy, and tier classification', () => {
  const participants: Record<string, ArenaParticipant> = {
    teacher1: {
      id: 'teacher1',
      name: 'Prof. Ivan',
      avatar: 'teacher-icon',
      role: 'teacher',
      score: 0,
      correctCount: 0,
      totalAnswered: 0,
      currentStreak: 0,
      bestStreak: 0,
      answers: {},
      isOnline: true,
      joinedAt: '2026-10-26T10:00:00Z',
    },
    studA: {
      id: 'studA',
      name: 'Karim',
      avatar: 'blue-car',
      role: 'student',
      score: 85,
      correctCount: 5,
      totalAnswered: 5,
      currentStreak: 5,
      bestStreak: 5,
      answers: {
        q1: { optionIndex: 0, isCorrect: true, timeSeconds: 3, pointsEarned: 17, answeredAt: '' },
        q2: { optionIndex: 1, isCorrect: true, timeSeconds: 4, pointsEarned: 17, answeredAt: '' },
      },
      isOnline: true,
      joinedAt: '2026-10-26T10:01:00Z',
    },
    studB: {
      id: 'studB',
      name: 'Youssef',
      avatar: 'red-car',
      role: 'student',
      score: 30,
      correctCount: 2,
      totalAnswered: 5,
      currentStreak: 0,
      bestStreak: 2,
      answers: {
        q1: { optionIndex: 2, isCorrect: false, timeSeconds: 10, pointsEarned: 0, answeredAt: '' },
      },
      isOnline: true,
      joinedAt: '2026-10-26T10:01:00Z',
    },
  };

  const rankings = computeRankings(participants, 5);
  assert.equal(rankings.length, 2); // Excludes teacher
  assert.equal(rankings[0].id, 'studA');
  assert.equal(rankings[0].rank, 1);
  assert.equal(rankings[0].tier, 'gold');
  assert.equal(rankings[0].accuracyPct, 100);

  assert.equal(rankings[1].id, 'studB');
  assert.equal(rankings[1].rank, 2);
  assert.equal(rankings[1].accuracyPct, 40);
  assert.equal(rankings[1].tier, 'needs_review');
});

test('Arena Engine: Classroom analytics identifies hardest questions and students needing support', () => {
  const room: ArenaRoom = {
    id: 'room-1',
    code: 'MADI-101',
    title: 'Verbs of Motion Challenge',
    teacherId: 'teacher1',
    teacherName: 'Prof. Elena',
    status: 'finished',
    exerciseTopic: 'Verbs of Motion',
    teacherInstructions: 'Extract motion verbs with prefixes',
    pages: [],
    questions: [
      {
        id: 'q1',
        promptRu: 'Куда вы вчера ...?',
        instructionRu: 'Выберите глагол',
        instructionAr: 'اختر الفعل المناسب',
        instructionEn: 'Choose the verb',
        options: ['ходили', 'шли', 'ехали', 'пошли'],
        correctIndex: 0,
        explanationRu: 'Повторяющееся действие туда и обратно.',
        explanationAr: 'حركة ذهاباً وإياباً في الماضي.',
        explanationEn: 'Round trip in the past.',
        points: 10,
      },
      {
        id: 'q2',
        promptRu: 'Мы живём ... Москве.',
        instructionRu: 'Выберите предлог',
        instructionAr: 'اختر حرف الجر المناسب',
        instructionEn: 'Choose the preposition',
        options: ['в', 'на', 'к', 'по'],
        correctIndex: 0,
        explanationRu: 'Предложный падеж места с предлогом В.',
        explanationAr: 'حالة المجرور مع حرف الجر В.',
        explanationEn: 'Prepositional of place.',
        points: 10,
      },
    ],
    currentQuestionIndex: 1,
    questionTimeLimitSeconds: 30,
    participants: {
      stud1: {
        id: 'stud1',
        name: 'Student One',
        avatar: 'car-1',
        role: 'student',
        score: 20,
        correctCount: 2,
        totalAnswered: 2,
        currentStreak: 2,
        bestStreak: 2,
        answers: {
          q1: { optionIndex: 0, isCorrect: true, timeSeconds: 5, pointsEarned: 10, answeredAt: '' },
          q2: { optionIndex: 0, isCorrect: true, timeSeconds: 5, pointsEarned: 10, answeredAt: '' },
        },
        isOnline: true,
        joinedAt: '',
      },
      stud2: {
        id: 'stud2',
        name: 'Student Two',
        avatar: 'car-2',
        role: 'student',
        score: 0,
        correctCount: 0,
        totalAnswered: 2,
        currentStreak: 0,
        bestStreak: 0,
        answers: {
          q1: { optionIndex: 1, isCorrect: false, timeSeconds: 8, pointsEarned: 0, answeredAt: '' },
          q2: { optionIndex: 1, isCorrect: false, timeSeconds: 8, pointsEarned: 0, answeredAt: '' },
        },
        isOnline: true,
        joinedAt: '',
      },
    },
    createdAt: new Date().toISOString(),
  };

  const analytics = computeClassroomAnalytics(room);
  assert.equal(analytics.totalStudents, 2);
  assert.equal(analytics.averageScore, 10);
  assert.equal(analytics.hardestQuestions.length, 2);
  assert.equal(analytics.hardestQuestions[0].mistakeCount, 1);
  assert.equal(analytics.strongestStudents[0].name, 'Student One');
  assert.equal(analytics.needsSupportStudents[0].name, 'Student Two');
});

test('Arena Engine: AI Question parser extracts structured questions from JSON or markdown', () => {
  const jsonSample = `\`\`\`json
  [
    {
      "id": "q-1",
      "promptRu": "Я учусь в ... университете.",
      "options": ["московском", "московскому", "московский", "московского"],
      "correctIndex": 0,
      "explanationRu": "Предложный падеж мужского рода.",
      "explanationAr": "حالة المجرور للمذكر مع حرف الجر В"
    }
  ]
  \`\`\``;

  const parsed = parseExerciseFromAIText(jsonSample);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].id, 'q-1');
  assert.equal(parsed[0].options.length, 4);
  assert.equal(parsed[0].correctIndex, 0);
  assert.equal(parsed[0].promptRu, 'Я учусь в ... университете.');
});

test('Typing Curriculum: 50+ progressive sentences and paragraphs', async () => {
  const { PROGRESSIVE_TYPING_DRILLS } = await import('../data/typingDrills');
  assert.equal(PROGRESSIVE_TYPING_DRILLS.length >= 50, true);
  assert.equal(PROGRESSIVE_TYPING_DRILLS[0].textClean.includes('Привет'), true);
  assert.equal(PROGRESSIVE_TYPING_DRILLS[PROGRESSIVE_TYPING_DRILLS.length - 1].textClean.length > 50, true);
});

test('Arena Localization: ARENA_I18N provides complete, distinct translations for ar, fr, en, and ru', async () => {
  const {
    ARENA_I18N,
    getArenaQuestionInstruction,
    getArenaQuestionExplanation,
  } = await import('../lib/arenaEngine');

  assert.equal(ARENA_I18N.ar.heroTitle, 'غرف التحدي');
  assert.equal(ARENA_I18N.fr.heroTitle, 'Salles de Défi');
  assert.equal(ARENA_I18N.en.heroTitle, 'Challenge Rooms');
  assert.equal(ARENA_I18N.ru.heroTitle, 'Комнаты вызова');

  assert.equal(ARENA_I18N.ar.teacherTitle, 'أنشئ غرفة تحدي');
  assert.equal(ARENA_I18N.fr.teacherTitle, 'Créer une salle de défi');
  assert.equal(ARENA_I18N.en.teacherTitle, 'Create a Challenge Room');
  assert.equal(ARENA_I18N.ru.teacherTitle, 'Создать комнату вызова');

  assert.equal(ARENA_I18N.ar.studentTitle, 'انضم إلى غرفة');
  assert.equal(ARENA_I18N.fr.studentTitle, 'Rejoindre une salle');
  assert.equal(ARENA_I18N.en.studentTitle, 'Join a Room');
  assert.equal(ARENA_I18N.ru.studentTitle, 'Войти в комнату');

  const sampleQuestion = {
    id: 'q1',
    promptRu: 'Мы едем в ...',
    instructionRu: 'Выберите правильный ответ',
    instructionAr: 'اختر الإجابة الصحيحة',
    instructionEn: 'Choose the correct answer',
    options: ['Москву', 'Москве', 'Москва', 'Москвой'],
    correctIndex: 0,
    explanationRu: 'Винительный падеж направления.',
    explanationAr: 'حالة النصب للاتجاه.',
    explanationEn: 'Accusative case of direction.',
    points: 10,
  };

  assert.equal(getArenaQuestionInstruction(sampleQuestion, 'ar'), 'اختر الإجابة الصحيحة');
  assert.equal(getArenaQuestionInstruction(sampleQuestion, 'fr'), 'Choisissez la bonne réponse');
  assert.equal(getArenaQuestionInstruction(sampleQuestion, 'en'), 'Choose the correct answer');
  assert.equal(getArenaQuestionInstruction(sampleQuestion, 'ru'), 'Выберите правильный ответ');

  assert.equal(getArenaQuestionExplanation(sampleQuestion, 'ar'), 'حالة النصب للاتجاه.');
  assert.equal(getArenaQuestionExplanation(sampleQuestion, 'en'), 'Accusative case of direction.');
  assert.equal(getArenaQuestionExplanation(sampleQuestion, 'ru'), 'Винительный падеж направления.');
});



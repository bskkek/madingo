// ============================================================================
// MADINGO — LOCAL (OFFLINE) ARENA ROOMS
// Static hosting (GitHub Pages) has no /api and no WebSocket server, so every
// arena request returns the app's HTML fallback instead of JSON. These helpers
// keep the Challenge Arena fully usable offline: rooms live in localStorage,
// MADI-101 ships with its real built-in questions, and the quiz (timer,
// scoring, rankings, podium) runs on the client via arenaEngine.
// Server rooms always win when /api answers with real JSON — the component
// only falls back to these helpers after a non-JSON response.
// ============================================================================

import {
  ArenaParticipant,
  ArenaQuestion,
  ArenaRoom,
  generateRoomCode,
} from './arenaEngine';

const LOCAL_ARENA_ROOMS_KEY = 'madingo_local_arena_rooms_v1';

function localUid(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return `${prefix}-${rand}`;
}

/**
 * The MADI-101 practice room, identical to the server seed (server.ts
 * ensureMadi101TrainingRoom): real Russian grammar questions about verbs of
 * motion and cases, with Russian / Arabic / English instructions and
 * explanations. Solo practice — no fake opponents.
 */
export function buildLocalMadi101(): ArenaRoom {
  const questions: ArenaQuestion[] = [
    {
      id: 'm101-q1',
      promptRu: 'Ка́ждый день студе́нты ... в университе́т МАДИ́ на метро́.',
      instructionRu: 'Выберите правильный глагол движения',
      instructionAr: 'اختر فعل الحركة الصحيح',
      instructionEn: 'Choose the correct verb of motion',
      options: ['е́здят', 'е́дут', 'хо́дят', 'иду́т'],
      correctIndex: 0,
      explanationRu:
        '«Ка́ждый день» указывает на регулярное движение на транспорте (на метро) → глагол «е́здят».',
      explanationAr:
        'عبارة «Ка́ждый день» تدل على حركة متكررة بوسيلة نقل (المترو) فنستخدم الفعل المتعدد الاتجاهات «е́здят».',
      explanationEn:
        '"Каждый день" indicates habitual movement by vehicle (metro) → multidirectional verb "ездят".',
      points: 10,
    },
    {
      id: 'm101-q2',
      promptRu: 'Мы изу́чаем ру́сский язы́к на подготови́тельном ... МАДИ́.',
      instructionRu: 'Выберите правильную форму предложного падежа',
      instructionAr: 'اختر الصيغة الصحيحة في حالة المجرور (Предложный падеж)',
      instructionEn: 'Choose the correct Prepositional case form',
      options: ['факульте́те', 'факульте́т', 'факульте́та', 'факульте́ту'],
      correctIndex: 0,
      explanationRu: 'Вопрос «Где?» (на чём?) требует предложного падежа: на факульте́те.',
      explanationAr: 'السؤال عن المكان «Где؟» مع حرف الجر «на» يتطلب حالة المجرور: на факульте́те.',
      explanationEn:
        'Answering "Где?" (where) with "на" requires the Prepositional case: на факультете.',
      points: 10,
    },
    {
      id: 'm101-q3',
      promptRu: 'Авто́бус останови́лся пе́ред гла́вным ... университе́та.',
      instructionRu: 'Выберите правильную форму творительного падежа',
      instructionAr: 'اختر الصيغة الصحيحة بعد حرف الجر «пе́ред»',
      instructionEn: 'Choose the correct Instrumental case form after "перед"',
      options: ['зда́нием', 'зда́ние', 'зда́ния', 'зда́нии'],
      correctIndex: 0,
      explanationRu:
        'Предлог «пе́ред» всегда употребляется с творительным падежом (чем?): пе́ред зда́нием.',
      explanationAr:
        'حرف الجر «пе́ред» (أمام) يتطلب دائماً حالة الأداة (Творительный падеж): пе́ред зда́нием.',
      explanationEn:
        'The preposition "перед" (in front of) requires the Instrumental case: перед зданием.',
      points: 10,
    },
  ];

  return {
    id: 'room-madi-101',
    code: 'MADI-101',
    title: 'MADI-101 — Практический русский язык и транспорт',
    description: 'Тренировочная комната подготовительного факультета МАДИ',
    teacherId: 'teacher-madi-1',
    teacherName: 'Кафедра русского языка МАДИ',
    status: 'waiting',
    exerciseTopic: 'Глаголы движения и падежи (МАДИ)',
    teacherInstructions: 'Выберите правильный грамматический вариант',
    pages: [],
    questions,
    currentQuestionIndex: 0,
    questionTimeLimitSeconds: 30,
    participants: {},
    createdAt: new Date().toISOString(),
  };
}

export function loadLocalRooms(): ArenaRoom[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_ARENA_ROOMS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ArenaRoom[];
      if (Array.isArray(parsed)) {
        // MADI-101 must always be present, even for older saved lists.
        if (!parsed.some((r) => r.id === 'room-madi-101' || r.code === 'MADI-101')) {
          return [buildLocalMadi101(), ...parsed];
        }
        return parsed;
      }
    }
  } catch {
    // corrupted storage: fall through to the seed
  }
  return [buildLocalMadi101()];
}

export function saveLocalRooms(rooms: ArenaRoom[]): void {
  try {
    window.localStorage.setItem(LOCAL_ARENA_ROOMS_KEY, JSON.stringify(rooms));
  } catch {
    // ignore quota errors
  }
}

export function findLocalRoom(
  rooms: ArenaRoom[],
  codeOrId: string
): ArenaRoom | undefined {
  const clean = codeOrId.trim().toUpperCase();
  return (
    rooms.find((r) => r.id === codeOrId.trim()) ||
    rooms.find((r) => r.code.toUpperCase() === clean)
  );
}

export function upsertLocalRoom(room: ArenaRoom): ArenaRoom[] {
  const rooms = loadLocalRooms();
  const idx = rooms.findIndex((r) => r.id === room.id);
  if (idx >= 0) rooms[idx] = room;
  else rooms.push(room);
  saveLocalRooms(rooms);
  return rooms;
}

export function deleteLocalRoom(roomId: string): ArenaRoom[] {
  const rooms = loadLocalRooms().filter((r) => r.id !== roomId);
  saveLocalRooms(rooms);
  return rooms;
}

export function newLocalRoom(opts: {
  title: string;
  teacherId: string;
  teacherName: string;
  exerciseTopic: string;
  teacherInstructions: string;
  timeLimitSeconds: number;
}): ArenaRoom {
  return {
    id: localUid('local-room'),
    code: generateRoomCode(),
    title: opts.title,
    teacherId: opts.teacherId,
    teacherName: opts.teacherName,
    status: 'waiting',
    exerciseTopic: opts.exerciseTopic,
    teacherInstructions: opts.teacherInstructions,
    pages: [],
    questions: [],
    currentQuestionIndex: 0,
    questionTimeLimitSeconds: opts.timeLimitSeconds || 30,
    participants: {},
    createdAt: new Date().toISOString(),
  };
}

export function ensureLocalParticipant(
  room: ArenaRoom,
  user: { id: string; name: string; avatar: string; role: 'teacher' | 'student' }
): ArenaRoom {
  if (room.participants[user.id]) return room;
  const participant: ArenaParticipant = {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    role: user.role,
    score: 0,
    correctCount: 0,
    totalAnswered: 0,
    currentStreak: 0,
    bestStreak: 0,
    answers: {},
    isOnline: true,
    joinedAt: new Date().toISOString(),
  };
  return {
    ...room,
    participants: { ...room.participants, [user.id]: participant },
  };
}

/**
 * Record one answer on a local room and return the updated room. Scoring
 * matches the server (arenaEngine.calculateAnswerScore): 10 base + speed
 * bonus + streak bonus.
 */
export function recordLocalAnswer(
  room: ArenaRoom,
  userId: string,
  questionId: string,
  optionIndex: number,
  timeSpentSeconds: number,
  pointsEarned: number,
  isCorrect: boolean
): ArenaRoom {
  const participant = room.participants[userId];
  if (!participant) return room;
  const nextStreak = isCorrect ? participant.currentStreak + 1 : 0;
  const updated: ArenaParticipant = {
    ...participant,
    score: participant.score + pointsEarned,
    correctCount: participant.correctCount + (isCorrect ? 1 : 0),
    totalAnswered: participant.totalAnswered + 1,
    currentStreak: nextStreak,
    bestStreak: Math.max(participant.bestStreak, nextStreak),
    answers: {
      ...participant.answers,
      [questionId]: {
        optionIndex,
        isCorrect,
        timeSeconds: timeSpentSeconds,
        pointsEarned,
        answeredAt: new Date().toISOString(),
      },
    },
  };
  return {
    ...room,
    participants: { ...room.participants, [userId]: updated },
  };
}

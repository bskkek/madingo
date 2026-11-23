import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Users,
  Trophy,
  Flame,
  Volume2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  BookOpen,
  Upload,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  AlertTriangle,
  GraduationCap,
  Award,
  Crown,
  Play,
  FileText,
  Layers,
  BarChart3,
  Loader2,
  Copy,
  Check,
  Trash2,
  Eye,
  EyeOff,
  Ticket,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  ArenaRoom,
  ArenaQuestion,
  RankedStudent,
  ClassroomAnalytics,
  ARENA_I18N,
  getArenaQuestionInstruction,
  getArenaQuestionExplanation,
  getArenaQuestionHint,
  calculateAnswerScore,
  realParticipants,
  realRankingsForRoom,
  realAnalyticsForRoom,
  filterRankingsToReal,
} from '../lib/arenaEngine';
import { readJsonSafe } from '../lib/offlineCache';
import {
  deleteLocalRoom,
  ensureLocalParticipant,
  findLocalRoom,
  loadLocalRooms,
  newLocalRoom,
  recordLocalAnswer,
  upsertLocalRoom,
} from '../lib/localArena';
import {
  GeminiExtractError,
  extractQuestionsViaGemini,
  getGeminiApiKey,
  getGeminiProxyUrl,
  isGeminiProxyConfigured,
} from '../lib/geminiClient';
import { speakRussian, playSoundEffect } from '../lib/audio';
import { useI18n } from '../lib/i18n';

interface AIClassroomArenaViewProps {
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string;
  userRole: 'student' | 'teacher' | 'content_reviewer' | 'admin';
  soundEnabled: boolean;
}

// ARENA API BASE (static hosting): the app is served from GitHub Pages
// with no /api server of its own, so arena calls go to the shared AI
// proxy. VITE_GEMINI_PROXY_URL is the FULL /extract URL (see
// src/lib/geminiClient.ts) — strip that suffix to get the proxy origin.
// Returns '' when no proxy is configured: every call below then falls
// back to the current relative URL, so local dev still works. When the
// proxy is unreachable, readJsonSafe returns null and the existing
// local-mode fallback (markLocalMode) still triggers exactly as before.
function arenaBase(): string {
  const proxyUrl = getGeminiProxyUrl();
  if (!proxyUrl) return '';
  return proxyUrl.replace(/\/extract\/?$/, '').replace(/\/+$/, '');
}

export const AIClassroomArenaView: React.FC<AIClassroomArenaViewProps> = ({
  currentUserId,
  currentUserName,
  currentUserAvatar,
  userRole,
  soundEnabled,
}) => {
  const { lang, dir } = useI18n();
  const L = ARENA_I18N[lang] || ARENA_I18N.en;
  const isRtl = dir === 'rtl';

  // REAL-ONLY ROOMS (Phase 3): the server seeds the preset MADI-101
  // training room with simulated classmates (ids "stud-demo-*", e.g.
  // Yassine B. / Amina K.) and auto-answers for them. They never joined via
  // a room code, so they must never appear on screen — in the roster, the
  // live leaderboard, the podium, the counts, or the analytics. Every room
  // payload from the server goes through sanitizeRoom/applyRoomData below,
  // which drops demo ids and recomputes rankings + analytics from the real
  // participants only. MADI-101 stays available as an honest SOLO practice
  // room (just you, no fake opponents); every other room shows only real
  // users who actually joined, or an honest empty state.
  const sanitizeRoom = (room: ArenaRoom): ArenaRoom => ({
    ...room,
    participants: realParticipants(room.participants),
  });
  const applyRoomData = (
    room: ArenaRoom,
    serverRankings?: RankedStudent[]
  ): ArenaRoom => {
    const realRoom = sanitizeRoom(room);
    setActiveRoom(realRoom);
    // Never trust server-computed rankings/analytics here: they include the
    // simulated MADI-101 classmates. Recompute from real participants only.
    // (For WS payloads carrying rankings without a room, use
    // filterRankingsToReal instead; the 3.5s poll then recomputes fully.)
    setRankings(
      serverRankings ? filterRankingsToReal(serverRankings) : realRankingsForRoom(realRoom)
    );
    setAnalytics(realAnalyticsForRoom(realRoom));
    return realRoom;
  };

  // OFFLINE MODE (static hosting): the first arena request that returns
  // HTML instead of JSON means there is no /api server. From then on every
  // arena action runs locally (rooms in localStorage, quiz on the client)
  // instead of failing silently or showing a raw JSON error.
  const localModeRef = useRef(false);
  const [isLocalArena, setIsLocalArena] = useState(false);
  const markLocalMode = () => {
    if (!localModeRef.current) {
      localModeRef.current = true;
      setIsLocalArena(true);
    }
  };
  // AI extraction goes through the shared proxy (see src/lib/geminiClient.ts)
  // — the user is NEVER asked for a key. The message below is a safety
  // net only (it cannot trigger while the proxy default is in place).
  const geminiKeyNeededMessage =
    lang === 'ar'
      ? 'خدمة الذكاء الاصطناعي غير متاحة الآن — تحقق من الإنترنت وحاول مرة أخرى.'
      : lang === 'ru'
        ? 'Сервис ИИ сейчас недоступен — проверьте интернет и попробуйте снова.'
        : 'The AI service is unavailable right now — check your connection and try again.';
  const localizeGeminiError = (err: any): string => {
    const code = err instanceof GeminiExtractError ? err.code : 'unknown';
    if (code === 'invalid_key')
      return lang === 'ar'
        ? 'مفتاح Gemini غير صحيح — تحقق من المفتاح والصقه من جديد.'
        : lang === 'ru'
          ? 'Неверный ключ Gemini — проверьте ключ и вставьте его заново.'
          : 'Invalid Gemini key — check the key and paste it again.';
    if (code === 'quota')
      return lang === 'ar'
        ? 'وصلت لحد الاستخدام المجاني لـ Gemini — انتظر قليلاً أو استخدم مفتاحاً آخر.'
        : lang === 'ru'
          ? 'Достигнут бесплатный лимит Gemini — подождите немного или используйте другой ключ.'
          : 'Gemini free quota reached — wait a bit or use another key.';
    if (code === 'timeout')
      return lang === 'ar'
        ? 'انتهت مهلة الذكاء الاصطناعي — الخدمة بطيئة الآن، حاول مرة أخرى بعد دقيقة.'
        : lang === 'ru'
          ? 'Время ожидания ИИ истекло — сервис сейчас перегружен, попробуйте через минуту.'
          : 'The AI service timed out — it is slow right now, please try again in a minute.';
    if (code === 'no_questions')
      return lang === 'ar'
        ? 'لم يستخرج Gemini أي سؤال من هذه الصفحة — جرب صفحة أو نصاً أوضح.'
        : lang === 'ru'
          ? 'Gemini не извлёк ни одного вопроса с этой страницы — попробуйте более чёткую страницу или текст.'
          : 'Gemini extracted no questions from this page — try a clearer page or text.';
    return lang === 'ar'
      ? 'تعذر الاتصال بـ Gemini — تحقق من الإنترنت وحاول من جديد.'
      : lang === 'ru'
        ? 'Не удалось связаться с Gemini — проверьте интернет и попробуйте снова.'
        : 'Could not reach Gemini — check the connection and try again.';
  };

  // SINGLE DISPLAY-SITE MAPPER for the extraction error banner (2026-11-13):
  // every value that can reach setExtractError MUST go through here, so the
  // banner can never show a raw English code or message again.
  // WHY the raw word "timeout" appeared live (18:48 MSK): the proxy's
  // callGemini turns an AbortError into detail='timeout', extractViaGemini
  // returns it as message, and extract-page answers { error: 'timeout' }
  // (a PLAIN STRING — no {code,message} object). The server-path branch
  // did setExtractError(err.error) verbatim, bypassing localizeGeminiError,
  // which only the local/direct path and the client-side AbortError branch
  // used. This helper unwraps every shape — GeminiExtractError, a plain
  // string, {error: string}, {error:{code,message}}, {code,message}, a
  // fetch Error, an AbortError — and always returns a user-facing
  // localized sentence. The structured code is kept only for the mapping
  // itself, never rendered.
  const localizeExtractError = (raw: any): string => {
    if (raw instanceof GeminiExtractError) return localizeGeminiError(raw);
    if (raw && raw.name === 'AbortError')
      return localizeGeminiError(new GeminiExtractError('timeout', 'extract-page timed out'));
    const errObj = raw?.error ?? raw;
    const code =
      typeof errObj?.code === 'string'
        ? errObj.code
        : typeof raw?.code === 'string'
          ? raw.code
          : '';
    const text =
      typeof errObj === 'string'
        ? errObj
        : typeof errObj?.message === 'string'
          ? errObj.message
          : typeof raw?.message === 'string'
            ? raw.message
            : '';
    // Already a user-facing Arabic sentence: show it as-is.
    if (/[\u0600-\u06FF]/.test(text)) return text;
    const hay = `${code} ${text}`.toLowerCase();
    if (hay.includes('timeout') || hay.includes('timed out'))
      return localizeGeminiError(new GeminiExtractError('timeout', 'timeout'));
    if (hay.includes('no_questions') || hay.includes('no questions'))
      return localizeGeminiError(new GeminiExtractError('no_questions', 'no_questions'));
    if (
      hay.includes('invalid_key') ||
      hay.includes('invalid api key') ||
      hay.includes('api key not valid')
    )
      return localizeGeminiError(new GeminiExtractError('invalid_key', 'invalid_key'));
    if (hay.includes('image_too_large') || hay.includes('image is too large'))
      return lang === 'ar'
        ? 'الصورة كبيرة جداً — أرسل صورة أصغر أو مضغوطة لصفحة الدرس.'
        : lang === 'ru'
          ? 'Фото слишком большое — отправьте меньшее или сжатое фото страницы.'
          : 'The image is too large — please send a smaller or compressed photo of the page.';
    if (
      hay.includes('quota') ||
      hay.includes('rate limit') ||
      hay.includes('overload') ||
      hay.includes('503') ||
      hay.includes('429') ||
      hay.includes('too many') ||
      hay.includes('limit reached')
    )
      return lang === 'ar'
        ? 'خدمة الذكاء الاصطناعي مشغولة الآن — حاول مرة أخرى بعد قليل.'
        : lang === 'ru'
          ? 'Сервис ИИ сейчас перегружен — попробуйте ещё раз чуть позже.'
          : 'The AI service is busy right now — please try again in a little while.';
    // Network / unknown / any other raw English text (e.g. 'Failed to
    // fetch', a bare code like 'network'): never render it raw.
    return lang === 'ar'
      ? 'حدث خطأ أثناء استخراج الأسئلة — تحقق من الإنترنت وحاول مرة أخرى.'
      : lang === 'ru'
        ? 'Произошла ошибка при извлечении вопросов — проверьте интернет и попробуйте снова.'
        : 'Something went wrong while extracting the questions — check your connection and try again.';
  };

  // Mode: 'lobby' | 'create' | 'room' | 'active_quiz' | 'podium'
  const [viewMode, setViewMode] = useState<'lobby' | 'create' | 'room' | 'active_quiz' | 'podium'>('lobby');

  // Rooms list
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);

  // Active room state
  const [activeRoom, setActiveRoom] = useState<ArenaRoom | null>(null);
  const [rankings, setRankings] = useState<RankedStudent[]>([]);
  const [analytics, setAnalytics] = useState<ClassroomAnalytics | null>(null);
  const [isRoomOwner, setIsRoomOwner] = useState(false);
  const [showTeacherAnswersPreview, setShowTeacherAnswersPreview] = useState(false);

  // Custom manual question builder state
  const [showAddQuestionForm, setShowAddQuestionForm] = useState(false);
  const [manualPromptRu, setManualPromptRu] = useState('');
  const [manualInstructionAr, setManualInstructionAr] = useState(L.defaultManualInstruction);
  const [manualOptions, setManualOptions] = useState<string[]>(['', '', '', '']);
  const [manualCorrectIndex, setManualCorrectIndex] = useState<number>(0);
  const [manualExplanationAr, setManualExplanationAr] = useState('');

  // Quiz interactive state
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasAnsweredCurrent, setHasAnsweredCurrent] = useState(false);
  const [lastAnswerOutcome, setLastAnswerOutcome] = useState<{
    isCorrect: boolean;
    pointsEarned: number;
    explanationRu: string;
    explanationAr: string;
    explanationEn?: string;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [myStreak, setMyStreak] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);

  // Room Creation state
  // newTitle starts EMPTY on purpose (redesign 2026-11-13): the title
  // input is gone, so both room creation (handleCreateRoom) and extraction
  // (handleExtractExercises) fall back to L.defaultCreatedRoomTitle.
  const [newTitle, setNewTitle] = useState('');
  const [newTopic, setNewTopic] = useState(L.defaultTopic);
  const [newInstructions, setNewInstructions] = useState(L.defaultInstructions);
  const [newTimeLimit, setNewTimeLimit] = useState(30);
  const [newQuestionCount, setNewQuestionCount] = useState(5);
  const [customText, setCustomText] = useState('');
  const [customImageBase64, setCustomImageBase64] = useState<string>('');
  const [customImageName, setCustomImageName] = useState<string>('');
  // New-challenge setup screen (redesign 2026-11-13): paste-text toggle +
  // ⋯ options sheet — both local to the 'create' view.
  const [showPasteText, setShowPasteText] = useState(false);
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  // Ref to the file input so removing the image also clears the input
  // value — otherwise picking the SAME file again would not fire onChange.
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Sync default form text when UI language switches
  useEffect(() => {
    const allDefaultTitles = Object.values(ARENA_I18N).flatMap((x) => [
      x.defaultRoomTitle,
      x.defaultCreatedRoomTitle,
    ]);
    if (allDefaultTitles.includes(newTitle)) {
      setNewTitle(L.defaultRoomTitle);
    }
    const allDefaultTopics = Object.values(ARENA_I18N).map((x) => x.defaultTopic);
    if (allDefaultTopics.includes(newTopic)) {
      setNewTopic(L.defaultTopic);
    }
    const allDefaultInstr = Object.values(ARENA_I18N).map((x) => x.defaultInstructions);
    if (allDefaultInstr.includes(newInstructions)) {
      setNewInstructions(L.defaultInstructions);
    }
    const allDefaultManualInstr = Object.values(ARENA_I18N).map((x) => x.defaultManualInstruction);
    if (allDefaultManualInstr.includes(manualInstructionAr)) {
      setManualInstructionAr(L.defaultManualInstruction);
    }
    setJoinError(null);
  }, [lang]);

  // WebSocket & timer references
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const viewModeRef = useRef(viewMode);
  const activeRoomRef = useRef(activeRoom);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  // Fetch active rooms on mount
  const fetchRooms = async () => {
    setIsLoadingRooms(true);
    try {
      const resp = await fetch(`${arenaBase()}/api/arena/rooms`);
      const data = await readJsonSafe(resp);
      if (data) {
        setRooms(data.rooms || []);
        return;
      }
      // No server (static hosting): rooms live on this device.
      markLocalMode();
      setRooms(loadLocalRooms());
    } catch (err) {
      markLocalMode();
      setRooms(loadLocalRooms());
    } finally {
      setIsLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // Confetti cleanup: canvas-confetti leaves its canvas on the page after a
  // celebration, so clear it when the arena unmounts and whenever we return
  // to the lobby (leaving a room / finishing a quiz).
  useEffect(() => {
    return () => {
      confetti.reset();
    };
  }, []);

  useEffect(() => {
    if (viewMode === 'lobby') confetti.reset();
  }, [viewMode]);

  // Helper to re-fetch room state from backend (or from the local store
  // when there is no server)
  const refreshRoomDetails = async (roomIdOrCode: string, callback?: (loadedRoom: ArenaRoom) => void) => {
    if (localModeRef.current) {
      const local = findLocalRoom(loadLocalRooms(), roomIdOrCode);
      if (local) {
        const realRoom = applyRoomData(local);
        setIsRoomOwner(
          local.teacherId === currentUserId ||
            userRole === 'teacher' ||
            userRole === 'admin' ||
            local.id === 'room-madi-101'
        );
        if (callback) callback(realRoom);
      }
      return;
    }
    try {
      const resp = await fetch(`${arenaBase()}/api/arena/rooms/${encodeURIComponent(roomIdOrCode)}`);
      const data = await readJsonSafe(resp);
      if (!data) {
        markLocalMode();
        await refreshRoomDetails(roomIdOrCode, callback);
        return;
      }
      const realRoom = applyRoomData(data.room, data.rankings || []);
      setIsRoomOwner(
        data.room.teacherId === currentUserId ||
          userRole === 'teacher' ||
          userRole === 'admin' ||
          data.room.id === 'room-madi-101'
      );
      if (callback) callback(realRoom);
    } catch (err) {
      console.error('Error refreshing room details:', err);
    }
  };

  // Set up WebSocket connection + Fallback Polling whenever activeRoom changes
  useEffect(() => {
    if (!activeRoom?.id) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    // Offline: no WebSocket server and no /api to poll — the quiz runs
    // entirely on the client, so there is nothing to sync.
    if (localModeRef.current) {
      return;
    }

    const roomId = activeRoom.id;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Static hosting: no WS server on this origin — point at the shared
    // proxy host when configured (the proxy has no WS server either, so
    // the 3.5s polling below stays the real sync mechanism).
    const wsHost = (() => {
      const base = arenaBase();
      if (!base) return window.location.host;
      try {
        return new URL(base).host;
      } catch {
        return window.location.host;
      }
    })();
    const wsUrl = `${protocol}//${wsHost}/ws/arena?roomId=${encodeURIComponent(roomId)}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'join', roomId }));
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.roomId !== roomId) return;

          if (msg.type === 'participant:joined' || msg.type === 'room:questions_ready') {
            refreshRoomDetails(roomId);
          } else if (msg.type === 'room:started') {
            refreshRoomDetails(roomId, (loadedRoom) => {
              setViewMode('active_quiz');
              setSelectedOption(null);
              setHasAnsweredCurrent(false);
              setLastAnswerOutcome(null);
              setTimeLeft(loadedRoom.questionTimeLimitSeconds || 30);
              startTimeRef.current = Date.now();
            });
          } else if (msg.type === 'room:answer_submitted') {
            if (msg.rankings) {
              // Rankings-only payload: drop simulated ids, renumber 1..n.
              setRankings(filterRankingsToReal(msg.rankings));
            }
          } else if (msg.type === 'room:next_question') {
            refreshRoomDetails(roomId, (loadedRoom) => {
              setSelectedOption(null);
              setHasAnsweredCurrent(false);
              setLastAnswerOutcome(null);
              setTimeLeft(loadedRoom.questionTimeLimitSeconds || 30);
              startTimeRef.current = Date.now();
            });
          } else if (msg.type === 'room:finished') {
            if (msg.rankings) setRankings(filterRankingsToReal(msg.rankings));
            // Server analytics include simulated classmates: re-fetch the
            // room so analytics are recomputed from real participants only.
            refreshRoomDetails(roomId);
            setViewMode('podium');
            confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
          } else if (msg.type === 'room:deleted') {
            setActiveRoom(null);
            setViewMode('lobby');
            fetchRooms();
          }
        } catch {
          // ignore malformed message
        }
      };
    } catch {
      // ignore websocket creation error
    }

    // Fallback polling every 3.5s in 'room' or 'active_quiz' so state never desyncs
    const pollInterval = setInterval(async () => {
      const currentMode = viewModeRef.current;
      const currentRm = activeRoomRef.current;
      if (!currentRm || (currentMode !== 'room' && currentMode !== 'active_quiz')) return;

      try {
        const resp = await fetch(`${arenaBase()}/api/arena/rooms/${encodeURIComponent(currentRm.id)}`);
        if (resp.status === 404) {
          setActiveRoom(null);
          setViewMode('lobby');
          fetchRooms();
          return;
        }
        if (!resp.ok) return;
        const data = await resp.json();
        // Real participants only: drop simulated classmates and recompute
        // rankings/analytics from the real room (never server rankings).
        const serverRoom: ArenaRoom = applyRoomData(data.room, data.rankings || []);

        if (currentMode === 'room' && serverRoom.status === 'active') {
          setViewMode('active_quiz');
          setSelectedOption(null);
          setHasAnsweredCurrent(false);
          setLastAnswerOutcome(null);
          setTimeLeft(serverRoom.questionTimeLimitSeconds || 30);
          startTimeRef.current = Date.now();
        } else if (currentMode === 'active_quiz') {
          if (serverRoom.status === 'finished') {
            setViewMode('podium');
          } else if (serverRoom.currentQuestionIndex !== currentRm.currentQuestionIndex) {
            setSelectedOption(null);
            setHasAnsweredCurrent(false);
            setLastAnswerOutcome(null);
            setTimeLeft(serverRoom.questionTimeLimitSeconds || 30);
            startTimeRef.current = Date.now();
          }
        }
      } catch {
        // ignore transient network errors
      }
    }, 3500);

    return () => {
      clearInterval(pollInterval);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [activeRoom?.id]);

  // Question countdown timer during active quiz
  useEffect(() => {
    if (viewMode !== 'active_quiz' || hasAnsweredCurrent) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [viewMode, activeRoom?.currentQuestionIndex, hasAnsweredCurrent]);

  const handleTimeOut = async () => {
    if (hasAnsweredCurrent || !activeRoom) return;
    setHasAnsweredCurrent(true);
    setMyStreak(0);
    playSoundEffect('wrong', soundEnabled);
    const currQ = activeRoom.questions[activeRoom.currentQuestionIndex];
    if (currQ) {
      setLastAnswerOutcome({
        isCorrect: false,
        pointsEarned: 0,
        explanationRu: currQ.explanationRu,
        explanationAr: currQ.explanationAr,
        explanationEn: currQ.explanationEn,
      });
      // Offline: nothing to report to the server (0 points either way).
      if (localModeRef.current) return;
      try {
        const resp = await fetch(`${arenaBase()}/api/arena/rooms/${encodeURIComponent(activeRoom.id)}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId: currentUserId,
            participantName: currentUserName,
            participantAvatar: currentUserAvatar,
            questionId: currQ.id,
            optionIndex: -1,
            timeSpentSeconds: activeRoom.questionTimeLimitSeconds || 30,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.rankings) setRankings(filterRankingsToReal(data.rankings));
        }
      } catch {
        // ignore
      }
    }
  };

  // Join Room by Code or ID
  const handleJoinRoom = async (codeOrId: string) => {
    const cleanCode = codeOrId.trim();
    if (!cleanCode) {
      setJoinError(L.errEnterCodeFirst);
      return;
    }
    setJoinError(null);

    // Offline join: find the room on this device and enter it directly.
    const joinLocalRoom = (room: ArenaRoom) => {
      const withMe = ensureLocalParticipant(room, {
        id: currentUserId,
        name: currentUserName,
        avatar: currentUserAvatar,
        role: userRole === 'teacher' ? 'teacher' : 'student',
      });
      upsertLocalRoom(withMe);
      const realRoom = applyRoomData(withMe);
      setShowTeacherAnswersPreview(false);
      setIsRoomOwner(
        withMe.teacherId === currentUserId ||
          userRole === 'teacher' ||
          userRole === 'admin' ||
          withMe.id === 'room-madi-101'
      );
      if (withMe.status === 'active') {
        setViewMode('active_quiz');
        setSelectedOption(null);
        setHasAnsweredCurrent(false);
        setLastAnswerOutcome(null);
        setTimeLeft(withMe.questionTimeLimitSeconds || 30);
      } else if (withMe.status === 'finished') {
        setViewMode('podium');
      } else if (realRoom.questions && realRoom.questions.length === 0) {
        setNewTitle(withMe.title || L.defaultRoomTitle);
        setNewTopic(withMe.exerciseTopic || L.defaultTopic);
        setNewInstructions(withMe.teacherInstructions || L.defaultInstructions);
        setNewTimeLimit(withMe.questionTimeLimitSeconds || 30);
        setViewMode('create');
      } else {
        setViewMode('room');
      }
    };

    if (localModeRef.current) {
      const local = findLocalRoom(loadLocalRooms(), cleanCode);
      if (!local) {
        setJoinError(L.errJoinFailed);
        return;
      }
      joinLocalRoom(local);
      return;
    }

    try {
      const resp = await fetch(`${arenaBase()}/api/arena/rooms/${encodeURIComponent(cleanCode)}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: currentUserId,
          name: currentUserName,
          avatar: currentUserAvatar,
          role: userRole === 'teacher' ? 'teacher' : 'student',
        }),
      });

      const data = await readJsonSafe(resp);
      if (!data) {
        // No server: join the local room instead.
        markLocalMode();
        const local = findLocalRoom(loadLocalRooms(), cleanCode);
        if (!local) {
          setJoinError(L.errJoinFailed);
          return;
        }
        joinLocalRoom(local);
        return;
      }
      if (!resp.ok) {
        setJoinError(data.error || L.errJoinFailed);
        return;
      }

      const realRoom = applyRoomData(data.room, data.rankings || []);
      setShowTeacherAnswersPreview(false);
      setIsRoomOwner(
        data.room.teacherId === currentUserId ||
          userRole === 'teacher' ||
          userRole === 'admin' ||
          data.room.id === 'room-madi-101'
      );

      if (data.room.status === 'active') {
        setViewMode('active_quiz');
        setSelectedOption(null);
        setHasAnsweredCurrent(false);
        setLastAnswerOutcome(null);
        setTimeLeft(data.room.questionTimeLimitSeconds || 30);
      } else if (data.room.status === 'finished') {
        await refreshRoomDetails(data.room.id);
        setViewMode('podium');
      } else if (realRoom.questions && realRoom.questions.length === 0) {
        setNewTitle(data.room.title || L.defaultRoomTitle);
        setNewTopic(data.room.exerciseTopic || L.defaultTopic);
        setNewInstructions(data.room.teacherInstructions || L.defaultInstructions);
        setNewTimeLimit(data.room.questionTimeLimitSeconds || 30);
        setViewMode('create');
      } else {
        setViewMode('room');
      }
    } catch (err: any) {
      // Network down: fall back to the local room too.
      markLocalMode();
      const local = findLocalRoom(loadLocalRooms(), cleanCode);
      if (local) joinLocalRoom(local);
      else setJoinError(err?.message || L.errServerConn);
    }
  };

  // Open Room Creation Studio & Create Room
  const handleCreateRoom = async (customTitleOverride?: string) => {
    const resolvedTitle =
      (typeof customTitleOverride === 'string' && customTitleOverride.trim()) ||
      newTitle.trim() ||
      L.defaultCreatedRoomTitle;
    setNewTitle(resolvedTitle);
    setExtractError(null);

    // Offline: create the room on this device (manual questions work here;
    // AI extraction still needs the server, see handleExtractExercises).
    const createLocalRoom = () => {
      const room = newLocalRoom({
        title: resolvedTitle,
        teacherId: currentUserId,
        teacherName: currentUserName,
        exerciseTopic: newTopic,
        teacherInstructions: newInstructions,
        timeLimitSeconds: newTimeLimit,
      });
      upsertLocalRoom(room);
      setActiveRoom(sanitizeRoom(room));
      setIsRoomOwner(true);
      setViewMode('create');
    };

    if (localModeRef.current) {
      createLocalRoom();
      return;
    }

    try {
      const resp = await fetch(`${arenaBase()}/api/arena/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: resolvedTitle,
          teacherId: currentUserId,
          teacherName: currentUserName,
          exerciseTopic: newTopic,
          teacherInstructions: newInstructions,
          timeLimitSeconds: newTimeLimit,
        }),
      });

      const createdRoom = await readJsonSafe(resp);
      if (!createdRoom) {
        markLocalMode();
        createLocalRoom();
        return;
      }
      if (resp.ok) {
        setActiveRoom(sanitizeRoom(createdRoom));
        setIsRoomOwner(true);
        setViewMode('create');
      }
    } catch (err) {
      markLocalMode();
      createLocalRoom();
    }
  };

  // Cancel / Back from Creation Studio (cleans up empty 0-question room so lobby stays clean)
  const handleCancelCreationStudio = async () => {
    if (activeRoom && activeRoom.questions.length === 0 && activeRoom.id !== 'room-madi-101') {
      if (localModeRef.current) {
        deleteLocalRoom(activeRoom.id);
      } else {
        try {
          await fetch(`${arenaBase()}/api/arena/rooms/${encodeURIComponent(activeRoom.id)}`, {
            method: 'DELETE',
          });
        } catch {
          // ignore
        }
      }
      setActiveRoom(null);
      await fetchRooms();
      setViewMode('lobby');
    } else if (activeRoom && activeRoom.questions.length > 0) {
      setViewMode('room');
    } else {
      setViewMode('lobby');
    }
  };

  // Delete Room (to prevent clutter and keep list clean & organized)
  const handleDeleteRoom = async (
    roomIdOrCode: string,
    roomTitle?: string,
    e?: React.MouseEvent
  ) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    // Optimistic removal from lobby list immediately
    setRooms((prev) => prev.filter((r) => r.id !== roomIdOrCode && r.code !== roomIdOrCode));
    setDeleteNotice(L.deleteNoticeTemplate(roomTitle || roomIdOrCode));
    setTimeout(() => setDeleteNotice(null), 3500);

    if (localModeRef.current) {
      deleteLocalRoom(roomIdOrCode);
      if (activeRoom && (activeRoom.id === roomIdOrCode || activeRoom.code === roomIdOrCode)) {
        setActiveRoom(null);
        setViewMode('lobby');
      }
      await fetchRooms();
      return;
    }

    try {
      const resp = await fetch(`${arenaBase()}/api/arena/rooms/${encodeURIComponent(roomIdOrCode)}`, {
        method: 'DELETE',
      });
      if (resp.ok) {
        if (activeRoom && (activeRoom.id === roomIdOrCode || activeRoom.code === roomIdOrCode)) {
          setActiveRoom(null);
          setViewMode('lobby');
        }
        await fetchRooms();
      }
    } catch (err) {
      console.error('Failed to delete room:', err);
    }
  };

  // Downscale the page photo on the client before upload: a phone photo is
  // 2–5 MB (3–7 MB as base64) and stalls the extraction request; a 1280px
  // JPEG at quality 0.8 is ~100–200 KB and stays perfectly readable for
  // the AI. On any failure the original image is used as-is.
  const downscalePageImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const longest = Math.max(img.naturalWidth, img.naturalHeight);
          if (longest <= 1280) {
            resolve(dataUrl);
            return;
          }
          const scale = 1280 / longest;
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.naturalWidth * scale);
          canvas.height = Math.round(img.naturalHeight * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  // Handle Image Upload for AI Extraction
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomImageName(file.name);
    const reader = new FileReader();
    reader.onload = async () => {
      // Downscale once here: customImageBase64 is the single source both
      // extract paths send (server path and local path).
      setCustomImageBase64(await downscalePageImage(reader.result as string));
    };
    reader.readAsDataURL(file);
  };

  // Remove the uploaded page image (2026-11-13): clears the image state
  // AND the file input value, so a text-only extraction is possible —
  // without reloading the page and without touching the pasted text.
  const handleRemoveImage = () => {
    setCustomImageBase64('');
    setCustomImageName('');
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // Change the per-question time from the ⋯ sheet (redesign 2026-11-13).
  // The value is sent at creation + on every re-extraction via the
  // extract payloads, AND to an existing waiting room right away via
  // PUT /api/arena/rooms/:id/settings — otherwise the selector would be
  // dead once the room already has questions. Local mode: the room lives
  // in localStorage, so update it directly. If the server has no settings
  // route (old proxy), the call 404s harmlessly and the value still
  // applies on the next re-extraction.
  const handleChangeTimeLimit = async (seconds: number) => {
    const clamped = Math.max(10, Math.min(60, Number(seconds) || 30));
    setNewTimeLimit(clamped);
    if (!activeRoom) return;
    if (localModeRef.current) {
      const updatedRoom = { ...activeRoom, questionTimeLimitSeconds: clamped };
      upsertLocalRoom(updatedRoom);
      setActiveRoom(sanitizeRoom(updatedRoom));
      return;
    }
    try {
      const resp = await fetch(
        `${arenaBase()}/api/arena/rooms/${encodeURIComponent(activeRoom.id)}/settings`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timeLimitSeconds: clamped }),
        }
      );
      const data = await readJsonSafe(resp);
      if (resp.ok && data?.room) {
        setActiveRoom(sanitizeRoom(data.room));
      }
    } catch (err) {
      console.error('Failed to update room time limit:', err);
    }
  };

  // Client-side AI extraction (offline mode): the user's own free Gemini
  // key turns the uploaded page image / pasted text into quiz questions,
  // saved to the local room — the same prompt and parsing the server used.
  const handleLocalExtract = async () => {
    const apiKey = getGeminiApiKey();
    // With the shared proxy configured, extraction works for every user
    // with no key at all; the saved key is only a fallback.
    if (!apiKey && !isGeminiProxyConfigured()) {
      setExtractError(geminiKeyNeededMessage);
      return;
    }
    let targetRoom = activeRoom;
    if (!targetRoom) {
      targetRoom = newLocalRoom({
        title: newTitle.trim() || L.defaultCreatedRoomTitle,
        teacherId: currentUserId,
        teacherName: currentUserName,
        exerciseTopic: newTopic,
        teacherInstructions: newInstructions,
        timeLimitSeconds: newTimeLimit,
      });
      upsertLocalRoom(targetRoom);
      setActiveRoom(sanitizeRoom(targetRoom));
      setIsRoomOwner(true);
    }
    if (newTitle.trim()) targetRoom = { ...targetRoom, title: newTitle.trim() };
    targetRoom = {
      ...targetRoom,
      questionTimeLimitSeconds: Math.max(10, Math.min(60, Number(newTimeLimit) || 30)),
    };
    try {
      const result = await extractQuestionsViaGemini({
        apiKey: apiKey || undefined,
        pageText: customText.trim(),
        pageImageBase64: customImageBase64,
        teacherInstructions: newInstructions || targetRoom.teacherInstructions,
        topic: newTopic || targetRoom.exerciseTopic,
        questionCount: newQuestionCount || 5,
      });
      const pageRecord = {
        id: `p-${Date.now()}`,
        title: customImageName
          ? `${customImageName} — ص 1`
          : `صفحة مرفوعة #${targetRoom.pages.length + 1}`,
        bookTitle: customImageName || undefined,
        pageNumber: 1,
        imageUrl: customImageBase64 ? customImageBase64.slice(0, 500) : undefined,
        rawText: customText ? customText.trim().slice(0, 2000) : undefined,
      };
      const updatedRoom: ArenaRoom = {
        ...targetRoom,
        questions: result.questions,
        exerciseTopic: result.extractedTopic || targetRoom.exerciseTopic,
        teacherInstructions: newInstructions || targetRoom.teacherInstructions,
        status: 'waiting',
        pages: [...targetRoom.pages, pageRecord],
      };
      upsertLocalRoom(updatedRoom);
      setActiveRoom(sanitizeRoom(updatedRoom));
      await fetchRooms();
      setShowTeacherAnswersPreview(false);
      setViewMode('room');
      confetti({ particleCount: 40, spread: 60 });
    } catch (err: any) {
      setExtractError(localizeExtractError(err));
    }
  };

  // Trigger AI Page Extraction
  const handleExtractExercises = async () => {
    setIsExtracting(true);
    setExtractError(null);

    // Static hosting: extraction goes through the shared AI proxy when it
    // is configured (no key needed), otherwise the user's own free Gemini
    // key, straight from the browser (see src/lib/geminiClient.ts).
    if (localModeRef.current) {
      try {
        await handleLocalExtract();
      } finally {
        setIsExtracting(false);
      }
      return;
    }

    try {
      let targetRoom = activeRoom;
      if (!targetRoom) {
        const createResp = await fetch(`${arenaBase()}/api/arena/rooms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newTitle.trim() || L.defaultCreatedRoomTitle,
            teacherId: currentUserId,
            teacherName: currentUserName,
            exerciseTopic: newTopic,
            teacherInstructions: newInstructions,
            timeLimitSeconds: newTimeLimit,
          }),
        });
        const createdRoom = await readJsonSafe(createResp);
        if (!createdRoom) {
          markLocalMode();
          await handleLocalExtract();
          return;
        }
        if (!createResp.ok) {
          setExtractError(L.errCreateRoom);
          return;
        }
        targetRoom = createdRoom;
        setActiveRoom(targetRoom ? sanitizeRoom(targetRoom) : targetRoom);
        setIsRoomOwner(true);
      }

      const payload = {
        title: newTitle.trim() || targetRoom!.title,
        timeLimitSeconds: newTimeLimit,
        pageText: customText.trim(),
        pageImageBase64: customImageBase64,
        bookTitle: customImageName || L.uploadedSheetDefaultName,
        pageNumber: 1,
        teacherInstructions: newInstructions || targetRoom!.teacherInstructions,
        topic: newTopic || targetRoom!.exerciseTopic,
        questionCount: newQuestionCount || 20,
      };

      // Server-path extract had no timeout of its own (2026-11-13): without
      // one a hung proxy left the UI spinning forever. 90s matches the local
      // proxy path budget; the proxy answers extract calls in <= ~54s worst
      // case, so a 90s abort is a real hang, not a slow OK.
      const extractCtrl = new AbortController();
      const extractTimer = setTimeout(() => extractCtrl.abort(), 90_000);
      let resp: Response;
      try {
        resp = await fetch(`${arenaBase()}/api/arena/rooms/${encodeURIComponent(targetRoom!.id)}/extract-page`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: extractCtrl.signal,
        });
      } finally {
        clearTimeout(extractTimer);
      }

      if (!resp.ok) {
        const err = (await readJsonSafe(resp)) || {};
        // Never render err.error raw: the server answers { error: 'timeout' }
        // (plain string, no code object) — route it through the display
        // mapper so the banner always shows an Arabic sentence.
        setExtractError(localizeExtractError(err));
        return;
      }

      await refreshRoomDetails(targetRoom!.id);
      await fetchRooms();
      setShowTeacherAnswersPreview(false);
      // Redesign 2026-11-13: stay on the setup screen after extraction so
      // the teacher sees the questions here (no jump to the room view).
      confetti({ particleCount: 40, spread: 60 });
    } catch (err: any) {
      // One mapper for every failure here: client-side AbortError (the 90s
      // timer) AND raw fetch errors ('Failed to fetch', …) both become a
      // user-facing Arabic sentence — never a raw code or English message.
      setExtractError(localizeExtractError(err));
    } finally {
      setIsExtracting(false);
    }
  };

  // Add a manual question to activeRoom
  const handleAddManualQuestion = async () => {
    if (!activeRoom) return;
    if (!manualPromptRu.trim()) return;
    const filledOptions = manualOptions.map((o, idx) => o.trim() || `Вариант ${idx + 1}`);
    const newQ: ArenaQuestion = {
      id: `q-manual-${Date.now()}`,
      promptRu: manualPromptRu.trim(),
      instructionRu: 'Выберите правильный ответ',
      instructionAr: manualInstructionAr.trim() || L.defaultManualInstruction,
      instructionEn: 'Choose the correct answer',
      options: filledOptions,
      correctIndex: manualCorrectIndex,
      explanationRu: manualExplanationAr.trim() || 'Правильный грамматический выбор.',
      explanationAr: manualExplanationAr.trim() || 'الإجابة النحوية الصحيحة.',
      explanationEn: manualExplanationAr.trim() || 'Correct grammatical choice.',
      points: 10,
    };

    const updatedQuestions = [...activeRoom.questions, newQ];
    const clearManualForm = () => {
      setManualPromptRu('');
      setManualOptions(['', '', '', '']);
      setManualCorrectIndex(0);
      setManualExplanationAr('');
      setShowAddQuestionForm(false);
    };
    if (localModeRef.current) {
      const updatedRoom = { ...activeRoom, questions: updatedQuestions };
      upsertLocalRoom(updatedRoom);
      setActiveRoom(sanitizeRoom(updatedRoom));
      clearManualForm();
      return;
    }
    try {
      const resp = await fetch(`${arenaBase()}/api/arena/rooms/${encodeURIComponent(activeRoom.id)}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: updatedQuestions }),
      });
      const data = await readJsonSafe(resp);
      if (!data) {
        markLocalMode();
        const updatedRoom = { ...activeRoom, questions: updatedQuestions };
        upsertLocalRoom(updatedRoom);
        setActiveRoom(sanitizeRoom(updatedRoom));
        clearManualForm();
        return;
      }
      if (resp.ok) {
        setActiveRoom(sanitizeRoom(data.room));
        clearManualForm();
      }
    } catch (err) {
      console.error('Failed to add manual question:', err);
    }
  };

  // Remove a question from activeRoom
  const handleDeleteQuestion = async (questionId: string) => {
    if (!activeRoom || activeRoom.questions.length <= 1) return;
    const updatedQuestions = activeRoom.questions.filter((q) => q.id !== questionId);
    if (localModeRef.current) {
      const updatedRoom = { ...activeRoom, questions: updatedQuestions };
      upsertLocalRoom(updatedRoom);
      setActiveRoom(sanitizeRoom(updatedRoom));
      return;
    }
    try {
      const resp = await fetch(`${arenaBase()}/api/arena/rooms/${encodeURIComponent(activeRoom.id)}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: updatedQuestions }),
      });
      const data = await readJsonSafe(resp);
      if (!data) {
        markLocalMode();
        const updatedRoom = { ...activeRoom, questions: updatedQuestions };
        upsertLocalRoom(updatedRoom);
        setActiveRoom(sanitizeRoom(updatedRoom));
        return;
      }
      if (resp.ok) {
        setActiveRoom(sanitizeRoom(data.room));
      }
    } catch (err) {
      console.error('Failed to delete question:', err);
    }
  };

  // Start Live Quiz
  const handleStartQuiz = async () => {
    if (!activeRoom) return;
    const beginQuiz = (room: ArenaRoom) => {
      applyRoomData(room);
      setViewMode('active_quiz');
      setSelectedOption(null);
      setHasAnsweredCurrent(false);
      setLastAnswerOutcome(null);
      setMyStreak(0);
      setTimeLeft(room.questionTimeLimitSeconds || 30);
      startTimeRef.current = Date.now();
    };
    if (localModeRef.current) {
      const startedRoom: ArenaRoom = {
        ...activeRoom,
        status: 'active',
        currentQuestionIndex: 0,
        startedAt: new Date().toISOString(),
      };
      upsertLocalRoom(startedRoom);
      beginQuiz(startedRoom);
      return;
    }
    try {
      const resp = await fetch(`${arenaBase()}/api/arena/rooms/${encodeURIComponent(activeRoom.id)}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: currentUserId,
          participantName: currentUserName,
          participantAvatar: currentUserAvatar,
        }),
      });
      const data = await readJsonSafe(resp);
      if (!data) {
        markLocalMode();
        const startedRoom: ArenaRoom = {
          ...activeRoom,
          status: 'active',
          currentQuestionIndex: 0,
          startedAt: new Date().toISOString(),
        };
        upsertLocalRoom(startedRoom);
        beginQuiz(startedRoom);
        return;
      }
      if (resp.ok) {
        applyRoomData(data.room, data.rankings || []);
        setViewMode('active_quiz');
        setSelectedOption(null);
        setHasAnsweredCurrent(false);
        setLastAnswerOutcome(null);
        setMyStreak(0);
        setTimeLeft(data.room.questionTimeLimitSeconds || 30);
        startTimeRef.current = Date.now();
      }
    } catch (err) {
      console.error('Failed to start quiz:', err);
    }
  };

  // Submit Answer
  const handleSelectOption = async (optionIdx: number) => {
    if (hasAnsweredCurrent || !activeRoom) return;
    setSelectedOption(optionIdx);
    setHasAnsweredCurrent(true);

    const currentQ = activeRoom.questions[activeRoom.currentQuestionIndex];
    if (!currentQ) return;

    const timeSpent = Math.max(
      0.5,
      Math.min(
        activeRoom.questionTimeLimitSeconds || 30,
        (Date.now() - startTimeRef.current) / 1000
      )
    );

    // Offline evaluation: score locally, save it on the room, recompute
    // the ranking from the real participants (just me in solo practice).
    const evaluateLocally = () => {
      const isCorrect = optionIdx === currentQ.correctIndex;
      const points = calculateAnswerScore({
        isCorrect,
        timeSpentSeconds: timeSpent,
        timeLimitSeconds: activeRoom.questionTimeLimitSeconds || 30,
        streak: myStreak,
        basePoints: currentQ.points || 10,
      });
      const updatedRoom = recordLocalAnswer(
        activeRoom,
        currentUserId,
        currentQ.id,
        optionIdx,
        timeSpent,
        points,
        isCorrect
      );
      upsertLocalRoom(updatedRoom);
      applyRoomData(updatedRoom);
      setLastAnswerOutcome({
        isCorrect,
        pointsEarned: points,
        explanationRu: currentQ.explanationRu,
        explanationAr: currentQ.explanationAr,
        explanationEn: currentQ.explanationEn,
      });
      if (isCorrect) {
        setMyStreak((s) => s + 1);
        playSoundEffect('correct', soundEnabled);
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
      } else {
        setMyStreak(0);
        playSoundEffect('wrong', soundEnabled);
      }
    };

    if (localModeRef.current) {
      evaluateLocally();
      return;
    }

    try {
      const resp = await fetch(`${arenaBase()}/api/arena/rooms/${encodeURIComponent(activeRoom.id)}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: currentUserId,
          participantName: currentUserName,
          participantAvatar: currentUserAvatar,
          questionId: currentQ.id,
          optionIndex: optionIdx,
          timeSpentSeconds: timeSpent,
        }),
      });

      const result = await readJsonSafe(resp);
      if (!result) {
        markLocalMode();
        evaluateLocally();
        return;
      }
      if (resp.ok) {
        setLastAnswerOutcome({
          isCorrect: result.isCorrect,
          pointsEarned: result.pointsEarned,
          explanationRu: result.explanationRu || currentQ.explanationRu,
          explanationAr: result.explanationAr || currentQ.explanationAr,
          explanationEn: currentQ.explanationEn,
        });
        setRankings(filterRankingsToReal(result.rankings || []));
        if (result.isCorrect) {
          setMyStreak((s) => s + 1);
          playSoundEffect('correct', soundEnabled);
          confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
        } else {
          setMyStreak(0);
          playSoundEffect('wrong', soundEnabled);
        }
      } else {
        evaluateLocally();
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
      evaluateLocally();
    }
  };

  // Next Question
  const handleNextQuestion = async () => {
    if (!activeRoom) return;
    // Offline: advance on this device.
    const advanceLocally = () => {
      const isLast =
        activeRoom.currentQuestionIndex >= activeRoom.questions.length - 1;
      if (isLast) {
        const finishedRoom: ArenaRoom = {
          ...activeRoom,
          status: 'finished',
          finishedAt: new Date().toISOString(),
        };
        upsertLocalRoom(finishedRoom);
        applyRoomData(finishedRoom);
        setViewMode('podium');
        confetti({ particleCount: 80, spread: 80 });
      } else {
        const nextRoom: ArenaRoom = {
          ...activeRoom,
          currentQuestionIndex: activeRoom.currentQuestionIndex + 1,
        };
        upsertLocalRoom(nextRoom);
        applyRoomData(nextRoom);
        setSelectedOption(null);
        setHasAnsweredCurrent(false);
        setLastAnswerOutcome(null);
        setTimeLeft(nextRoom.questionTimeLimitSeconds || 30);
        startTimeRef.current = Date.now();
      }
    };
    if (localModeRef.current) {
      advanceLocally();
      return;
    }
    try {
      const resp = await fetch(`${arenaBase()}/api/arena/rooms/${encodeURIComponent(activeRoom.id)}/next-question`, {
        method: 'POST',
      });
      const data = await readJsonSafe(resp);
      if (!data) {
        markLocalMode();
        advanceLocally();
        return;
      }
      if (resp.ok) {
        if (data.finished) {
          applyRoomData(data.room, data.rankings || []);
          setViewMode('podium');
          confetti({ particleCount: 80, spread: 80 });
        } else {
          applyRoomData(data.room, data.rankings || []);
          setSelectedOption(null);
          setHasAnsweredCurrent(false);
          setLastAnswerOutcome(null);
          setTimeLeft(data.room.questionTimeLimitSeconds || 30);
          startTimeRef.current = Date.now();
        }
      }
    } catch (err) {
      console.error('Failed to advance question:', err);
    }
  };

  // Finish Quiz
  const handleFinishQuiz = async () => {
    if (!activeRoom) return;
    if (localModeRef.current) {
      const finishedRoom: ArenaRoom = {
        ...activeRoom,
        status: 'finished',
        finishedAt: new Date().toISOString(),
      };
      upsertLocalRoom(finishedRoom);
      applyRoomData(finishedRoom);
      setViewMode('podium');
      confetti({ particleCount: 80, spread: 80 });
      return;
    }
    try {
      const resp = await fetch(`${arenaBase()}/api/arena/rooms/${encodeURIComponent(activeRoom.id)}/finish`, {
        method: 'POST',
      });
      const data = await readJsonSafe(resp);
      if (!data) {
        markLocalMode();
        const finishedRoom: ArenaRoom = {
          ...activeRoom,
          status: 'finished',
          finishedAt: new Date().toISOString(),
        };
        upsertLocalRoom(finishedRoom);
        applyRoomData(finishedRoom);
        setViewMode('podium');
        confetti({ particleCount: 80, spread: 80 });
        return;
      }
      if (resp.ok) {
        applyRoomData(data.room, data.rankings || []);
        setViewMode('podium');
        confetti({ particleCount: 80, spread: 80 });
      }
    } catch (err) {
      console.error('Failed to finish quiz:', err);
    }
  };

  const copyRoomCode = () => {
    if (!activeRoom) return;
    navigator.clipboard.writeText(activeRoom.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // ==========================================================================
  // RENDER: 1. LOBBY VIEW (Styled per Reference Image 1 using Image 2 & Image 3)
  // ==========================================================================
  if (viewMode === 'lobby') {
    // The MADI-101 practice room is always available via the button above,
    // but /api/arena/rooms only lists it after it has been created on the
    // server — so count it here too, or the header reads "(0)" while the
    // practice room sits right above it. Avoid double-counting once the
    // server list already includes it.
    const isMadi101Listed = rooms.some(
      (r) => r.code === 'MADI-101' || r.id === 'room-madi-101'
    );
    const availableRoomsCount = rooms.length + (isMadi101Listed ? 0 : 1);
    // The always-available MADI-101 practice room, rendered as a card in the
    // list itself so the count above always matches the cards shown.
    const practiceRoomCard = (
      <div
        data-testid="arena-room-card-room-madi-101"
        className="rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/70 border border-[#E2E8F0] dark:border-slate-700 p-3 flex flex-col justify-between gap-3 hover:border-[#0B3D91]/50 transition text-start"
      >
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 font-mono text-xs font-bold text-[#0B3D91] dark:text-sky-300 border border-slate-200 dark:border-slate-700">
              {L.codeLabel}: MADI-101
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
              {L.statusWaiting}
            </span>
          </div>
          <h3 className="text-base font-display font-extrabold text-[#0B2545] dark:text-white line-clamp-1">
            {L.practiceRoomBtn}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
            {L.practiceSoloNote}
          </p>
        </div>
        <div className="pt-2.5 border-t border-slate-200/80 dark:border-slate-700/60 flex items-center justify-end gap-2">
          <button
            type="button"
            data-testid="arena-enter-room-madi-101"
            onClick={() => handleJoinRoom('MADI-101')}
            className="px-4 py-1.5 rounded-xl bg-[#0B3D91] hover:bg-[#082E70] text-white text-xs font-display font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>{L.enterBtn}</span>
            {isRtl ? (
              <ArrowLeft className="w-3 h-3" />
            ) : (
              <ArrowRight className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>
    );
    return (
      <div className="max-w-xl mx-auto px-3 sm:px-4 pb-4 animate-fade-in" dir={dir}>
        {/* Delete notification toast */}
        {deleteNotice && (
          <div
            data-testid="arena-delete-notice"
            role="status"
            className="mb-3 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between gap-2 shadow-xs"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{deleteNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setDeleteNotice(null)}
              className="text-xs text-emerald-700 dark:text-emerald-300 hover:opacity-80 px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Top Scenic Road Hero Banner using Image 3 (/assets/aistudio/1793153092003_48d96bde.jpg) */}
        <div className="relative -mx-3 sm:-mx-4 h-[150px] sm:h-[170px] overflow-hidden select-none">
          {/* Cropped Image 3 so the full orange car, winding road, green hills & Moscow towers appear cleanly without the bottom grey/tan strips */}
          <img
            src={import.meta.env.BASE_URL + "assets/aistudio/1793153092003_48d96bde.jpg"}
            alt={L.heroAlt}
            className="w-full h-[170%] object-cover object-[center_28%] pointer-events-none"
          />

          {/* Soft sky & edge blending gradients so the illustration merges seamlessly into the page */}
          <div
            className="absolute inset-x-0 top-0 h-20 bg-linear-to-b from-[#F8FAFC] via-[#F8FAFC]/70 to-transparent dark:from-slate-950 dark:via-slate-950/70 pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute inset-y-0 left-0 w-8 bg-linear-to-r from-[#F8FAFC]/65 to-transparent dark:from-slate-950/60 pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-[#F8FAFC] to-transparent dark:from-slate-950 pointer-events-none"
            aria-hidden="true"
          />

          {/* Centered Header Title & Subtitle overlaid on the sky */}
          <div className="absolute inset-x-0 top-2.5 sm:top-3.5 z-10 text-center px-4 space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-display font-black text-[#0B2545] dark:text-white tracking-tight drop-shadow-[0_2px_10px_rgba(255,255,255,0.95)] dark:drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              {L.heroTitle}
            </h1>
            <p className="text-xs font-display font-bold text-[#2B4C7E] dark:text-slate-200 drop-shadow-[0_1px_8px_rgba(255,255,255,0.95)] dark:drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)]">
              {L.heroSubtitle}
            </p>
          </div>

          {/* Highway Road Sign "Moscou ->" positioned cleanly by the roadside */}
          <div
            dir="ltr"
            className="absolute left-3 sm:left-5 bottom-7 z-10 flex flex-col items-center pointer-events-none"
          >
            <div className="px-2.5 py-1 rounded-lg bg-[#0B3D91] border-2 border-white shadow-md text-white font-display font-extrabold text-xs flex items-center gap-1">
              <span>{L.roadSignCity}</span>
              <span className="text-xs leading-none">→</span>
            </div>
            <div className="w-1.5 h-4 bg-slate-600 border-x border-slate-400" />
          </div>
        </div>

        {/* Main Stacked Cards Container */}
        <div className="relative z-20 -mt-4 space-y-3">
          {/* CARD 1: Teacher Room Creation Card */}
          <div className="rounded-[28px] bg-white dark:bg-slate-900 border-2 border-[#FAD6A5] dark:border-orange-500/30 p-3.5 sm:p-4 shadow-[0_10px_30px_rgba(245,130,32,0.08)] space-y-3">
            {/* Top Content Row */}
            <div className="flex items-center justify-between gap-2.5">
              {/* Tilted Orange Clipboard Checklist Illustration */}
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center">
                <div
                  className="absolute inset-1 rounded-full bg-[#FFF3E6] dark:bg-orange-950/40"
                  aria-hidden="true"
                />
                <svg
                  viewBox="0 0 120 120"
                  className="w-14 h-14 sm:w-16 sm:h-16 relative z-10 drop-shadow-xs"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <g transform="rotate(7 60 60)">
                    {/* Clipboard board */}
                    <rect
                      x="26"
                      y="20"
                      width="68"
                      height="84"
                      rx="10"
                      fill="#FF8A1F"
                    />
                    {/* Inner paper */}
                    <rect
                      x="32"
                      y="28"
                      width="56"
                      height="70"
                      rx="6"
                      fill="#FFFFFF"
                    />
                    {/* Top clip */}
                    <path
                      d="M46 18C46 14.6863 48.6863 12 52 12H68C71.3137 12 74 14.6863 74 18V25H46V18Z"
                      fill="#F26700"
                    />
                    <circle cx="60" cy="17" r="3" fill="#FFF3E6" />
                    {/* Row 1 checkbox + lines */}
                    <rect x="38" y="38" width="11" height="11" rx="2.5" fill="#FF8A1F" />
                    <path
                      d="M40.5 43.5L43 46L46.8 41"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <rect x="54" y="40" width="26" height="3.5" rx="1.75" fill="#CBD5E1" />
                    <rect x="54" y="45.5" width="18" height="3" rx="1.5" fill="#E2E8F0" />

                    {/* Row 2 checkbox + lines */}
                    <rect x="38" y="56" width="11" height="11" rx="2.5" fill="#FF8A1F" />
                    <path
                      d="M40.5 61.5L43 64L46.8 59"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <rect x="54" y="58" width="26" height="3.5" rx="1.75" fill="#CBD5E1" />
                    <rect x="54" y="63.5" width="20" height="3" rx="1.5" fill="#E2E8F0" />

                    {/* Row 3 checkbox + lines */}
                    <rect x="38" y="74" width="11" height="11" rx="2.5" fill="#FF8A1F" />
                    <path
                      d="M40.5 79.5L43 82L46.8 77"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <rect x="54" y="76" width="24" height="3.5" rx="1.75" fill="#CBD5E1" />
                    <rect x="54" y="81.5" width="16" height="3" rx="1.5" fill="#E2E8F0" />
                  </g>
                </svg>
              </div>

              {/* Center Title & Subtitle */}
              <div className="flex-1 text-center sm:text-start space-y-1 min-w-0">
                <div className="flex items-center justify-center sm:justify-start">
                  <span className="inline-block px-3 py-0.5 rounded-full bg-[#FDE8CD] dark:bg-orange-950/80 text-[#C85A00] dark:text-orange-300 text-xs font-display font-extrabold">
                    {L.teacherBadge}
                  </span>
                </div>
                <h2 className="text-base sm:text-xl font-display font-black text-[#0B2545] dark:text-white leading-tight">
                  {L.teacherTitle}
                </h2>
                <p className="text-xs font-medium text-[#475569] dark:text-slate-400">
                  {L.teacherDesc}
                </p>
              </div>

              {/* Graduation Cap Icon Badge */}
              <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-[#FFF3E6] dark:bg-orange-950/50 flex items-center justify-center text-[#F58220] shrink-0 self-start">
                <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 stroke-[2.2]" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                data-testid="arena-create-room-btn"
                onClick={() => handleCreateRoom(L.defaultCreatedRoomTitle)}
                className="w-full py-2.5 px-5 rounded-2xl bg-linear-to-r from-[#F58220] via-[#FF8C24] to-[#F58220] hover:brightness-105 text-white font-display font-extrabold text-sm sm:text-base shadow-[0_6px_18px_rgba(245,130,32,0.35)] flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Plus className="w-5 h-5 stroke-[2.8]" />
                <span>{L.createRoomBtn}</span>
              </button>

              <button
                type="button"
                onClick={() => handleJoinRoom('MADI-101')}
                className="w-full py-2.5 px-4 rounded-2xl bg-[#F1F5F9] hover:bg-[#E2E8F0] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#1E293B] dark:text-slate-200 font-display font-extrabold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Flame className="w-4 h-4 text-[#F58220] shrink-0" />
                <span>{L.practiceRoomBtn}</span>
              </button>
            </div>
          </div>

          {/* CARD 2: Student Join Room Card using Image 2 */}
          <div className="rounded-[28px] bg-white dark:bg-slate-900 border-2 border-[#CBD5E1]/80 dark:border-slate-800 p-3.5 sm:p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] space-y-3">
            <div className="flex items-center justify-between gap-3">
              {/* Image 2 (/assets/aistudio/1793153163292_a75dd14c.jpg) framed on a soft sky-blue backdrop */}
              <div className="relative w-20 h-24 sm:w-24 sm:h-28 shrink-0 flex items-center justify-center">
                <div
                  className="absolute inset-x-0 bottom-1 top-3 rounded-[32px] bg-[#EAF2FF] dark:bg-slate-800/90"
                  aria-hidden="true"
                />
                <img
                  src={import.meta.env.BASE_URL + "assets/aistudio/1793153163292_a75dd14c.jpg"}
                  alt={L.studentsImgAlt}
                  className="relative z-10 w-full h-full object-contain object-top mix-blend-multiply dark:mix-blend-normal select-none pointer-events-none"
                />
              </div>

              {/* Content Column */}
              <div className="flex-1 space-y-2.5 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-block px-3 py-0.5 rounded-full bg-[#E0ECFF] dark:bg-blue-950/80 text-[#0B3D91] dark:text-sky-300 text-xs font-display font-extrabold">
                    {L.studentBadge}
                  </span>

                  <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-[#EAF2FF] dark:bg-blue-950/50 flex items-center justify-center text-[#0B3D91] dark:text-sky-400 shrink-0">
                    <Users className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
                  </div>
                </div>

                <div className="text-center sm:text-start space-y-1">
                  <h2 className="text-base sm:text-xl font-display font-black text-[#0B2545] dark:text-white leading-tight">
                    {L.studentTitle}
                  </h2>
                  <p className="text-xs font-medium text-[#475569] dark:text-slate-400">
                    {L.studentDesc}
                  </p>
                </div>

                {/* Room Code Input Box with Ticket Icon */}
                <div className="relative flex items-center">
                  <input
                    type="text"
                    dir="ltr"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleJoinRoom(roomCodeInput);
                    }}
                    placeholder="MADI-101"
                    maxLength={10}
                    className="w-full pl-3.5 pr-10 py-2.5 sm:py-3 rounded-2xl border-2 border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-left font-bold text-[#334155] dark:text-white uppercase tracking-wider focus:outline-hidden focus:border-[#0B3D91] text-sm sm:text-base"
                  />
                  <Ticket className="w-5 h-5 text-[#64748B] absolute right-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {joinError && (
              <div className="text-xs text-rose-500 font-bold flex items-center gap-1.5 px-1">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{joinError}</span>
              </div>
            )}

            {/* Deep Royal Blue Join Button */}
            <button
              type="button"
              data-testid="arena-join-code-btn"
              onClick={() => handleJoinRoom(roomCodeInput)}
              className="w-full py-2.5 px-5 rounded-2xl bg-[#0B3D91] hover:bg-[#082E70] text-white font-display font-extrabold text-sm sm:text-base shadow-[0_6px_18px_rgba(11,61,145,0.28)] flex items-center justify-center transition cursor-pointer"
            >
              {L.joinRoomBtn}
            </button>
          </div>

          {/* CARD 3: Available Rooms Section */}
          <div className="rounded-[28px] bg-white dark:bg-slate-900 border-2 border-[#E2E8F0] dark:border-slate-800 p-3.5 sm:p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-display font-black text-[#0B2545] dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-[#F58220] shrink-0" />
                <span>
                  {L.availableRoomsTitle} ({availableRoomsCount})
                </span>
              </h2>

              <button
                type="button"
                onClick={fetchRooms}
                className="px-3.5 py-1.5 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#0B3D91] dark:text-sky-400 text-xs sm:text-sm font-display font-extrabold flex items-center gap-1.5 transition cursor-pointer shrink-0"
              >
                <span>{L.refreshBtn}</span>
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {isLocalArena && (
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                {lang === 'ar'
                  ? 'وضع دون اتصال: الغرف والنتائج محفوظة على هذا الجهاز فقط.'
                  : lang === 'ru'
                    ? 'Офлайн-режим: комнаты и результаты хранятся только на этом устройстве.'
                    : 'Offline mode: rooms and results are saved on this device only.'}
              </p>
            )}

            {isLoadingRooms ? (
              <div className="py-10 text-center text-slate-400 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0B3D91]" />
                <p className="text-xs font-bold">{L.loadingRooms}</p>
              </div>
            ) : rooms.length === 0 ? (
              <div className="grid grid-cols-1 gap-3.5">{practiceRoomCard}</div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {!isMadi101Listed && practiceRoomCard}
                {rooms.map((room) => {
                  const isWaiting = room.status === 'waiting' || room.status === 'setup';
                  const isActive = room.status === 'active';
                  return (
                    <div
                      key={room.id}
                      data-testid={`arena-room-card-${room.id}`}
                      className="rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/70 border border-[#E2E8F0] dark:border-slate-700 p-3 flex flex-col justify-between gap-3 hover:border-[#0B3D91]/50 transition text-start"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 font-mono text-xs font-bold text-[#0B3D91] dark:text-sky-300 border border-slate-200 dark:border-slate-700">
                            {L.codeLabel}: {room.code}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isActive
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 animate-pulse'
                                : isWaiting
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
                            }`}
                          >
                            {isActive
                              ? L.statusLive
                              : isWaiting
                              ? L.statusWaiting
                              : L.statusFinished}
                          </span>
                        </div>

                        <h3 className="text-base font-display font-extrabold text-[#0B2545] dark:text-white line-clamp-1">
                          {room.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {room.description || room.exerciseTopic}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          {/* The list payload's participantsCount for MADI-101
                              includes the server's simulated classmates, so
                              never show that number — it is a solo practice
                              room, not a live room with students. */}
                          {room.code === 'MADI-101' || room.id === 'room-madi-101' ? (
                            <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                              <Flame className="w-3.5 h-3.5" />
                              <span>{L.soloPracticeBadge}</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 font-medium">
                              <Users className="w-3.5 h-3.5" />
                              <span>
                                {room.participantsCount} {L.studentsCountUnit}
                              </span>
                            </span>
                          )}
                          <span className="flex items-center gap-1 font-medium">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>
                              {room.questionsCount} {L.questionsCountUnit}
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            data-testid={`arena-delete-${room.id}`}
                            onClick={(e) => handleDeleteRoom(room.id, room.title, e)}
                            title={L.deleteRoomTooltip}
                            aria-label={`${L.deleteRoomTooltip} ${room.title}`}
                            className="p-2 rounded-xl bg-white hover:bg-rose-100 text-slate-500 hover:text-rose-600 dark:bg-slate-900 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            data-testid={`arena-enter-${room.id}`}
                            onClick={() => handleJoinRoom(room.id)}
                            className="px-4 py-1.5 rounded-xl bg-[#0B3D91] hover:bg-[#082E70] text-white text-xs font-display font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                          >
                            <span>{L.enterBtn}</span>
                            {isRtl ? (
                              <ArrowLeft className="w-3 h-3" />
                            ) : (
                              <ArrowRight className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    );
  }

  // ==========================================================================
  // RENDER: 2. ROOM CREATION & AI PAGE EXTRACTION STUDIO (redesigned 2026-11-13)
  // ==========================================================================
  if (viewMode === 'create') {
    const questions = activeRoom?.questions ?? [];
    const hasQuestions = questions.length > 0;
    return (
      <div
        className="max-w-md mx-auto px-3 pt-2 h-[calc(100dvh-9.5rem)] flex flex-col animate-fade-in"
        dir={dir}
      >
        {/* Top bar: back + title + room-code chip (copy on tap) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCancelCreationStudio}
            aria-label={L.backToList}
            className="w-9 h-9 rounded-xl bg-white/90 dark:bg-slate-900/90 shadow-sm flex items-center justify-center text-brand-blue dark:text-white cursor-pointer"
          >
            {isRtl ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
          <div className="flex-1 text-lg font-display font-extrabold text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
            {L.newChallengeTitle}
          </div>
          {activeRoom?.code && (
            <button
              type="button"
              onClick={copyRoomCode}
              title={L.copyRoomCodeTitle}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/95 dark:bg-slate-900/95 shadow-sm font-mono text-[13px] font-extrabold text-brand-blue dark:text-sky-300 cursor-pointer"
            >
              {copiedCode ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedCode ? L.copiedCodeLabel : activeRoom.code}</span>
            </button>
          )}
        </div>

        {/* Big page-photo drop zone (tap to pick; thumbnail + × to remove) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => imageInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') imageInputRef.current?.click();
          }}
          className={`relative mt-3 h-44 shrink-0 rounded-3xl border-2 ${
            customImageBase64 ? 'border-white/90 border-solid' : 'border-dashed border-white/80'
          } bg-white/90 dark:bg-slate-900/90 shadow-lg flex flex-col items-center justify-center gap-1.5 cursor-pointer overflow-hidden text-center`}
        >
          {customImageBase64 ? (
            <img
              src={customImageBase64}
              alt={customImageName || ''}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <>
              <Upload className="w-9 h-9 text-brand-blue" />
              <div className="text-base font-display font-extrabold text-brand-blue">
                {L.pagePhotoLabel}
              </div>
              <div className="text-xs font-semibold text-slate-500">{L.pagePhotoHint}</div>
            </>
          )}
          {customImageBase64 && (
            <button
              type="button"
              data-testid="arena-remove-image-btn"
              aria-label={L.removeImageBtn}
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveImage();
              }}
              className="absolute top-2 start-2 z-10 w-8 h-8 rounded-full bg-slate-900/70 text-white text-sm font-bold flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
          )}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageFileChange}
            className="hidden"
          />
        </div>

        {/* Paste-text toggle (field hidden until tapped) */}
        <div className="mt-2.5 shrink-0 text-center">
          <button
            type="button"
            onClick={() => setShowPasteText((v) => !v)}
            className="px-4 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 shadow-sm text-[13px] font-bold text-brand-blue dark:text-sky-300 cursor-pointer"
          >
            {showPasteText ? L.hideTextToggle : L.pasteTextToggle}
          </button>
        </div>
        {showPasteText && (
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            rows={3}
            placeholder={L.pasteTextPlaceholder}
            className="mt-2 shrink-0 w-full h-16 p-3 rounded-2xl border border-white/70 bg-white/95 dark:bg-slate-900/95 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-accent-orange resize-none"
          />
        )}

        {/* ONE extract button with white AI pill */}
        <button
          type="button"
          data-testid="arena-extract-btn"
          disabled={isExtracting}
          onClick={handleExtractExercises}
          className="mt-3 w-full h-[52px] shrink-0 rounded-2xl bg-linear-to-r from-orange-500 to-orange-600 text-white font-display font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-orange-500/40 hover:brightness-105 transition cursor-pointer disabled:opacity-70"
        >
          {isExtracting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{L.extractingBtn}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>{L.extractQuestionsBtn}</span>
              <span className="bg-white text-[#ea580c] text-xs font-extrabold rounded-full px-2.5 py-0.5">
                AI
              </span>
            </>
          )}
        </button>

        {isExtracting && (
          <p className="mt-1.5 shrink-0 text-center text-[11px] font-bold text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]">
            {lang === 'ar'
              ? 'جارٍ إرسال الصورة واستخراج الأسئلة… قد يستغرق ذلك حتى دقيقة، لا تغلق الصفحة.'
              : lang === 'ru'
                ? 'Отправка фото и извлечение вопросов… Это может занять до минуты, не закрывайте страницу.'
                : 'Sending the photo and extracting questions… This may take up to a minute, please don’t close the page.'}
          </p>
        )}

        {extractError && (
          <div className="mt-2 shrink-0 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-200 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{extractError}</span>
          </div>
        )}

        {/* AI extraction runs through the shared proxy — the user is never
            asked for a key (see src/lib/geminiClient.ts). No key UI here. */}

        {/* Questions list — the ONLY scrolling part of the screen */}
        <div className="mt-3 flex-1 min-h-0 rounded-3xl bg-white/95 dark:bg-slate-900/95 shadow-lg p-3 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 shrink-0 pb-2">
            <h2 className="text-[15px] font-display font-extrabold text-slate-900 dark:text-white">
              {L.questionsTitle}
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-brand-blue text-white text-xs font-extrabold">
              {questions.length}
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pe-0.5">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="flex items-center gap-2.5 bg-slate-100 dark:bg-slate-800/70 rounded-2xl px-3 py-2.5"
              >
                <span className="w-7 h-7 shrink-0 rounded-full bg-accent-orange text-white text-[13px] font-extrabold flex items-center justify-center">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0 text-start">
                  <div
                    dir="ltr"
                    className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate text-right"
                  >
                    {q.promptRu}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                    {getArenaQuestionInstruction(q, lang)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteQuestion(q.id)}
                  title={L.deleteQuestionTitle}
                  disabled={questions.length <= 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {!hasQuestions && !showAddQuestionForm && (
              <div className="min-h-[110px] h-full flex flex-col items-center justify-center gap-1.5 border-[1.5px] border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-slate-400">
                <FileText className="w-7 h-7" />
                <p className="text-[13px] font-bold">{L.questionsEmptyText}</p>
              </div>
            )}

            {/* Manual-add form (compact card, same shared state + handler
                as the room view's form — question + 4 options + green-dot
                correct marker; instruction/explanation keep their defaults). */}
            {showAddQuestionForm && (
              <div className="rounded-2xl bg-white dark:bg-slate-900 border-[1.5px] border-orange-200 dark:border-orange-900/60 p-3 space-y-2 text-start">
                <div className="text-xs font-extrabold text-brand-blue dark:text-accent-orange">
                  {L.newQuestionTitle}
                </div>
                <input
                  type="text"
                  dir="ltr"
                  value={manualPromptRu}
                  onChange={(e) => setManualPromptRu(e.target.value)}
                  placeholder={L.manualPromptPlaceholder}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-blue"
                />
                <div className="space-y-1.5">
                  {manualOptions.map((optVal, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    >
                      <button
                        type="button"
                        aria-label={L.markAsCorrectTitle}
                        onClick={() => setManualCorrectIndex(idx)}
                        className={`w-5 h-5 shrink-0 rounded-full border-2 cursor-pointer ${
                          manualCorrectIndex === idx
                            ? 'bg-emerald-500 border-emerald-500 shadow-[inset_0_0_0_3px_white]'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                        }`}
                      />
                      <input
                        type="text"
                        dir="ltr"
                        value={optVal}
                        onChange={(e) => {
                          const next = [...manualOptions];
                          next[idx] = e.target.value;
                          setManualOptions(next);
                        }}
                        placeholder={L.optionPlaceholder(idx + 1, manualCorrectIndex === idx)}
                        className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
                <div className="text-[11px] font-semibold text-slate-500">
                  {L.correctAnswerHint}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddManualQuestion}
                    disabled={!manualPromptRu.trim()}
                    className="flex-1 py-2 rounded-xl bg-brand-blue text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {L.saveQuestionBtn}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddQuestionForm(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={!activeRoom}
            onClick={() => setShowAddQuestionForm((v) => !v)}
            className="mt-2 w-full h-[42px] shrink-0 rounded-2xl border-[1.5px] border-dashed border-slate-300 dark:border-slate-600 text-brand-blue dark:text-sky-300 text-sm font-extrabold cursor-pointer disabled:opacity-50"
          >
            {L.addQuestionBtn}
          </button>
        </div>

        {/* Bottom bar: start challenge + ⋯ sheet trigger */}
        <div className="mt-3 shrink-0 flex gap-2.5">
          <button
            type="button"
            data-testid="arena-start-btn"
            disabled={!hasQuestions}
            onClick={handleStartQuiz}
            className="flex-1 h-[54px] rounded-2xl bg-brand-blue text-white font-display font-extrabold text-base shadow-lg shadow-[#0B3D91]/40 cursor-pointer disabled:opacity-45"
          >
            {L.startChallengeBtn}
          </button>
          <button
            type="button"
            onClick={() => setShowMoreSheet(true)}
            aria-label={L.moreOptionsTitle}
            className="w-[54px] h-[54px] shrink-0 rounded-2xl bg-white/95 dark:bg-slate-900/95 shadow-md text-brand-blue dark:text-sky-300 text-2xl font-extrabold cursor-pointer"
          >
            ⋯
          </button>
        </div>

        {/* ⋯ sheet: time per question + delete room */}
        {showMoreSheet && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/45 flex items-end justify-center"
            onClick={() => setShowMoreSheet(false)}
          >
            <div
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[26px] p-4 pb-6 space-y-3 animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-[15px] font-display font-extrabold text-slate-900 dark:text-white text-start">
                {L.moreOptionsTitle}
              </h3>
              <div className="text-xs font-bold text-slate-500 text-start">
                {L.timePerQuestionLabel}
              </div>
              <div className="flex gap-2">
                {[15, 30, 45].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => handleChangeTimeLimit(sec)}
                    className={`flex-1 h-[42px] rounded-xl border-[1.5px] text-sm font-extrabold cursor-pointer ${
                      newTimeLimit === sec
                        ? 'bg-brand-blue border-brand-blue text-white'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {L.secondsShort(sec)}
                  </button>
                ))}
              </div>
              {activeRoom && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreSheet(false);
                    handleDeleteRoom(activeRoom.id, activeRoom.title);
                  }}
                  className="w-full h-[46px] rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 text-sm font-extrabold cursor-pointer"
                >
                  {L.deleteRoomBtn}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================================================
  // RENDER: 3. ROOM WAITING LOBBY (Questions extracted, students gathering)
  // ==========================================================================
  if (viewMode === 'room' && activeRoom) {
    const studentParticipants = Object.values(activeRoom.participants).filter(
      (p) => p.role === 'student' || p.totalAnswered > 0
    );

    return (
      <div className="max-w-4xl mx-auto px-4 pt-3 pb-4 space-y-3 animate-fade-in" dir={dir}>
        {/* Top bar with back and delete buttons */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              fetchRooms();
              setViewMode('lobby');
            }}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-200 cursor-pointer"
          >
            {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{L.backToArena}</span>
          </button>

          <button
            type="button"
            data-testid="arena-room-header-delete-btn"
            onClick={(e) => handleDeleteRoom(activeRoom.id, activeRoom.title, e)}
            className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition border border-rose-200 dark:border-rose-800 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>{L.deleteRoomBtn}</span>
          </button>
        </div>

        {/* Room Header Banner */}
        <div className="rounded-3xl bg-linear-to-r from-brand-navy to-brand-blue p-4 text-white space-y-3 shadow-xl border border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1 text-start">
              <span className="text-xs text-accent-orange font-bold uppercase tracking-wider">
                {L.liveQuizRoomBadge}
              </span>
              <h1 className="text-xl sm:text-2xl font-display font-extrabold text-white">
                {activeRoom.title}
              </h1>
              <p className="text-xs text-slate-300">
                {L.topicPrefix}: {activeRoom.exerciseTopic} • {L.teacherPrefix}:{' '}
                {activeRoom.teacherName}
              </p>
            </div>

            {/* Room Code Badge with Copy */}
            <button
              type="button"
              onClick={copyRoomCode}
              title={L.copyRoomCodeTitle}
              className="px-4 py-2 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 flex items-center gap-2 text-white font-mono font-extrabold text-base transition cursor-pointer"
            >
              <span>
                {L.codeLabel}: {activeRoom.code}
              </span>
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-slate-300">
              <span className="flex items-center gap-1.5 font-bold">
                <Users className="w-4 h-4 text-accent-orange" />
                <span>
                  {studentParticipants.length} {L.connectedStudentsUnit}
                </span>
              </span>
              <span className="flex items-center gap-1.5 font-bold">
                <BookOpen className="w-4 h-4 text-accent-orange" />
                <span>
                  {activeRoom.questions.length} {L.extractedQuestionsUnit}
                </span>
              </span>
              <span className="flex items-center gap-1.5 font-bold">
                <Clock className="w-4 h-4 text-accent-orange" />
                <span>
                  {activeRoom.questionTimeLimitSeconds} {L.secPerQuestionUnit}
                </span>
              </span>
            </div>

            {activeRoom.questions.length > 0 ? (
              <button
                type="button"
                data-testid="arena-start-btn"
                onClick={handleStartQuiz}
                className="px-5 py-2 rounded-xl bg-accent-orange hover:brightness-110 text-brand-navy font-display font-extrabold text-sm flex items-center gap-2 shadow-md transition cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>{L.startQuizForAllBtn}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setViewMode('create')}
                className="px-5 py-2 rounded-xl bg-accent-orange hover:brightness-110 text-brand-navy font-display font-extrabold text-sm flex items-center gap-2 shadow-md transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{L.prepareQuestionsBtn}</span>
              </button>
            )}
          </div>
        </div>

        {/* Questions Preview / Teacher Controls (Answers hidden by default to prevent spoiling!) */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-display font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-blue dark:text-accent-orange" />
              <span>
                {L.readyQuestionsTitle} ({activeRoom.questions.length})
              </span>
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              {isRoomOwner && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowTeacherAnswersPreview((prev) => !prev)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer transition"
                  >
                    {showTeacherAnswersPreview ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-amber-500" />
                        <span>{L.hideCorrectAnswersBtn}</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-brand-blue" />
                        <span>{L.reviewAnswersTeacherBtn}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAddQuestionForm((prev) => !prev)}
                    className="px-3 py-1.5 rounded-xl bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue dark:text-accent-orange text-xs font-bold cursor-pointer transition"
                  >
                    {L.addManualQuestionBtn}
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('create')}
                    className="text-xs font-bold text-brand-blue hover:underline cursor-pointer px-2"
                  >
                    {L.reExtractAiBtn}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Manual Question Builder Form */}
          {showAddQuestionForm && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-brand-blue/30 space-y-3 text-start">
              <div className="text-xs font-extrabold text-brand-blue dark:text-accent-orange">
                {L.addManualFormTitle}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  dir="ltr"
                  value={manualPromptRu}
                  onChange={(e) => setManualPromptRu(e.target.value)}
                  placeholder={L.manualPromptPlaceholder}
                  className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                />
                <input
                  type="text"
                  value={manualInstructionAr}
                  onChange={(e) => setManualInstructionAr(e.target.value)}
                  placeholder={L.manualInstructionPlaceholder}
                  className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {manualOptions.map((optVal, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="manualCorrectIdx"
                      checked={manualCorrectIndex === idx}
                      onChange={() => setManualCorrectIndex(idx)}
                      title={L.markAsCorrectTitle}
                    />
                    <input
                      type="text"
                      dir="ltr"
                      value={optVal}
                      onChange={(e) => {
                        const next = [...manualOptions];
                        next[idx] = e.target.value;
                        setManualOptions(next);
                      }}
                      placeholder={L.optionPlaceholder(idx + 1, manualCorrectIndex === idx)}
                      className="flex-1 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={manualExplanationAr}
                  onChange={(e) => setManualExplanationAr(e.target.value)}
                  placeholder={L.manualExplanationPlaceholder}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddManualQuestion}
                  className="px-4 py-1.5 rounded-xl bg-brand-blue text-white text-xs font-bold cursor-pointer"
                >
                  {L.saveQuestionBtn}
                </button>
              </div>
            </div>
          )}

          {!showTeacherAnswersPreview && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-2 text-start">
              <span>{L.answersHiddenNotice}</span>
            </div>
          )}

          <div className="space-y-3">
            {activeRoom.questions.map((q, idx) => {
              const qExplanation = getArenaQuestionExplanation(q, lang);
              return (
                <div
                  key={q.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2 text-start"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>{L.questionLabel(idx + 1)}</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-brand-blue/10 text-brand-blue dark:text-accent-orange">
                        {getArenaQuestionInstruction(q, lang)}
                      </span>
                      {isRoomOwner && activeRoom.questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          title={L.deleteQuestionTitle}
                          className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-base font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span dir="ltr">{q.promptRu}</span>
                    <button
                      type="button"
                      onClick={() => speakRussian(q.promptRu, undefined, soundEnabled)}
                      className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-brand-blue cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {q.options.map((opt, oIdx) => {
                      const revealCorrect = showTeacherAnswersPreview && oIdx === q.correctIndex;
                      return (
                        <div
                          key={`${q.id}-preview-opt-${oIdx}`}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center justify-between ${
                            revealCorrect
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <span dir="ltr">{opt}</span>
                          {revealCorrect && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {showTeacherAnswersPreview && qExplanation && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700/50">
                      💡 <span className="font-semibold">{qExplanation}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Connected Students Roster */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-display font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              <span>
                {L.connectedStudentsRosterTitle} ({studentParticipants.length})
              </span>
            </h3>
            <span className="text-xs text-slate-400">{L.waitingToStartText}</span>
          </div>

          {/* MADI-101 is a SOLO practice room: no other real students are
              connected here and no simulated classmates are shown — practise
              the questions on your own. */}
          {activeRoom.id === 'room-madi-101' && (
            <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-3">
              {L.practiceSoloNote}
            </p>
          )}

          {/* Honest empty state: only real joined users are ever listed. When
              nobody else has joined yet, say so and invite sharing the code
              instead of showing fake players. */}
          {studentParticipants.filter((p) => p.id !== currentUserId).length === 0 ? (
            <div
              data-testid="arena-empty-room-state"
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2"
            >
              <div className="flex items-center justify-center gap-2 text-sm font-display font-extrabold text-slate-900 dark:text-white">
                <Users className="w-4 h-4 text-brand-blue" />
                <span>{L.onlyYouTitle}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {L.onlyYouDesc}
              </p>
              <button
                type="button"
                onClick={copyRoomCode}
                className="px-4 py-2 rounded-xl bg-[#0B3D91] hover:bg-[#082E70] text-white text-xs font-display font-bold inline-flex items-center gap-2 transition cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>
                  {L.codeLabel}: {activeRoom.code}
                </span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {studentParticipants.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2.5"
                >
                  <div className="w-9 h-9 rounded-full bg-brand-blue/10 text-brand-blue dark:text-accent-orange font-bold flex items-center justify-center shrink-0">
                    {p.name.slice(0, 2)}
                  </div>
                  <div className="space-y-0.5 text-start overflow-hidden">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {p.name}
                    </div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      <span>{L.onlineStatus}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: 4. ACTIVE LIVE QUIZ (Real-time student testing screen)
  // ==========================================================================
  if (viewMode === 'active_quiz' && activeRoom) {
    const currentQuestion = activeRoom.questions[activeRoom.currentQuestionIndex];
    const totalQ = Math.max(1, activeRoom.questions.length);
    const isLastQuestion = activeRoom.currentQuestionIndex + 1 >= totalQ;
    const progressPct = Math.round(((activeRoom.currentQuestionIndex + 1) / totalQ) * 100);
    const currentHint = currentQuestion ? getArenaQuestionHint(currentQuestion, lang) : undefined;

    return (
      <div className="max-w-4xl mx-auto px-4 pt-3 pb-4 space-y-3 animate-fade-in" dir={dir}>
        {/* Progress & Live Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              {L.questionProgress(activeRoom.currentQuestionIndex + 1, totalQ)}
            </div>
            {myStreak >= 2 && (
              <span className="px-2 py-0.5 rounded-full bg-accent-orange/20 text-accent-orange text-xs font-extrabold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" />
                <span>{L.streakBadge(myStreak)}</span>
              </span>
            )}
          </div>

          {/* Timer Clock */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-extrabold ${
              timeLeft <= 5
                ? 'bg-rose-500/20 text-rose-500 animate-pulse'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{L.secondsLeft(timeLeft)}</span>
          </div>

          {/* Navigation / Finish controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="arena-next-btn"
              onClick={handleNextQuestion}
              className="px-3.5 py-1.5 rounded-xl bg-brand-blue hover:bg-brand-navy text-white text-xs font-display font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <span>{isLastQuestion ? L.showFinalResultsBtn : L.nextQuestionBtn}</span>
              {isRtl ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
            </button>
            <button
              type="button"
              data-testid="arena-finish-btn"
              onClick={handleFinishQuiz}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/20 text-xs font-bold text-rose-600 dark:text-rose-400 cursor-pointer"
            >
              {L.finishBtn}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-brand-blue to-accent-orange transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Question Card */}
        {currentQuestion && (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-md space-y-3 text-center">
            {/* Instruction pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue dark:text-accent-orange text-xs font-bold">
              <span>{getArenaQuestionInstruction(currentQuestion, lang)}</span>
            </div>

            {/* Russian prompt with audio button */}
            <div className="space-y-2">
              <div
                dir="ltr"
                className="text-xl sm:text-2xl font-display font-extrabold text-slate-900 dark:text-white leading-relaxed"
              >
                {currentQuestion.promptRu}
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => speakRussian(currentQuestion.promptRu, undefined, soundEnabled)}
                  className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-brand-blue hover:text-white text-xs font-bold text-slate-600 dark:text-slate-300 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>{L.listenRussianPronunciation}</span>
                </button>
              </div>
            </div>

            {/* Hint if provided */}
            {currentHint && (
              <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl max-w-lg mx-auto">
                💡 {L.hintPrefix}: {currentHint}
              </div>
            )}

            {/* 4 Interactive Choice Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 max-w-2xl mx-auto">
              {currentQuestion.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const showResults = hasAnsweredCurrent;
                const isCorrect = idx === currentQuestion.correctIndex;

                let btnStyle =
                  'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:border-brand-blue hover:bg-brand-blue/5';

                if (showResults) {
                  if (isCorrect) {
                    btnStyle = 'bg-emerald-500 text-white border-emerald-600 shadow-md scale-102';
                  } else if (isSelected && !isCorrect) {
                    btnStyle = 'bg-rose-500 text-white border-rose-600';
                  } else {
                    btnStyle = 'opacity-40 border-slate-200 dark:border-slate-800';
                  }
                }

                return (
                  <button
                    key={`${currentQuestion.id}-opt-${idx}`}
                    type="button"
                    data-testid={`arena-option-${idx}`}
                    disabled={hasAnsweredCurrent}
                    onClick={() => handleSelectOption(idx)}
                    className={`min-h-[48px] p-3 rounded-2xl border-2 text-sm font-display font-extrabold flex items-center justify-between transition cursor-pointer ${btnStyle}`}
                  >
                    <span dir="ltr">{opt}</span>
                    {showResults && isCorrect && <CheckCircle2 className="w-5 h-5 shrink-0" />}
                    {showResults && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Post-Answer Feedback banner + Prominent Next Question Button */}
            {hasAnsweredCurrent && lastAnswerOutcome && (
              <div
                className={`p-3 rounded-2xl text-start space-y-2 animate-fade-in ${
                  lastAnswerOutcome.isCorrect
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>
                    {lastAnswerOutcome.isCorrect
                      ? L.feedbackCorrect
                      : selectedOption === null
                      ? L.feedbackTimeout
                      : L.feedbackWrong}
                  </span>
                  <span className="font-extrabold">
                    {L.pointsEarnedLabel(lastAnswerOutcome.pointsEarned)}
                  </span>
                </div>
                <p className="text-xs leading-relaxed opacity-90">
                  {getArenaQuestionExplanation(lastAnswerOutcome, lang)}
                </p>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={isLastQuestion ? handleFinishQuiz : handleNextQuestion}
                    className="px-5 py-2 rounded-xl bg-brand-blue hover:bg-brand-navy text-white text-xs font-display font-extrabold flex items-center gap-2 shadow-sm transition cursor-pointer"
                  >
                    <span>
                      {isLastQuestion ? L.finishAndShowPodiumBtn : L.goToNextQuestionBtn}
                    </span>
                    {isRtl ? (
                      <ArrowLeft className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live Mini Leaderboard during game */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-display font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-accent-orange" />
              <span>{L.liveLeaderboardTitle}</span>
            </div>
            <span className="text-[11px] text-slate-400">{L.instantUpdatePerQuestion}</span>
          </div>

          <div className="space-y-2">
            {rankings.slice(0, 3).map((st) => {
              // Accuracy over ANSWERED questions only. The server-sent
              // st.accuracyPct divides by the total question count, so it
              // misleadingly reads 33% after 1 correct answer out of 1.
              const answeredAccuracy =
                st.totalAnswered > 0
                  ? Math.round((st.correctCount / st.totalAnswered) * 100)
                  : 0;
              return (
              <div
                key={st.id}
                className={`p-2.5 rounded-2xl flex items-center justify-between gap-3 text-xs ${
                  st.id === currentUserId
                    ? 'bg-brand-blue/10 border border-brand-blue/30 font-bold'
                    : 'bg-slate-50 dark:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 text-center font-bold text-slate-500">#{st.rank}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{st.name}</span>
                  {st.id === currentUserId && (
                    <span className="px-1.5 py-0.5 rounded-md bg-brand-blue text-white text-[10px] font-extrabold">
                      {L.youBadge}
                    </span>
                  )}
                  {st.tier === 'gold' && <Crown className="w-3.5 h-3.5 text-accent-orange shrink-0" />}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">
                    {answeredAccuracy}% {L.accuracyUnit}
                  </span>
                  <span className="font-mono font-extrabold text-brand-blue dark:text-accent-orange">
                    {st.score} {L.pointsUnit}
                  </span>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: 5. FINAL STANDINGS & TEACHER ANALYTICS (Podium & Ranking View)
  // ==========================================================================
  if (viewMode === 'podium' && activeRoom) {
    const top1 = rankings[0];
    const top2 = rankings[1];
    const top3 = rankings[2];

    return (
      <div className="max-w-4xl mx-auto px-4 pt-3 pb-4 space-y-3 animate-fade-in" dir={dir}>
        {/* Celebration Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-orange/15 text-accent-orange text-xs font-extrabold">
            <Trophy className="w-4 h-4" />
            <span>{L.competitionCompletedBadge}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white">
            {L.podiumTitle}
          </h1>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {activeRoom.title} — {L.podiumSubtitle}
          </p>
        </div>

        {/* Podium Top 3 */}
        <div className="grid grid-cols-3 gap-3 items-end pt-6 pb-2 max-w-xl mx-auto">
          {/* #2 Silver */}
          <div className="flex flex-col items-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 font-extrabold text-base flex items-center justify-center shadow-md">
              🥈
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[90px]">
              {top2?.name || '—'}
            </div>
            <div className="text-[11px] font-mono font-bold text-slate-500">
              {top2?.score ?? 0} {L.pointsUnit}
            </div>
            <div className="w-full h-16 rounded-t-2xl bg-linear-to-t from-slate-300 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
              2
            </div>
          </div>

          {/* #1 Gold */}
          <div className="flex flex-col items-center space-y-2">
            <Crown className="w-7 h-7 text-accent-orange animate-bounce" />
            <div className="w-16 h-16 rounded-full bg-accent-orange/20 border-2 border-accent-orange font-extrabold text-2xl flex items-center justify-center shadow-lg">
              🥇
            </div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-[110px]">
              {top1?.name || '—'}
            </div>
            <div className="text-xs font-mono font-extrabold text-accent-orange">
              {top1?.score ?? 0} {L.pointsUnit}
            </div>
            <div className="w-full h-24 rounded-t-2xl bg-linear-to-t from-accent-orange to-amber-400 flex items-center justify-center font-extrabold text-brand-navy text-xl shadow-lg">
              1
            </div>
          </div>

          {/* #3 Bronze */}
          <div className="flex flex-col items-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-amber-700/20 font-extrabold text-base flex items-center justify-center shadow-md">
              🥉
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[90px]">
              {top3?.name || '—'}
            </div>
            <div className="text-[11px] font-mono font-bold text-slate-500">
              {top3?.score ?? 0} {L.pointsUnit}
            </div>
            <div className="w-full h-12 rounded-t-2xl bg-linear-to-t from-amber-700/30 to-amber-700/20 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
              3
            </div>
          </div>
        </div>

        {/* Full Ranked Table: Strong vs. Needs Review */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-display font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-brand-blue" />
              <span>{L.fullRankingsTitle}</span>
            </h3>
            <span className="text-xs text-slate-500">
              {rankings.length} {L.participantsUnit}
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {rankings.map((st) => (
              <div
                key={st.id}
                className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 text-center font-bold text-sm text-slate-500">#{st.rank}</span>
                  <div className="space-y-0.5 text-start">
                    <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{st.name}</span>
                      {st.id === currentUserId && (
                        <span className="px-1.5 py-0.5 rounded-md bg-brand-blue text-white text-[10px] font-extrabold">
                          {L.youBadge}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>{L.correctOfTotal(st.correctCount, st.totalAnswered)}</span>
                      <span>•</span>
                      <span>
                        {L.bestStreakLabel}: {st.bestStreak}x
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 justify-end">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      st.tier === 'gold'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : st.tier === 'silver'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : st.tier === 'bronze'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {st.tierLabel[lang] || st.tierLabel.en}
                  </span>

                  <span className="font-mono font-extrabold text-sm text-brand-blue dark:text-accent-orange min-w-[70px] text-end">
                    {st.score} {L.pointsUnit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Teacher Analytics Card (Hardest questions & review points) */}
        {analytics && analytics.hardestQuestions.length > 0 && (
          <div className="rounded-3xl bg-linear-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-850 border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3 text-start">
            <div className="flex items-center gap-2 text-brand-blue dark:text-accent-orange font-bold text-sm">
              <BarChart3 className="w-4 h-4" />
              <span>{L.teacherAnalyticsTitle}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] text-slate-500 font-bold">{L.avgClassScoreLabel}</div>
                <div className="text-lg font-extrabold text-slate-900 dark:text-white font-mono">
                  {analytics.averageScore} {L.pointsUnit}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] text-slate-500 font-bold">{L.avgClassAccuracyLabel}</div>
                <div className="text-lg font-extrabold text-slate-900 dark:text-white font-mono">
                  {analytics.classAccuracyPct}%
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 col-span-2 sm:col-span-1">
                <div className="text-[11px] text-slate-500 font-bold">{L.needsReviewCountLabel}</div>
                <div className="text-lg font-extrabold text-rose-500 font-mono">
                  {analytics.needsSupportStudents.length} {L.studentsCountUnit}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {L.hardestQuestionsLabel}
              </div>
              <div className="space-y-1.5">
                {analytics.hardestQuestions.map((hq) => (
                  <div
                    key={hq.questionId}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs flex items-center justify-between gap-2"
                  >
                    <span dir="ltr" className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-md">
                      {hq.questionPrompt}
                    </span>
                    <span className="text-rose-500 font-bold shrink-0">
                      {L.mistakesAndSuccessRate(hq.mistakeCount, hq.successRatePct)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Back and Repeat Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 pb-2">
          <button
            type="button"
            onClick={handleStartQuiz}
            className="px-6 py-2.5 rounded-2xl bg-brand-blue hover:opacity-90 text-white font-display font-extrabold text-sm flex items-center gap-2 cursor-pointer shadow-md"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{L.restartChallengeBtn}</span>
          </button>

          <button
            type="button"
            data-testid="arena-back-lobby-btn"
            onClick={() => {
              setActiveRoom(null);
              setViewMode('lobby');
              fetchRooms();
            }}
            className="px-6 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-display font-bold text-sm cursor-pointer"
          >
            {L.backToArena}
          </button>

          <button
            type="button"
            data-testid="arena-podium-delete-room-btn"
            onClick={(e) => handleDeleteRoom(activeRoom.id, activeRoom.title, e)}
            className="px-5 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-300 font-display font-bold text-sm flex items-center gap-2 cursor-pointer border border-rose-200 dark:border-rose-800 transition"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>{L.deleteRoomPermanentlyBtn}</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
};


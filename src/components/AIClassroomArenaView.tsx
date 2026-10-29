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
} from '../lib/arenaEngine';
import { speakRussian, playSoundEffect } from '../lib/audio';
import { useI18n } from '../lib/i18n';

interface AIClassroomArenaViewProps {
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string;
  userRole: 'student' | 'teacher' | 'content_reviewer' | 'admin';
  soundEnabled: boolean;
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
  const [newTitle, setNewTitle] = useState(L.defaultRoomTitle);
  const [newTopic, setNewTopic] = useState(L.defaultTopic);
  const [newInstructions, setNewInstructions] = useState(L.defaultInstructions);
  const [newTimeLimit, setNewTimeLimit] = useState(30);
  const [newQuestionCount, setNewQuestionCount] = useState(5);
  const [customText, setCustomText] = useState('');
  const [customImageBase64, setCustomImageBase64] = useState<string>('');
  const [customImageName, setCustomImageName] = useState<string>('');
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
      const resp = await fetch('/api/arena/rooms');
      if (resp.ok) {
        const data = await resp.json();
        setRooms(data.rooms || []);
      }
    } catch (err) {
      console.error('Failed to load arena rooms:', err);
    } finally {
      setIsLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // Helper to re-fetch room state from backend
  const refreshRoomDetails = async (roomIdOrCode: string, callback?: (loadedRoom: ArenaRoom) => void) => {
    try {
      const resp = await fetch(`/api/arena/rooms/${encodeURIComponent(roomIdOrCode)}`);
      if (resp.ok) {
        const data = await resp.json();
        setActiveRoom(data.room);
        setRankings(data.rankings || []);
        setAnalytics(data.analytics || null);
        setIsRoomOwner(
          data.room.teacherId === currentUserId ||
            userRole === 'teacher' ||
            userRole === 'admin' ||
            data.room.id === 'room-madi-101'
        );
        if (callback) callback(data.room);
      }
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

    const roomId = activeRoom.id;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/arena?roomId=${encodeURIComponent(roomId)}`;

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
              setRankings(msg.rankings);
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
            if (msg.rankings) setRankings(msg.rankings);
            if (msg.analytics) setAnalytics(msg.analytics);
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
        const resp = await fetch(`/api/arena/rooms/${encodeURIComponent(currentRm.id)}`);
        if (resp.status === 404) {
          setActiveRoom(null);
          setViewMode('lobby');
          fetchRooms();
          return;
        }
        if (!resp.ok) return;
        const data = await resp.json();
        const serverRoom: ArenaRoom = data.room;

        setRankings(data.rankings || []);
        if (data.analytics) setAnalytics(data.analytics);

        if (currentMode === 'room' && serverRoom.status === 'active') {
          setActiveRoom(serverRoom);
          setViewMode('active_quiz');
          setSelectedOption(null);
          setHasAnsweredCurrent(false);
          setLastAnswerOutcome(null);
          setTimeLeft(serverRoom.questionTimeLimitSeconds || 30);
          startTimeRef.current = Date.now();
        } else if (currentMode === 'active_quiz') {
          if (serverRoom.status === 'finished') {
            setActiveRoom(serverRoom);
            setViewMode('podium');
          } else if (serverRoom.currentQuestionIndex !== currentRm.currentQuestionIndex) {
            setActiveRoom(serverRoom);
            setSelectedOption(null);
            setHasAnsweredCurrent(false);
            setLastAnswerOutcome(null);
            setTimeLeft(serverRoom.questionTimeLimitSeconds || 30);
            startTimeRef.current = Date.now();
          }
        } else if (currentMode === 'room') {
          setActiveRoom(serverRoom);
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
      try {
        const resp = await fetch(`/api/arena/rooms/${encodeURIComponent(activeRoom.id)}/answer`, {
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
          if (data.rankings) setRankings(data.rankings);
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
    try {
      const resp = await fetch(`/api/arena/rooms/${encodeURIComponent(cleanCode)}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: currentUserId,
          name: currentUserName,
          avatar: currentUserAvatar,
          role: userRole === 'teacher' ? 'teacher' : 'student',
        }),
      });

      if (!resp.ok) {
        await resp.json().catch(() => ({}));
        setJoinError(L.errJoinFailed);
        return;
      }

      const data = await resp.json();
      setActiveRoom(data.room);
      setRankings(data.rankings || []);
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
      } else if (data.room.questions && data.room.questions.length === 0) {
        setNewTitle(data.room.title || L.defaultRoomTitle);
        setNewTopic(data.room.exerciseTopic || L.defaultTopic);
        setNewInstructions(data.room.teacherInstructions || L.defaultInstructions);
        setNewTimeLimit(data.room.questionTimeLimitSeconds || 30);
        setViewMode('create');
      } else {
        setViewMode('room');
      }
    } catch (err: any) {
      setJoinError(err?.message || L.errServerConn);
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

    try {
      const resp = await fetch('/api/arena/rooms', {
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

      if (resp.ok) {
        const createdRoom = await resp.json();
        setActiveRoom(createdRoom);
        setIsRoomOwner(true);
        setViewMode('create');
      }
    } catch (err) {
      console.error('Failed to create room:', err);
    }
  };

  // Cancel / Back from Creation Studio (cleans up empty 0-question room so lobby stays clean)
  const handleCancelCreationStudio = async () => {
    if (activeRoom && activeRoom.questions.length === 0 && activeRoom.id !== 'room-madi-101') {
      try {
        await fetch(`/api/arena/rooms/${encodeURIComponent(activeRoom.id)}`, {
          method: 'DELETE',
        });
      } catch {
        // ignore
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

    try {
      const resp = await fetch(`/api/arena/rooms/${encodeURIComponent(roomIdOrCode)}`, {
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

  // Handle Image Upload for AI Extraction
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setCustomImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Trigger AI Page Extraction
  const handleExtractExercises = async () => {
    setIsExtracting(true);
    setExtractError(null);

    try {
      let targetRoom = activeRoom;
      if (!targetRoom) {
        const createResp = await fetch('/api/arena/rooms', {
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
        if (!createResp.ok) {
          setExtractError(L.errCreateRoom);
          return;
        }
        targetRoom = await createResp.json();
        setActiveRoom(targetRoom);
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

      const resp = await fetch(`/api/arena/rooms/${encodeURIComponent(targetRoom!.id)}/extract-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        setExtractError(err.error || L.errExtractPage);
        return;
      }

      await refreshRoomDetails(targetRoom!.id);
      await fetchRooms();
      setShowTeacherAnswersPreview(false);
      setViewMode('room');
      confetti({ particleCount: 40, spread: 60 });
    } catch (err: any) {
      setExtractError(err?.message || L.errAiProcess);
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
    try {
      const resp = await fetch(`/api/arena/rooms/${encodeURIComponent(activeRoom.id)}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: updatedQuestions }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setActiveRoom(data.room);
        setManualPromptRu('');
        setManualOptions(['', '', '', '']);
        setManualCorrectIndex(0);
        setManualExplanationAr('');
        setShowAddQuestionForm(false);
      }
    } catch (err) {
      console.error('Failed to add manual question:', err);
    }
  };

  // Remove a question from activeRoom
  const handleDeleteQuestion = async (questionId: string) => {
    if (!activeRoom || activeRoom.questions.length <= 1) return;
    const updatedQuestions = activeRoom.questions.filter((q) => q.id !== questionId);
    try {
      const resp = await fetch(`/api/arena/rooms/${encodeURIComponent(activeRoom.id)}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: updatedQuestions }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setActiveRoom(data.room);
      }
    } catch (err) {
      console.error('Failed to delete question:', err);
    }
  };

  // Start Live Quiz
  const handleStartQuiz = async () => {
    if (!activeRoom) return;
    try {
      const resp = await fetch(`/api/arena/rooms/${encodeURIComponent(activeRoom.id)}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: currentUserId,
          participantName: currentUserName,
          participantAvatar: currentUserAvatar,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setActiveRoom(data.room);
        if (data.rankings) setRankings(data.rankings);
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

    try {
      const resp = await fetch(`/api/arena/rooms/${encodeURIComponent(activeRoom.id)}/answer`, {
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

      if (resp.ok) {
        const result = await resp.json();
        setLastAnswerOutcome({
          isCorrect: result.isCorrect,
          pointsEarned: result.pointsEarned,
          explanationRu: result.explanationRu || currentQ.explanationRu,
          explanationAr: result.explanationAr || currentQ.explanationAr,
          explanationEn: currentQ.explanationEn,
        });
        setRankings(result.rankings || []);
        if (result.isCorrect) {
          setMyStreak((s) => s + 1);
          playSoundEffect('correct', soundEnabled);
          confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
        } else {
          setMyStreak(0);
          playSoundEffect('wrong', soundEnabled);
        }
      } else {
        // Fallback local evaluation if offline/network issue
        const isLocalCorrect = optionIdx === currentQ.correctIndex;
        setLastAnswerOutcome({
          isCorrect: isLocalCorrect,
          pointsEarned: isLocalCorrect ? 10 : 0,
          explanationRu: currentQ.explanationRu,
          explanationAr: currentQ.explanationAr,
          explanationEn: currentQ.explanationEn,
        });
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
      const isLocalCorrect = optionIdx === currentQ.correctIndex;
      setLastAnswerOutcome({
        isCorrect: isLocalCorrect,
        pointsEarned: isLocalCorrect ? 10 : 0,
        explanationRu: currentQ.explanationRu,
        explanationAr: currentQ.explanationAr,
        explanationEn: currentQ.explanationEn,
      });
    }
  };

  // Next Question
  const handleNextQuestion = async () => {
    if (!activeRoom) return;
    try {
      const resp = await fetch(`/api/arena/rooms/${encodeURIComponent(activeRoom.id)}/next-question`, {
        method: 'POST',
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.finished) {
          setActiveRoom(data.room);
          setRankings(data.rankings || []);
          setAnalytics(data.analytics || null);
          setViewMode('podium');
          confetti({ particleCount: 80, spread: 80 });
        } else {
          setActiveRoom(data.room);
          if (data.rankings) setRankings(data.rankings);
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
    try {
      const resp = await fetch(`/api/arena/rooms/${encodeURIComponent(activeRoom.id)}/finish`, {
        method: 'POST',
      });
      if (resp.ok) {
        const data = await resp.json();
        setActiveRoom(data.room);
        setRankings(data.rankings || []);
        setAnalytics(data.analytics || null);
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
    return (
      <div className="max-w-xl mx-auto px-3 sm:px-4 pb-28 animate-fade-in" dir={dir}>
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
        <div className="relative -mx-3 sm:-mx-4 h-[235px] sm:h-[265px] overflow-hidden select-none">
          {/* Cropped Image 3 so the full orange car, winding road, green hills & Moscow towers appear cleanly without the bottom grey/tan strips */}
          <img
            src="/assets/aistudio/1793153092003_48d96bde.jpg"
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
            <h1 className="text-2xl sm:text-4xl font-display font-black text-[#0B2545] dark:text-white tracking-tight drop-shadow-[0_2px_10px_rgba(255,255,255,0.95)] dark:drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              {L.heroTitle}
            </h1>
            <p className="text-xs sm:text-base font-display font-bold text-[#2B4C7E] dark:text-slate-200 drop-shadow-[0_1px_8px_rgba(255,255,255,0.95)] dark:drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)]">
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
        <div className="relative z-20 -mt-5 space-y-4">
          {/* CARD 1: Teacher Room Creation Card */}
          <div className="rounded-[28px] bg-white dark:bg-slate-900 border-2 border-[#FAD6A5] dark:border-orange-500/30 p-4 sm:p-6 shadow-[0_10px_30px_rgba(245,130,32,0.08)] space-y-4">
            {/* Top Content Row */}
            <div className="flex items-center justify-between gap-2.5">
              {/* Tilted Orange Clipboard Checklist Illustration */}
              <div className="relative w-20 h-20 sm:w-26 sm:h-26 shrink-0 flex items-center justify-center">
                <div
                  className="absolute inset-1 rounded-full bg-[#FFF3E6] dark:bg-orange-950/40"
                  aria-hidden="true"
                />
                <svg
                  viewBox="0 0 120 120"
                  className="w-20 h-20 sm:w-24 sm:h-24 relative z-10 drop-shadow-xs"
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
                <h2 className="text-base sm:text-2xl font-display font-black text-[#0B2545] dark:text-white leading-tight">
                  {L.teacherTitle}
                </h2>
                <p className="text-xs sm:text-sm font-medium text-[#475569] dark:text-slate-400">
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
                className="w-full py-3.5 px-5 rounded-2xl bg-linear-to-r from-[#F58220] via-[#FF8C24] to-[#F58220] hover:brightness-105 text-white font-display font-extrabold text-base sm:text-lg shadow-[0_6px_18px_rgba(245,130,32,0.35)] flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Plus className="w-5 h-5 stroke-[2.8]" />
                <span>{L.createRoomBtn}</span>
              </button>

              <button
                type="button"
                onClick={() => handleJoinRoom('MADI-101')}
                className="w-full py-3 px-4 rounded-2xl bg-[#F1F5F9] hover:bg-[#E2E8F0] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#1E293B] dark:text-slate-200 font-display font-extrabold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Flame className="w-4 h-4 text-[#F58220] shrink-0" />
                <span>{L.practiceRoomBtn}</span>
              </button>
            </div>
          </div>

          {/* CARD 2: Student Join Room Card using Image 2 */}
          <div className="rounded-[28px] bg-white dark:bg-slate-900 border-2 border-[#CBD5E1]/80 dark:border-slate-800 p-4 sm:p-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)] space-y-4">
            <div className="flex items-center justify-between gap-3">
              {/* Image 2 (/assets/aistudio/1793153163292_a75dd14c.jpg) framed on a soft sky-blue backdrop */}
              <div className="relative w-26 h-34 sm:w-34 sm:h-40 shrink-0 flex items-center justify-center">
                <div
                  className="absolute inset-x-0 bottom-1 top-3 rounded-[32px] bg-[#EAF2FF] dark:bg-slate-800/90"
                  aria-hidden="true"
                />
                <img
                  src="/assets/aistudio/1793153163292_a75dd14c.jpg"
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
                  <h2 className="text-base sm:text-2xl font-display font-black text-[#0B2545] dark:text-white leading-tight">
                    {L.studentTitle}
                  </h2>
                  <p className="text-xs sm:text-sm font-medium text-[#475569] dark:text-slate-400">
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
              className="w-full py-3.5 px-5 rounded-2xl bg-[#0B3D91] hover:bg-[#082E70] text-white font-display font-extrabold text-base sm:text-lg shadow-[0_6px_18px_rgba(11,61,145,0.28)] flex items-center justify-center transition cursor-pointer"
            >
              {L.joinRoomBtn}
            </button>
          </div>

          {/* CARD 3: Available Rooms Section */}
          <div className="rounded-[28px] bg-white dark:bg-slate-900 border-2 border-[#E2E8F0] dark:border-slate-800 p-4 sm:p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)] space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm sm:text-xl font-display font-black text-[#0B2545] dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-[#F58220] shrink-0" />
                <span>
                  {L.availableRoomsTitle} ({rooms.length})
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

            {isLoadingRooms ? (
              <div className="py-10 text-center text-slate-400 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0B3D91]" />
                <p className="text-xs font-bold">{L.loadingRooms}</p>
              </div>
            ) : rooms.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-[#CBD5E1] dark:border-slate-700 bg-[#F8FAFC]/60 dark:bg-slate-800/30 p-8 text-center space-y-2">
                <Users className="w-9 h-9 text-[#94A3B8] mx-auto stroke-[1.8]" />
                <div className="text-base font-display font-black text-[#0B2545] dark:text-slate-200">
                  {L.emptyRoomsTitle}
                </div>
                <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 font-medium">
                  {L.emptyRoomsDesc}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {rooms.map((room) => {
                  const isWaiting = room.status === 'waiting' || room.status === 'setup';
                  const isActive = room.status === 'active';
                  return (
                    <div
                      key={room.id}
                      data-testid={`arena-room-card-${room.id}`}
                      className="rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/70 border border-[#E2E8F0] dark:border-slate-700 p-4 flex flex-col justify-between gap-3 hover:border-[#0B3D91]/50 transition text-start"
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
                          <span className="flex items-center gap-1 font-medium">
                            <Users className="w-3.5 h-3.5" />
                            <span>
                              {room.participantsCount} {L.studentsCountUnit}
                            </span>
                          </span>
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

        <div className="h-24 w-full shrink-0" aria-hidden="true" />
      </div>
    );
  }

  // ==========================================================================
  // RENDER: 2. ROOM CREATION & AI PAGE EXTRACTION STUDIO
  // ==========================================================================
  if (viewMode === 'create') {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-28 space-y-6 animate-fade-in" dir={dir}>
        {/* Navigation header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleCancelCreationStudio}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-200 cursor-pointer"
          >
            {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{L.backToList}</span>
          </button>
          {activeRoom?.code && (
            <div className="text-xs font-mono font-bold text-slate-500">
              {L.roomCodeHeader}{' '}
              <span className="text-brand-blue font-extrabold">{activeRoom.code}</span>
            </div>
          )}
        </div>

        {/* Creator Studio Card */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4 space-y-1 text-start">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-accent-orange">
              <Sparkles className="w-4 h-4" />
              <span>{L.studioBadge}</span>
            </div>
            <h2 className="text-xl font-display font-extrabold text-slate-900 dark:text-white">
              {L.studioTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{L.studioDesc}</p>
          </div>

          {/* Form Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 text-start">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {L.roomTitleLabel}
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={L.roomTitlePlaceholder}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-blue"
              />
            </div>

            <div className="space-y-1.5 text-start">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {L.topicLabel}
              </label>
              <input
                type="text"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder={L.topicPlaceholder}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-blue"
              />
            </div>
          </div>

          {/* Upload Custom Scanned Page / Paste Text */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-3 text-start">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {L.uploadSectionLabel}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Image upload */}
              <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 text-center space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
                <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {customImageName ? customImageName : L.uploadBtnLabel}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-blue file:text-white cursor-pointer"
                />
              </div>

              {/* Paste text */}
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                rows={3}
                placeholder={L.pasteTextPlaceholder}
                className="w-full p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-blue"
              />
            </div>
          </div>

          {/* Teacher Instructions to AI */}
          <div className="space-y-2 text-start">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {L.aiInstructionsLabel}
            </label>
            <input
              type="text"
              value={newInstructions}
              onChange={(e) => setNewInstructions(e.target.value)}
              placeholder={L.aiInstructionsPlaceholder}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-blue"
            />
            {/* Quick Prompt Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {L.chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setNewInstructions(L.chipPrefixPrompt(chip))}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-brand-blue hover:text-white text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition cursor-pointer"
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Time Limit Setting */}
          <div className="space-y-1 text-start max-w-sm">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {L.timeLimitLabel}
            </label>
            <select
              value={newTimeLimit}
              onChange={(e) => setNewTimeLimit(Number(e.target.value))}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
            >
              <option value={15}>{L.time15}</option>
              <option value={30}>{L.time30}</option>
              <option value={45}>{L.time45}</option>
            </select>
            <p className="text-[11px] text-slate-500 pt-1">{L.extractNote}</p>
          </div>

          {extractError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{extractError}</span>
            </div>
          )}

          {/* Action button */}
          <button
            type="button"
            data-testid="arena-extract-btn"
            disabled={isExtracting}
            onClick={handleExtractExercises}
            className="w-full py-3.5 rounded-2xl bg-linear-to-r from-brand-blue to-accent-orange text-white font-display font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg hover:brightness-105 transition cursor-pointer disabled:opacity-50"
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{L.extractingBtn}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>{L.extractSaveBtn}</span>
              </>
            )}
          </button>
        </div>
        <div className="h-28 w-full shrink-0" aria-hidden="true" />
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
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-28 space-y-6 animate-fade-in" dir={dir}>
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
        <div className="rounded-3xl bg-linear-to-r from-brand-navy to-brand-blue p-6 text-white space-y-4 shadow-xl border border-white/10">
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
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
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
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2 text-start"
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
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-display font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              <span>
                {L.connectedStudentsRosterTitle} ({studentParticipants.length})
              </span>
            </h3>
            <span className="text-xs text-slate-400">{L.waitingToStartText}</span>
          </div>

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
        </div>
        <div className="h-28 w-full shrink-0" aria-hidden="true" />
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
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-28 space-y-5 animate-fade-in" dir={dir}>
        {/* Progress & Live Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
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
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-6 text-center">
            {/* Instruction pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue dark:text-accent-orange text-xs font-bold">
              <span>{getArenaQuestionInstruction(currentQuestion, lang)}</span>
            </div>

            {/* Russian prompt with audio button */}
            <div className="space-y-2">
              <div
                dir="ltr"
                className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white leading-relaxed"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 max-w-2xl mx-auto">
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
                    className={`min-h-[58px] p-4 rounded-2xl border-2 text-base font-display font-extrabold flex items-center justify-between transition cursor-pointer ${btnStyle}`}
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
                className={`p-4 rounded-2xl text-start space-y-3 animate-fade-in ${
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
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-display font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-accent-orange" />
              <span>{L.liveLeaderboardTitle}</span>
            </div>
            <span className="text-[11px] text-slate-400">{L.instantUpdatePerQuestion}</span>
          </div>

          <div className="space-y-2">
            {rankings.slice(0, 5).map((st) => (
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
                    {st.accuracyPct}% {L.accuracyUnit}
                  </span>
                  <span className="font-mono font-extrabold text-brand-blue dark:text-accent-orange">
                    {st.score} {L.pointsUnit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="h-28 w-full shrink-0" aria-hidden="true" />
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
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-28 space-y-6 animate-fade-in" dir={dir}>
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
            <div className="w-full h-20 rounded-t-2xl bg-linear-to-t from-slate-300 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
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
            <div className="w-full h-28 rounded-t-2xl bg-linear-to-t from-accent-orange to-amber-400 flex items-center justify-center font-extrabold text-brand-navy text-xl shadow-lg">
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
            <div className="w-full h-14 rounded-t-2xl bg-linear-to-t from-amber-700/30 to-amber-700/20 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
              3
            </div>
          </div>
        </div>

        {/* Full Ranked Table: Strong vs. Needs Review */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
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
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
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
          <div className="rounded-3xl bg-linear-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-850 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 text-start">
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
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4 pb-16">
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
        <div className="h-28 w-full shrink-0" aria-hidden="true" />
      </div>
    );
  }

  return null;
};


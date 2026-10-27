import React, { useState, useEffect, useRef } from 'react';
import {
  Swords,
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
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  ArenaRoom,
  ArenaQuestion,
  RankedStudent,
  ClassroomAnalytics,
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
  const { lang } = useI18n();

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
  const [manualInstructionAr, setManualInstructionAr] = useState('اختر الإجابة الصحيحة');
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
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [myStreak, setMyStreak] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);

  // Room Creation state
  const [newTitle, setNewTitle] = useState('تحدي ورقة الأستاذ — غرفة جديدة');
  const [newTopic, setNewTopic] = useState('تحليل ورقة الأستاذ بالذكاء الاصطناعي');
  const [newInstructions, setNewInstructions] = useState('استخرج جميع التمارين الموجودة في هذه الورقة بدقة');
  const [newTimeLimit, setNewTimeLimit] = useState(30);
  const [newQuestionCount, setNewQuestionCount] = useState(5);
  const [customText, setCustomText] = useState('');
  const [customImageBase64, setCustomImageBase64] = useState<string>('');
  const [customImageName, setCustomImageName] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

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
      setJoinError('الرجاء إدخال كود الغرفة أولاً.');
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
        const err = await resp.json().catch(() => ({}));
        setJoinError(err.error || 'تعذر الانضمام للغرفة. تأكد من صحة الكود.');
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
        setNewTitle(data.room.title || 'تحدي ورقة الأستاذ');
        setNewTopic(data.room.exerciseTopic || 'تحليل ورقة الأستاذ بالذكاء الاصطناعي');
        setNewInstructions(data.room.teacherInstructions || 'استخرج جميع التمارين الموجودة في هذه الورقة بدقة');
        setNewTimeLimit(data.room.questionTimeLimitSeconds || 30);
        setViewMode('create');
      } else {
        setViewMode('room');
      }
    } catch (err: any) {
      setJoinError(err?.message || 'خطأ في الاتصال بالخادم.');
    }
  };

  // Open Room Creation Studio & Create Room
  const handleCreateRoom = async (customTitleOverride?: string) => {
    const resolvedTitle =
      (typeof customTitleOverride === 'string' && customTitleOverride.trim()) ||
      newTitle.trim() ||
      `غرفة تحدي ${newTopic}`;
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
    setDeleteNotice(`تم حذف الغرفة "${roomTitle || roomIdOrCode}" بنجاح لمنع تراكم الغرف.`);
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
            title: newTitle.trim() || `غرفة تحدي ${newTopic}`,
            teacherId: currentUserId,
            teacherName: currentUserName,
            exerciseTopic: newTopic,
            teacherInstructions: newInstructions,
            timeLimitSeconds: newTimeLimit,
          }),
        });
        if (!createResp.ok) {
          setExtractError('تعذر إنشاء الغرفة. حاول مرة أخرى.');
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
        bookTitle: customImageName || 'ورقة الأستاذ المرفوعة',
        pageNumber: 1,
        teacherInstructions: newInstructions || targetRoom!.teacherInstructions,
        topic: newTopic || targetRoom!.exerciseTopic,
        questionCount: 20,
      };

      const resp = await fetch(`/api/arena/rooms/${encodeURIComponent(targetRoom!.id)}/extract-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        setExtractError(err.error || 'فشل استخراج التمارين من الصفحة.');
        return;
      }

      await refreshRoomDetails(targetRoom!.id);
      await fetchRooms();
      setShowTeacherAnswersPreview(false);
      setViewMode('room');
      confetti({ particleCount: 40, spread: 60 });
    } catch (err: any) {
      setExtractError(err?.message || 'خطأ في معالجة الصفحة بالذكاء الاصطناعي.');
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
      instructionAr: manualInstructionAr.trim() || 'اختر الإجابة الصحيحة',
      instructionEn: 'Choose the correct answer',
      options: filledOptions,
      correctIndex: manualCorrectIndex,
      explanationRu: manualExplanationAr.trim() || 'Правильный грамматический выбор.',
      explanationAr: manualExplanationAr.trim() || 'الإجابة النحوية الصحيحة.',
      explanationEn: 'Correct grammatical choice.',
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
  // RENDER: 1. LOBBY VIEW
  // ==========================================================================
  if (viewMode === 'lobby') {
    return (
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-28 space-y-6 animate-fade-in" dir="rtl">
        {/* Delete notification toast */}
        {deleteNotice && (
          <div
            data-testid="arena-delete-notice"
            role="status"
            className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between gap-2 shadow-xs"
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

        {/* Hero Header */}
        <div className="rounded-3xl bg-linear-to-br from-brand-navy via-slate-900 to-brand-blue p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-white/10">
          <div className="absolute top-0 start-0 w-64 h-64 bg-accent-orange/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-orange/20 border border-accent-orange/30 text-accent-orange text-xs font-bold">
              <Swords className="w-3.5 h-3.5" />
              <span>نظام غرف التحدي والاختبار المنظم — معهد مادي (МАДИ)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white leading-tight">
              حلبة التنافس الصفي والاختبارات الحية
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              نظام منظم وسلس: يقوم الأستاذ أولاً بإنشاء وتجهيز الغرفة بالتمارين، ثم ينضم الطلاب عبر الكود البسيط السريع (4 أرقام). يمكن حذف أي غرفة بضغطة زر لمنع تراكم الغرف واختلاطها!
            </p>
          </div>
        </div>

        {/* Two-Column Structured Flow: 1. Teacher Setup vs 2. Student Join */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Step 1: Teacher Flow */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-accent-orange/30 dark:border-accent-orange/20 p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2 text-start">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-accent-orange/10 text-accent-orange text-xs font-bold">
                <GraduationCap className="w-4 h-4" />
                <span>الخطوة 1: للأستاذ — إنشاء وتجهيز الغرفة</span>
              </div>
              <h3 className="text-base font-display font-extrabold text-slate-900 dark:text-white">
                تجهيز أسئلة الاختبار أولاً
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                أنشئ الغرفة، استخرج التمارين فوراً من صفحات كتب مادي الرسمية بالذكاء الاصطناعي، وحدد زمن السؤال لتصبح الغرفة جاهزة للطلاب.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                data-testid="arena-create-room-btn"
                onClick={() => handleCreateRoom('تحدي أفعال الحركة والمصطلحات — مادي')}
                className="w-full px-4 py-2.5 rounded-xl bg-accent-orange hover:brightness-110 text-brand-navy font-display font-extrabold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إنشاء وتجهيز غرفة جديدة الآن</span>
              </button>

              <button
                type="button"
                onClick={() => handleJoinRoom('MADI-101')}
                className="w-full px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-display font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5 text-accent-orange" />
                <span>غرفة تدريب جاهزة مسبقاً (MADI-101)</span>
              </button>
            </div>
          </div>

          {/* Step 2: Student Flow */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-brand-blue/30 dark:border-brand-blue/20 p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2 text-start">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-brand-blue/10 text-brand-blue dark:text-sky-400 text-xs font-bold">
                <Users className="w-4 h-4" />
                <span>الخطوة 2: للطلاب — الدخول بالكود البسيط</span>
              </div>
              <h3 className="text-base font-display font-extrabold text-slate-900 dark:text-white">
                دخول مباشر بكود الغرفة (4 أرقام)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                بعد أن يجهز الأستاذ الغرفة، أدخل كود الغرفة السريع والمباشر (مثل: 5491 أو MADI-101) للدخول وبدء التنافس الحي.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleJoinRoom(roomCodeInput);
                  }}
                  placeholder="مثال: 4821 أو MADI-101"
                  maxLength={10}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-center font-bold text-slate-900 dark:text-white uppercase tracking-wider focus:outline-hidden focus:ring-2 focus:ring-brand-blue text-sm"
                />
                <button
                  type="button"
                  data-testid="arena-join-code-btn"
                  onClick={() => handleJoinRoom(roomCodeInput)}
                  className="px-5 py-2 rounded-xl bg-brand-blue hover:opacity-90 text-white font-display font-bold text-xs transition cursor-pointer shrink-0"
                >
                  دخول الغرفة
                </button>
              </div>

              {joinError && (
                <div className="text-xs text-rose-500 font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{joinError}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active Rooms Grid with Quick Delete to Prevent Clutter */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 text-start">
              <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-accent-orange" />
                <span>الغرف المتاحة حالياً ({rooms.length})</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                يمكن حذف أي غرفة منتهية أو غير مرغوبة لمنع تراكم الغرف
              </p>
            </div>

            <button
              type="button"
              onClick={fetchRooms}
              className="text-xs text-brand-blue dark:text-accent-orange hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تحديث القائمة</span>
            </button>
          </div>

          {isLoadingRooms ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-blue" />
              <p className="text-xs">جاري تحميل الغرف النشطة...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-10 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-400 mx-auto opacity-50" />
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                لا توجد غرف حالياً — القائمة نظيفة ومنظمة
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                ابدأ بإنشاء وتجهيز غرفة جديدة لطلابك الآن!
              </p>
              <button
                type="button"
                onClick={() => handleCreateRoom('تحدي أفعال الحركة والمصطلحات — مادي')}
                className="px-4 py-2 rounded-xl bg-brand-blue text-white text-xs font-bold transition hover:opacity-95 cursor-pointer"
              >
                إنشاء غرفة جديدة
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rooms.map((room) => {
                const isWaiting = room.status === 'waiting' || room.status === 'setup';
                const isActive = room.status === 'active';
                return (
                  <div
                    key={room.id}
                    data-testid={`arena-room-card-${room.id}`}
                    className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-brand-blue/50 transition text-start"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold text-brand-blue dark:text-sky-300 border border-slate-200 dark:border-slate-700">
                            كود: {room.code}
                          </span>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 animate-pulse'
                              : isWaiting
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {isActive ? '● مباشر الآن' : isWaiting ? 'جاهزة / انتظار' : 'مكتملة'}
                        </span>
                      </div>

                      <h3 className="text-base font-display font-extrabold text-slate-900 dark:text-white line-clamp-1">
                        {room.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {room.description || room.exerciseTopic}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-medium">
                          <Users className="w-3.5 h-3.5" />
                          <span>{room.participantsCount} طلاب</span>
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{room.questionsCount} أسئلة</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          data-testid={`arena-delete-${room.id}`}
                          onClick={(e) => handleDeleteRoom(room.id, room.title, e)}
                          title="حذف الغرفة لمنع التراكم"
                          aria-label={`حذف غرفة ${room.title}`}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          data-testid={`arena-enter-${room.id}`}
                          onClick={() => handleJoinRoom(room.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-brand-blue hover:bg-brand-navy text-white text-xs font-display font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <span>دخول</span>
                          <ArrowLeft className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="h-28 w-full shrink-0" aria-hidden="true" />
      </div>
    );
  }

  // ==========================================================================
  // RENDER: 2. ROOM CREATION & AI PAGE EXTRACTION STUDIO
  // ==========================================================================
  if (viewMode === 'create') {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-28 space-y-6 animate-fade-in" dir="rtl">
        {/* Navigation header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleCancelCreationStudio}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-200 cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للقائمة</span>
          </button>
          {activeRoom?.code && (
            <div className="text-xs font-mono font-bold text-slate-500">
              كود الغرفة: <span className="text-brand-blue font-extrabold">{activeRoom.code}</span>
            </div>
          )}
        </div>

        {/* Creator Studio Card */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4 space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-accent-orange">
              <Sparkles className="w-4 h-4" />
              <span>استخراج التمارين الذكي من صفحات الدروس (AI Page-to-Quiz)</span>
            </div>
            <h2 className="text-xl font-display font-extrabold text-slate-900 dark:text-white">
              إعداد غرفة الاختبار واستخراج الأسئلة
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              اختر صفحة من كتب معهد مادي الرسمية، أو ارفع صورة ورقة التمرين، وحدد نوع الأسئلة التي تريد اختبار طلابك فيها ليقوم الذكاء الاصطناعي ببنائها فوراً!
            </p>
          </div>

          {/* Form Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 text-start">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                عنوان الغرفة / اسم الاختبار
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="مثال: اختبار أفعال الحركة — الفوج الهندسي"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-blue"
              />
            </div>

            <div className="space-y-1.5 text-start">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                الموضوع والقاعدة النحوية
              </label>
              <input
                type="text"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="مثال: Глаголы движения, Падежи, Транспортная лексика"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-blue"
              />
            </div>
          </div>



          {/* Or Upload Custom Scanned Page / Paste Text */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              أو قم برفع صفحة خارجية (صورة / سكان) أو لصق نص التمرين:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Image upload */}
              <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 text-center space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
                <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {customImageName ? customImageName : 'رفع صورة الصفحة (PNG / JPG)'}
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
                placeholder="الصق نص الصفحة أو جمل التمرين هنا يدوياً..."
                className="w-full p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-blue"
              />
            </div>
          </div>

          {/* Teacher Instructions to AI */}
          <div className="space-y-2 text-start">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              توجيهات الأستاذ للذكاء الاصطناعي (ما نوع الأسئلة التي تريد استخراجها؟)
            </label>
            <input
              type="text"
              value={newInstructions}
              onChange={(e) => setNewInstructions(e.target.value)}
              placeholder="مثال: استخرج أسئلة أفعال حركة، أو ركز على حالات الإعراب مع 4 خيارات وشرح نحوي"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-blue"
            />
            {/* Quick Prompt Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                'أفعال الحركة مع البادئات (Приставки)',
                'حالات الإعراب (المجرور والمضاف والنصب)',
                'مصطلحات الهندسة والسيارات في موسكو',
                'إشارات المرور والسلامة الطرقية',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setNewInstructions(`استخرج تمارين اختيار من متعدد حول ${chip}`)}
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
              الوقت المتاح لكل سؤال في التحدي
            </label>
            <select
              value={newTimeLimit}
              onChange={(e) => setNewTimeLimit(Number(e.target.value))}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
            >
              <option value={15}>15 ثانية (سريع جداً)</option>
              <option value={30}>30 ثانية (موصى به)</option>
              <option value={45}>45 ثانية (مريح)</option>
            </select>
            <p className="text-[11px] text-slate-500 pt-1">
              ملاحظة: سيتم استخراج **جميع** التمارين والأسئلة الموجودة في ورقة الأستاذ المرفوعة بالكامل تلقائياً (سواء تمرينين أو ثلاثة أو أكثر).
            </p>
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
                <span>جاري معالجة الصفحة بالذكاء الاصطناعي واستخراج الأسئلة...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>استخراج التمارين بالذكاء الاصطناعي وحفظها في الغرفة</span>
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
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-28 space-y-6 animate-fade-in" dir="rtl">
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
            <ArrowRight className="w-4 h-4" />
            <span>العودة لحلبة الغرف</span>
          </button>

          <button
            type="button"
            data-testid="arena-room-header-delete-btn"
            onClick={(e) => handleDeleteRoom(activeRoom.id, activeRoom.title, e)}
            className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition border border-rose-200 dark:border-rose-800 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>حذف الغرفة</span>
          </button>
        </div>

        {/* Room Header Banner */}
        <div className="rounded-3xl bg-linear-to-r from-brand-navy to-brand-blue p-6 text-white space-y-4 shadow-xl border border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs text-accent-orange font-bold uppercase tracking-wider">
                غرفة الاختبار الحية
              </span>
              <h1 className="text-xl sm:text-2xl font-display font-extrabold text-white">
                {activeRoom.title}
              </h1>
              <p className="text-xs text-slate-300">
                الموضوع: {activeRoom.exerciseTopic} • الأستاذ: {activeRoom.teacherName}
              </p>
            </div>

            {/* Room Code Badge with Copy */}
            <button
              type="button"
              onClick={copyRoomCode}
              title="نسخ كود الغرفة"
              className="px-4 py-2 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 flex items-center gap-2 text-white font-mono font-extrabold text-base transition cursor-pointer"
            >
              <span>كود: {activeRoom.code}</span>
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10 text-xs">
            <div className="flex items-center gap-4 text-slate-300">
              <span className="flex items-center gap-1.5 font-bold">
                <Users className="w-4 h-4 text-accent-orange" />
                <span>{studentParticipants.length} طلاب متصلون</span>
              </span>
              <span className="flex items-center gap-1.5 font-bold">
                <BookOpen className="w-4 h-4 text-accent-orange" />
                <span>{activeRoom.questions.length} أسئلة مستخرجة</span>
              </span>
              <span className="flex items-center gap-1.5 font-bold">
                <Clock className="w-4 h-4 text-accent-orange" />
                <span>{activeRoom.questionTimeLimitSeconds} ث/سؤال</span>
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
                <span>بدء التحدي لجميع الطلاب الآن!</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setViewMode('create')}
                className="px-5 py-2 rounded-xl bg-accent-orange hover:brightness-110 text-brand-navy font-display font-extrabold text-sm flex items-center gap-2 shadow-md transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>استخراج وتجهيز أسئلة الغرفة</span>
              </button>
            )}
          </div>
        </div>

        {/* Questions Preview / Teacher Controls (Answers hidden by default to prevent spoiling!) */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-display font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-blue dark:text-accent-orange" />
              <span>أسئلة الغرفة الجاهزة ({activeRoom.questions.length})</span>
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
                        <span>إخفاء الإجابات الصحيحة</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-brand-blue" />
                        <span>مراجعة الإجابات (للأستاذ)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAddQuestionForm((prev) => !prev)}
                    className="px-3 py-1.5 rounded-xl bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue dark:text-accent-orange text-xs font-bold cursor-pointer transition"
                  >
                    + سؤال يدوي
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('create')}
                    className="text-xs font-bold text-brand-blue hover:underline cursor-pointer px-2"
                  >
                    إعادة استخراج بالذكاء الاصطناعي
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Manual Question Builder Form */}
          {showAddQuestionForm && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-brand-blue/30 space-y-3 text-start">
              <div className="text-xs font-extrabold text-brand-blue dark:text-accent-orange">
                إضافة سؤال جديد يدوياً إلى الغرفة:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  dir="ltr"
                  value={manualPromptRu}
                  onChange={(e) => setManualPromptRu(e.target.value)}
                  placeholder="نص السؤال بالروسية (مثال: Мы едем в ...)"
                  className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                />
                <input
                  type="text"
                  value={manualInstructionAr}
                  onChange={(e) => setManualInstructionAr(e.target.value)}
                  placeholder="التعليمة بالعربية (مثال: اختر الصيغة الصحيحة)"
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
                      title="حدد كإجابة صحيحة"
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
                      placeholder={`الخيار ${idx + 1}${manualCorrectIndex === idx ? ' (الصحيح)' : ''}`}
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
                  placeholder="شرح القاعدة النحوية (اختياري)..."
                  className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddManualQuestion}
                  className="px-4 py-1.5 rounded-xl bg-brand-blue text-white text-xs font-bold cursor-pointer"
                >
                  حفظ السؤال
                </button>
              </div>
            </div>
          )}

          {!showTeacherAnswersPreview && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-2">
              <span>
                🔒 تم إخفاء الإجابات الصحيحة تلقائياً في شاشة الانتظار حتى لا تظهر للطلاب قبل بدء المسابقة.
              </span>
            </div>
          )}

          <div className="space-y-3">
            {activeRoom.questions.map((q, idx) => (
              <div
                key={q.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2 text-start"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>السؤال {idx + 1}</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-brand-blue/10 text-brand-blue dark:text-accent-orange">
                      {q.instructionAr || q.instructionRu}
                    </span>
                    {isRoomOwner && activeRoom.questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id)}
                        title="حذف هذا السؤال"
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

                {showTeacherAnswersPreview && q.explanationAr && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700/50">
                    💡 <span className="font-semibold">{q.explanationAr}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Connected Students Roster */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-display font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              <span>الطلاب المنضمون للقاعة حالياً ({studentParticipants.length})</span>
            </h3>
            <span className="text-xs text-slate-400">في انتظار بدء الاختبار...</span>
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
                    <span>متصل</span>
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

    return (
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-28 space-y-5 animate-fade-in" dir="rtl">
        {/* Progress & Live Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              السؤال {activeRoom.currentQuestionIndex + 1} من {totalQ}
            </div>
            {myStreak >= 2 && (
              <span className="px-2 py-0.5 rounded-full bg-accent-orange/20 text-accent-orange text-xs font-extrabold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" />
                <span>{myStreak}x متتالي!</span>
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
            <span>{timeLeft} ثانية</span>
          </div>

          {/* Navigation / Finish controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="arena-next-btn"
              onClick={handleNextQuestion}
              className="px-3.5 py-1.5 rounded-xl bg-brand-blue hover:bg-brand-navy text-white text-xs font-display font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <span>{isLastQuestion ? 'عرض النتيجة النهائية' : 'السؤال التالي'}</span>
              <ArrowLeft className="w-3 h-3" />
            </button>
            <button
              type="button"
              data-testid="arena-finish-btn"
              onClick={handleFinishQuiz}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/20 text-xs font-bold text-rose-600 dark:text-rose-400 cursor-pointer"
            >
              إنهاء
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
              <span>{currentQuestion.instructionAr || currentQuestion.instructionRu}</span>
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
                  <span>استمع للنطق الروسي</span>
                </button>
              </div>
            </div>

            {/* Hint if provided */}
            {currentQuestion.hintAr && (
              <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl max-w-lg mx-auto">
                💡 تلميح: {currentQuestion.hintAr}
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
                      ? '✅ إجابة صحيحة وممتازة!'
                      : selectedOption === null
                      ? '⏰ انتهى الوقت المتاح للسؤال!'
                      : '❌ إجابة غير دقيقة!'}
                  </span>
                  <span className="font-extrabold">
                    +{lastAnswerOutcome.pointsEarned} نقطة
                  </span>
                </div>
                <p className="text-xs leading-relaxed opacity-90">
                  {lastAnswerOutcome.explanationAr || lastAnswerOutcome.explanationRu}
                </p>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={isLastQuestion ? handleFinishQuiz : handleNextQuestion}
                    className="px-5 py-2 rounded-xl bg-brand-blue hover:bg-brand-navy text-white text-xs font-display font-extrabold flex items-center gap-2 shadow-sm transition cursor-pointer"
                  >
                    <span>
                      {isLastQuestion
                        ? 'إنهاء التحدي وعرض لوحة الشرف 🏆'
                        : 'الانتقال إلى السؤال التالي'}
                    </span>
                    <ArrowLeft className="w-3.5 h-3.5" />
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
              <span>ترتيب المشاركين المباشر في الغرفة</span>
            </div>
            <span className="text-[11px] text-slate-400">تحديث فوري لكل سؤال</span>
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
                      أنت
                    </span>
                  )}
                  {st.tier === 'gold' && <Crown className="w-3.5 h-3.5 text-accent-orange shrink-0" />}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">{st.accuracyPct}% دقة</span>
                  <span className="font-mono font-extrabold text-brand-blue dark:text-accent-orange">
                    {st.score} نقطة
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
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-28 space-y-6 animate-fade-in" dir="rtl">
        {/* Celebration Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-orange/15 text-accent-orange text-xs font-extrabold">
            <Trophy className="w-4 h-4" />
            <span>اكتملت المنافسة بنجاح!</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white">
            لوحة شرف وترتيب الطلاب النهائي
          </h1>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {activeRoom.title} — تم تصنيف درجات جميع أعضاء الغرفة وفقاً للنقاط والدقة النحوية
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
              {top2?.score ?? 0} نقطة
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
              {top1?.score ?? 0} نقطة
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
              {top3?.score ?? 0} نقطة
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
              <span>قائمة تصنيف المشاركين كاملاً (المتميزون ومن يحتاجون مراجعة)</span>
            </h3>
            <span className="text-xs text-slate-500">{rankings.length} مشاركين</span>
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
                          أنت
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>{st.correctCount} من {st.totalAnswered} إجابات صحيحة</span>
                      <span>•</span>
                      <span>أعلى تسلسل: {st.bestStreak}x</span>
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
                    {st.tierLabel[lang] || st.tierLabel.ar}
                  </span>

                  <span className="font-mono font-extrabold text-sm text-brand-blue dark:text-accent-orange min-w-[70px] text-end">
                    {st.score} نقطة
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
              <span>تقرير تحليل الفصل للأستاذ (Class Performance Insights)</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] text-slate-500 font-bold">متوسط نقاط الفصل</div>
                <div className="text-lg font-extrabold text-slate-900 dark:text-white font-mono">
                  {analytics.averageScore} نقطة
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] text-slate-500 font-bold">متوسط الدقة العامة</div>
                <div className="text-lg font-extrabold text-slate-900 dark:text-white font-mono">
                  {analytics.classAccuracyPct}%
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 col-span-2 sm:col-span-1">
                <div className="text-[11px] text-slate-500 font-bold">بحاجة لمراجعة</div>
                <div className="text-lg font-extrabold text-rose-500 font-mono">
                  {analytics.needsSupportStudents.length} طلاب
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                الأسئلة الأكثر صعوبة (التي واجه فيها الطلاب أخطاءً):
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
                      {hq.mistakeCount} أخطاء ({hq.successRatePct}% نجاح)
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
            <span>إعادة تشغيل التحدي</span>
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
            العودة إلى حلبة الغرف
          </button>

          <button
            type="button"
            data-testid="arena-podium-delete-room-btn"
            onClick={(e) => handleDeleteRoom(activeRoom.id, activeRoom.title, e)}
            className="px-5 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-300 font-display font-bold text-sm flex items-center gap-2 cursor-pointer border border-rose-200 dark:border-rose-800 transition"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>حذف هذه الغرفة نهائياً</span>
          </button>
        </div>
        <div className="h-28 w-full shrink-0" aria-hidden="true" />
      </div>
    );
  }

  return null;
};

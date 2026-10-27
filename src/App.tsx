/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Map,
  BookOpen,
  Wrench,
  User,
  Fuel,
  Gauge,
  Keyboard,
  Mic,
  Library,
  GraduationCap,
  Trophy,
  Swords,
  Award,
  Bell,
  ShieldCheck,
} from 'lucide-react';
import {
  CURRICULUM_UNITS,
  CurriculumLesson,
  getAllLessons,
  SupportedLang,
} from './data/curriculum';
import { I18nProvider, useI18n } from './lib/i18n';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { StreakState, updateStreakOdometer } from './lib/rules';
import {
  LeitnerReviewItem,
  advanceLeitnerItem,
  isReviewItemDue,
} from './lib/phase2Engine';
import { UserRole } from './lib/phase3Engine';
import {
  INITIAL_ASSIGNMENTS,
  DEMO_ASSIGNMENTS,
  GroupAssignment,
} from './data/phase3Seed';
import {
  CefrLevel,
  ClassChallenge,
  CosmeticItem,
  DEFAULT_CERTIFICATE_DISCLAIMER,
  DEMO_CLASS_CHALLENGES,
  DEMO_FACULTY_BOARD,
  DEMO_FRIENDS,
  DEMO_LEAGUE_PARTICIPANTS,
  FacultyStanding,
  FriendConnection,
  LeagueParticipant,
  SEED_CLASS_CHALLENGES,
  SEED_FACULTY_BOARD,
  SEED_FRIENDS,
  SEED_LEAGUE_PARTICIPANTS,
} from './data/phase4Data';
import {
  CertificateRecord,
  computeCertificateScoreBand,
  computeTodayForYouRecommendation,
  evaluatePhase4Badges,
  generateCertificateId,
  generatePersonalizedQuests,
  TodayForYouRecommendation,
} from './lib/phase4Engine';
import {
  cacheCompletedLessonOffline,
  cacheCurrentUnitOffline,
  cacheGarageItemsOffline,
  getCachedGarageItemsOffline,
  queueOfflineGarageReview,
} from './lib/offlineCache';
import { DriverAvatarIcon, MadingoWordmark } from './components/BrandVisuals';
import { FlagPickerModal } from './components/FlagPickerModal';
import { LandingPage } from './components/LandingPage';
import { OnboardingFlow } from './components/OnboardingFlow';
import { RoadMapView } from './components/RoadMapView';
import { DictionaryView, UserWordRecord } from './components/DictionaryView';
import { TypingLabView, TypingLabMode } from './components/TypingLabView';
import { LibraryView } from './components/LibraryView';
import { TeacherDashboardView } from './components/TeacherDashboardView';
import { ProfileSettingsView, UserProfileState } from './components/ProfileSettingsView';
import { LessonPlayer } from './components/LessonPlayer';
import { DevExercisesPage } from './components/DevExercisesPage';
import { DevAudioTestPage } from './components/DevAudioTestPage';
import { audioService, AudioServiceState } from './lib/audio';
import { OfflineIndicator } from './components/PWAInstallButton';
import { Phase4LeaguesAndBadgesView } from './components/Phase4LeaguesAndBadgesView';
import { AIClassroomArenaView } from './components/AIClassroomArenaView';
import {
  DEMO_NOTIFICATIONS,
  InAppNotificationItem,
  LegalAndGdprModal,
  NotificationsCenterDrawer,
  SEED_NOTIFICATIONS,
} from './components/Phase4NotificationsAndLegal';
import { ContactMadiModal } from './components/ContactMadiModal';

export interface MistakeItem {
  id: string | number;
  stepId: string;
  lessonId: string;
  promptPreview: string;
  correctAnswer: string;
  times: number;
}

type ScreenMode =
  | 'landing'
  | 'onboarding'
  | 'login'
  | 'app'
  | 'lesson'
  | 'dev_exercises'
  | 'dev_audio';
type AppTab =
  | 'map'
  | 'dictionary'
  | 'typing_lab'
  | 'arena'
  | 'leagues'
  | 'library'
  | 'teacher'
  | 'profile';

const DEFAULT_PROFILE: UserProfileState = {
  id: 'demo-student',
  email: 'student@madi.ru',
  displayName: 'MADI Driver',
  uiLang: 'en',
  goalMinutes: 10,
  avatarId: 'misha-cap',
  soundEnabled: true,
  notificationsEnabled: true,
  theme: 'light',
};

const MadingoAppInner: React.FC = () => {
  const { lang, setLang, t, hasChosenInitialLang, confirmInitialLang } = useI18n();

  const [verifyCertificateId, setVerifyCertificateId] = useState<string>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/verify/')) {
      return decodeURIComponent(path.replace('/verify/', '').trim());
    }
    const params = new URLSearchParams(window.location.search);
    return params.get('verify') || '';
  });

  const [demoMode, setDemoMode] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('demo') === '1';
  });

  const isDevMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('dev') === '1' || window.location.pathname.startsWith('/dev/');
  }, []);

  const [audioError, setAudioError] = useState<{
    message: string;
    text: string;
  } | null>(null);

  useEffect(() => {
    return audioService.subscribe((st: AudioServiceState) => {
      if (st.lastError) {
        setAudioError({
          message: st.lastError[lang] || st.lastError.en,
          text: st.lastText,
        });
      } else {
        setAudioError(null);
      }
    });
  }, [lang]);

  const [screen, setScreen] = useState<ScreenMode>(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    if (path === '/dev/audio-test' || params.get('dev') === 'audio-test') {
      return 'dev_audio';
    }
    if (path === '/dev/exercises' || params.get('dev') === 'exercises') {
      return 'dev_exercises';
    }
    if (params.get('autostart') === '1') {
      return 'app';
    }
    return 'landing';
  });

  const [activeTab, setActiveTab] = useState<AppTab>('map');
  const [activeLesson, setActiveLesson] = useState<CurriculumLesson | null>(null);
  const [dictionaryInitialQuery, setDictionaryInitialQuery] = useState<string>('');

  const [authToken, setAuthToken] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfileState>(DEFAULT_PROFILE);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [accuracyByLesson, setAccuracyByLesson] = useState<Record<string, number>>({});
  const [streak, setStreak] = useState<StreakState>({
    current: 0,
    best: 0,
    lastActiveDate: null,
    spareTireAvailable: true,
    spareTireUsedDate: null,
  });
  const [totalFuel, setTotalFuel] = useState<number>(0);
  const [todayMinutesCompleted, setTodayMinutesCompleted] = useState<number>(0);
  const [userRole, setUserRole] = useState<UserRole>('student');
  const [teacherAssignments, setTeacherAssignments] =
    useState<GroupAssignment[]>(INITIAL_ASSIGNMENTS);
  const [customPublishedLessons, setCustomPublishedLessons] = useState<
    CurriculumLesson[]
  >([]);
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [userWords, setUserWords] = useState<UserWordRecord[]>([]);
  const [reviewItems, setReviewItems] = useState<LeitnerReviewItem[]>(() =>
    getCachedGarageItemsOffline()
  );

  // Phase 4 state (empty in production; populated only when earned or in Demo Mode)
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [customDisclaimer, setCustomDisclaimer] = useState<string>(
    DEFAULT_CERTIFICATE_DISCLAIMER
  );
  const [leagueParticipants, setLeagueParticipants] = useState<LeagueParticipant[]>(
    SEED_LEAGUE_PARTICIPANTS
  );
  const [facultyBoard, setFacultyBoard] = useState<FacultyStanding[]>(
    SEED_FACULTY_BOARD
  );
  const [classChallenges, setClassChallenges] = useState<ClassChallenge[]>(
    SEED_CLASS_CHALLENGES
  );
  const [friends, setFriends] = useState<FriendConnection[]>(SEED_FRIENDS);
  const [optedOutOfLeaderboard, setOptedOutOfLeaderboard] = useState<boolean>(false);
  const [equippedCarSkin, setEquippedCarSkin] = useState<string>('car-madi-blue');
  const [equippedMascotOutfit, setEquippedMascotOutfit] =
    useState<string>('outfit-mechanic-cap');
  const [equippedMapTheme, setEquippedMapTheme] =
    useState<string>('theme-moscow-autumn');
  const [notifications, setNotifications] =
    useState<InAppNotificationItem[]>(SEED_NOTIFICATIONS);
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  // Toggle Demo Mode datasets cleanly
  useEffect(() => {
    if (demoMode) {
      setLeagueParticipants(DEMO_LEAGUE_PARTICIPANTS);
      setFacultyBoard(DEMO_FACULTY_BOARD);
      setClassChallenges(DEMO_CLASS_CHALLENGES);
      setFriends(DEMO_FRIENDS);
      setNotifications(DEMO_NOTIFICATIONS);
      setTeacherAssignments(DEMO_ASSIGNMENTS);
    } else {
      setLeagueParticipants(SEED_LEAGUE_PARTICIPANTS);
      setFacultyBoard(SEED_FACULTY_BOARD);
      setClassChallenges(SEED_CLASS_CHALLENGES);
      setFriends(SEED_FRIENDS);
      setNotifications(SEED_NOTIFICATIONS);
      setTeacherAssignments(INITIAL_ASSIGNMENTS);
      setUserRole((prev) => (isDevMode ? prev : 'student'));
    }
  }, [demoMode, isDevMode]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', profile.theme === 'dark');
  }, [profile.theme]);

  useEffect(() => {
    fetch('/api/curriculum').catch(() => {});
    fetch('/api/phase4/overview')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.certificates) && data.certificates.length > 0) {
          setCertificates(data.certificates);
        }
        if (typeof data.disclaimer === 'string') {
          setCustomDisclaimer(data.disclaimer);
        }
        if (Array.isArray(data.leagueParticipants)) {
          setLeagueParticipants(data.leagueParticipants);
        }
        if (Array.isArray(data.facultyStandings)) {
          setFacultyBoard(data.facultyStandings);
        }
        if (Array.isArray(data.classChallenges)) {
          setClassChallenges(data.classChallenges);
        }
        if (Array.isArray(data.friends)) {
          setFriends(data.friends);
        }
      })
      .catch(() => {});

    if (CURRICULUM_UNITS[0]) {
      cacheCurrentUnitOffline(CURRICULUM_UNITS[0]);
    }
  }, []);

  const averageLessonAccuracy = useMemo(() => {
    const vals = Object.values(accuracyByLesson) as number[];
    if (vals.length === 0) return 0;
    return Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length);
  }, [accuracyByLesson]);

  const badgeEvaluation = useMemo(() => {
    const highestBox = reviewItems.reduce((max, r) => Math.max(max, r.box), 0);
    const showroomCount = reviewItems.filter((r) => r.masteredShowroom).length;
    const bestExamScore = certificates.reduce(
      (max, c) => Math.max(max, c.scorePct),
      0
    );
    return evaluatePhase4Badges({
      streakDays: streak.current,
      perfectLessonsCount: (Object.values(accuracyByLesson) as number[]).filter(
        (a) => a === 100
      ).length,
      averageAccuracy: averageLessonAccuracy,
      bestExamScore,
      speakingClipsCompleted: 0,
      threeStarSpeakingClips: 0,
      roleplaysCompleted: 0,
      bestSpeakingScore: 0,
      typingTextsCompleted: 0,
      bestTypingCpm: 0,
      wordsLearnedCount: userWords.length,
      garageReviewsCompleted: reviewItems.filter((r) => r.streak > 0).length,
      highestLeitnerBox: highestBox,
      showroomCount,
      casesMasteredCount: 0,
      completedLessonsCount: completedLessonIds.length,
      friendsCount: friends.length,
      nudgesSentCount: friends.filter((f) => f.lastNudgedAt !== null).length,
      weeklyFuel: totalFuel,
      questsCompletedCount: 0,
      certificatesEarnedCount: certificates.length,
    });
  }, [
    streak.current,
    accuracyByLesson,
    averageLessonAccuracy,
    completedLessonIds.length,
    userWords.length,
    reviewItems,
    friends,
    totalFuel,
    certificates,
  ]);

  const learnerQuests = useMemo(() => {
    const weakCaseSet = Array.from(
      new Set(
        reviewItems
          .filter((r) => r.itemType === 'case' && r.categoryTag)
          .map((r) => r.categoryTag)
      )
    );
    const weakLetterSet = Array.from(
      new Set(
        reviewItems
          .filter((r) => r.itemType === 'letter' && r.correctAnswer)
          .map((r) => r.correctAnswer)
      )
    );
    return generatePersonalizedQuests({
      dueGarageCount: reviewItems.filter((r) => isReviewItemDue(r)).length,
      weakCases: weakCaseSet,
      weakLetters: weakLetterSet,
      todayMinutesCompleted,
      goalMinutes: profile.goalMinutes,
      completedLessonsCount: completedLessonIds.length,
      speakingClipsCompleted: 0,
      typingTextsCompleted: 0,
    });
  }, [
    reviewItems,
    todayMinutesCompleted,
    profile.goalMinutes,
    completedLessonIds.length,
  ]);

  const todayRecommendation = useMemo(() => {
    const ordered = getAllLessons();
    const nextLesson =
      ordered.find((l) => !completedLessonIds.includes(l.id)) || ordered[0];
    const weakCases = Array.from(
      new Set(
        reviewItems
          .filter((r) => r.itemType === 'case' && r.categoryTag)
          .map((r) => r.categoryTag)
      )
    );
    const weakLetters = Array.from(
      new Set(
        reviewItems
          .filter((r) => r.itemType === 'letter' && r.correctAnswer)
          .map((r) => r.correctAnswer)
      )
    );
    return computeTodayForYouRecommendation({
      dueGarageCount: reviewItems.filter((r) => isReviewItemDue(r)).length,
      pendingTeacherAssignmentsCount: teacherAssignments.length,
      nextAssignmentTitle: teacherAssignments[0]?.title,
      weakCases,
      weakLetters,
      avgSpeakingScore: 100,
      bestTypingCpm: 160,
      nextLessonTitle: nextLesson?.title,
      nextLessonId: nextLesson?.id || 'u1-l1',
    });
  }, [teacherAssignments, reviewItems, completedLessonIds]);

  const handleExecuteTodayRecommendation = (rec: TodayForYouRecommendation) => {
    if (rec.actionType === 'garage_review') {
      setActiveTab('typing_lab');
    } else if (rec.actionType === 'speaking_clip') {
      setActiveTab('typing_lab');
    } else if (rec.actionType === 'typing_drill') {
      setActiveTab('typing_lab');
    } else {
      const targetLesson =
        getAllLessons().find((l) => l.id === rec.targetId) || getAllLessons()[0];
      if (targetLesson) {
        handleStartLesson(targetLesson);
      }
    }
  };

  const handleIssueCertificate = async (params: {
    level: CefrLevel;
    nameLatin: string;
    nameCyrillic: string;
    scorePct: number;
  }): Promise<CertificateRecord | null> => {
    try {
      const resp = await fetch('/api/phase4/certificates/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id,
          level: params.level,
          studentNameLatin: params.nameLatin,
          studentNameCyrillic: params.nameCyrillic,
          scorePct: params.scorePct,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data.certificates)) {
          setCertificates(data.certificates);
        }
        return data.certificate || null;
      }
    } catch {
      // Fallback local issuance
    }
    const id = generateCertificateId(params.level, profile.id);
    const localCert: CertificateRecord = {
      id,
      userId: profile.id,
      level: params.level,
      studentNameLatin: params.nameLatin,
      studentNameCyrillic: params.nameCyrillic,
      scorePct: params.scorePct,
      scoreBand: computeCertificateScoreBand(params.scorePct) || 'Pass',
      issuedAt: new Date().toISOString(),
      verifyUrl: `/verify/${id}`,
      revoked: false,
      disclaimerText: customDisclaimer,
      signatureTeacher: 'Кафедра русского языка МАДИ (Подпись преподавателя)',
      signatureDepartment: 'Деканат подготовительного факультета МАДИ',
    };
    setCertificates((prev) => [
      localCert,
      ...prev.filter((c) => c.level !== params.level),
    ]);
    return localCert;
  };

  const handleRevokeCertificate = async (certId: string, reason: string) => {
    try {
      const resp = await fetch(`/api/phase4/certificates/${encodeURIComponent(certId)}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data.certificates)) {
          setCertificates(data.certificates);
          return;
        }
      }
    } catch {}
    setCertificates((prev) =>
      prev.map((c) =>
        c.id === certId ? { ...c, revoked: true, revokedReason: reason } : c
      )
    );
  };

  const handleUpdateDisclaimer = async (nextText: string) => {
    setCustomDisclaimer(nextText);
    try {
      await fetch('/api/phase4/certificates/disclaimer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disclaimer: nextText }),
      });
    } catch {}
  };

  const handleExportGdprJson = async () => {
    try {
      const resp = await fetch('/api/phase4/gdpr-export');
      const data = await resp.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `madingo-gdpr-data-export-${profile.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {}
  };

  const applyServerDashboard = (dashboard: any) => {
    if (!dashboard) return;
    if (dashboard.profile) {
      const nextLang = (dashboard.profile.uiLang || lang) as SupportedLang;
      setProfile({
        id: dashboard.profile.id,
        email: dashboard.profile.email,
        displayName: dashboard.profile.displayName,
        uiLang: nextLang,
        goalMinutes: dashboard.profile.goalMinutes || 10,
        avatarId: dashboard.profile.avatarId || 'misha-cap',
        soundEnabled: dashboard.profile.soundEnabled ?? true,
        notificationsEnabled: dashboard.profile.notificationsEnabled ?? true,
        theme: dashboard.profile.theme === 'dark' ? 'dark' : 'light',
      });
      if (['ru', 'en', 'ar', 'fr'].includes(nextLang)) {
        setLang(nextLang);
      }
    }
    if (Array.isArray(dashboard.progress)) {
      const ids: string[] = [];
      const accMap: Record<string, number> = {};
      for (const p of dashboard.progress) {
        if (p.status === 'completed') {
          ids.push(p.lessonId);
          accMap[p.lessonId] = p.accuracy ?? 100;
        }
      }
      setCompletedLessonIds(ids);
      setAccuracyByLesson(accMap);
    }
    if (dashboard.streak) {
      setStreak(dashboard.streak);
    }
    if (typeof dashboard.totalFuel === 'number') {
      setTotalFuel(dashboard.totalFuel);
    }
    if (typeof dashboard.todayMinutesCompleted === 'number') {
      setTodayMinutesCompleted(dashboard.todayMinutesCompleted);
    }
    if (Array.isArray(dashboard.mistakes)) {
      setMistakes(dashboard.mistakes);
    }
    if (Array.isArray(dashboard.userWords)) {
      setUserWords(dashboard.userWords);
    }
    if (Array.isArray(dashboard.reviewItems)) {
      setReviewItems(dashboard.reviewItems);
      cacheGarageItemsOffline(dashboard.reviewItems);
    }
  };

  const handleAuthenticated = (token: string, dashboard: any) => {
    setAuthToken(token);
    applyServerDashboard(dashboard);
    setScreen('app');
    setActiveTab('map');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) return;
      try {
        const idToken = await firebaseUser.getIdToken();
        const res = await fetch('/api/auth/firebase-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            displayName: firebaseUser.displayName || 'MADI Student',
            uiLang: lang,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setAuthToken(data.token || idToken);
          applyServerDashboard(data.dashboard);
          setScreen((prev) =>
            prev === 'landing' || prev === 'login' || prev === 'onboarding'
              ? 'app'
              : prev
          );
        }
      } catch {
        // Ignore silent background sync errors
      }
    });
    return () => unsubscribe();
  }, []);

  const handleStartLesson = (lesson: CurriculumLesson) => {
    const unit = CURRICULUM_UNITS.find((u) => u.id === lesson.unitId);
    if (unit) {
      cacheCurrentUnitOffline(unit);
    }
    setActiveLesson(lesson);
    setScreen('lesson');
  };

  const handleRecordMistake = async (payload: {
    stepId: string;
    lessonId: string;
    promptPreview: string;
    correctAnswer: string;
    caseTag?: string;
    letterTag?: string;
  }) => {
    const nowIso = new Date().toISOString();

    setMistakes((prev) => {
      const existing = prev.find((m) => m.stepId === payload.stepId);
      if (existing) {
        return prev.map((m) =>
          m.stepId === payload.stepId ? { ...m, times: m.times + 1 } : m
        );
      }
      return [
        {
          id: Date.now(),
          stepId: payload.stepId,
          lessonId: payload.lessonId,
          promptPreview: payload.promptPreview,
          correctAnswer: payload.correctAnswer,
          times: 1,
        },
        ...prev,
      ];
    });

    setReviewItems((prev) => {
      const existing = prev.find((r) => r.itemRef === payload.stepId);
      const nextList: LeitnerReviewItem[] = existing
        ? prev.map((r) =>
            r.itemRef === payload.stepId
              ? {
                  ...r,
                  box: 1,
                  streak: 0,
                  masteredShowroom: false,
                  dueAt: nowIso,
                  lastResult: 'wrong',
                  failCount: (r.failCount || 0) + 1,
                }
              : r
          )
        : [
            {
              itemType: payload.caseTag
                ? 'case'
                : payload.letterTag
                ? 'letter'
                : 'word',
              itemRef: payload.stepId,
              promptPreview: payload.promptPreview,
              correctAnswer: payload.correctAnswer,
              categoryTag: payload.caseTag || payload.lessonId,
              box: 1,
              dueAt: nowIso,
              streak: 0,
              masteredShowroom: false,
              lastResult: 'wrong',
              failCount: 1,
            },
            ...prev,
          ];
      cacheGarageItemsOffline(nextList);
      return nextList;
    });

    if (authToken) {
      try {
        const res = await fetch('/api/me/mistake', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          applyServerDashboard(data);
        }
      } catch {
        // Offline tolerance
      }
    }
  };

  const handleCompleteLesson = async (payload: {
    lessonId: string;
    accuracy: number;
    fuelEarned: number;
    openNextLesson?: boolean;
  }) => {
    const finishedLesson = getAllLessons().find((l) => l.id === payload.lessonId);
    if (finishedLesson) {
      cacheCompletedLessonOffline(finishedLesson);
    }

    setCompletedLessonIds((prev) =>
      prev.includes(payload.lessonId) ? prev : [...prev, payload.lessonId]
    );
    setAccuracyByLesson((prev) => ({
      ...prev,
      [payload.lessonId]: payload.accuracy,
    }));
    setTotalFuel((f) => f + payload.fuelEarned);
    setTodayMinutesCompleted((m) =>
      Math.min(profile.goalMinutes, m + (finishedLesson?.estimatedMinutes || 5))
    );
    const todayStr = new Date().toISOString().slice(0, 10);
    setStreak((prev) => updateStreakOdometer(prev, todayStr));

    if (authToken) {
      try {
        const res = await fetch('/api/me/lesson-complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          applyServerDashboard(data);
        }
      } catch {
        // Offline tolerance
      }
    }

    if (payload.openNextLesson) {
      const all = getAllLessons();
      const idx = all.findIndex((l) => l.id === payload.lessonId);
      const next = idx >= 0 && idx + 1 < all.length ? all[idx + 1] : null;
      if (next) {
        setActiveLesson(next);
        setScreen('lesson');
        return;
      }
    }

    setActiveLesson(null);
    setScreen('app');
    setActiveTab('map');
  };

  const handleToggleUserWord = async (payload: {
    wordId: string;
    status?: 'learning' | 'known' | 'garage';
    isFavorite?: boolean;
  }) => {
    const nowIso = new Date().toISOString();

    setUserWords((prev) => {
      const existing = prev.find((w) => w.wordId === payload.wordId);
      if (existing) {
        return prev.map((w) =>
          w.wordId === payload.wordId
            ? {
                ...w,
                status: payload.status ?? w.status,
                isFavorite: payload.isFavorite ?? w.isFavorite,
              }
            : w
        );
      }
      return [
        ...prev,
        {
          wordId: payload.wordId,
          status: payload.status || 'learning',
          isFavorite: Boolean(payload.isFavorite),
        },
      ];
    });

    if (payload.status === 'garage') {
      setReviewItems((prev) => {
        if (prev.some((r) => r.itemRef === payload.wordId)) return prev;
        const nextList: LeitnerReviewItem[] = [
          {
            itemType: 'word',
            itemRef: payload.wordId,
            promptPreview: 'Dictionary Garage Word',
            correctAnswer: payload.wordId,
            categoryTag: 'dictionary',
            box: 1,
            dueAt: nowIso,
            streak: 0,
            masteredShowroom: false,
            lastResult: 'correct',
            failCount: 0,
          },
          ...prev,
        ];
        cacheGarageItemsOffline(nextList);
        return nextList;
      });
    }

    if (authToken) {
      try {
        const res = await fetch('/api/me/words', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          applyServerDashboard(data);
        }
      } catch {
        // Offline tolerance
      }
    }
  };

  const handleAddSpeakingOrLibraryWordToGarage = (
    russianWord: string,
    translationPrompt?: string
  ) => {
    const cleanWord = russianWord.trim();
    if (!cleanWord) return;
    const nowIso = new Date().toISOString();
    setReviewItems((prev) => {
      if (prev.some((r) => r.correctAnswer === cleanWord || r.itemRef === cleanWord)) {
        return prev;
      }
      const nextList: LeitnerReviewItem[] = [
        {
          itemType: 'word',
          itemRef: `garage-${Date.now()}-${cleanWord.slice(0, 12)}`,
          promptPreview: translationPrompt || `Speaking / Library: ${cleanWord}`,
          correctAnswer: cleanWord,
          categoryTag: 'speaking_library',
          box: 1,
          dueAt: nowIso,
          streak: 0,
          masteredShowroom: false,
          lastResult: 'wrong',
          failCount: 1,
        },
        ...prev,
      ];
      cacheGarageItemsOffline(nextList);
      return nextList;
    });
  };

  const handleCompleteReviewSession = async (
    outcomes: { itemRef: string; wasCorrect: boolean }[]
  ) => {
    const now = new Date();
    const correctCount = outcomes.filter((o) => o.wasCorrect).length;
    setTotalFuel((f) => f + correctCount * 5);

    setReviewItems((prev) => {
      const outcomeMap = new globalThis.Map(
        outcomes.map((o) => [o.itemRef, o.wasCorrect])
      );
      const nextList = prev.map((item) => {
        if (!outcomeMap.has(item.itemRef)) return item;
        return advanceLeitnerItem(item, Boolean(outcomeMap.get(item.itemRef)), now);
      });
      cacheGarageItemsOffline(nextList);
      return nextList;
    });

    queueOfflineGarageReview(
      outcomes.map((o) => ({ itemId: o.itemRef, isCorrect: o.wasCorrect }))
    );

    if (authToken) {
      try {
        const res = await fetch('/api/me/garage/review', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ outcomes }),
        });
        if (res.ok) {
          const data = await res.json();
          applyServerDashboard(data);
        }
      } catch {
        // Offline tolerance
      }
    }
  };

  const handleSaveTypingResult = async (payload: {
    textId: string;
    mode: TypingLabMode;
    cpm: number;
    accuracy: number;
    durationSeconds: number;
    mistakesByLetter: Record<string, number>;
    fuelEarned: number;
  }) => {
    setTotalFuel((f) => f + payload.fuelEarned);

    if (authToken) {
      try {
        const res = await fetch('/api/me/typing-result', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          applyServerDashboard(data);
        }
      } catch {
        // Offline tolerance
      }
    }
  };

  const handleSaveSettings = async (updates: Partial<UserProfileState>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
    if (updates.uiLang) {
      setLang(updates.uiLang);
    }
    if (authToken) {
      try {
        const res = await fetch('/api/me/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(updates),
        });
        if (res.ok) {
          const data = await res.json();
          applyServerDashboard(data);
        }
      } catch {
        // Offline tolerance
      }
    }
  };

  const handleLogout = () => {
    signOut(auth).catch(() => {});
    setAuthToken(null);
    setScreen('landing');
  };

  const handleDeleteAccount = async () => {
    if (authToken) {
      try {
        await fetch('/api/me', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch {
        // ignore
      }
    }
    setAuthToken(null);
    setCompletedLessonIds([]);
    setAccuracyByLesson({});
    setTotalFuel(0);
    setMistakes([]);
    setUserWords([]);
    setReviewItems([]);
    setScreen('landing');
  };

  const dueGarageCount = useMemo(() => {
    if (reviewItems.length > 0) {
      return reviewItems.filter((r) => isReviewItemDue(r)).length;
    }
    return mistakes.length;
  }, [reviewItems, mistakes]);

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  return (
    <>
      {demoMode && (
        <div
          data-testid="demo-mode-global-banner"
          role="status"
          className="sticky top-0 z-50 bg-amber-400 text-slate-950 px-4 py-1.5 text-xs font-display font-extrabold flex items-center justify-between gap-3 border-b border-amber-600"
        >
          <span>Demo data - not real users</span>
          <button
            type="button"
            onClick={() => setDemoMode(false)}
            className="px-2.5 py-0.5 rounded-lg bg-slate-950 text-white text-[11px] font-bold cursor-pointer"
          >
            Exit Demo Mode
          </button>
        </div>
      )}

      {audioError && (
        <div
          data-testid="global-audio-error-toast"
          role="alert"
          className="fixed bottom-20 end-4 z-50 max-w-md rounded-2xl bg-red-600 text-white p-4 shadow-2xl border border-red-400 flex items-start justify-between gap-3"
        >
          <div className="space-y-1 text-xs">
            <div className="font-display font-extrabold">
              {audioError.message}
            </div>
            <div className="opacity-90 font-mono text-[11px]">
              Text: &ldquo;{audioError.text}&rdquo;
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              data-testid="global-audio-retry-btn"
              onClick={() => {
                audioService.clearError();
                audioService.retryLast();
              }}
              className="px-3 py-1.5 rounded-xl bg-white text-red-700 font-display font-bold text-xs cursor-pointer"
            >
              {lang === 'ru' ? 'Повторить' : 'Retry'}
            </button>
            <button
              type="button"
              onClick={() => {
                audioService.clearError();
                setAudioError(null);
              }}
              className="px-2 py-1.5 rounded-xl bg-red-700 text-white text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <FlagPickerModal
        isOpen={!hasChosenInitialLang && screen !== 'dev_audio'}
        onSelectAndClose={(chosenLang) => confirmInitialLang(chosenLang)}
      />

      <OfflineIndicator />

      {screen === 'dev_audio' && (
        <DevAudioTestPage
          soundEnabled={profile.soundEnabled}
          onBackToApp={() => {
            window.history.pushState({}, '', '/');
            setScreen('app');
          }}
        />
      )}

      {screen === 'dev_exercises' && (
        <DevExercisesPage
          soundEnabled={profile.soundEnabled}
          onBackToApp={() => setScreen('app')}
        />
      )}

      {screen === 'landing' && (
        <LandingPage
          onStartOnboarding={() => setScreen('onboarding')}
          onLoginClick={() => setScreen('login')}
          onSelectLang={(nextLang) => {
            confirmInitialLang(nextLang);
          }}
          onOpenPrivacy={() => setShowLegalModal(true)}
          onOpenTerms={() => setShowLegalModal(true)}
          onOpenContact={() => setShowContactModal(true)}
        />
      )}

      {(screen === 'onboarding' || screen === 'login') && (
        <OnboardingFlow
          initialMode={screen === 'login' ? 'login' : 'onboarding'}
          onBackToLanding={() => setScreen('landing')}
          onAuthenticated={handleAuthenticated}
        />
      )}

      {screen === 'lesson' && activeLesson && (
        <LessonPlayer
          lesson={activeLesson}
          soundEnabled={profile.soundEnabled}
          onExitToMap={() => {
            setActiveLesson(null);
            setScreen('app');
          }}
          onRecordMistake={handleRecordMistake}
          onCompleteLesson={handleCompleteLesson}
        />
      )}

      {screen === 'app' && (
        <div className="min-h-screen flex flex-col bg-[var(--surface-canvas)] text-[var(--text-primary)]">
          <header className="sticky top-0 z-30 h-14 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6">
            <div className="max-w-6xl mx-auto h-full flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('map')}
                className="cursor-pointer shrink-0"
              >
                <MadingoWordmark size="sm" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="header-notifications-btn"
                  onClick={() => setShowNotificationsDrawer(true)}
                  aria-label="Open Notifications Center"
                  className="relative w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -end-1 min-w-[16px] h-4 px-1 rounded-full bg-accent-orange text-brand-navy text-[10px] font-extrabold flex items-center justify-center">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 pb-20">
            {activeTab === 'map' && (
              <RoadMapView
                completedLessonIds={completedLessonIds}
                accuracyByLesson={accuracyByLesson}
                streak={streak}
                totalFuel={totalFuel}
                goalMinutes={profile.goalMinutes}
                todayMinutesCompleted={todayMinutesCompleted}
                soundEnabled={profile.soundEnabled}
                dueGarageCount={dueGarageCount}
                teacherAssignments={teacherAssignments}
                customPublishedLessons={customPublishedLessons}
                todayRecommendation={todayRecommendation}
                onExecuteRecommendation={handleExecuteTodayRecommendation}
                equippedCarSkin={equippedCarSkin}
                equippedMapTheme={equippedMapTheme}
                onStartLesson={handleStartLesson}
                onOpenGarage={() => setActiveTab('typing_lab')}
                onOpenDictionary={() => setActiveTab('dictionary')}
                onOpenDevExercises={() => setScreen('dev_exercises')}
                onOpenExamsAndPlacement={() => setActiveTab('arena')}
                onOpenLeaguesAndBadges={() => setActiveTab('arena')}
              />
            )}


            {activeTab === 'dictionary' && (
              <DictionaryView
                soundEnabled={profile.soundEnabled}
                userWords={userWords}
                initialQuery={dictionaryInitialQuery}
                onToggleUserWord={handleToggleUserWord}
                onAddWordToGarage={handleAddSpeakingOrLibraryWordToGarage}
                onOpenLessonById={handleStartLesson}
              />
            )}

            {activeTab === 'typing_lab' && (
              <TypingLabView
                soundEnabled={profile.soundEnabled}
                onSaveResult={handleSaveTypingResult}
              />
            )}

            {(activeTab === 'arena' || activeTab === 'leagues') && (
              <AIClassroomArenaView
                currentUserId={profile.id}
                currentUserName={profile.displayName}
                currentUserAvatar={profile.avatarId}
                userRole={userRole}
                soundEnabled={profile.soundEnabled}
              />
            )}


            {activeTab === 'library' && (
              <LibraryView
                soundEnabled={profile.soundEnabled}
                userRole={userRole}
                userName={profile.displayName}
                onAddWordToGarage={handleAddSpeakingOrLibraryWordToGarage}
                onInspectWordInDictionary={(word) => {
                  setDictionaryInitialQuery(word || '');
                  setActiveTab('dictionary');
                }}
              />
            )}

            {activeTab === 'teacher' && (
              userRole === 'student' ? (
                <div
                  data-testid="teacher-route-forbidden"
                  className="max-w-xl mx-auto my-16 p-8 rounded-3xl bg-white dark:bg-slate-900 border border-red-300 dark:border-red-900 text-center space-y-4"
                >
                  <h2 className="text-xl font-display font-extrabold text-red-600">
                    Access Restricted (403)
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Student accounts cannot access Teacher, Content Reviewer, or Admin routes.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('map')}
                    className="min-h-[42px] px-4 rounded-xl bg-brand-blue text-white text-xs font-bold cursor-pointer"
                  >
                    Return to Road Map
                  </button>
                </div>
              ) : (
                <TeacherDashboardView
                  soundEnabled={profile.soundEnabled}
                  userRole={userRole}
                  userName={profile.displayName}
                  demoMode={demoMode}
                  onPublishCustomLesson={(lessonObj) => {
                    setCustomPublishedLessons((prev) => [...prev, lessonObj]);
                  }}
                  onAssignmentsUpdated={(nextAssignments) => {
                    setTeacherAssignments(nextAssignments);
                  }}
                />
              )
            )}

            {activeTab === 'profile' && (
              <ProfileSettingsView
                profile={profile}
                onSaveSettings={handleSaveSettings}
                onLogout={handleLogout}
                onDeleteAccount={handleDeleteAccount}
                onOpenLegalModal={() => setShowLegalModal(true)}
                onOpenContactModal={() => setShowContactModal(true)}
                onExportGdprJson={handleExportGdprJson}
              />
            )}
          </main>

          <nav
            aria-label="Primary Bottom Navigation"
            className="fixed bottom-0 inset-x-0 z-40 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800"
          >
            <div className="max-w-5xl mx-auto h-full flex items-center justify-around px-1 sm:px-2">
              {[
                { id: 'map' as const, icon: Map, label: t('nav.tabMap'), show: true },
                { id: 'dictionary' as const, icon: BookOpen, label: t('nav.tabDictionary'), show: true },
                { id: 'typing_lab' as const, icon: Keyboard, label: t('nav.tabTypingLab'), show: true },
                { id: 'arena' as const, icon: Swords, label: t('nav.tabArena'), show: true },
                { id: 'library' as const, icon: Library, label: t('nav.tabLibrary'), show: true },
                {
                  id: 'teacher' as const,
                  icon: GraduationCap,
                  label: t('nav.tabTeacher'),
                  show: userRole !== 'student',
                },
                { id: 'profile' as const, icon: User, label: t('nav.tabProfile'), show: true },
              ]
                .filter((item) => item.show)
                .map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-testid={`nav-tab-${item.id}`}
                      onClick={() => setActiveTab(item.id)}
                      className={`relative min-h-[48px] flex flex-col items-center justify-center rounded-xl transition cursor-pointer ${
                        active
                          ? 'text-brand-blue dark:text-accent-orange font-bold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[9px] sm:text-[10px] mt-0.5 truncate max-w-[60px]">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
            </div>
          </nav>
        </div>
      )}

      <NotificationsCenterDrawer
        isOpen={showNotificationsDrawer}
        onClose={() => setShowNotificationsDrawer(false)}
        notifications={notifications}
        onMarkAllRead={() =>
          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
        }
      />

      <LegalAndGdprModal
        isOpen={showLegalModal}
        onClose={() => setShowLegalModal(false)}
        onExportGdprJson={handleExportGdprJson}
      />

      <ContactMadiModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
      />
    </>
  );
};

export default function App() {
  return (
    <I18nProvider>
      <MadingoAppInner />
    </I18nProvider>
  );
}

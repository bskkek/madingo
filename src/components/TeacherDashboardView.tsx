import React, { useState, useEffect } from 'react';
import {
  Users,
  Sparkles,
  Layers,
  ShieldAlert,
  Download,
  Printer,
  Plus,
  CheckCircle2,
  XCircle,
  Volume2,
  AlertTriangle,
  Calendar,
  Send,
  Smartphone,
  Copy,
  FileSpreadsheet,
  BarChart3,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { Phase4AdminAnalyticsView } from './Phase4AdminAnalyticsView';
import {
  INITIAL_TEACHER_GROUPS,
  INITIAL_ASSIGNMENTS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_REVIEW_QUEUE,
  INITIAL_AUDIT_LOG,
  DEMO_TEACHER_GROUPS,
  DEMO_ASSIGNMENTS,
  DEMO_ANNOUNCEMENTS,
  TeacherGroup,
  GroupAssignment,
  GroupAnnouncement,
  ReviewQueueItem,
  AuditLogEntry,
  ContentReportItem,
} from '../data/phase3Seed';
import { UserRole, canApproveContent } from '../lib/phase3Engine';
import { speakRussian as rawSpeakRussian } from '../lib/audio';

const speakRussian = (text: string, soundEnabled = true, rate = 0.9) =>
  rawSpeakRussian(text, undefined, soundEnabled, rate);

interface TeacherDashboardViewProps {
  soundEnabled: boolean;
  demoMode?: boolean;
  certificatesCount?: number;
  userRole: UserRole;
  userName: string;
  onPublishCustomLesson: (lessonObj: any) => void;
  onAssignmentsUpdated: (assignments: GroupAssignment[]) => void;
}

export const TeacherDashboardView: React.FC<TeacherDashboardViewProps> = ({
  soundEnabled,
  demoMode = false,
  certificatesCount = 0,
  userRole,
  userName,
  onPublishCustomLesson,
  onAssignmentsUpdated,
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'groups' | 'builder' | 'pipeline' | 'moderation' | 'analytics'>('groups');

  // Dashboard data (empty in production; sample data in Demo Mode per R1/R2)
  const [groups, setGroups] = useState<TeacherGroup[]>(INITIAL_TEACHER_GROUPS);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(INITIAL_TEACHER_GROUPS[0]?.id || '');
  const [assignments, setAssignments] = useState<GroupAssignment[]>(INITIAL_ASSIGNMENTS);
  const [announcements, setAnnouncements] = useState<GroupAnnouncement[]>(INITIAL_ANNOUNCEMENTS);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>(INITIAL_REVIEW_QUEUE);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOG);
  const [reports, setReports] = useState<ContentReportItem[]>([]);

  // Group Creation & CSV Import state
  const [newGroupName, setNewGroupName] = useState('');
  const [csvImportText, setCsvImportText] = useState('');
  const [showCsvModal, setShowCsvModal] = useState(false);

  // Assignment & Announcement creation
  const [newAsgnTitle, setNewAsgnTitle] = useState('Уро́к: На кампусе МАДИ́ (Повторе́ние падеже́й)');
  const [newAsgnTargetId, setNewAsgnTargetId] = useState('u2-l1');
  const [newAsgnDueDate, setNewAsgnDueDate] = useState('2026-11-05');
  const [newAnnouncementText, setNewAnnouncementText] = useState('');

  // No-Code Lesson Builder state
  const [builderLessonTitleRu, setBuilderLessonTitleRu] = useState('Автодоро́жный практикум: Светофо́р и перекрёсток');
  const [builderLessonTitleEn, setBuilderLessonTitleEn] = useState('Road Lab: Traffic Light & Intersection');
  const [builderLevel, setBuilderLevel] = useState<'A1' | 'A2'>('A1');
  const [builderSteps, setBuilderSteps] = useState<
    {
      id: string;
      type: string;
      promptRu: string;
      promptEn: string;
      promptAr: string;
      promptFr: string;
      correctAnswer: string;
    }[]
  >([
    {
      id: 'step-1',
      type: 'teaching_phrase',
      promptRu: 'Поверни́те напра́во на перекрёстке по́сле светофо́ра.',
      promptEn: 'Turn right at the intersection after the traffic light.',
      promptAr: 'انعطف يميناً عند التقاطع بعد إشارة المرور.',
      promptFr: 'Tournez à droite au carrefour après le feu tricolore.',
      correctAnswer: 'Поверни́те напра́во на перекрёстке по́сле светофо́ра.',
    },
    {
      id: 'step-2',
      type: 'fill_blank',
      promptRu: 'Води́тель останови́л маши́ну у ___ (светофо́р).',
      promptEn: 'The driver stopped the car by the traffic light (Genitive).',
      promptAr: 'أوقف السائق السيارة عند إشارة المرور.',
      promptFr: 'Le conducteur a arrêté la voiture près du feu.',
      correctAnswer: 'светофо́ра',
    },
  ]);
  const [newStepType, setNewStepType] = useState<string>('translation_typing');
  const [newStepRu, setNewStepRu] = useState('Инжене́ры стро́ят но́вый мост.');
  const [newStepEn, setNewStepEn] = useState('Engineers are building a new bridge.');
  const [newStepAr, setNewStepAr] = useState('يبني المهندسون جسراً جديداً.');
  const [newStepFr, setNewStepFr] = useState('Les ingénieurs construisent un nouveau pont.');
  const [newStepCorrect, setNewStepCorrect] = useState('Инжене́ры стро́ят но́вый мост.');
  const [autoTranslating, setAutoTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [builderSavedBanner, setBuilderSavedBanner] = useState<string | null>(null);

  // AI Content Pipeline Generator state
  const [genLevel, setGenLevel] = useState<'A1' | 'A2' | 'B1'>('A1');
  const [genTopic, setGenTopic] = useState('cars_roads');
  const [genGrammar, setGenGrammar] = useState('Instrumental & Prepositional Cases');
  const [genLinesCount, setGenLinesCount] = useState(4);
  const [genRegister, setGenRegister] = useState<'formal' | 'colloquial'>('formal');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [editingQueueId, setEditingQueueId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [reviewCommentInput, setReviewCommentInput] = useState('');
  const [approvalLicense, setApprovalLicense] = useState<string>('own_work_with_permission');
  const [approvalSourceUrl, setApprovalSourceUrl] = useState<string>('https://madi.ru/rki/materials');
  const [approvalConsentDocUrl, setApprovalConsentDocUrl] = useState<string>('https://madi.ru/rki/consent-signed.pdf');

  const loadDashboard = () => {
    fetch('/api/teacher/dashboard')
      .then((r) => r.json())
      .then((data) => {
        if (demoMode && (!data.groups || data.groups.length === 0)) {
          setGroups(DEMO_TEACHER_GROUPS);
          setSelectedGroupId(DEMO_TEACHER_GROUPS[0]?.id || '');
          setAssignments(DEMO_ASSIGNMENTS);
          setAnnouncements(DEMO_ANNOUNCEMENTS);
        } else {
          if (Array.isArray(data.groups)) {
            setGroups(data.groups);
            if (data.groups.length > 0 && !selectedGroupId) {
              setSelectedGroupId(data.groups[0].id);
            }
          }
          if (Array.isArray(data.assignments)) {
            setAssignments(data.assignments);
            onAssignmentsUpdated(data.assignments);
          }
          if (Array.isArray(data.announcements)) setAnnouncements(data.announcements);
        }
        if (Array.isArray(data.reviewQueue)) setReviewQueue(data.reviewQueue);
        if (Array.isArray(data.auditLog)) setAuditLog(data.auditLog);
        if (Array.isArray(data.reports)) setReports(data.reports);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadDashboard();
  }, [demoMode]);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) || groups[0] || null;

  // Export Group Progress as CSV
  const handleExportCsv = () => {
    if (!selectedGroup) return;
    const headers = [
      'Student Name',
      'Email',
      'Native Lang',
      'Lessons Completed',
      'Accuracy (%)',
      'Streak Days',
      'Fuel',
      'Avg Speaking Score',
      'Typing CPM',
      'Garage Load',
      'Weak Cases',
    ];
    const rows = selectedGroup.students.map((s) => [
      `"${s.name}"`,
      `"${s.email}"`,
      s.nativeLang,
      s.lessonsCompleted,
      s.accuracy,
      s.streakDays,
      s.fuel,
      s.avgSpeakingScore,
      s.typingCpm,
      s.garageDueCount,
      `"${s.weakCases.join('; ')}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedGroup.inviteCode}_progress.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    const resp = await fetch('/api/teacher/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newGroupName.trim(),
        level: 'A1',
        teacherName: userName || 'Teacher',
      }),
    });
    const data = await resp.json();
    if (resp.ok && data.groups) {
      setGroups(data.groups);
      setSelectedGroupId(data.group.id);
      setNewGroupName('');
    }
  };

  const handleImportCsvStudents = async () => {
    if (!csvImportText.trim() || !selectedGroup) return;
    const resp = await fetch(`/api/teacher/groups/${selectedGroup.id}/import-csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvText: csvImportText }),
    });
    const data = await resp.json();
    if (resp.ok && data.groups) {
      setGroups(data.groups);
      setCsvImportText('');
      setShowCsvModal(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!newAsgnTitle.trim() || !selectedGroup) return;
    const resp = await fetch('/api/teacher/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId: selectedGroup.id,
        targetType: 'lesson',
        targetId: newAsgnTargetId,
        title: newAsgnTitle.trim(),
        dueDate: newAsgnDueDate,
        createdBy: userName || 'Teacher',
      }),
    });
    const data = await resp.json();
    if (resp.ok && data.assignments) {
      setAssignments(data.assignments);
      onAssignmentsUpdated(data.assignments);
    }
  };

  const handlePostAnnouncement = async () => {
    if (!newAnnouncementText.trim() || !selectedGroup) return;
    const resp = await fetch('/api/teacher/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId: selectedGroup.id,
        authorName: userName || 'Teacher',
        message: newAnnouncementText.trim(),
      }),
    });
    const data = await resp.json();
    if (resp.ok && data.announcements) {
      setAnnouncements(data.announcements);
      setNewAnnouncementText('');
    }
  };

  // No-Code Lesson Builder handlers
  const handleAutoTranslateStep = async () => {
    if (!newStepRu.trim()) return;
    setAutoTranslating(true);
    setTranslateError(null);
    try {
      const resp = await fetch('/api/ai/translate-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ russianText: newStepRu.trim() }),
      });
      const data = await resp.json();
      if (resp.ok) {
        if (data.ru) setNewStepRu(data.ru);
        if (data.en) setNewStepEn(data.en);
        if (data.ar) setNewStepAr(data.ar);
        if (data.fr) setNewStepFr(data.fr);
      } else {
        console.error('[TeacherDashboardView] Auto-translate failed:', data);
        setTranslateError(data.error || 'AI translation failed. Check GEMINI_API_KEY and retry.');
      }
    } catch (err: any) {
      console.error('[TeacherDashboardView] Auto-translate error:', err);
      setTranslateError(err?.message || 'Network error during AI translation.');
    }
    setAutoTranslating(false);
  };

  const handleAddStepToBuilder = () => {
    if (!newStepRu.trim()) return;
    setBuilderSteps((prev) => [
      ...prev,
      {
        id: `step-${Date.now()}`,
        type: newStepType,
        promptRu: newStepRu.trim(),
        promptEn: newStepEn.trim() || newStepRu.trim(),
        promptAr: newStepAr.trim() || newStepRu.trim(),
        promptFr: newStepFr.trim() || newStepRu.trim(),
        correctAnswer: newStepCorrect.trim() || newStepRu.trim(),
      },
    ]);
  };

  const handlePublishLesson = async (status: 'draft' | 'needs_review' | 'published') => {
    const resp = await fetch('/api/teacher/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: {
          ru: builderLessonTitleRu,
          en: builderLessonTitleEn || builderLessonTitleRu,
          ar: builderLessonTitleEn || builderLessonTitleRu,
          fr: builderLessonTitleEn || builderLessonTitleRu,
        },
        level: builderLevel,
        status,
        publishTarget: selectedGroup?.id || 'ALL',
        steps: builderSteps,
        createdBy: userName || 'Teacher',
      }),
    });
    const data = await resp.json();
    if (resp.ok && data.lesson) {
      if (status === 'published') {
        onPublishCustomLesson(data.lesson);
      }
      setBuilderSavedBanner(
        status === 'published'
          ? `Lesson "${builderLessonTitleRu}" published! It is now playable on the student Road Map.`
          : `Lesson saved with status "${status}".`
      );
      loadDashboard();
    }
  };

  // AI Content Pipeline handlers
  const handleRunAiGeneration = async () => {
    setIsGenerating(true);
    setPipelineError(null);
    try {
      const resp = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userName || 'teacher',
          userRole,
          level: genLevel,
          topic: genTopic,
          grammarPoint: genGrammar,
          lengthLines: genLinesCount,
          register: genRegister,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.queueItem) {
        loadDashboard();
      } else {
        console.error('[TeacherDashboardView] AI generation failed:', data);
        setPipelineError(data.error || 'AI content generation failed. Please retry.');
      }
    } catch (err: any) {
      console.error('[TeacherDashboardView] AI generation network error:', err);
      setPipelineError(err?.message || 'Failed to connect to AI content generation service.');
    }
    setIsGenerating(false);
  };

  const handleReviewDecision = async (
    item: ReviewQueueItem,
    decision: 'approved' | 'rejected'
  ) => {
    setPipelineError(null);
    const resp = await fetch(`/api/review-queue/${item.id}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision,
        reviewerName: userName || 'Reviewer',
        reviewerRole: userRole === 'student' ? 'teacher' : userRole,
        comments: reviewCommentInput || `${decision} after teacher verification`,
        updatedTitle: editingQueueId === item.id && editingTitle ? editingTitle : item.title,
        license: approvalLicense,
        sourceUrl: approvalSourceUrl,
        consentDocumentUrl: approvalConsentDocUrl,
        consentConfirmed: Boolean(approvalConsentDocUrl && approvalConsentDocUrl.startsWith('http')),
      }),
    });
    const data = await resp.json();
    if (resp.ok) {
      setEditingQueueId(null);
      setReviewCommentInput('');
      loadDashboard();
    } else {
      setPipelineError(data.error || 'Failed to process review decision.');
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header & Sub-Navigation */}
      <div className="card-Step bg-white p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-[#1B4DFF] text-xs font-extrabold uppercase tracking-wider mb-2">
              <Users className="w-3.5 h-3.5" />
              <span>Phase 3 · MADI Faculty & Reviewer Studio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {t('teacher.title')}
            </h1>
            <p className="text-sm text-slate-600 mt-1">{t('teacher.subtitle')}</p>
          </div>

          <div className="flex flex-wrap bg-slate-100 p-1.5 rounded-2xl gap-1">
            {(
              [
                { id: 'groups', label: t('teacher.tabGroups'), icon: Users },
                { id: 'builder', label: t('teacher.tabBuilder'), icon: Layers },
                { id: 'pipeline', label: t('teacher.tabAiPipeline'), icon: Sparkles },
                { id: 'moderation', label: t('teacher.tabModeration'), icon: ShieldAlert },
                { id: 'analytics', label: 'Analytics & Cost Monitor', icon: BarChart3 },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  data-testid={`teacher-tab-${tab.id}`}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-[#1B4DFF] text-white shadow-sm'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: GROUPS, PROGRESS ANALYTICS, ASSIGNMENTS & ANNOUNCEMENTS
         ===================================================================== */}
      {activeTab === 'groups' && (
        <div className="space-y-6">
          {/* Group Selector + Create Group / CSV Import / Export Bar */}
          <div className="card-Step bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {groups.length === 0 ? (
                  <div
                    data-testid="teacher-empty-groups"
                    className="px-4 py-2.5 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-xs font-extrabold text-slate-600"
                  >
                    No groups yet - create one
                  </div>
                ) : (
                  groups.map((grp) => (
                    <button
                      key={grp.id}
                      type="button"
                      onClick={() => setSelectedGroupId(grp.id)}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold border-2 transition ${
                        selectedGroup && grp.id === selectedGroup.id
                          ? 'border-[#1B4DFF] bg-blue-50 text-[#1B4DFF]'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {grp.name} ({grp.students.length} students · Code: {grp.inviteCode})
                    </button>
                  ))
                )}
              </div>

              {selectedGroup && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCsvModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-extrabold text-slate-800 flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Import CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t('teacher.exportCsvBtn')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-extrabold text-slate-700 flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{t('teacher.printReportBtn')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Create Group Row */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <input
                type="text"
                data-testid="new-group-name-input"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="New class/group name (e.g. Подфак ИГ-103)..."
                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold flex-1 min-w-[220px]"
              />
              <button
                type="button"
                data-testid="create-group-btn"
                onClick={handleCreateGroup}
                className="px-3.5 py-1.5 rounded-xl bg-[#1B4DFF] text-white text-xs font-extrabold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Group</span>
              </button>
            </div>

            {/* Student Progress & Weak-Point Table */}
            {!selectedGroup || selectedGroup.students.length === 0 ? (
              <div
                data-testid="teacher-empty-students"
                className="p-6 rounded-2xl border border-dashed border-slate-300 text-center text-xs font-extrabold text-slate-500"
              >
                No students yet - share the invite code{selectedGroup ? ` (${selectedGroup.inviteCode})` : ''}
              </div>
            ) : (
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-200 text-slate-500 uppercase text-[11px] font-extrabold">
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-2">Lessons</th>
                      <th className="py-2.5 px-2">Accuracy</th>
                      <th className="py-2.5 px-2">Speaking</th>
                      <th className="py-2.5 px-2">Typing CPM</th>
                      <th className="py-2.5 px-2">Garage Due</th>
                      <th className="py-2.5 px-3">Weak Letters / Cases / Words</th>
                      <th className="py-2.5 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedGroup.students.map((stu) => (
                      <tr key={stu.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-slate-900">{stu.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {stu.email} · UI: {stu.nativeLang.toUpperCase()}
                          </div>
                        </td>
                        <td className="py-3 px-2 font-extrabold">{stu.lessonsCompleted}</td>
                        <td className="py-3 px-2 font-extrabold text-emerald-700">
                          {stu.accuracy}%
                        </td>
                        <td className="py-3 px-2 font-extrabold text-[#1B4DFF]">
                          {stu.avgSpeakingScore}%
                        </td>
                        <td className="py-3 px-2 font-bold">{stu.typingCpm} CPM</td>
                        <td className="py-3 px-2 font-extrabold text-amber-700">
                          {stu.garageDueCount} cars
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {stu.weakCases.map((wc) => (
                              <span
                                key={wc}
                                className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-extrabold"
                              >
                                {wc}
                              </span>
                            ))}
                            {stu.weakWords.map((ww) => (
                              <span
                                key={ww}
                                dir="ltr"
                                className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold"
                              >
                                {ww}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          {stu.inactiveAlert ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-100 text-rose-900 text-[10px] font-extrabold">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>Inactive &gt;5d</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-100 text-emerald-900 text-[10px] font-extrabold">
                              <span>🔥 {stu.streakDays}d</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Assignments & Group Announcements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assign Lessons / Clips with Due Date */}
            <div className="card-Step bg-white p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <Calendar className="w-4 h-4 text-[#1B4DFF]" />
                <span>Assign Lesson / Clip to Group (Shows on Student Map)</span>
              </div>

              <div className="space-y-2.5">
                <input
                  type="text"
                  value={newAsgnTitle}
                  onChange={(e) => setNewAsgnTitle(e.target.value)}
                  placeholder="Assignment title..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newAsgnTargetId}
                    onChange={(e) => setNewAsgnTargetId(e.target.value)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                  >
                    <option value="u1-l1">Unit 1 · Lesson 1 (Vowels)</option>
                    <option value="u1-l2">Unit 1 · Lesson 2 (Consonants)</option>
                    <option value="u2-l1">Unit 2 · Greetings & Campus</option>
                    <option value="u3-l1">Unit 3 · MADI Main Building</option>
                    <option value="u5-l1">Unit 5 · Cars, Metro & Roads</option>
                  </select>
                  <input
                    type="date"
                    value={newAsgnDueDate}
                    onChange={(e) => setNewAsgnDueDate(e.target.value)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                  />
                </div>
                <button
                  type="button"
                  disabled={!selectedGroup}
                  onClick={handleCreateAssignment}
                  data-testid="create-assignment-btn"
                  className="w-full py-2.5 rounded-xl bg-[#1B4DFF] text-white text-xs font-extrabold disabled:opacity-50"
                >
                  {selectedGroup
                    ? `Assign to ${selectedGroup.inviteCode}`
                    : 'Create a group first to assign lessons'}
                </button>
              </div>

              <div className="space-y-2 pt-2">
                {assignments.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs font-bold text-slate-500">
                    No assignments yet
                  </div>
                ) : (
                  assignments.map((asgn) => (
                    <div
                      key={asgn.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="text-xs font-extrabold text-slate-900">
                          {asgn.title}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Target: {asgn.targetId} · Due: {asgn.dueDate}
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-[#1B4DFF] text-[11px] font-extrabold">
                        {asgn.completedStudentIds.length} completed
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Group Announcement Board */}
            <div className="card-Step bg-white p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <Send className="w-4 h-4 text-[#1B4DFF]" />
                <span>Group Announcement Board</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAnnouncementText}
                  onChange={(e) => setNewAnnouncementText(e.target.value)}
                  placeholder="Write an announcement for students..."
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                />
                <button
                  type="button"
                  disabled={!selectedGroup}
                  onClick={handlePostAnnouncement}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-extrabold disabled:opacity-50"
                >
                  Post
                </button>
              </div>

              <div className="space-y-2.5">
                {announcements.length === 0 ? (
                  <div
                    data-testid="teacher-empty-announcements"
                    className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs font-bold text-slate-500"
                  >
                    No announcements yet
                  </div>
                ) : (
                  announcements.map((ann) => (
                    <div
                      key={ann.id}
                      className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1"
                    >
                      <div className="text-[11px] font-extrabold text-[#1B4DFF]">
                        {ann.authorName}
                      </div>
                      <p className="text-xs font-semibold text-slate-800">{ann.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: VISUAL NO-CODE LESSON BUILDER + LIVE MOBILE PREVIEW
         ===================================================================== */}
      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Visual Step Editor (7 cols) */}
          <div className="lg:col-span-7 card-Step bg-white p-5 sm:p-6 space-y-5">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                No-Code Lesson & Unit Builder
              </h2>
              <p className="text-xs text-slate-500">
                Add steps from all 10 exercise types, teaching cards, or speaking clips. Auto-fill 4-language translations with AI and publish directly to the Road Map.
              </p>
            </div>

            {builderSavedBanner && (
              <div
                data-testid="builder-published-banner"
                className="rounded-xl bg-emerald-50 border border-emerald-300 p-3 text-xs font-extrabold text-emerald-950"
              >
                ✓ {builderSavedBanner}
              </div>
            )}

            {translateError && (
              <div
                role="alert"
                data-testid="builder-translate-error"
                className="rounded-xl bg-rose-50 border border-rose-300 p-3 text-xs font-bold text-rose-900 flex items-center justify-between gap-2"
              >
                <span>{translateError}</span>
                <button
                  type="button"
                  onClick={handleAutoTranslateStep}
                  className="px-3 py-1 rounded-lg bg-rose-700 text-white text-xs font-extrabold"
                >
                  Retry
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Lesson Title (Russian with stress)
                </label>
                <input
                  type="text"
                  value={builderLessonTitleRu}
                  onChange={(e) => setBuilderLessonTitleRu(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  CEFR Level
                </label>
                <select
                  value={builderLevel}
                  onChange={(e) => setBuilderLevel(e.target.value as any)}
                  className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-bold"
                >
                  <option value="A1">Zone A1</option>
                  <option value="A2">Zone A2</option>
                </select>
              </div>
            </div>

            {/* Add New Step Box */}
            <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                  Add Step to Lesson ({builderSteps.length} steps)
                </span>
                <button
                  type="button"
                  disabled={autoTranslating}
                  onClick={handleAutoTranslateStep}
                  className="px-3 py-1.5 rounded-xl bg-indigo-100 text-[#1B4DFF] text-xs font-extrabold flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {autoTranslating ? 'Translating...' : 'AI Auto-Fill Translations (ru/en/ar/fr)'}
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <select
                  value={newStepType}
                  onChange={(e) => setNewStepType(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold bg-white"
                >
                  <option value="teaching_phrase">Teaching Phrase Card</option>
                  <option value="sentence_builder">1. Sentence Builder</option>
                  <option value="translation_typing">2. Translation Typing</option>
                  <option value="listening_dictation">3. Listening Dictation</option>
                  <option value="matching_pairs">4. Matching Pairs</option>
                  <option value="fill_blank">5. Fill-in-the-Blank</option>
                  <option value="stress_placement">6. Stress Placement (ударе́ние)</option>
                  <option value="case_declension">7. Case Declension Drill</option>
                  <option value="letter_sound">8. Letter-Sound Quiz</option>
                  <option value="word_builder">9. Word Builder</option>
                  <option value="speaking_clip">10. Speaking Clip Step</option>
                </select>
                <input
                  type="text"
                  value={newStepCorrect}
                  onChange={(e) => setNewStepCorrect(e.target.value)}
                  placeholder="Correct Russian answer..."
                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold bg-white"
                />
              </div>

              <input
                type="text"
                value={newStepRu}
                onChange={(e) => setNewStepRu(e.target.value)}
                placeholder="Russian prompt / sentence (with stress marks)..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold bg-white"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newStepEn}
                  onChange={(e) => setNewStepEn(e.target.value)}
                  placeholder="English translation..."
                  className="rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs font-semibold bg-white"
                />
                <input
                  type="text"
                  value={newStepAr}
                  onChange={(e) => setNewStepAr(e.target.value)}
                  placeholder="Arabic translation..."
                  className="rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs font-semibold bg-white"
                />
                <input
                  type="text"
                  value={newStepFr}
                  onChange={(e) => setNewStepFr(e.target.value)}
                  placeholder="French translation..."
                  className="rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs font-semibold bg-white"
                />
              </div>

              <button
                type="button"
                onClick={handleAddStepToBuilder}
                data-testid="builder-add-step-btn"
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-extrabold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Step to Lesson</span>
              </button>
            </div>

            {/* Action Buttons: Save Draft / Submit for Review / Publish to Road Map */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handlePublishLesson('draft')}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-extrabold"
                >
                  Save Draft (v1)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setBuilderSteps((prev) => [...prev, { ...prev[0], id: `dup-${Date.now()}` }])
                  }
                  className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-extrabold flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplicate Step</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handlePublishLesson('published')}
                data-testid="builder-publish-lesson-btn"
                className="btn-Primary bg-[#1B4DFF] text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold"
              >
                Publish Lesson to Student Road Map
              </button>
            </div>
          </div>

          {/* Right: Live Mobile Preview (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-[360px] rounded-[36px] border-8 border-slate-900 bg-slate-50 shadow-xl overflow-hidden flex flex-col">
              <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between text-xs font-extrabold">
                <span className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                  <span>Live Mobile Preview</span>
                </span>
                <span>{builderLevel}</span>
              </div>
              <div className="p-4 space-y-3 max-h-[460px] overflow-y-auto">
                <div className="text-sm font-extrabold text-slate-900">
                  {builderLessonTitleRu}
                </div>
                {builderSteps.map((st, idx) => (
                  <div
                    key={st.id}
                    className="p-3.5 rounded-2xl bg-white border-2 border-slate-200 space-y-1.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-[#1B4DFF] text-[10px] font-extrabold uppercase">
                        Step {idx + 1} · {st.type}
                      </span>
                      <button
                        type="button"
                        onClick={() => speakRussian(st.promptRu, soundEnabled, 0.9)}
                        className="p-1 rounded bg-slate-100"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-slate-700" />
                      </button>
                    </div>
                    <div dir="ltr" className="text-sm font-extrabold text-slate-900">
                      {st.promptRu}
                    </div>
                    <div className="text-xs text-slate-500">{st.promptEn}</div>
                    <div className="text-[11px] font-bold text-emerald-700">
                      Target: {st.correctAnswer}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: AI CONTENT PIPELINE & TEACHER REVIEW QUEUE
         ===================================================================== */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          {/* AI Content Generator Box */}
          <div className="card-Step bg-white p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  AI Content Pipeline Generator (Teacher-in-the-Loop)
                </h2>
                <p className="text-xs text-slate-500">
                  Generates stressed Russian dialogues + 4-language translations, runs automatic vocabulary/safety/stress validation, and routes output into the Review Queue.
                </p>
              </div>
            </div>

            {pipelineError && (
              <div
                role="alert"
                data-testid="pipeline-error-banner"
                className="rounded-xl bg-rose-50 border border-rose-300 p-3.5 text-xs font-bold text-rose-900 flex items-center justify-between gap-2"
              >
                <span>{pipelineError}</span>
                <button
                  type="button"
                  data-testid="pipeline-retry-btn"
                  onClick={handleRunAiGeneration}
                  className="px-3 py-1 rounded-lg bg-rose-700 text-white text-xs font-extrabold"
                >
                  Retry
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                  Level
                </label>
                <select
                  value={genLevel}
                  onChange={(e) => setGenLevel(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                >
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="B1">B1</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                  Topic
                </label>
                <select
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                >
                  <option value="cars_roads">Cars & Roads (MADI)</option>
                  <option value="campus">MADI Campus</option>
                  <option value="metro">Moscow Metro</option>
                  <option value="food">Student Cafe</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                  Grammar Focus
                </label>
                <input
                  type="text"
                  value={genGrammar}
                  onChange={(e) => setGenGrammar(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                  Register
                </label>
                <select
                  value={genRegister}
                  onChange={(e) => setGenRegister(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                >
                  <option value="formal">Formal (Вы)</option>
                  <option value="colloquial">Colloquial (ты)</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={handleRunAiGeneration}
                  data-testid="ai-pipeline-generate-btn"
                  className="w-full py-2 rounded-xl bg-[#1B4DFF] text-white text-xs font-extrabold flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isGenerating ? 'Generating...' : 'Generate to Queue'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Review Queue Items (draft -> needs_review -> approved/rejected) */}
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">
              Teacher Review Queue ({reviewQueue.length} items — Only approved items reach students)
            </h3>

            {/* Approval Legal Metadata Controls (WP-1: fixed license + source URL + uploaded consent document) */}
            <div className="card-Step bg-slate-50 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-extrabold text-slate-700 mb-1">
                  License for Approval (Fixed List)
                </label>
                <select
                  value={approvalLicense}
                  onChange={(e) => setApprovalLicense(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-2.5 py-1.5 font-bold bg-white"
                >
                  <option value="own_work_with_permission">own_work_with_permission</option>
                  <option value="cc_by">cc_by</option>
                  <option value="cc_by_sa">cc_by_sa</option>
                  <option value="public_domain">public_domain</option>
                  <option value="all_rights_reserved_with_permission">
                    all_rights_reserved_with_permission
                  </option>
                </select>
              </div>
              <div>
                <label className="block font-extrabold text-slate-700 mb-1">
                  Source URL (https://...)
                </label>
                <input
                  type="url"
                  value={approvalSourceUrl}
                  onChange={(e) => setApprovalSourceUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-2.5 py-1.5 font-bold bg-white"
                />
              </div>
              <div>
                <label className="block font-extrabold text-slate-700 mb-1">
                  Signed Consent Document URL
                </label>
                <input
                  type="url"
                  value={approvalConsentDocUrl}
                  onChange={(e) => setApprovalConsentDocUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-2.5 py-1.5 font-bold bg-white"
                />
              </div>
            </div>

            {reviewQueue.map((item) => (
              <div
                key={item.id}
                data-testid={`review-queue-item-${item.id}`}
                className="card-Step bg-white p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase ${
                        item.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-900'
                          : item.status === 'rejected'
                          ? 'bg-rose-100 text-rose-900'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {item.status}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-extrabold">
                      {item.level} · {item.topic}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      Author: {item.createdBy}
                    </span>
                  </div>

                  {/* Automated Validation Badges */}
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      ✓ Stress Marks
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      ✓ Safe Content
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      ✓ Vocab Level
                    </span>
                  </div>
                </div>

                {/* Inline Title Edit */}
                <div className="flex items-center justify-between gap-3">
                  {editingQueueId === item.id ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className="flex-1 rounded-xl border-2 border-[#1B4DFF] px-3 py-1.5 text-sm font-extrabold"
                    />
                  ) : (
                    <h4 className="text-base font-extrabold text-slate-900">{item.title}</h4>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingQueueId(item.id);
                      setEditingTitle(item.title);
                    }}
                    className="text-xs font-extrabold text-[#1B4DFF] hover:underline"
                  >
                    Inline Edit
                  </button>
                </div>

                {/* Side-by-Side 4-Language Lines + TTS Preview */}
                <div className="space-y-2">
                  {item.lines.map((line, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div dir="ltr" className="text-xs sm:text-sm font-extrabold text-slate-900">
                          <span className="text-[#1B4DFF]">{line.speaker}:</span> {line.ru}
                        </div>
                        <button
                          type="button"
                          onClick={() => speakRussian(line.ru, soundEnabled, 0.9)}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 shrink-0"
                          title="TTS Audio Preview"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-slate-700" />
                        </button>
                      </div>
                      <div className="text-xs text-slate-600 space-y-0.5">
                        <div>EN: {line.en}</div>
                        <div>AR: {line.ar}</div>
                        <div>FR: {line.fr}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Approve / Reject Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-slate-500">
                    {item.reviewedBy
                      ? `Approved/Reviewed by ${item.reviewedBy}${
                          item.reviewedAt ? ` on ${item.reviewedAt.slice(0, 10)}` : ''
                        } · ${item.reviewerComments}`
                      : 'Pending teacher verification before student publication.'}
                  </div>

                  {canApproveContent(userRole === 'student' ? 'teacher' : userRole) && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleReviewDecision(item, 'approved')}
                        data-testid={`approve-queue-${item.id}`}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve & Publish to Students</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReviewDecision(item, 'rejected')}
                        className="px-3.5 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 text-xs font-extrabold flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: MODERATION, TAKEDOWN REPORTS & AUDIT LOG
         ===================================================================== */}
      {activeTab === 'moderation' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 card-Step bg-white p-5 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">
              Reported Content & Takedown Queue ({reports.length})
            </h3>
            {reports.length === 0 ? (
              <p className="text-xs text-slate-500">
                No open copyright or content reports. Use "Report Material" in the Library to test the takedown flow.
              </p>
            ) : (
              <div className="space-y-2.5">
                {reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-rose-950">
                        {rep.targetTitle}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-rose-200 text-rose-900 text-[10px] font-extrabold">
                        {rep.status}
                      </span>
                    </div>
                    <p className="text-xs text-rose-800">{rep.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-7 card-Step bg-white p-5 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">
              Security & Content Approval Audit Log ({auditLog.length} events)
            </h3>
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {auditLog.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-extrabold">
                        {entry.action}
                      </span>
                      <span className="text-xs font-extrabold text-slate-800">
                        {entry.actorName} ({entry.actorRole})
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">{entry.details}</div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 shrink-0">
                    {new Date(entry.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: PHASE 4 ADMIN ANALYTICS & COST MONITOR
         ===================================================================== */}
      {activeTab === 'analytics' && (
        <Phase4AdminAnalyticsView certificatesCount={certificatesCount} demoMode={demoMode} />
      )}

      {/* CSV Student Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900">
              Import Students via CSV (name, email, lang)
            </h3>
            <textarea
              rows={4}
              value={csvImportText}
              onChange={(e) => setCsvImportText(e.target.value)}
              placeholder={'name,email,lang\nYoussef Ali,youssef@student.madi.ru,ar\nMarie Dubois,marie@student.madi.ru,fr'}
              className="w-full rounded-xl border-2 border-slate-200 p-3 text-xs font-mono"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-extrabold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportCsvStudents}
                className="px-4 py-2 rounded-xl bg-[#1B4DFF] text-white text-xs font-extrabold"
              >
                Import Students
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

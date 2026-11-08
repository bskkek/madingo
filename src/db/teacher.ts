import crypto from 'node:crypto';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  announcements,
  assignments,
  auditLog,
  fuelLog,
  groupMembers,
  groups,
  lessons,
  mistakes,
  profiles,
  progress,
  recordings,
  reviewItems,
  reviewQueue,
  speechAttempts,
  streaks,
  typingResults,
  users,
} from './schema.ts';
import type {
  AuditLogEntry,
  GroupAnnouncement,
  GroupAssignment,
  ReviewQueueItem,
  StudentProgressSummary,
  TeacherGroup,
} from '../data/phase3Seed.ts';

// ---------------------------------------------------------------------------
// REAL teacher dashboard queries — all reads/writes go to Postgres via `db`.
// No in-memory arrays, no seeds. Shapes match src/data/phase3Seed.ts so the
// TeacherDashboardView can consume them unchanged.
// ---------------------------------------------------------------------------

const INACTIVE_AFTER_DAYS = 5;

function toIso(value: Date | string | null | undefined): string {
  if (!value) return new Date(0).toISOString();
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function uniqueCapped(values: (string | null | undefined)[], cap = 5): string[] {
  const seen = new Set<string>();
  for (const v of values) {
    const clean = String(v || '').trim();
    if (clean) seen.add(clean);
    if (seen.size >= cap) break;
  }
  return [...seen];
}

export async function getTeacherProfile(teacherId: string) {
  const rows = await db.select().from(profiles).where(eq(profiles.id, teacherId));
  return rows[0] || null;
}

export async function getGroupById(groupId: string) {
  const rows = await db.select().from(groups).where(eq(groups.id, groupId));
  return rows[0] || null;
}

/** Real per-student progress, joined from profiles + progress + streaks + mistakes + typing_results. */
export async function buildStudentSummary(studentId: string): Promise<StudentProgressSummary | null> {
  const profileRows = await db.select().from(profiles).where(eq(profiles.id, studentId));
  const profile = profileRows[0];
  if (!profile) return null;

  const [progressRows, streakRows, fuelRows, mistakeRows, typingRows, speechRows, reviewRows] =
    await Promise.all([
      db.select().from(progress).where(eq(progress.userId, studentId)),
      db.select().from(streaks).where(eq(streaks.userId, studentId)),
      db.select().from(fuelLog).where(eq(fuelLog.userId, studentId)),
      db.select().from(mistakes).where(eq(mistakes.userId, studentId)),
      db
        .select()
        .from(typingResults)
        .where(eq(typingResults.userId, studentId))
        .orderBy(desc(typingResults.createdAt))
        .limit(30),
      db
        .select()
        .from(speechAttempts)
        .where(eq(speechAttempts.userId, studentId))
        .orderBy(desc(speechAttempts.createdAt))
        .limit(30),
      db.select().from(reviewItems).where(eq(reviewItems.userId, studentId)),
    ]);

  const completed = progressRows.filter((p) => p.status === 'completed');
  const lessonsCompleted = completed.length;
  const accuracy =
    completed.length > 0
      ? Math.round(completed.reduce((sum, p) => sum + (p.accuracy || 0), 0) / completed.length)
      : 0;

  const streak = streakRows[0];
  const streakDays = streak?.current || 0;
  const fuel = fuelRows.reduce((sum, r) => sum + (r.amount || 0), 0);

  // Estimated time spent = sum of the estimated length of completed lessons.
  let timeSpentMin = 0;
  const completedLessonIds = [...new Set(completed.map((p) => p.lessonId))];
  if (completedLessonIds.length > 0) {
    const lessonRows = await db
      .select({ estimatedMinutes: lessons.estimatedMinutes })
      .from(lessons)
      .where(inArray(lessons.id, completedLessonIds));
    timeSpentMin = lessonRows.reduce((sum, l) => sum + (l.estimatedMinutes || 0), 0);
  }

  const avgSpeakingScore =
    speechRows.length > 0
      ? Math.round(
          speechRows.reduce((sum, s) => sum + (s.overallScore || 0), 0) / speechRows.length
        )
      : 0;

  const typingCpm =
    typingRows.length > 0
      ? Math.round(typingRows.reduce((sum, t) => sum + (t.cpm || 0), 0) / typingRows.length)
      : 0;

  const now = new Date();
  const garageDueCount = reviewRows.filter(
    (r) => !r.masteredShowroom && r.dueAt && r.dueAt <= now
  ).length;

  const weakLetters = uniqueCapped(
    mistakeRows.filter((m) => m.lessonId.startsWith('u1-')).map((m) => m.correctAnswer)
  );
  const weakCases = uniqueCapped(
    reviewRows.filter((r) => r.itemType === 'case').map((r) => r.categoryTag)
  );
  const weakWords = uniqueCapped(
    mistakeRows.filter((m) => !m.lessonId.startsWith('u1-')).map((m) => m.correctAnswer)
  );

  // Last activity = latest of lesson completion / typing / speaking / streak date.
  const activityCandidates: number[] = [];
  for (const p of progressRows) if (p.completedAt) activityCandidates.push(p.completedAt.getTime());
  for (const t of typingRows) if (t.createdAt) activityCandidates.push(t.createdAt.getTime());
  for (const s of speechRows) if (s.createdAt) activityCandidates.push(s.createdAt.getTime());
  if (streak?.lastActiveDate) {
    const parsed = Date.parse(streak.lastActiveDate);
    if (!Number.isNaN(parsed)) activityCandidates.push(parsed);
  }
  const lastActiveMs =
    activityCandidates.length > 0
      ? Math.max(...activityCandidates)
      : profile.createdAt
        ? profile.createdAt.getTime()
        : 0;
  const lastActiveAt = new Date(lastActiveMs).toISOString();
  const inactiveAlert =
    lastActiveMs === 0 || Date.now() - lastActiveMs > INACTIVE_AFTER_DAYS * 24 * 60 * 60 * 1000;

  const nativeLang = (['en', 'ar', 'fr', 'ru'].includes(profile.uiLang)
    ? profile.uiLang
    : 'en') as StudentProgressSummary['nativeLang'];

  return {
    id: profile.id,
    name: profile.displayName || profile.email,
    email: profile.email,
    nativeLang,
    lessonsCompleted,
    accuracy,
    streakDays,
    fuel,
    timeSpentMin,
    avgSpeakingScore,
    typingCpm,
    garageDueCount,
    weakLetters,
    weakCases,
    weakWords,
    lastActiveAt,
    inactiveAlert,
  };
}

export async function listGroupMembers(groupId: string): Promise<StudentProgressSummary[]> {
  const memberRows = await db
    .select()
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(desc(groupMembers.joinedAt));
  const summaries = await Promise.all(memberRows.map((m) => buildStudentSummary(m.studentId)));
  return summaries.filter((s): s is StudentProgressSummary => s !== null);
}

export async function listGroupsForTeacher(teacherId: string): Promise<TeacherGroup[]> {
  const teacher = await getTeacherProfile(teacherId);
  const groupRows = await db
    .select()
    .from(groups)
    .where(eq(groups.teacherId, teacherId))
    .orderBy(desc(groups.createdAt));
  return Promise.all(
    groupRows.map(async (g) => ({
      id: g.id,
      name: g.name,
      inviteCode: g.inviteCode,
      teacherId: g.teacherId,
      teacherName: teacher?.displayName || '',
      level: (g.level === 'A2' ? 'A2' : 'A1') as TeacherGroup['level'],
      students: await listGroupMembers(g.id),
    }))
  );
}

function makeInviteCode(): string {
  return `MADI-${Math.floor(300 + Math.random() * 699)}`;
}

export async function createGroup(
  teacherId: string,
  teacherName: string,
  name: string,
  level: string
): Promise<TeacherGroup> {
  let inviteCode = makeInviteCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await db.select({ id: groups.id }).from(groups).where(eq(groups.inviteCode, inviteCode));
    if (clash.length === 0) break;
    inviteCode = makeInviteCode();
  }
  const id = `grp-${crypto.randomUUID()}`;
  await db.insert(groups).values({
    id,
    name: name.trim(),
    inviteCode,
    teacherId,
    level: level === 'A2' ? 'A2' : 'A1',
  });
  return {
    id,
    name: name.trim(),
    inviteCode,
    teacherId,
    teacherName,
    level: (level === 'A2' ? 'A2' : 'A1') as TeacherGroup['level'],
    students: [],
  };
}

function mapAssignmentRow(row: typeof assignments.$inferSelect): GroupAssignment {
  const completed = Array.isArray(row.completedStudentIdsJson)
    ? (row.completedStudentIdsJson as string[])
    : [];
  return {
    id: row.id,
    groupId: row.groupId,
    targetType: row.targetType as GroupAssignment['targetType'],
    targetId: row.targetId,
    title: row.title,
    dueDate: row.dueDate,
    createdBy: row.createdBy,
    completedStudentIds: completed,
  };
}

export async function listAssignments(groupId: string): Promise<GroupAssignment[]> {
  const rows = await db
    .select()
    .from(assignments)
    .where(eq(assignments.groupId, groupId))
    .orderBy(desc(assignments.createdAt));
  return rows.map(mapAssignmentRow);
}

export async function createAssignment(
  groupId: string,
  data: {
    targetType?: string;
    targetId?: string;
    title: string;
    dueDate?: string;
    createdBy: string;
  }
): Promise<GroupAssignment> {
  const allowed = ['lesson', 'speaking_clip', 'scenario', 'typing_lab'];
  const targetType = allowed.includes(data.targetType || '') ? data.targetType! : 'lesson';
  const id = `asgn-${crypto.randomUUID()}`;
  const inserted = await db
    .insert(assignments)
    .values({
      id,
      groupId,
      targetType,
      targetId: data.targetId || 'u2-l1',
      title: data.title.trim(),
      dueDate: data.dueDate || new Date().toISOString().slice(0, 10),
      createdBy: data.createdBy,
      completedStudentIdsJson: [],
    })
    .returning();
  return mapAssignmentRow(inserted[0]);
}

function mapAnnouncementRow(row: typeof announcements.$inferSelect): GroupAnnouncement {
  return {
    id: row.id,
    groupId: row.groupId,
    authorName: row.authorName,
    message: row.message,
    createdAt: toIso(row.createdAt),
  };
}

export async function listAnnouncements(groupId: string): Promise<GroupAnnouncement[]> {
  const rows = await db
    .select()
    .from(announcements)
    .where(eq(announcements.groupId, groupId))
    .orderBy(desc(announcements.createdAt));
  return rows.map(mapAnnouncementRow);
}

export async function createAnnouncement(
  groupId: string,
  data: { authorName: string; message: string }
): Promise<GroupAnnouncement> {
  const id = `ann-${crypto.randomUUID()}`;
  const inserted = await db
    .insert(announcements)
    .values({
      id,
      groupId,
      authorName: data.authorName,
      message: data.message.trim(),
    })
    .returning();
  return mapAnnouncementRow(inserted[0]);
}

export type ReviewQueueItemWithSubmissions = ReviewQueueItem & {
  pendingRecordings: number;
  avgSpeakingScore: number;
};

function mapReviewQueueRow(
  row: typeof reviewQueue.$inferSelect,
  pendingRecordings = 0,
  avgSpeakingScore = 0
): ReviewQueueItemWithSubmissions {
  const payload = (row.payloadJson ?? {}) as Record<string, unknown>;
  const lines = Array.isArray(payload.lines) ? (payload.lines as ReviewQueueItem['lines']) : [];
  const vocabulary = Array.isArray(payload.vocabulary)
    ? (payload.vocabulary as string[])
    : [];
  const validationSummary =
    payload.validationSummary && typeof payload.validationSummary === 'object'
      ? (payload.validationSummary as ReviewQueueItem['validationSummary'])
      : { stressMarksPassed: false, safeContentPassed: false, vocabLevelPassed: false };
  return {
    id: row.id,
    itemType: row.itemType as ReviewQueueItem['itemType'],
    title: row.title,
    level: row.level as ReviewQueueItem['level'],
    topic: row.topic,
    grammarPoint: row.grammarPoint,
    register: row.register as ReviewQueueItem['register'],
    status: row.status as ReviewQueueItem['status'],
    createdBy: row.createdBy,
    createdAt: toIso(row.createdAt),
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt ? toIso(row.reviewedAt) : null,
    reviewerComments: row.reviewerComments || '',
    consentConfirmed: Boolean(row.consentConfirmed),
    consentDocumentUrl:
      typeof payload.consentDocumentUrl === 'string' ? payload.consentDocumentUrl : null,
    license: typeof payload.license === 'string' ? payload.license : '',
    sourceUrl: typeof payload.sourceUrl === 'string' ? payload.sourceUrl : '',
    lines,
    vocabulary,
    validationSummary,
    pendingRecordings,
    avgSpeakingScore,
  };
}

/**
 * Real items needing review: review_queue rows in needs_review/draft.
 * Enriched with real student submissions: for speaking-clip items whose
 * payload names a clipId, counts recordings and averages speech attempts.
 */
export async function getReviewQueue(
  _teacherId: string
): Promise<ReviewQueueItemWithSubmissions[]> {
  const rows = await db
    .select()
    .from(reviewQueue)
    .where(
      sql`${reviewQueue.status} IN ('needs_review', 'draft')`
    )
    .orderBy(desc(reviewQueue.createdAt));
  return Promise.all(
    rows.map(async (row) => {
      const payload = (row.payloadJson ?? {}) as Record<string, unknown>;
      const clipId = typeof payload.clipId === 'string' ? payload.clipId : null;
      let pendingRecordings = 0;
      let avgSpeakingScore = 0;
      if (clipId) {
        const [recRows, speechRows] = await Promise.all([
          db.select().from(recordings).where(eq(recordings.clipId, clipId)),
          db.select().from(speechAttempts).where(eq(speechAttempts.clipId, clipId)),
        ]);
        pendingRecordings = recRows.length;
        avgSpeakingScore =
          speechRows.length > 0
            ? Math.round(
                speechRows.reduce((sum, s) => sum + (s.overallScore || 0), 0) / speechRows.length
              )
            : 0;
      }
      return mapReviewQueueRow(row, pendingRecordings, avgSpeakingScore);
    })
  );
}

export async function getReviewQueueItemById(
  id: string
): Promise<ReviewQueueItemWithSubmissions | null> {
  const rows = await db.select().from(reviewQueue).where(eq(reviewQueue.id, id));
  return rows[0] ? mapReviewQueueRow(rows[0]) : null;
}

export async function resolveReviewQueueItem(
  id: string,
  decision: 'approved' | 'rejected',
  feedback: string,
  reviewerId: string,
  reviewerName: string,
  opts: {
    updatedTitle?: string;
    license?: string;
    sourceUrl?: string;
    consentDocumentUrl?: string | null;
    consentConfirmed?: boolean;
  } = {}
): Promise<ReviewQueueItemWithSubmissions | null> {
  const rows = await db.select().from(reviewQueue).where(eq(reviewQueue.id, id));
  const existing = rows[0];
  if (!existing) return null;

  const payload = { ...((existing.payloadJson ?? {}) as Record<string, unknown>) };
  if (opts.license !== undefined) payload.license = opts.license;
  if (opts.sourceUrl !== undefined) payload.sourceUrl = opts.sourceUrl;
  if (opts.consentDocumentUrl !== undefined) payload.consentDocumentUrl = opts.consentDocumentUrl;

  const updated = await db
    .update(reviewQueue)
    .set({
      status: decision,
      title: opts.updatedTitle?.trim() ? opts.updatedTitle.trim() : existing.title,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      reviewerComments: feedback || '',
      consentConfirmed:
        opts.consentConfirmed !== undefined ? opts.consentConfirmed : existing.consentConfirmed,
      payloadJson: payload,
    })
    .where(eq(reviewQueue.id, id))
    .returning();
  return updated[0] ? mapReviewQueueRow(updated[0]) : null;
}

// ---------------------------------------------------------------------------
// CSV import — same format as the existing in-memory import:
// one "name,email,lang" row per line, optional "name,email,lang" header.
// Creates real student profiles (+ users rows) and group_members rows.
// ---------------------------------------------------------------------------

export interface CsvImportResult {
  created: number;
  added: number;
  skipped: number;
  addedCount: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function importCsvStudents(groupId: string, csvText: string): Promise<CsvImportResult> {
  const lines = String(csvText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let created = 0;
  let added = 0;
  let skipped = 0;

  for (const line of lines) {
    if (line.toLowerCase().startsWith('name,')) continue; // skip header
    const [namePart, emailPart, langPart] = line.split(',').map((s) => s?.trim());
    const name = namePart || '';
    const email = (emailPart || '').toLowerCase();
    if (!name || !EMAIL_RE.test(email)) {
      skipped++;
      continue;
    }
    const nativeLang = (['en', 'ar', 'fr', 'ru'].includes(langPart || '')
      ? langPart!
      : 'en') as 'en' | 'ar' | 'fr' | 'ru';

    const existing = await db
      .select()
      .from(profiles)
      .where(sql`lower(${profiles.email}) = ${email}`)
      .limit(1);
    let studentId = existing[0]?.id;

    if (!studentId) {
      studentId = `stu-${crypto.randomUUID()}`;
      await db.insert(users).values({ uid: studentId, email }).onConflictDoNothing();
      await db
        .insert(profiles)
        .values({
          id: studentId,
          email,
          displayName: name,
          uiLang: nativeLang,
          role: 'student',
        })
        .onConflictDoNothing();
      created++;
    }

    const alreadyMember = await db
      .select()
      .from(groupMembers)
      .where(
        and(eq(groupMembers.groupId, groupId), eq(groupMembers.studentId, studentId))
      )
      .limit(1);
    if (alreadyMember.length > 0) {
      skipped++;
      continue;
    }
    await db
      .insert(groupMembers)
      .values({ groupId, studentId })
      .onConflictDoNothing();
    if (existing[0]) added++;
  }

  return { created, added, skipped, addedCount: created + added };
}

// ---------------------------------------------------------------------------
// Audit log — every teacher action that changes data writes a row here.
// audit_log: id, actor_id, actor_name, actor_role, action, target_type,
// target_id, details, created_at. The view reads `timestamp` (= created_at).
// ---------------------------------------------------------------------------

export async function writeAuditLog(
  actorId: string,
  actorName: string,
  actorRole: string,
  action: string,
  targetType: string,
  targetId: string,
  details: string
): Promise<AuditLogEntry> {
  const id = `aud-${crypto.randomUUID()}`;
  const inserted = await db
    .insert(auditLog)
    .values({
      id,
      actorId,
      actorName,
      actorRole,
      action,
      targetType,
      targetId,
      details,
    })
    .returning();
  const row = inserted[0];
  return {
    id: row.id,
    actorId: row.actorId,
    actorName: row.actorName,
    actorRole: row.actorRole as AuditLogEntry['actorRole'],
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    details: row.details,
    timestamp: toIso(row.createdAt),
  };
}

export async function listAuditLog(limit = 50): Promise<AuditLogEntry[]> {
  const rows = await db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    actorId: row.actorId,
    actorName: row.actorName,
    actorRole: row.actorRole as AuditLogEntry['actorRole'],
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    details: row.details,
    timestamp: toIso(row.createdAt),
  }));
}

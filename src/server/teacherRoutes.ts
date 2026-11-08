import { NextFunction, Response, Router } from 'express';
import { eq } from 'drizzle-orm';
import { AuthRequest, requireAuth } from '../middleware/auth.ts';
import { db } from '../db/index.ts';
import { groups, profiles } from '../db/schema.ts';
import { ALLOWED_CONTENT_LICENSES, isAllowedLicense } from '../lib/phase3Engine.ts';
import * as teacherDb from '../db/teacher.ts';

// Real teacher dashboard router — Postgres-backed. Mount in server.ts with:
//   import teacherRoutes from './src/server/teacherRoutes.ts';
//   app.use('/api/teacher', teacherRoutes);
// All routes require auth + teacher/admin role (profile.role in the DB).
// NOTE: the legacy in-memory /api/teacher/dashboard, /api/teacher/groups
// (POST), /api/teacher/assignments, /api/teacher/announcements and
// /api/review-queue/:id/decision handlers still live in server.ts; this
// router's paths do not collide with them, and TeacherDashboardView now
// calls only the routes below.

type TeacherProfile = typeof profiles.$inferSelect;

interface TeacherRequest extends AuthRequest {
  teacherProfile?: TeacherProfile;
}

const router = Router();

async function requireTeacher(req: TeacherRequest, res: Response, next: NextFunction) {
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({ error: 'Unauthorized: Missing token' });
  try {
    const rows = await db.select().from(profiles).where(eq(profiles.id, uid));
    const profile = rows[0];
    if (!profile) {
      return res.status(403).json({ error: 'Teacher profile not found.' });
    }
    if (profile.role !== 'teacher' && profile.role !== 'admin') {
      return res.status(403).json({ error: 'Teacher or admin role required.' });
    }
    req.teacherProfile = profile;
    next();
  } catch (error: any) {
    console.error('[teacherRoutes] role check failed:', error);
    res.status(500).json({ error: 'Failed to verify teacher role.' });
  }
}

/** Load a group the caller owns (admins may access any group). */
async function loadOwnedGroup(
  req: TeacherRequest,
  res: Response,
  groupId: string
): Promise<typeof groups.$inferSelect | null> {
  const group = await teacherDb.getGroupById(groupId);
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return null;
  }
  const teacher = req.teacherProfile!;
  if (group.teacherId !== teacher.id && teacher.role !== 'admin') {
    res.status(403).json({ error: 'This group belongs to another teacher.' });
    return null;
  }
  return group;
}

function actorOf(req: TeacherRequest): { id: string; name: string; role: string } {
  const t = req.teacherProfile!;
  return { id: t.id, name: t.displayName || t.email, role: t.role };
}

router.use(requireAuth, requireTeacher);

// GET /api/teacher/groups — teacher's groups with real student progress embedded.
router.get('/groups', async (req: TeacherRequest, res: Response) => {
  try {
    const teacher = req.teacherProfile!;
    const result = await teacherDb.listGroupsForTeacher(teacher.id);
    res.json({ groups: result });
  } catch (error: any) {
    console.error('[teacherRoutes] list groups failed:', error);
    res.status(500).json({ error: 'Failed to load groups.' });
  }
});

// POST /api/teacher/groups — create a group in the DB (used by the view's
// "Create Group" button; not in the original endpoint list but required
// for the dashboard to be usable with real data).
router.post('/groups', async (req: TeacherRequest, res: Response) => {
  try {
    const { name, level = 'A1', teacherName } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }
    const actor = actorOf(req);
    const group = await teacherDb.createGroup(
      actor.id,
      String(teacherName || actor.name),
      String(name),
      String(level)
    );
    await teacherDb.writeAuditLog(
      actor.id,
      actor.name,
      actor.role,
      'CREATE_GROUP',
      'group',
      group.id,
      `Created group "${group.name}" (${group.inviteCode})`
    );
    const allGroups = await teacherDb.listGroupsForTeacher(actor.id);
    res.json({ group, groups: allGroups });
  } catch (error: any) {
    console.error('[teacherRoutes] create group failed:', error);
    res.status(500).json({ error: 'Failed to create group.' });
  }
});

// GET /api/teacher/groups/:id/members — real per-student progress.
router.get('/groups/:id/members', async (req: TeacherRequest, res: Response) => {
  try {
    const group = await loadOwnedGroup(req, res, req.params.id);
    if (!group) return;
    const students = await teacherDb.listGroupMembers(group.id);
    res.json({ group: { id: group.id, name: group.name, inviteCode: group.inviteCode }, students });
  } catch (error: any) {
    console.error('[teacherRoutes] list members failed:', error);
    res.status(500).json({ error: 'Failed to load group members.' });
  }
});

// GET /api/teacher/groups/:id/assignments
router.get('/groups/:id/assignments', async (req: TeacherRequest, res: Response) => {
  try {
    const group = await loadOwnedGroup(req, res, req.params.id);
    if (!group) return;
    const result = await teacherDb.listAssignments(group.id);
    res.json({ assignments: result });
  } catch (error: any) {
    console.error('[teacherRoutes] list assignments failed:', error);
    res.status(500).json({ error: 'Failed to load assignments.' });
  }
});

// POST /api/teacher/groups/:id/assignments
router.post('/groups/:id/assignments', async (req: TeacherRequest, res: Response) => {
  try {
    const group = await loadOwnedGroup(req, res, req.params.id);
    if (!group) return;
    const { targetType = 'lesson', targetId = 'u2-l1', title = '', dueDate, createdBy } = req.body || {};
    if (!String(title).trim()) {
      return res.status(400).json({ error: 'Assignment title is required' });
    }
    const actor = actorOf(req);
    const assignment = await teacherDb.createAssignment(group.id, {
      targetType: String(targetType),
      targetId: String(targetId),
      title: String(title),
      dueDate: dueDate ? String(dueDate) : undefined,
      createdBy: String(createdBy || actor.name),
    });
    await teacherDb.writeAuditLog(
      actor.id,
      actor.name,
      actor.role,
      'CREATE_ASSIGNMENT',
      'assignment',
      assignment.id,
      `Assigned "${assignment.title}" (target: ${assignment.targetId}, due: ${assignment.dueDate}) to group "${group.name}"`
    );
    const allAssignments = await teacherDb.listAssignments(group.id);
    res.json({ assignment, assignments: allAssignments });
  } catch (error: any) {
    console.error('[teacherRoutes] create assignment failed:', error);
    res.status(500).json({ error: 'Failed to create assignment.' });
  }
});

// GET /api/teacher/groups/:id/announcements
router.get('/groups/:id/announcements', async (req: TeacherRequest, res: Response) => {
  try {
    const group = await loadOwnedGroup(req, res, req.params.id);
    if (!group) return;
    const result = await teacherDb.listAnnouncements(group.id);
    res.json({ announcements: result });
  } catch (error: any) {
    console.error('[teacherRoutes] list announcements failed:', error);
    res.status(500).json({ error: 'Failed to load announcements.' });
  }
});

// POST /api/teacher/groups/:id/announcements
router.post('/groups/:id/announcements', async (req: TeacherRequest, res: Response) => {
  try {
    const group = await loadOwnedGroup(req, res, req.params.id);
    if (!group) return;
    const { authorName, message = '' } = req.body || {};
    if (!String(message).trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    const actor = actorOf(req);
    const announcement = await teacherDb.createAnnouncement(group.id, {
      authorName: String(authorName || actor.name),
      message: String(message),
    });
    await teacherDb.writeAuditLog(
      actor.id,
      actor.name,
      actor.role,
      'POST_ANNOUNCEMENT',
      'announcement',
      announcement.id,
      `Posted announcement to group "${group.name}": "${announcement.message.slice(0, 120)}"`
    );
    const allAnnouncements = await teacherDb.listAnnouncements(group.id);
    res.json({ announcement, announcements: allAnnouncements });
  } catch (error: any) {
    console.error('[teacherRoutes] post announcement failed:', error);
    res.status(500).json({ error: 'Failed to post announcement.' });
  }
});

// GET /api/teacher/review-queue — real items needing review (+ audit log for the moderation tab).
router.get('/review-queue', async (req: TeacherRequest, res: Response) => {
  try {
    const teacher = req.teacherProfile!;
    const [reviewQueue, auditLog] = await Promise.all([
      teacherDb.getReviewQueue(teacher.id),
      teacherDb.listAuditLog(50),
    ]);
    res.json({ reviewQueue, auditLog });
  } catch (error: any) {
    console.error('[teacherRoutes] review queue failed:', error);
    res.status(500).json({ error: 'Failed to load review queue.' });
  }
});

// POST /api/teacher/review-queue/:id/resolve — approve / reject.
// Same approval guards as the legacy /api/review-queue/:id/decision:
// approval requires a signed consent document URL, an allowed license and
// a valid source URL; otherwise the item stays unapproved.
router.post('/review-queue/:id/resolve', async (req: TeacherRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      decision,
      feedback = '',
      comments = '',
      reviewerName,
      updatedTitle,
      license,
      sourceUrl,
      consentDocumentUrl,
      consentConfirmed,
    } = req.body || {};
    if (decision !== 'approved' && decision !== 'rejected') {
      return res.status(400).json({ error: 'decision must be "approved" or "rejected".' });
    }
    const current = await teacherDb.getReviewQueueItemById(id);
    if (!current) {
      return res.status(404).json({ error: 'Review queue item not found' });
    }
    const actor = actorOf(req);
    const effectiveConsentDoc =
      typeof consentDocumentUrl === 'string' && consentDocumentUrl.trim()
        ? consentDocumentUrl.trim()
        : current.consentDocumentUrl;
    const effectiveLicense =
      typeof license === 'string' && license.trim() ? license.trim() : current.license || '';
    const effectiveSourceUrl =
      typeof sourceUrl === 'string' && sourceUrl.trim() ? sourceUrl.trim() : current.sourceUrl || '';
    const hasConsentDoc = Boolean(effectiveConsentDoc && effectiveConsentDoc.length > 5);
    const resolvedConsent = Boolean(
      (consentConfirmed !== undefined ? consentConfirmed : current.consentConfirmed) && hasConsentDoc
    );

    if (decision === 'approved') {
      if (!resolvedConsent || !hasConsentDoc) {
        return res.status(400).json({
          error:
            'Signed consent requires an uploaded consent document attachment; without it the item stays unapproved.',
        });
      }
      if (!isAllowedLicense(effectiveLicense)) {
        return res.status(400).json({
          error: `License is required from fixed list: ${ALLOWED_CONTENT_LICENSES.join(', ')}`,
        });
      }
      if (!effectiveSourceUrl || !/^https?:\/\/\S+/i.test(effectiveSourceUrl)) {
        return res.status(400).json({
          error: 'A valid human-entered sourceUrl (https://...) is required before approval.',
        });
      }
    }

    const item = await teacherDb.resolveReviewQueueItem(
      id,
      decision,
      String(feedback || comments || `${decision} after teacher verification`),
      actor.id,
      String(reviewerName || actor.name),
      {
        updatedTitle: typeof updatedTitle === 'string' ? updatedTitle : undefined,
        license: effectiveLicense || undefined,
        sourceUrl: effectiveSourceUrl || undefined,
        consentDocumentUrl: effectiveConsentDoc,
        consentConfirmed: resolvedConsent,
      }
    );
    if (!item) {
      return res.status(404).json({ error: 'Review queue item not found' });
    }
    await teacherDb.writeAuditLog(
      actor.id,
      actor.name,
      actor.role,
      `REVIEW_${decision.toUpperCase()}`,
      current.itemType,
      current.id,
      `${decision.toUpperCase()}: "${current.title}" — ${feedback || comments || 'No comment'}`
    );
    const reviewQueue = await teacherDb.getReviewQueue(actor.id);
    res.json({ item, reviewQueue });
  } catch (error: any) {
    console.error('[teacherRoutes] resolve review item failed:', error);
    res.status(500).json({ error: 'Failed to process review decision.' });
  }
});

// POST /api/teacher/import-csv — body { groupId, csvText }.
// Same CSV format as the legacy import: "name,email,lang" rows, optional header.
router.post('/import-csv', async (req: TeacherRequest, res: Response) => {
  try {
    const { groupId, csvText = '' } = req.body || {};
    if (!groupId || typeof groupId !== 'string') {
      return res.status(400).json({ error: 'groupId is required' });
    }
    const group = await loadOwnedGroup(req, res, groupId);
    if (!group) return;
    const actor = actorOf(req);
    const result = await teacherDb.importCsvStudents(group.id, String(csvText));
    await teacherDb.writeAuditLog(
      actor.id,
      actor.name,
      actor.role,
      'IMPORT_CSV_STUDENTS',
      'group',
      group.id,
      `Imported students into group "${group.name}": ${result.created} new profiles, ${result.added} existing students added, ${result.skipped} skipped`
    );
    const allGroups = await teacherDb.listGroupsForTeacher(actor.id);
    const updatedGroup = allGroups.find((g) => g.id === group.id) || null;
    res.json({ ...result, group: updatedGroup, groups: allGroups });
  } catch (error: any) {
    console.error('[teacherRoutes] CSV import failed:', error);
    res.status(500).json({ error: 'Failed to import students.' });
  }
});

export default router;

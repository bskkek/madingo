import express from 'express';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import {
  requireAuth,
  AuthRequest,
  createSessionToken,
} from './src/middleware/auth.ts';
import {
  ArenaRoom,
  ArenaQuestion,
  ArenaParticipant,
  generateRoomCode,
  calculateAnswerScore,
  computeRankings,
  computeClassroomAnalytics,
} from './src/lib/arenaEngine.ts';
import {
  seedCurriculumIfNeeded,
  getOrCreateUser,
  findProfileByEmail,
  hashPassword,
  getUserDashboardData,
  completeLessonInDb,
  recordMistakeInDb,
  updateProfileSettingsInDb,
  deleteUserAccountFromDb,
  upsertUserWordInDb,
  reviewGarageItemsInDb,
  saveTypingResultInDb,
  recordAnalyticsEventInDb,
} from './src/db/users.ts';
import {
  CURRICULUM_UNITS,
  CYRILLIC_LETTERS,
  UNIT2_PHRASES,
  GRAMMAR_ROAD_SIGNS,
  DEV_SAMPLE_EXERCISES,
} from './src/data/curriculum.ts';
import { DICTIONARY_WORDS, TYPING_TEXTS } from './src/data/dictionarySeed.ts';
import {
  SPEAKING_CLIPS,
  CONVERSATION_SCENARIOS,
  LIBRARY_SEED_ITEMS,
  INITIAL_TEACHER_GROUPS,
  INITIAL_ASSIGNMENTS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_REVIEW_QUEUE,
  INITIAL_AUDIT_LOG,
  INITIAL_REPORTS,
  SpeakingClip,
  LibraryItem,
  TeacherGroup,
  GroupAssignment,
  GroupAnnouncement,
  ReviewQueueItem,
  AuditLogEntry,
  ContentReportItem,
} from './src/data/phase3Seed.ts';
import {
  AI_EDITORIAL_ATTRIBUTION,
  ALLOWED_CONTENT_LICENSES,
  isAllowedLicense,
  scoreSpeechAttempt,
  validateClipForPublication,
  validateLibraryItemForPublication,
  validateGeneratedContent,
  canApproveContent,
  canModerateLibrary,
  DailyQuotaGuard,
  UserRole,
} from './src/lib/phase3Engine.ts';
import { sttProvider, ttsProvider, llmProvider } from './src/lib/providers.ts';
import {
  DEFAULT_CERTIFICATE_DISCLAIMER,
  PHASE4_BADGES,
  PHASE4_COSMETICS,
  SEED_CLASS_CHALLENGES,
  SEED_FACULTY_BOARD,
  SEED_FRIENDS,
  SEED_LEAGUE_PARTICIPANTS,
} from './src/data/phase4Data.ts';
import {
  CertificateRecord,
  checkCertificateEligibility,
  generateCertificateId,
  renderCertificateSvg,
  validateFuelAwardAntiCheat,
} from './src/lib/phase4Engine.ts';

const quotaGuard = new DailyQuotaGuard(
  Number(process.env.DAILY_USER_SPEECH_QUOTA || 60),
  Number(process.env.DAILY_PROVIDER_BUDGET_USD || 15.0)
);

// Runtime state for Phase 3 & Phase 4 interactive persistence
const runtimeClips: SpeakingClip[] = [...SPEAKING_CLIPS];
const runtimeLibraryItems: LibraryItem[] = [...LIBRARY_SEED_ITEMS];
const runtimeGroups: TeacherGroup[] = JSON.parse(JSON.stringify(INITIAL_TEACHER_GROUPS));
const runtimeAssignments: GroupAssignment[] = [...INITIAL_ASSIGNMENTS];
const runtimeAnnouncements: GroupAnnouncement[] = [...INITIAL_ANNOUNCEMENTS];
const runtimeReviewQueue: ReviewQueueItem[] = [...INITIAL_REVIEW_QUEUE];
const runtimeAuditLog: AuditLogEntry[] = [...INITIAL_AUDIT_LOG];
const runtimeReports: ContentReportItem[] = [...INITIAL_REPORTS];
const runtimeCustomLessons: any[] = [];
const runtimeBestSpeechScores: Record<string, Record<string, { score: number; stars: number }>> = {};

let runtimeCertificateDisclaimer = DEFAULT_CERTIFICATE_DISCLAIMER;
const runtimeCertificates: CertificateRecord[] = [];

const runtimeTelemetry = {
  sttRequests: 0,
  sttEstimatedCostUsd: 0,
  ttsRequests: 0,
  ttsEstimatedCostUsd: 0,
  llmRequests: 0,
  llmEstimatedCostUsd: 0,
  activeUserIds: new Set<string>(),
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  interface MadiLiveStory {
    id: string;
    imageUrl: string;
    localImageUrl?: string;
    proxyImageUrl: string;
    title: string;
    subtitle: string;
    href: string;
  }

  const KNOWN_LOCAL_MADI_STORY_MAP: Record<string, string> = {
    'https://www.madi.ru/uploads/images/2026/10/23/1792763352_sayit31.10.png':
      '/assets/madi-stories/story-1.webp',
    'https://www.madi.ru/uploads/images/2026/09/14/1789381155_madi-banner-universal.png':
      '/assets/madi-stories/story-2.webp',
    'https://www.madi.ru/uploads/images/2025/04/24/1745486917_SayitKnigaPamyati.png':
      '/assets/madi-stories/story-3.webp',
    'https://www.madi.ru/uploads/images/2026/09/15/1789480019_image.png':
      '/assets/madi-stories/story-4.webp',
    'https://www.madi.ru/uploads/images/2022/03/25/1648201524_Slayidersocseti-min.png':
      '/assets/madi-stories/story-5.webp',
  };

  const DEFAULT_MADI_STORIES: MadiLiveStory[] = [
    {
      id: 'madi-story-1',
      imageUrl: 'https://www.madi.ru/uploads/images/2026/10/23/1792763352_sayit31.10.png',
      localImageUrl: '/assets/madi-stories/story-1.webp',
      proxyImageUrl: '/assets/madi-stories/story-1.webp',
      title: '',
      subtitle: '',
      href: 'https://forms.cloud.microsoft/e/pBHtH0wVPA/',
    },
    {
      id: 'madi-story-2',
      imageUrl: 'https://www.madi.ru/uploads/images/2026/09/14/1789381155_madi-banner-universal.png',
      localImageUrl: '/assets/madi-stories/story-2.webp',
      proxyImageUrl: '/assets/madi-stories/story-2.webp',
      title: '',
      subtitle: '',
      href: 'https://olimpiada.madi.ru/',
    },
    {
      id: 'madi-story-3',
      imageUrl: 'https://www.madi.ru/uploads/images/2025/04/24/1745486917_SayitKnigaPamyati.png',
      localImageUrl: '/assets/madi-stories/story-3.webp',
      proxyImageUrl: '/assets/madi-stories/story-3.webp',
      title: 'Книга памяти МАДИ',
      subtitle: '',
      href: 'https://madi.ru/8596-kniga-pamyati-madi.html',
    },
    {
      id: 'madi-story-4',
      imageUrl: 'https://www.madi.ru/uploads/images/2026/09/15/1789480019_image.png',
      localImageUrl: '/assets/madi-stories/story-4.webp',
      proxyImageUrl: '/assets/madi-stories/story-4.webp',
      title: 'МАДИ в топ-100 лучших вузов России',
      subtitle: 'Первая лига Национального агрегированного рейтинга',
      href: 'https://www.madi.ru/7481-madi-voshel-v-pervuyu-ligu-nacionalnogo-agregirovannogo-reyt.html',
    },
    {
      id: 'madi-story-5',
      imageUrl: 'https://www.madi.ru/uploads/images/2022/03/25/1648201524_Slayidersocseti-min.png',
      localImageUrl: '/assets/madi-stories/story-5.webp',
      proxyImageUrl: '/assets/madi-stories/story-5.webp',
      title: 'МАДИ в социальных сетях',
      subtitle: 'Подписывайтесь на официальные аккаунты университета',
      href: 'https://taplink.cc/madiuniversity',
    },
  ];

  let cachedMadiStories: MadiLiveStory[] = [...DEFAULT_MADI_STORIES];
  let lastMadiStoriesSyncAt = 0;
  const MADI_STORIES_TTL_MS = 5 * 60 * 1000; // 5 minutes live sync
  const madiImageMemoryCache = new Map<string, { buffer: Buffer; contentType: string }>();

  async function syncMadiStoriesFromWebsite(): Promise<MadiLiveStory[]> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);
      const response = await fetch('https://www.madi.ru/', {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return cachedMadiStories;
      }

      const html = await response.text();
      const start = html.indexOf('<div class="slider-main">');
      if (start === -1) {
        return cachedMadiStories;
      }
      const end = html.indexOf('<nav class="services-line"', start);
      const section = html.slice(start, end > start ? end : start + 25000);

      // Strip commented-out slides (both standard HTML comments and MADI's <!--начало-> ... <!--конец-->)
      const uncommented = section
        .replace(/<!--начало->[\s\S]*?<!--конец-->/g, '')
        .replace(/<!--[\s\S]*?-->/g, '');

      const extracted: MadiLiveStory[] = [];
      const blockRegex = /<a\s+class="slider-block"([^>]*)>([\s\S]*?)<\/a>/gi;
      let match: RegExpExecArray | null;

      const cleanText = (s: string) =>
        (s || '')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&laquo;/g, '«')
          .replace(/&raquo;/g, '»')
          .replace(/\s+/g, ' ')
          .trim();

      while ((match = blockRegex.exec(uncommented)) !== null) {
        const attrs = match[1] || '';
        const inner = match[2] || '';
        const bgMatch = inner.match(/background-image:\s*url\(['"]?([^'")]+)['"]?\)/i);
        if (!bgMatch) continue;

        let imgUrl = bgMatch[1].trim();
        if (imgUrl.startsWith('/')) {
          imgUrl = `https://www.madi.ru${imgUrl}`;
        } else if (!/^https?:\/\//i.test(imgUrl)) {
          imgUrl = `https://www.madi.ru/${imgUrl}`;
        }

        const hrefAttrMatch = attrs.match(/href="([^"]*)"/i);
        const h3Match = inner.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
        const pMatch = inner.match(/<p[^>]*>([\s\S]*?)<\/p>/i);

        // Only display overlay title when the slide explicitly includes an <h3> text overlay on madi.ru
        const title = cleanText(h3Match ? h3Match[1] : '');
        const subtitle = cleanText(pMatch ? pMatch[1] : '');

        let href = (hrefAttrMatch ? hrefAttrMatch[1] : '').trim();
        if (href.startsWith('/')) {
          href = `https://www.madi.ru${href}`;
        }

        const knownLocal = KNOWN_LOCAL_MADI_STORY_MAP[imgUrl];
        const proxyUrl = knownLocal || `/api/madi-image-proxy?url=${encodeURIComponent(imgUrl)}`;

        extracted.push({
          id: `madi-live-${extracted.length + 1}-${Buffer.from(imgUrl).toString('base64').slice(-8)}`,
          imageUrl: imgUrl,
          localImageUrl: knownLocal,
          proxyImageUrl: proxyUrl,
          title,
          subtitle,
          href: href || 'https://www.madi.ru/',
        });
      }

      if (extracted.length > 0) {
        cachedMadiStories = extracted;
        lastMadiStoriesSyncAt = Date.now();
      }
    } catch (err: any) {
      console.warn('Live MADI stories sync fallback used:', err?.message || err);
    }
    return cachedMadiStories;
  }

  // Trigger initial background sync on startup
  syncMadiStoriesFromWebsite().catch(() => {});

  app.get('/api/madi-live-stories', async (req, res) => {
    const forceRefresh = req.query.refresh === '1';
    const isStale = Date.now() - lastMadiStoriesSyncAt > MADI_STORIES_TTL_MS;
    if (forceRefresh || isStale) {
      await syncMadiStoriesFromWebsite();
    }
    res.json({
      stories: cachedMadiStories,
      syncedAt: lastMadiStoriesSyncAt || Date.now(),
      sourceUrl: 'https://www.madi.ru/',
    });
  });

  app.get('/api/madi-image-proxy', async (req, res) => {
    try {
      const rawUrl = String(req.query.url || '').trim();
      if (!rawUrl || !/^https?:\/\/([a-z0-9-]+\.)?madi\.ru\//i.test(rawUrl)) {
        return res.status(400).send('Invalid MADI image URL');
      }

      const knownLocal = KNOWN_LOCAL_MADI_STORY_MAP[rawUrl];
      if (knownLocal) {
        return res.redirect(knownLocal);
      }

      const cached = madiImageMemoryCache.get(rawUrl);
      if (cached) {
        res.setHeader('Content-Type', cached.contentType);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.send(cached.buffer);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);
      const upstream = await fetch(rawUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Referer: 'https://www.madi.ru/',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!upstream.ok) {
        return res.redirect('/assets/madi-stories/story-2.webp');
      }

      const contentType = upstream.headers.get('content-type') || 'image/png';
      const arrayBuffer = await upstream.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      madiImageMemoryCache.set(rawUrl, { buffer, contentType });
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(buffer);
    } catch {
      return res.redirect('/assets/madi-stories/story-2.webp');
    }
  });

  app.get('/api/curriculum', async (_req, res) => {
    try {
      await seedCurriculumIfNeeded().catch((err) => {
        console.warn('Non-fatal curriculum seed warning:', err.message);
      });
      res.json({
        units: CURRICULUM_UNITS,
        letters: CYRILLIC_LETTERS,
        phrases: UNIT2_PHRASES,
        roadSigns: GRAMMAR_ROAD_SIGNS,
        devExercises: DEV_SAMPLE_EXERCISES,
      });
    } catch (error: any) {
      console.error('Failed to serve curriculum:', error);
      res.status(500).json({ error: error.message || 'Failed to load curriculum' });
    }
  });

  app.get('/api/dictionary', (_req, res) => {
    const dayIndex =
      DICTIONARY_WORDS.length > 0
        ? Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % DICTIONARY_WORDS.length
        : 0;
    res.json({
      words: DICTIONARY_WORDS,
      wordOfTheDay: DICTIONARY_WORDS[dayIndex] || null,
      roadSigns: GRAMMAR_ROAD_SIGNS,
    });
  });

  app.get('/api/typing-texts', (_req, res) => {
    res.json({
      texts: TYPING_TEXTS,
    });
  });

  app.post('/api/auth/signup', async (req, res) => {
    try {
      const {
        email,
        password,
        displayName,
        uiLang,
        goalMinutes,
        learningReason,
        consentAccepted,
      } = req.body || {};

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email address is required.' });
      }
      if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }
      if (!consentAccepted) {
        return res.status(400).json({ error: 'Privacy consent is required.' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const existing = await findProfileByEmail(cleanEmail);
      const pwdHash = hashPassword(password);

      let uid: string;
      if (existing) {
        uid = existing.id;
      } else {
        uid = `usr_${crypto.randomBytes(10).toString('hex')}`;
        await getOrCreateUser(uid, cleanEmail, {
          displayName: (displayName || cleanEmail.split('@')[0]).trim(),
          uiLang: uiLang || 'en',
          goalMinutes: Number(goalMinutes) || 10,
          learningReason: learningReason || 'university',
          consentAccepted: true,
          passwordHash: pwdHash,
        });
      }

      const token = createSessionToken(uid, cleanEmail);
      const dashboard = await getUserDashboardData(uid);
      res.json({ token, dashboard });
    } catch (error: any) {
      console.error('Signup failed:', error);
      res.status(500).json({ error: error.message || 'Signup failed' });
    }
  });

  app.post('/api/auth/quick-entry', async (req, res) => {
    try {
      const { firstName, lastName, uiLang, goalMinutes, learningReason } = req.body || {};
      const fName = (firstName || '').trim();
      const lName = (lastName || '').trim();

      if (!fName) {
        return res.status(400).json({
          error:
            uiLang === 'ar'
              ? 'يرجى إدخال الاسم الأول على الأقل للبدء.'
              : uiLang === 'ru'
              ? 'Пожалуйста, введите как минимум имя.'
              : 'Please enter at least your first name to begin.',
        });
      }

      const fullName = lName ? `${fName} ${lName}` : fName;
      const uid = `usr_quick_${crypto.randomBytes(8).toString('hex')}`;
      const email = `student_${Date.now()}_${crypto.randomBytes(3).toString('hex')}@madi.student`;

      await getOrCreateUser(uid, email, {
        displayName: fullName,
        uiLang: uiLang || 'ar',
        goalMinutes: Number(goalMinutes) || 10,
        learningReason: learningReason || 'university',
        consentAccepted: true,
      });

      const token = createSessionToken(uid, email);
      const dashboard = await getUserDashboardData(uid);
      res.json({ token, dashboard });
    } catch (error: any) {
      console.error('Quick entry failed:', error);
      res.status(500).json({ error: error.message || 'Quick entry failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password, uiLang } = req.body || {};
      if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const cleanEmail = email.trim().toLowerCase();
      let profile = await findProfileByEmail(cleanEmail);
      const pwdHash = hashPassword(password);

      if (!profile) {
        const uid = `usr_${crypto.randomBytes(10).toString('hex')}`;
        profile = await getOrCreateUser(uid, cleanEmail, {
          displayName: cleanEmail.split('@')[0],
          uiLang: uiLang || 'en',
          goalMinutes: 10,
          learningReason: 'university',
          consentAccepted: true,
          passwordHash: pwdHash,
        });
      } else if (profile.passwordHash && profile.passwordHash !== pwdHash) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = createSessionToken(profile.id, cleanEmail);
      const dashboard = await getUserDashboardData(profile.id);
      res.json({ token, dashboard });
    } catch (error: any) {
      console.error('Login failed:', error);
      res.status(500).json({ error: error.message || 'Login failed' });
    }
  });

  app.post('/api/auth/firebase-sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@madi.student`;
      const { displayName, uiLang, goalMinutes, learningReason } = req.body || {};

      await getOrCreateUser(uid, email, {
        displayName: displayName || req.user!.name || email.split('@')[0],
        uiLang: uiLang || 'en',
        goalMinutes: Number(goalMinutes) || 10,
        learningReason: learningReason || 'university',
        consentAccepted: true,
      });

      const token = createSessionToken(uid, email);
      const dashboard = await getUserDashboardData(uid);
      res.json({ token, dashboard });
    } catch (error: any) {
      console.error('Firebase sync failed:', error);
      res.status(500).json({ error: error.message || 'Failed to sync user' });
    }
  });

  app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@madi.student`;
      await getOrCreateUser(uid, email);
      const dashboard = await getUserDashboardData(uid);
      res.json(dashboard);
    } catch (error: any) {
      console.error('Fetch /api/me failed:', error);
      res.status(500).json({ error: error.message || 'Failed to load profile' });
    }
  });

  app.put('/api/me/settings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const updated = await updateProfileSettingsInDb(uid, req.body || {});
      res.json(updated);
    } catch (error: any) {
      console.error('Update settings failed:', error);
      res.status(500).json({ error: error.message || 'Failed to update settings' });
    }
  });

  app.post('/api/me/mistake', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { stepId, lessonId, promptPreview, correctAnswer, itemType, caseCode } = req.body || {};
      if (!stepId || !lessonId) {
        return res.status(400).json({ error: 'stepId and lessonId are required' });
      }
      await recordMistakeInDb(
        uid,
        String(stepId),
        String(lessonId),
        String(promptPreview || ''),
        String(correctAnswer || ''),
        itemType,
        caseCode ? String(caseCode) : undefined
      );
      const dashboard = await getUserDashboardData(uid);
      res.json(dashboard);
    } catch (error: any) {
      console.error('Record mistake failed:', error);
      res.status(500).json({ error: error.message || 'Failed to record mistake' });
    }
  });

  app.post('/api/me/words', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { wordId, action, status, isFavorite } = req.body || {};
      const resolvedAction =
        action || status || (isFavorite !== undefined ? 'toggle_favorite' : 'favorite');
      if (!wordId || !resolvedAction) {
        return res.status(400).json({ error: 'wordId and action/status are required' });
      }
      const dashboard = await upsertUserWordInDb(uid, String(wordId), resolvedAction);
      res.json(dashboard);
    } catch (error: any) {
      console.error('Update user word failed:', error);
      res.status(500).json({ error: error.message || 'Failed to update word status' });
    }
  });

  app.post('/api/me/garage/review', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { reviews, outcomes } = req.body || {};
      const list = Array.isArray(reviews)
        ? reviews
        : Array.isArray(outcomes)
        ? outcomes.map((o: any) => ({
            itemRef: o.itemRef || o.itemId,
            isCorrect: Boolean(o.wasCorrect ?? o.isCorrect),
          }))
        : null;
      if (!list) {
        return res.status(400).json({ error: 'reviews or outcomes array is required' });
      }
      const dashboard = await reviewGarageItemsInDb(uid, list);
      res.json(dashboard);
    } catch (error: any) {
      console.error('Garage review failed:', error);
      res.status(500).json({ error: error.message || 'Failed to record Garage review' });
    }
  });

  app.post('/api/me/typing-result', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const {
        textId,
        mode,
        cpm,
        accuracy,
        durationSeconds,
        letterMistakes,
        mistakesByLetter,
        fuelEarned,
      } = req.body || {};
      if (!textId || !mode) {
        return res.status(400).json({ error: 'textId and mode are required' });
      }
      const dashboard = await saveTypingResultInDb(uid, {
        textId: String(textId),
        mode: String(mode),
        cpm: Number(cpm || 0),
        accuracy: Number(accuracy || 100),
        durationSeconds: Number(durationSeconds || 1),
        letterMistakes: letterMistakes || mistakesByLetter || {},
        fuelEarned: Number(fuelEarned || 15),
      });
      res.json(dashboard);
    } catch (error: any) {
      console.error('Save typing result failed:', error);
      res.status(500).json({ error: error.message || 'Failed to save typing result' });
    }
  });

  app.post('/api/me/analytics', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { eventName, payload } = req.body || {};
      if (eventName) {
        await recordAnalyticsEventInDb(uid, String(eventName), payload || {});
      }
      res.json({ ok: true });
    } catch {
      res.json({ ok: false });
    }
  });

  app.post('/api/me/lesson-complete', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { lessonId, accuracy, fuelEarned } = req.body || {};
      if (!lessonId) {
        return res.status(400).json({ error: 'lessonId is required' });
      }
      const dashboard = await completeLessonInDb(
        uid,
        String(lessonId),
        Number(accuracy ?? 100),
        Number(fuelEarned ?? 40)
      );
      res.json(dashboard);
    } catch (error: any) {
      console.error('Complete lesson failed:', error);
      res.status(500).json({ error: error.message || 'Failed to save lesson completion' });
    }
  });

  app.delete('/api/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const result = await deleteUserAccountFromDb(uid);
      res.json(result);
    } catch (error: any) {
      console.error('Delete account failed:', error);
      res.status(500).json({ error: error.message || 'Failed to delete account' });
    }
  });

  // ==========================================================================
  // PHASE 3 API ROUTES: SPEAKING, SCENARIOS, AI PIPELINE, TEACHER & LIBRARY
  // ==========================================================================

  // 1. Get published speaking clips & scenarios + optional editorial drafts
  app.get('/api/phase3/speaking-data', (req, res) => {
    const includeDrafts = req.query.includeDrafts === 'true';
    const publishedClips = runtimeClips.filter(
      (c) => validateClipForPublication(c).allowed
    );
    const draftClips = runtimeClips.filter(
      (c) => !validateClipForPublication(c).allowed
    );
    res.json({
      clips: includeDrafts ? [...publishedClips, ...draftClips] : publishedClips,
      publishedCount: publishedClips.length,
      draftCount: draftClips.length,
      allClips: runtimeClips,
      scenarios: CONVERSATION_SCENARIOS,
      freeConversationBetaEnabled:
        process.env.VITE_ENABLE_FREE_CONVERSATION_BETA !== 'false',
    });
  });

  // 1b. Server-side Multi-Language Text-to-Speech (/api/ai/tts)
  app.post('/api/ai/tts', async (req, res) => {
    try {
      const { userId = 'guest-student', text = '', slow = false, lang = 'ru' } = req.body || {};
      if (!String(text).trim()) {
        return res.status(400).json({ error: 'Text is required for TTS.' });
      }
      const normalizedLang: 'ru' | 'ar' | 'en' | 'fr' = ['ru', 'ar', 'en', 'fr'].includes(
        String(lang)
      )
        ? (String(lang) as 'ru' | 'ar' | 'en' | 'fr')
        : 'ru';

      runtimeTelemetry.activeUserIds.add(String(userId));
      runtimeTelemetry.ttsRequests += 1;

      const ttsResult = await ttsProvider.synthesize({
        text: String(text),
        slow: Boolean(slow),
        lang: normalizedLang,
      });

      if (!ttsResult.audioDataUrl) {
        return res.status(503).json({
          error:
            ttsResult.errorReason ||
            'AI Text-to-Speech synthesis unavailable.',
          providerUsed: ttsResult.providerUsed,
        });
      }

      res.json({
        audioDataUrl: ttsResult.audioDataUrl,
        providerUsed: ttsResult.providerUsed,
        cachedKey: ttsResult.cachedKey,
      });
    } catch (error: any) {
      console.error('TTS endpoint error:', error);
      res.status(500).json({ error: error.message || 'TTS synthesis failed.' });
    }
  });

  // 2. Server-side Repeat-After-Me Speech Scoring (/api/speech/score)
  app.post('/api/speech/score', async (req, res) => {
    try {
      const {
        userId = 'guest-student',
        clipId,
        targetText,
        targetDurationSec = 4.5,
        actualDurationSec = 4.2,
        audioBase64,
        mimeType,
        simulatedTranscript,
        storeRecordingConsent = false,
      } = req.body || {};

      if (!targetText) {
        return res.status(400).json({ error: 'targetText is required' });
      }

      // Check daily quota & provider budget guard
      const quota = quotaGuard.checkAndConsume(String(userId), 0.004);
      if (!quota.allowed) {
        return res.status(429).json({ error: quota.reason || 'Quota exceeded' });
      }
      runtimeTelemetry.activeUserIds.add(String(userId));
      runtimeTelemetry.sttRequests += 1;
      runtimeTelemetry.sttEstimatedCostUsd =
        Math.round((runtimeTelemetry.sttEstimatedCostUsd + 0.004) * 10000) / 10000;

      // 1) Transcribe with swappable STTProvider
      const sttResult = await sttProvider.transcribe({
        audioBase64,
        mimeType,
        simulatedTranscript,
        targetReferenceText: String(targetText),
        durationSec: Number(actualDurationSec || 4.0),
      });

      // 2) Align transcript to target text & compute separate scores
      const scoreBreakdown = scoreSpeechAttempt({
        targetText: String(targetText),
        transcriptText: sttResult.transcript,
        targetDurationSec: Number(targetDurationSec || 4.5),
        actualDurationSec: Number(actualDurationSec || sttResult.durationSec || 4.0),
        wordConfidences: sttResult.wordConfidences,
      });

      // 3) Save best score per clip (delete audio immediately unless storeRecordingConsent === true)
      if (clipId) {
        if (!runtimeBestSpeechScores[userId]) {
          runtimeBestSpeechScores[userId] = {};
        }
        const prev = runtimeBestSpeechScores[userId][clipId];
        if (!prev || scoreBreakdown.overall > prev.score) {
          runtimeBestSpeechScores[userId][clipId] = {
            score: scoreBreakdown.overall,
            stars: scoreBreakdown.stars,
          };
        }
      }

      res.json({
        transcript: sttResult.transcript,
        providerUsed: sttResult.providerUsed,
        audioStored: Boolean(storeRecordingConsent),
        ...scoreBreakdown,
        quotaRemaining: quota.remainingUserQuota,
      });
    } catch (error: any) {
      console.error('Speech scoring failed:', error);
      res.status(500).json({ error: error.message || 'Speech scoring failed' });
    }
  });

  // 3. Server-side AI Free-Conversation Role-Play Beta (/api/ai/chat)
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const {
        userId = 'guest-student',
        scenarioTitle = 'В кампусе МАДИ',
        level = 'A1',
        userMessage = '',
        history = [],
      } = req.body || {};

      if (!userMessage.trim()) {
        return res.status(400).json({ error: 'userMessage is required' });
      }

      const quota = quotaGuard.checkAndConsume(String(userId), 0.003);
      if (!quota.allowed) {
        return res.status(429).json({ error: quota.reason || 'Quota exceeded' });
      }
      runtimeTelemetry.activeUserIds.add(String(userId));
      runtimeTelemetry.llmRequests += 1;
      runtimeTelemetry.llmEstimatedCostUsd =
        Math.round((runtimeTelemetry.llmEstimatedCostUsd + 0.003) * 10000) / 10000;

      const reply = await llmProvider.replyInFreeConversation({
        scenarioTitle: String(scenarioTitle),
        level: level as any,
        userMessage: String(userMessage),
        history: Array.isArray(history) ? history : [],
      });

      res.json({
        ...reply,
        quotaRemaining: quota.remainingUserQuota,
      });
    } catch (error: any) {
      console.error('Free conversation failed:', error);
      res.status(500).json({ error: error.message || 'Conversation reply failed' });
    }
  });

  // 4. AI Content Pipeline Generator (/api/ai/generate) -> Enters Review Queue
  app.post('/api/ai/generate', async (req, res) => {
    try {
      const {
        userId = 'authenticated-teacher',
        userRole = 'teacher',
        level = 'A1',
        topic = 'campus',
        grammarPoint = 'Prepositional Case',
        lengthLines = 4,
        register = 'formal',
      } = req.body || {};

      if (!canApproveContent(userRole as UserRole)) {
        return res.status(403).json({ error: 'Only teachers, reviewers, or admins can generate content.' });
      }

      const quota = quotaGuard.checkAndConsume(String(userId), 0.008);
      if (!quota.allowed) {
        return res.status(429).json({ error: quota.reason || 'Quota exceeded' });
      }
      runtimeTelemetry.activeUserIds.add(String(userId));
      runtimeTelemetry.llmRequests += 1;
      runtimeTelemetry.llmEstimatedCostUsd =
        Math.round((runtimeTelemetry.llmEstimatedCostUsd + 0.008) * 10000) / 10000;

      const generated = await llmProvider.generateDialogueContent({
        level: level as any,
        topic: String(topic),
        grammarPoint: String(grammarPoint),
        lengthLines: Number(lengthLines || 4),
        register: register === 'colloquial' ? 'colloquial' : 'formal',
      });

      const dictForValidation = DICTIONARY_WORDS.map((w) => ({
        lemma: w.stressed,
        level: w.level,
      }));
      const existingTitles = runtimeReviewQueue.map((item) => item.title);
      const validation = validateGeneratedContent(
        generated,
        dictForValidation,
        existingTitles
      );

      const newQueueItem: ReviewQueueItem = {
        id: `rq-${Date.now()}`,
        itemType: 'ai_dialogue',
        title: generated.title,
        level: generated.level as any,
        topic: generated.topic,
        grammarPoint: generated.grammarPoint,
        register: generated.register,
        status: 'needs_review',
        createdBy: AI_EDITORIAL_ATTRIBUTION,
        createdAt: new Date().toISOString(),
        reviewedBy: null,
        reviewedAt: null,
        reviewerComments: '',
        consentConfirmed: false,
        consentDocumentUrl: null,
        license: '',
        sourceUrl: '',
        lines: generated.lines,
        vocabulary: generated.vocabulary,
        validationSummary: {
          stressMarksPassed: validation.stressMarksPassed,
          safeContentPassed: validation.safeContentPassed,
          vocabLevelPassed: validation.vocabLevelPassed,
        },
      };

      runtimeReviewQueue.unshift(newQueueItem);
      runtimeAuditLog.unshift({
        id: `aud-${Date.now()}`,
        actorId: String(userId),
        actorName: String(userId),
        actorRole: userRole as UserRole,
        action: 'GENERATE_AI_CONTENT',
        targetType: 'review_queue',
        targetId: newQueueItem.id,
        details: `Generated ${generated.level} dialogue "${generated.title}" (${generated.lines.length} lines)`,
        timestamp: new Date().toISOString(),
      });

      res.json({
        queueItem: newQueueItem,
        validation,
      });
    } catch (error: any) {
      console.error('AI content generation failed:', error);
      res.status(500).json({ error: error.message || 'Generation failed' });
    }
  });

  // 5. Auto-translate step for No-Code Lesson Builder (/api/ai/translate-step)
  app.post('/api/ai/translate-step', async (req, res) => {
    try {
      const { russianText = '' } = req.body || {};
      if (!russianText.trim()) {
        return res.status(400).json({ error: 'russianText is required' });
      }
      const translations = await llmProvider.generateLessonStepTranslations({
        russianText: String(russianText),
      });
      res.json(translations);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Translation failed' });
    }
  });

  // 5b. AI Instant Translator for Dictionary (/api/ai/instant-translate)
  app.post('/api/ai/instant-translate', async (req, res) => {
    try {
      const {
        userId = 'guest-student',
        text = '',
        sourceLang = 'auto',
        targetLang = 'ar',
      } = req.body || {};

      const cleanText = String(text || '').trim();
      if (!cleanText) {
        return res.status(400).json({ error: 'Text to translate is required.' });
      }
      if (cleanText.length > 2000) {
        return res.status(400).json({ error: 'Text exceeds maximum length (2000 characters).' });
      }

      const validSources = ['auto', 'ru', 'en', 'ar', 'fr'];
      const validTargets = ['ru', 'en', 'ar', 'fr'];
      const resolvedSource = (validSources.includes(sourceLang) ? sourceLang : 'auto') as
        | 'auto'
        | 'ru'
        | 'en'
        | 'ar'
        | 'fr';
      const resolvedTarget = (validTargets.includes(targetLang) ? targetLang : 'ar') as
        | 'ru'
        | 'en'
        | 'ar'
        | 'fr';

      runtimeTelemetry.activeUserIds.add(String(userId));
      runtimeTelemetry.llmRequests += 1;
      runtimeTelemetry.llmEstimatedCostUsd =
        Math.round((runtimeTelemetry.llmEstimatedCostUsd + 0.001) * 10000) / 10000;

      const result = await llmProvider.instantTranslate({
        text: cleanText,
        sourceLang: resolvedSource,
        targetLang: resolvedTarget,
      });

      res.json(result);
    } catch (error: any) {
      console.error('AI Instant Translation error:', error);
      res.status(500).json({
        error: error.message || 'AI Instant Translation failed. Please try again.',
      });
    }
  });

  // 6. Teacher Dashboard & Review Queue Data (/api/teacher/dashboard)
  app.get('/api/teacher/dashboard', (_req, res) => {
    res.json({
      groups: runtimeGroups,
      assignments: runtimeAssignments,
      announcements: runtimeAnnouncements,
      reviewQueue: runtimeReviewQueue,
      customLessons: runtimeCustomLessons,
      auditLog: runtimeAuditLog,
      reports: runtimeReports,
    });
  });

  // 7. Review Queue Approve / Reject / Inline Edit (/api/review-queue/:id)
  app.post('/api/review-queue/:id/decision', (req, res) => {
    const { id } = req.params;
    const {
      decision, // 'approved' | 'rejected' | 'needs_review' | 'draft'
      reviewerName,
      reviewerRole = 'content_reviewer',
      comments = '',
      updatedTitle,
      updatedLines,
      consentConfirmed,
      consentDocumentUrl,
      license,
      sourceUrl,
    } = req.body || {};

    if (!canApproveContent(reviewerRole as UserRole)) {
      return res.status(403).json({ error: 'Insufficient role to review content.' });
    }
    const cleanReviewer = String(reviewerName || '').trim();
    if (!cleanReviewer) {
      return res.status(400).json({ error: 'Authenticated reviewerName is required.' });
    }

    const item = runtimeReviewQueue.find((r) => r.id === id);
    if (!item) {
      return res.status(404).json({ error: 'Review queue item not found' });
    }

    if (typeof updatedTitle === 'string' && updatedTitle.trim()) {
      item.title = updatedTitle.trim();
    }
    if (Array.isArray(updatedLines)) {
      item.lines = updatedLines;
    }
    if (typeof consentDocumentUrl === 'string') {
      item.consentDocumentUrl = consentDocumentUrl.trim() || null;
    }
    if (typeof license === 'string') {
      item.license = license.trim();
    }
    if (typeof sourceUrl === 'string') {
      item.sourceUrl = sourceUrl.trim();
    }

    // Signed consent can ONLY be true if a real uploaded consent document is attached; otherwise stays draft
    const hasConsentDoc = Boolean(item.consentDocumentUrl && item.consentDocumentUrl.length > 5);
    item.consentConfirmed = Boolean(consentConfirmed && hasConsentDoc);

    if (decision === 'approved') {
      if (!item.consentConfirmed || !hasConsentDoc) {
        item.status = 'draft';
        return res.status(400).json({
          error:
            'Signed consent requires an uploaded consent document attachment; without it the item stays Draft.',
        });
      }
      if (!isAllowedLicense(item.license)) {
        return res.status(400).json({
          error: `License is required from fixed list: ${ALLOWED_CONTENT_LICENSES.join(', ')}`,
        });
      }
      if (!item.sourceUrl || !/^https?:\/\/\S+/i.test(item.sourceUrl)) {
        return res.status(400).json({
          error: 'A valid human-entered sourceUrl (https://...) is required before approval.',
        });
      }
    }

    item.status = decision;
    item.reviewedBy = cleanReviewer;
    item.reviewedAt = new Date().toISOString();
    item.reviewerComments = comments;

    if (decision === 'approved' && item.lines.length > 0) {
      const firstLine = item.lines[0];
      const newClipId = `clip-approved-${item.id}`;
      if (!runtimeClips.some((c) => c.id === newClipId)) {
        const words = firstLine.ru.trim().split(/\s+/).filter(Boolean);
        const dur = Math.min(14, Math.max(4, words.length * 0.7));
        const step = dur / Math.max(1, words.length);
        runtimeClips.unshift({
          id: newClipId,
          title: {
            ru: item.title,
            en: item.title,
            ar: item.title,
            fr: item.title,
          },
          level: item.level,
          topic: (item.topic as any) || 'campus',
          grammarPoint: item.grammarPoint,
          durationSec: Math.round(dur * 10) / 10,
          register: item.register,
          registerNote: {
            ru: `Одобрено: ${cleanReviewer}.`,
            en: `Approved by ${cleanReviewer}.`,
            ar: `تمت الموافقة بواسطة ${cleanReviewer}.`,
            fr: `Approuvé par ${cleanReviewer}.`,
          },
          russianSubtitle: firstLine.ru,
          translations: {
            ru: firstLine.ru,
            en: firstLine.en,
            ar: firstLine.ar,
            fr: firstLine.fr,
          },
          wordTimings: words.map((w, idx) => ({
            word: w,
            startSec: Math.round(idx * step * 100) / 100,
            endSec: Math.round((idx + 1) * step * 100) / 100,
          })),
          sceneTheme: 'campus',
          characterSpeaker: 'Instructor',
          sourceType: 'ai_original',
          license: item.license || 'cc_by',
          sourceUrl: item.sourceUrl || '',
          author: cleanReviewer,
          consentConfirmed: true,
          consentDocumentUrl: item.consentDocumentUrl || null,
          reviewedBy: cleanReviewer,
          reviewedAt: item.reviewedAt,
          reviewStatus: 'approved',
        });
      }
    }

    runtimeAuditLog.unshift({
      id: `aud-${Date.now()}`,
      actorId: cleanReviewer,
      actorName: cleanReviewer,
      actorRole: reviewerRole as UserRole,
      action: `REVIEW_${String(decision).toUpperCase()}`,
      targetType: item.itemType,
      targetId: item.id,
      details: `${decision.toUpperCase()}: "${item.title}" — ${comments || 'No comment'}`,
      timestamp: new Date().toISOString(),
    });

    res.json({ item, reviewQueue: runtimeReviewQueue, auditLog: runtimeAuditLog });
  });

  // 8. Teacher Groups: Create Group / Import CSV Students / Create Assignment / Post Announcement / Save Custom Lesson
  app.post('/api/teacher/groups', (req, res) => {
    const { name, level = 'A1', teacherName = 'Instructor' } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Group name is required' });
    const code = `MADI-${Math.floor(300 + Math.random() * 699)}`;
    const newGroup: TeacherGroup = {
      id: `grp-${Date.now()}`,
      name: String(name),
      inviteCode: code,
      teacherId: `tch-${Date.now()}`,
      teacherName: String(teacherName),
      level: level === 'A2' ? 'A2' : 'A1',
      students: [],
    };
    runtimeGroups.push(newGroup);
    res.json({ group: newGroup, groups: runtimeGroups });
  });

  app.post('/api/teacher/groups/:groupId/import-csv', (req, res) => {
    const { groupId } = req.params;
    const { csvText = '' } = req.body || {};
    const group = runtimeGroups.find((g) => g.id === groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const lines = String(csvText)
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    let addedCount = 0;
    for (const line of lines) {
      if (line.toLowerCase().startsWith('name,')) continue; // skip header
      const [namePart, emailPart, langPart] = line.split(',').map((s) => s?.trim());
      if (namePart && emailPart) {
        group.students.push({
          id: `stu-${Date.now()}-${addedCount}`,
          name: namePart,
          email: emailPart,
          nativeLang: (['en', 'ar', 'fr', 'ru'].includes(langPart) ? langPart : 'en') as any,
          lessonsCompleted: 0,
          accuracy: 0,
          streakDays: 0,
          fuel: 0,
          timeSpentMin: 0,
          avgSpeakingScore: 0,
          typingCpm: 0,
          garageDueCount: 0,
          weakLetters: [],
          weakCases: [],
          weakWords: [],
          lastActiveAt: new Date().toISOString(),
          inactiveAlert: false,
        });
        addedCount++;
      }
    }

    res.json({ addedCount, group, groups: runtimeGroups });
  });

  app.post('/api/teacher/assignments', (req, res) => {
    const {
      groupId = '',
      targetType = 'lesson',
      targetId = 'u2-l1',
      title = 'Новое задание',
      dueDate = '2026-11-01',
      createdBy = 'Instructor',
    } = req.body || {};

    const newAsgn: GroupAssignment = {
      id: `asgn-${Date.now()}`,
      groupId: String(groupId),
      targetType: targetType as any,
      targetId: String(targetId),
      title: String(title),
      dueDate: String(dueDate),
      createdBy: String(createdBy),
      completedStudentIds: [],
    };
    runtimeAssignments.unshift(newAsgn);
    res.json({ assignment: newAsgn, assignments: runtimeAssignments });
  });

  app.post('/api/teacher/announcements', (req, res) => {
    const {
      groupId = '',
      authorName = 'Instructor',
      message = '',
    } = req.body || {};
    if (!message.trim()) return res.status(400).json({ error: 'Message is required' });
    const newAnn: GroupAnnouncement = {
      id: `ann-${Date.now()}`,
      groupId: String(groupId),
      authorName: String(authorName),
      message: String(message),
      createdAt: new Date().toISOString(),
    };
    runtimeAnnouncements.unshift(newAnn);
    res.json({ announcement: newAnn, announcements: runtimeAnnouncements });
  });

  app.post('/api/teacher/lessons', (req, res) => {
    const {
      title,
      level = 'A1',
      status = 'published',
      publishTarget = 'all',
      steps = [],
      createdBy = 'Instructor',
    } = req.body || {};

    const lessonObj = {
      id: `custom-lesson-${Date.now()}`,
      title: title || {
        ru: 'Авторский урок МАДИ',
        en: 'Custom MADI Lesson',
        ar: 'درس مخصص من مادي',
        fr: 'Leçon personnalisée MADI',
      },
      level,
      status,
      publishTarget,
      steps,
      version: 1,
      createdBy,
      createdAt: new Date().toISOString(),
    };
    runtimeCustomLessons.unshift(lessonObj);

    runtimeAuditLog.unshift({
      id: `aud-${Date.now()}`,
      actorId: createdBy,
      actorName: createdBy,
      actorRole: 'teacher',
      action: status === 'published' ? 'PUBLISH_CUSTOM_LESSON' : 'SAVE_LESSON_DRAFT',
      targetType: 'custom_lesson',
      targetId: lessonObj.id,
      details: `Saved custom lesson "${lessonObj.title.ru || lessonObj.title}" (${steps.length} steps, status: ${status})`,
      timestamp: new Date().toISOString(),
    });

    res.json({ lesson: lessonObj, customLessons: runtimeCustomLessons });
  });

  // 9. Library Window APIs (/api/library, /api/library/pdf/:id, /api/library/upload, /api/library/report)
  function buildOfficialBookPdfBuffer(item: LibraryItem): Buffer {
    const sanitizeAscii = (str: string) =>
      String(str || '')
        .replace(/[^\x20-\x7E]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');

    const lines: string[] = [
      'MADI DIGITAL LIBRARY (madingo) - OFFICIAL PDF EDITION',
      `Book ID: ${sanitizeAscii(item.id)} | CEFR Level: ${sanitizeAscii(item.level)} | Section: ${sanitizeAscii(item.section)}`,
      `Title (EN): ${sanitizeAscii(item.title.en)}`,
      `Publisher: ${sanitizeAscii(item.publisher || 'MADI University Press')} | Year: ${item.publicationYear || 2022} | Pages: ${item.totalPagesCount || item.pages.length}`,
      `Official Source: ${sanitizeAscii(item.sourceUrl || 'https://www.madi.ru')}`,
      `Direct PDF Link: ${sanitizeAscii(item.pdfUrl || 'https://lib.madi.ru')}`,
      '------------------------------------------------------------------------',
      `Overview: ${sanitizeAscii(item.description?.en || item.title.en)}`,
      '------------------------------------------------------------------------',
    ];

    item.pages.forEach((p) => {
      lines.push(`Page ${p.pageNumber}: ${sanitizeAscii(p.translationNotes.en)}`);
    });

    const contentOps = [
      'BT',
      '/F1 13 Tf',
      '45 780 Td',
      '18 TL',
      ...lines.map((line, idx) => (idx === 0 ? `(${line}) Tj` : `T* (${line}) Tj`)),
      'ET',
    ].join('\n');

    const streamBytes = Buffer.byteLength(contentOps, 'utf8');
    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
      `4 0 obj\n<< /Length ${streamBytes} >>\nstream\n${contentOps}\nendstream\nendobj\n`,
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    ];

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [];
    for (const obj of objects) {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += obj;
    }
    const xrefOffset = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) {
      pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    return Buffer.from(pdf, 'utf8');
  }

  app.get('/api/library/pdf/:id', async (req, res) => {
    const { id } = req.params;
    const item = runtimeLibraryItems.find((i) => i.id === id);
    if (!item) {
      return res.status(404).json({ error: 'Book not found in library catalog' });
    }

    if (
      req.query.redirect === 'external' &&
      item.pdfUrl &&
      /^https?:\/\/(lib\.madi\.ru|www\.madi\.ru)\//i.test(item.pdfUrl)
    ) {
      return res.redirect(302, item.pdfUrl);
    }

    const filename = `${item.id}-${item.level}.pdf`;
    const disposition = req.query.download === '1' ? 'attachment' : 'inline';
    const pdfBuf = buildOfficialBookPdfBuffer(item);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
    res.setHeader('Content-Length', String(pdfBuf.length));
    return res.send(pdfBuf);
  });

  app.get('/api/library', (req, res) => {
    const role = (req.query.role as UserRole) || 'student';
    const includeDrafts = req.query.includeDrafts === 'true';
    const items =
      canModerateLibrary(role) || includeDrafts
        ? runtimeLibraryItems
        : runtimeLibraryItems.filter((item) => validateLibraryItemForPublication(item).allowed);
    res.json({
      items,
      approvedCount: runtimeLibraryItems.filter((i) => validateLibraryItemForPublication(i).allowed).length,
      draftCount: runtimeLibraryItems.filter((i) => !validateLibraryItemForPublication(i).allowed).length,
      reports: runtimeReports,
    });
  });

  app.post('/api/library/upload', (req, res) => {
    const {
      titleRu,
      titleEn,
      author = 'Instructor',
      section = 'reading',
      level = 'A1',
      topic = 'campus',
      licenseType = '',
      sourceUrl = '',
      permissionConfirmed = false,
      russianText = '',
      translationNote = '',
    } = req.body || {};

    if (!permissionConfirmed) {
      return res.status(400).json({
        error: 'You must confirm that you have the right/permission to share this material.',
      });
    }
    if (!isAllowedLicense(licenseType)) {
      return res.status(400).json({
        error: `Please select a valid license from the fixed list: ${ALLOWED_CONTENT_LICENSES.join(', ')}.`,
      });
    }
    if (!sourceUrl || !/^https?:\/\/\S+/i.test(String(sourceUrl).trim())) {
      return res.status(400).json({
        error: 'Please enter a valid source URL (https://...) for license verification.',
      });
    }

    const newId = `lib-upload-${Date.now()}`;
    const newItem: LibraryItem = {
      id: newId,
      title: {
        ru: titleRu || 'Новый учебный материал',
        en: titleEn || titleRu || 'New Learning Material',
        ar: titleEn || titleRu || 'مادة تعليمية جديدة',
        fr: titleEn || titleRu || 'Nouveau support pédagogique',
      },
      author,
      publisher: 'МАДИ · Кафедра РКИ',
      publicationYear: new Date().getFullYear(),
      totalPagesCount: 12,
      origin: 'madi_official',
      section: section as any,
      level: level as any,
      topic,
      explanationLang: 'all',
      licenseType: String(licenseType),
      licenseText: String(licenseType),
      sourceUrl: String(sourceUrl).trim(),
      pdfUrl: `/api/library/pdf/${newId}`,
      permissionConfirmed: Boolean(permissionConfirmed),
      reviewStatus: 'needs_review',
      reviewedBy: null,
      reviewedAt: null,
      pages: [
        {
          pageNumber: 1,
          heading: titleRu || 'Страница 1',
          russianText:
            russianText ||
            'Здра́вствуйте! Э́то но́вый материа́л для студе́нтов МАДИ́.',
          translationNotes: {
            ru: translationNote || 'Добавлено преподавателем на модерацию.',
            en: translationNote || 'Uploaded by teacher — pending admin review.',
            ar: translationNote || 'تم الرفع بواسطة المدرس — بانتظار موافقة المشرف.',
            fr: translationNote || 'Importé par l’enseignant — en attente de validation.',
          },
        },
      ],
    };

    runtimeLibraryItems.unshift(newItem);
    runtimeAuditLog.unshift({
      id: `aud-${Date.now()}`,
      actorId: author,
      actorName: author,
      actorRole: 'teacher',
      action: 'UPLOAD_LIBRARY_ITEM',
      targetType: 'library_item',
      targetId: newItem.id,
      details: `Uploaded "${newItem.title.ru}" (license=${licenseType}, sourceUrl=${sourceUrl}, status=needs_review)`,
      timestamp: new Date().toISOString(),
    });

    res.json({ item: newItem, items: runtimeLibraryItems });
  });

  app.post('/api/library/:id/approve', (req, res) => {
    const { id } = req.params;
    const { actorRole = 'admin', actorName = 'Administrator', licenseType, sourceUrl } = req.body || {};
    if (!canModerateLibrary(actorRole as UserRole)) {
      return res.status(403).json({ error: 'Only admins/reviewers can approve library materials.' });
    }
    const item = runtimeLibraryItems.find((i) => i.id === id);
    if (!item) return res.status(404).json({ error: 'Library item not found' });

    if (typeof licenseType === 'string' && licenseType.trim()) {
      item.licenseType = licenseType.trim();
      item.licenseText = licenseType.trim();
    }
    if (typeof sourceUrl === 'string' && sourceUrl.trim()) {
      item.sourceUrl = sourceUrl.trim();
    }
    if (!isAllowedLicense(item.licenseType) || !item.sourceUrl || !/^https?:\/\/\S+/i.test(item.sourceUrl)) {
      return res.status(400).json({
        error: 'Cannot approve library item without a valid fixed license and https:// source URL.',
      });
    }

    item.permissionConfirmed = true;
    item.reviewStatus = 'approved';
    item.reviewedBy = String(actorName).trim();
    item.reviewedAt = new Date().toISOString();

    runtimeAuditLog.unshift({
      id: `aud-${Date.now()}`,
      actorId: item.reviewedBy,
      actorName: item.reviewedBy,
      actorRole: actorRole as UserRole,
      action: 'APPROVE_LIBRARY_ITEM',
      targetType: 'library_item',
      targetId: item.id,
      details: `Approved library item "${item.title.ru}" by ${item.reviewedBy} on ${item.reviewedAt}.`,
      timestamp: item.reviewedAt,
    });

    res.json({ item, items: runtimeLibraryItems });
  });

  // Report & Takedown endpoint
  app.post('/api/library/report', (req, res) => {
    const {
      targetType = 'library_item',
      targetId,
      targetTitle = '',
      reportedBy = 'student',
      reason = 'Copyright / accuracy concern',
      immediateAdminTakedown = false,
      actorRole = 'student',
    } = req.body || {};

    const report: ContentReportItem = {
      id: `rep-${Date.now()}`,
      targetType,
      targetId: String(targetId),
      targetTitle: String(targetTitle),
      reportedBy: String(reportedBy),
      reason: String(reason),
      status: immediateAdminTakedown && canModerateLibrary(actorRole) ? 'unpublished_resolved' : 'open',
      createdAt: new Date().toISOString(),
    };
    runtimeReports.unshift(report);

    if (immediateAdminTakedown && canModerateLibrary(actorRole)) {
      const libItem = runtimeLibraryItems.find((i) => i.id === targetId);
      if (libItem) {
        libItem.reviewStatus = 'rejected';
      }
      runtimeAuditLog.unshift({
        id: `aud-${Date.now()}`,
        actorId: reportedBy,
        actorName: reportedBy,
        actorRole: actorRole as UserRole,
        action: 'TAKEDOWN_UNPUBLISH',
        targetType,
        targetId: String(targetId),
        details: `Immediate takedown executed on "${targetTitle}": ${reason}`,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ report, reports: runtimeReports, items: runtimeLibraryItems });
  });

  // ==========================================================================
  // PHASE 4 API ROUTES: HEALTH, CERTIFICATES, VERIFY, LEAGUES, ANTI-CHEAT, GDPR
  // ==========================================================================

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'madingo-server',
      phase: 4,
      uptimeSec: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/phase4/analytics', (_req, res) => {
    const activeCount = runtimeTelemetry.activeUserIds.size;
    res.json({
      dau: activeCount,
      wau: activeCount,
      mau: activeCount,
      certificatesCount: runtimeCertificates.filter((c) => !c.revoked).length,
      services: [
        {
          service: 'stt',
          requestsCount: runtimeTelemetry.sttRequests,
          estimatedCostUsd: runtimeTelemetry.sttEstimatedCostUsd,
        },
        {
          service: 'tts',
          requestsCount: runtimeTelemetry.ttsRequests,
          estimatedCostUsd: runtimeTelemetry.ttsEstimatedCostUsd,
        },
        {
          service: 'llm',
          requestsCount: runtimeTelemetry.llmRequests,
          estimatedCostUsd: runtimeTelemetry.llmEstimatedCostUsd,
        },
      ],
    });
  });

  app.get('/api/phase4/overview', (_req, res) => {
    res.json({
      certificates: runtimeCertificates,
      disclaimerText: runtimeCertificateDisclaimer,
      badges: PHASE4_BADGES,
      cosmetics: PHASE4_COSMETICS,
      leagueParticipants: SEED_LEAGUE_PARTICIPANTS,
      facultyBoard: SEED_FACULTY_BOARD,
      classChallenges: SEED_CLASS_CHALLENGES,
      friends: SEED_FRIENDS,
    });
  });

  app.post('/api/phase4/certificates/issue', (req, res) => {
    const {
      userId = 'local-student',
      level = 'A1',
      studentNameLatin,
      studentNameCyrillic,
      nameLatin,
      nameCyrillic,
      scorePct = 92,
      uiLang = 'en',
      signatureTeacher = 'Преподаватель курса РКИ / Course Instructor',
    } = req.body || {};

    const finalLatin = String(studentNameLatin || nameLatin || '').trim();
    const finalCyrillic = String(studentNameCyrillic || nameCyrillic || '').trim();

    const check = checkCertificateEligibility({
      scorePct: Number(scorePct),
      passScorePct: 75,
      nameLatinConfirmed: finalLatin,
      nameCyrillicConfirmed: finalCyrillic,
    });

    if (!check.eligible || !check.scoreBand) {
      return res.status(400).json({ error: check.reason || 'Not eligible for certificate' });
    }

    const certId = generateCertificateId(level as any, String(userId), Date.now());
    const newCert: CertificateRecord = {
      id: certId,
      userId: String(userId),
      level: level as any,
      studentNameLatin: finalLatin,
      studentNameCyrillic: finalCyrillic,
      scorePct: Number(scorePct),
      scoreBand: check.scoreBand,
      issuedAt: new Date().toISOString(),
      verifyUrl: `/verify/${certId}`,
      revoked: false,
      disclaimerText: runtimeCertificateDisclaimer,
      signatureTeacher: String(signatureTeacher),
      signatureDepartment: 'Кафедра русского языка МАДИ',
    };

    const existingIdx = runtimeCertificates.findIndex(
      (c) => c.userId === userId && c.level === level
    );
    if (existingIdx >= 0) {
      runtimeCertificates[existingIdx] = newCert;
    } else {
      runtimeCertificates.unshift(newCert);
    }

    const svgPreview = renderCertificateSvg(newCert, uiLang as any, runtimeCertificateDisclaimer);
    res.json({
      certificate: newCert,
      certificates: runtimeCertificates,
      svgPreview,
    });
  });

  app.post('/api/phase4/certificates/:id/revoke', (req, res) => {
    const { id } = req.params;
    const { reason = 'Administrative revocation', actorRole = 'admin' } = req.body || {};
    if (actorRole !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can revoke certificates.' });
    }
    const cert = runtimeCertificates.find((c) => c.id === id);
    if (!cert) {
      return res.status(404).json({ error: 'Certificate not found' });
    }
    cert.revoked = !cert.revoked;
    cert.revokedReason = cert.revoked ? String(reason) : null;
    cert.revokedAt = cert.revoked ? new Date().toISOString() : null;
    res.json({ certificate: cert, certificates: runtimeCertificates });
  });

  app.put('/api/phase4/certificates/disclaimer', (req, res) => {
    const { disclaimerText, disclaimer, actorRole = 'admin' } = req.body || {};
    if (actorRole !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update certificate legal wording.' });
    }
    const nextText = typeof disclaimerText === 'string' ? disclaimerText : disclaimer;
    if (typeof nextText === 'string' && nextText.trim()) {
      runtimeCertificateDisclaimer = nextText.trim();
      for (const c of runtimeCertificates) {
        c.disclaimerText = runtimeCertificateDisclaimer;
      }
    }
    res.json({ disclaimerText: runtimeCertificateDisclaimer, certificates: runtimeCertificates });
  });

  // Public Certificate Verification Endpoint (Exposes ONLY Name, Level, Date, Score Band, and Validity)
  app.get('/api/verify/:id', (req, res) => {
    const { id } = req.params;
    const cert = runtimeCertificates.find((c) => c.id.toUpperCase() === String(id).toUpperCase());
    if (!cert) {
      return res.status(404).json({ valid: false, error: 'Certificate ID not found' });
    }
    res.json({
      valid: !cert.revoked,
      certificate: {
        id: cert.id,
        studentNameLatin: cert.studentNameLatin,
        studentNameCyrillic: cert.studentNameCyrillic,
        level: cert.level,
        scorePct: cert.scorePct,
        scoreBand: cert.scoreBand,
        issuedAt: cert.issuedAt,
        revoked: cert.revoked,
        revokedReason: cert.revokedReason || null,
        disclaimerText: cert.disclaimerText,
      },
    });
  });

  app.post('/api/phase4/fuel-validate', (req, res) => {
    const result = validateFuelAwardAntiCheat(req.body || {});
    res.json(result);
  });

  app.get('/api/phase4/gdpr-export', (req, res) => {
    const userId = String(req.query.userId || 'local-student');
    res.json({
      exportedAt: new Date().toISOString(),
      platform: 'madingo (MADI Russian Learning Platform)',
      gdprCompliant: true,
      userId,
      certificates: runtimeCertificates.filter((c) => c.userId === userId),
      bestSpeechScores: runtimeBestSpeechScores[userId] || {},
    });
  });

  // ==========================================================================
  // AI CLASSROOM CHALLENGE ARENA (Teacher-Led Live Quiz Rooms & Page Extraction)
  // ==========================================================================

  const runtimeArenaRooms = new Map<string, ArenaRoom>();
  const arenaRoomSockets = new Map<string, Set<WebSocket>>();

  function broadcastToArenaRoom(roomId: string, message: any) {
    const sockets = arenaRoomSockets.get(roomId);
    if (!sockets) return;
    const payload = JSON.stringify(message);
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(payload);
        } catch {
          // ignore
        }
      }
    }
  }



  // GET /api/arena/rooms — List active rooms
  app.get('/api/arena/rooms', (_req, res) => {
    const list = Array.from(runtimeArenaRooms.values()).map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      description: r.description,
      teacherName: r.teacherName,
      status: r.status,
      exerciseTopic: r.exerciseTopic,
      questionsCount: r.questions.length,
      participantsCount: Object.values(r.participants).filter(
        (p) => p.role === 'student' || p.totalAnswered > 0
      ).length,
      createdAt: r.createdAt,
    }));
    res.json({ rooms: list });
  });

  // POST /api/arena/rooms — Create a new challenge room
  app.post('/api/arena/rooms', (req, res) => {
    try {
      const {
        title,
        description,
        teacherId = 'teacher-1',
        teacherName = 'Преподаватель МАДИ',
        exerciseTopic = 'Практический русский язык (МАДИ)',
        teacherInstructions = '',
        timeLimitSeconds = 30,
      } = req.body || {};

      const code = generateRoomCode();
      const roomId = `room-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const newRoom: ArenaRoom = {
        id: roomId,
        code,
        title: title || `غرفة تحدي ${code}`,
        description: description || '',
        teacherId: String(teacherId),
        teacherName: String(teacherName),
        status: 'setup',
        exerciseTopic: String(exerciseTopic),
        teacherInstructions: String(teacherInstructions),
        pages: [],
        questions: [],
        currentQuestionIndex: 0,
        questionTimeLimitSeconds: Math.max(10, Math.min(60, Number(timeLimitSeconds) || 30)),
        participants: {
          [String(teacherId)]: {
            id: String(teacherId),
            name: String(teacherName),
            avatar: 'teacher-icon',
            role: 'teacher',
            score: 0,
            correctCount: 0,
            totalAnswered: 0,
            currentStreak: 0,
            bestStreak: 0,
            answers: {},
            isOnline: true,
            joinedAt: new Date().toISOString(),
          },
        },
        createdAt: new Date().toISOString(),
      };

      runtimeArenaRooms.set(roomId, newRoom);
      res.status(201).json(newRoom);
    } catch (err: any) {
      console.error('Create arena room error:', err);
      res.status(500).json({ error: err?.message || 'Failed to create room' });
    }
  });

  function ensureMadi101TrainingRoom(): ArenaRoom {
    const existing = runtimeArenaRooms.get('room-madi-101');
    if (existing) return existing;

    const madi101: ArenaRoom = {
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
      questions: [
        {
          id: 'm101-q1',
          promptRu: 'Ка́ждый день студе́нты ... в университе́т МАДИ́ на метро́.',
          instructionRu: 'Выберите правильный глагол движения',
          instructionAr: 'اختر فعل الحركة الصحيح',
          instructionEn: 'Choose the correct verb of motion',
          options: ['е́здят', 'е́дут', 'хо́дят', 'иду́т'],
          correctIndex: 0,
          explanationRu: '«Ка́ждый день» указывает на регулярное движение на транспорте (на метро) → глагол «е́здят».',
          explanationAr: 'عبارة «Ка́ждый день» تدل على حركة متكررة بوسيلة نقل (المترو) فنستخدم الفعل المتعدد الاتجاهات «е́здят».',
          explanationEn: '"Каждый день" indicates habitual movement by vehicle (metro) → multidirectional verb "ездят".',
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
          explanationEn: 'Answering "Где?" (where) with "на" requires the Prepositional case: на факультете.',
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
          explanationRu: 'Предлог «пе́ред» всегда употребляется с творительным падежом (чем?): пе́ред зда́нием.',
          explanationAr: 'حرف الجر «пе́ред» (أمام) يتطلب دائماً حالة الأداة (Творительный падеж): пе́ред зда́нием.',
          explanationEn: 'The preposition "перед" (in front of) requires the Instrumental case: перед зданием.',
          points: 10,
        },
      ],
      currentQuestionIndex: 0,
      questionTimeLimitSeconds: 30,
      participants: {
        'stud-demo-1': {
          id: 'stud-demo-1',
          name: 'Yassine B.',
          avatar: 'car-madi-blue',
          role: 'student',
          score: 0,
          correctCount: 0,
          totalAnswered: 0,
          currentStreak: 0,
          bestStreak: 0,
          answers: {},
          isOnline: true,
          joinedAt: new Date().toISOString(),
        },
        'stud-demo-2': {
          id: 'stud-demo-2',
          name: 'Amina K.',
          avatar: 'misha-cap',
          role: 'student',
          score: 0,
          correctCount: 0,
          totalAnswered: 0,
          currentStreak: 0,
          bestStreak: 0,
          answers: {},
          isOnline: true,
          joinedAt: new Date().toISOString(),
        },
      },
      createdAt: new Date().toISOString(),
    };

    runtimeArenaRooms.set(madi101.id, madi101);
    return madi101;
  }

  // GET /api/arena/rooms/:roomIdOrCode — Get room details
  app.get('/api/arena/rooms/:roomIdOrCode', (req, res) => {
    const param = req.params.roomIdOrCode.trim();
    let room =
      runtimeArenaRooms.get(param) ||
      Array.from(runtimeArenaRooms.values()).find(
        (r) => r.code.toUpperCase() === param.toUpperCase()
      );

    if (!room && (param.toUpperCase() === 'MADI-101' || param === 'room-madi-101')) {
      room = ensureMadi101TrainingRoom();
    }

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const rankings = computeRankings(room.participants, room.questions.length);
    const analytics = computeClassroomAnalytics(room);

    res.json({
      room,
      rankings,
      analytics,
    });
  });

  // DELETE /api/arena/rooms/:roomIdOrCode — Delete challenge room
  app.delete('/api/arena/rooms/:roomIdOrCode', (req, res) => {
    try {
      const param = req.params.roomIdOrCode.trim();
      let targetId = '';
      if (runtimeArenaRooms.has(param)) {
        targetId = param;
      } else {
        const found = Array.from(runtimeArenaRooms.values()).find(
          (r) => r.code.toUpperCase() === param.toUpperCase()
        );
        if (found) {
          targetId = found.id;
        }
      }

      if (!targetId) {
        return res.status(404).json({ error: 'Room not found' });
      }

      runtimeArenaRooms.delete(targetId);

      // Broadcast to any clients currently in that room
      broadcastToArenaRoom(targetId, {
        type: 'room:deleted',
        roomId: targetId,
      });

      res.json({ ok: true, deletedRoomId: targetId });
    } catch (err: any) {
      console.error('Delete arena room error:', err);
      res.status(500).json({ error: err?.message || 'Failed to delete room' });
    }
  });

  // POST /api/arena/rooms/:roomId/join — Join room
  app.post('/api/arena/rooms/:roomId/join', (req, res) => {
    const { roomId } = req.params;
    let room =
      runtimeArenaRooms.get(roomId) ||
      Array.from(runtimeArenaRooms.values()).find(
        (r) => r.code.toUpperCase() === roomId.toUpperCase()
      );

    if (!room && (roomId.toUpperCase() === 'MADI-101' || roomId === 'room-madi-101')) {
      room = ensureMadi101TrainingRoom();
    }

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const {
      participantId = `stud-${Date.now()}`,
      name = 'طالب جديد',
      avatar = 'car-madi-blue',
      role = 'student',
    } = req.body || {};

    const existing = room.participants[participantId];
    if (existing) {
      existing.isOnline = true;
      existing.name = name;
      existing.avatar = avatar;
    } else {
      room.participants[participantId] = {
        id: String(participantId),
        name: String(name),
        avatar: String(avatar),
        role: role === 'teacher' ? 'teacher' : 'student',
        score: 0,
        correctCount: 0,
        totalAnswered: 0,
        currentStreak: 0,
        bestStreak: 0,
        answers: {},
        isOnline: true,
        joinedAt: new Date().toISOString(),
      };
    }

    broadcastToArenaRoom(room.id, {
      type: 'participant:joined',
      roomId: room.id,
      participant: room.participants[participantId],
      participantsCount: Object.values(room.participants).filter((p) => p.role === 'student').length,
    });

    res.json({
      ok: true,
      room,
      rankings: computeRankings(room.participants, room.questions.length),
    });
  });

  // POST /api/arena/rooms/:roomId/extract-page — AI page to exercises extraction
  app.post('/api/arena/rooms/:roomId/extract-page', async (req, res) => {
    try {
      const { roomId } = req.params;
      const room =
        runtimeArenaRooms.get(roomId) ||
        Array.from(runtimeArenaRooms.values()).find(
          (r) => r.code.toUpperCase() === roomId.toUpperCase()
        );

      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      const {
        title = '',
        timeLimitSeconds,
        pageText = '',
        pageImageBase64 = '',
        mimeType = 'image/jpeg',
        teacherInstructions = '',
        topic = '',
        questionCount = 5,
        bookTitle = '',
        pageNumber = 1,
      } = req.body || {};

      if (typeof title === 'string' && title.trim()) {
        room.title = title.trim();
      }
      if (timeLimitSeconds !== undefined) {
        room.questionTimeLimitSeconds = Math.max(10, Math.min(60, Number(timeLimitSeconds) || 30));
      }

      const extractionResult = await llmProvider.extractArenaQuestionsFromPage({
        pageText: String(pageText),
        pageImageBase64: String(pageImageBase64),
        mimeType: String(mimeType),
        teacherInstructions: String(teacherInstructions || room.teacherInstructions),
        topic: String(topic || room.exerciseTopic),
        questionCount: Number(questionCount) || 5,
      });

      if (extractionResult.questions.length === 0) {
        return res.status(422).json({ error: 'No questions could be extracted from page.' });
      }

      room.questions = extractionResult.questions;
      room.exerciseTopic = extractionResult.extractedTopic || room.exerciseTopic;
      room.teacherInstructions = String(teacherInstructions || room.teacherInstructions);
      room.status = 'waiting';

      if (pageImageBase64 || pageText || bookTitle) {
        room.pages.push({
          id: `p-${Date.now()}`,
          title: bookTitle ? `${bookTitle} — ص ${pageNumber}` : `صفحة مرفوعة #${room.pages.length + 1}`,
          bookTitle: bookTitle ? String(bookTitle) : undefined,
          pageNumber: Number(pageNumber) || undefined,
          imageUrl: pageImageBase64 ? pageImageBase64.slice(0, 500) : undefined,
          rawText: pageText ? String(pageText).slice(0, 2000) : undefined,
        });
      }

      broadcastToArenaRoom(room.id, {
        type: 'room:questions_ready',
        roomId: room.id,
        questionsCount: room.questions.length,
        exerciseTopic: room.exerciseTopic,
      });

      res.json({
        ok: true,
        room,
        questions: room.questions,
        exerciseTopic: room.exerciseTopic,
        providerUsed: extractionResult.providerUsed,
      });
    } catch (err: any) {
      console.error('Arena extract-page error:', err);
      res.status(500).json({ error: err?.message || 'Page exercise extraction failed.' });
    }
  });

  // PUT /api/arena/rooms/:roomId/questions — Teacher updates/adds/deletes questions
  app.put('/api/arena/rooms/:roomId/questions', (req, res) => {
    const { roomId } = req.params;
    const room =
      runtimeArenaRooms.get(roomId) ||
      Array.from(runtimeArenaRooms.values()).find(
        (r) => r.code.toUpperCase() === roomId.toUpperCase()
      );

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const { questions } = req.body || {};
    if (!Array.isArray(questions)) {
      return res.status(400).json({ error: 'questions array is required' });
    }

    room.questions = questions;
    if (room.questions.length > 0 && room.status === 'setup') {
      room.status = 'waiting';
    }

    broadcastToArenaRoom(room.id, {
      type: 'room:questions_ready',
      roomId: room.id,
      questionsCount: room.questions.length,
      exerciseTopic: room.exerciseTopic,
    });

    res.json({ ok: true, room, questions: room.questions });
  });

  // POST /api/arena/rooms/:roomId/start — Teacher starts live quiz
  app.post('/api/arena/rooms/:roomId/start', (req, res) => {
    const { roomId } = req.params;
    const room =
      runtimeArenaRooms.get(roomId) ||
      Array.from(runtimeArenaRooms.values()).find(
        (r) => r.code.toUpperCase() === roomId.toUpperCase()
      );

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.questions.length === 0) {
      return res.status(400).json({ error: 'Cannot start room with 0 questions. Please upload a page or extract exercises first.' });
    }

    const { participantId, participantName, participantAvatar } = req.body || {};
    if (participantId && !room.participants[participantId]) {
      room.participants[participantId] = {
        id: String(participantId),
        name: String(participantName || 'مشارك'),
        avatar: String(participantAvatar || 'car-madi-blue'),
        role: 'student',
        score: 0,
        correctCount: 0,
        totalAnswered: 0,
        currentStreak: 0,
        bestStreak: 0,
        answers: {},
        isOnline: true,
        joinedAt: new Date().toISOString(),
      };
    }

    room.status = 'active';
    room.currentQuestionIndex = 0;
    room.startedAt = new Date().toISOString();

    // Reset all participant scores for a fresh start
    for (const p of Object.values(room.participants)) {
      p.score = 0;
      p.correctCount = 0;
      p.totalAnswered = 0;
      p.currentStreak = 0;
      p.bestStreak = 0;
      p.answers = {};
    }

    broadcastToArenaRoom(room.id, {
      type: 'room:started',
      roomId: room.id,
      currentQuestionIndex: 0,
      question: room.questions[0],
      totalQuestions: room.questions.length,
    });

    res.json({
      ok: true,
      room,
      rankings: computeRankings(room.participants, room.questions.length),
    });
  });

  // POST /api/arena/rooms/:roomId/answer — Participant submits answer
  app.post('/api/arena/rooms/:roomId/answer', (req, res) => {
    const { roomId } = req.params;
    const room =
      runtimeArenaRooms.get(roomId) ||
      Array.from(runtimeArenaRooms.values()).find(
        (r) => r.code.toUpperCase() === roomId.toUpperCase()
      );

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const {
      participantId,
      participantName = 'طالب مشارك',
      participantAvatar = 'car-madi-blue',
      questionId,
      optionIndex,
      timeSpentSeconds = 5,
    } = req.body || {};

    if (!participantId) {
      return res.status(400).json({ error: 'participantId is required' });
    }

    // Auto-register participant if not yet in room so answer never fails with 403
    if (!room.participants[participantId]) {
      room.participants[participantId] = {
        id: String(participantId),
        name: String(participantName),
        avatar: String(participantAvatar),
        role: 'student',
        score: 0,
        correctCount: 0,
        totalAnswered: 0,
        currentStreak: 0,
        bestStreak: 0,
        answers: {},
        isOnline: true,
        joinedAt: new Date().toISOString(),
      };
    }

    const participant = room.participants[participantId];
    const question =
      room.questions.find((q) => q.id === questionId) ||
      room.questions[room.currentQuestionIndex];

    if (!question) {
      return res.status(400).json({ error: 'Question not found' });
    }

    // Guard duplicate submissions
    if (participant.answers[question.id]) {
      return res.json({
        ok: true,
        alreadyAnswered: true,
        isCorrect: participant.answers[question.id].isCorrect,
        correctIndex: question.correctIndex,
        explanationRu: question.explanationRu,
        explanationAr: question.explanationAr,
        pointsEarned: participant.answers[question.id].pointsEarned,
        totalScore: participant.score,
        streak: participant.currentStreak,
        participant,
        rankings: computeRankings(room.participants, room.questions.length),
      });
    }

    const isCorrect = Number(optionIndex) === question.correctIndex;
    if (isCorrect) {
      participant.currentStreak += 1;
      participant.bestStreak = Math.max(participant.bestStreak, participant.currentStreak);
      participant.correctCount += 1;
    } else {
      participant.currentStreak = 0;
    }

    participant.totalAnswered += 1;

    const pointsEarned = calculateAnswerScore({
      isCorrect,
      timeSpentSeconds: Number(timeSpentSeconds) || 5,
      timeLimitSeconds: room.questionTimeLimitSeconds || 30,
      streak: participant.currentStreak,
      basePoints: question.points || 10,
    });

    participant.score += pointsEarned;
    participant.answers[question.id] = {
      optionIndex: Number(optionIndex),
      isCorrect,
      timeSeconds: Number(timeSpentSeconds) || 5,
      pointsEarned,
      answeredAt: new Date().toISOString(),
    };

    // Simulate demo classmates in the preset training room (room-madi-101)
    if (room.id === 'room-madi-101') {
      const demoProfiles: Array<{ id: string; accuracyProb: number; avgTime: number }> = [
        { id: 'stud-demo-1', accuracyProb: 0.8, avgTime: 7 },
        { id: 'stud-demo-2', accuracyProb: 0.65, avgTime: 11 },
        { id: 'stud-demo-3', accuracyProb: 0.5, avgTime: 14 },
      ];
      for (const dp of demoProfiles) {
        const bot = room.participants[dp.id];
        if (bot && !bot.answers[question.id]) {
          // Deterministic pseudo-random based on question id + bot id
          const seedChar = (question.id.charCodeAt(question.id.length - 1) || 1) + dp.id.charCodeAt(dp.id.length - 1);
          const botCorrect = (seedChar % 10) / 10 < dp.accuracyProb;
          const botOption = botCorrect
            ? question.correctIndex
            : (question.correctIndex + 1) % Math.max(2, question.options.length);
          if (botCorrect) {
            bot.currentStreak += 1;
            bot.bestStreak = Math.max(bot.bestStreak, bot.currentStreak);
            bot.correctCount += 1;
          } else {
            bot.currentStreak = 0;
          }
          bot.totalAnswered += 1;
          const botPoints = calculateAnswerScore({
            isCorrect: botCorrect,
            timeSpentSeconds: dp.avgTime,
            timeLimitSeconds: room.questionTimeLimitSeconds || 30,
            streak: bot.currentStreak,
            basePoints: question.points || 10,
          });
          bot.score += botPoints;
          bot.answers[question.id] = {
            optionIndex: botOption,
            isCorrect: botCorrect,
            timeSeconds: dp.avgTime,
            pointsEarned: botPoints,
            answeredAt: new Date().toISOString(),
          };
        }
      }
    }

    const rankings = computeRankings(room.participants, room.questions.length);

    broadcastToArenaRoom(room.id, {
      type: 'room:answer_submitted',
      roomId: room.id,
      participantId,
      pointsEarned,
      isCorrect,
      rankings,
    });

    res.json({
      ok: true,
      isCorrect,
      correctIndex: question.correctIndex,
      explanationRu: question.explanationRu,
      explanationAr: question.explanationAr,
      pointsEarned,
      totalScore: participant.score,
      streak: participant.currentStreak,
      rankings,
    });
  });

  // POST /api/arena/rooms/:roomId/next-question — Advance question
  app.post('/api/arena/rooms/:roomId/next-question', (req, res) => {
    const { roomId } = req.params;
    const room =
      runtimeArenaRooms.get(roomId) ||
      Array.from(runtimeArenaRooms.values()).find(
        (r) => r.code.toUpperCase() === roomId.toUpperCase()
      );

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const nextIndex = room.currentQuestionIndex + 1;
    if (nextIndex >= room.questions.length) {
      room.status = 'finished';
      room.finishedAt = new Date().toISOString();
      const rankings = computeRankings(room.participants, room.questions.length);
      const analytics = computeClassroomAnalytics(room);

      broadcastToArenaRoom(room.id, {
        type: 'room:finished',
        roomId: room.id,
        rankings,
        analytics,
      });

      return res.json({ ok: true, finished: true, room, rankings, analytics });
    }

    room.currentQuestionIndex = nextIndex;
    const rankings = computeRankings(room.participants, room.questions.length);

    broadcastToArenaRoom(room.id, {
      type: 'room:next_question',
      roomId: room.id,
      currentQuestionIndex: nextIndex,
      question: room.questions[nextIndex],
      totalQuestions: room.questions.length,
    });

    res.json({ ok: true, currentQuestionIndex: nextIndex, room, rankings });
  });

  // POST /api/arena/rooms/:roomId/finish — Conclude challenge and view rankings
  app.post('/api/arena/rooms/:roomId/finish', (req, res) => {
    const { roomId } = req.params;
    const room =
      runtimeArenaRooms.get(roomId) ||
      Array.from(runtimeArenaRooms.values()).find(
        (r) => r.code.toUpperCase() === roomId.toUpperCase()
      );

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    room.status = 'finished';
    room.finishedAt = new Date().toISOString();
    const rankings = computeRankings(room.participants, room.questions.length);
    const analytics = computeClassroomAnalytics(room);

    broadcastToArenaRoom(room.id, {
      type: 'room:finished',
      roomId: room.id,
      rankings,
      analytics,
    });

    res.json({ ok: true, room, rankings, analytics });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/arena' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const roomId = url.searchParams.get('roomId') || '';

    if (roomId) {
      if (!arenaRoomSockets.has(roomId)) {
        arenaRoomSockets.set(roomId, new Set());
      }
      arenaRoomSockets.get(roomId)!.add(ws);
    }

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'join' && msg.roomId) {
          if (!arenaRoomSockets.has(msg.roomId)) {
            arenaRoomSockets.set(msg.roomId, new Set());
          }
          arenaRoomSockets.get(msg.roomId)!.add(ws);
        }
      } catch {
        // ignore
      }
    });

    ws.on('close', () => {
      for (const set of arenaRoomSockets.values()) {
        set.delete(ws);
      }
    });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`madingo server running on http://localhost:${PORT}`);
  });
}

startServer();


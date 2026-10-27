import crypto from 'node:crypto';
import { eq, desc, and } from 'drizzle-orm';
import { db } from './index.ts';
import {
  users,
  profiles,
  units,
  lessons,
  steps,
  progress,
  streaks,
  fuelLog,
  mistakes,
  words,
  wordTranslations,
  wordForms,
  examples,
  wordTopics,
  userWords,
  reviewItems,
  typingTexts,
  typingResults,
  analyticsEvents,
} from './schema.ts';
import { CURRICULUM_UNITS } from '../data/curriculum.ts';
import { DICTIONARY_WORDS, TYPING_TEXTS } from '../data/dictionarySeed.ts';
import { updateStreakOdometer } from '../lib/rules.ts';
import {
  advanceLeitnerItem,
  computeGarageStats,
  LeitnerBox,
  LeitnerReviewItem,
} from '../lib/phase2Engine.ts';

let isCurriculumSeeded = false;
let isPhase2DataSeeded = false;

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(`madingo_salt_${password}`).digest('hex');
}

export async function seedCurriculumIfNeeded() {
  if (!isCurriculumSeeded) {
    try {
      const existingUnits = await db.select().from(units);
      if (existingUnits.length < CURRICULUM_UNITS.length) {
        for (const u of CURRICULUM_UNITS) {
          await db
            .insert(units)
            .values({
              id: u.id,
              orderIndex: u.orderIndex,
              slug: u.slug,
              landmarkKey: u.landmarkKey,
              levelCode: u.levelCode,
              isLockedByDefault: u.isLockedByDefault,
              titleJson: u.title,
              subtitleJson: u.subtitle,
            })
            .onConflictDoUpdate({
              target: units.id,
              set: {
                orderIndex: u.orderIndex,
                landmarkKey: u.landmarkKey,
                titleJson: u.title,
                subtitleJson: u.subtitle,
              },
            });

          for (const l of u.lessons) {
            await db
              .insert(lessons)
              .values({
                id: l.id,
                unitId: u.id,
                orderIndex: l.orderIndex,
                slug: l.slug,
                titleJson: l.title,
                descriptionJson: l.description,
                estimatedMinutes: l.estimatedMinutes,
              })
              .onConflictDoUpdate({
                target: lessons.id,
                set: {
                  orderIndex: l.orderIndex,
                  titleJson: l.title,
                  descriptionJson: l.description,
                },
              });

            if (l.steps.length > 0) {
              await db
                .insert(steps)
                .values(
                  l.steps.map((s) => ({
                    id: s.id,
                    lessonId: l.id,
                    orderIndex: s.orderIndex,
                    type: s.type,
                    content: s.content,
                  }))
                )
                .onConflictDoNothing();
            }
          }
        }
      }
      isCurriculumSeeded = true;
    } catch (error) {
      console.error('Curriculum seed failed:', error);
    }
  }

  if (!isPhase2DataSeeded) {
    try {
      const existingWords = await db.select({ id: words.id }).from(words).limit(5);
      if (existingWords.length === 0) {
        // Seed words in batches of 100
        for (let i = 0; i < DICTIONARY_WORDS.length; i += 100) {
          const chunk = DICTIONARY_WORDS.slice(i, i + 100);
          await db
            .insert(words)
            .values(
              chunk.map((w) => ({
                id: w.id,
                russian: w.russian,
                stressed: w.stressed,
                translit: w.translit,
                pos: w.pos,
                gender: w.gender || null,
                animacy: w.animacy || null,
                level: w.level,
                audioSlug: w.audioSlug,
                iconKey: w.iconKey || 'book',
                isMadiTerm: w.isMadiTerm,
                verified: false,
                synonymsJson: w.synonyms,
                antonymsJson: w.antonyms,
                relatedWordsJson: w.relatedWords,
                lessonIdsJson: w.lessonIds,
              }))
            )
            .onConflictDoNothing();

          const transRows = chunk.flatMap((w) =>
            (['ru', 'en', 'ar', 'fr'] as const).map((lang) => ({
              wordId: w.id,
              lang,
              translation: w.translations[lang],
            }))
          );
          await db.insert(wordTranslations).values(transRows).onConflictDoNothing();

          const topicRows = chunk.map((w) => ({
            wordId: w.id,
            topic: w.topic,
          }));
          await db.insert(wordTopics).values(topicRows).onConflictDoNothing();

          const formRows = chunk
            .filter((w) => w.irregularOverrides || w.verbOverrides)
            .map((w) => ({
              wordId: w.id,
              formsJson: {},
              irregularOverrideJson: (w.irregularOverrides || w.verbOverrides || {}) as Record<string, unknown>,
            }));
          if (formRows.length > 0) {
            await db.insert(wordForms).values(formRows).onConflictDoNothing();
          }

          const exRows = chunk.flatMap((w) =>
            w.examples.map((ex, idx) => ({
              id: ex.id || `${w.id}-ex-${idx + 1}`,
              wordId: w.id,
              russianStressed: ex.russianStressed,
              audioSlug: ex.audioSlug,
              translationsJson: ex.translations,
            }))
          );
          if (exRows.length > 0) {
            await db.insert(examples).values(exRows).onConflictDoNothing();
          }
        }
      }

      const existingTyping = await db.select({ id: typingTexts.id }).from(typingTexts).limit(5);
      if (existingTyping.length === 0) {
        await db
          .insert(typingTexts)
          .values(
            TYPING_TEXTS.map((t) => ({
              id: t.id,
              slug: t.slug,
              level: t.level,
              topic: t.topic,
              titleJson: t.title,
              textStressed: t.textStressed,
              textClean: t.textClean,
              errorSpottingJson: t.errorSpotting,
              fillInBlankWordsJson: t.fillInBlankWords,
              audioSlug: t.audioSlug,
            }))
          )
          .onConflictDoNothing();
      }
      isPhase2DataSeeded = true;
    } catch (error) {
      console.warn('Phase 2 seed warning:', error);
    }
  }
}

export interface UpsertProfileInput {
  displayName?: string;
  uiLang?: string;
  goalMinutes?: number;
  learningReason?: string;
  avatarId?: string;
  consentAccepted?: boolean;
  passwordHash?: string;
}

export async function getOrCreateUser(
  uid: string,
  email: string,
  extra: UpsertProfileInput = {}
) {
  try {
    await seedCurriculumIfNeeded();

    await db
      .insert(users)
      .values({
        uid,
        email,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email },
      });

    const existingProfiles = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, uid));

    let profile = existingProfiles[0];

    if (!profile) {
      const inserted = await db
        .insert(profiles)
        .values({
          id: uid,
          email,
          passwordHash: extra.passwordHash || null,
          displayName: extra.displayName || email.split('@')[0] || 'Student',
          uiLang: extra.uiLang || 'en',
          goalMinutes: extra.goalMinutes || 10,
          learningReason: extra.learningReason || 'university',
          avatarId: extra.avatarId || 'misha-cap',
          consentAccepted: extra.consentAccepted ?? true,
        })
        .onConflictDoUpdate({
          target: profiles.id,
          set: { email },
        })
        .returning();
      profile = inserted[0];
    } else if (extra.uiLang && ['ru', 'en', 'ar', 'fr'].includes(extra.uiLang) && extra.uiLang !== profile.uiLang) {
      const updated = await db
        .update(profiles)
        .set({ uiLang: extra.uiLang })
        .where(eq(profiles.id, uid))
        .returning();
      if (updated[0]) {
        profile = updated[0];
      }
    }

    await db
      .insert(streaks)
      .values({
        userId: uid,
        current: 0,
        best: 0,
        lastActiveDate: null,
        spareTireAvailable: true,
      })
      .onConflictDoNothing();

    return profile;
  } catch (error) {
    console.error('Database getOrCreateUser failed:', error);
    throw new Error('Failed to synchronize user profile.', { cause: error });
  }
}

export async function findProfileByEmail(email: string) {
  try {
    const normalized = email.trim().toLowerCase();
    const rows = await db
      .select()
      .from(profiles)
      .where(eq(profiles.email, normalized));
    return rows[0] || null;
  } catch (error) {
    console.error('Database findProfileByEmail failed:', error);
    throw new Error('Database lookup failed.', { cause: error });
  }
}

/**
 * Migrate Phase 1 `mistakes` rows into Phase 2 `review_items` (Leitner Box 1)
 */
async function syncMistakesToReviewItems(uid: string) {
  const userMistakes = await db
    .select()
    .from(mistakes)
    .where(eq(mistakes.userId, uid))
    .orderBy(desc(mistakes.createdAt));

  const existingReviews = await db
    .select()
    .from(reviewItems)
    .where(eq(reviewItems.userId, uid));

  const existingItemRefs = new Set(existingReviews.map((r) => r.itemRef));

  for (const m of userMistakes) {
    if (!existingItemRefs.has(m.stepId)) {
      const isLetterStep = m.lessonId.startsWith('u1-');
      await db
        .insert(reviewItems)
        .values({
          userId: uid,
          itemType: isLetterStep ? 'letter' : 'step',
          itemRef: m.stepId,
          promptPreview: m.promptPreview,
          correctAnswer: m.correctAnswer,
          categoryTag: isLetterStep ? 'letter' : m.lessonId,
          box: 1,
          dueAt: new Date(),
          streak: 0,
          masteredShowroom: false,
          lastResult: 'wrong',
          failCount: m.times || 1,
          updatedAt: new Date(),
        })
        .onConflictDoNothing();
      existingItemRefs.add(m.stepId);
    }
  }
}

export async function getUserDashboardData(uid: string) {
  try {
    await seedCurriculumIfNeeded();

    const profileRows = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, uid));
    const profile = profileRows[0];
    if (!profile) {
      return null;
    }

    await syncMistakesToReviewItems(uid);

    const userProgress = await db
      .select()
      .from(progress)
      .where(eq(progress.userId, uid));

    const streakRows = await db
      .select()
      .from(streaks)
      .where(eq(streaks.userId, uid));
    const streak = streakRows[0] || {
      current: 0,
      best: 0,
      lastActiveDate: null,
      spareTireAvailable: true,
      spareTireUsedDate: null,
    };

    const fuelRows = await db
      .select()
      .from(fuelLog)
      .where(eq(fuelLog.userId, uid));
    const totalFuel = fuelRows.reduce((sum, r) => sum + r.amount, 0);

    const todayPrefix = new Date().toISOString().slice(0, 10);
    const todayFuel = fuelRows
      .filter((r) => r.createdAt && r.createdAt.toISOString().slice(0, 10) === todayPrefix)
      .reduce((sum, r) => sum + r.amount, 0);

    const userMistakes = await db
      .select()
      .from(mistakes)
      .where(eq(mistakes.userId, uid))
      .orderBy(desc(mistakes.createdAt));

    const userReviewRows = await db
      .select()
      .from(reviewItems)
      .where(eq(reviewItems.userId, uid))
      .orderBy(desc(reviewItems.failCount));

    const formattedReviews: LeitnerReviewItem[] = userReviewRows.map((r) => ({
      id: r.id,
      userId: r.userId,
      itemType: (r.itemType as LeitnerReviewItem['itemType']) || 'word',
      itemRef: r.itemRef,
      promptPreview: r.promptPreview,
      correctAnswer: r.correctAnswer,
      categoryTag: r.categoryTag || 'general',
      box: (Math.min(5, Math.max(1, r.box)) as LeitnerBox) || 1,
      dueAt: (r.dueAt || new Date()).toISOString(),
      streak: r.streak || 0,
      masteredShowroom: Boolean(r.masteredShowroom),
      lastResult: (r.lastResult === 'correct' ? 'correct' : 'wrong'),
      failCount: r.failCount || 1,
    }));

    const garageStats = computeGarageStats(formattedReviews);

    const savedUserWords = await db
      .select()
      .from(userWords)
      .where(eq(userWords.userId, uid));

    const userTypingResults = await db
      .select()
      .from(typingResults)
      .where(eq(typingResults.userId, uid))
      .orderBy(desc(typingResults.createdAt))
      .limit(30);

    return {
      profile: {
        id: profile.id,
        email: profile.email,
        displayName: profile.displayName,
        uiLang: profile.uiLang,
        goalMinutes: profile.goalMinutes,
        learningReason: profile.learningReason,
        avatarId: profile.avatarId,
        soundEnabled: profile.soundEnabled,
        notificationsEnabled: profile.notificationsEnabled,
        theme: profile.theme,
        role: profile.role,
        consentAccepted: profile.consentAccepted,
      },
      progress: userProgress,
      streak: {
        current: streak.current,
        best: streak.best,
        lastActiveDate: streak.lastActiveDate,
        spareTireAvailable: streak.spareTireAvailable,
        spareTireUsedDate: streak.spareTireUsedDate,
      },
      totalFuel,
      todayMinutesCompleted: Math.min(profile.goalMinutes, Math.round(todayFuel / 8)),
      mistakes: userMistakes,
      reviewItems: formattedReviews,
      garageStats,
      userWords: savedUserWords,
      typingResults: userTypingResults,
    };
  } catch (error) {
    console.error('Database getUserDashboardData failed:', error);
    throw new Error('Failed to load user dashboard data.', { cause: error });
  }
}

export async function recordMistakeInDb(
  uid: string,
  stepId: string,
  lessonId: string,
  promptPreview: string,
  correctAnswer: string,
  itemType?: 'word' | 'letter' | 'step' | 'case',
  caseCode?: string
) {
  try {
    const existing = await db
      .select()
      .from(mistakes)
      .where(eq(mistakes.userId, uid));
    const match = existing.find((m) => m.stepId === stepId);

    if (match) {
      await db
        .update(mistakes)
        .set({
          times: match.times + 1,
          createdAt: new Date(),
        })
        .where(eq(mistakes.id, match.id));
    } else {
      await db.insert(mistakes).values({
        userId: uid,
        stepId,
        lessonId,
        promptPreview,
        correctAnswer,
        times: 1,
      });
    }

    // Also upsert into Phase 2 Leitner `review_items` (reset to Box 1, due immediately)
    const existingReviews = await db
      .select()
      .from(reviewItems)
      .where(eq(reviewItems.userId, uid));
    const reviewMatch = existingReviews.find((r) => r.itemRef === stepId);

    const resolvedType =
      itemType || (caseCode ? 'case' : lessonId.startsWith('u1-') ? 'letter' : 'step');

    if (reviewMatch) {
      await db
        .update(reviewItems)
        .set({
          box: 1,
          streak: 0,
          masteredShowroom: false,
          dueAt: new Date(),
          lastResult: 'wrong',
          failCount: (reviewMatch.failCount || 0) + 1,
          updatedAt: new Date(),
          ...(caseCode ? { categoryTag: caseCode } : {}),
        })
        .where(eq(reviewItems.id, reviewMatch.id));
    } else {
      await db.insert(reviewItems).values({
        userId: uid,
        itemType: resolvedType,
        itemRef: stepId,
        promptPreview,
        correctAnswer,
        categoryTag: caseCode || lessonId || 'general',
        box: 1,
        dueAt: new Date(),
        streak: 0,
        masteredShowroom: false,
        lastResult: 'wrong',
        failCount: 1,
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error('Database recordMistakeInDb failed:', error);
    throw new Error('Failed to log mistake to garage.', { cause: error });
  }
}

export async function upsertUserWordInDb(
  uid: string,
  wordId: string,
  action: 'add_garage' | 'mark_known' | 'toggle_favorite' | 'favorite' | 'known' | 'garage'
) {
  try {
    const wordEntry = DICTIONARY_WORDS.find((w) => w.id === wordId);
    const existingRows = await db
      .select()
      .from(userWords)
      .where(and(eq(userWords.userId, uid), eq(userWords.wordId, wordId)));
    const existing = existingRows[0];

    if (action === 'toggle_favorite' || action === 'favorite') {
      if (existing) {
        await db
          .update(userWords)
          .set({ status: existing.status === 'favorite' ? 'known' : 'favorite' })
          .where(eq(userWords.id, existing.id));
      } else {
        await db.insert(userWords).values({
          userId: uid,
          wordId,
          status: 'favorite',
        });
      }
    } else if (action === 'mark_known' || action === 'known') {
      if (existing) {
        await db
          .update(userWords)
          .set({ status: 'known' })
          .where(eq(userWords.id, existing.id));
      } else {
        await db.insert(userWords).values({
          userId: uid,
          wordId,
          status: 'known',
        });
      }
    } else if (action === 'add_garage' || action === 'garage') {
      if (existing) {
        await db
          .update(userWords)
          .set({ status: 'garage' })
          .where(eq(userWords.id, existing.id));
      } else {
        await db.insert(userWords).values({
          userId: uid,
          wordId,
          status: 'garage',
        });
      }

      // Ensure it is in Leitner Box 1 in `review_items`
      const reviewRows = await db
        .select()
        .from(reviewItems)
        .where(eq(reviewItems.userId, uid));
      const hasReview = reviewRows.find((r) => r.itemRef === wordId);
      if (!hasReview && wordEntry) {
        await db.insert(reviewItems).values({
          userId: uid,
          itemType: 'word',
          itemRef: wordEntry.id,
          promptPreview: `${wordEntry.translations.en} (${wordEntry.pos})`,
          correctAnswer: wordEntry.stressed,
          categoryTag: wordEntry.topic || 'vocabulary',
          box: 1,
          dueAt: new Date(),
          streak: 0,
          masteredShowroom: false,
          lastResult: 'wrong',
          failCount: 1,
          updatedAt: new Date(),
        });
      }
    }

    return await getUserDashboardData(uid);
  } catch (error) {
    console.error('upsertUserWordInDb failed:', error);
    throw new Error('Failed to update user dictionary word.', { cause: error });
  }
}

export async function reviewGarageItemsInDb(
  uid: string,
  reviews: Array<{ itemId?: string; itemRef?: string; isCorrect: boolean }>
) {
  try {
    const existingRows = await db
      .select()
      .from(reviewItems)
      .where(eq(reviewItems.userId, uid));

    let totalFuelAwarded = 0;

    for (const rev of reviews) {
      const targetKey = String(rev.itemRef || rev.itemId || '');
      const row = existingRows.find(
        (r) => String(r.id) === targetKey || r.itemRef === targetKey
      );
      if (!row) continue;

      const currentItem: LeitnerReviewItem = {
        id: row.id,
        userId: row.userId,
        itemType: (row.itemType as LeitnerReviewItem['itemType']) || 'word',
        itemRef: row.itemRef,
        promptPreview: row.promptPreview,
        correctAnswer: row.correctAnswer,
        categoryTag: row.categoryTag || 'general',
        box: (Math.min(5, Math.max(1, row.box)) as LeitnerBox) || 1,
        dueAt: (row.dueAt || new Date()).toISOString(),
        streak: row.streak || 0,
        masteredShowroom: Boolean(row.masteredShowroom),
        lastResult: row.lastResult === 'correct' ? 'correct' : 'wrong',
        failCount: row.failCount || 1,
      };

      const nextState = advanceLeitnerItem(currentItem, rev.isCorrect, new Date());

      await db
        .update(reviewItems)
        .set({
          box: nextState.box,
          streak: nextState.streak,
          masteredShowroom: nextState.masteredShowroom,
          dueAt: new Date(nextState.dueAt),
          lastResult: nextState.lastResult,
          failCount: nextState.failCount,
          updatedAt: new Date(),
        })
        .where(eq(reviewItems.id, row.id));

      if (rev.isCorrect) {
        totalFuelAwarded += 5;
      }
    }

    if (totalFuelAwarded > 0) {
      await db.insert(fuelLog).values({
        userId: uid,
        amount: totalFuelAwarded,
        reason: 'garage_review',
      });
    }

    await recordAnalyticsEventInDb(uid, 'garage_reviewed', {
      itemsCount: reviews.length,
      fuelEarned: totalFuelAwarded,
    });

    return await getUserDashboardData(uid);
  } catch (error) {
    console.error('reviewGarageItemsInDb failed:', error);
    throw new Error('Failed to process Garage review.', { cause: error });
  }
}

export async function saveTypingResultInDb(
  uid: string,
  payload: {
    textId: string;
    mode: string;
    cpm: number;
    accuracy: number;
    durationSeconds: number;
    letterMistakes?: Record<string, number>;
    heatmap?: Record<string, number>;
    fuelEarned: number;
  }
) {
  try {
    await db.insert(typingResults).values({
      userId: uid,
      textId: payload.textId,
      mode: payload.mode,
      cpm: Math.round(payload.cpm),
      accuracy: Math.round(payload.accuracy),
      durationSeconds: Math.round(payload.durationSeconds),
      heatmapJson: payload.heatmap || payload.letterMistakes || {},
      fuelEarned: Math.round(payload.fuelEarned),
    });

    if (payload.fuelEarned > 0) {
      await db.insert(fuelLog).values({
        userId: uid,
        amount: Math.round(payload.fuelEarned),
        reason: `typing:${payload.textId}:${payload.mode}`,
      });
    }

    await recordAnalyticsEventInDb(uid, 'typing_completed', {
      textId: payload.textId,
      mode: payload.mode,
      cpm: payload.cpm,
      accuracy: payload.accuracy,
    });

    return await getUserDashboardData(uid);
  } catch (error) {
    console.error('saveTypingResultInDb failed:', error);
    throw new Error('Failed to save Typing Lab result.', { cause: error });
  }
}

export async function recordAnalyticsEventInDb(
  uid: string,
  eventName: string,
  payload: Record<string, unknown> = {}
) {
  try {
    const profileRows = await db
      .select({ consentAccepted: profiles.consentAccepted })
      .from(profiles)
      .where(eq(profiles.id, uid));
    if (!profileRows[0]?.consentAccepted) {
      return;
    }
    await db.insert(analyticsEvents).values({
      userId: uid,
      eventType: eventName,
      payloadJson: payload,
    });
  } catch {
    // Non-blocking analytics logging
  }
}

export async function completeLessonInDb(
  uid: string,
  lessonId: string,
  accuracy: number,
  fuelEarned: number
) {
  try {
    await db
      .insert(progress)
      .values({
        userId: uid,
        lessonId,
        status: 'completed',
        accuracy,
        completedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [progress.userId, progress.lessonId],
        set: {
          status: 'completed',
          accuracy,
          completedAt: new Date(),
        },
      });

    if (fuelEarned > 0) {
      await db.insert(fuelLog).values({
        userId: uid,
        amount: fuelEarned,
        reason: `lesson:${lessonId}`,
      });
    }

    const streakRows = await db
      .select()
      .from(streaks)
      .where(eq(streaks.userId, uid));
    const currentStreak = streakRows[0] || {
      current: 0,
      best: 0,
      lastActiveDate: null,
      spareTireAvailable: true,
      spareTireUsedDate: null,
    };

    const todayStr = new Date().toISOString().slice(0, 10);
    const updatedStreak = updateStreakOdometer(currentStreak, todayStr);

    await db
      .insert(streaks)
      .values({
        userId: uid,
        current: updatedStreak.current,
        best: updatedStreak.best,
        lastActiveDate: updatedStreak.lastActiveDate,
        spareTireAvailable: updatedStreak.spareTireAvailable,
        spareTireUsedDate: updatedStreak.spareTireUsedDate,
      })
      .onConflictDoUpdate({
        target: streaks.userId,
        set: {
          current: updatedStreak.current,
          best: updatedStreak.best,
          lastActiveDate: updatedStreak.lastActiveDate,
          spareTireAvailable: updatedStreak.spareTireAvailable,
          spareTireUsedDate: updatedStreak.spareTireUsedDate,
        },
      });

    await recordAnalyticsEventInDb(uid, 'lesson_completed', {
      lessonId,
      accuracy,
      fuelEarned,
    });

    return await getUserDashboardData(uid);
  } catch (error) {
    console.error('Database completeLessonInDb failed:', error);
    throw new Error('Failed to save lesson progress.', { cause: error });
  }
}

export async function updateProfileSettingsInDb(
  uid: string,
  updates: {
    displayName?: string;
    uiLang?: string;
    goalMinutes?: number;
    avatarId?: string;
    soundEnabled?: boolean;
    notificationsEnabled?: boolean;
    theme?: string;
  }
) {
  try {
    await db
      .update(profiles)
      .set({
        ...(updates.displayName !== undefined ? { displayName: updates.displayName } : {}),
        ...(updates.uiLang !== undefined ? { uiLang: updates.uiLang } : {}),
        ...(updates.goalMinutes !== undefined ? { goalMinutes: updates.goalMinutes } : {}),
        ...(updates.avatarId !== undefined ? { avatarId: updates.avatarId } : {}),
        ...(updates.soundEnabled !== undefined ? { soundEnabled: updates.soundEnabled } : {}),
        ...(updates.notificationsEnabled !== undefined
          ? { notificationsEnabled: updates.notificationsEnabled }
          : {}),
        ...(updates.theme !== undefined ? { theme: updates.theme } : {}),
      })
      .where(eq(profiles.id, uid));

    return await getUserDashboardData(uid);
  } catch (error) {
    console.error('Database updateProfileSettingsInDb failed:', error);
    throw new Error('Failed to update profile settings.', { cause: error });
  }
}

export async function deleteUserAccountFromDb(uid: string) {
  try {
    await db.delete(analyticsEvents).where(eq(analyticsEvents.userId, uid));
    await db.delete(typingResults).where(eq(typingResults.userId, uid));
    await db.delete(reviewItems).where(eq(reviewItems.userId, uid));
    await db.delete(userWords).where(eq(userWords.userId, uid));
    await db.delete(mistakes).where(eq(mistakes.userId, uid));
    await db.delete(fuelLog).where(eq(fuelLog.userId, uid));
    await db.delete(progress).where(eq(progress.userId, uid));
    await db.delete(streaks).where(eq(streaks.userId, uid));
    await db.delete(profiles).where(eq(profiles.id, uid));
    await db.delete(users).where(eq(users.uid, uid));
    return { deleted: true };
  } catch (error) {
    console.error('Database deleteUserAccountFromDb failed:', error);
    throw new Error('Failed to delete account data.', { cause: error });
  }
}

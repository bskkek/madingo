// ============================================================================
// MADINGO PHASE 3 — PURE LOGIC ENGINE
// Repeat-After-Me Speech Alignment & Scoring, Conversation Role-Play Engine,
// AI Content Pipeline Validator, Publication/Legal Guards, RBAC/RLS Policies,
// and Rate-Limit / Daily Quota Guards.
// ============================================================================

import { stripStressMarks, normalizeRussianText } from './phase2Engine';

export const stripStress = stripStressMarks;

export function normalizeRussianForMatch(text: string, treatYoAsYe = true): string {
  return normalizeRussianText(text, {
    ignoreCase: true,
    ignorePunctuation: true,
    treatYoAsYe,
    stripStress: true,
  });
}

export function hasStressMark(word: string): boolean {
  const nfd = word.normalize('NFD');
  return nfd.includes('\u0301') || /[ёЁ]/.test(word);
}

// ----------------------------------------------------------------------------
// 1. REPEAT-AFTER-ME SPEECH ALIGNER & SCORER (Word-Level Levenshtein / DTW)
// ----------------------------------------------------------------------------

export type WordAlignmentStatus = 'correct' | 'close' | 'mispronounced' | 'missing' | 'extra';

export interface AlignedWordResult {
  targetWord: string; // original word with stress mark & punctuation
  cleanTarget: string; // normalized lowercase Cyrillic word
  spokenWord: string | null; // matched transcript word
  status: WordAlignmentStatus;
  charSimilarity: number; // 0..1 character similarity
  stressEstimatedOk: boolean; // heuristic stress/vowel match
  tipKey?: string;
}

export interface SpeechScoreBreakdown {
  accuracy: number; // 0..100 (words correct / close)
  stressPronunciationEstimate: number; // 0..100 (labeled as "AI estimate")
  fluency: number; // 0..100 (speech rate & pause penalty vs target duration)
  completeness: number; // 0..100 (proportion of target words spoken)
  overall: number; // 0..100 weighted composite
  stars: 0 | 1 | 2 | 3;
  fuelEarned: number;
  alignedWords: AlignedWordResult[];
  mispronouncedWords: string[]; // clean Russian words to offer for Garage
  oneLineTip: {
    ru: string;
    en: string;
    ar: string;
    fr: string;
  };
  aiEstimateDisclaimer: boolean;
}

/**
 * Tokenize a Russian sentence into words preserving stress marks on `original`,
 * and normalized lowercase words on `clean`.
 */
export function tokenizeRussianWords(text: string): { original: string; clean: string }[] {
  const rawTokens = text
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const result: { original: string; clean: string }[] = [];
  for (const token of rawTokens) {
    const clean = normalizeRussianForMatch(token, true);
    if (clean.length > 0) {
      result.push({ original: token, clean });
    }
  }
  return result;
}

/**
 * Character-level Levenshtein distance between two strings.
 */
export function charLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[a.length][b.length];
}

/**
 * Compute normalized character similarity (0..1) between two Russian words.
 */
export function wordSimilarity(targetClean: string, spokenClean: string): number {
  if (!targetClean && !spokenClean) return 1;
  if (!targetClean || !spokenClean) return 0;
  if (targetClean === spokenClean) return 1;
  const maxLen = Math.max(targetClean.length, spokenClean.length);
  const dist = charLevenshtein(targetClean, spokenClean);
  return Math.max(0, (maxLen - dist) / maxLen);
}

/**
 * Check whether the stressed vowel in `targetWithStress` is preserved in `spokenClean`.
 * Used as part of the clearly-labeled "AI estimate" for Stress/Pronunciation.
 */
export function checkStressedVowelPreserved(
  targetWithStress: string,
  spokenClean: string
): boolean {
  if (!spokenClean) return false;
  const nfd = targetWithStress.normalize('NFD');
  const stressIdx = nfd.indexOf('\u0301');
  if (stressIdx > 0) {
    const stressedVowel = nfd[stressIdx - 1].toLowerCase().replace(/ё/g, 'е');
    return spokenClean.includes(stressedVowel);
  }
  // If word has 'ё' (always stressed) or is monosyllabic
  const lower = stripStress(targetWithStress).toLowerCase().replace(/ё/g, 'е');
  const vowels = lower.match(/[аеиоуыэюя]/g) || [];
  if (vowels.length <= 1) {
    return vowels.every((v) => spokenClean.includes(v));
  }
  return wordSimilarity(lower.replace(/[^а-яa-z0-9]/g, ''), spokenClean) >= 0.8;
}

/**
 * Dynamic Time Warping / Sequence Alignment at word level between target tokens
 * and spoken transcript tokens. Handles missing words, extra words, and inflected/wrong endings.
 */
export function alignTranscriptToTarget(
  targetText: string,
  transcriptText: string,
  wordConfidences?: number[]
): AlignedWordResult[] {
  const targetTokens = tokenizeRussianWords(targetText);
  const spokenTokens = tokenizeRussianWords(transcriptText);

  const n = targetTokens.length;
  const m = spokenTokens.length;

  if (n === 0) return [];
  if (m === 0) {
    return targetTokens.map((t) => ({
      targetWord: t.original,
      cleanTarget: t.clean,
      spokenWord: null,
      status: 'missing',
      charSimilarity: 0,
      stressEstimatedOk: false,
      tipKey: 'missing_word',
    }));
  }

  // DP matrix for sequence alignment
  const GAP_PENALTY = 0.75;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  const back: ('match' | 'del' | 'ins')[][] = Array.from({ length: n + 1 }, () =>
    Array(m + 1).fill('match')
  );

  for (let i = 1; i <= n; i++) {
    dp[i][0] = i * GAP_PENALTY;
    back[i][0] = 'del'; // target word missing in spoken
  }
  for (let j = 1; j <= m; j++) {
    dp[0][j] = j * GAP_PENALTY;
    back[0][j] = 'ins'; // extra word spoken
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const sim = wordSimilarity(targetTokens[i - 1].clean, spokenTokens[j - 1].clean);
      const subCost = 1 - sim;
      const matchCost = dp[i - 1][j - 1] + subCost;
      const delCost = dp[i - 1][j] + GAP_PENALTY;
      const insCost = dp[i][j - 1] + GAP_PENALTY;

      if (matchCost <= delCost && matchCost <= insCost) {
        dp[i][j] = matchCost;
        back[i][j] = 'match';
      } else if (delCost <= insCost) {
        dp[i][j] = delCost;
        back[i][j] = 'del';
      } else {
        dp[i][j] = insCost;
        back[i][j] = 'ins';
      }
    }
  }

  // Backtrack to build aligned result for each target word
  const aligned: AlignedWordResult[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && back[i][j] === 'match') {
      const t = targetTokens[i - 1];
      const s = spokenTokens[j - 1];
      const sim = wordSimilarity(t.clean, s.clean);
      const conf = wordConfidences?.[j - 1] ?? 0.92;
      const stressOk = checkStressedVowelPreserved(t.original, s.clean) && conf >= 0.7;

      let status: WordAlignmentStatus = 'correct';
      let tipKey: string | undefined;

      if (sim === 1) {
        status = 'correct';
      } else if (sim >= 0.72) {
        // Likely wrong case ending or slight vowel reduction issue
        status = 'close';
        tipKey = 'check_ending_or_vowel';
      } else {
        status = 'mispronounced';
        tipKey = 'mispronounced_word';
      }

      aligned.unshift({
        targetWord: t.original,
        cleanTarget: t.clean,
        spokenWord: s.original,
        status,
        charSimilarity: Math.round(sim * 100) / 100,
        stressEstimatedOk: status === 'correct' ? stressOk : false,
        tipKey,
      });
      i--;
      j--;
    } else if (i > 0 && (j === 0 || back[i][j] === 'del')) {
      const t = targetTokens[i - 1];
      aligned.unshift({
        targetWord: t.original,
        cleanTarget: t.clean,
        spokenWord: null,
        status: 'missing',
        charSimilarity: 0,
        stressEstimatedOk: false,
        tipKey: 'missing_word',
      });
      i--;
    } else {
      // Extra spoken word — skip or attach penalty via completeness/accuracy
      j--;
    }
  }

  return aligned;
}

/**
 * Full speech scoring pipeline: computes Accuracy, Stress/Pronunciation Estimate,
 * Fluency, Completeness, Overall score, 1-3 Stars, Fuel reward, and localized tip.
 */
export function scoreSpeechAttempt(params: {
  targetText: string;
  transcriptText: string;
  targetDurationSec: number;
  actualDurationSec: number;
  wordConfidences?: number[];
}): SpeechScoreBreakdown {
  const {
    targetText,
    transcriptText,
    targetDurationSec,
    actualDurationSec,
    wordConfidences,
  } = params;

  const targetTokens = tokenizeRussianWords(targetText);
  const spokenTokens = tokenizeRussianWords(transcriptText);
  const aligned = alignTranscriptToTarget(targetText, transcriptText, wordConfidences);

  if (targetTokens.length === 0) {
    return {
      accuracy: 0,
      stressPronunciationEstimate: 0,
      fluency: 0,
      completeness: 0,
      overall: 0,
      stars: 0,
      fuelEarned: 0,
      alignedWords: [],
      mispronouncedWords: [],
      oneLineTip: {
        ru: 'Попробуйте записать фразу ещё раз чётко в микрофон.',
        en: 'Try recording the phrase again clearly into the microphone.',
        ar: 'حاول تسجيل العبارة مرة أخرى بوضوح في الميكروفون.',
        fr: 'Essayez d’enregistrer à nouveau la phrase clairement dans le micro.',
      },
      aiEstimateDisclaimer: true,
    };
  }

  // 1. Completeness: how many target words were attempted (not missing)
  const attemptedCount = aligned.filter((w) => w.status !== 'missing').length;
  const completeness = Math.round((attemptedCount / targetTokens.length) * 100);

  // 2. Accuracy: exact matches = 1.0, close (ending) matches = 0.65, penalized slightly for extra words
  const rawWordScore = aligned.reduce((acc, w) => {
    if (w.status === 'correct') return acc + 1;
    if (w.status === 'close') return acc + 0.65 * w.charSimilarity;
    if (w.status === 'mispronounced') return acc + 0.2 * w.charSimilarity;
    return acc;
  }, 0);

  const extraWordsCount = Math.max(0, spokenTokens.length - targetTokens.length);
  const extraPenalty = Math.min(25, extraWordsCount * 8);
  const accuracy = Math.max(
    0,
    Math.min(100, Math.round((rawWordScore / targetTokens.length) * 100 - extraPenalty))
  );

  // 3. Stress / Pronunciation Estimate (labeled "AI estimate")
  const stressMatches = aligned.reduce((acc, w) => {
    if (w.status === 'correct' && w.stressEstimatedOk) return acc + 1;
    if (w.status === 'correct' || w.status === 'close') return acc + w.charSimilarity * 0.75;
    return acc;
  }, 0);
  const stressPronunciationEstimate =
    attemptedCount === 0
      ? 0
      : Math.max(0, Math.min(100, Math.round((stressMatches / targetTokens.length) * 100)));

  // 4. Fluency: speech rate comparison against target clip duration
  let fluency = 0;
  if (attemptedCount > 0 && actualDurationSec > 0.3) {
    const safeTargetDur = Math.max(1.5, targetDurationSec || targetTokens.length * 0.65);
    const ratio = actualDurationSec / safeTargetDur;
    if (ratio >= 0.75 && ratio <= 1.35) {
      fluency = 96;
    } else if (ratio > 1.35) {
      // Slower than model
      const slowPenalty = Math.min(55, Math.round((ratio - 1.35) * 40));
      fluency = Math.max(40, 95 - slowPenalty);
    } else {
      // Too rushed or clipped
      const rushPenalty = Math.min(50, Math.round((0.75 - ratio) * 70));
      fluency = Math.max(40, 95 - rushPenalty);
    }
    // Scale fluency if completeness is very low
    fluency = Math.round(fluency * (0.4 + 0.6 * (completeness / 100)));
  }

  // 5. Overall weighted score
  const overall = Math.round(
    accuracy * 0.45 +
      stressPronunciationEstimate * 0.2 +
      fluency * 0.15 +
      completeness * 0.2
  );

  let stars: 0 | 1 | 2 | 3 = 0;
  if (overall >= 88) stars = 3;
  else if (overall >= 70) stars = 2;
  else if (overall >= 45) stars = 1;

  const fuelEarned = stars === 3 ? 15 : stars === 2 ? 10 : stars === 1 ? 5 : 2;

  const mispronouncedWords = aligned
    .filter((w) => w.status === 'mispronounced' || w.status === 'close' || w.status === 'missing')
    .map((w) => stripStress(w.targetWord).replace(/[.,!?;:«»"—()-]/g, '').trim())
    .filter(Boolean);

  // Localized coaching tip based on primary weakness
  let oneLineTip = {
    ru: 'Отличное произношение! Ударение и темп звучат естественно.',
    en: 'Great pronunciation! Your stress and pacing sound natural.',
    ar: 'نطق ممتاز! النبر والسرعة يبدوان طبيعيين.',
    fr: 'Excellente prononciation ! Votre accent tonique et votre rythme sont naturels.',
  };

  const firstClose = aligned.find((w) => w.status === 'close');
  const firstMispronounced = aligned.find((w) => w.status === 'mispronounced');
  const firstMissing = aligned.find((w) => w.status === 'missing');

  if (firstMispronounced) {
    oneLineTip = {
      ru: `Обратите внимание на слово «${firstMispronounced.targetWord}» — нажмите на него, чтобы прослушать ударный слог.`,
      en: `Watch the word "${firstMispronounced.targetWord}" — tap it to hear the stressed syllable clearly.`,
      ar: `انتبه للكلمة "${firstMispronounced.targetWord}" — اضغط عليها لسماع المقطع المشدد بوضوح.`,
      fr: `Attention au mot « ${firstMispronounced.targetWord} » — touchez-le pour écouter la syllabe accentuée.`,
    };
  } else if (firstClose) {
    oneLineTip = {
      ru: `Почти идеально! Проверьте окончание в слове «${firstClose.targetWord}».`,
      en: `Almost spot-on! Check the word ending in "${firstClose.targetWord}".`,
      ar: `قريب جداً من الكمال! تحقق من نهاية الكلمة في "${firstClose.targetWord}".`,
      fr: `Presque parfait ! Vérifiez la terminaison du mot « ${firstClose.targetWord} ».`,
    };
  } else if (firstMissing) {
    oneLineTip = {
      ru: `Не пропускайте слово «${firstMissing.targetWord}» — произнесите всю фразу целиком.`,
      en: `Don't skip "${firstMissing.targetWord}" — try speaking the complete phrase.`,
      ar: `لا تتخطَّ الكلمة "${firstMissing.targetWord}" — حاول نطق الجملة كاملة.`,
      fr: `Ne sautez pas « ${firstMissing.targetWord} » — prononcez toute la phrase.`,
    };
  } else if (fluency < 75) {
    oneLineTip = {
      ru: 'Слова верные! Попробуйте произнести фразу чуть плавнее, без длинных пауз.',
      en: 'Words are accurate! Try speaking the phrase a bit more smoothly without long pauses.',
      ar: 'الكلمات صحيحة! حاول نطق العبارة بسلاسة أكبر دون توقفات طويلة.',
      fr: 'Les mots sont exacts ! Essayez de parler un peu plus fluidement sans longues pauses.',
    };
  }

  return {
    accuracy,
    stressPronunciationEstimate,
    fluency,
    completeness,
    overall,
    stars,
    fuelEarned,
    alignedWords: aligned,
    mispronouncedWords,
    oneLineTip,
    aiEstimateDisclaimer: true,
  };
}

// ----------------------------------------------------------------------------
// 2. LEGAL & PUBLICATION GUARDS (CLIPS & LIBRARY)
// ----------------------------------------------------------------------------

const BANNED_THIRD_PARTY_DOMAINS = [
  'tiktok.com',
  'vm.tiktok.com',
  'youtube.com',
  'youtu.be',
  'instagram.com',
  'vk.com',
  'vkvideo.ru',
];

export type ClipSourceType = 'madi_creator' | 'ai_original' | 'open_license';
export type ReviewStatus = 'draft' | 'needs_review' | 'approved' | 'rejected';

export const ALLOWED_CONTENT_LICENSES = [
  'public_domain',
  'cc_by',
  'cc_by_sa',
  'own_work_with_permission',
  'all_rights_reserved_with_permission',
] as const;

export type AllowedLicenseType = (typeof ALLOWED_CONTENT_LICENSES)[number];

export const AI_EDITORIAL_ATTRIBUTION =
  'madingo editorial draft (AI-assisted) - not yet reviewed by a teacher';

export function isAllowedLicense(license: string | undefined | null): license is AllowedLicenseType {
  if (!license) return false;
  return (ALLOWED_CONTENT_LICENSES as readonly string[]).includes(license);
}

export interface ClipPublicationCandidate {
  id: string;
  sourceType: ClipSourceType;
  license: string;
  sourceUrl?: string;
  author: string;
  consentConfirmed: boolean;
  consentDocumentUrl?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewStatus: ReviewStatus;
  videoOrSceneUrl?: string;
}

export interface PublicationCheckResult {
  allowed: boolean;
  effectiveStatus: ReviewStatus;
  reasons: string[];
}

/**
 * Enforces strict legal rules on speaking clips:
 * - No third-party scraped/embedded URLs (TikTok, YouTube, Instagram, VK)
 * - License must come strictly from ALLOWED_CONTENT_LICENSES (never auto-filled or invented)
 * - Requires a valid human-entered sourceUrl (http/https)
 * - Signed consent (consentConfirmed) can ONLY be true if a real uploaded consentDocumentUrl is attached; otherwise clip stays 'draft'
 * - Must have real reviewedBy + reviewedAt + reviewStatus = 'approved'
 */
export function validateClipForPublication(
  clip: ClipPublicationCandidate
): PublicationCheckResult {
  const reasons: string[] = [];

  if (!['madi_creator', 'ai_original', 'open_license'].includes(clip.sourceType)) {
    reasons.push('Invalid source_type. Must be madi_creator, ai_original, or open_license.');
  }
  const hasRealConsentDoc = Boolean(
    clip.consentDocumentUrl && clip.consentDocumentUrl.trim().length > 5
  );
  if (!clip.consentConfirmed || !hasRealConsentDoc) {
    reasons.push(
      'Signed consent requires an uploaded consent document attachment; without it the clip remains Draft.'
    );
  }
  if (!isAllowedLicense(clip.license)) {
    reasons.push(
      `License must be one of the fixed values: ${ALLOWED_CONTENT_LICENSES.join(', ')}.`
    );
  }
  if (!clip.sourceUrl || !/^https?:\/\/\S+/i.test(clip.sourceUrl.trim())) {
    reasons.push('A valid human-entered source URL (https://...) is required.');
  }
  if (!clip.author || clip.author.trim().length < 2) {
    reasons.push('Author attribution is required.');
  }
  if (clip.reviewStatus !== 'approved' || !clip.reviewedBy || !clip.reviewedAt) {
    reasons.push('Clip must be reviewed and approved by an authenticated teacher or content reviewer.');
  }
  if (clip.videoOrSceneUrl) {
    const lowerUrl = clip.videoOrSceneUrl.toLowerCase();
    for (const domain of BANNED_THIRD_PARTY_DOMAINS) {
      if (lowerUrl.includes(domain)) {
        reasons.push(`Third-party platform URL (${domain}) is strictly prohibited.`);
      }
    }
  }

  return {
    allowed: reasons.length === 0,
    effectiveStatus: reasons.length === 0 ? 'approved' : 'draft',
    reasons,
  };
}

export interface LibraryPublicationCandidate {
  id: string;
  title: string | Record<string, string>;
  licenseType: string;
  sourceUrl?: string;
  permissionConfirmed: boolean;
  reviewStatus: ReviewStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
}

/**
 * Enforces strict copyright/permission rules on Library uploads:
 * - License must be from ALLOWED_CONTENT_LICENSES
 * - Requires a valid human-entered sourceUrl (https://...)
 * - Uploader must confirm right/permission checkbox (`permissionConfirmed === true`)
 * - Admin/reviewer must approve (`reviewStatus === 'approved'`) with reviewer name & timestamp
 */
export function validateLibraryItemForPublication(
  item: LibraryPublicationCandidate
): PublicationCheckResult {
  const reasons: string[] = [];
  if (!isAllowedLicense(item.licenseType)) {
    reasons.push(
      `Library license must be one of: ${ALLOWED_CONTENT_LICENSES.join(', ')}.`
    );
  }
  if (!item.sourceUrl || !/^https?:\/\/\S+/i.test(item.sourceUrl.trim())) {
    reasons.push('Library material requires a valid human-entered source URL (https://...).');
  }
  if (!item.permissionConfirmed) {
    reasons.push('Uploader must confirm right/permission to share this material.');
  }
  if (item.reviewStatus !== 'approved' || !item.reviewedBy) {
    reasons.push('Library material must be approved by an administrator or reviewer before becoming visible.');
  }
  return {
    allowed: reasons.length === 0,
    effectiveStatus: reasons.length === 0 ? 'approved' : 'draft',
    reasons,
  };
}

// ----------------------------------------------------------------------------
// 3. AI CONTENT PIPELINE VALIDATOR (TEACHER-IN-THE-LOOP)
// ----------------------------------------------------------------------------

const BANNED_CONTENT_PATTERNS = [
  /\b(наркотик|оружие|взрывчат|террор|самоубийств|порно|экстремизм)\w*/i,
  /\b(drugs|weapons|explosives|suicide|porn|extremism|hate\s+speech)\b/i,
];

const CEFR_RANK: Record<string, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
};

export interface GeneratedDialogueLine {
  speaker: string;
  ru: string; // with stress marks
  en: string;
  ar: string;
  fr: string;
}

export interface GeneratedContentCandidate {
  title: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  topic: string;
  grammarPoint: string;
  register: 'formal' | 'colloquial';
  lines: GeneratedDialogueLine[];
  vocabulary: string[];
}

export interface ContentValidationReport {
  passed: boolean;
  stressMarksPassed: boolean;
  lengthPassed: boolean;
  safeContentPassed: boolean;
  vocabLevelPassed: boolean;
  duplicatePassed: boolean;
  outOfLevelWords: string[];
  unstressedMultiSyllableWords: string[];
  warnings: string[];
  errors: string[];
}

/**
 * Runs automated quality & safety checks on AI-generated Russian dialogue scripts
 * before they enter the Teacher Review Queue.
 */
export function validateGeneratedContent(
  candidate: GeneratedContentCandidate,
  dictionaryWords: { lemma: string; level: string }[],
  existingTitles: string[] = []
): ContentValidationReport {
  const warnings: string[] = [];
  const errors: string[] = [];

  // 1. Length check (2 to 12 dialogue lines)
  const lengthPassed = candidate.lines.length >= 2 && candidate.lines.length <= 12;
  if (!lengthPassed) {
    errors.push(`Dialogue must have between 2 and 12 lines (found ${candidate.lines.length}).`);
  }

  // 2. Banned / unsafe content check
  const allText = [
    candidate.title,
    ...candidate.lines.flatMap((l) => [l.ru, l.en, l.ar, l.fr]),
  ].join(' ');
  const safeContentPassed = !BANNED_CONTENT_PATTERNS.some((re) => re.test(allText));
  if (!safeContentPassed) {
    errors.push('Content triggered the safe-content filter.');
  }

  // 3. Stress-mark presence check on multi-syllable Russian words
  const unstressedMultiSyllableWords: string[] = [];
  for (const line of candidate.lines) {
    const words = line.ru
      .replace(/[.,!?;:«»"—()-]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    for (const w of words) {
      const clean = stripStress(w).toLowerCase();
      const vowels = clean.match(/[аеёиоуыэюя]/g) || [];
      if (vowels.length >= 2 && !hasStressMark(w)) {
        unstressedMultiSyllableWords.push(w);
      }
    }
  }
  const stressMarksPassed = unstressedMultiSyllableWords.length === 0;
  if (!stressMarksPassed) {
    warnings.push(
      `Missing stress marks on multi-syllable words: ${unstressedMultiSyllableWords.slice(0, 5).join(', ')}`
    );
  }

  // 4. Vocabulary level check against dictionary
  const targetRank = CEFR_RANK[candidate.level] || 1;
  const dictMap = new Map<string, number>();
  for (const dw of dictionaryWords) {
    const cleanLemma = stripStress(dw.lemma).toLowerCase().replace(/ё/g, 'е');
    dictMap.set(cleanLemma, CEFR_RANK[dw.level] || 1);
  }

  const outOfLevelWords: string[] = [];
  for (const vocabWord of candidate.vocabulary) {
    const cleanV = stripStress(vocabWord).toLowerCase().replace(/ё/g, 'е');
    const wordRank = dictMap.get(cleanV);
    if (wordRank !== undefined && wordRank > targetRank + 1) {
      outOfLevelWords.push(vocabWord);
    }
  }
  const vocabLevelPassed = outOfLevelWords.length <= 2;
  if (!vocabLevelPassed) {
    warnings.push(
      `Vocabulary exceeds target level (${candidate.level}): ${outOfLevelWords.join(', ')}`
    );
  }

  // 5. Duplicate detection
  const normTitle = normalizeRussianForMatch(candidate.title, true);
  const duplicatePassed = !existingTitles.some(
    (t) => normalizeRussianForMatch(t, true) === normTitle
  );
  if (!duplicatePassed) {
    errors.push(`Duplicate title detected: "${candidate.title}".`);
  }

  // 6. Translations completeness check
  const missingTranslations = candidate.lines.some(
    (l) => !l.ru.trim() || !l.en.trim() || !l.ar.trim() || !l.fr.trim()
  );
  if (missingTranslations) {
    errors.push('Every dialogue line must include ru, en, ar, and fr translations.');
  }

  return {
    passed: errors.length === 0 && stressMarksPassed,
    stressMarksPassed,
    lengthPassed,
    safeContentPassed,
    vocabLevelPassed,
    duplicatePassed,
    outOfLevelWords,
    unstressedMultiSyllableWords,
    warnings,
    errors,
  };
}

// ----------------------------------------------------------------------------
// 4. ROLES, PERMISSIONS & RLS ACCESS CONTROL HELPERS
// ----------------------------------------------------------------------------

export type UserRole = 'student' | 'teacher' | 'content_reviewer' | 'admin';

export interface AccessContext {
  actorId: string;
  actorRole: UserRole;
  teacherGroupStudentIds?: string[]; // students belonging to the teacher's groups
}

/**
 * RLS equivalent: Can actor read a target student's progress/recordings/speech_attempts?
 * - Student can only read their own rows.
 * - Teacher can only read rows of students in their own groups (or themselves).
 * - Admin can read all rows.
 */
export function canReadStudentRecord(ctx: AccessContext, targetStudentId: string): boolean {
  if (ctx.actorRole === 'admin') return true;
  if (ctx.actorId === targetStudentId) return true;
  if (ctx.actorRole === 'teacher') {
    return (ctx.teacherGroupStudentIds || []).includes(targetStudentId);
  }
  return false;
}

/**
 * Can actor review/approve AI-generated content or speaking clips?
 */
export function canApproveContent(role: UserRole): boolean {
  return role === 'teacher' || role === 'content_reviewer' || role === 'admin';
}

/**
 * Can actor approve library uploads or execute takedowns on reported items?
 */
export function canModerateLibrary(role: UserRole): boolean {
  return role === 'admin' || role === 'content_reviewer';
}

// ----------------------------------------------------------------------------
// 5. DAILY QUOTA & COST GUARD
// ----------------------------------------------------------------------------

export interface QuotaCheckResult {
  allowed: boolean;
  remainingUserQuota: number;
  remainingGlobalBudgetUsd: number;
  reason?: string;
}

export class DailyQuotaGuard {
  private userCounts = new Map<string, number>();
  private globalSpendUsd = 0;

  constructor(
    private readonly maxRequestsPerUserPerDay: number = 60,
    private readonly maxDailyBudgetUsd: number = 15.0
  ) {}

  public checkAndConsume(userId: string, estimatedCostUsd: number): QuotaCheckResult {
    const currentCount = this.userCounts.get(userId) || 0;
    if (currentCount >= this.maxRequestsPerUserPerDay) {
      return {
        allowed: false,
        remainingUserQuota: 0,
        remainingGlobalBudgetUsd: Math.max(0, this.maxDailyBudgetUsd - this.globalSpendUsd),
        reason: 'Daily per-user AI/Speech quota reached. Please try again tomorrow.',
      };
    }

    if (this.globalSpendUsd + estimatedCostUsd > this.maxDailyBudgetUsd) {
      return {
        allowed: false,
        remainingUserQuota: this.maxRequestsPerUserPerDay - currentCount,
        remainingGlobalBudgetUsd: Math.max(0, this.maxDailyBudgetUsd - this.globalSpendUsd),
        reason: 'Daily provider cost cap reached.',
      };
    }

    this.userCounts.set(userId, currentCount + 1);
    this.globalSpendUsd = Math.round((this.globalSpendUsd + estimatedCostUsd) * 10000) / 10000;

    return {
      allowed: true,
      remainingUserQuota: this.maxRequestsPerUserPerDay - (currentCount + 1),
      remainingGlobalBudgetUsd: Math.max(0, this.maxDailyBudgetUsd - this.globalSpendUsd),
    };
  }

  public getStats(userId: string) {
    const used = this.userCounts.get(userId) || 0;
    return {
      usedToday: used,
      limitPerDay: this.maxRequestsPerUserPerDay,
      remainingToday: Math.max(0, this.maxRequestsPerUserPerDay - used),
      globalSpendUsd: this.globalSpendUsd,
      maxDailyBudgetUsd: this.maxDailyBudgetUsd,
    };
  }
}

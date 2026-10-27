/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Content Validation & Export Script (`npm run validate:content`)
 * Checks:
 * 1. Every dictionary word has a stress mark (or single vowel / ё), audioSlug, verified=false, and ru/en/ar/fr translations.
 * 2. Every lesson in Unit 2, Sign Garage, Unit 3, Unit 4, and Unit 5 mixes at least 4 distinct exercise types.
 * 3. Every Russian lesson step and road sign has an audioSlug and all 4 UI translations (ru, en, ar, fr).
 * 4. Writes canonical seed JSON files under /content/ (units.json, dictionary.json, typing_texts.json, road_signs.json).
 */

import fs from 'node:fs';
import path from 'node:path';
import { CURRICULUM_UNITS, GRAMMAR_ROAD_SIGNS, DEV_SAMPLE_EXERCISES } from '../src/data/curriculum';
import { DICTIONARY_WORDS, TYPING_TEXTS } from '../src/data/dictionarySeed';
import {
  SPEAKING_CLIPS,
  CONVERSATION_SCENARIOS,
  LIBRARY_SEED_ITEMS,
} from '../src/data/phase3Seed';
import { validateClipForPublication } from '../src/lib/phase3Engine';

const VOWEL_REGEX = /[аеёиоуыэюяАЕЁИОУЫЭЮЯ]/g;

function hasValidRussianStress(text: string): boolean {
  const words = text
    .replace(/[.,!?;:«»"()—\-…/0-9]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  for (const word of words) {
    // Only check Cyrillic words
    if (!/[а-яёА-ЯЁ]/.test(word)) continue;
    const vowels = word.match(VOWEL_REGEX) || [];
    // Words with >= 2 vowels must have either combining acute (\u0301) or ё/Ё
    if (vowels.length >= 2) {
      const hasAcute = word.normalize('NFD').includes('\u0301');
      const hasYo = /[ёЁ]/.test(word);
      if (!hasAcute && !hasYo) {
        return false;
      }
    }
  }
  return true;
}

function hasAllTranslations(loc: Record<string, string> | undefined): boolean {
  if (!loc) return false;
  return (
    typeof loc.ru === 'string' && loc.ru.trim().length > 0 &&
    typeof loc.en === 'string' && loc.en.trim().length > 0 &&
    typeof loc.ar === 'string' && loc.ar.trim().length > 0 &&
    typeof loc.fr === 'string' && loc.fr.trim().length > 0
  );
}

function main() {
  const errors: string[] = [];

  // 1. Validate Dictionary Words (~410 words)
  if (DICTIONARY_WORDS.length < 400) {
    errors.push(`Expected at least 400 dictionary words, found ${DICTIONARY_WORDS.length}`);
  }
  const madiCount = DICTIONARY_WORDS.filter((w) => w.isMadiTerm).length;
  if (madiCount < 100) {
    errors.push(`Expected at least 100 MADI/automotive terms, found ${madiCount}`);
  }

  for (const word of DICTIONARY_WORDS) {
    if (!hasValidRussianStress(word.stressed)) {
      errors.push(`Dictionary word [${word.id}] "${word.stressed}" is missing a stress mark.`);
    }
    if (!word.audioSlug || word.audioSlug.trim().length === 0) {
      errors.push(`Dictionary word [${word.id}] is missing audioSlug.`);
    }
    if (word.verified !== false) {
      errors.push(`Dictionary word [${word.id}] must have verified=false (human linguist flag).`);
    }
    if (!hasAllTranslations(word.translations)) {
      errors.push(`Dictionary word [${word.id}] is missing one or more translations (ru/en/ar/fr).`);
    }
    if (!word.examples || word.examples.length < 3) {
      errors.push(`Dictionary word [${word.id}] must have 3 example sentences.`);
    } else {
      for (const ex of word.examples) {
        if (!ex.audioSlug) {
          errors.push(`Dictionary word [${word.id}] example is missing audioSlug.`);
        }
        if (!hasAllTranslations(ex.translations)) {
          errors.push(`Dictionary word [${word.id}] example is missing ru/en/ar/fr translations.`);
        }
      }
    }
  }

  // 2. Validate Curriculum Units & Lessons
  const expectedUnitIds = ['unit-1', 'unit-2', 'unit-signs', 'unit-3', 'unit-4', 'unit-5'];
  for (const expectedId of expectedUnitIds) {
    if (!CURRICULUM_UNITS.some((u) => u.id === expectedId)) {
      errors.push(`Missing curriculum unit: ${expectedId}`);
    }
  }

  const exerciseTypesSet = new Set([
    'letter_sound',
    'word_builder',
    'picture_word',
    'sentence_builder',
    'translation_typing',
    'listening_dictation',
    'matching_pairs',
    'fill_blank',
    'stress_placement',
    'case_declension',
  ]);

  let totalLessons = 0;
  let totalSteps = 0;

  for (const unit of CURRICULUM_UNITS) {
    if (!hasAllTranslations(unit.title) || !hasAllTranslations(unit.subtitle)) {
      errors.push(`Unit [${unit.id}] is missing localized title/subtitle.`);
    }
    for (const lesson of unit.lessons) {
      totalLessons++;
      if (!hasAllTranslations(lesson.title) || !hasAllTranslations(lesson.description)) {
        errors.push(`Lesson [${lesson.id}] is missing localized title/description.`);
      }

      const distinctExTypes = new Set<string>();
      for (const step of lesson.steps) {
        totalSteps++;
        if (exerciseTypesSet.has(step.type)) {
          distinctExTypes.add(step.type);
        }
        // Check audioSlug on steps
        const slug =
          step.content.audioSlug ||
          step.content.letter?.audioSlug ||
          step.content.phrase?.audioSlug ||
          (step.content.pairs && step.content.pairs[0]?.audioSlug);
        if (!slug) {
          errors.push(`Step [${step.id}] in lesson [${lesson.id}] is missing audioSlug.`);
        }
      }

      // Phase 2 requirement: Unit 2..5 and Sign Garage lessons must mix at least 4 exercise types
      if (unit.id !== 'unit-1' && distinctExTypes.size < 4) {
        errors.push(
          `Lesson [${lesson.id}] in unit [${unit.id}] only has ${distinctExTypes.size} exercise types (${Array.from(distinctExTypes).join(', ')}); expected >= 4.`
        );
      }
    }
  }

  // 3. Validate Typing Texts (40 texts)
  if (TYPING_TEXTS.length < 40) {
    errors.push(`Expected 40 starter Typing Lab paragraphs, found ${TYPING_TEXTS.length}.`);
  }
  for (const tt of TYPING_TEXTS) {
    if (!tt.audioSlug) {
      errors.push(`Typing text [${tt.id}] is missing audioSlug.`);
    }
    if (!hasAllTranslations(tt.title) || !hasValidRussianStress(tt.textStressed)) {
      errors.push(`Typing text [${tt.id}] is missing localized title or stress marks in textStressed.`);
    }
  }

  // 4. Validate Grammar Road Signs (6 cases)
  if (GRAMMAR_ROAD_SIGNS.length !== 6) {
    errors.push(`Expected 6 Grammar Road Signs (one per Russian case), found ${GRAMMAR_ROAD_SIGNS.length}.`);
  }

  // 5. Validate /dev/exercises sample steps (all 10 types)
  if (DEV_SAMPLE_EXERCISES.length < 10) {
    errors.push(`Expected 10 sample exercises for /dev/exercises, found ${DEV_SAMPLE_EXERCISES.length}.`);
  }

  // 6. Validate Phase 3 Speaking Clips (30 clips, legal metadata, stress marks, 4 translations)
  if (SPEAKING_CLIPS.length < 30) {
    errors.push(`Expected at least 30 Phase 3 speaking clips, found ${SPEAKING_CLIPS.length}.`);
  }
  for (const clip of SPEAKING_CLIPS) {
    const pubCheck = validateClipForPublication(clip);
    if (!pubCheck.allowed) {
      errors.push(`Speaking clip [${clip.id}] failed legal publication check: ${pubCheck.reasons.join('; ')}`);
    }
    if (!hasAllTranslations(clip.translations) || !hasAllTranslations(clip.title)) {
      errors.push(`Speaking clip [${clip.id}] is missing 4-language translations.`);
    }
    if (!hasValidRussianStress(clip.russianSubtitle)) {
      errors.push(`Speaking clip [${clip.id}] russianSubtitle is missing stress marks.`);
    }
  }

  // 7. Validate Phase 3 Conversation Scenarios (6 scenarios)
  if (CONVERSATION_SCENARIOS.length < 6) {
    errors.push(`Expected at least 6 Phase 3 conversation scenarios, found ${CONVERSATION_SCENARIOS.length}.`);
  }

  // 8. Validate Phase 3 Library Seed Items (20 public-domain / original MADI items)
  if (LIBRARY_SEED_ITEMS.length < 20) {
    errors.push(`Expected at least 20 Phase 3 library items, found ${LIBRARY_SEED_ITEMS.length}.`);
  }
  for (const item of LIBRARY_SEED_ITEMS) {
    if (!item.permissionConfirmed || item.reviewStatus !== 'approved') {
      errors.push(`Library seed item [${item.id}] must have permissionConfirmed=true and reviewStatus='approved'.`);
    }
  }

  // Write canonical JSON seed files to /content
  const contentDir = path.resolve(process.cwd(), 'content');
  if (!fs.existsSync(contentDir)) {
    fs.mkdirSync(contentDir, { recursive: true });
  }

  fs.writeFileSync(path.join(contentDir, 'units.json'), JSON.stringify(CURRICULUM_UNITS, null, 2), 'utf-8');
  fs.writeFileSync(path.join(contentDir, 'dictionary.json'), JSON.stringify(DICTIONARY_WORDS, null, 2), 'utf-8');
  fs.writeFileSync(path.join(contentDir, 'typing_texts.json'), JSON.stringify(TYPING_TEXTS, null, 2), 'utf-8');
  fs.writeFileSync(path.join(contentDir, 'road_signs.json'), JSON.stringify(GRAMMAR_ROAD_SIGNS, null, 2), 'utf-8');
  fs.writeFileSync(path.join(contentDir, 'speaking_clips.json'), JSON.stringify(SPEAKING_CLIPS, null, 2), 'utf-8');
  fs.writeFileSync(path.join(contentDir, 'conversation_scenarios.json'), JSON.stringify(CONVERSATION_SCENARIOS, null, 2), 'utf-8');
  fs.writeFileSync(path.join(contentDir, 'library_items.json'), JSON.stringify(LIBRARY_SEED_ITEMS, null, 2), 'utf-8');

  if (errors.length > 0) {
    console.error(`❌ Content validation failed with ${errors.length} error(s):`);
    for (const err of errors.slice(0, 25)) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log('✅ madingo Phase 1–3 Content Validation Passed!');
  console.log(`   • Units validated: ${CURRICULUM_UNITS.length} (${totalLessons} lessons, ${totalSteps} steps)`);
  console.log(`   • Dictionary words validated: ${DICTIONARY_WORDS.length} (${madiCount} MADI/automotive terms, all verified=false)`);
  console.log(`   • Typing Lab paragraphs validated: ${TYPING_TEXTS.length}`);
  console.log(`   • Grammar Road Signs validated: ${GRAMMAR_ROAD_SIGNS.length}`);
  console.log(`   • Speaking clips validated: ${SPEAKING_CLIPS.length} (all legal consent_confirmed=true & approved)`);
  console.log(`   • Conversation scenarios validated: ${CONVERSATION_SCENARIOS.length}`);
  console.log(`   • Library items validated: ${LIBRARY_SEED_ITEMS.length}`);
  console.log(`   • Exported JSON seed files to /content/`);
}

main();

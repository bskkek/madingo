export type SupportedLang = 'ru' | 'en' | 'ar' | 'fr';

export type LocalizedText = Record<SupportedLang, string>;

export interface ExampleWord {
  wordWithStress: string;
  cleanWord: string;
  audioSlug: string;
  iconKey: string;
  translations: LocalizedText;
}

export interface CyrillicLetterData {
  id: string;
  upper: string;
  lower: string;
  cursiveUpper: string;
  cursiveLower: string;
  audioSlug: string;
  phonetic: string;
  lessonId: string;
  strokePath: string;
  soundComparison: LocalizedText;
  examples: [ExampleWord, ExampleWord];
}

export interface PhraseCardData {
  id: string;
  phraseWithStress: string;
  cleanPhrase: string;
  audioSlug: string;
  iconKey: string;
  translations: LocalizedText;
  usageNote: LocalizedText;
}

import {
  UNIT2_EXTRA_LESSONS,
  PHASE2_EXTRA_UNITS,
  GRAMMAR_ROAD_SIGNS,
  DEV_SAMPLE_EXERCISES,
  type GrammarRoadSign,
} from './phase2Units';
import {
  DICTIONARY_WORDS,
  TYPING_TEXTS,
  type TypingParagraphSeed,
} from './dictionarySeed';
import type { DictionaryWordRecord } from '../lib/phase2Engine';

export {
  GRAMMAR_ROAD_SIGNS,
  DEV_SAMPLE_EXERCISES,
  DICTIONARY_WORDS,
  TYPING_TEXTS,
  type GrammarRoadSign,
  type TypingParagraphSeed,
  type DictionaryWordRecord,
};

export type StepType =
  | 'letter_card'
  | 'phrase_card'
  | 'letter_sound'
  | 'word_builder'
  | 'picture_word'
  | 'sentence_builder'
  | 'translation_typing'
  | 'listening_dictation'
  | 'matching_pairs'
  | 'fill_blank'
  | 'stress_placement'
  | 'case_declension';

export interface MatchingPairItem {
  id: string;
  russianWithStress?: string;
  russian?: string;
  audioSlug: string;
  translation?: LocalizedText;
  translations?: LocalizedText;
  iconKey?: string;
}

export interface LessonStep {
  id: string;
  lessonId: string;
  orderIndex: number;
  type: StepType;
  content: {
    // For letter_card
    letter?: CyrillicLetterData;
    // For phrase_card
    phrase?: PhraseCardData;
    // Shared audio & hint
    targetLetter?: string;
    audioText?: string;
    audioSlug?: string;
    phoneticHint?: string;
    options?: string[];
    correctAnswer: string;
    hint?: LocalizedText;
    // For word_builder
    targetWordWithStress?: string;
    targetCleanWord?: string;
    tiles?: string[];
    wordTiles?: string[];
    translation?: LocalizedText;
    // For picture_word
    iconKey?: string;
    // For sentence_builder
    direction?: 'to_ru' | 'from_ru';
    promptText?: LocalizedText;
    sourcePrompt?: LocalizedText;
    acceptedOrders?: string[][];
    // For translation_typing & listening_dictation
    acceptedVariants?: string[];
    acceptedAnswers?: string[];
    treatYoAsYe?: boolean;
    // For matching_pairs
    pairs?: MatchingPairItem[];
    timerSeconds?: number;
    // For fill_blank
    sentenceBefore?: string;
    sentenceAfter?: string;
    inputMode?: 'choice' | 'type';
    // For stress_placement
    wordWithoutStress?: string;
    stressedVowelIndex?: number;
    // For case_declension
    baseNounWithStress?: string;
    baseNounStressed?: string;
    requiredCase?: 'nom' | 'gen' | 'dat' | 'acc' | 'ins' | 'prep';
    targetCaseCode?: 'nom' | 'gen' | 'dat' | 'acc' | 'ins' | 'prep';
    caseSignTitle?: LocalizedText;
    contextBefore?: string;
    contextAfter?: string;
    prepositionContext?: string;
    caseExplanation?: LocalizedText;
  };
}

export interface CurriculumLesson {
  id: string;
  unitId: string;
  orderIndex: number;
  slug: string;
  estimatedMinutes: number;
  title: LocalizedText;
  description: LocalizedText;
  steps: LessonStep[];
}

export interface CurriculumUnit {
  id: string;
  orderIndex: number;
  slug: string;
  landmarkKey: 'garage' | 'red_square' | 'sign_garage' | 'river_bridge' | 'metro' | 'vdnkh';
  levelCode: string;
  isLockedByDefault: boolean;
  title: LocalizedText;
  subtitle: LocalizedText;
  lessons: CurriculumLesson[];
}

export const CYRILLIC_LETTERS: CyrillicLetterData[] = [
  // LESSON 1: А О К М Т Е
  {
    id: 'let-a',
    upper: 'А',
    lower: 'а',
    cursiveUpper: '𝒜',
    cursiveLower: '𝒶',
    audioSlug: 'letter-a',
    phonetic: '[a]',
    lessonId: 'u1-l1',
    strokePath: 'M 30 85 L 60 20 L 90 85 M 40 62 L 80 62',
    soundComparison: {
      en: 'Like "a" in "father" or "car"',
      ru: 'Открытый гласный звук [а], как в слове «авто́бус»',
      ar: 'مثل حرف الألف الممدودة (ا) في كلمة «باب»',
      fr: 'Comme le « a » dans « gare » ou « patte »',
    },
    examples: [
      {
        wordWithStress: 'Авто́бус',
        cleanWord: 'Автобус',
        audioSlug: 'avtobus',
        iconKey: 'bus',
        translations: { en: 'Bus', ru: 'Автобус', ar: 'حافلة', fr: 'Bus' },
      },
      {
        wordWithStress: 'Апте́ка',
        cleanWord: 'Аптека',
        audioSlug: 'apteka',
        iconKey: 'pharmacy',
        translations: { en: 'Pharmacy', ru: 'Аптека', ar: 'صيدلية', fr: 'Pharmacie' },
      },
    ],
  },
  {
    id: 'let-o',
    upper: 'О',
    lower: 'о',
    cursiveUpper: '𝒪',
    cursiveLower: '𝑜',
    audioSlug: 'letter-o',
    phonetic: '[o]',
    lessonId: 'u1-l1',
    strokePath: 'M 60 22 C 88 22 92 84 60 84 C 28 84 32 22 60 22 Z',
    soundComparison: {
      en: 'Stressed: like "o" in "more". Unstressed: sounds like a soft "a"',
      ru: 'Под ударением чёткий [о], без ударения звучит близко к [а]',
      ar: 'عند النبر مثل الواو في «نور»، وبدون نبر يقترب من الفتحة',
      fr: 'Accentué : comme « o » dans « port ». Non accentué : proche de « a »',
    },
    examples: [
      {
        wordWithStress: 'Окно́',
        cleanWord: 'Окно',
        audioSlug: 'okno',
        iconKey: 'window',
        translations: { en: 'Window', ru: 'Окно', ar: 'نافذة', fr: 'Fenêtre' },
      },
      {
        wordWithStress: 'Остано́вка',
        cleanWord: 'Остановка',
        audioSlug: 'ostanovka',
        iconKey: 'bus_stop',
        translations: { en: 'Bus Stop', ru: 'Остановка', ar: 'موقف حافلات', fr: 'Arrêt de bus' },
      },
    ],
  },
  {
    id: 'let-k',
    upper: 'К',
    lower: 'к',
    cursiveUpper: '𝒦',
    cursiveLower: '𝓀',
    audioSlug: 'letter-k',
    phonetic: '[k]',
    lessonId: 'u1-l1',
    strokePath: 'M 38 20 L 38 85 M 82 22 L 42 54 L 84 85',
    soundComparison: {
      en: 'Like "k" in "kart" (unaspirated, crisp)',
      ru: 'Согласный звук [к], как в слове «ка́рта»',
      ar: 'مثل حرف الكاف (ك) في كلمة «كتاب»',
      fr: 'Comme le « k » dans « kilomètre »',
    },
    examples: [
      {
        wordWithStress: 'Ко́т',
        cleanWord: 'Кот',
        audioSlug: 'kot',
        iconKey: 'cat',
        translations: { en: 'Cat', ru: 'Кот', ar: 'قط', fr: 'Chat' },
      },
      {
        wordWithStress: 'Ка́рта',
        cleanWord: 'Карта',
        audioSlug: 'karta',
        iconKey: 'map',
        translations: { en: 'Map', ru: 'Карта', ar: 'خريطة', fr: 'Carte' },
      },
    ],
  },
  {
    id: 'let-m',
    upper: 'М',
    lower: 'м',
    cursiveUpper: '𝑀',
    cursiveLower: '𝑚',
    audioSlug: 'letter-m',
    phonetic: '[m]',
    lessonId: 'u1-l1',
    strokePath: 'M 25 85 L 40 22 L 60 66 L 80 22 L 95 85',
    soundComparison: {
      en: 'Like "m" in "metro" or "motor"',
      ru: 'Согласный звук [м], как в слове «метро́»',
      ar: 'مثل حرف الميم (م) في كلمة «مترو»',
      fr: 'Comme le « m » dans « métro »',
    },
    examples: [
      {
        wordWithStress: 'Метро́',
        cleanWord: 'Метро',
        audioSlug: 'metro',
        iconKey: 'metro',
        translations: { en: 'Metro', ru: 'Метро', ar: 'مترو الأنفاق', fr: 'Métro' },
      },
      {
        wordWithStress: 'Мо́ст',
        cleanWord: 'Мост',
        audioSlug: 'most',
        iconKey: 'bridge',
        translations: { en: 'Bridge', ru: 'Мост', ar: 'جسر', fr: 'Pont' },
      },
    ],
  },
  {
    id: 'let-t',
    upper: 'Т',
    lower: 'т',
    cursiveUpper: '𝒯',
    cursiveLower: '𝑚',
    audioSlug: 'letter-t',
    phonetic: '[t]',
    lessonId: 'u1-l1',
    strokePath: 'M 28 24 L 92 24 M 60 24 L 60 85',
    soundComparison: {
      en: 'Like "t" in "stop" with tongue touching upper teeth (note: cursive lowercase looks like "m"!)',
      ru: 'Звук [т]; внимание: строчная рукописная «т» пишется с тремя ножками как латинская m',
      ar: 'مثل حرف التاء (ت)؛ انتبه: شكلها اليدوي الصغير يشبه حرف m اللاتيني',
      fr: 'Comme le « t » dans « auto » (attention : en cursive minuscule elle ressemble à un « m » !)',
    },
    examples: [
      {
        wordWithStress: 'Такси́',
        cleanWord: 'Такси',
        audioSlug: 'taksi',
        iconKey: 'taxi',
        translations: { en: 'Taxi', ru: 'Такси', ar: 'سيارة أجرة', fr: 'Taxi' },
      },
      {
        wordWithStress: 'Та́м',
        cleanWord: 'Там',
        audioSlug: 'tam',
        iconKey: 'pin',
        translations: { en: 'There', ru: 'Там', ar: 'هناك', fr: 'Là-bas' },
      },
    ],
  },
  {
    id: 'let-ye',
    upper: 'Е',
    lower: 'е',
    cursiveUpper: 'ℰ',
    cursiveLower: 'ℯ',
    audioSlug: 'letter-ye',
    phonetic: '[je] / [e]',
    lessonId: 'u1-l1',
    strokePath: 'M 78 24 L 38 24 L 38 84 L 78 84 M 38 52 L 72 52',
    soundComparison: {
      en: 'Like "ye" in "yes"',
      ru: 'Йотированный гласный [йэ], смягчает предыдущий согласный',
      ar: 'ينطق «يي» مثل بداية كلمة «yes» في الإنجليزية',
      fr: 'Comme « yé » dans « yéti »',
    },
    examples: [
      {
        wordWithStress: 'Еда́',
        cleanWord: 'Еда',
        audioSlug: 'yeda',
        iconKey: 'food',
        translations: { en: 'Food', ru: 'Еда', ar: 'طعام', fr: 'Nourriture' },
      },
      {
        wordWithStress: 'Те́ма',
        cleanWord: 'Тема',
        audioSlug: 'tema',
        iconKey: 'book',
        translations: { en: 'Topic / Theme', ru: 'Тема', ar: 'موضوع', fr: 'Thème / Sujet' },
      },
    ],
  },

  // LESSON 2: С Н В Р Х У
  {
    id: 'let-s',
    upper: 'С',
    lower: 'с',
    cursiveUpper: '𝒞',
    cursiveLower: '𝒸',
    audioSlug: 'letter-s',
    phonetic: '[s]',
    lessonId: 'u1-l2',
    strokePath: 'M 82 32 C 62 14 34 26 34 54 C 34 82 62 92 82 76',
    soundComparison: {
      en: 'Always like "s" in "sun" (never like "k"!)',
      ru: 'Глухой свистящий звук [с], как в слове «светофо́р»',
      ar: 'ينطق دائماً مثل حرف السين (س) في «سلام»',
      fr: 'Toujours comme le « s » dans « soleil » (jamais [k])',
    },
    examples: [
      {
        wordWithStress: 'Светофо́р',
        cleanWord: 'Светофор',
        audioSlug: 'svetofor',
        iconKey: 'traffic_light',
        translations: { en: 'Traffic Light', ru: 'Светофор', ar: 'إشارة مرور', fr: 'Feu tricolore' },
      },
      {
        wordWithStress: 'Студе́нт',
        cleanWord: 'Студент',
        audioSlug: 'student',
        iconKey: 'student',
        translations: { en: 'Student', ru: 'Студент', ar: 'طالب', fr: 'Étudiant' },
      },
    ],
  },
  {
    id: 'let-n',
    upper: 'Н',
    lower: 'н',
    cursiveUpper: 'ℋ',
    cursiveLower: '𝒽',
    audioSlug: 'letter-n',
    phonetic: '[n]',
    lessonId: 'u1-l2',
    strokePath: 'M 36 22 L 36 85 M 84 22 L 84 85 M 36 53 L 84 53',
    soundComparison: {
      en: 'Like "n" in "noon" (looks like English H, but sounds like N)',
      ru: 'Носовой звук [н], как в слове «но́мер»',
      ar: 'ينطق مثل حرف النون (ن) في «نور» (رغم أنه يشبه H)',
      fr: 'Comme le « n » dans « nord » (ressemble à un H mais se lit N)',
    },
    examples: [
      {
        wordWithStress: 'Но́мер',
        cleanWord: 'Номер',
        audioSlug: 'nomer',
        iconKey: 'plate',
        translations: { en: 'Number / Room', ru: 'Номер', ar: 'رقم', fr: 'Numéro' },
      },
      {
        wordWithStress: 'Но́чь',
        cleanWord: 'Ночь',
        audioSlug: 'noch',
        iconKey: 'night',
        translations: { en: 'Night', ru: 'Ночь', ar: 'ليل', fr: 'Nuit' },
      },
    ],
  },
  {
    id: 'let-v',
    upper: 'В',
    lower: 'в',
    cursiveUpper: 'ℬ',
    cursiveLower: '𝒷',
    audioSlug: 'letter-v',
    phonetic: '[v]',
    lessonId: 'u1-l2',
    strokePath: 'M 38 22 L 38 84 C 78 84 82 54 38 52 C 76 50 76 22 38 22 Z',
    soundComparison: {
      en: 'Like "v" in "van" or "volt" (looks like B, sounds like V)',
      ru: 'Звонкий звук [в], как в слове «вода́»',
      ar: 'ينطق «ف» مهموسة (V) كما في كلمة «فيديو»',
      fr: 'Comme le « v » dans « voiture » (ressemble à B mais se lit V)',
    },
    examples: [
      {
        wordWithStress: 'Вода́',
        cleanWord: 'Вода',
        audioSlug: 'voda',
        iconKey: 'water',
        translations: { en: 'Water', ru: 'Вода', ar: 'ماء', fr: 'Eau' },
      },
      {
        wordWithStress: 'Вхо́д',
        cleanWord: 'Вход',
        audioSlug: 'vkhod',
        iconKey: 'door',
        translations: { en: 'Entrance', ru: 'Вход', ar: 'مدخل', fr: 'Entrée' },
      },
    ],
  },
  {
    id: 'let-r',
    upper: 'Р',
    lower: 'р',
    cursiveUpper: '𝒫',
    cursiveLower: '𝓅',
    audioSlug: 'letter-r',
    phonetic: '[r]',
    lessonId: 'u1-l2',
    strokePath: 'M 38 22 L 38 85 M 38 22 C 82 22 82 56 38 56',
    soundComparison: {
      en: 'Rolled "r" like in Spanish or Italian (looks like P, sounds like R)',
      ru: 'Вибрирующий звук [р], как в слове «ру́ль»',
      ar: 'مثل حرف الراء (ر) في العربية (يشبه P لكنه يُقرأ ر)',
      fr: 'Un « r » roulé du bout de la langue (ressemble à P mais se lit R)',
    },
    examples: [
      {
        wordWithStress: 'Ру́ль',
        cleanWord: 'Руль',
        audioSlug: 'rul',
        iconKey: 'wheel',
        translations: { en: 'Steering Wheel', ru: 'Руль', ar: 'عجلة القيادة', fr: 'Volant' },
      },
      {
        wordWithStress: 'Росси́я',
        cleanWord: 'Россия',
        audioSlug: 'rossiya',
        iconKey: 'flag',
        translations: { en: 'Russia', ru: 'Россия', ar: 'روسيا', fr: 'Russie' },
      },
    ],
  },
  {
    id: 'let-kh',
    upper: 'Х',
    lower: 'х',
    cursiveUpper: '𝒳',
    cursiveLower: '𝓍',
    audioSlug: 'letter-kh',
    phonetic: '[x]',
    lessonId: 'u1-l2',
    strokePath: 'M 32 22 L 88 85 M 88 22 L 32 85',
    soundComparison: {
      en: 'Like "ch" in Scottish "loch" or Bach (breathy throat sound, not "ks")',
      ru: 'Фрикативный звук [х], как в слове «хле́б»',
      ar: 'مطابق تماماً لحرف الخاء (خ) في كلمة «خبز»',
      fr: 'Comme la jota espagnole ou « ch » allemand dans « Bach »',
    },
    examples: [
      {
        wordWithStress: 'Хле́б',
        cleanWord: 'Хлеб',
        audioSlug: 'khleb',
        iconKey: 'bread',
        translations: { en: 'Bread', ru: 'Хлеб', ar: 'خبز', fr: 'Pain' },
      },
      {
        wordWithStress: 'Хорошо́',
        cleanWord: 'Хорошо',
        audioSlug: 'khorosho',
        iconKey: 'thumb_up',
        translations: { en: 'Good / Okay', ru: 'Хорошо', ar: 'جيّد / حسناً', fr: 'Bien / D’accord' },
      },
    ],
  },
  {
    id: 'let-u',
    upper: 'У',
    lower: 'у',
    cursiveUpper: '𝒴',
    cursiveLower: '𝓎',
    audioSlug: 'letter-u',
    phonetic: '[u]',
    lessonId: 'u1-l2',
    strokePath: 'M 32 22 L 58 56 M 86 22 L 42 86',
    soundComparison: {
      en: 'Like "oo" in "moon" or "boot"',
      ru: 'Гласный звук [у] с округлёнными губами, как в слове «у́лица»',
      ar: 'مثل حرف الواو الممدودة (و) في كلمة «نور»',
      fr: 'Comme le son « ou » dans « route »',
    },
    examples: [
      {
        wordWithStress: 'У́лица',
        cleanWord: 'Улица',
        audioSlug: 'ulitsa',
        iconKey: 'road',
        translations: { en: 'Street', ru: 'Улица', ar: 'شارع', fr: 'Rue' },
      },
      {
        wordWithStress: 'У́тро',
        cleanWord: 'Утро',
        audioSlug: 'utro',
        iconKey: 'sun',
        translations: { en: 'Morning', ru: 'Утро', ar: 'صباح', fr: 'Matin' },
      },
    ],
  },

  // LESSON 3: Д Л П И З Б
  {
    id: 'let-d',
    upper: 'Д',
    lower: 'д',
    cursiveUpper: '𝒟',
    cursiveLower: '𝑔',
    audioSlug: 'letter-d',
    phonetic: '[d]',
    lessonId: 'u1-l3',
    strokePath: 'M 42 22 L 78 22 L 82 72 L 32 72 Z M 32 72 L 32 88 M 82 72 L 82 88',
    soundComparison: {
      en: 'Like "d" in "door" (cursive lowercase looks like an English "g")',
      ru: 'Звонкий согласный [д], как в слове «доро́га»',
      ar: 'مثل حرف الدال (د) في كلمة «دار»',
      fr: 'Comme le « d » dans « départ »',
    },
    examples: [
      {
        wordWithStress: 'Доро́га',
        cleanWord: 'Дорога',
        audioSlug: 'doroga',
        iconKey: 'road',
        translations: { en: 'Road', ru: 'Дорога', ar: 'طريق', fr: 'Route' },
      },
      {
        wordWithStress: 'До́м',
        cleanWord: 'Дом',
        audioSlug: 'dom',
        iconKey: 'building',
        translations: { en: 'House / Building', ru: 'Дом', ar: 'منزل / مبنى', fr: 'Maison / Immeuble' },
      },
    ],
  },
  {
    id: 'let-l',
    upper: 'Л',
    lower: 'л',
    cursiveUpper: 'Λ',
    cursiveLower: 'л',
    audioSlug: 'letter-l',
    phonetic: '[l]',
    lessonId: 'u1-l3',
    strokePath: 'M 32 84 C 44 84 48 24 58 24 L 84 24 L 84 84',
    soundComparison: {
      en: 'Like "l" in "lamp" or "look"',
      ru: 'Сонорный звук [л], как в слове «ле́кции»',
      ar: 'مثل حرف اللام (ل) في كلمة «ليل»',
      fr: 'Comme le « l » dans « lampe »',
    },
    examples: [
      {
        wordWithStress: 'Ла́мпа',
        cleanWord: 'Лампа',
        audioSlug: 'lampa',
        iconKey: 'lamp',
        translations: { en: 'Lamp', ru: 'Лампа', ar: 'مصباح', fr: 'Lampe' },
      },
      {
        wordWithStress: 'Ле́кция',
        cleanWord: 'Лекция',
        audioSlug: 'lektsiya',
        iconKey: 'lecture',
        translations: { en: 'Lecture', ru: 'Лекция', ar: 'محاضرة', fr: 'Cours magistral' },
      },
    ],
  },
  {
    id: 'let-p',
    upper: 'П',
    lower: 'п',
    cursiveUpper: 'Π',
    cursiveLower: '𝑛',
    audioSlug: 'letter-p',
    phonetic: '[p]',
    lessonId: 'u1-l3',
    strokePath: 'M 34 85 L 34 24 L 86 24 L 86 85',
    soundComparison: {
      en: 'Like "p" in "park" (looks like mathematical Pi π)',
      ru: 'Глухой звук [п], как в слове «па́рк»',
      ar: 'ينطق «پ» (P) كما في «پارك» (يشبه رمز باي π الرياضي)',
      fr: 'Comme le « p » dans « pont » (ressemble au symbole Pi π)',
    },
    examples: [
      {
        wordWithStress: 'Па́рк',
        cleanWord: 'Парк',
        audioSlug: 'park',
        iconKey: 'tree',
        translations: { en: 'Park', ru: 'Парк', ar: 'حديقة عامة', fr: 'Parc' },
      },
      {
        wordWithStress: 'Па́спорт',
        cleanWord: 'Паспорт',
        audioSlug: 'pasport',
        iconKey: 'passport',
        translations: { en: 'Passport', ru: 'Паспорт', ar: 'جواز سفر', fr: 'Passeport' },
      },
    ],
  },
  {
    id: 'let-i',
    upper: 'И',
    lower: 'и',
    cursiveUpper: '𝒰',
    cursiveLower: '𝓊',
    audioSlug: 'letter-i',
    phonetic: '[i]',
    lessonId: 'u1-l3',
    strokePath: 'M 34 22 L 34 84 L 86 22 L 86 84',
    soundComparison: {
      en: 'Like "ee" in "meet" (cursive lowercase looks like an English "u"!)',
      ru: 'Гласный звук [и], как в слове «инжене́р»',
      ar: 'مثل الياء الممدودة (ي) في كلمة «تين»',
      fr: 'Comme le « i » dans « midi » (en cursive elle ressemble à un « u »)',
    },
    examples: [
      {
        wordWithStress: 'Инжене́р',
        cleanWord: 'Инженер',
        audioSlug: 'inzhener',
        iconKey: 'wrench',
        translations: { en: 'Engineer', ru: 'Инженер', ar: 'مهندس', fr: 'Ingénieur' },
      },
      {
        wordWithStress: 'Институ́т',
        cleanWord: 'Институт',
        audioSlug: 'institut',
        iconKey: 'campus',
        translations: { en: 'Institute', ru: 'Институт', ar: 'معهد جامعي', fr: 'Institut' },
      },
    ],
  },
  {
    id: 'let-z',
    upper: 'З',
    lower: 'з',
    cursiveUpper: 'З',
    cursiveLower: 'з',
    audioSlug: 'letter-z',
    phonetic: '[z]',
    lessonId: 'u1-l3',
    strokePath: 'M 38 26 C 78 18 78 52 52 52 C 82 52 82 88 36 82',
    soundComparison: {
      en: 'Like "z" in "zone" or "zero" (looks like number 3)',
      ru: 'Звонкий свистящий [з], как в слове «зна́к»',
      ar: 'مثل حرف الزاي (ز) في كلمة «زيت» (يشبه الرقم 3)',
      fr: 'Comme le « z » dans « zone » (attention, ressemble au chiffre 3)',
    },
    examples: [
      {
        wordWithStress: 'Зна́к',
        cleanWord: 'Знак',
        audioSlug: 'znak',
        iconKey: 'sign',
        translations: { en: 'Road Sign', ru: 'Знак', ar: 'لافتة طريق', fr: 'Panneau' },
      },
      {
        wordWithStress: 'Заво́д',
        cleanWord: 'Завод',
        audioSlug: 'zavod',
        iconKey: 'factory',
        translations: { en: 'Factory / Plant', ru: 'Завод', ar: 'مصنع', fr: 'Usine' },
      },
    ],
  },
  {
    id: 'let-b',
    upper: 'Б',
    lower: 'б',
    cursiveUpper: 'Б',
    cursiveLower: 'б',
    audioSlug: 'letter-b',
    phonetic: '[b]',
    lessonId: 'u1-l3',
    strokePath: 'M 78 22 L 38 22 L 38 84 C 82 84 82 48 38 50',
    soundComparison: {
      en: 'Like "b" in "bus" or "bolt"',
      ru: 'Звонкий взрывной звук [б], как в слове «биле́т»',
      ar: 'مثل حرف الباء (ب) في كلمة «باب»',
      fr: 'Comme le « b » dans « billet »',
    },
    examples: [
      {
        wordWithStress: 'Биле́т',
        cleanWord: 'Билет',
        audioSlug: 'bilet',
        iconKey: 'ticket',
        translations: { en: 'Ticket', ru: 'Билет', ar: 'تذكرة', fr: 'Billet / Ticket' },
      },
      {
        wordWithStress: 'Бензи́н',
        cleanWord: 'Бензин',
        audioSlug: 'benzin',
        iconKey: 'fuel',
        translations: { en: 'Gasoline / Fuel', ru: 'Бензин', ar: 'وقود / بنزين', fr: 'Essence' },
      },
    ],
  },

  // LESSON 4: Г Ж Ш Щ Ч Ц
  {
    id: 'let-g',
    upper: 'Г',
    lower: 'г',
    cursiveUpper: 'Г',
    cursiveLower: 'г',
    audioSlug: 'letter-g',
    phonetic: '[g]',
    lessonId: 'u1-l4',
    strokePath: 'M 38 85 L 38 24 L 84 24',
    soundComparison: {
      en: 'Always hard "g" like in "garage" or "go"',
      ru: 'Звонкий звук [г], как в слове «гара́ж»',
      ar: 'مثل الجيم المصرية (G) في «جراج» أو الغين الخفيفة',
      fr: 'Comme le « g » dur dans « garage »',
    },
    examples: [
      {
        wordWithStress: 'Гара́ж',
        cleanWord: 'Гараж',
        audioSlug: 'garazh',
        iconKey: 'garage',
        translations: { en: 'Garage', ru: 'Гараж', ar: 'مرآب', fr: 'Garage' },
      },
      {
        wordWithStress: 'Го́род',
        cleanWord: 'Город',
        audioSlug: 'gorod',
        iconKey: 'city',
        translations: { en: 'City', ru: 'Город', ar: 'مدينة', fr: 'Ville' },
      },
    ],
  },
  {
    id: 'let-zh',
    upper: 'Ж',
    lower: 'ж',
    cursiveUpper: 'Ж',
    cursiveLower: 'ж',
    audioSlug: 'letter-zh',
    phonetic: '[ʐ]',
    lessonId: 'u1-l4',
    strokePath: 'M 26 22 L 60 54 L 26 85 M 60 20 L 60 86 M 94 22 L 60 54 L 94 85',
    soundComparison: {
      en: 'Like "s" in "measure" or "treasure"',
      ru: 'Твёрдый шипящий звук [ж], как жужжание жука',
      ar: 'مثل حرف الجيم الشامية أو الفرنسية (J) في كلمة «أباجورة»',
      fr: 'Comme le « j » français dans « journal »',
    },
    examples: [
      {
        wordWithStress: 'Журна́л',
        cleanWord: 'Журнал',
        audioSlug: 'zhurnal',
        iconKey: 'book',
        translations: { en: 'Journal / Magazine', ru: 'Журнал', ar: 'مجلة / سجل', fr: 'Magazine / Revue' },
      },
      {
        wordWithStress: 'Эта́ж',
        cleanWord: 'Этаж',
        audioSlug: 'etazh',
        iconKey: 'building',
        translations: { en: 'Floor / Story', ru: 'Этаж', ar: 'طابق', fr: 'Étage' },
      },
    ],
  },
  {
    id: 'let-sh',
    upper: 'Ш',
    lower: 'ш',
    cursiveUpper: 'Ш',
    cursiveLower: 'ш',
    audioSlug: 'letter-sh',
    phonetic: '[ʂ]',
    lessonId: 'u1-l4',
    strokePath: 'M 26 24 L 26 84 L 94 84 L 94 24 M 60 24 L 60 84',
    soundComparison: {
      en: 'Hard "sh" like in "bush" with tongue curled slightly back',
      ru: 'Твёрдый глухой шипящий [ш], как в слове «ши́на»',
      ar: 'مثل حرف الشين (ش) المفخمة قليلاً في «شمس»',
      fr: 'Comme le « ch » dans « chat », prononcé de façon grave',
    },
    examples: [
      {
        wordWithStress: 'Ши́на',
        cleanWord: 'Шина',
        audioSlug: 'shina',
        iconKey: 'wheel',
        translations: { en: 'Tire', ru: 'Шина', ar: 'إطار سيارة', fr: 'Pneu' },
      },
      {
        wordWithStress: 'Шоссе́',
        cleanWord: 'Шоссе',
        audioSlug: 'shosse',
        iconKey: 'road',
        translations: { en: 'Highway', ru: 'Шоссе', ar: 'طريق سريع', fr: 'Chaussée / Autoroute' },
      },
    ],
  },
  {
    id: 'let-shch',
    upper: 'Щ',
    lower: 'щ',
    cursiveUpper: 'Щ',
    cursiveLower: 'щ',
    audioSlug: 'letter-shch',
    phonetic: '[ɕː]',
    lessonId: 'u1-l4',
    strokePath: 'M 24 24 L 24 80 L 86 80 L 86 24 M 55 24 L 55 80 M 86 80 L 96 94',
    soundComparison: {
      en: 'Long, soft "shh" like in "fresh cheese" with smiling lips',
      ru: 'Долгий мягкий шипящий [щ:], как в слове «пло́щадь»',
      ar: 'شين مرققة وطويلة (شّي) مع رفع وسط اللسان',
      fr: 'Un « ch » doux et prolongé (comme dans « chuchoter » avec un sourire)',
    },
    examples: [
      {
        wordWithStress: 'Пло́щадь',
        cleanWord: 'Площадь',
        audioSlug: 'ploshchad',
        iconKey: 'square',
        translations: { en: 'City Square', ru: 'Площадь', ar: 'ساحة / ميدان', fr: 'Place' },
      },
      {
        wordWithStress: 'Щётка',
        cleanWord: 'Щётка',
        audioSlug: 'shchyotka',
        iconKey: 'wiper',
        translations: { en: 'Wiper / Brush', ru: 'Щётка', ar: 'فرشاة / ممسحة', fr: 'Brosse / Essuie-glace' },
      },
    ],
  },
  {
    id: 'let-ch',
    upper: 'Ч',
    lower: 'ч',
    cursiveUpper: 'Ч',
    cursiveLower: 'ч',
    audioSlug: 'letter-ch',
    phonetic: '[tɕ]',
    lessonId: 'u1-l4',
    strokePath: 'M 34 22 L 34 52 C 34 62 82 62 82 52 M 82 22 L 82 85',
    soundComparison: {
      en: 'Soft "ch" like in "check" or "cheese"',
      ru: 'Всегда мягкий звук [ч], как в слове «ча́с»',
      ar: 'ينطق «تش» (Ch) كما في كلمة «تشاي» (شاي)',
      fr: 'Comme « tch » dans « Tchéquie »',
    },
    examples: [
      {
        wordWithStress: 'Ча́й',
        cleanWord: 'Чай',
        audioSlug: 'chay',
        iconKey: 'tea',
        translations: { en: 'Tea', ru: 'Чай', ar: 'شاي', fr: 'Thé' },
      },
      {
        wordWithStress: 'Часы́',
        cleanWord: 'Часы',
        audioSlug: 'chasy',
        iconKey: 'clock',
        translations: { en: 'Clock / Watch', ru: 'Часы', ar: 'ساعة', fr: 'Montre / Horloge' },
      },
    ],
  },
  {
    id: 'let-ts',
    upper: 'Ц',
    lower: 'ц',
    cursiveUpper: 'Ц',
    cursiveLower: 'ц',
    audioSlug: 'letter-ts',
    phonetic: '[ts]',
    lessonId: 'u1-l4',
    strokePath: 'M 32 24 L 32 80 L 82 80 L 82 24 M 82 80 L 94 94',
    soundComparison: {
      en: 'Like "ts" at the end of "cats" or "bolts"',
      ru: 'Твёрдый слитный звук [ц], как в слове «це́нтр»',
      ar: 'ينطق «تس» مدمجة في مخرج واحد مثل كلمة «تسونامي»',
      fr: 'Comme « ts » dans « tsar »',
    },
    examples: [
      {
        wordWithStress: 'Це́нтр',
        cleanWord: 'Центр',
        audioSlug: 'tsentr',
        iconKey: 'pin',
        translations: { en: 'Center', ru: 'Центр', ar: 'مركز المدينة', fr: 'Centre' },
      },
      {
        wordWithStress: 'Ци́фра',
        cleanWord: 'Цифра',
        audioSlug: 'tsifra',
        iconKey: 'plate',
        translations: { en: 'Digit / Number', ru: 'Цифра', ar: 'رقم حسابي', fr: 'Chiffre' },
      },
    ],
  },

  // LESSON 5: Ф Э Ю Я Й Ё
  {
    id: 'let-f',
    upper: 'Ф',
    lower: 'ф',
    cursiveUpper: 'Ф',
    cursiveLower: 'ф',
    audioSlug: 'letter-f',
    phonetic: '[f]',
    lessonId: 'u1-l5',
    strokePath: 'M 60 18 L 60 88 M 60 30 C 94 30 94 74 60 74 C 26 74 26 30 60 30 Z',
    soundComparison: {
      en: 'Like "f" in "fast" or "formula"',
      ru: 'Глухой звук [ф], как в слове «фа́ра»',
      ar: 'مثل حرف الفاء (ف) في كلمة «فن»',
      fr: 'Comme le « f » dans « phare »',
    },
    examples: [
      {
        wordWithStress: 'Фа́ра',
        cleanWord: 'Фара',
        audioSlug: 'fara',
        iconKey: 'headlight',
        translations: { en: 'Headlight', ru: 'Фара', ar: 'مصباح السيارة', fr: 'Phare' },
      },
      {
        wordWithStress: 'Фи́зика',
        cleanWord: 'Физика',
        audioSlug: 'fizika',
        iconKey: 'atom',
        translations: { en: 'Physics', ru: 'Физика', ar: 'الفيزياء', fr: 'Physique' },
      },
    ],
  },
  {
    id: 'let-e',
    upper: 'Э',
    lower: 'э',
    cursiveUpper: 'Э',
    cursiveLower: 'э',
    audioSlug: 'letter-e',
    phonetic: '[ɛ]',
    lessonId: 'u1-l5',
    strokePath: 'M 36 26 C 68 16 86 36 86 54 C 86 72 68 90 36 80 M 50 54 L 84 54',
    soundComparison: {
      en: 'Pure "e" like in "echo" or "exam" (without any "y" glide)',
      ru: 'Чистый гласный [э] без звука [й], как в слове «экза́мен»',
      ar: 'صوت «إي» مفتوحة قصيرة كما في بداية كلمة «إكزام»',
      fr: 'Comme le « è » ouvert dans « examen »',
    },
    examples: [
      {
        wordWithStress: 'Экза́мен',
        cleanWord: 'Экзамен',
        audioSlug: 'ekzamen',
        iconKey: 'exam',
        translations: { en: 'Exam', ru: 'Экзамен', ar: 'امتحان', fr: 'Examen' },
      },
      {
        wordWithStress: 'Экра́н',
        cleanWord: 'Экран',
        audioSlug: 'ekran',
        iconKey: 'screen',
        translations: { en: 'Screen', ru: 'Экран', ar: 'شاشة', fr: 'Écran' },
      },
    ],
  },
  {
    id: 'let-yu',
    upper: 'Ю',
    lower: 'ю',
    cursiveUpper: 'Ю',
    cursiveLower: 'ю',
    audioSlug: 'letter-yu',
    phonetic: '[ju]',
    lessonId: 'u1-l5',
    strokePath: 'M 26 22 L 26 84 M 26 53 L 48 53 M 68 24 C 92 24 92 84 68 84 C 44 84 44 24 68 24 Z',
    soundComparison: {
      en: 'Like the word "you" or "u" in "university"',
      ru: 'Йотированный гласный [йу], как в слове «ю́г»',
      ar: 'ينطق «يو» كما في كلمة «يوليو»',
      fr: 'Comme « iou » dans « Yougoslavie »',
    },
    examples: [
      {
        wordWithStress: 'Ю́г',
        cleanWord: 'Юг',
        audioSlug: 'yug',
        iconKey: 'compass',
        translations: { en: 'South', ru: 'Юг', ar: 'جنوب', fr: 'Sud' },
      },
      {
        wordWithStress: 'Меню́',
        cleanWord: 'Меню',
        audioSlug: 'menyu',
        iconKey: 'food',
        translations: { en: 'Menu', ru: 'Меню', ar: 'قائمة طعام', fr: 'Menu' },
      },
    ],
  },
  {
    id: 'let-ya',
    upper: 'Я',
    lower: 'я',
    cursiveUpper: 'Я',
    cursiveLower: 'я',
    audioSlug: 'letter-ya',
    phonetic: '[ja]',
    lessonId: 'u1-l5',
    strokePath: 'M 82 22 L 82 85 M 82 22 C 38 22 38 56 82 56 M 56 56 L 32 85',
    soundComparison: {
      en: 'Like "ya" in "yard" (also means "I" in Russian!)',
      ru: 'Звук [йа]; отдельное слово «Я» означает местоимение 1-го лица',
      ar: 'ينطق «يا» (ويعني أيضاً الضمير «أنا» بالروسية!)',
      fr: 'Comme « ya » dans « yaourt » (signifie aussi « je » en russe !)',
    },
    examples: [
      {
        wordWithStress: 'Я́блоко',
        cleanWord: 'Яблоко',
        audioSlug: 'yabloko',
        iconKey: 'apple',
        translations: { en: 'Apple', ru: 'Яблоко', ar: 'تفاحة', fr: 'Pomme' },
      },
      {
        wordWithStress: 'Язы́к',
        cleanWord: 'Язык',
        audioSlug: 'yazyk',
        iconKey: 'globe',
        translations: { en: 'Language', ru: 'Язык', ar: 'لغة', fr: 'Langue' },
      },
    ],
  },
  {
    id: 'let-y',
    upper: 'Й',
    lower: 'й',
    cursiveUpper: 'Й',
    cursiveLower: 'й',
    audioSlug: 'letter-y',
    phonetic: '[j]',
    lessonId: 'u1-l5',
    strokePath: 'M 34 32 L 34 84 L 86 32 L 86 84 M 48 16 Q 60 26 72 16',
    soundComparison: {
      en: 'Short "y" glide like in "boy" or "toy"',
      ru: 'И краткое — согласный звук [й], как в слове «трамва́й»',
      ar: 'ياء قصيرة ساكنة كما في نهاية كلمة «شاي»',
      fr: 'Comme le « y » final dans « tramway »',
    },
    examples: [
      {
        wordWithStress: 'Трамва́й',
        cleanWord: 'Трамвай',
        audioSlug: 'tramvay',
        iconKey: 'tram',
        translations: { en: 'Tram', ru: 'Трамвай', ar: 'ترام', fr: 'Tramway' },
      },
      {
        wordWithStress: 'Музе́й',
        cleanWord: 'Музей',
        audioSlug: 'muzey',
        iconKey: 'museum',
        translations: { en: 'Museum', ru: 'Музей', ar: 'متحف', fr: 'Musée' },
      },
    ],
  },
  {
    id: 'let-yo',
    upper: 'Ё',
    lower: 'ё',
    cursiveUpper: 'Ё',
    cursiveLower: 'ё',
    audioSlug: 'letter-yo',
    phonetic: '[jo]',
    lessonId: 'u1-l5',
    strokePath: 'M 78 32 L 38 32 L 38 84 L 78 84 M 38 56 L 72 56 M 48 18 L 50 18 M 68 18 L 70 18',
    soundComparison: {
      en: 'Like "yo" in "yonder" — ALWAYS carries the stress in a word!',
      ru: 'Звук [йо] — буква Ё в русском языке ВСЕГДА ударная!',
      ar: 'تنطق «يو» (Yo) — وهي دائماً موضع النبر في الكلمة!',
      fr: 'Comme « yo » dans « yoga » — porte TOUJOURS l’accent tonique !',
    },
    examples: [
      {
        wordWithStress: 'Шофёр',
        cleanWord: 'Шофёр',
        audioSlug: 'shofyor',
        iconKey: 'driver',
        translations: { en: 'Driver / Chauffeur', ru: 'Шофёр', ar: 'سائق', fr: 'Chauffeur' },
      },
      {
        wordWithStress: 'Самолёт',
        cleanWord: 'Самолёт',
        audioSlug: 'samolyot',
        iconKey: 'plane',
        translations: { en: 'Airplane', ru: 'Самолёт', ar: 'طائرة', fr: 'Avion' },
      },
    ],
  },

  // LESSON 6: Ы Ь Ъ + Review
  {
    id: 'let-yery',
    upper: 'Ы',
    lower: 'ы',
    cursiveUpper: 'Ы',
    cursiveLower: 'ы',
    audioSlug: 'letter-yery',
    phonetic: '[ɨ]',
    lessonId: 'u1-l6',
    strokePath: 'M 30 22 L 30 84 C 66 84 66 50 30 52 M 86 22 L 86 84',
    soundComparison: {
      en: 'Deep central vowel: say "ee" while pulling the back of your tongue backward',
      ru: 'Глубокий гласный [ы], произносится с отодвинутым назад языком',
      ar: 'صوت بين الكسرة والضمة ينطق من وسط الفم مع سحب اللسان للخلف',
      fr: 'Voyelle centrale profonde : prononcez « i » en reculant le dos de la langue',
    },
    examples: [
      {
        wordWithStress: 'Мы́',
        cleanWord: 'Мы',
        audioSlug: 'my',
        iconKey: 'users',
        translations: { en: 'We', ru: 'Мы', ar: 'نحن', fr: 'Nous' },
      },
      {
        wordWithStress: 'Мосты́',
        cleanWord: 'Мосты',
        audioSlug: 'mosty',
        iconKey: 'bridge',
        translations: { en: 'Bridges', ru: 'Мосты', ar: 'جسور', fr: 'Ponts' },
      },
    ],
  },
  {
    id: 'let-soft',
    upper: 'Ь',
    lower: 'ь',
    cursiveUpper: 'Ь',
    cursiveLower: 'ь',
    audioSlug: 'letter-soft',
    phonetic: '[ʲ]',
    lessonId: 'u1-l6',
    strokePath: 'M 42 22 L 42 84 C 82 84 82 48 42 52',
    soundComparison: {
      en: 'Soft Sign (мя́гкий знак): silent on its own, makes the preceding consonant soft/palatalized',
      ru: 'Мя́гкий знак: собственного звука не имеет, смягчает предыдущий согласный',
      ar: 'علامة الترقيق: لا تنطق بمفردها، بل ترقّق الحرف الساكن الذي يسبقها',
      fr: 'Signe mou : muet seul, il mouille (palatalise) la consonne qui précède',
    },
    examples: [
      {
        wordWithStress: 'Ру́ль',
        cleanWord: 'Руль',
        audioSlug: 'rul',
        iconKey: 'wheel',
        translations: { en: 'Steering Wheel', ru: 'Руль', ar: 'عجلة القيادة', fr: 'Volant' },
      },
      {
        wordWithStress: 'Тетра́дь',
        cleanWord: 'Тетрадь',
        audioSlug: 'tetrad',
        iconKey: 'notebook',
        translations: { en: 'Notebook', ru: 'Тетрадь', ar: 'دفتر', fr: 'Cahier' },
      },
    ],
  },
  {
    id: 'let-hard',
    upper: 'Ъ',
    lower: 'ъ',
    cursiveUpper: 'Ъ',
    cursiveLower: 'ъ',
    audioSlug: 'letter-hard',
    phonetic: '[—]',
    lessonId: 'u1-l6',
    strokePath: 'M 24 22 L 46 22 L 46 84 C 84 84 84 48 46 52',
    soundComparison: {
      en: 'Hard Sign (твёрдый знак): silent pause separator before Е, Ё, Ю, Я (like in "sub-unit")',
      ru: 'Твёрдый знак: разделительный знак перед Е, Ё, Ю, Я, сохраняет твёрдость согласного',
      ar: 'علامة التفخيم الفاصلة: تفصل بين الحرف الساكن وحروف العلة مثل «مدخل المبنى»',
      fr: 'Signe dur : marque une micro-pause entre une consonne dure et Е, Ё, Ю, Я',
    },
    examples: [
      {
        wordWithStress: 'Въе́зд',
        cleanWord: 'Въезд',
        audioSlug: 'vyezd',
        iconKey: 'gate',
        translations: { en: 'Vehicle Entry', ru: 'Въезд', ar: 'مدخل سيارات', fr: 'Entrée véhicules' },
      },
      {
        wordWithStress: 'Подъе́зд',
        cleanWord: 'Подъезд',
        audioSlug: 'podyezd',
        iconKey: 'door',
        translations: { en: 'Building Entrance', ru: 'Подъезд', ar: 'مدخل البناية', fr: 'Hall d’immeuble' },
      },
    ],
  },
];

export const UNIT2_PHRASES: PhraseCardData[] = [
  {
    id: 'phr-privet',
    phraseWithStress: 'Приве́т',
    cleanPhrase: 'Привет',
    audioSlug: 'privet',
    iconKey: 'wave',
    translations: {
      en: 'Hi / Hello (informal)',
      ru: 'Привет (неформальное приветствие)',
      ar: 'مرحباً / أهلاً (غير رسمي بين الأصدقاء)',
      fr: 'Salut (informel, entre étudiants)',
    },
    usageNote: {
      en: 'Use with fellow MADI students, roommates, and friends.',
      ru: 'Используйте с однокурсниками и друзьями в кампусе.',
      ar: 'استخدمها مع زملائك الطلاب والأصدقاء في الحرم الجامعي.',
      fr: 'À utiliser avec vos camarades de promo et amis.',
    },
  },
  {
    id: 'phr-zdravstvuyte',
    phraseWithStress: 'Здра́вствуйте',
    cleanPhrase: 'Здравствуйте',
    audioSlug: 'zdravstvuyte',
    iconKey: 'handshake',
    translations: {
      en: 'Hello (formal / respectful)',
      ru: 'Здравствуйте (вежливое приветствие)',
      ar: 'السلام عليكم / مرحباً (رسمي للاحترام)',
      fr: 'Bonjour (formel / respectueux)',
    },
    usageNote: {
      en: 'Use with professors, dean’s office staff, and people you don’t know (first "в" is silent!).',
      ru: 'Для преподавателей и сотрудников деканата (первая «в» не произносится).',
      ar: 'تُستخدم مع الأساتذة والموظفين (حرف В الأول لا يُنطق!).',
      fr: 'Pour les professeurs et l’administration (le premier « в » est muet !).',
    },
  },
  {
    id: 'phr-poka',
    phraseWithStress: 'Пока́',
    cleanPhrase: 'Пока',
    audioSlug: 'poka',
    iconKey: 'wave',
    translations: {
      en: 'Bye! (informal)',
      ru: 'Пока! (дружеское прощание)',
      ar: 'إلى اللقاء / باي (غير رسمي)',
      fr: 'Salut / À plus ! (informel)',
    },
    usageNote: {
      en: 'Friendly farewell after classes with classmates.',
      ru: 'Неформальное прощание с друзьями после пар.',
      ar: 'تحية وداع ودية مع الأصدقاء بعد المحاضرات.',
      fr: 'Au revoir amical entre étudiants après les cours.',
    },
  },
  {
    id: 'phr-do-svidaniya',
    phraseWithStress: 'До свида́ния',
    cleanPhrase: 'До свидания',
    audioSlug: 'do-svidaniya',
    iconKey: 'door',
    translations: {
      en: 'Goodbye (formal & universal)',
      ru: 'До свидания (вежливое прощание)',
      ar: 'مع السلامة / إلى اللقاء (رسمي وعام)',
      fr: 'Au revoir (formel et universel)',
    },
    usageNote: {
      en: 'Polite goodbye suitable anywhere—from lecture halls to shops.',
      ru: 'Универсальное вежливое прощание в любой ситуации.',
      ar: 'وداع مهذب مناسب في كل مكان: القاعات الدراسية والمتاجر.',
      fr: 'Formule polie adaptée partout : amphithéâtres, commerces, bureaux.',
    },
  },
  {
    id: 'phr-spasibo',
    phraseWithStress: 'Спаси́бо',
    cleanPhrase: 'Спасибо',
    audioSlug: 'spasibo',
    iconKey: 'heart',
    translations: {
      en: 'Thank you',
      ru: 'Спасибо (благодарность)',
      ar: 'شكراً لك',
      fr: 'Merci',
    },
    usageNote: {
      en: 'Notice the unstressed final "о" sounds like a soft "a" [спаси́ба].',
      ru: 'Обратите внимание: безударная «о» в конце звучит как [а].',
      ar: 'لاحظ أن حرف О الأخير غير المنبور ينطق قريباً من الفتحة (سباسيبا).',
      fr: 'Le « о » final non accentué se prononce comme un « a » doux.',
    },
  },
  {
    id: 'phr-pozhaluysta',
    phraseWithStress: 'Пожа́луйста',
    cleanPhrase: 'Пожалуйста',
    audioSlug: 'pozhaluysta',
    iconKey: 'gift',
    translations: {
      en: 'Please / You’re welcome',
      ru: 'Пожалуйста (просьба или ответ на спасибо)',
      ar: 'من فضلك / عفواً (رداً على شكراً)',
      fr: 'S’il vous plaît / Je vous en prie',
    },
    usageNote: {
      en: 'Works both when asking ("Один билет, пожалуйста") and replying to "Спасибо".',
      ru: 'Используется и при вежливой просьбе, и в ответ на «Спаси́бо».',
      ar: 'تُستخدم عند الطلب المهذب وكذلك للرد على «شكراً».',
      fr: 'S’utilise à la fois pour demander (« s’il vous plaît ») et répondre à « merci ».',
    },
  },
  {
    id: 'phr-menya-zovut',
    phraseWithStress: 'Меня́ зову́т...',
    cleanPhrase: 'Меня зовут',
    audioSlug: 'menya-zovut',
    iconKey: 'id_card',
    translations: {
      en: 'My name is...',
      ru: 'Меня зовут... (знакомство)',
      ar: 'اسمي هو...',
      fr: 'Je m’appelle...',
    },
    usageNote: {
      en: 'Literally "They call me...". Follow it directly with your name!',
      ru: 'Добавьте своё имя после фразы: «Меня́ зову́т Ами́р».',
      ar: 'ضع اسمك مباشرة بعد العبارة للتعريف بنفسك.',
      fr: 'Suivez simplement de votre prénom : « Меня́ зову́т Клэр ».',
    },
  },
  {
    id: 'phr-kak-dela',
    phraseWithStress: 'Как дела́?',
    cleanPhrase: 'Как дела?',
    audioSlug: 'kak-dela',
    iconKey: 'chat',
    translations: {
      en: 'How are you? / How are things?',
      ru: 'Как дела? (вопрос о делах)',
      ar: 'كيف حالك؟ / كيف الأمور؟',
      fr: 'Comment ça va ?',
    },
    usageNote: {
      en: 'Reply with "Хорошо́, спаси́бо!" (Good, thanks!).',
      ru: 'Отличный ответ: «Хорошо́, спаси́бо!»',
      ar: 'يمكنك الرد بـ «Хорошо́, спаси́бо!» (بخير، شكراً!).',
      fr: 'Répondez avec « Хорошо́, спаси́бо ! » (Bien, merci !).',
    },
  },
];

function buildLetterLessonSteps(lessonId: string, letterIds: string[], extraExercises: Omit<LessonStep, 'id' | 'lessonId' | 'orderIndex'>[]): LessonStep[] {
  const letters = letterIds.map((id) => CYRILLIC_LETTERS.find((l) => l.id === id)!);
  const steps: LessonStep[] = [];
  let idx = 1;

  for (const letter of letters) {
    steps.push({
      id: `${lessonId}-step-${idx}`,
      lessonId,
      orderIndex: idx,
      type: 'letter_card',
      content: {
        letter,
        correctAnswer: letter.upper,
      },
    });
    idx++;
  }

  for (const ex of extraExercises) {
    steps.push({
      id: `${lessonId}-step-${idx}`,
      lessonId,
      orderIndex: idx,
      type: ex.type,
      content: ex.content,
    });
    idx++;
  }

  return steps;
}

export const CURRICULUM_UNITS: CurriculumUnit[] = [
  {
    id: 'unit-1',
    orderIndex: 1,
    slug: 'alphabet-garage',
    landmarkKey: 'garage',
    levelCode: 'A1',
    isLockedByDefault: false,
    title: {
      en: 'Unit 1: Alphabet Garage',
      ru: 'Модуль 1: Алфавитный гараж',
      ar: 'الوحدة 1: مرآب الأبجدية',
      fr: 'Unité 1 : Garage de l’Alphabet',
    },
    subtitle: {
      en: 'All 33 Cyrillic letters across 6 hands-on stops',
      ru: 'Все 33 буквы кириллицы за 6 практических остановок',
      ar: 'جميع الحروف الكيريلية الـ 33 عبر 6 محطات عملية',
      fr: 'Les 33 lettres cyrilliques en 6 étapes pratiques',
    },
    lessons: [
      {
        id: 'u1-l1',
        unitId: 'unit-1',
        orderIndex: 1,
        slug: 'familiar-letters',
        estimatedMinutes: 5,
        title: {
          en: 'Stop 1: Familiar Letters (А О К М Т Е)',
          ru: 'Остановка 1: Знакомые буквы (А О К М Т Е)',
          ar: 'المحطة 1: الحروف المألوفة (А О К М Т Е)',
          fr: 'Étape 1 : Lettres familières (А О К М Т Е)',
        },
        description: {
          en: 'Start with 6 Russian letters that look and sound like familiar friends.',
          ru: 'Начните с 6 букв, которые легко узнать с первого взгляда.',
          ar: 'ابدأ بستة حروف روسية سهلة التميز والنطق.',
          fr: 'Commencez par 6 lettres russes faciles à reconnaître.',
        },
        steps: buildLetterLessonSteps('u1-l1', ['let-a', 'let-o', 'let-k', 'let-m', 'let-t', 'let-ye'], [
          {
            type: 'letter_sound',
            content: {
              targetLetter: 'М',
              audioText: 'М — Метро',
              audioSlug: 'letter-m',
              phoneticHint: '[m]',
              options: ['М', 'К', 'Т', 'А'],
              correctAnswer: 'М',
            },
          },
          {
            type: 'picture_word',
            content: {
              iconKey: 'cat',
              audioText: 'Кот',
              audioSlug: 'kot',
              options: ['Ко́т', 'Та́м', 'Те́ма', 'Окно́'],
              correctAnswer: 'Ко́т',
              translation: { en: 'Cat', ru: 'Кот', ar: 'قط', fr: 'Chat' },
            },
          },
          {
            type: 'word_builder',
            content: {
              targetWordWithStress: 'Та́м',
              targetCleanWord: 'ТАМ',
              audioSlug: 'tam',
              tiles: ['М', 'Т', 'А', 'К', 'О'],
              correctAnswer: 'ТАМ',
              translation: { en: 'There', ru: 'Там', ar: 'هناك', fr: 'Là-bas' },
            },
          },
          {
            type: 'word_builder',
            content: {
              targetWordWithStress: 'Те́ма',
              targetCleanWord: 'ТЕМА',
              audioSlug: 'tema',
              tiles: ['Е', 'Т', 'А', 'М', 'К'],
              correctAnswer: 'ТЕМА',
              translation: { en: 'Topic / Theme', ru: 'Тема', ar: 'موضوع', fr: 'Thème' },
            },
          },
        ]),
      },
      {
        id: 'u1-l2',
        unitId: 'unit-1',
        orderIndex: 2,
        slug: 'look-alikes',
        estimatedMinutes: 5,
        title: {
          en: 'Stop 2: Look-Alikes (С Н В Р Х У)',
          ru: 'Остановка 2: Буквы-двойники (С Н В Р Х У)',
          ar: 'المحطة 2: الحروف المتشابهة (С Н В Р Х У)',
          fr: 'Étape 2 : Faux-amis visuels (С Н В Р Х У)',
        },
        description: {
          en: 'Master the 6 letters that look like Latin letters but carry Russian sounds.',
          ru: 'Освойте 6 букв, которые выглядят знакомо, но звучат по-русски.',
          ar: 'أتقن الحروف الستة التي تشبه الحروف اللاتينية ولكن بأصوات روسية.',
          fr: 'Maîtrisez les 6 lettres aux sons russes distincts.',
        },
        steps: buildLetterLessonSteps('u1-l2', ['let-s', 'let-n', 'let-v', 'let-r', 'let-kh', 'let-u'], [
          {
            type: 'letter_sound',
            content: {
              targetLetter: 'Р',
              audioText: 'Р — Руль',
              audioSlug: 'letter-r',
              phoneticHint: '[r]',
              options: ['Р', 'В', 'Н', 'С'],
              correctAnswer: 'Р',
            },
          },
          {
            type: 'picture_word',
            content: {
              iconKey: 'metro',
              audioText: 'Метро',
              audioSlug: 'metro',
              options: ['Метро́', 'У́тро', 'Вода́', 'Окно́'],
              correctAnswer: 'Метро́',
              translation: { en: 'Metro', ru: 'Метро', ar: 'مترو الأنفاق', fr: 'Métro' },
            },
          },
          {
            type: 'word_builder',
            content: {
              targetWordWithStress: 'У́тро',
              targetCleanWord: 'УТРО',
              audioSlug: 'utro',
              tiles: ['Р', 'У', 'О', 'Т', 'С'],
              correctAnswer: 'УТРО',
              translation: { en: 'Morning', ru: 'Утро', ar: 'صباح', fr: 'Matin' },
            },
          },
          {
            type: 'word_builder',
            content: {
              targetWordWithStress: 'Мо́ст',
              targetCleanWord: 'МОСТ',
              audioSlug: 'most',
              tiles: ['С', 'М', 'Т', 'О', 'Н'],
              correctAnswer: 'МОСТ',
              translation: { en: 'Bridge', ru: 'Мост', ar: 'جسر', fr: 'Pont' },
            },
          },
        ]),
      },
      {
        id: 'u1-l3',
        unitId: 'unit-1',
        orderIndex: 3,
        slug: 'core-consonants',
        estimatedMinutes: 6,
        title: {
          en: 'Stop 3: Pillars & Signs (Д Л П И З Б)',
          ru: 'Остановка 3: Основа чтения (Д Л П И З Б)',
          ar: 'المحطة 3: ركائز القراءة (Д Л П И З Б)',
          fr: 'Étape 3 : Piliers cyrilliques (Д Л П И З Б)',
        },
        description: {
          en: 'Unlock the classic Cyrillic shapes found on every Moscow street sign.',
          ru: 'Откройте ключевые буквы, которые встречаются на каждом дорожном указателе.',
          ar: 'افتح الحروف الكيريلية الأساسية الموجودة في كل لافتة طريق بموسكو.',
          fr: 'Débloquez les lettres présentes sur chaque panneau de Moscou.',
        },
        steps: buildLetterLessonSteps('u1-l3', ['let-d', 'let-l', 'let-p', 'let-i', 'let-z', 'let-b'], [
          {
            type: 'letter_sound',
            content: {
              targetLetter: 'Д',
              audioText: 'Д — Дорога',
              audioSlug: 'letter-d',
              phoneticHint: '[d]',
              options: ['Д', 'Л', 'П', 'Б'],
              correctAnswer: 'Д',
            },
          },
          {
            type: 'picture_word',
            content: {
              iconKey: 'tree',
              audioText: 'Парк',
              audioSlug: 'park',
              options: ['Па́рк', 'До́м', 'Зна́к', 'Биле́т'],
              correctAnswer: 'Па́рк',
              translation: { en: 'Park', ru: 'Парк', ar: 'حديقة عامة', fr: 'Parc' },
            },
          },
          {
            type: 'word_builder',
            content: {
              targetWordWithStress: 'До́м',
              targetCleanWord: 'ДОМ',
              audioSlug: 'dom',
              tiles: ['М', 'Д', 'О', 'Л', 'П'],
              correctAnswer: 'ДОМ',
              translation: { en: 'House / Building', ru: 'Дом', ar: 'منزل / مبنى', fr: 'Maison / Immeuble' },
            },
          },
          {
            type: 'word_builder',
            content: {
              targetWordWithStress: 'Па́рк',
              targetCleanWord: 'ПАРК',
              audioSlug: 'park',
              tiles: ['К', 'А', 'П', 'Р', 'З'],
              correctAnswer: 'ПАРК',
              translation: { en: 'Park', ru: 'Парк', ar: 'حديقة عامة', fr: 'Parc' },
            },
          },
        ]),
      },
      {
        id: 'u1-l4',
        unitId: 'unit-1',
        orderIndex: 4,
        slug: 'hushing-gears',
        estimatedMinutes: 6,
        title: {
          en: 'Stop 4: Hushing Gears (Г Ж Ш Щ Ч Ц)',
          ru: 'Остановка 4: Шипящие шестерни (Г Ж Ш Щ Ч Ц)',
          ar: 'المحطة 4: الأصوات الصفيرية (Г Ж Ш Щ Ч Ц)',
          fr: 'Étape 4 : Les chuintantes (Г Ж Ш Щ Ч Ц)',
        },
        description: {
          en: 'Learn Г and the 5 expressive Russian hushing and affricate consonants.',
          ru: 'Изучите букву Г и 5 выразительных шипящих и свистящих согласных.',
          ar: 'تعلّم حرف Г والخمسة حروف الصوتية الروسية المميزة.',
          fr: 'Découvrez Г et les 5 consonnes chuintantes russes.',
        },
        steps: buildLetterLessonSteps('u1-l4', ['let-g', 'let-zh', 'let-sh', 'let-shch', 'let-ch', 'let-ts'], [
          {
            type: 'letter_sound',
            content: {
              targetLetter: 'Ж',
              audioText: 'Ж — Гараж',
              audioSlug: 'letter-zh',
              phoneticHint: '[ʐ]',
              options: ['Ж', 'Ш', 'Щ', 'Ч'],
              correctAnswer: 'Ж',
            },
          },
          {
            type: 'picture_word',
            content: {
              iconKey: 'garage',
              audioText: 'Гараж',
              audioSlug: 'garazh',
              options: ['Гара́ж', 'Го́род', 'Ши́на', 'Часы́'],
              correctAnswer: 'Гара́ж',
              translation: { en: 'Garage', ru: 'Гараж', ar: 'مرآب', fr: 'Garage' },
            },
          },
          {
            type: 'word_builder',
            content: {
              targetWordWithStress: 'Ши́на',
              targetCleanWord: 'ШИНА',
              audioSlug: 'shina',
              tiles: ['Н', 'Ш', 'А', 'И', 'Ж'],
              correctAnswer: 'ШИНА',
              translation: { en: 'Tire', ru: 'Шина', ar: 'إطار سيارة', fr: 'Pneu' },
            },
          },
          {
            type: 'word_builder',
            content: {
              targetWordWithStress: 'Гара́ж',
              targetCleanWord: 'ГАРАЖ',
              audioSlug: 'garazh',
              tiles: ['Ж', 'А', 'Г', 'Р', 'А'],
              correctAnswer: 'ГАРАЖ',
              translation: { en: 'Garage', ru: 'Гараж', ar: 'مرآب', fr: 'Garage' },
            },
          },
        ]),
      },
      {
        id: 'u1-l5',
        unitId: 'unit-1',
        orderIndex: 5,
        slug: 'vowels-and-glides',
        estimatedMinutes: 6,
        title: {
          en: 'Stop 5: Soft Vowels & Glides (Ф Э Ю Я Й Ё)',
          ru: 'Остановка 5: Гласные и Й (Ф Э Ю Я Й Ё)',
          ar: 'المحطة 5: حروف المد واللين (Ф Э Ю Я Й Ё)',
          fr: 'Étape 5 : Voyelles iodisées (Ф Э Ю Я Й Ё)',
        },
        description: {
          en: 'Add Ф, Э, Й and the musical Russian vowels Ю, Я, and stressed Ё.',
          ru: 'Добавьте буквы Ф, Э, Й и певучие гласные Ю, Я и ударную Ё.',
          ar: 'أضف الحروف Ф وЭ وЙ وحروف العلة الروسية Ю وЯ وЁ.',
          fr: 'Ajoutez Ф, Э, Й ainsi que les voyelles Ю, Я et Ё.',
        },
        steps: buildLetterLessonSteps('u1-l5', ['let-f', 'let-e', 'let-yu', 'let-ya', 'let-y', 'let-yo'], [
          {
            type: 'letter_sound',
            content: {
              targetLetter: 'Я',
              audioText: 'Я — Язык',
              audioSlug: 'letter-ya',
              phoneticHint: '[ja]',
              options: ['Я', 'Ю', 'Э', 'Ё'],
              correctAnswer: 'Я',
            },
          },
          {
            type: 'picture_word',
            content: {
              iconKey: 'tea',
              audioText: 'Чай',
              audioSlug: 'chay',
              options: ['Ча́й', 'Ю́г', 'Фа́ра', 'Меню́'],
              correctAnswer: 'Ча́й',
              translation: { en: 'Tea', ru: 'Чай', ar: 'شاي', fr: 'Thé' },
            },
          },
          {
            type: 'word_builder',
            content: {
              targetWordWithStress: 'Ча́й',
              targetCleanWord: 'ЧАЙ',
              audioSlug: 'chay',
              tiles: ['Й', 'Ч', 'А', 'Я', 'Ю'],
              correctAnswer: 'ЧАЙ',
              translation: { en: 'Tea', ru: 'Чай', ar: 'شاي', fr: 'Thé' },
            },
          },
          {
            type: 'word_builder',
            content: {
              targetWordWithStress: 'Фа́ра',
              targetCleanWord: 'ФАРА',
              audioSlug: 'fara',
              tiles: ['А', 'Ф', 'Р', 'А', 'Э'],
              correctAnswer: 'ФАРА',
              translation: { en: 'Headlight', ru: 'Фара', ar: 'مصباح السيارة', fr: 'Phare' },
            },
          },
        ]),
      },
      {
        id: 'u1-l6',
        unitId: 'unit-1',
        orderIndex: 6,
        slug: 'signs-and-review',
        estimatedMinutes: 6,
        title: {
          en: 'Stop 6: Ы, Ь, Ъ & Full Garage Review',
          ru: 'Остановка 6: Ы, Ь, Ъ и Итоговый заезд',
          ar: 'المحطة 6: الحروف Ы وЬ وЪ ومراجعة شاملة',
          fr: 'Étape 6 : Ы, Ь, Ъ & Révision complète',
        },
        description: {
          en: 'Complete all 33 letters with Ы, Soft Sign (Ь), Hard Sign (Ъ), and a full alphabet check.',
          ru: 'Завершите все 33 буквы: Ы, мягкий и твёрдый знаки и контрольная проверка.',
          ar: 'أكمل جميع الحروف الـ 33 مع Ы وعلامتي الترقيق والتفخيم ومراجعة شاملة.',
          fr: 'Complétez les 33 lettres avec Ы, le signe mou (Ь) et le signe dur (Ъ).',
        },
        steps: buildLetterLessonSteps('u1-l6', ['let-yery', 'let-soft', 'let-hard'], [
          {
            type: 'letter_sound',
            content: {
              targetLetter: 'Ы',
              audioText: 'Ы — Мы',
              audioSlug: 'letter-yery',
              phoneticHint: '[ɨ]',
              options: ['Ы', 'И', 'Ь', 'Ъ'],
              correctAnswer: 'Ы',
            },
          },
          {
            type: 'letter_sound',
            content: {
              targetLetter: 'Щ',
              audioText: 'Щ — Площадь',
              audioSlug: 'letter-shch',
              phoneticHint: '[ɕː]',
              options: ['Щ', 'Ш', 'Ц', 'Ч'],
              correctAnswer: 'Щ',
            },
          },
          {
            type: 'picture_word',
            content: {
              iconKey: 'wheel',
              audioText: 'Руль',
              audioSlug: 'rul',
              options: ['Ру́ль', 'Мы́', 'Въе́зд', 'Мосты́'],
              correctAnswer: 'Ру́ль',
              translation: { en: 'Steering Wheel', ru: 'Руль', ar: 'عجلة القيادة', fr: 'Volant' },
            },
          },
          {
            type: 'word_builder',
            content: {
              targetWordWithStress: 'Мы́',
              targetCleanWord: 'МЫ',
              audioSlug: 'my',
              tiles: ['Ы', 'М', 'Ь', 'И'],
              correctAnswer: 'МЫ',
              translation: { en: 'We', ru: 'Мы', ar: 'نحن', fr: 'Nous' },
            },
          },
          {
            type: 'word_builder',
            content: {
              targetWordWithStress: 'Ру́ль',
              targetCleanWord: 'РУЛЬ',
              audioSlug: 'rul',
              tiles: ['Ь', 'Л', 'Р', 'У', 'Ъ'],
              correctAnswer: 'РУЛЬ',
              translation: { en: 'Steering Wheel', ru: 'Руль', ar: 'عجلة القيادة', fr: 'Volant' },
            },
          },
          {
            type: 'word_builder',
            content: {
              targetWordWithStress: 'Въе́зд',
              targetCleanWord: 'ВЪЕЗД',
              audioSlug: 'vyezd',
              tiles: ['Д', 'Е', 'В', 'Ъ', 'З', 'Ь'],
              correctAnswer: 'ВЪЕЗД',
              translation: { en: 'Vehicle Entry', ru: 'Въезд', ar: 'مدخل سيارات', fr: 'Entrée véhicules' },
            },
          },
        ]),
      },
    ],
  },
  {
    id: 'unit-2',
    orderIndex: 2,
    slug: 'red-square-greetings',
    landmarkKey: 'red_square',
    levelCode: 'A1',
    isLockedByDefault: false,
    title: {
      en: 'Unit 2: Greetings at Red Square',
      ru: 'Модуль 2: Приветствия на Красной площади',
      ar: 'الوحدة 2: التحيات في الساحة الحمراء',
      fr: 'Unité 2 : Salutations sur la Place Rouge',
    },
    subtitle: {
      en: 'Essential stressed phrases for meeting students and professors',
      ru: 'Главные фразы с ударениями для знакомства и вежливого общения',
      ar: 'العبارات الأساسية مع علامات النبر للتحية والتعارف',
      fr: 'Expressions essentielles accentuées pour saluer et se présenter',
    },
    lessons: [
      {
        id: 'u2-l1',
        unitId: 'unit-2',
        orderIndex: 7,
        slug: 'hello-and-goodbye',
        estimatedMinutes: 5,
        title: {
          en: 'Stop 7: Hello & Goodbye',
          ru: 'Остановка 7: Привет и До свидания',
          ar: 'المحطة 7: مرحباً وإلى اللقاء',
          fr: 'Étape 7 : Bonjour et Au revoir',
        },
        description: {
          en: 'Learn Приве́т, Здра́вствуйте, Пока́, and До свида́ния.',
          ru: 'Освойте фразы: Приве́т, Здра́вствуйте, Пока́ и До свида́ния.',
          ar: 'تعلّم عبارات: Приве́т وЗдра́вствуйте وПока́ وДо свида́ния.',
          fr: 'Apprenez Приве́т, Здра́вствуйте, Пока́ et До свида́ния.',
        },
        steps: [
          {
            id: 'u2-l1-step-1',
            lessonId: 'u2-l1',
            orderIndex: 1,
            type: 'phrase_card',
            content: {
              phrase: UNIT2_PHRASES[0],
              correctAnswer: 'Приве́т',
            },
          },
          {
            id: 'u2-l1-step-2',
            lessonId: 'u2-l1',
            orderIndex: 2,
            type: 'phrase_card',
            content: {
              phrase: UNIT2_PHRASES[1],
              correctAnswer: 'Здра́вствуйте',
            },
          },
          {
            id: 'u2-l1-step-3',
            lessonId: 'u2-l1',
            orderIndex: 3,
            type: 'phrase_card',
            content: {
              phrase: UNIT2_PHRASES[2],
              correctAnswer: 'Пока́',
            },
          },
          {
            id: 'u2-l1-step-4',
            lessonId: 'u2-l1',
            orderIndex: 4,
            type: 'phrase_card',
            content: {
              phrase: UNIT2_PHRASES[3],
              correctAnswer: 'До свида́ния',
            },
          },
          {
            id: 'u2-l1-step-5',
            lessonId: 'u2-l1',
            orderIndex: 5,
            type: 'picture_word',
            content: {
              iconKey: 'wave',
              audioText: 'Привет',
              audioSlug: 'privet',
              options: ['Приве́т', 'Пока́', 'Спаси́бо', 'До свида́ния'],
              correctAnswer: 'Приве́т',
              translation: {
                en: 'Hi / Hello (informal)',
                ru: 'Привет (неформальное)',
                ar: 'مرحباً (غير رسمي)',
                fr: 'Salut (informel)',
              },
            },
          },
          {
            id: 'u2-l1-step-6',
            lessonId: 'u2-l1',
            orderIndex: 6,
            type: 'picture_word',
            content: {
              iconKey: 'handshake',
              audioText: 'Здравствуйте',
              audioSlug: 'zdravstvuyte',
              options: ['Здра́вствуйте', 'Приве́т', 'Пока́', 'Как дела́?'],
              correctAnswer: 'Здра́вствуйте',
              translation: {
                en: 'Hello (formal / respectful)',
                ru: 'Здравствуйте (официальное)',
                ar: 'مرحباً (رسمي للاحترام)',
                fr: 'Bonjour (formel)',
              },
            },
          },
          {
            id: 'u2-l1-step-7',
            lessonId: 'u2-l1',
            orderIndex: 7,
            type: 'word_builder',
            content: {
              targetWordWithStress: 'Пока́',
              targetCleanWord: 'ПОКА',
              audioSlug: 'poka',
              tiles: ['К', 'П', 'А', 'О', 'В'],
              correctAnswer: 'ПОКА',
              translation: {
                en: 'Bye! (informal)',
                ru: 'Пока!',
                ar: 'إلى اللقاء (غير رسمي)',
                fr: 'Salut / À plus !',
              },
            },
          },
          {
            id: 'u2-l1-step-8',
            lessonId: 'u2-l1',
            orderIndex: 8,
            type: 'word_builder',
            content: {
              targetWordWithStress: 'Приве́т',
              targetCleanWord: 'ПРИВЕТ',
              audioSlug: 'privet',
              tiles: ['В', 'П', 'Т', 'Р', 'И', 'Е'],
              correctAnswer: 'ПРИВЕТ',
              translation: {
                en: 'Hi / Hello',
                ru: 'Привет',
                ar: 'مرحباً',
                fr: 'Salut',
              },
            },
          },
          {
            id: 'u2-l1-step-9',
            lessonId: 'u2-l1',
            orderIndex: 9,
            type: 'stress_placement',
            content: {
              targetWordWithStress: 'Приве́т',
              wordWithoutStress: 'Привет',
              stressedVowelIndex: 1,
              audioText: 'Привет',
              audioSlug: 'privet',
              correctAnswer: 'Приве́т',
              translation: {
                en: 'Hi / Hello (stress on the 2nd vowel Е́)',
                ru: 'Привет (ударение на Е́)',
                ar: 'مرحباً (النبر على حرف العلة الثاني Е́)',
                fr: 'Salut (accent sur la 2e voyelle Е́)',
              },
            },
          },
          {
            id: 'u2-l1-step-10',
            lessonId: 'u2-l1',
            orderIndex: 10,
            type: 'sentence_builder',
            content: {
              direction: 'to_ru',
              audioText: 'Привет, до свидания',
              audioSlug: 'do-svidaniya',
              promptText: {
                en: 'Hello, goodbye',
                ru: 'Привет, до свидания',
                ar: 'مرحباً، إلى اللقاء',
                fr: 'Salut, au revoir',
              },
              tiles: ['свида́ния', 'Приве́т', 'до', 'пока́'],
              acceptedOrders: [['Приве́т', 'до', 'свида́ния']],
              correctAnswer: 'Приве́т до свида́ния',
              translation: {
                en: 'Hello, goodbye',
                ru: 'Привет, до свидания',
                ar: 'مرحباً، إلى اللقاء',
                fr: 'Salut, au revoir',
              },
            },
          },
        ],
      },
      {
        id: 'u2-l2',
        unitId: 'unit-2',
        orderIndex: 8,
        slug: 'politeness-and-names',
        estimatedMinutes: 6,
        title: {
          en: 'Stop 8: Thanks & Introductions',
          ru: 'Остановка 8: Спасибо и Знакомство',
          ar: 'المحطة 8: الشكر والتعارف',
          fr: 'Étape 8 : Remerciements & Présentations',
        },
        description: {
          en: 'Master Спаси́бо, Пожа́луйста, Меня́ зову́т..., and Как дела́?.',
          ru: 'Фразы: Спаси́бо, Пожа́луйста, Меня́ зову́т... и Как дела́?.',
          ar: 'أتقن: Спаси́бо وПожа́луйста وМеня́ зову́т... وКак дела́?.',
          fr: 'Maîtrisez Спаси́бо, Пожа́луйста, Меня́ зову́т... et Как дела́?.',
        },
        steps: [
          {
            id: 'u2-l2-step-1',
            lessonId: 'u2-l2',
            orderIndex: 1,
            type: 'phrase_card',
            content: {
              phrase: UNIT2_PHRASES[4],
              correctAnswer: 'Спаси́бо',
            },
          },
          {
            id: 'u2-l2-step-2',
            lessonId: 'u2-l2',
            orderIndex: 2,
            type: 'phrase_card',
            content: {
              phrase: UNIT2_PHRASES[5],
              correctAnswer: 'Пожа́луйста',
            },
          },
          {
            id: 'u2-l2-step-3',
            lessonId: 'u2-l2',
            orderIndex: 3,
            type: 'phrase_card',
            content: {
              phrase: UNIT2_PHRASES[6],
              correctAnswer: 'Меня́ зову́т...',
            },
          },
          {
            id: 'u2-l2-step-4',
            lessonId: 'u2-l2',
            orderIndex: 4,
            type: 'phrase_card',
            content: {
              phrase: UNIT2_PHRASES[7],
              correctAnswer: 'Как дела́?',
            },
          },
          {
            id: 'u2-l2-step-5',
            lessonId: 'u2-l2',
            orderIndex: 5,
            type: 'picture_word',
            content: {
              iconKey: 'heart',
              audioText: 'Спасибо',
              audioSlug: 'spasibo',
              options: ['Спаси́бо', 'Пожа́луйста', 'Приве́т', 'Пока́'],
              correctAnswer: 'Спаси́бо',
              translation: {
                en: 'Thank you',
                ru: 'Спасибо',
                ar: 'شكراً لك',
                fr: 'Merci',
              },
            },
          },
          {
            id: 'u2-l2-step-6',
            lessonId: 'u2-l2',
            orderIndex: 6,
            type: 'picture_word',
            content: {
              iconKey: 'id_card',
              audioText: 'Меня зовут',
              audioSlug: 'menya-zovut',
              options: ['Меня́ зову́т...', 'Как дела́?', 'До свида́ния', 'Здра́вствуйте'],
              correctAnswer: 'Меня́ зову́т...',
              translation: {
                en: 'My name is...',
                ru: 'Меня зовут...',
                ar: 'اسمي هو...',
                fr: 'Je m’appelle...',
              },
            },
          },
          {
            id: 'u2-l2-step-7',
            lessonId: 'u2-l2',
            orderIndex: 7,
            type: 'word_builder',
            content: {
              targetWordWithStress: 'Спаси́бо',
              targetCleanWord: 'СПАСИБО',
              audioSlug: 'spasibo',
              tiles: ['С', 'П', 'А', 'С', 'И', 'Б', 'О'],
              correctAnswer: 'СПАСИБО',
              translation: {
                en: 'Thank you',
                ru: 'Спасибо',
                ar: 'شكراً لك',
                fr: 'Merci',
              },
            },
          },
          {
            id: 'u2-l2-step-8',
            lessonId: 'u2-l2',
            orderIndex: 8,
            type: 'word_builder',
            content: {
              targetWordWithStress: 'Как дела́?',
              targetCleanWord: 'КАКДЕЛА',
              audioSlug: 'kak-dela',
              tiles: ['К', 'А', 'К', 'Д', 'Е', 'Л', 'А'],
              correctAnswer: 'КАКДЕЛА',
              translation: {
                en: 'How are you?',
                ru: 'Как дела?',
                ar: 'كيف حالك؟',
                fr: 'Comment ça va ?',
              },
            },
          },
          {
            id: 'u2-l2-step-9',
            lessonId: 'u2-l2',
            orderIndex: 9,
            type: 'stress_placement',
            content: {
              targetWordWithStress: 'Спаси́бо',
              wordWithoutStress: 'Спасибо',
              stressedVowelIndex: 1,
              audioText: 'Спасибо',
              audioSlug: 'spasibo',
              correctAnswer: 'Спаси́бо',
              translation: {
                en: 'Thank you (stress on И́)',
                ru: 'Спасибо (ударение на И́)',
                ar: 'شكراً لك (النبر على حرف И́)',
                fr: 'Merci (accent sur И́)',
              },
            },
          },
          {
            id: 'u2-l2-step-10',
            lessonId: 'u2-l2',
            orderIndex: 10,
            type: 'sentence_builder',
            content: {
              direction: 'to_ru',
              audioText: 'Спасибо, дела хорошо',
              audioSlug: 'spasibo',
              promptText: {
                en: 'Thank you, things are good',
                ru: 'Спасибо, дела хорошо',
                ar: 'شكراً، الأمور بخير',
                fr: 'Merci, ça va bien',
              },
              tiles: ['хорошо́', 'Спаси́бо', 'дела́', 'пока́'],
              acceptedOrders: [['Спаси́бо', 'дела́', 'хорошо́']],
              correctAnswer: 'Спаси́бо дела́ хорошо́',
              translation: {
                en: 'Thank you, things are good',
                ru: 'Спасибо, дела хорошо',
                ar: 'شكراً، الأمور بخير',
                fr: 'Merci, ça va bien',
              },
            },
          },
        ],
      },
      ...UNIT2_EXTRA_LESSONS,
    ],
  },
  ...PHASE2_EXTRA_UNITS,
];

export function getAllLessons(): CurriculumLesson[] {
  return CURRICULUM_UNITS.flatMap((u) => u.lessons);
}

export function getLessonById(lessonId: string): CurriculumLesson | undefined {
  return getAllLessons().find((l) => l.id === lessonId);
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 4 Seed & Structured Content Data:
 * 1. 40 Original Badges (loaded from JSON with unlock rules & SVG keys)
 * 2. 100% Free Cosmetics (Vehicle skins, Misha outfits, Moscow season map themes)
 * 3. Weekly Leagues (~30 learners, original road-themed tiers, Faculty board, Class challenges, Friends)
 * 4. Adaptive Placement Test (25 items across A1–C1) & CEFR Level Exams (A1–C2 + B1+ Teacher Rubric)
 * 5. Certificate Descriptors (A1–C2 in ru/en/ar/fr, level colors, disclaimer)
 * 6. Legal & Policy Drafts in 4 languages (Privacy, Terms, Copyright, Voice Consent, Certificate Disclaimer)
 */

import rawBadges from './phase4Badges.json';
import { SupportedLang } from './curriculum';

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type BadgeCategory =
  | 'consistency'
  | 'accuracy'
  | 'speaking'
  | 'typing_speed'
  | 'dictionary_explorer'
  | 'garage_hero'
  | 'grammar_signs'
  | 'helpers';

export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface BadgeUnlockRule {
  metric:
    | 'streakDays'
    | 'perfectLessonsCount'
    | 'averageAccuracy'
    | 'bestExamScore'
    | 'speakingClipsCompleted'
    | 'threeStarSpeakingClips'
    | 'roleplaysCompleted'
    | 'bestSpeakingScore'
    | 'typingTextsCompleted'
    | 'bestTypingCpm'
    | 'wordsLearnedCount'
    | 'garageReviewsCompleted'
    | 'highestLeitnerBox'
    | 'showroomCount'
    | 'casesMasteredCount'
    | 'completedLessonsCount'
    | 'friendsCount'
    | 'nudgesSentCount'
    | 'weeklyFuel'
    | 'questsCompletedCount'
    | 'certificatesEarnedCount';
  operator: '>=' | '==';
  threshold: number;
}

export interface Phase4Badge {
  id: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  svgKey: string;
  accentColor: string;
  unlockRule: BadgeUnlockRule;
  rewardCosmeticId?: string;
  title: Record<SupportedLang, string>;
  description: Record<SupportedLang, string>;
}

export const PHASE4_BADGES: Phase4Badge[] = rawBadges as Phase4Badge[];

// ============================================================================
// 2. COSMETICS (100% FREE — UNLOCKED BY LEARNING, NEVER PAID)
// ============================================================================

export type CosmeticType = 'car_skin' | 'mascot_outfit' | 'map_theme';

export interface CosmeticItem {
  id: string;
  type: CosmeticType;
  unlockRequirementText: Record<SupportedLang, string>;
  unlockedByDefault: boolean;
  previewColorPrimary: string;
  previewColorSecondary: string;
  title: Record<SupportedLang, string>;
  description: Record<SupportedLang, string>;
}

export const PHASE4_COSMETICS: CosmeticItem[] = [
  // Vehicle Skins
  {
    id: 'car-classic-orange',
    type: 'car_skin',
    unlockedByDefault: true,
    previewColorPrimary: '#FF8A1F',
    previewColorSecondary: '#0F1E3A',
    unlockRequirementText: {
      ru: 'Доступно со старта',
      en: 'Unlocked at Start',
      ar: 'متاح منذ البداية',
      fr: 'Débloqué au départ',
    },
    title: {
      ru: 'Классический оранжевый купе МАДИ',
      en: 'Classic MADI Orange Coupe',
      ar: 'سيارة مادي البرتقالية الكلاسيكية',
      fr: 'Coupé orange classique MADI',
    },
    description: {
      ru: 'Фирменный учебный автомобиль гаража Миши',
      en: "Misha's signature campus training vehicle",
      ar: 'سيارة التدريب الرسمية في مرآب ميشا',
      fr: 'Le véhicule d’entraînement emblématique du garage de Misha',
    },
  },
  {
    id: 'car-madi-blue',
    type: 'car_skin',
    unlockedByDefault: false,
    previewColorPrimary: '#1B4DFF',
    previewColorSecondary: '#38BDF8',
    unlockRequirementText: {
      ru: 'Значок «Круиз по Ленинградке» (3 дня подряд)',
      en: 'Badge: Leningradsky Cruise (3-day streak)',
      ar: 'شارة: رحلة لينينغرادسكي (سلسلة 3 أيام)',
      fr: 'Badge : Croisière Leningradski (série de 3 jours)',
    },
    title: {
      ru: 'Синий ралли-болид МАДИ',
      en: 'MADI Blue Rally Sprinter',
      ar: 'سيارة رالي مادي الزرقاء',
      fr: 'Bolide de rallye bleu MADI',
    },
    description: {
      ru: 'Спортивная окраска инженерной команды МАДИ',
      en: 'High-visibility engineering team livery',
      ar: 'طلاء رياضي لفريق الهندسة في جامعة مادي',
      fr: 'Livrée sportive de l’équipe d’ingénierie MADI',
    },
  },
  {
    id: 'car-emerald-shuttle',
    type: 'car_skin',
    unlockedByDefault: false,
    previewColorPrimary: '#059669',
    previewColorSecondary: '#34D399',
    unlockRequirementText: {
      ru: 'Значок «Десять отремонтированных узлов» (Гараж)',
      en: 'Badge: Ten Tuned Engines (Garage)',
      ar: 'شارة: عشرة محركات مضبوطة (المرآب)',
      fr: 'Badge : Dix moteurs réglés (Garage)',
    },
    title: {
      ru: 'Изумрудный эко-шаттл кампуса',
      en: 'Emerald Campus Eco-Shuttle',
      ar: 'حافلة الحرم الجامعي الزمردية',
      fr: 'Navette écologique émeraude',
    },
    description: {
      ru: 'Электрический шаттл для поездок между корпусами и лабораториями',
      en: 'Zero-emission electric shuttle connecting MADI labs',
      ar: 'مركبة كهربائية للتنقل بين المختبرات',
      fr: 'Navette électrique reliant les laboratoires du campus',
    },
  },
  {
    id: 'car-crimson-metro',
    type: 'car_skin',
    unlockedByDefault: false,
    previewColorPrimary: '#DC2626',
    previewColorSecondary: '#FCA5A5',
    unlockRequirementText: {
      ru: 'Значок «Чистый эфир (3 звезды)» в разговорной практике',
      en: 'Badge: Crystal Broadcast (3 Stars in Speaking)',
      ar: 'شارة: بث نقي (3 نجوم في التحدث)',
      fr: 'Badge : Antenne limpide (3 étoiles à l’oral)',
    },
    title: {
      ru: 'Рубиновый экспресс «Аэропорт»',
      en: 'Crimson Aeroport Express',
      ar: 'إكسبريس المطار القرمزي',
      fr: 'Express rubis Aéroport',
    },
    description: {
      ru: 'Вдохновлено зелёной и красной линиями московского метро',
      en: 'Inspired by Moscow rapid transit lines',
      ar: 'مستوحى من خطوط المترو السريعة في موسكو',
      fr: 'Inspiré des lignes express de Moscou',
    },
  },
  {
    id: 'car-golden-magistral',
    type: 'car_skin',
    unlockedByDefault: false,
    previewColorPrimary: '#EAB308',
    previewColorSecondary: '#FEF08A',
    unlockRequirementText: {
      ru: 'Сдача уровневого экзамена или 30 дней серии',
      en: 'Pass any Level Exam or reach a 30-day streak',
      ar: 'اجتز امتحان المستوى أو سلسلة 30 يوماً',
      fr: 'Réussir un examen de niveau ou série de 30 jours',
    },
    title: {
      ru: 'Золотой гран-туризмо «Магистраль»',
      en: 'Golden Magistral GT',
      ar: 'ماجيسترال الذهبية السريعة',
      fr: 'Magistral GT Or',
    },
    description: {
      ru: 'Парадный автомобиль выпускника уровневого экзамена',
      en: 'Ceremonial grand tourer for certified drivers',
      ar: 'سيارة احتفالية للحاصلين على الشهادة',
      fr: 'Grand tourisme cérémoniel des diplômés',
    },
  },

  // Misha Mascot Outfits
  {
    id: 'outfit-mechanic-cap',
    type: 'mascot_outfit',
    unlockedByDefault: true,
    previewColorPrimary: '#1B4DFF',
    previewColorSecondary: '#FF8A1F',
    unlockRequirementText: {
      ru: 'Доступно со старта',
      en: 'Unlocked at Start',
      ar: 'متاح منذ البداية',
      fr: 'Débloqué au départ',
    },
    title: {
      ru: 'Кепка механика МАДИ',
      en: 'MADI Mechanic Cap',
      ar: 'قبعة ميكانيكي مادي',
      fr: 'Casquette de mécanicien MADI',
    },
    description: {
      ru: 'Классическая синяя кепка и комбинезон Миши',
      en: "Misha's classic blue mechanic cap and overalls",
      ar: 'قبعة وبدلة ميشا الزرقاء الكلاسيكية',
      fr: 'Casquette bleue et salopette classiques de Misha',
    },
  },
  {
    id: 'outfit-winter-ushanka',
    type: 'mascot_outfit',
    unlockedByDefault: false,
    previewColorPrimary: '#0284C7',
    previewColorSecondary: '#E0F2FE',
    unlockRequirementText: {
      ru: 'Значок «Недельный километраж» (7 дней подряд)',
      en: 'Badge: Weekly Odometer (7-day streak)',
      ar: 'شارة: عداد الأسبوع (7 أيام متتالية)',
      fr: 'Badge : Odomètre hebdomadaire (7 jours)',
    },
    title: {
      ru: 'Московская зимняя ушанка и шарф',
      en: 'Moscow Winter Ushanka & Scarf',
      ar: 'قبعة أوشانكا الشتوية ووشاح موسكو',
      fr: 'Ouchanka d’hiver moscovite & écharpe',
    },
    description: {
      ru: 'Тёплая экипировка для морозных зимних поездок по Москве',
      en: 'Warm gear for snowy Moscow winter drives',
      ar: 'ملابس دافئة لرحلات شتاء موسكو الثلجية',
      fr: 'Tenue chaude pour les trajets d’hiver à Moscou',
    },
  },
  {
    id: 'outfit-professor-glasses',
    type: 'mascot_outfit',
    unlockedByDefault: false,
    previewColorPrimary: '#7C3AED',
    previewColorSecondary: '#DDD6FE',
    unlockRequirementText: {
      ru: 'Сдача экзамена на 95%+ или получение сертификата',
      en: 'Pass an Exam with 95%+ or earn a Certificate',
      ar: 'اجتياز امتحان بنسبة 95%+ أو شهادة',
      fr: 'Examen à 95 %+ ou obtention d’un certificat',
    },
    title: {
      ru: 'Академическая мантия и очки профессора',
      en: 'Professor Glasses & Academic Gown',
      ar: 'نظارات الأستاذ والوشاح الأكاديمي',
      fr: 'Lunettes de professeur & toge académique',
    },
    description: {
      ru: 'Образ Миши на защите диплома и вручении сертификатов',
      en: 'Misha dressed for university graduation day',
      ar: 'إطلالة ميشا في يوم التخرج الجامعي',
      fr: 'Misha en tenue de remise de diplômes',
    },
  },
  {
    id: 'outfit-rally-helmet',
    type: 'mascot_outfit',
    unlockedByDefault: false,
    previewColorPrimary: '#059669',
    previewColorSecondary: '#A7F3D0',
    unlockRequirementText: {
      ru: 'Значок «Зона повышения лиги» (150+ топлива за неделю)',
      en: 'Badge: League Promotion Zone (150+ weekly Fuel)',
      ar: 'شارة: منطقة الترقية في الدوري (150+ وقود)',
      fr: 'Badge : Zone de promotion (150+ carburant)',
    },
    title: {
      ru: 'Шлем пилота скоростной лиги',
      en: 'Speed League Rally Helmet',
      ar: 'خوذة سباق الدوري السريع',
      fr: 'Casque de pilote de ligue',
    },
    description: {
      ru: 'Гоночный шлем с визором для лидеров недельных лиг',
      en: 'Visor helmet for top weekly league drivers',
      ar: 'خوذة سباق لمتصدري الدوري الأسبوعي',
      fr: 'Casque à visière pour les leaders de ligue',
    },
  },
  {
    id: 'outfit-cosmonaut-visor',
    type: 'mascot_outfit',
    unlockedByDefault: false,
    previewColorPrimary: '#EAB308',
    previewColorSecondary: '#FEF08A',
    unlockRequirementText: {
      ru: 'Значок «Навигатор шести падежей»',
      en: 'Badge: Six-Case Road Master',
      ar: 'شارة: قائد الحالات الست',
      fr: 'Badge : Maître des Six Cas',
    },
    title: {
      ru: 'Шлем павильона «Космос» (ВДНХ)',
      en: 'VDNKh Cosmos Explorer Suit',
      ar: 'خوذة جناح الفضاء في فدنخا',
      fr: 'Casque Cosmos VDNKh',
    },
    description: {
      ru: 'В честь легендарного павильона на ВДНХ',
      en: 'Tribute to the iconic VDNKh Space Pavilion',
      ar: 'تحية لجناح الفضاء الشهير في معرض فدنخا',
      fr: 'Hommage au célèbre pavillon de l’Espace de VDNKh',
    },
  },

  // Map Seasonal Themes
  {
    id: 'theme-moscow-spring',
    type: 'map_theme',
    unlockedByDefault: true,
    previewColorPrimary: '#1B4DFF',
    previewColorSecondary: '#10B981',
    unlockRequirementText: {
      ru: 'Доступно со старта',
      en: 'Unlocked at Start',
      ar: 'متاح منذ البداية',
      fr: 'Débloqué au départ',
    },
    title: {
      ru: 'Весна на Ленинградском проспекте',
      en: 'Leningradsky Spring Daylight',
      ar: 'ربيع شارع لينينغرادسكي',
      fr: 'Printemps sur l’avenue Leningradski',
    },
    description: {
      ru: 'Ясное небо и весенняя зелень студенческого городка',
      en: 'Fresh spring greenery and bright campus skies',
      ar: 'سماء صافية وخضرة الربيع في الحرم الجامعي',
      fr: 'Ciel clair et verdure printanière du campus',
    },
  },
  {
    id: 'theme-golden-autumn',
    type: 'map_theme',
    unlockedByDefault: false,
    previewColorPrimary: '#D97706',
    previewColorSecondary: '#FDE68A',
    unlockRequirementText: {
      ru: 'Значок «Двухнедельный экспресс» или 3 квеста',
      en: 'Badge: Fortnight Express or 3 Quests completed',
      ar: 'شارة: قطار الأسبوعين أو إكمال 3 مهام',
      fr: 'Badge : Express de quinzaine ou 3 quêtes',
    },
    title: {
      ru: 'Золотая московская осень (1 сентября)',
      en: 'Moscow Golden Autumn (Knowledge Day)',
      ar: 'خريف موسكو الذهبي (بداية الفصل)',
      fr: 'Automne doré de Moscou (Rentrée)',
    },
    description: {
      ru: 'Тёплые янтарные краски начала учебного года в МАДИ',
      en: 'Warm amber foliage of the new academic year',
      ar: 'ألوان الكهرمان الدافئة لبداية العام الدراسي',
      fr: 'Feuillage ambré de la rentrée universitaire',
    },
  },
  {
    id: 'theme-snow-winter',
    type: 'map_theme',
    unlockedByDefault: false,
    previewColorPrimary: '#0284C7',
    previewColorSecondary: '#E0F2FE',
    unlockRequirementText: {
      ru: 'Значок «Турбо-клавиатура» или 5 уроков',
      en: 'Badge: Turbo Typist or 5 completed lessons',
      ar: 'شارة: طباعة توربو أو إكمال 5 دروس',
      fr: 'Badge : Clavier Turbo ou 5 leçons terminées',
    },
    title: {
      ru: 'Снежная зима у Красной площади',
      en: 'Snowy Red Square Winter',
      ar: 'شتاء الساحة الحمراء الثلجي',
      fr: 'Hiver enneigé sur la Place Rouge',
    },
    description: {
      ru: 'Искрящийся снег и зимние огни московских бульваров',
      en: 'Sparkling snowdrifts and festive boulevard lights',
      ar: 'ثلوج متلألئة وأضواء شوارع موسكو الشتوية',
      fr: 'Neige scintillante et lumières des boulevards',
    },
  },
  {
    id: 'theme-white-nights',
    type: 'map_theme',
    unlockedByDefault: false,
    previewColorPrimary: '#4F46E5',
    previewColorSecondary: '#C7D2FE',
    unlockRequirementText: {
      ru: 'Значок «Первый выпуск в Шоурум»',
      en: 'Badge: Showroom Debut',
      ar: 'شارة: أول تخرج إلى صالة العرض',
      fr: 'Badge : Entrée au Showroom',
    },
    title: {
      ru: 'Вечерняя магистраль и огни мостов',
      en: 'Twilight Embankment & Bridge Lights',
      ar: 'أضواء الجسور والمساء في موسكو',
      fr: 'Crépuscule sur les quais et ponts',
    },
    description: {
      ru: 'Подсветка набережных Москвы-реки и ночного шоссе',
      en: 'Illuminated Moskva River bridges and twilight highway',
      ar: 'إضاءة جسور نهر موسكو والطريق السريع ليلاً',
      fr: 'Ponts illuminés de la Moskova au crépuscule',
    },
  },
];

// ============================================================================
// 3. WEEKLY LEAGUES, FACULTY COMPETITION, CLASS CHALLENGES & FRIENDS
// ============================================================================

export type LeagueTierId =
  | 'garage_lane'
  | 'campus_street'
  | 'city_avenue'
  | 'ring_road'
  | 'express_highway'
  | 'magistral_premier';

export interface LeagueTierInfo {
  id: LeagueTierId;
  order: number;
  accentColor: string;
  promoteTopN: number;
  demoteBottomN: number;
  title: Record<SupportedLang, string>;
  subtitle: Record<SupportedLang, string>;
}

/**
 * Strictly original road/infrastructure tier names (NO car brands).
 */
export const LEAGUE_TIERS: LeagueTierInfo[] = [
  {
    id: 'garage_lane',
    order: 1,
    accentColor: '#64748B',
    promoteTopN: 7,
    demoteBottomN: 0,
    title: {
      ru: '1. Гаражный проезд',
      en: '1. Garage Lane',
      ar: '1. ممر المرآب',
      fr: '1. Voie du Garage',
    },
    subtitle: {
      ru: 'Стартовый дивизион · Топ-7 переходят выше',
      en: 'Starter Division · Top 7 promote weekly',
      ar: 'القسم الابتدائي · أفضل 7 يترقون أسبوعياً',
      fr: 'Division de départ · Le Top 7 monte chaque semaine',
    },
  },
  {
    id: 'campus_street',
    order: 2,
    accentColor: '#059669',
    promoteTopN: 6,
    demoteBottomN: 5,
    title: {
      ru: '2. Университетская улица',
      en: '2. Campus Street',
      ar: '2. شارع الجامعة',
      fr: '2. Rue du Campus',
    },
    subtitle: {
      ru: 'Топ-6 повышаются · Нижние 5 возвращаются в Гаражный проезд',
      en: 'Top 6 promote · Bottom 5 demote',
      ar: 'أفضل 6 يترقون · آخر 5 يهبطون',
      fr: 'Top 6 promus · 5 derniers relégués',
    },
  },
  {
    id: 'city_avenue',
    order: 3,
    accentColor: '#1B4DFF',
    promoteTopN: 5,
    demoteBottomN: 5,
    title: {
      ru: '3. Городской проспект',
      en: '3. City Avenue',
      ar: '3. الجادة الرئيسية',
      fr: '3. Grande Avenue',
    },
    subtitle: {
      ru: 'Уверенный городской поток · Топ-5 повышаются',
      en: 'Steady city cruising · Top 5 promote',
      ar: 'قيادة حضرية متقدمة · أفضل 5 يترقون',
      fr: 'Circulation urbaine · Top 5 promus',
    },
  },
  {
    id: 'ring_road',
    order: 4,
    accentColor: '#FF8A1F',
    promoteTopN: 5,
    demoteBottomN: 5,
    title: {
      ru: '4. Кольцевая дорога',
      en: '4. Ring Road',
      ar: '4. الطريق الدائري',
      fr: '4. Rocade Anneau',
    },
    subtitle: {
      ru: 'Высокий темп движения · Топ-5 выходят на Шоссе',
      en: 'High-tempo ringway · Top 5 advance to Express Highway',
      ar: 'وتيرة عالية · أفضل 5 يتأهلون للطريق السريع',
      fr: 'Rythme soutenu · Top 5 vers l’Autoroute Express',
    },
  },
  {
    id: 'express_highway',
    order: 5,
    accentColor: '#7C3AED',
    promoteTopN: 4,
    demoteBottomN: 5,
    title: {
      ru: '5. Скоростное шоссе',
      en: '5. Express Highway',
      ar: '5. الطريق السريع',
      fr: '5. Autoroute Express',
    },
    subtitle: {
      ru: 'Предэлитный дивизион · Топ-4 входят в Главную магистраль',
      en: 'Pre-elite division · Top 4 enter Magistral Premier',
      ar: 'قسم النخبة التمهيدي · أفضل 4 يدخلون الماجيسترال',
      fr: 'Division pré-élite · Top 4 vers Magistral Premier',
    },
  },
  {
    id: 'magistral_premier',
    order: 6,
    accentColor: '#EAB308',
    promoteTopN: 0,
    demoteBottomN: 5,
    title: {
      ru: '6. Главная магистраль',
      en: '6. Magistral Premier',
      ar: '6. الماجيسترال الممتاز',
      fr: '6. Magistral Premier',
    },
    subtitle: {
      ru: 'Высшая лига студентов МАДИ',
      en: 'Highest division of MADI language drivers',
      ar: 'أعلى دوري لطلاب جامعة مادي',
      fr: 'Plus haute ligue des étudiants MADI',
    },
  },
];

export interface LeagueParticipant {
  userId: string;
  nickname: string;
  avatarId: string;
  facultyCode: string;
  weeklyFuel: number;
  streakDays: number;
  isCurrentUser?: boolean;
  optedOutOfLeaderboard?: boolean;
}

export const SEED_LEAGUE_PARTICIPANTS: LeagueParticipant[] = [];

export const DEMO_LEAGUE_PARTICIPANTS: LeagueParticipant[] = [
  { userId: 'demo-lp-1', nickname: '[DEMO] Learner_01', avatarId: 'moscow-star', facultyCode: 'FDS', weeklyFuel: 410, streakDays: 18 },
  { userId: 'demo-lp-2', nickname: '[DEMO] Learner_02', avatarId: 'blue-sedan', facultyCode: 'FMT', weeklyFuel: 385, streakDays: 14 },
  { userId: 'demo-lp-3', nickname: '[DEMO] Learner_03', avatarId: 'golden-wrench', facultyCode: 'FAT', weeklyFuel: 360, streakDays: 11 },
  { userId: 'demo-lp-4', nickname: '[DEMO] Learner_04', avatarId: 'misha-cap', facultyCode: 'FDS', weeklyFuel: 340, streakDays: 9 },
  { userId: 'demo-lp-5', nickname: '[DEMO] Learner_05', avatarId: 'moscow-star', facultyCode: 'FUE', weeklyFuel: 315, streakDays: 12 },
  { userId: 'demo-lp-6', nickname: '[DEMO] Learner_06', avatarId: 'blue-sedan', facultyCode: 'PODFAK', weeklyFuel: 290, streakDays: 8 },
  { userId: 'demo-lp-7', nickname: '[DEMO] Learner_07', avatarId: 'golden-wrench', facultyCode: 'FDS', weeklyFuel: 265, streakDays: 7 },
  { userId: 'demo-lp-8', nickname: '[DEMO] Learner_08', avatarId: 'misha-cap', facultyCode: 'FAT', weeklyFuel: 240, streakDays: 6 },
  { userId: 'demo-lp-9', nickname: '[DEMO] Learner_09', avatarId: 'moscow-star', facultyCode: 'FMT', weeklyFuel: 215, streakDays: 5 },
  { userId: 'demo-lp-10', nickname: '[DEMO] Learner_10', avatarId: 'blue-sedan', facultyCode: 'PODFAK', weeklyFuel: 195, streakDays: 5 },
  { userId: 'demo-lp-11', nickname: '[DEMO] Learner_11', avatarId: 'golden-wrench', facultyCode: 'FUE', weeklyFuel: 175, streakDays: 4 },
  { userId: 'demo-lp-12', nickname: '[DEMO] Learner_12', avatarId: 'misha-cap', facultyCode: 'FDS', weeklyFuel: 145, streakDays: 3 },
  { userId: 'demo-lp-13', nickname: '[DEMO] Learner_13', avatarId: 'moscow-star', facultyCode: 'FAT', weeklyFuel: 120, streakDays: 2 },
  { userId: 'demo-lp-14', nickname: '[DEMO] Learner_14', avatarId: 'blue-sedan', facultyCode: 'PODFAK', weeklyFuel: 95, streakDays: 2 },
  { userId: 'demo-lp-15', nickname: '[DEMO] Learner_15', avatarId: 'golden-wrench', facultyCode: 'FMT', weeklyFuel: 70, streakDays: 1 },
  { userId: 'demo-lp-16', nickname: '[DEMO] Learner_16', avatarId: 'misha-cap', facultyCode: 'FUE', weeklyFuel: 45, streakDays: 1 },
];

export interface FacultyStanding {
  code: string;
  name: Record<SupportedLang, string>;
  activeStudents: number;
  weeklyFuelTotal: number;
  avgAccuracy: number;
}

export const SEED_FACULTY_BOARD: FacultyStanding[] = [
  {
    code: 'FDS',
    name: {
      ru: 'Дорожно-строительный факультет (ДСФ)',
      en: 'Road Construction Faculty (FDS)',
      ar: 'كلية بناء الطرق (FDS)',
      fr: 'Faculté de construction routière (FDS)',
    },
    activeStudents: 0,
    weeklyFuelTotal: 0,
    avgAccuracy: 0,
  },
  {
    code: 'FAT',
    name: {
      ru: 'Факультет автомобильного транспорта (ФАТ)',
      en: 'Automotive Transport Faculty (FAT)',
      ar: 'كلية النقل والمركبات (FAT)',
      fr: 'Faculté du transport automobile (FAT)',
    },
    activeStudents: 0,
    weeklyFuelTotal: 0,
    avgAccuracy: 0,
  },
  {
    code: 'PODFAK',
    name: {
      ru: 'Подготовительный факультет для иностранных граждан',
      en: 'International Preparatory Faculty',
      ar: 'الكلية التحضيرية للطلاب الدوليين',
      fr: 'Faculté préparatoire internationale',
    },
    activeStudents: 0,
    weeklyFuelTotal: 0,
    avgAccuracy: 0,
  },
  {
    code: 'FMT',
    name: {
      ru: 'Факультет мостов и тоннелей',
      en: 'Bridges & Tunnels Engineering',
      ar: 'كلية الجسور والأنفاق',
      fr: 'Faculté des ponts et tunnels',
    },
    activeStudents: 0,
    weeklyFuelTotal: 0,
    avgAccuracy: 0,
  },
  {
    code: 'FUE',
    name: {
      ru: 'Факультет логистики и экономики',
      en: 'Logistics & Transport Economics',
      ar: 'كلية اللوجستيات والاقتصاد',
      fr: 'Faculté de logistique et d’économie',
    },
    activeStudents: 0,
    weeklyFuelTotal: 0,
    avgAccuracy: 0,
  },
];

export const DEMO_FACULTY_BOARD: FacultyStanding[] = SEED_FACULTY_BOARD.map((f, idx) => ({
  ...f,
  activeStudents: 15 - idx * 2,
  weeklyFuelTotal: 1200 - idx * 150,
  avgAccuracy: 88,
}));

export interface ClassChallenge {
  id: string;
  groupId: string;
  groupName: string;
  teacherName: string;
  title: Record<SupportedLang, string>;
  targetFuel: number;
  currentFuel: number;
  endsAt: string;
  participantsCount: number;
}

export const SEED_CLASS_CHALLENGES: ClassChallenge[] = [];

export const DEMO_CLASS_CHALLENGES: ClassChallenge[] = [
  {
    id: 'demo-ch-101',
    groupId: 'demo-grp-101',
    groupName: '[DEMO] MADI-Prep-101 (A1)',
    teacherName: '[DEMO] Instructor #1',
    title: {
      ru: '[DEMO] Марафон Предложного падежа и 30 реплик в «Говорить»',
      en: '[DEMO] Prepositional Case & 30 Speaking Clips Challenge',
      ar: '[DEMO] تحدي حالة الجر و30 مقطع تحدث',
      fr: '[DEMO] Défi Cas Prépositionnel & 30 clips oraux',
    },
    targetFuel: 500,
    currentFuel: 180,
    endsAt: '2026-11-02T20:00:00Z',
    participantsCount: 2,
  },
];

export interface FriendConnection {
  id: string;
  friendCode: string;
  nickname: string;
  avatarId: string;
  sharedStreakDays: number;
  weeklyFuel: number;
  lastActiveText: Record<SupportedLang, string>;
  lastNudgedAt: string | null;
  allowNudges: boolean;
}

export const SEED_FRIENDS: FriendConnection[] = [];

export const DEMO_FRIENDS: FriendConnection[] = [
  {
    id: 'demo-fr-1',
    friendCode: 'DEMO-7741',
    nickname: '[DEMO] Friend_01',
    avatarId: 'moscow-star',
    sharedStreakDays: 3,
    weeklyFuel: 120,
    lastActiveText: {
      ru: '[DEMO] В сети недавно',
      en: '[DEMO] Active recently',
      ar: '[DEMO] نشط مؤخراً',
      fr: '[DEMO] Actif récemment',
    },
    lastNudgedAt: null,
    allowNudges: true,
  },
];

// ============================================================================
// 4. ADAPTIVE PLACEMENT TEST (15–25 QUESTIONS) & CEFR LEVEL EXAMS (A1–C2)
// ============================================================================

export type ExamSkillDomain = 'reading' | 'vocabulary' | 'grammar' | 'listening';

export interface PlacementQuestion {
  id: string;
  level: CefrLevel;
  difficultyRank: number; // 1 (A1) to 6 (C2)
  skill: ExamSkillDomain;
  audioText?: string;
  prompt: Record<SupportedLang, string>;
  russianContext: string;
  options: string[];
  correctAnswer: string;
  explanation: Record<SupportedLang, string>;
}

export const PLACEMENT_QUESTION_BANK: PlacementQuestion[] = [
  // A1 (rank 1)
  {
    id: 'pl-a1-1',
    level: 'A1',
    difficultyRank: 1,
    skill: 'listening',
    audioText: 'Здравствуйте! Меня зовут Миша.',
    prompt: {
      ru: 'Прослушайте и выберите верное значение фразы:',
      en: 'Listen and choose the meaning of the phrase:',
      ar: 'استمع واختر المعنى الصحيح للعبارة:',
      fr: 'Écoutez et choisissez le sens de la phrase :',
    },
    russianContext: 'Здра́вствуйте! Меня́ зову́т Ми́ша.',
    options: [
      'Hello! My name is Misha.',
      'Goodbye! See you at the metro.',
      'Where is the dormitory?',
      'Excuse me, what time is it?',
    ],
    correctAnswer: 'Hello! My name is Misha.',
    explanation: {
      ru: '«Меня зовут...» — базовая конструкция знакомства (A1).',
      en: '"Меня зовут..." means "My name is..." (A1 greeting).',
      ar: '«Меня зовут...» تعني «اسمي...» (تحية المستوى A1).',
      fr: '« Меня зовут... » signifie « Je m’appelle... » (A1).',
    },
  },
  {
    id: 'pl-a1-2',
    level: 'A1',
    difficultyRank: 1,
    skill: 'vocabulary',
    prompt: {
      ru: 'Какое слово означает «университетское общежитие»?',
      en: 'Which Russian word means "student dormitory"?',
      ar: 'أي كلمة روسية تعني «السكن الجامعي»؟',
      fr: 'Quel mot russe signifie « résidence universitaire » ?',
    },
    russianContext: 'Студе́нты живу́т в ...',
    options: ['общежи́тие', 'светофо́р', 'перекрёсток', 'тетра́дь'],
    correctAnswer: 'общежи́тие',
    explanation: {
      ru: 'Общежи́тие — дом для студентов.',
      en: 'Общежи́тие is a student dormitory.',
      ar: 'Общежи́тие تعني السكن الجامعي.',
      fr: 'Общежи́тие désigne la résidence étudiante.',
    },
  },
  {
    id: 'pl-a1-3',
    level: 'A1',
    difficultyRank: 1,
    skill: 'grammar',
    prompt: {
      ru: 'Выберите правильный притяжательный местоимение для слова женского рода «маши́на»:',
      en: 'Choose the correct form of "my" for the feminine noun "маши́на":',
      ar: 'اختر صيغة الملكية الصحيحة للكلمة المؤنثة «маши́на»:',
      fr: 'Choisissez le possessif correct pour le nom féminin « маши́на » :',
    },
    russianContext: 'Э́то ___ маши́на.',
    options: ['моя́', 'мой', 'моё', 'мои́'],
    correctAnswer: 'моя́',
    explanation: {
      ru: 'Слово «маши́на» женского рода (-а) -> моя́ маши́на.',
      en: '"Маши́на" is feminine (-а) -> моя́ маши́на.',
      ar: 'كلمة «маши́на» مؤنثة تنتهي بـ (-а) لذا تأخذ моя́.',
      fr: '« Маши́на » est féminin (-а) -> моя́ маши́на.',
    },
  },
  {
    id: 'pl-a1-4',
    level: 'A1',
    difficultyRank: 1,
    skill: 'reading',
    prompt: {
      ru: 'Прочитайте объявление: куда идут студенты?',
      en: 'Read the sentence: where are the students going right now?',
      ar: 'اقرأ الجملة: إلى أين يذهب الطلاب الآن؟',
      fr: 'Lisez la phrase : où vont les étudiants maintenant ?',
    },
    russianContext: 'Сейча́с де́вять часо́в утра́. Студе́нты иду́т в аудито́рию на ле́кцию.',
    options: [
      'To the lecture hall for a class',
      'To the airport for a flight',
      'To the pharmacy for medicine',
      'To the stadium for football',
    ],
    correctAnswer: 'To the lecture hall for a class',
    explanation: {
      ru: '«В аудиторию на лекцию» — в учебный зал на занятие.',
      en: '"В аудиторию на лекцию" means to the lecture hall for a class.',
      ar: '«В аудиторию на лекцию» تعني إلى القاعة لحضور المحاضرة.',
      fr: '« В аудиторию на лекцию » signifie vers l’amphithéâtre pour le cours.',
    },
  },

  // A2 (rank 2)
  {
    id: 'pl-a2-1',
    level: 'A2',
    difficultyRank: 2,
    skill: 'grammar',
    prompt: {
      ru: 'Выберите форму Предложного падежа (Где?):',
      en: 'Choose the Prepositional case form (Where?):',
      ar: 'اختر صيغة حالة الجر المكانية (أين؟):',
      fr: 'Choisissez la forme au cas Prépositionnel (Où ?) :',
    },
    russianContext: 'Мы у́чимся в ___ (университе́т) на Ленингра́дском проспе́кте.',
    options: ['университе́те', 'университе́ту', 'университе́том', 'университе́та'],
    correctAnswer: 'университе́те',
    explanation: {
      ru: 'Предложный падеж места с предлогом «в»: в университе́те.',
      en: 'Prepositional case after "в" (location) takes -е: в университе́те.',
      ar: 'حالة الجر بعد «в» للمكان تأخذ النهاية -е: в университе́те.',
      fr: 'Le prépositionnel de lieu après « в » prend -е : в университе́те.',
    },
  },
  {
    id: 'pl-a2-2',
    level: 'A2',
    difficultyRank: 2,
    skill: 'grammar',
    prompt: {
      ru: 'Выберите правильный глагол движения (каждый день, туда и обратно):',
      en: 'Choose the correct multidirectional verb of motion ("every day"):',
      ar: 'اختر فعل الحركة الصحيح للروتين اليومي («كل يوم»):',
      fr: 'Choisissez le verbe de mouvement multidirectionnel (« chaque jour ») :',
    },
    russianContext: 'Ка́ждый день я ___ в кампу́с на метро́.',
    options: ['е́зжу', 'е́ду', 'иду́', 'пошёл'],
    correctAnswer: 'е́зжу',
    explanation: {
      ru: 'Регулярное движение на транспорте («каждый день») — глагол «е́здить» -> я е́зжу.',
      en: 'Repeated travel by vehicle ("every day") uses е́здить -> я е́зжу.',
      ar: 'التنقل المتكرر بالمواصلات («كل يوم») يستخدم الفعل е́здить -> я е́зжу.',
      fr: 'Un déplacement habituel en transport utilise е́здить -> я е́зжу.',
    },
  },
  {
    id: 'pl-a2-3',
    level: 'A2',
    difficultyRank: 2,
    skill: 'vocabulary',
    prompt: {
      ru: 'Какое слово пропущено в диалоге у кассы метро?',
      en: 'Which word completes the metro ticket counter dialogue?',
      ar: 'أي كلمة تكمل حوار شباк تذاكر المترو؟',
      fr: 'Quel mot complète le dialogue au guichet du métro ?',
    },
    russianContext: 'Пожа́луйста, помоги́те пополни́ть тра́нспортную ___ «Тро́йка».',
    options: ['ка́рту', 'фа́ру', 'ши́ну', 'аудито́рию'],
    correctAnswer: 'ка́рту',
    explanation: {
      ru: 'Пополнить транспортную ка́рту (Винительный падеж от «ка́рта»).',
      en: 'Top up a transport card: пополнить транспортную ка́рту.',
      ar: 'شحن بطاقة المواصلات: транспортную ка́рту.',
      fr: 'Recharger la carte de transport : транспортную ка́рту.',
    },
  },
  {
    id: 'pl-a2-4',
    level: 'A2',
    difficultyRank: 2,
    skill: 'listening',
    audioText: 'Извините, как пройти к станции метро Аэропорт?',
    prompt: {
      ru: 'Прослушайте вопрос пешехода: что он ищет?',
      en: 'Listen to the pedestrian: what are they asking for?',
      ar: 'استمع إلى السؤال: عن ماذا يبحث السائل؟',
      fr: 'Écoutez la question : que cherche le piéton ?',
    },
    russianContext: 'Извини́те, как пройти́ к ста́нции метро́ «Аэропо́рт»?',
    options: [
      'Walking directions to Aeroport metro station',
      'The price of a bus ticket to the airport',
      'When the library closes tonight',
      'Where to repair a car engine',
    ],
    correctAnswer: 'Walking directions to Aeroport metro station',
    explanation: {
      ru: '«Как пройти к станции метро...» — вопрос о маршруте пешком.',
      en: '"Как пройти к..." asks for walking directions to a place.',
      ar: '«Как пройти к...» سؤال عن كيفية الوصول سيراً على الأقدام.',
      fr: '« Как пройти к... » demande le chemin à pied.',
    },
  },

  // B1 (rank 3)
  {
    id: 'pl-b1-1',
    level: 'B1',
    difficultyRank: 3,
    skill: 'grammar',
    prompt: {
      ru: 'Выберите правильную форму Творительного падежа (кем? чем?):',
      en: 'Select the correct Instrumental case form ("interested in..."):',
      ar: 'اختر صيغة الحالة الآلية الصحيحة («يهتم بـ...»):',
      fr: 'Choisissez la forme à l’Instrumental (« s’intéresser à... ») :',
    },
    russianContext: 'Инжене́ры МАДИ́ занима́ются совреме́нными доро́жными ___.',
    options: ['техноло́гиями', 'техноло́гий', 'техноло́гиям', 'техноло́гии'],
    correctAnswer: 'техноло́гиями',
    explanation: {
      ru: 'Глагол «заниматься» требует Творительного падежа мн. ч. (-ями): техноло́гиями.',
      en: '"Заниматься" requires the Instrumental plural (-ями): техноло́гиями.',
      ar: 'الفعل «заниматься» يتطلب الحالة الآلية للجمع (-ями): техноло́гиями.',
      fr: 'Le verbe « заниматься » régit l’instrumental pluriel (-ями) : техноло́гиями.',
    },
  },
  {
    id: 'pl-b1-2',
    level: 'B1',
    difficultyRank: 3,
    skill: 'grammar',
    prompt: {
      ru: 'Выберите верный вид глагола (результат к завтрашнему дню):',
      en: 'Choose the correct verb aspect for a completed result by tomorrow:',
      ar: 'اختر هيئة الفعل المكتملة لإنجاز العمل بحلول الغد:',
      fr: 'Choisissez l’aspect verbal pour un résultat accompli d’ici demain :',
    },
    russianContext: 'Мне ну́жно обяза́тельно ___ э́тот чертёж до за́втрашнего утра́.',
    options: ['зако́нчить', 'зака́нчивать', 'зака́нчивал', 'зако́нчу'],
    correctAnswer: 'зако́нчить',
    explanation: {
      ru: 'После «нужно» для однократного результата используется инфинитив СВ: зако́нчить.',
      en: 'For a single completed deadline after "нужно", use the perfective infinitive: зако́нчить.',
      ar: 'لتحقيق نتيجة مكتملة بعد «нужно» نستخدم المصدر المكتمل: зако́нчить.',
      fr: 'Pour un résultat unique après « нужно », utilisez l’infinitif perfectif : зако́нчить.',
    },
  },
  {
    id: 'pl-b1-3',
    level: 'B1',
    difficultyRank: 3,
    skill: 'reading',
    prompt: {
      ru: 'Прочитайте выдержку из лабораторного журнала: почему отложили испытание?',
      en: 'Read the lab log note: why was the road test postponed?',
      ar: 'اقرأ ملاحظة المختبر: لماذا تأجل اختبار الطريق؟',
      fr: 'Lisez la note de laboratoire : pourquoi l’essai routier a-t-il été reporté ?',
    },
    russianContext:
      'Испыта́ние тормозно́й систе́мы на полиго́не перенесли́ на сре́ду из-за си́льного гололёда.',
    options: [
      'Because of severe black ice on the testing ground',
      'Because the chief professor was on a business trip',
      'Because the battery was not charged in time',
      'Because the students had a mathematics exam',
    ],
    correctAnswer: 'Because of severe black ice on the testing ground',
    explanation: {
      ru: '«Из-за сильного гололёда» — по причине обледенения дороги.',
      en: '"Из-за сильного гололёда" means due to severe black ice.',
      ar: '«Из-за сильного гололёда» تعني بسبب الجليد الشديد على الطريق.',
      fr: '« Из-за сильного гололёда » signifie à cause d’un fort verglas.',
    },
  },
  {
    id: 'pl-b1-4',
    level: 'B1',
    difficultyRank: 3,
    skill: 'vocabulary',
    prompt: {
      ru: 'Подберите точный глагол движения с приставкой (войти внутрь здания):',
      en: 'Choose the prefixed verb of motion meaning "to enter a building":',
      ar: 'اختر فعل الحركة المزود ببادئة بمعنى «دخل إلى المبنى»:',
      fr: 'Choisissez le verbe de mouvement préfixé signifiant « entrer dans le bâtiment » :',
    },
    russianContext: 'Когда́ прозвене́л звоно́к, преподава́тель ___ в лаборато́рию.',
    options: ['вошёл', 'вы́шел', 'обошёл', 'отошёл'],
    correctAnswer: 'вошёл',
    explanation: {
      ru: 'Приставка в-/во- с предлогом «в» обозначает движение внутрь: вошёл.',
      en: 'The prefix в-/во- indicates movement into an enclosed space: вошёл.',
      ar: 'البادئة в-/во- تدل على الدخول إلى المكان: вошёл.',
      fr: 'Le préfixe в-/во- indique un mouvement vers l’intérieur : вошёл.',
    },
  },

  // B2 (rank 4)
  {
    id: 'pl-b2-1',
    level: 'B2',
    difficultyRank: 4,
    skill: 'grammar',
    prompt: {
      ru: 'Выберите правильную форму действительного причастия настоящего времени:',
      en: 'Select the correct active present participle form:',
      ar: 'اختر صيغة اسم الفاعل الصحيحة في الزمن الحاضر:',
      fr: 'Sélectionnez le participe présent actif correct :',
    },
    russianContext: 'Аспира́нты, ___ но́вый соста́в асфа́льта, опубликова́ли статью́.',
    options: ['разраба́тывающие', 'разраба́тывавшим', 'разрабо́танный', 'разраба́тывая'],
    correctAnswer: 'разраба́тывающие',
    explanation: {
      ru: 'Именительный падеж мн. ч. причастия: аспиранты (какие?), разраба́тывающие.',
      en: 'Nominative plural active participle matching "аспиранты": разраба́тывающие.',
      ar: 'اسم الفاعل في حالة الرفع للجمع مطابقاً لـ «аспиранты»: разраба́тывающие.',
      fr: 'Participe actif nominatif pluriel accordé avec « аспиранты » : разраба́тывающие.',
    },
  },
  {
    id: 'pl-b2-2',
    level: 'B2',
    difficultyRank: 4,
    skill: 'reading',
    prompt: {
      ru: 'Определите основную мысль научного тезиса:',
      en: 'Identify the main conclusion of the engineering abstract:',
      ar: 'حدد الاستنتاج الرئيسي للملخص الهندسي:',
      fr: 'Identifiez la conclusion principale de l’extrait scientifique :',
    },
    russianContext:
      'Примене́ние полиме́рных доба́вок не то́лько повыша́ет износосто́йкость доро́жного полотна́, но и сокраща́ет расхо́ды на сезо́нный ремо́нт.',
    options: [
      'Polymer additives both increase road durability and reduce seasonal maintenance costs',
      'Polymer additives are too expensive for northern highways',
      'Seasonal road repairs should only be conducted in summer',
      'Asphalt durability depends solely on traffic volume',
    ],
    correctAnswer:
      'Polymer additives both increase road durability and reduce seasonal maintenance costs',
    explanation: {
      ru: 'Конструкция «не только..., но и...» объединяет повышение износостойкости и снижение затрат.',
      en: '"Не только..., но и..." links higher wear resistance with lower repair costs.',
      ar: 'تركيب «не только..., но и...» يربط بين زيادة المتانة وتقليل تكاليف الصيانة.',
      fr: 'La structure « не только..., но и... » relie durabilité accrue et baisse des coûts.',
    },
  },
  {
    id: 'pl-b2-3',
    level: 'B2',
    difficultyRank: 4,
    skill: 'grammar',
    prompt: {
      ru: 'Выберите союз со значением уступки («несмотря на то, что»):',
      en: 'Choose the concessive conjunction that fits the sentence:',
      ar: 'اختر أداة الربط الدالة على الاستدراك («على الرغم من أن»):',
      fr: 'Choisissez la locution conjonctive de concession appropriée :',
    },
    russianContext: '___ на сло́жные пого́дные усло́вия, строи́тельство моста́ заверши́лось в срок.',
    options: ['Несмотря́', 'Благодаря́', 'Всле́дствие', 'Вви́ду'],
    correctAnswer: 'Несмотря́',
    explanation: {
      ru: 'Устойчивый предлог уступки: «несмотря на + Винительный падеж».',
      en: '"Несмотря на" (+ Accusative) means "despite / in spite of".',
      ar: '«Несмотря на» تعني «على الرغم من».',
      fr: '« Несмотря на » (+ Accusatif) signifie « malgré / en dépit de ».',
    },
  },

  // C1 (rank 5)
  {
    id: 'pl-c1-1',
    level: 'C1',
    difficultyRank: 5,
    skill: 'grammar',
    prompt: {
      ru: 'Выберите стилистически безупречный вариант для академического доклада:',
      en: 'Choose the stylistically appropriate academic Russian construction:',
      ar: 'اختر الصياغة الأكاديمية الرسمية المناسبة للتقرير العلمي:',
      fr: 'Choisissez la tournure académique russe appropriée :',
    },
    russianContext:
      'Полу́ченные в хо́де экспериме́нта да́нные свиде́тельствуют о ___ пересмо́тра расчётных нагру́зок.',
    options: [
      'необходи́мости',
      'необходи́мостью',
      'необходи́мость',
      'необходи́мым',
    ],
    correctAnswer: 'необходи́мости',
    explanation: {
      ru: 'Глагол «свидетельствовать о (чём?)» управляет Предложным падежом: о необходи́мости.',
      en: '"Свидетельствовать о" governs the Prepositional case: о необходи́мости.',
      ar: 'الفعل «свидетельствовать о» يتطلب حالة الجر: о необходи́мости.',
      fr: '« Свидетельствовать о » régit le cas Prépositionnel : о необходи́мости.',
    },
  },
  {
    id: 'pl-c1-2',
    level: 'C1',
    difficultyRank: 5,
    skill: 'vocabulary',
    prompt: {
      ru: 'Какое слово соответствует значению «беспрепятственное прохождение транспорта»?',
      en: 'Which term denotes "traffic throughput / capacity" in highway engineering?',
      ar: 'أي مصطلح هندسي يعني «القدرة الاستيعابية للطريق»؟',
      fr: 'Quel terme désigne la « capacité de débit routier » ?',
    },
    russianContext:
      'Реконстру́кция развя́зки позво́лила суще́ственно увели́чить ___ магистра́ли.',
    options: [
      'пропускну́ю спосо́бность',
      'обра́тную свя́зь',
      'кривизну́ профи́ля',
      'шерохова́тость отко́са',
    ],
    correctAnswer: 'пропускну́ю спосо́бность',
    explanation: {
      ru: 'Пропускна́я спосо́бность — ключевой термин транспортного проектирования.',
      en: '"Пропускна́я спосо́бность" is the standard technical term for traffic capacity/throughput.',
      ar: '«Пропускна́я спосо́бность» هو المصطلح الهندسي للقدرة الاستيعابية للطريق.',
      fr: '« Пропускна́я спосо́бность » est le terme technique pour le débit / la capacité.',
    },
  },
];

export interface LevelExamQuestion {
  id: string;
  skill: ExamSkillDomain;
  type: 'multiple_choice' | 'fill_blank' | 'translation' | 'listening' | 'stress';
  prompt: Record<SupportedLang, string>;
  russianText: string;
  audioText?: string;
  options: string[];
  correctAnswer: string;
  explanation: Record<SupportedLang, string>;
}

export interface TeacherGradingRubricCriterion {
  id: string;
  maxPoints: number;
  title: Record<SupportedLang, string>;
  description: Record<SupportedLang, string>;
}

export interface CefrExamDefinition {
  level: CefrLevel;
  passScorePct: number;
  timeLimitMinutes: number;
  retakeCooldownHours: number;
  title: Record<SupportedLang, string>;
  subtitle: Record<SupportedLang, string>;
  questions: LevelExamQuestion[];
  typingTask: {
    prompt: Record<SupportedLang, string>;
    targetText: string;
    minCpm: number;
    minAccuracy: number;
  };
  speakingTask: {
    prompt: Record<SupportedLang, string>;
    targetRussianPhrase: string;
    minScore: number;
  };
  requiresTeacherGradingOption: boolean;
  teacherWrittenOrOralPrompt?: Record<SupportedLang, string>;
  teacherRubric: TeacherGradingRubricCriterion[];
}

export const TEACHER_GRADING_RUBRIC: TeacherGradingRubricCriterion[] = [
  {
    id: 'rubric_grammar',
    maxPoints: 25,
    title: {
      ru: '1. Грамматика и падежная точность',
      en: '1. Grammar & Case Accuracy',
      ar: '1. القواعد ودقة الحالات الإعرابية',
      fr: '1. Grammaire et précision des cas',
    },
    description: {
      ru: 'Правильное согласование падежей, видов глагола и синтаксических конструкций.',
      en: 'Accurate use of Russian cases, verb aspects, and sentence syntax.',
      ar: 'الاستخدام الصحيح للحالات الإعرابية وهيئات الأفعال وبنية الجملة.',
      fr: 'Accord correct des cas, aspects verbaux et syntaxe.',
    },
  },
  {
    id: 'rubric_vocab',
    maxPoints: 25,
    title: {
      ru: '2. Словарный запас и регистр общения',
      en: '2. Vocabulary Range & Register',
      ar: '2. الثروة اللغوية ومستوى الخطاب',
      fr: '2. Richesse lexicale et registre',
    },
    description: {
      ru: 'Уместное использование академической и бытовой лексики МАДИ.',
      en: 'Appropriate use of academic, technical, and everyday campus vocabulary.',
      ar: 'الاستخدام المناسب للمفردات الأكاديمية والجامعية.',
      fr: 'Usage approprié du vocabulaire académique et quotidien.',
    },
  },
  {
    id: 'rubric_phonetics',
    maxPoints: 25,
    title: {
      ru: '3. Ударение, интонация и орфография',
      en: '3. Stress, Phonetics & Orthography',
      ar: '3. النبر الصوتي والإملاء',
      fr: '3. Accent tonique et orthographe',
    },
    description: {
      ru: 'Чёткое словесное ударение (в устной части) и грамотное письмо (в письменной).',
      en: 'Clear word stress in speech and accurate Cyrillic spelling in writing.',
      ar: 'وضوح النبر في التحدث وصحة الإملاء الكيريلي في الكتابة.',
      fr: 'Accent tonique clair à l’oral et orthographe cyrillique exacte.',
    },
  },
  {
    id: 'rubric_task',
    maxPoints: 25,
    title: {
      ru: '4. Полнота решения коммуникативной задачи',
      en: '4. Communicative Task Fulfillment',
      ar: '4. إتمام المهمة التواصلية',
      fr: '4. Réalisation de la tâche communicative',
    },
    description: {
      ru: 'Логичность, связность и полное раскрытие заданной ситуации.',
      en: 'Coherence, completeness, and practical effectiveness of the response.',
      ar: 'الترابط المنطقي والشمولية في الإجابة على الموقف المطلوب.',
      fr: 'Cohérence, logique et réponse complète à la situation.',
    },
  },
];

const BASE_A1_QUESTIONS: LevelExamQuestion[] = [
  {
    id: 'ex-a1-1',
    skill: 'listening',
    type: 'listening',
    audioText: 'Доброе утро! Где находится главная аудитория?',
    russianText: 'До́брое у́тро! Где нахо́дится гла́вная аудито́рия?',
    prompt: {
      ru: 'Прослушайте фразу и выберите точный перевод:',
      en: 'Listen to the audio and select the accurate translation:',
      ar: 'استمع إلى الصوت واختر الترجمة الصحيحة:',
      fr: 'Écoutez l’audio et choisissez la traduction exacte :',
    },
    options: [
      'Good morning! Where is the main lecture hall located?',
      'Good evening! When does the dormitory open?',
      'Hello! How much is a metro ticket?',
      'Excuse me! Is this the bus to the airport?',
    ],
    correctAnswer: 'Good morning! Where is the main lecture hall located?',
    explanation: {
      ru: '«Главная аудитория» — главный лекционный зал.',
      en: '"Главная аудитория" means the main lecture hall.',
      ar: '«Главная аудитория» تعني قاعة المحاضرات الرئيسية.',
      fr: '« Главная аудитория » signifie l’amphithéâtre principal.',
    },
  },
  {
    id: 'ex-a1-2',
    skill: 'vocabulary',
    type: 'multiple_choice',
    russianText: 'На перекрёстке гори́т зелёный ___.',
    prompt: {
      ru: 'Дополните предложение подходящим словом по теме «Дорога»:',
      en: 'Complete the sentence with the matching road vocabulary word:',
      ar: 'أكمل الجملة بالكلمة المناسبة من مفردات الطريق:',
      fr: 'Complétez la phrase avec le mot de vocabulaire routier approprié :',
    },
    options: ['светофо́р', 'слова́рь', 'каранда́ш', 'чемода́н'],
    correctAnswer: 'светофо́р',
    explanation: {
      ru: 'Зелёный светофо́р разрешает движение на перекрёстке.',
      en: 'A green traffic light (светофо́р) allows traffic at an intersection.',
      ar: 'إشارة المرور (светофо́р) الخضراء تسمح بالحركة عند التقاطع.',
      fr: 'Le feu tricolore (светофо́р) vert autorise le passage.',
    },
  },
  {
    id: 'ex-a1-3',
    skill: 'grammar',
    type: 'fill_blank',
    russianText: 'Я живу́ в ___ (Москва́) и учу́сь в МАДИ́.',
    prompt: {
      ru: 'Поставьте слово «Москва́» в Предложный падеж (Где?):',
      en: 'Put "Москва́" into the Prepositional case (Where?):',
      ar: 'ضع كلمة «Москва́» في حالة الجر المكانية (أين؟):',
      fr: 'Mettez « Москва́ » au cas Prépositionnel (Où ?) :',
    },
    options: ['Москве́', 'Москву́', 'Москво́й', 'Москвы́'],
    correctAnswer: 'Москве́',
    explanation: {
      ru: 'Где? — в Москве́ (окончание -е в Предложном падеже).',
      en: 'Location after "в" takes -е: в Москве́.',
      ar: 'المكان بعد «в» يأخذ النهاية -е: в Москве́.',
      fr: 'Le lieu après « в » prend -е : в Москве́.',
    },
  },
  {
    id: 'ex-a1-4',
    skill: 'reading',
    type: 'multiple_choice',
    russianText:
      'В понеде́льник у нас ле́кция по ма́тематике в 09:00, а зате́м пра́ктика в автолаборато́рии.',
    prompt: {
      ru: 'Прочитайте расписание: что у студентов после лекции по математике?',
      en: 'Read the schedule: what do the students have after the math lecture?',
      ar: 'اقرأ الجدول: ماذا لدى الطلاب بعد محاضرة الرياضيات؟',
      fr: 'Lisez l’emploi du temps : qu’ont les étudiants après le cours de maths ?',
    },
    options: [
      'Practice in the automotive lab',
      'Lunch at the metro cafe',
      'A trip to Red Square',
      'Rest at the dormitory',
    ],
    correctAnswer: 'Practice in the automotive lab',
    explanation: {
      ru: '«А затем практика в автолаборатории» — занятие в автомобильной лаборатории.',
      en: '"Практика в автолаборатории" means practical training in the automotive lab.',
      ar: '«Практика в автолаборатории» تعني تدريب عملي في مختبر السيارات.',
      fr: '« Практика в автолаборатории » signifie travaux pratiques au labo auto.',
    },
  },
  {
    id: 'ex-a1-5',
    skill: 'vocabulary',
    type: 'stress',
    russianText: 'дорога',
    prompt: {
      ru: 'Выберите вариант с правильным ударением в слове «дорога»:',
      en: 'Select the form with the correct stress placement for "road":',
      ar: 'اختر الشكل الذي يحمل النبرة الصحيحة لكلمة «طريق»:',
      fr: 'Choisissez la forme avec l’accent tonique correct pour « route » :',
    },
    options: ['доро́га', 'до́рога', 'дорога́', 'дыро́га'],
    correctAnswer: 'доро́га',
    explanation: {
      ru: 'В слове «доро́га» ударение падает на второй слог (-ро́-).',
      en: 'In "доро́га", the stress falls on the second syllable (-ро́-).',
      ar: 'في كلمة «доро́га» تقع النبرة على المقطع الثاني (-ро́-).',
      fr: 'Dans « доро́га », l’accent tonique tombe sur la deuxième syllabe (-ро́-).',
    },
  },
  {
    id: 'ex-a1-6',
    skill: 'grammar',
    type: 'fill_blank',
    russianText: 'Сего́дня ве́чером мы чита́ем но́вую ___ (кни́га).',
    prompt: {
      ru: 'Выберите правильную форму Винительного падежа (Что?):',
      en: 'Choose the correct Accusative case form for the direct object "кни́га":',
      ar: 'اختر صيغة المفعول به الصحيحة لكلمة «кни́га»:',
      fr: 'Choisissez la forme correcte à l’Accusatif pour « кни́га » :',
    },
    options: ['кни́гу', 'кни́ге', 'кни́гой', 'кни́ги'],
    correctAnswer: 'кни́гу',
    explanation: {
      ru: 'Существительные ж.р. на -а в Винительном падеже меняют окончание на -у: кни́гу.',
      en: 'Feminine nouns ending in -а change to -у in the Accusative case: кни́гу.',
      ar: 'الأسماء المؤنثة المنتهية بـ -а تتحول إلى -у في حالة النصب: кни́гу.',
      fr: 'Les noms féminins en -а prennent -у à l’Accusatif : кни́гу.',
    },
  },
  {
    id: 'ex-a1-7',
    skill: 'listening',
    type: 'listening',
    audioText: 'Скажите, пожалуйста, сколько стоит проезд в автобусе?',
    russianText: 'Скажи́те, пожа́луйста, ско́лько сто́ит прое́зд в авто́бусе?',
    prompt: {
      ru: 'О чём спрашивает пассажир?',
      en: 'What is the passenger asking about?',
      ar: 'عن ماذا يسأل الراكب؟',
      fr: 'Que demande le passager ?',
    },
    options: [
      'How much the bus fare costs',
      'Which bus goes to the dormitory',
      'Where the nearest bus stop is',
      'When the last bus departs',
    ],
    correctAnswer: 'How much the bus fare costs',
    explanation: {
      ru: '«Сколько стоит проезд...» — вопрос о стоимости поездки.',
      en: '"Сколько стоит проезд..." asks how much the fare costs.',
      ar: '«Сколько стоит проезд...» سؤال عن تكلفة تذكرة الركوب.',
      fr: '« Сколько стоит проезд... » demande le tarif du trajet.',
    },
  },
  {
    id: 'ex-a1-8',
    skill: 'grammar',
    type: 'multiple_choice',
    russianText: 'У меня́ нет свобо́дного ___ (вре́мя) сего́дня днём.',
    prompt: {
      ru: 'После слова «нет» используется Родительный падеж. Выберите верную форму:',
      en: 'After "нет", the Genitive case is required. Choose the correct form:',
      ar: 'بعد «нет» تُستخدم حالة الإضافة. اختر الصيغة الصحيحة:',
      fr: 'Après « нет », on utilise le Génitif. Choisissez la forme correcte :',
    },
    options: ['вре́мени', 'вре́мя', 'вре́менем', 'времена́'],
    correctAnswer: 'вре́мени',
    explanation: {
      ru: 'Разносклоняемое существительное на -мя («время») в Родительном падеже: нет вре́мени.',
      en: 'Neuter nouns in -мя ("время") take -ени in the Genitive case: нет вре́мени.',
      ar: 'الاسم المحايد المنتهي بـ -мя يصبح вре́мени في حالة الإضافة.',
      fr: 'Les noms neutres en -мя prennent -ени au Génitif : нет вре́мени.',
    },
  },
];

export const CEFR_LEVEL_EXAMS: Record<CefrLevel, CefrExamDefinition> = {
  A1: {
    level: 'A1',
    passScorePct: 75,
    timeLimitMinutes: 25,
    retakeCooldownHours: 24,
    requiresTeacherGradingOption: false,
    title: {
      ru: 'Сертификационный экзамен уровня A1 (Элементарный)',
      en: 'CEFR Level A1 Certification Exam (Breakthrough)',
      ar: 'امتحان شهادة المستوى A1 (المبتدئ)',
      fr: 'Examen de certification Niveau A1 (Découverte)',
    },
    subtitle: {
      ru: 'Алфавит, ударение, базовые падежи (П.п., В.п., Р.п.), лексика кампуса МАДИ + печать и речь',
      en: 'Alphabet, stress, core cases, MADI campus & transport vocabulary + Typing Lab & Speaking',
      ar: 'الأبجدية، النبر، الحالات الأساسية، مفردات جامعة مادي + الطباعة والتحدث',
      fr: 'Alphabet, accent tonique, cas de base, vocabulaire du campus MADI + Frappe & Oral',
    },
    questions: BASE_A1_QUESTIONS,
    typingTask: {
      prompt: {
        ru: 'Наберите без ошибок приветственную фразу студента МАДИ:',
        en: 'Type the MADI student greeting sentence accurately:',
        ar: 'اطبع جملة التحية لطالب مادي بدقة:',
        fr: 'Tapez avec précision la phrase de présentation de l’étudiant MADI :',
      },
      targetText: 'Привет! Я студент МАДИ и учусь в Москве.',
      minCpm: 60,
      minAccuracy: 85,
    },
    speakingTask: {
      prompt: {
        ru: 'Произнесите вслух фразу для голосовой проверки (или используйте тестовую транскрипцию):',
        en: 'Speak the phrase aloud for pronunciation verification:',
        ar: 'انطق العبارة بصوت عالٍ للتحقق من النطق:',
        fr: 'Prononcez la phrase à voix haute pour vérification :',
      },
      targetRussianPhrase: 'Здра́вствуйте! Скажи́те, пожа́луйста, где метро́ Аэропо́рт?',
      minScore: 70,
    },
    teacherRubric: TEACHER_GRADING_RUBRIC,
  },
  A2: {
    level: 'A2',
    passScorePct: 75,
    timeLimitMinutes: 30,
    retakeCooldownHours: 24,
    requiresTeacherGradingOption: false,
    title: {
      ru: 'Сертификационный экзамен уровня A2 (Базовый)',
      en: 'CEFR Level A2 Certification Exam (Waystage)',
      ar: 'امتحان شهادة المستوى A2 (الأساسي)',
      fr: 'Examen de certification Niveau A2 (Intermédiaire initial)',
    },
    subtitle: {
      ru: 'Все 6 падежей в городских ситуациях, глаголы движения, диалоги в метро и деканате',
      en: 'All 6 cases in city scenarios, verbs of motion, metro & dean office dialogues',
      ar: 'الحالات الست في مواقف المدينة، أفعال الحركة، وحوارات المترو والعمادة',
      fr: 'Les 6 cas en ville, verbes de mouvement, dialogues au métro et au décanat',
    },
    questions: [
      ...BASE_A1_QUESTIONS.slice(2),
      ...PLACEMENT_QUESTION_BANK.filter((q) => q.level === 'A2').map((q) => ({
        id: `ex-a2-${q.id}`,
        skill: q.skill,
        type: 'multiple_choice' as const,
        prompt: q.prompt,
        russianText: q.russianContext,
        audioText: q.audioText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      })),
    ],
    typingTask: {
      prompt: {
        ru: 'Наберите фразу о маршруте от общежития до учебного корпуса:',
        en: 'Type the route description from the dormitory to the campus building:',
        ar: 'اطبع وصف الطريق من السكن الجامعي إلى مبنى الكلية:',
        fr: 'Tapez la description du trajet de la résidence au bâtiment :',
      },
      targetText: 'Каждое утро мы едем на метро до станции Аэропорт.',
      minCpm: 80,
      minAccuracy: 88,
    },
    speakingTask: {
      prompt: {
        ru: 'Озвучьте реплику студента в деканате:',
        en: 'Speak the student line at the dean’s office:',
        ar: 'انطق عبارة الطالب في مكتب العمادة:',
        fr: 'Prononcez la réplique de l’étudiant au décanat :',
      },
      targetRussianPhrase: 'Извини́те, мо́жно получи́ть студе́нческий биле́т и расписа́ние ле́кций?',
      minScore: 72,
    },
    teacherRubric: TEACHER_GRADING_RUBRIC,
  },
  B1: {
    level: 'B1',
    passScorePct: 75,
    timeLimitMinutes: 35,
    retakeCooldownHours: 24,
    requiresTeacherGradingOption: true,
    teacherWrittenOrOralPrompt: {
      ru: 'Опишите в 3–4 предложениях ваш учебный день в МАДИ или лабораторный проект (для проверки преподавателем по рубрике B1).',
      en: 'Write or record 3–4 sentences in Russian describing your study day at MADI or an engineering lab project (graded against the 4-part B1 rubric).',
      ar: 'اكتب أو سجّل 3-4 جمل بالروسية تصف يومك الدراسي في مادي أو مشروعاً مخبرياً (تُقيّم وفق معايير B1).',
      fr: 'Rédigez ou enregistrez 3 à 4 phrases en russe décrivant votre journée à MADI ou un projet de laboratoire.',
    },
    title: {
      ru: 'Сертификационный экзамен уровня B1 (ТРКИ-I / Пороговый)',
      en: 'CEFR Level B1 Certification Exam (Threshold / TRKI-I)',
      ar: 'امتحان شهادة المستوى B1 (المتوسط / ТРКИ-I)',
      fr: 'Examen de certification Niveau B1 (Seuil / TRKI-I)',
    },
    subtitle: {
      ru: 'Виды глагола, глаголы движения с приставками, техническое чтение + рубрика преподавателя',
      en: 'Verb aspects, prefixed motion verbs, engineering reading + Teacher Rubric section',
      ar: 'هيئات الأفعال، أفعال الحركة ذات البادئات، القراءة الهندسية + تقييم المدرس',
      fr: 'Aspects verbaux, verbes de mouvement préfixés, lecture technique + Grille enseignant',
    },
    questions: [
      ...PLACEMENT_QUESTION_BANK.filter((q) => q.level === 'A2' || q.level === 'B1').map((q) => ({
        id: `ex-b1-${q.id}`,
        skill: q.skill,
        type: 'multiple_choice' as const,
        prompt: q.prompt,
        russianText: q.russianContext,
        audioText: q.audioText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      })),
    ],
    typingTask: {
      prompt: {
        ru: 'Наберите выдержку из инженерного практикума МАДИ:',
        en: 'Type the excerpt from the MADI engineering lab manual:',
        ar: 'اطبع المقتطف من دليل المختبر الهندسي في مادي:',
        fr: 'Tapez l’extrait du manuel de laboratoire d’ingénierie MADI :',
      },
      targetText: 'Инженеры проверяют работу двигателя и тормозной системы автомобиля.',
      minCpm: 100,
      minAccuracy: 90,
    },
    speakingTask: {
      prompt: {
        ru: 'Произнесите докладную фразу о готовности проекта:',
        en: 'Speak the project readiness statement:',
        ar: 'انطق جملة التقرير حول جاهزية المشروع:',
        fr: 'Prononcez la phrase de rapport sur l’état du projet :',
      },
      targetRussianPhrase: 'Мы успе́шно зако́нчили испыта́ние но́вого доро́жного покры́тия в лаборато́рии.',
      minScore: 75,
    },
    teacherRubric: TEACHER_GRADING_RUBRIC,
  },
  B2: {
    level: 'B2',
    passScorePct: 75,
    timeLimitMinutes: 40,
    retakeCooldownHours: 24,
    requiresTeacherGradingOption: true,
    teacherWrittenOrOralPrompt: {
      ru: 'Сформулируйте аргументированный вывод о преимуществах экологического городского транспорта (4–5 предложений).',
      en: 'Write an analytical summary on the advantages of sustainable urban transport in Moscow (4–5 sentences in Russian).',
      ar: 'اكتب ملخصاً تحليلياً حول مزايا النقل الحضري المستدام في موسكو (4-5 جمل بالروسية).',
      fr: 'Rédigez une synthèse argumentée sur les avantages des transports urbains durables (4–5 phrases en russe).',
    },
    title: {
      ru: 'Сертификационный экзамен уровня B2 (ТРКИ-II / Постпороговый)',
      en: 'CEFR Level B2 Certification Exam (Vantage / TRKI-II)',
      ar: 'امتحان شهادة المستوى B2 (المتقدم / ТРКИ-II)',
      fr: 'Examen de certification Niveau B2 (Avancé / TRKI-II)',
    },
    subtitle: {
      ru: 'Причастные и деепричастные обороты, научный стиль речи, лексика проектирования дорог',
      en: 'Participles, scientific Russian syntax, road & bridge engineering discourse',
      ar: 'اسما الفاعل والمفعول، الأسلوب العلمي الروسي، ومصطلحات هندسة الطرق والجسور',
      fr: 'Participes, style scientifique russe, discours d’ingénierie routière',
    },
    questions: [
      ...PLACEMENT_QUESTION_BANK.filter((q) => q.level === 'B1' || q.level === 'B2').map((q) => ({
        id: `ex-b2-${q.id}`,
        skill: q.skill,
        type: 'multiple_choice' as const,
        prompt: q.prompt,
        russianText: q.russianContext,
        audioText: q.audioText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      })),
    ],
    typingTask: {
      prompt: {
        ru: 'Наберите научный тезис без опечаток:',
        en: 'Type the academic engineering thesis statement:',
        ar: 'اطبع العبارة العلمية الهندسية بدقة:',
        fr: 'Tapez la thèse scientifique d’ingénierie :',
      },
      targetText: 'Применение современных композитов повышает долговечность мостовых конструкций.',
      minCpm: 115,
      minAccuracy: 92,
    },
    speakingTask: {
      prompt: {
        ru: 'Произнесите тезис для научной конференции МАДИ:',
        en: 'Speak the thesis statement for the MADI academic conference:',
        ar: 'انطق العبارة الخاصة بالمؤتمر العلمي في مادي:',
        fr: 'Prononcez l’énoncé pour la conférence scientifique MADI :',
      },
      targetRussianPhrase:
        'Несмотря́ на сло́жные клима́тические усло́вия, строи́тельство магистра́ли заверши́лось в срок.',
      minScore: 78,
    },
    teacherRubric: TEACHER_GRADING_RUBRIC,
  },
  C1: {
    level: 'C1',
    passScorePct: 80,
    timeLimitMinutes: 45,
    retakeCooldownHours: 24,
    requiresTeacherGradingOption: true,
    teacherWrittenOrOralPrompt: {
      ru: 'Составьте краткую аннотацию к дипломному исследованию по интеллектуальным транспортным системам.',
      en: 'Compose an executive abstract in Russian for a thesis on Intelligent Transport Systems.',
      ar: 'اكتب ملخصاً تنفيذياً بالروسية لأطروحة حول أنظمة النقل الذكية.',
      fr: 'Rédigez un résumé analytique en russe pour un mémoire sur les systèmes de transport intelligents.',
    },
    title: {
      ru: 'Сертификационный экзамен уровня C1 (ТРКИ-III / Профессиональный)',
      en: 'CEFR Level C1 Certification Exam (Effective Operational Proficiency)',
      ar: 'امتحان شهادة المستوى C1 (الاحترافي / ТРКИ-III)',
      fr: 'Examen de certification Niveau C1 (Autonome / TRKI-III)',
    },
    subtitle: {
      ru: 'Академическая риторика, терминология проектирования магистралей и защита исследований',
      en: 'Academic rhetoric, highway systems terminology, and research defense fluency',
      ar: 'البلاغة الأكاديمية، مصطلحات تصميم الطرق السريعة، ومناقشة الأبحاث',
      fr: 'Rhétorique académique, terminologie autoroutière et soutenance de recherche',
    },
    questions: [
      ...PLACEMENT_QUESTION_BANK.filter((q) => q.level === 'B2' || q.level === 'C1').map((q) => ({
        id: `ex-c1-${q.id}`,
        skill: q.skill,
        type: 'multiple_choice' as const,
        prompt: q.prompt,
        russianText: q.russianContext,
        audioText: q.audioText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      })),
    ],
    typingTask: {
      prompt: {
        ru: 'Наберите фрагмент научного заключения:',
        en: 'Type the research conclusion excerpt:',
        ar: 'اطبع مقتطف الخاتمة البحثية:',
        fr: 'Tapez l’extrait de conclusion de recherche :',
      },
      targetText: 'Экспериментальные данные свидетельствуют о повышении пропускной способности развязки.',
      minCpm: 130,
      minAccuracy: 93,
    },
    speakingTask: {
      prompt: {
        ru: 'Озвучьте вывод экспертной комиссии:',
        en: 'Speak the expert commission conclusion:',
        ar: 'انطق خلاصة اللجنة العلمية:',
        fr: 'Prononcez la conclusion de la commission d’experts :',
      },
      targetRussianPhrase:
        'Полу́ченные результа́ты свиде́тельствуют о необходи́мости модерниза́ции тра́нспортной развя́зки.',
      minScore: 80,
    },
    teacherRubric: TEACHER_GRADING_RUBRIC,
  },
  C2: {
    level: 'C2',
    passScorePct: 80,
    timeLimitMinutes: 45,
    retakeCooldownHours: 24,
    requiresTeacherGradingOption: true,
    teacherWrittenOrOralPrompt: {
      ru: 'Подготовьте развёрнутое экспертное заключение по развитию беспилотного транспорта на федеральных трассах.',
      en: 'Prepare a comprehensive expert opinion in Russian on autonomous vehicle deployment on federal highways.',
      ar: 'أعدّ تقريراً خبيراً مفصلاً بالروسية حول نشر المركبات ذاتية القيادة على الطرق الفيدرالية.',
      fr: 'Préparez un avis d’expert détaillé en russe sur le déploiement des véhicules autonomes.',
    },
    title: {
      ru: 'Сертификационный экзамен уровня C2 (ТРКИ-IV / Свободное владение)',
      en: 'CEFR Level C2 Certification Exam (Mastery / TRKI-IV)',
      ar: 'امتحان شهادة المستوى C2 (الإتقان الكامل / ТРКИ-IV)',
      fr: 'Examen de certification Niveau C2 (Maîtrise / TRKI-IV)',
    },
    subtitle: {
      ru: 'Полное профессиональное и академическое владение русским языком в инженерной среде',
      en: 'Complete academic and professional mastery of Russian in engineering contexts',
      ar: 'إتقان أكاديمي ومهني كامل للغة الروسية في البيئات الهندسية',
      fr: 'Maîtrise académique et professionnelle complète du russe en ingénierie',
    },
    questions: [
      ...PLACEMENT_QUESTION_BANK.filter((q) => q.difficultyRank >= 3).map((q) => ({
        id: `ex-c2-${q.id}`,
        skill: q.skill,
        type: 'multiple_choice' as const,
        prompt: q.prompt,
        russianText: q.russianContext,
        audioText: q.audioText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      })),
    ],
    typingTask: {
      prompt: {
        ru: 'Наберите фрагмент диссертационного автореферата:',
        en: 'Type the doctoral dissertation abstract excerpt:',
        ar: 'اطبع مقتطف ملخص الأطروحة العلمية:',
        fr: 'Tapez l’extrait du résumé de thèse :',
      },
      targetText: 'Интеграция интеллектуальных датчиков обеспечивает безопасность беспилотного движения.',
      minCpm: 140,
      minAccuracy: 94,
    },
    speakingTask: {
      prompt: {
        ru: 'Произнесите вступительное слово на пленарном заседании МАДИ:',
        en: 'Speak the plenary opening statement:',
        ar: 'انطق الكلمة الافتتاحية للجلسة العامة في مادي:',
        fr: 'Prononcez l’allocution d’ouverture plénière :',
      },
      targetRussianPhrase:
        'Уважа́емые колле́ги, предста́вленная методоло́гия открыва́ет но́вые перспекти́вы в доро́жном строи́тельстве.',
      minScore: 82,
    },
    teacherRubric: TEACHER_GRADING_RUBRIC,
  },
};

// ============================================================================
// 5. CERTIFICATE METADATA & CEFR DESCRIPTORS (4 LANGUAGES + RUSSIAN)
// ============================================================================

export interface CertificateLevelMeta {
  level: CefrLevel;
  accentColor: string;
  secondaryColor: string;
  sealLabelRu: string;
  levelTitle: Record<SupportedLang, string>;
  cefrDescriptor: Record<SupportedLang, string>;
}

export const DEFAULT_CERTIFICATE_DISCLAIMER =
  'Issued by the Madingo learning platform of MADI. This is a course completion certificate, not an official state language-test certificate.';

export const CEFR_CERTIFICATE_META: Record<CefrLevel, CertificateLevelMeta> = {
  A1: {
    level: 'A1',
    accentColor: '#1B4DFF',
    secondaryColor: '#DBEAFE',
    sealLabelRu: 'УРОВЕНЬ A1 · СТАРТ МАРШРУТА',
    levelTitle: {
      ru: 'Уровень A1 — Элементарное владение (ТЭУ)',
      en: 'CEFR Level A1 — Breakthrough Russian Proficiency',
      ar: 'المستوى A1 — الكفاءة التأسيسية في اللغة الروسية',
      fr: 'Niveau CECRL A1 — Compétence élémentaire de découverte',
    },
    cefrDescriptor: {
      ru: 'Понимает и использует базовые русские выражения, читает кириллицу с правильным ударением и решает повседневные задачи в кампусе МАДИ и городском транспорте.',
      en: 'Can read Cyrillic with accurate stress, use essential Russian cases, and handle everyday communication at the MADI campus, dormitory, and Moscow transit.',
      ar: 'يستطيع قراءة الأبجدية الكيريلية بنبر صحيح، واستخدام الحالات الإعرابية الأساسية، والتواصل في المواقف اليومية داخل حرم جامعة مادي ومواصلات موسكو.',
      fr: 'Peut lire le cyrillique avec l’accent tonique, utiliser les cas de base et communiquer dans les situations quotidiennes sur le campus MADI et dans les transports.',
    },
  },
  A2: {
    level: 'A2',
    accentColor: '#059669',
    secondaryColor: '#D1FAE5',
    sealLabelRu: 'УРОВЕНЬ A2 · БАЗОВЫЙ МАРШРУТ',
    levelTitle: {
      ru: 'Уровень A2 — Базовое владение (ТБУ)',
      en: 'CEFR Level A2 — Waystage Russian Proficiency',
      ar: 'المستوى A2 — الكفاءة الأساسية في اللغة الروسية',
      fr: 'Niveau CECRL A2 — Compétence intermédiaire initiale',
    },
    cefrDescriptor: {
      ru: 'Уверенно применяет все 6 падежей русского языка и глаголы движения в учебных, бытовых и дорожно-транспортных ситуациях.',
      en: 'Confidently applies all 6 Russian grammatical cases and verbs of motion across academic, city navigation, and transport scenarios.',
      ar: 'يطبق بثقة الحالات الإعرابية الروسية الست وأفعال الحركة في المواقف الدراسية والحضرية والمرورية.',
      fr: 'Utilise avec assurance les 6 cas grammaticaux russes et les verbes de mouvement en contexte universitaire et urbain.',
    },
  },
  B1: {
    level: 'B1',
    accentColor: '#FF8A1F',
    secondaryColor: '#FEF3C7',
    sealLabelRu: 'УРОВЕНЬ B1 · ТРКИ-I КУРС',
    levelTitle: {
      ru: 'Уровень B1 — Первый сертификационный курс',
      en: 'CEFR Level B1 — Threshold Academic & Technical Russian',
      ar: 'المستوى B1 — الكفاءة المتوسطة والجامعية',
      fr: 'Niveau CECRL B1 — Niveau seuil académique et technique',
    },
    cefrDescriptor: {
      ru: 'Способен понимать лекции и техническую литературу МАДИ, вести связный диалог и описывать лабораторные проекты.',
      en: 'Can follow MADI lectures and technical texts, participate in structured academic dialogues, and describe engineering lab workflows.',
      ar: 'قادر على فهم المحاضرات والنصوص التقنية في جامعة مادي، والمشاركة في الحوارات الأكاديمية ووصف المشاريع المخبرية.',
      fr: 'Capable de suivre des cours et textes techniques à MADI, de dialoguer avec aisance et de décrire des travaux de laboratoire.',
    },
  },
  B2: {
    level: 'B2',
    accentColor: '#7C3AED',
    secondaryColor: '#EDE9FE',
    sealLabelRu: 'УРОВЕНЬ B2 · ИНЖЕНЕРНЫЙ КУРС',
    levelTitle: {
      ru: 'Уровень B2 — Второй сертификационный курс',
      en: 'CEFR Level B2 — Vantage Professional & Academic Russian',
      ar: 'المستوى B2 — الكفاءة المتقدمة الأكاديمية والمهنية',
      fr: 'Niveau CECRL B2 — Compétence avancée académique et technique',
    },
    cefrDescriptor: {
      ru: 'Свободно владеет научным стилем речи, причастными конструкциями и профессиональной терминологией автомобильно-дорожной отрасли.',
      en: 'Commands scientific Russian style, complex participial syntax, and specialized automotive and road construction terminology.',
      ar: 'يتقن الأسلوب العلمي الروسي، والتراكيب النحوية المتقدمة، والمصطلحات التخصصية في هندسة الطرق والمركبات.',
      fr: 'Maîtrise le style scientifique russe, la syntaxe participiale complexe et la terminologie du génie routier et automobile.',
    },
  },
  C1: {
    level: 'C1',
    accentColor: '#DC2626',
    secondaryColor: '#FEE2E2',
    sealLabelRu: 'УРОВЕНЬ C1 · ПРОФЕССИОНАЛ',
    levelTitle: {
      ru: 'Уровень C1 — Профессиональное академическое владение',
      en: 'CEFR Level C1 — Effective Operational Proficiency',
      ar: 'المستوى C1 — الكفاءة المهنية والأكاديمية العالية',
      fr: 'Niveau CECRL C1 — Compétence opérationnelle autonome',
    },
    cefrDescriptor: {
      ru: 'Демонстрирует беглое, точное и стилистически выверенное владение русским языком при защите научных и инженерных проектов.',
      en: 'Demonstrates fluent, precise, and stylistically nuanced Russian for academic research defense and engineering leadership.',
      ar: 'يُظهر طلاقة ودقة عالية في استخدام اللغة الروسية أثناء مناقشة الأبحاث العلمية والمشاريع الهندسية.',
      fr: 'Fait preuve d’une maîtrise fluide, précise et nuancée du russe pour la soutenance de travaux scientifiques et d’ingénierie.',
    },
  },
  C2: {
    level: 'C2',
    accentColor: '#EAB308',
    secondaryColor: '#FEF9C3',
    sealLabelRu: 'УРОВЕНЬ C2 · МАГИСТРАЛЬ',
    levelTitle: {
      ru: 'Уровень C2 — Совершенное владение русским языком',
      en: 'CEFR Level C2 — Mastery of Academic & Technical Russian',
      ar: 'المستوى C2 — الإتقان الكامل للغة الروسية الأكاديمية',
      fr: 'Niveau CECRL C2 — Maîtrise complète du russe académique',
    },
    cefrDescriptor: {
      ru: 'Свободно понимает и создаёт сложные научные, нормативные и профессиональные тексты на уровне высококвалифицированного специалиста.',
      en: 'Effortlessly understands and produces complex scientific, regulatory, and technical Russian discourse at an expert level.',
      ar: 'يفهم وينتج بسهولة النصوص العلمية والتنظيمية والهندسية المعقدة بمستوى الخبير المتخصص.',
      fr: 'Comprend et produit aisément des discours scientifiques, réglementaires et techniques complexes au niveau d’un expert.',
    },
  },
};

// ============================================================================
// 6. LEGAL & PRIVACY DRAFTS IN 4 LANGUAGES (RU / EN / AR / FR)
// ============================================================================

export interface LegalSectionDoc {
  id: 'privacy' | 'terms' | 'copyright' | 'voice_consent' | 'certificate_disclaimer';
  title: Record<SupportedLang, string>;
  body: Record<SupportedLang, string>;
}

export const LEGAL_POLICIES: LegalSectionDoc[] = [
  {
    id: 'privacy',
    title: {
      ru: 'Политика конфиденциальности и защита данных (GDPR / 152-ФЗ)',
      en: 'Privacy Policy & Student Data Protection (GDPR Compliant)',
      ar: 'سياسة الخصوصية وحماية بيانات الطلاب (متوافقة مع GDPR)',
      fr: 'Politique de confidentialité et protection des données (RGPD)',
    },
    body: {
      ru: 'Платформа madingo собирает только минимально необходимые учебные данные: адрес эл. почты, выбранный язык интерфейса, прогресс по урокам и карточки повторения в Гараже. Вы можете в любой момент выгрузить архив своих данных в формате JSON или полностью удалить аккаунт в разделе «Профиль». На досках почёта лиг отображается только выбранный псевдоним и аватар.',
      en: 'madingo collects only the minimum learning data required to power your study journey: email address, interface language, lesson progress, and Garage SRS items. You can export all your personal data as JSON or permanently delete your account at any time in the Profile tab. Leaderboards display only your chosen nickname and avatar, with one-click opt-out.',
      ar: 'تجمع منصة madingo الحد الأدنى فقط من البيانات التعليمية اللازمة: البريد الإلكتروني، لغة الواجهة، تقدم الدروس، وبطاقات المراجعة في المرآب. يمكنك تصدير جميع بياناتك بصيغة JSON أو حذف حسابك نهائياً في أي وقت من علامة تبويب الملف الشخصي. تعرض لوحات الصدارة الاسم المستعار والصورة الرمزية فقط مع إمكانية إلغاء الاشتراك.',
      fr: 'madingo ne collecte que le strict minimum de données d’apprentissage : adresse e-mail, langue d’interface, progression des leçons et cartes du Garage. Vous pouvez exporter toutes vos données en JSON ou supprimer définitivement votre compte à tout moment depuis l’onglet Profil. Les classements n’affichent que votre pseudonyme et votre avatar.',
    },
  },
  {
    id: 'terms',
    title: {
      ru: 'Правила пользования платформой (100% бесплатно)',
      en: 'Terms of Use (100% Free Educational Platform)',
      ar: 'شروط الاستخدام (منصة تعليمية مجانية 100%)',
      fr: 'Conditions d’utilisation (Plateforme éducative 100 % gratuite)',
    },
    body: {
      ru: 'Платформа madingo создана для студентов и преподавателей МАДИ и предоставляется на 100% бесплатной основе без платных подписок и покупок. Все косметические награды открываются исключительно за учебные достижения.',
      en: 'madingo is built for MADI international students and educators and is provided 100% free of charge with zero paid items or pay-to-win mechanics. All vehicle skins, mascot outfits, and seasonal themes are earned purely through study milestones.',
      ar: 'صُممت منصة madingo لطلاب وأساتذة جامعة مادي وتُقدم مجاناً بنسبة 100% دون أي مشتريات مدفوعة. جميع المكافآت التجميلية تُفتح حصرياً عبر الإنجازات الدراسية.',
      fr: 'madingo est conçu pour les étudiants et enseignants de MADI et reste 100 % gratuit, sans achats intégrés. Toutes les récompenses cosmétiques se débloquent uniquement par l’apprentissage.',
    },
  },
  {
    id: 'copyright',
    title: {
      ru: 'Политика авторского права и лицензирования контента',
      en: 'Content & Copyright Policy',
      ar: 'سياسة حقوق النشر وترخيص المحتوى',
      fr: 'Politique de droit d’auteur et de licence des contenus',
    },
    body: {
      ru: 'На платформе публикуются только авторские материалы преподавателей МАДИ, оригинальные иллюстрации и тексты общественного достояния с указанием лицензии. Сторонние видео из социальных сетей строго запрещены. Любой пользователь может отправить уведомление о проверке материала кнопкой «Сообщить».',
      en: 'Only MADI educator-authored materials, original studio scenes, and verified public-domain/openly licensed works with stored license metadata are permitted. Third-party social media scraping or embedding is strictly prohibited. Any material can be flagged for immediate moderator review.',
      ar: 'يُسمح فقط بنشر المواد الأصلية لمدرسي مادي والمشاهد المبتكرة والأعمال ذات الملكية العامة الموثقة. يُمنع منعاً باتاً تضمين مقاطع منصات التواصل الخارجية.',
      fr: 'Seuls les supports originaux des enseignants MADI, les scènes originales et les œuvres du domaine public avec licence vérifiée sont autorisés.',
    },
  },
  {
    id: 'voice_consent',
    title: {
      ru: 'Согласие на обработку голосовых записей (Окно «Говорить»)',
      en: 'Voice Recording Consent Policy',
      ar: 'سياسة الموافقة على التسجيلات الصوتية',
      fr: 'Politique de consentement aux enregistrements vocaux',
    },
    body: {
      ru: 'По умолчанию голосовые записи в режиме «Повторяй за мной» удаляются сразу после автоматического расчёта оценки произношения; в базе сохраняются только баллы. Сохранение аудио для повторного прослушивания включается только по явному выбору студента.',
      en: 'By default, voice recordings in Repeat-After-Me and speaking exams are deleted immediately after server-side pronunciation scoring; only numeric scores are stored. Audio retention is strictly opt-in and can be revoked at any time.',
      ar: 'افتراضياً، يتم حذف التسجيلات الصوتية فوراً بعد حساب درجة النطق، ولا يتم حفظ سوى الدرجات الرقمية ما لم يختر الطالب حفظ الصوت صراحةً.',
      fr: 'Par défaut, les enregistrements vocaux sont supprimés immédiatement après le calcul du score de prononciation ; seuls les scores numériques sont conservés.',
    },
  },
  {
    id: 'certificate_disclaimer',
    title: {
      ru: 'Официальная оговорка о статусе сертификатов madingo',
      en: 'Certificate Legal Disclaimer',
      ar: 'إخلاء المسؤولية القانوني للشهادات',
      fr: 'Mention légale relative aux certificats',
    },
    body: {
      ru: DEFAULT_CERTIFICATE_DISCLAIMER,
      en: DEFAULT_CERTIFICATE_DISCLAIMER,
      ar: 'صادر عن منصة Madingo التعليمية التابعة لجامعة مادي (MADI). هذه شهادة إتمام دورة تدريبية وليست شهادة اختبار حكومي رسمي للغة.',
      fr: 'Délivré par la plateforme d’apprentissage Madingo de MADI. Ceci est un certificat de réussite de cours et non un certificat d’État officiel.',
    },
  },
];

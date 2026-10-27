// ============================================================================
// MADINGO PHASE 3 — SEED DATA
// 1. 30 Original Speaking Clips (A1–A2) with strict legal/consent metadata
// 2. 6 Branching Role-Play Conversation Scenarios (3 difficulty levels each)
// 3. 20 Public-Domain / Original MADI Library Entries (multi-page readable)
// 4. Teacher Groups, Students, Assignments, Announcements, Review Queue & Audit Log
// ============================================================================

import {
  AI_EDITORIAL_ATTRIBUTION,
  ClipSourceType,
  ReviewStatus,
  UserRole,
} from '../lib/phase3Engine';

export type SpeakingTopic =
  | 'campus'
  | 'metro'
  | 'taxi'
  | 'food'
  | 'shopping'
  | 'cars_roads'
  | 'street_speech';

export interface SpeakingClipWordTiming {
  word: string; // with stress mark
  startSec: number;
  endSec: number;
}

export interface SpeakingClip {
  id: string;
  title: { ru: string; en: string; ar: string; fr: string };
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  topic: SpeakingTopic;
  grammarPoint: string;
  durationSec: number; // max 15s
  register: 'formal' | 'colloquial';
  registerNote: { ru: string; en: string; ar: string; fr: string };
  russianSubtitle: string; // with stress marks
  translations: {
    ru: string;
    en: string;
    ar: string;
    fr: string;
  };
  wordTimings: SpeakingClipWordTiming[];
  targetWeakCases?: string[];
  targetWeakWords?: string[];
  sceneTheme: 'campus' | 'metro' | 'taxi' | 'cafe' | 'garage' | 'dorm' | 'shop' | 'bridge';
  characterSpeaker: 'Misha' | 'Instructor' | 'Student A' | 'Student B' | 'Dispatcher' | 'Barista';
  // Strict Legal & Consent Metadata
  sourceType: ClipSourceType;
  license: string;
  sourceUrl?: string;
  author: string;
  consentConfirmed: boolean;
  consentDocumentUrl?: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewStatus: ReviewStatus;
}

function buildWordTimings(sentence: string, totalDurationSec: number): SpeakingClipWordTiming[] {
  const words = sentence.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const step = totalDurationSec / words.length;
  return words.map((w, idx) => ({
    word: w,
    startSec: Math.round(idx * step * 100) / 100,
    endSec: Math.round((idx + 1) * step * 100) / 100,
  }));
}

const RAW_CLIPS: Omit<SpeakingClip, 'wordTimings'>[] = [
  {
    id: 'clip-01',
    title: {
      ru: 'У гла́вного вхо́да в МАДИ́',
      en: 'At the Main Entrance of MADI',
      ar: 'عند المدخل الرئيسي لجامعة مادي',
      fr: 'À l’entrée principale de MADI',
    },
    level: 'A1',
    topic: 'campus',
    grammarPoint: 'Prepositional Case (в/на)',
    durationSec: 4.5,
    register: 'formal',
    registerNote: {
      ru: 'Вежливое приветствие преподавателя или сотрудника кампуса («Здра́вствуйте»).',
      en: 'Polite formal greeting for professors or university staff ("Здра́вствуйте").',
      ar: 'تحية رسمية مهذبة للأساتذة أو موظفي الجامعة.',
      fr: 'Salutation formelle polie pour les professeurs ou le personnel.',
    },
    russianSubtitle: 'Здра́вствуйте! Я но́вый студе́нт и учу́сь в МАДИ́.',
    translations: {
      ru: 'Здра́вствуйте! Я но́вый студе́нт и учу́сь в МАДИ́.',
      en: 'Hello! I am a new student and I study at MADI.',
      ar: 'مرحباً! أنا طالب جديد وأدرس في جامعة مادي.',
      fr: 'Bonjour ! Je suis un nouvel étudiant et j’étudie à MADI.',
    },
    targetWeakCases: ['Prepositional'],
    targetWeakWords: ['студе́нт', 'учи́ться'],
    sceneTheme: 'campus',
    characterSpeaker: 'Student A',
    sourceType: 'madi_creator',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-10T09:00:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-02',
    title: {
      ru: 'Доро́га к ста́нции метро́ Аэропо́рт',
      en: 'Way to Aeroport Metro Station',
      ar: 'الطريق إلى محطة مترو أيروبورت',
      fr: 'Chemin vers la station de métro Aeroport',
    },
    level: 'A1',
    topic: 'metro',
    grammarPoint: 'Nominative & Question Words',
    durationSec: 4.2,
    register: 'formal',
    registerNote: {
      ru: 'Используйте «Скажи́те, пожа́луйста» при обращении к незнакомым людям на улице.',
      en: 'Use "Скажи́те, пожа́луйста" when asking strangers for directions on the street.',
      ar: 'استخدم "Скажи́те, пожа́луйста" عند سؤال الغرباء عن الاتجاهات.',
      fr: 'Utilisez « Скажи́те, пожа́луйста » pour demander votre chemin aux passants.',
    },
    russianSubtitle: 'Скажи́те, пожа́луйста, где ста́нция метро́ Аэропо́рт?',
    translations: {
      ru: 'Скажи́те, пожа́луйста, где ста́нция метро́ Аэропо́рт?',
      en: 'Tell me, please, where is the Aeroport metro station?',
      ar: 'قل لي من فضلك، أين محطة مترو أيروبورت؟',
      fr: 'Dites-moi, s’il vous plaît, où est la station de métro Aeroport ?',
    },
    targetWeakCases: ['Nominative'],
    targetWeakWords: ['метро́', 'ста́нция'],
    sceneTheme: 'metro',
    characterSpeaker: 'Student B',
    sourceType: 'madi_creator',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-10T09:15:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-03',
    title: {
      ru: 'Зака́з ко́фе в студе́нческом буфе́те',
      en: 'Ordering Coffee at the Student Buffet',
      ar: 'طلب القهوة في بوفيه الطلاب',
      fr: 'Commander un café à la cafétéria étudiante',
    },
    level: 'A1',
    topic: 'food',
    grammarPoint: 'Accusative Case (Direct Object)',
    durationSec: 4.8,
    register: 'formal',
    registerNote: {
      ru: 'Стандартная вежливая форма заказа в кафе или столовой.',
      en: 'Standard polite phrasing when ordering at a cafe or canteen.',
      ar: 'صيغة مهذبة قياسية عند الطلب في المقهى أو الكافتيريا.',
      fr: 'Formule polie standard pour commander au café ou à la cantine.',
    },
    russianSubtitle: 'Да́йте, пожа́луйста, ча́шку горя́чего ко́фе и бу́лочку.',
    translations: {
      ru: 'Да́йте, пожа́луйста, ча́шку горя́чего ко́фе и бу́лочку.',
      en: 'Please give me a cup of hot coffee and a bun.',
      ar: 'أعطني من فضلك فنجان قهوة ساخنة وكعكة.',
      fr: 'Donnez-moi, s’il vous plaît, une tasse de café chaud et une brioche.',
    },
    targetWeakCases: ['Accusative', 'Genitive'],
    targetWeakWords: ['ко́фе', 'ча́шка'],
    sceneTheme: 'cafe',
    characterSpeaker: 'Barista',
    sourceType: 'ai_original',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-10T10:00:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-04',
    title: {
      ru: 'Приве́тствие одногру́ппника',
      en: 'Greeting a Classmate',
      ar: 'تحية زميل الدراسة',
      fr: 'Saluer un camarade de classe',
    },
    level: 'A1',
    topic: 'street_speech',
    grammarPoint: 'Colloquial Greetings',
    durationSec: 3.8,
    register: 'colloquial',
    registerNote: {
      ru: 'Разговорный стиль («Приве́т! Как дела́?») подходит только для друзей и ровесников.',
      en: 'Informal register ("Приве́т! Как дела́?") — use only with friends and peers.',
      ar: 'أسلوب غير رسمي ("Приве́т!") — يُستخدم فقط مع الأصدقاء والزملاء.',
      fr: 'Registre familier (« Приве́т ! ») — à utiliser uniquement avec des amis.',
    },
    russianSubtitle: 'Приве́т! Как дела́? Ты идёшь на ле́кцию сего́дня?',
    translations: {
      ru: 'Приве́т! Как дела́? Ты идёшь на ле́кцию сего́дня?',
      en: 'Hi! How is it going? Are you going to the lecture today?',
      ar: 'أهلاً! كيف الحال؟ هل أنت ذاهب إلى المحاضرة اليوم؟',
      fr: 'Salut ! Comment ça va ? Tu vas au cours aujourd’hui ?',
    },
    targetWeakCases: ['Accusative'],
    targetWeakWords: ['ле́кция', 'сего́дня'],
    sceneTheme: 'campus',
    characterSpeaker: 'Misha',
    sourceType: 'ai_original',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-10T10:20:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-05',
    title: {
      ru: 'Поездка на такси́ по Ленингра́дскому проспе́кту',
      en: 'Taxi Ride on Leningradsky Prospekt',
      ar: 'رحلة تاكسي في شارع لينينغرادسكي',
      fr: 'Trajet en taxi sur la perspective Leningradski',
    },
    level: 'A1',
    topic: 'taxi',
    grammarPoint: 'Dative / Prepositional Direction',
    durationSec: 5.2,
    register: 'formal',
    registerNote: {
      ru: 'Обращение к водителю такси всегда на «Вы».',
      en: 'Always address taxi drivers formally with "Вы" / polite imperatives.',
      ar: 'خاطب سائق التاكسي دائماً بصيغة الاحترام الرسمية.',
      fr: 'Adressez-vous toujours au chauffeur de taxi avec le « Вы » de politesse.',
    },
    russianSubtitle: 'Останови́те, пожа́луйста, у гла́вного ко́рпуса университе́та.',
    translations: {
      ru: 'Останови́те, пожа́луйста, у гла́вного ко́рпуса университе́та.',
      en: 'Please stop by the main building of the university.',
      ar: 'توقف من فضلك عند المبنى الرئيسي للجامعة.',
      fr: 'Arrêtez-vous, s’il vous plaît, près du bâtiment principal de l’université.',
    },
    targetWeakCases: ['Genitive'],
    targetWeakWords: ['университе́т', 'останови́ть'],
    sceneTheme: 'taxi',
    characterSpeaker: 'Student B',
    sourceType: 'madi_creator',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-11T08:00:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-06',
    title: {
      ru: 'Проверка двига́теля в лаборато́рии',
      en: 'Checking the Engine in the Lab',
      ar: 'فحص المحرك في المختبر',
      fr: 'Vérification du moteur au laboratoire',
    },
    level: 'A2',
    topic: 'cars_roads',
    grammarPoint: 'Prepositional & Instrumental Cases',
    durationSec: 5.5,
    register: 'formal',
    registerNote: {
      ru: 'Инженерная терминология МАДИ: точная и нейтрально-деловая речь.',
      en: 'MADI engineering terminology: clear technical and professional register.',
      ar: 'مصطلحات هندسية في مادي: لغة تقنية ومهنية واضحة.',
      fr: 'Terminologie d’ingénierie MADI : registre technique et professionnel.',
    },
    russianSubtitle: 'Э́тот двига́тель рабо́тает на бензи́не о́чень ти́хо и надёжно.',
    translations: {
      ru: 'Э́тот двига́тель рабо́тает на бензи́не о́чень ти́хо и надёжно.',
      en: 'This engine runs on gasoline very quietly and reliably.',
      ar: 'هذا المحرك يعمل بالبنزين بهدوء وموثوقية عالية.',
      fr: 'Ce moteur fonctionne à l’essence de manière très silencieuse et fiable.',
    },
    targetWeakCases: ['Prepositional'],
    targetWeakWords: ['двига́тель', 'бензи́н'],
    sceneTheme: 'garage',
    characterSpeaker: 'Instructor',
    sourceType: 'madi_creator',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-11T08:30:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-07',
    title: {
      ru: 'Поку́пка ка́рты «Тро́йка» в ка́ссе',
      en: 'Buying a Troika Card at the Ticket Office',
      ar: 'شراء بطاقة ترويكا من شباك التذاكر',
      fr: 'Acheter une carte Troïka au guichet',
    },
    level: 'A1',
    topic: 'metro',
    grammarPoint: 'Accusative & Instrumental',
    durationSec: 4.8,
    register: 'formal',
    registerNote: {
      ru: 'Полезная фраза для оплаты банковской картой в кассах метро.',
      en: 'Essential phrase for paying by bank card at metro ticket counters.',
      ar: 'عبارة أساسية للدفع بالبطاقة البنكية في شبابيك المترو.',
      fr: 'Phrase essentielle pour payer par carte bancaire au guichet du métro.',
    },
    russianSubtitle: 'Мне нужна́ ка́рта «Тро́йка», я бу́ду плати́ть ка́ртой.',
    translations: {
      ru: 'Мне нужна́ ка́рта «Тро́йка», я бу́ду плати́ть ка́ртой.',
      en: 'I need a Troika card; I will pay by card.',
      ar: 'أحتاج إلى بطاقة ترويكا، سأدفع بالبطاقة.',
      fr: 'J’ai besoin d’une carte Troïka, je vais payer par carte.',
    },
    targetWeakCases: ['Instrumental', 'Dative'],
    targetWeakWords: ['ка́рта', 'плати́ть'],
    sceneTheme: 'metro',
    characterSpeaker: 'Student A',
    sourceType: 'open_license',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-11T09:00:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-08',
    title: {
      ru: 'На перекрёстке у светофо́ра',
      en: 'At the Intersection by the Traffic Light',
      ar: 'عند التقاطع بجانب إشارة المرور',
      fr: 'Au carrefour près du feu de circulation',
    },
    level: 'A2',
    topic: 'cars_roads',
    grammarPoint: 'Genitive after Prepositions (у, по́сле)',
    durationSec: 5.0,
    register: 'formal',
    registerNote: {
      ru: 'Ориентирование в городе и правила дорожного движения.',
      en: 'City navigation and road traffic terminology.',
      ar: 'التنقل في المدينة ومصطلحات المرور.',
      fr: 'Orientation en ville et terminologie de la circulation routière.',
    },
    russianSubtitle: 'Поверни́те напра́во на перекрёстке по́сле светофо́ра.',
    translations: {
      ru: 'Поверни́те напра́во на перекрёстке по́сле светофо́ра.',
      en: 'Turn right at the intersection after the traffic light.',
      ar: 'انعطف يميناً عند التقاطع بعد إشارة المرور.',
      fr: 'Tournez à droite au carrefour après le feu tricolore.',
    },
    targetWeakCases: ['Prepositional', 'Genitive'],
    targetWeakWords: ['перекрёсток', 'светофо́р'],
    sceneTheme: 'taxi',
    characterSpeaker: 'Misha',
    sourceType: 'ai_original',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-11T10:00:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-09',
    title: {
      ru: 'В продукто́вом магази́не',
      en: 'At the Grocery Store',
      ar: 'في متجر البقالة',
      fr: 'À l’épicerie',
    },
    level: 'A1',
    topic: 'shopping',
    grammarPoint: 'Asking Price (Ско́лько сто́ит)',
    durationSec: 4.3,
    register: 'formal',
    registerNote: {
      ru: '«Ско́лько сто́ит» используется с единственным числом, «Ско́лько сто́ят» — со множественным.',
      en: 'Use "Ско́лько сто́ит" for singular items and "Ско́лько сто́ят" for plural.',
      ar: 'استخدم "Ско́лько сто́ит" للمفرد و "Ско́лько сто́ят" للجمع.',
      fr: 'Utilisez « Ско́лько сто́ит » au singulier et « Ско́лько сто́ят » au pluriel.',
    },
    russianSubtitle: 'Скажи́те, ско́лько сто́ит э́тот све́жий хлеб и молоко́?',
    translations: {
      ru: 'Скажи́те, ско́лько сто́ит э́тот све́жий хлеб и молоко́?',
      en: 'Tell me, how much does this fresh bread and milk cost?',
      ar: 'قل لي، كم سعر هذا الخبز الطازج والحليب؟',
      fr: 'Dites-moi, combien coûtent ce pain frais et ce lait ?',
    },
    targetWeakCases: ['Nominative'],
    targetWeakWords: ['хлеб', 'молоко́'],
    sceneTheme: 'shop',
    characterSpeaker: 'Student A',
    sourceType: 'madi_creator',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-11T11:00:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-10',
    title: {
      ru: 'В общежи́тии на ва́хте',
      en: 'At the Dormitory Reception Desk',
      ar: 'في مكتب استقبال السكن الجامعي',
      fr: 'À la réception de la résidence universitaire',
    },
    level: 'A1',
    topic: 'campus',
    grammarPoint: 'Genitive of Possession & Prepositional',
    durationSec: 4.9,
    register: 'formal',
    registerNote: {
      ru: 'На вахте общежития принято обращаться вежливо и показывать студенческий пропуск.',
      en: 'At the dormitory desk, speak politely and show your student pass.',
      ar: 'في استقبال السكن الجامعي، تحدث بأدب وأبرز بطاقة الطالب.',
      fr: 'À l’accueil de la résidence, parlez poliment et présentez votre carte.',
    },
    russianSubtitle: 'Вот мой студе́нческий про́пуск, я живу́ на пя́том этаже́.',
    translations: {
      ru: 'Вот мой студе́нческий про́пуск, я живу́ на пя́том этаже́.',
      en: 'Here is my student pass; I live on the fifth floor.',
      ar: 'ها هي بطاقة الطالب الخاصة بي، أنا أسكن في الطابق الخامس.',
      fr: 'Voici mon laissez-passer étudiant, j’habite au cinquième étage.',
    },
    targetWeakCases: ['Prepositional'],
    targetWeakWords: ['общежи́тие', 'эта́ж'],
    sceneTheme: 'dorm',
    characterSpeaker: 'Student B',
    sourceType: 'madi_creator',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-11T11:30:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-11',
    title: {
      ru: 'Строи́тельство но́вого моста́',
      en: 'Building a New Bridge',
      ar: 'بناء جسر جديد',
      fr: 'Construction d’un nouveau pont',
    },
    level: 'A2',
    topic: 'cars_roads',
    grammarPoint: 'Accusative & Instrumental Plural',
    durationSec: 5.8,
    register: 'formal',
    registerNote: {
      ru: 'Учебная фраза для студентов дорожно-строительного факультета МАДИ.',
      en: 'Academic phrase for MADI Road & Bridge Construction faculty students.',
      ar: 'عبارة أكاديمية لطلاب كلية بناء الطرق والجسور في مادي.',
      fr: 'Phrase académique pour les étudiants de la faculté des ponts et chaussées.',
    },
    russianSubtitle: 'Инжене́ры стро́ят широ́кий мост че́рез большу́ю реку́.',
    translations: {
      ru: 'Инжене́ры стро́ят широ́кий мост че́рез большу́ю реку́.',
      en: 'Engineers are building a wide bridge across the big river.',
      ar: 'يبني المهندسون جسراً عريضاً عبر النهر الكبير.',
      fr: 'Les ingénieurs construisent un large pont sur le grand fleuve.',
    },
    targetWeakCases: ['Accusative'],
    targetWeakWords: ['инжене́р', 'мост', 'доро́га'],
    sceneTheme: 'bridge',
    characterSpeaker: 'Instructor',
    sourceType: 'madi_creator',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-12T08:00:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-12',
    title: {
      ru: 'Запра́вка автомоби́ля на тра́ссе',
      en: 'Refueling a Car on the Highway',
      ar: 'تزويد السيارة بالوقود على الطريق السريع',
      fr: 'Faire le plein sur l’autoroute',
    },
    level: 'A2',
    topic: 'cars_roads',
    grammarPoint: 'Genitive of Quantity (ли́тров бензи́на)',
    durationSec: 5.1,
    register: 'formal',
    registerNote: {
      ru: 'После числительных 5–20 существительное ставится в родительный падеж множественного числа.',
      en: 'After numbers 5–20, nouns take the Genitive plural ("два́дцать ли́тров бензи́на").',
      ar: 'بعد الأعداد من 5 إلى 20 يأتي الاسم في حالة المضاف إليه للجمع.',
      fr: 'Après les nombres 5 à 20, le nom se met au génitif pluriel.',
    },
    russianSubtitle: 'Два́дцать ли́тров бензи́на на втору́ю коло́нку, пожа́луйста.',
    translations: {
      ru: 'Два́дцать ли́тров бензи́на на втору́ю коло́нку, пожа́луйста.',
      en: 'Twenty liters of gasoline on pump number two, please.',
      ar: 'عشرون لتراً من البنزين على المضخة الثانية، من فضلك.',
      fr: 'Vingt litres d’essence à la pompe numéro deux, s’il vous plaît.',
    },
    targetWeakCases: ['Genitive', 'Accusative'],
    targetWeakWords: ['бензи́н', 'колесо́'],
    sceneTheme: 'garage',
    characterSpeaker: 'Misha',
    sourceType: 'ai_original',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-12T08:30:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-13',
    title: {
      ru: 'Бы́стрый переку́с ме́жду па́рами',
      en: 'Quick Snack Between Classes',
      ar: 'وجبة خفيفة سريعة بين المحاضرات',
      fr: 'Pause rapide entre deux cours',
    },
    level: 'A1',
    topic: 'street_speech',
    grammarPoint: 'Colloquial Invitation (Пойдём)',
    durationSec: 4.1,
    register: 'colloquial',
    registerNote: {
      ru: 'Слово «па́ра» в студенческом сленге означает одно занятие (90 минут).',
      en: 'In Russian student slang, "па́ра" means a 90-minute university class block.',
      ar: 'في لغة الطلاب الروسية، كلمة "па́ра" تعني حصة جامعية مدتها 90 دقيقة.',
      fr: 'Dans l’argot étudiant russe, « па́ра » désigne un cours de 90 minutes.',
    },
    russianSubtitle: 'У нас переры́в! Пойдём в столо́вую, я о́чень хочу́ есть.',
    translations: {
      ru: 'У нас переры́в! Пойдём в столо́вую, я о́чень хочу́ есть.',
      en: 'We have a break! Let’s go to the canteen, I am very hungry.',
      ar: 'لدينا استراحة! لنذهب إلى الكافتيريا، أنا جائع جداً.',
      fr: 'On a une pause ! Allons à la cantine, j’ai très faim.',
    },
    targetWeakCases: ['Accusative'],
    targetWeakWords: ['столо́вая', 'обе́д'],
    sceneTheme: 'cafe',
    characterSpeaker: 'Student A',
    sourceType: 'ai_original',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-12T09:00:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-14',
    title: {
      ru: 'Переса́дка в моско́вском метро́',
      en: 'Transferring in the Moscow Metro',
      ar: 'التبديل في مترو موسكو',
      fr: 'Correspondance dans le métro de Moscou',
    },
    level: 'A2',
    topic: 'metro',
    grammarPoint: 'Motion Verbs (перейти́ на)',
    durationSec: 5.0,
    register: 'formal',
    registerNote: {
      ru: 'Полезный вопрос, чтобы найти переход на Кольцевую линию метро.',
      en: 'Useful question to find the transfer to the Circle Line in the metro.',
      ar: 'سؤال مفيد للعثور على الانتقال إلى الخط الدائري في المترو.',
      fr: 'Question utile pour trouver la correspondance vers la ligne circulaire.',
    },
    russianSubtitle: 'Подскажи́те, как перейти́ на Кольцеву́ю ли́нию метро́?',
    translations: {
      ru: 'Подскажи́те, как перейти́ на Кольцеву́ю ли́нию метро́?',
      en: 'Could you tell me how to transfer to the Circle Line of the metro?',
      ar: 'هلّا أخبرتني كيف أنتقل إلى الخط الدائري في المترو؟',
      fr: 'Pourriez-vous m’indiquer comment passer sur la ligne circulaire ?',
    },
    targetWeakCases: ['Accusative'],
    targetWeakWords: ['метро́', 'идти́'],
    sceneTheme: 'metro',
    characterSpeaker: 'Student B',
    sourceType: 'open_license',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-12T09:30:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-15',
    title: {
      ru: 'Расписа́ние экза́менов на кафе́дре',
      en: 'Exam Schedule at the Department',
      ar: 'جدول الامتحانات في القسم',
      fr: 'Calendrier des examens au département',
    },
    level: 'A2',
    topic: 'campus',
    grammarPoint: 'Instrumental & Prepositional',
    durationSec: 4.9,
    register: 'formal',
    registerNote: {
      ru: 'Официальный вопрос на кафедре или в деканате.',
      en: 'Formal academic question at a university department or dean’s office.',
      ar: 'سؤال أكاديمي رسمي في القسم أو عمادة الكلية.',
      fr: 'Question académique formelle au département ou au décanat.',
    },
    russianSubtitle: 'Извини́те, когда́ начина́ется экза́мен по ру́сскому языку́?',
    translations: {
      ru: 'Извини́те, когда́ начина́ется экза́мен по ру́сскому языку́?',
      en: 'Excuse me, when does the Russian language exam start?',
      ar: 'عفواً، متى يبدأ امتحان اللغة الروسية؟',
      fr: 'Excusez-moi, quand commence l’examen de langue russe ?',
    },
    targetWeakCases: ['Dative'],
    targetWeakWords: ['экза́мен', 'учи́тель'],
    sceneTheme: 'campus',
    characterSpeaker: 'Student A',
    sourceType: 'madi_creator',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-12T10:00:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-16',
    title: {
      ru: 'Зи́мние ши́ны и тормоза́',
      en: 'Winter Tires and Brakes',
      ar: 'إطارات الشتاء والفرامل',
      fr: 'Pneus d’hiver et freins',
    },
    level: 'A2',
    topic: 'cars_roads',
    grammarPoint: 'Instrumental Time (зимо́й) & Accusative',
    durationSec: 5.4,
    register: 'formal',
    registerNote: {
      ru: 'Важное правило безопасности на зимних дорогах России.',
      en: 'Essential winter road safety vocabulary in Russia.',
      ar: 'مفردات أساسية للسلامة المرورية الشتوية في روسيا.',
      fr: 'Vocabulaire essentiel de la sécurité routière en hiver en Russie.',
    },
    russianSubtitle: 'Зимо́й на ско́льзкой доро́ге ну́жно прове́рить тормоза́ и колёса.',
    translations: {
      ru: 'Зимо́й на ско́льзкой доро́ге ну́жно прове́рить тормоза́ и колёса.',
      en: 'In winter on a slippery road, you must check the brakes and wheels.',
      ar: 'في الشتاء على الطريق الزلق يجب فحص الفرامل والعجلات.',
      fr: 'En hiver sur une route glissante, il faut vérifier les freins et les roues.',
    },
    targetWeakCases: ['Prepositional', 'Accusative'],
    targetWeakWords: ['то́рмоз', 'колесо́', 'доро́га'],
    sceneTheme: 'garage',
    characterSpeaker: 'Misha',
    sourceType: 'madi_creator',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-12T11:00:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-17',
    title: {
      ru: 'Поку́пка тёплой ку́ртки',
      en: 'Buying a Warm Winter Jacket',
      ar: 'شراء سترة شتوية دافئة',
      fr: 'Acheter une veste chaude d’hiver',
    },
    level: 'A2',
    topic: 'shopping',
    grammarPoint: 'Dative of Need (Мне нужна́)',
    durationSec: 4.7,
    register: 'formal',
    registerNote: {
      ru: 'В магазине одежды: как попросить нужный размер.',
      en: 'At a clothing store: how to ask for your size politely.',
      ar: 'في متجر الملابس: كيف تطلب مقاسك بأدب.',
      fr: 'Dans un magasin de vêtements : comment demander sa taille.',
    },
    russianSubtitle: 'Мо́жно приме́рить э́ту тёплую ку́ртку сре́днего разме́ра?',
    translations: {
      ru: 'Мо́жно приме́рить э́ту тёплую ку́ртку сре́днего разме́ра?',
      en: 'May I try on this warm medium-sized jacket?',
      ar: 'هل يمكنني قياس هذه السترة الدافئة ذات المقاس المتوسط؟',
      fr: 'Puis-je essayer cette veste chaude de taille moyenne ?',
    },
    targetWeakCases: ['Accusative', 'Genitive'],
    targetWeakWords: ['магази́н'],
    sceneTheme: 'shop',
    characterSpeaker: 'Student B',
    sourceType: 'ai_original',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-12T11:30:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-18',
    title: {
      ru: 'Обе́д в студе́нческой столо́вой',
      en: 'Lunch in the Student Canteen',
      ar: 'الغداء في كافتيريا الطلاب',
      fr: 'Déjeuner à la cantine universitaire',
    },
    level: 'A1',
    topic: 'food',
    grammarPoint: 'Instrumental (с чем)',
    durationSec: 4.6,
    register: 'formal',
    registerNote: {
      ru: 'Предлог «с» требует творительного падежа («с лимо́ном», «с мя́сом»).',
      en: 'The preposition "с" (with) requires the Instrumental case ("с лимо́ном").',
      ar: 'حرف الجر "с" (مع) يتطلب حالة الأداة ("с лимо́ном").',
      fr: 'La préposition « с » (avec) exige le cas instrumental (« с лимо́ном »).',
    },
    russianSubtitle: 'Я возьму́ горя́чий борщ, рис с ку́рицей и чай с лимо́ном.',
    translations: {
      ru: 'Я возьму́ горя́чий борщ, рис с ку́рицей и чай с лимо́ном.',
      en: 'I will take hot borscht, rice with chicken, and tea with lemon.',
      ar: 'سآخذ حساء بورش ساخناً، وأرزاً بالدجاج، وشاياً بالليمون.',
      fr: 'Je vais prendre du bortsch chaud, du riz au poulet et du thé au citron.',
    },
    targetWeakCases: ['Instrumental', 'Accusative'],
    targetWeakWords: ['чай', 'обе́д'],
    sceneTheme: 'cafe',
    characterSpeaker: 'Student A',
    sourceType: 'madi_creator',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-13T08:00:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-19',
    title: {
      ru: 'Где чита́льный зал библиоте́ки?',
      en: 'Where is the Library Reading Room?',
      ar: 'أين قاعة القراءة في المكتبة؟',
      fr: 'Où est la salle de lecture de la bibliothèque ?',
    },
    level: 'A1',
    topic: 'campus',
    grammarPoint: 'Prepositional Location',
    durationSec: 4.5,
    register: 'formal',
    registerNote: {
      ru: 'Ориентация внутри учебного корпуса МАДИ.',
      en: 'Finding your way inside the MADI academic building.',
      ar: 'إيجاد الطريق داخل المبنى الأكاديمي لجامعة مادي.',
      fr: 'S’orienter à l’intérieur du bâtiment académique de MADI.',
    },
    russianSubtitle: 'Чита́льный зал библиоте́ки нахо́дится на тре́тьем этаже́ спра́ва.',
    translations: {
      ru: 'Чита́льный зал библиоте́ки нахо́дится на тре́тьем этаже́ спра́ва.',
      en: 'The library reading room is located on the third floor on the right.',
      ar: 'تقع قاعة القراءة بالمكتبة في الطابق الثالث على اليمين.',
      fr: 'La salle de lecture de la bibliothèque se trouve au troisième étage à droite.',
    },
    targetWeakCases: ['Prepositional', 'Genitive'],
    targetWeakWords: ['библиоте́ка', 'кни́га'],
    sceneTheme: 'campus',
    characterSpeaker: 'Instructor',
    sourceType: 'madi_creator',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-13T08:30:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-20',
    title: {
      ru: 'Вы́зов такси́ в дождли́вую пого́ду',
      en: 'Calling a Taxi in Rainy Weather',
      ar: 'طلب تاكسي في الطقس الممطر',
      fr: 'Appeler un taxi par temps de pluie',
    },
    level: 'A2',
    topic: 'taxi',
    grammarPoint: 'Genitive From-To (от ... до ...)',
    durationSec: 5.3,
    register: 'formal',
    registerNote: {
      ru: 'Конструкция «от ... до ...» всегда требует родительного падежа.',
      en: 'The construction "от ... до ..." (from ... to ...) always requires Genitive.',
      ar: 'التركيب "от ... до ..." (من ... إلى ...) يتطلب دائماً حالة المضاف إليه.',
      fr: 'La construction « от ... до ... » (de ... à ...) exige toujours le génitif.',
    },
    russianSubtitle: 'Ско́лько вре́мени мы бу́дем е́хать от общежи́тия до вокза́ла?',
    translations: {
      ru: 'Ско́лько вре́мени мы бу́дем е́хать от общежи́тия до вокза́ла?',
      en: 'How long will it take us to drive from the dormitory to the train station?',
      ar: 'كم من الوقت سنستغرق بالسيارة من السكن الجامعي إلى محطة القطار؟',
      fr: 'Combien de temps mettrons-nous en voiture de la résidence à la gare ?',
    },
    targetWeakCases: ['Genitive'],
    targetWeakWords: ['е́хать', 'общежи́тие'],
    sceneTheme: 'taxi',
    characterSpeaker: 'Dispatcher',
    sourceType: 'ai_original',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-13T09:00:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-21',
    title: {
      ru: 'Дру́жеская встре́ча у метро́',
      en: 'Friendly Meetup by the Metro',
      ar: 'لقاء ودي عند المترو',
      fr: 'Rendez-vous amical près du métro',
    },
    level: 'A1',
    topic: 'street_speech',
    grammarPoint: 'Colloquial Time & Location',
    durationSec: 4.0,
    register: 'colloquial',
    registerNote: {
      ru: 'Живая разговорная речь студентов при встрече после учёбы.',
      en: 'Natural everyday student speech when meeting up after classes.',
      ar: 'كلام يومي طبيعي للطلاب عند اللقاء بعد الدراسة.',
      fr: 'Langage étudiant courant lors d’une rencontre après les cours.',
    },
    russianSubtitle: 'Я уже́ выхожу́ из ваго́на, жди меня́ у вы́хода!',
    translations: {
      ru: 'Я уже́ выхожу́ из ваго́на, жди меня́ у вы́хода!',
      en: 'I am already stepping out of the train car, wait for me by the exit!',
      ar: 'أنا أخرج الآن من عربة القطار، انتظرني عند المخرج!',
      fr: 'Je sors déjà du wagon, attends-moi près de la sortie !',
    },
    targetWeakCases: ['Genitive', 'Accusative'],
    targetWeakWords: ['метро́', 'вы́ход'],
    sceneTheme: 'metro',
    characterSpeaker: 'Student B',
    sourceType: 'ai_original',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-13T09:30:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-22',
    title: {
      ru: 'Скоростна́я автомагистра́ль и шоссе́',
      en: 'High-Speed Highway and Roadway',
      ar: 'الطريق السريع والأوتوستراد',
      fr: 'Autoroute à grande vitesse et chaussée',
    },
    level: 'A2',
    topic: 'cars_roads',
    grammarPoint: 'Dative with по (по но́вому шоссе́)',
    durationSec: 5.5,
    register: 'formal',
    registerNote: {
      ru: 'Слово «шоссе́» не изменяется по падежам, но прилагательное перед ним склоняется!',
      en: 'Note: "шоссе́" is indeclinable, while the adjective before it changes case!',
      ar: 'ملاحظة: كلمة "шоссе́" لا تتغير حسب الحالة الإعرابية، لكن الصفة قبلها تتغير!',
      fr: 'Note : « шоссе́ » est indéclinable, mais l’adjectif qui le précède se décline !',
    },
    russianSubtitle: 'Авто́бусы и грузовики́ бы́стро е́дут по но́вому широ́кому шоссе́.',
    translations: {
      ru: 'Авто́бусы и грузовики́ бы́стро е́дут по но́вому широ́кому шоссе́.',
      en: 'Buses and trucks drive quickly along the new wide highway.',
      ar: 'تسير الحافلات والشاحنات بسرعة على الطريق السريع الجديد الواسع.',
      fr: 'Les bus et les camions roulent vite sur la nouvelle large autoroute.',
    },
    targetWeakCases: ['Dative'],
    targetWeakWords: ['шоссе́', 'авто́бус', 'грузови́к'],
    sceneTheme: 'bridge',
    characterSpeaker: 'Instructor',
    sourceType: 'madi_creator',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-13T10:00:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-23',
    title: {
      ru: 'В кни́жном магази́не у кампуса',
      en: 'At the Campus Bookstore',
      ar: 'في مكتبة بيع الكتب قرب الحرم الجامعي',
      fr: 'À la librairie du campus',
    },
    level: 'A1',
    topic: 'shopping',
    grammarPoint: 'Accusative Singular (тетра́дь, ру́чку)',
    durationSec: 4.5,
    register: 'formal',
    registerNote: {
      ru: 'Покупка канцтоваров для лекций и чертежей.',
      en: 'Buying stationery for lectures and engineering drawings.',
      ar: 'شراء القرطاسية للمحاضرات والرسومات الهندسية.',
      fr: 'Acheter des fournitures pour les cours et les dessins techniques.',
    },
    russianSubtitle: 'Мне нужна́ больша́я тетра́дь для чертеже́й и си́няя ру́чка.',
    translations: {
      ru: 'Мне нужна́ больша́я тетра́дь для чертеже́й и си́няя ру́чка.',
      en: 'I need a large notebook for blueprints and a blue pen.',
      ar: 'أحتاج إلى دفتر كبير للرسومات الهندسية وقلم أزرق.',
      fr: 'J’ai besoin d’un grand cahier pour les plans et d’un stylo bleu.',
    },
    targetWeakCases: ['Nominative', 'Genitive'],
    targetWeakWords: ['тетра́дь', 'ру́чка'],
    sceneTheme: 'shop',
    characterSpeaker: 'Student A',
    sourceType: 'open_license',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-13T10:30:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-24',
    title: {
      ru: 'Разгово́р о пого́де в Москве́',
      en: 'Talking About the Weather in Moscow',
      ar: 'الحديث عن الطقس في موسكو',
      fr: 'Parler de la météo à Moscou',
    },
    level: 'A1',
    topic: 'street_speech',
    grammarPoint: 'Impersonal Constructions (сего́дня хо́лодно)',
    durationSec: 4.2,
    register: 'colloquial',
    registerNote: {
      ru: 'Непринуждённый разговор с соседом по общежитию утром.',
      en: 'Casual morning chat with a dormitory roommate.',
      ar: 'محادثة صباحية عفوية مع زميل السكن الجامعي.',
      fr: 'Discussion matinale décontractée avec un colocataire.',
    },
    russianSubtitle: 'На у́лице сего́дня си́льный снег, не забу́дь наде́ть ша́пку!',
    translations: {
      ru: 'На у́лице сего́дня си́льный снег, не забу́дь наде́ть ша́пку!',
      en: 'It is snowing heavily outside today, don’t forget to put on a hat!',
      ar: 'هناك ثلوج كثيفة في الخارج اليوم، لا تنسَ ارتداء القبعة!',
      fr: 'Il neige fort dehors aujourd’hui, n’oublie pas de mettre ton bonnet !',
    },
    targetWeakCases: ['Prepositional', 'Accusative'],
    targetWeakWords: ['у́лица', 'сего́дня'],
    sceneTheme: 'dorm',
    characterSpeaker: 'Misha',
    sourceType: 'ai_original',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-13T11:00:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-25',
    title: {
      ru: 'Опла́та зака́за на ка́ссе',
      en: 'Paying for an Order at the Register',
      ar: 'دفع الحساب عند الصندوق',
      fr: 'Payer sa commande à la caisse',
    },
    level: 'A1',
    topic: 'food',
    grammarPoint: 'Genitive Negation (нет нали́чных)',
    durationSec: 4.4,
    register: 'formal',
    registerNote: {
      ru: 'После слова «нет» всегда используется родительный падеж.',
      en: 'After "нет" (there is no / I don’t have), always use the Genitive case.',
      ar: 'بعد كلمة "нет" تُستخدم دائماً حالة المضاف إليه.',
      fr: 'Après « нет », on utilise toujours le cas génitif.',
    },
    russianSubtitle: 'У меня́ нет нали́чных де́нег, мо́жно оплати́ть телефо́ном?',
    translations: {
      ru: 'У меня́ нет нали́чных де́нег, мо́жно оплати́ть телефо́ном?',
      en: 'I don’t have cash; can I pay with my phone?',
      ar: 'ليس لدي نقود ورقية، هل يمكنني الدفع بالهاتف؟',
      fr: 'Je n’ai pas d’espèces, puis-je payer avec mon téléphone ?',
    },
    targetWeakCases: ['Genitive', 'Instrumental'],
    targetWeakWords: ['телефо́н', 'ка́рта'],
    sceneTheme: 'cafe',
    characterSpeaker: 'Student B',
    sourceType: 'madi_creator',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-14T08:00:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-26',
    title: {
      ru: 'За рулём уче́бного автомоби́ля',
      en: 'Behind the Wheel of a Training Car',
      ar: 'خلف مقود سيارة التدريب',
      fr: 'Au volant de la voiture d’entraînement',
    },
    level: 'A2',
    topic: 'cars_roads',
    grammarPoint: 'Instrumental after за (за рулём)',
    durationSec: 5.2,
    register: 'formal',
    registerNote: {
      ru: 'Идиома «за рулём» (творительный падеж от слова «руль»).',
      en: 'Idiom "за рулём" (behind the wheel — Instrumental of "руль").',
      ar: 'التعبير "за рулём" (خلف المقود — حالة الأداة من كلمة "руль").',
      fr: 'Expression « за рулём » (au volant — instrumental de « руль »).',
    },
    russianSubtitle: 'Когда́ води́тель сиди́т за рулём, он внима́тельно смо́трит на доро́гу.',
    translations: {
      ru: 'Когда́ води́тель сиди́т за рулём, он внима́тельно смо́трит на доро́гу.',
      en: 'When the driver sits behind the wheel, he watches the road carefully.',
      ar: 'عندما يجلس السائق خلف المقود، ينظر إلى الطريق بانتباه.',
      fr: 'Quand le conducteur est au volant, il regarde attentivement la route.',
    },
    targetWeakCases: ['Instrumental', 'Accusative'],
    targetWeakWords: ['руль', 'доро́га'],
    sceneTheme: 'garage',
    characterSpeaker: 'Misha',
    sourceType: 'madi_creator',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-14T08:30:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-27',
    title: {
      ru: 'По́иск ну́жной аудито́рии',
      en: 'Finding the Right Classroom',
      ar: 'البحث عن القاعة الدراسية المطلوبة',
      fr: 'Trouver la bonne salle de cours',
    },
    level: 'A1',
    topic: 'campus',
    grammarPoint: 'Prepositional Floor & Room Numbers',
    durationSec: 4.6,
    register: 'formal',
    registerNote: {
      ru: 'Вежливый вопрос в коридоре университета перед началом занятия.',
      en: 'Polite question in the university hallway before class begins.',
      ar: 'سؤال مهذب في ممر الجامعة قبل بدء المحاضرة.',
      fr: 'Question polie dans le couloir de l’université avant le cours.',
    },
    russianSubtitle: 'Прости́те, где нахо́дится аудито́рия три́ста двена́дцать?',
    translations: {
      ru: 'Прости́те, где нахо́дится аудито́рия три́ста двена́дцать?',
      en: 'Excuse me, where is classroom three hundred twelve located?',
      ar: 'عذراً، أين تقع القاعة رقم ثلاثمئة واثني عشر؟',
      fr: 'Excusez-moi, où se trouve la salle trois cent douze ?',
    },
    targetWeakCases: ['Nominative'],
    targetWeakWords: ['аудито́рия', 'ле́кция'],
    sceneTheme: 'campus',
    characterSpeaker: 'Student A',
    sourceType: 'madi_creator',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-14T09:00:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-28',
    title: {
      ru: 'Вече́рний маршру́т на авто́бусе',
      en: 'Evening Bus Route',
      ar: 'مسار الحافلة المسائي',
      fr: 'Itinéraire de bus du soir',
    },
    level: 'A2',
    topic: 'metro',
    grammarPoint: 'Verb идти́ / е́хать for Public Transport',
    durationSec: 4.8,
    register: 'formal',
    registerNote: {
      ru: 'В русском языке про автобус или поезд часто говорят «авто́бус идёт до...».',
      en: 'In Russian, buses and trains often use "идёт до..." (goes to...).',
      ar: 'في اللغة الروسية يقال غالباً عن الحافلة أو القطار "авто́бус идёт до...".',
      fr: 'En russe, on dit souvent pour un bus ou un train « авто́бус идёт до... ».',
    },
    russianSubtitle: 'Скажи́те, э́тот авто́бус идёт до ста́нции метро́ Со́кол?',
    translations: {
      ru: 'Скажи́те, э́тот авто́бус идёт до ста́нции метро́ Со́кол?',
      en: 'Tell me, does this bus go to the Sokol metro station?',
      ar: 'قل لي، هل تذهب هذه الحافلة إلى محطة مترو سوكول؟',
      fr: 'Dites-moi, ce bus va-t-il jusqu’à la station de métro Sokol ?',
    },
    targetWeakCases: ['Genitive'],
    targetWeakWords: ['авто́бус', 'метро́'],
    sceneTheme: 'metro',
    characterSpeaker: 'Student B',
    sourceType: 'open_license',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-14T09:30:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-29',
    title: {
      ru: 'По́мощь с дома́шним зада́нием',
      en: 'Help with Homework',
      ar: 'المساعدة في الواجب المنزلي',
      fr: 'Aide pour les devoirs',
    },
    level: 'A2',
    topic: 'street_speech',
    grammarPoint: 'Dative Pronoun (Помоги́ мне) & Instrumental',
    durationSec: 4.7,
    register: 'colloquial',
    registerNote: {
      ru: 'Дружеская просьба о помощи в общежитии («Помоги́ мне, пожа́луйста»).',
      en: 'Friendly request for help in the dorm ("Помоги́ мне, пожа́луйста").',
      ar: 'طلب مساعدة ودي في السكن الجامعي.',
      fr: 'Demande d’aide amicale à la résidence universitaire.',
    },
    russianSubtitle: 'Помоги́ мне, пожа́луйста, перевести́ э́тот тру́дный техни́ческий текст!',
    translations: {
      ru: 'Помоги́ мне, пожа́луйста, перевести́ э́тот тру́дный техни́ческий текст!',
      en: 'Help me, please, translate this difficult technical text!',
      ar: 'ساعدني من فضلك في ترجمة هذا النص التقني الصعب!',
      fr: 'Aide-moi, s’il vous plaît, à traduire ce texte technique difficile !',
    },
    targetWeakCases: ['Dative', 'Accusative'],
    targetWeakWords: ['слова́рь', 'кни́га'],
    sceneTheme: 'dorm',
    characterSpeaker: 'Student B',
    sourceType: 'ai_original',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-14T10:00:00Z',
    reviewStatus: 'draft',
  },
  {
    id: 'clip-30',
    title: {
      ru: 'Вы́дача инструме́нтов в гараже́ МАДИ́',
      en: 'Checking Out Tools in the MADI Garage',
      ar: 'استلام الأدوات في مرآب مادي',
      fr: 'Retrait d’outils au garage de MADI',
    },
    level: 'A2',
    topic: 'cars_roads',
    grammarPoint: 'Instrumental of Tool & Genitive Purpose',
    durationSec: 5.3,
    register: 'formal',
    registerNote: {
      ru: 'Практическое занятие в автомеханической мастерской МАДИ.',
      en: 'Hands-on workshop session in the MADI automotive laboratory.',
      ar: 'تدريب عملي في ورشة ميكانيكا السيارات بجامعة مادي.',
      fr: 'Séance pratique dans l’atelier mécanique de MADI.',
    },
    russianSubtitle: 'Ма́стер проверя́ет давле́ние в ши́нах специа́льным прибо́ром.',
    translations: {
      ru: 'Ма́стер проверя́ет давле́ние в ши́нах специа́льным прибо́ром.',
      en: 'The master technician checks the tire pressure with a special instrument.',
      ar: 'يفحص الفني المختص ضغط الإطارات بجهاز خاص.',
      fr: 'Le chef d’atelier vérifie la pression des pneus avec un appareil spécial.',
    },
    targetWeakCases: ['Instrumental', 'Prepositional'],
    targetWeakWords: ['колесо́', 'двига́тель', 'маши́на'],
    sceneTheme: 'garage',
    characterSpeaker: 'Instructor',
    sourceType: 'madi_creator',
    license: '',
    author: AI_EDITORIAL_ATTRIBUTION,
    consentConfirmed: false,
    reviewedBy: null,
    reviewedAt: '2026-10-14T10:30:00Z',
    reviewStatus: 'draft',
  },
];

export const SPEAKING_CLIPS: SpeakingClip[] = RAW_CLIPS.map((c) => ({
  ...c,
  author: AI_EDITORIAL_ATTRIBUTION,
  license: '',
  sourceUrl: '',
  consentConfirmed: false,
  consentDocumentUrl: null,
  reviewedBy: null,
  reviewedAt: null,
  reviewStatus: 'draft',
  wordTimings: buildWordTimings(c.russianSubtitle, c.durationSec),
}));

// ----------------------------------------------------------------------------
// 2. CONVERSATION MODE (ROLE-PLAY SCENARIOS — 6 SCENARIOS)
// ----------------------------------------------------------------------------

export interface DialogueOption {
  id: string;
  russianText: string; // with stress marks
  translations: { ru: string; en: string; ar: string; fr: string };
  isOptimal: boolean;
  feedback: { ru: string; en: string; ar: string; fr: string };
  nextNodeId: string | 'END';
}

export interface DialogueNode {
  id: string;
  npcSpeaker: string;
  npcLine: string; // with stress marks
  npcTranslations: { ru: string; en: string; ar: string; fr: string };
  hints: {
    level1: { ru: string; en: string; ar: string; fr: string }; // grammar/case hint
    level2: { ru: string; en: string; ar: string; fr: string }; // starting words hint
    level3: string; // full Russian target answer
  };
  options: DialogueOption[];
}

export interface ConversationScenario {
  id: string;
  title: { ru: string; en: string; ar: string; fr: string };
  subtitle: { ru: string; en: string; ar: string; fr: string };
  level: 'A1' | 'A2';
  topic: SpeakingTopic;
  sceneTheme: 'cafe' | 'metro' | 'taxi' | 'garage' | 'dorm';
  npcRole: { ru: string; en: string; ar: string; fr: string };
  studentRole: { ru: string; en: string; ar: string; fr: string };
  usefulPhrases: {
    ru: string;
    en: string;
    ar: string;
    fr: string;
  }[];
  nodes: DialogueNode[];
}

export const CONVERSATION_SCENARIOS: ConversationScenario[] = [
  {
    id: 'scen-cafe',
    title: {
      ru: 'В студе́нческом кафе́ МАДИ́',
      en: 'At the MADI Campus Cafe',
      ar: 'في مقهى الحرم الجامعي مادي',
      fr: 'Au café du campus MADI',
    },
    subtitle: {
      ru: 'Закажи́те напи́ток, выпечку и оплати́те ка́ртой',
      en: 'Order a drink and pastry, then pay by card',
      ar: 'اطلب مشروباً ومعجنات ثم ادفع بالبطاقة',
      fr: 'Commandez une boisson et une viennoiserie, puis payez par carte',
    },
    level: 'A1',
    topic: 'food',
    sceneTheme: 'cafe',
    npcRole: {
      ru: 'Бари́ста А́нна',
      en: 'Barista Anna',
      ar: 'الباريستا آنا',
      fr: 'Barista Anna',
    },
    studentRole: {
      ru: 'Студе́нт на переры́ве',
      en: 'Student on break',
      ar: 'طالب في الاستراحة',
      fr: 'Étudiant en pause',
    },
    usefulPhrases: [
      {
        ru: 'Да́йте, пожа́луйста, ча́шку ко́фе.',
        en: 'Please give me a cup of coffee.',
        ar: 'أعطني من فضلك فنجان قهوة.',
        fr: 'Donnez-moi, s’il vous plaît, une tasse de café.',
      },
      {
        ru: 'Я бу́ду плати́ть ка́ртой.',
        en: 'I will pay by card.',
        ar: 'سأدفع بالبطاقة.',
        fr: 'Je vais payer par carte.',
      },
    ],
    nodes: [
      {
        id: 'n1',
        npcSpeaker: 'Бари́ста А́нна',
        npcLine: 'Здра́вствуйте! Что вы бу́дете зака́зывать сего́дня?',
        npcTranslations: {
          ru: 'Здра́вствуйте! Что вы бу́дете зака́зывать сего́дня?',
          en: 'Hello! What would you like to order today?',
          ar: 'مرحباً! ماذا تحب أن تطلب اليوم؟',
          fr: 'Bonjour ! Que souhaitez-vous commander aujourd’hui ?',
        },
        hints: {
          level1: {
            ru: 'Используйте винительный падеж: «ча́шку ко́фе и бу́лочку».',
            en: 'Use the Accusative case: "ча́шку ко́фе и бу́лочку".',
            ar: 'استخدم حالة المفعول به: "ча́шку ко́фе и бу́лочку".',
            fr: 'Utilisez l’accusatif : « ча́шку ко́фе и бу́лочку ».',
          },
          level2: {
            ru: 'Начните с: «Здра́вствуйте! Да́йте, пожа́луйста...»',
            en: 'Start with: "Здра́вствуйте! Да́йте, пожа́луйста..."',
            ar: 'ابدأ بـ: "Здра́вствуйте! Да́йте, пожа́луйста..."',
            fr: 'Commencez par : « Здра́вствуйте! Да́йте, пожа́луйста... »',
          },
          level3: 'Здра́вствуйте! Да́йте, пожа́луйста, ча́шку ко́фе и бу́лочку.',
        },
        options: [
          {
            id: 'opt-1a',
            russianText: 'Здра́вствуйте! Да́йте, пожа́луйста, ча́шку ко́фе и бу́лочку.',
            translations: {
              ru: 'Здра́вствуйте! Да́йте, пожа́луйста, ча́шку ко́фе и бу́лочку.',
              en: 'Hello! Please give me a cup of coffee and a bun.',
              ar: 'مرحباً! أعطني من فضلك فنجان قهوة وكعكة.',
              fr: 'Bonjour ! Donnez-moi s’il vous plaît une tasse de café et une brioche.',
            },
            isOptimal: true,
            feedback: {
              ru: 'Отлично! Правильный винительный падеж («ча́шку», «бу́лочку»).',
              en: 'Excellent! Correct Accusative case endings ("ча́шку", "бу́лочку").',
              ar: 'ممتاز! نهايات المفعول به صحيحة.',
              fr: 'Excellent ! Bonnes terminaisons à l’accusatif.',
            },
            nextNodeId: 'n2',
          },
          {
            id: 'opt-1b',
            russianText: 'Мне оди́н зелёный чай с лимо́ном, пожа́луйста.',
            translations: {
              ru: 'Мне оди́н зелёный чай с лимо́ном, пожа́луйста.',
              en: 'One green tea with lemon for me, please.',
              ar: 'واحد شاي أخضر بالليمون لي، من فضلك.',
              fr: 'Un thé vert au citron pour moi, s’il vous plaît.',
            },
            isOptimal: true,
            feedback: {
              ru: 'Прекрасно! Творительный падеж «с лимо́ном» использован верно.',
              en: 'Great! Instrumental case "с лимо́ном" used accurately.',
              ar: 'رائع! حالة الأداة "с лимо́ном" صحيحة.',
              fr: 'Parfait ! Le cas instrumental « с лимо́ном » est exact.',
            },
            nextNodeId: 'n2',
          },
        ],
      },
      {
        id: 'n2',
        npcSpeaker: 'Бари́ста А́нна',
        npcLine: 'Хорошо́! Бу́дете пить здесь или возьмёте с собо́й? Как бу́дете плати́ть?',
        npcTranslations: {
          ru: 'Хорошо́! Бу́дете пить здесь или возьмёте с собо́й? Как бу́дете плати́ть?',
          en: 'Alright! For here or to go? How will you pay?',
          ar: 'حسناً! هنا أم سفري؟ كيف ستدفع؟',
          fr: 'Très bien ! Sur place ou à emporter ? Comment allez-vous payer ?',
        },
        hints: {
          level1: {
            ru: 'Используйте творительный падеж способа оплаты: «плати́ть ка́ртой».',
            en: 'Use the Instrumental case for payment method: "плати́ть ка́ртой".',
            ar: 'استخدم حالة الأداة لطريقة الدفع: "плати́ть ка́ртой".',
            fr: 'Utilisez l’instrumental pour le moyen de paiement : « плати́ть ка́ртой ».',
          },
          level2: {
            ru: 'Скажите: «Я бу́ду пить здесь и плати́ть...»',
            en: 'Say: "Я бу́ду пить здесь и плати́ть..."',
            ar: 'قل: "Я бу́ду пить здесь и плати́ть..."',
            fr: 'Dites : « Я бу́ду пить здесь и плати́ть... »',
          },
          level3: 'Я бу́ду пить здесь и плати́ть ка́ртой, спаси́бо.',
        },
        options: [
          {
            id: 'opt-2a',
            russianText: 'Я бу́ду пить здесь и плати́ть ка́ртой, спаси́бо.',
            translations: {
              ru: 'Я бу́ду пить здесь и плати́ть ка́ртой, спаси́бо.',
              en: 'I will drink it here and pay by card, thank you.',
              ar: 'سأشرب هنا وأدفع بالبطاقة، شكراً.',
              fr: 'Je vais boire ici et payer par carte, merci.',
            },
            isOptimal: true,
            feedback: {
              ru: 'Безупречно! Ваш заказ готов.',
              en: 'Spot on! Your order is ready.',
              ar: 'مثالي! طلبك جاهز.',
              fr: 'Impeccable ! Votre commande est prête.',
            },
            nextNodeId: 'END',
          },
          {
            id: 'opt-2b',
            russianText: 'Возьму́ с собо́й, оплачу́ телефо́ном.',
            translations: {
              ru: 'Возьму́ с собо́й, оплачу́ телефо́ном.',
              en: 'I will take it to go and pay by phone.',
              ar: 'سآخذه معي وأدفع بالهاتف.',
              fr: 'Je prends à emporter, je paie par téléphone.',
            },
            isOptimal: true,
            feedback: {
              ru: 'Отличный живой русский язык!',
              en: 'Natural everyday Russian!',
              ar: 'لغة روسية يومية طبيعية ممتازة!',
              fr: 'Excellent russe naturel !',
            },
            nextNodeId: 'END',
          },
        ],
      },
    ],
  },
  {
    id: 'scen-metro-dir',
    title: {
      ru: 'Как пройти́ к метро́ Аэропо́рт?',
      en: 'Asking Directions to Aeroport Metro',
      ar: 'السؤال عن الطريق إلى مترو أيروبورت',
      fr: 'Demander son chemin vers le métro Aeroport',
    },
    subtitle: {
      ru: 'Узна́йте доро́гу от кампуса МАДИ́ до ста́нции метро́',
      en: 'Find your way from the MADI campus to the metro entrance',
      ar: 'اعرف الطريق من حرم مادي إلى مدخل المترو',
      fr: 'Trouvez le chemin du campus MADI jusqu’au métro',
    },
    level: 'A1',
    topic: 'metro',
    sceneTheme: 'metro',
    npcRole: {
      ru: 'Прохо́жий у проспе́кта',
      en: 'Passerby on the avenue',
      ar: 'أحد المارة في الشارع',
      fr: 'Passant sur l’avenue',
    },
    studentRole: {
      ru: 'Первоку́рсник МАДИ́',
      en: 'MADI Freshman',
      ar: 'طالب سنة أولى في مادي',
      fr: 'Étudiant de 1re année à MADI',
    },
    usefulPhrases: [
      {
        ru: 'Скажи́те, пожа́луйста, где ста́нция метро́ Аэропо́рт?',
        en: 'Tell me, please, where is the Aeroport metro station?',
        ar: 'قل لي من فضلك، أين محطة مترو أيروبورت؟',
        fr: 'Dites-moi, s’il vous plaît, où est la station de métro Aeroport ?',
      },
      {
        ru: 'Спаси́бо большо́е за по́мощь!',
        en: 'Thank you very much for your help!',
        ar: 'شكراً جزيلاً على المساعدة!',
        fr: 'Merci beaucoup pour votre aide !',
      },
    ],
    nodes: [
      {
        id: 'n1',
        npcSpeaker: 'Прохо́жий',
        npcLine: 'Да, слу́шаю вас! Вы что́-то и́щете?',
        npcTranslations: {
          ru: 'Да, слу́шаю вас! Вы что́-то и́щете?',
          en: 'Yes, I’m listening! Are you looking for something?',
          ar: 'نعم، أستمع إليك! هل تبحث عن شيء؟',
          fr: 'Oui, je vous écoute ! Vous cherchez quelque chose ?',
        },
        hints: {
          level1: {
            ru: 'Спросите вежливо: «Скажи́те, пожа́луйста, где...»',
            en: 'Ask politely: "Скажи́те, пожа́луйста, где..."',
            ar: 'اسأل بأدب: "Скажи́те, пожа́луйста, где..."',
            fr: 'Demandez poliment : « Скажи́те, пожа́луйста, где... »',
          },
          level2: {
            ru: '«Скажи́те, пожа́луйста, где ста́нция метро́...»',
            en: '"Скажи́те, пожа́луйста, где ста́нция метро́..."',
            ar: '"Скажи́те, пожа́луйста, где ста́нция метро́..."',
            fr: '« Скажи́те, пожа́луйста, где ста́нция метро́... »',
          },
          level3: 'Скажи́те, пожа́луйста, где ста́нция метро́ Аэропо́рт?',
        },
        options: [
          {
            id: 'opt-m1',
            russianText: 'Скажи́те, пожа́луйста, где ста́нция метро́ Аэропо́рт?',
            translations: {
              ru: 'Скажи́те, пожа́луйста, где ста́нция метро́ Аэропо́рт?',
              en: 'Tell me, please, where is the Aeroport metro station?',
              ar: 'قل لي من فضلك، أين محطة مترو أيروبورت؟',
              fr: 'Dites-moi, s’il vous plaît, où est la station de métro Aeroport ?',
            },
            isOptimal: true,
            feedback: {
              ru: 'Очень вежливо и грамотно!',
              en: 'Very polite and grammatically accurate!',
              ar: 'مهذب جداً وصحيح نحوياً!',
              fr: 'Très poli et grammaticalement exact !',
            },
            nextNodeId: 'n2',
          },
        ],
      },
      {
        id: 'n2',
        npcSpeaker: 'Прохо́жий',
        npcLine: 'Иди́те пря́мо по Ленингра́дскому проспе́кту две мину́ты, вход бу́дет спра́ва.',
        npcTranslations: {
          ru: 'Иди́те пря́мо по Ленингра́дскому проспе́кту две мину́ты, вход бу́дет спра́ва.',
          en: 'Walk straight along Leningradsky Prospekt for two minutes; the entrance will be on the right.',
          ar: 'سر مباشرة في شارع لينينغرادسكي لمدة دقيقتين، سيكون المدخل على اليمين.',
          fr: 'Allez tout droit sur la perspective Leningradski pendant deux minutes, l’entrée sera à droite.',
        },
        hints: {
          level1: {
            ru: 'Поблагодарите собеседника (предлог «за» + винительный падеж «по́мощь»).',
            en: 'Thank the person (preposition "за" + Accusative "по́мощь").',
            ar: 'اشكر المتحدث (حرف الجر "за" + المفعول به "по́мощь").',
            fr: 'Remerciez la personne (préposition « за » + accusatif « по́мощь »).',
          },
          level2: {
            ru: '«Спаси́бо большо́е за по́мощь!»',
            en: '"Спаси́бо большо́е за по́мощь!"',
            ar: '"Спаси́бо большо́е за по́мощь!"',
            fr: '« Спаси́бо большо́е за по́мощь! »',
          },
          level3: 'Спаси́бо большо́е за по́мощь! До свида́ния!',
        },
        options: [
          {
            id: 'opt-m2',
            russianText: 'Спаси́бо большо́е за по́мощь! До свида́ния!',
            translations: {
              ru: 'Спаси́бо большо́е за по́мощь! До свида́ния!',
              en: 'Thank you very much for your help! Goodbye!',
              ar: 'شكراً جزيلاً على المساعدة! إلى اللقاء!',
              fr: 'Merci beaucoup pour votre aide ! Au revoir !',
            },
            isOptimal: true,
            feedback: {
              ru: 'Прекрасно! Вы нашли вход в метро.',
              en: 'Wonderful! You found the metro entrance.',
              ar: 'رائع! لقد وجدت مدخل المترو.',
              fr: 'Parfait ! Vous avez trouvé l’entrée du métro.',
            },
            nextNodeId: 'END',
          },
        ],
      },
    ],
  },
  {
    id: 'scen-taxi',
    title: {
      ru: 'Поездка с води́телем такси́',
      en: 'Talking to a Taxi Driver',
      ar: 'التحدث مع سائق التاكسي',
      fr: 'Parler au chauffeur de taxi',
    },
    subtitle: {
      ru: 'Назови́те а́дрес и попроси́те останови́ть у гла́вного вхо́да',
      en: 'Confirm the address and ask to stop at the main gate',
      ar: 'أكد العنوان واطلب التوقف عند البوابة الرئيسية',
      fr: 'Confirmez l’adresse et demandez de s’arrêter à l’entrée principale',
    },
    level: 'A2',
    topic: 'taxi',
    sceneTheme: 'taxi',
    npcRole: {
      ru: 'Води́тель Сергéй',
      en: 'Driver Sergey',
      ar: 'السائق سيرغي',
      fr: 'Chauffeur Sergueï',
    },
    studentRole: {
      ru: 'Пассажи́р',
      en: 'Passenger',
      ar: 'راكب',
      fr: 'Passager',
    },
    usefulPhrases: [
      {
        ru: 'Мы е́дем на Ленингра́дский проспе́кт, дом шестьдеся́т четы́ре.',
        en: 'We are going to Leningradsky Prospekt, building 64.',
        ar: 'نحن ذاهبون إلى شارع لينينغرادسكي، مبنى 64.',
        fr: 'Nous allons perspective Leningradski, numéro 64.',
      },
      {
        ru: 'Останови́те, пожа́луйста, у светофо́ра.',
        en: 'Please stop near the traffic light.',
        ar: 'توقف من فضلك عند إشارة المرور.',
        fr: 'Arrêtez-vous, s’il vous plaît, près du feu tricolore.',
      },
    ],
    nodes: [
      {
        id: 'n1',
        npcSpeaker: 'Води́тель Сергéй',
        npcLine: 'До́брый день! Подтверди́те, пожа́луйста, куда́ мы сего́дня е́дем?',
        npcTranslations: {
          ru: 'До́брый день! Подтверди́те, пожа́луйста, куда́ мы сего́дня е́дем?',
          en: 'Good afternoon! Please confirm where we are driving today?',
          ar: 'طاب يومك! يرجى تأكيد وجهتنا اليوم؟',
          fr: 'Bonjour ! Confirmez s’il vous plaît notre destination aujourd’hui ?',
        },
        hints: {
          level1: {
            ru: 'Куда? (Винительный падеж): «на Ленингра́дский проспе́кт, в МАДИ́».',
            en: 'Where to? (Accusative): "на Ленингра́дский проспе́кт, в МАДИ́".',
            ar: 'إلى أين؟ (المفعول به): "на Ленингра́дский проспе́кт, в МАДИ́".',
            fr: 'Où ? (Accusatif) : « на Ленингра́дский проспе́кт, в МАДИ́ ».',
          },
          level2: {
            ru: '«До́брый день! Мы е́дем на Ленингра́дский проспе́кт...»',
            en: '"До́брый день! Мы е́дем на Ленингра́дский проспе́кт..."',
            ar: '"До́брый день! Мы е́дем на Ленингра́дский проспе́кт..."',
            fr: '« До́брый день! Мы е́дем на Ленингра́дский проспе́кт... »',
          },
          level3: 'До́брый день! Мы е́дем на Ленингра́дский проспе́кт, в университе́т МАДИ́.',
        },
        options: [
          {
            id: 'opt-t1',
            russianText: 'До́брый день! Мы е́дем на Ленингра́дский проспе́кт, в университе́т МАДИ́.',
            translations: {
              ru: 'До́брый день! Мы е́дем на Ленингра́дский проспе́кт, в университе́т МАДИ́.',
              en: 'Good afternoon! We are driving to Leningradsky Prospekt, to MADI University.',
              ar: 'طاب يومك! نحن ذاهبون إلى شارع لينينغرادسكي، إلى جامعة مادي.',
              fr: 'Bonjour ! Nous allons perspective Leningradski, à l’université MADI.',
            },
            isOptimal: true,
            feedback: {
              ru: 'Точно! Водитель понял маршрут.',
              en: 'Exact! The driver understood the route.',
              ar: 'بالضبط! فهم السائق المسار.',
              fr: 'Exact ! Le chauffeur a compris l’itinéraire.',
            },
            nextNodeId: 'n2',
          },
        ],
      },
      {
        id: 'n2',
        npcSpeaker: 'Води́тель Сергéй',
        npcLine: 'Мы уже́ подъезжа́ем к перекрёстку. Где лу́чше останови́ть маши́ну?',
        npcTranslations: {
          ru: 'Мы уже́ подъезжа́ем к перекрёстку. Где лу́чше останови́ть маши́ну?',
          en: 'We are approaching the intersection. Where is the best place to stop the car?',
          ar: 'نحن نقترب من التقاطع. أين أفضل مكان لإيقاف السيارة؟',
          fr: 'Nous approchons du carrefour. Où vaut-il mieux arrêter la voiture ?',
        },
        hints: {
          level1: {
            ru: 'Предлог «у» требует родительного падежа: «у гла́вного вхо́да».',
            en: 'Preposition "у" requires Genitive: "у гла́вного вхо́да".',
            ar: 'حرف الجر "у" يتطلب المضاف إليه: "у гла́вного вхо́да".',
            fr: 'La préposition « у » exige le génitif : « у гла́вного вхо́да ».',
          },
          level2: {
            ru: '«Останови́те, пожа́луйста, у гла́вного...»',
            en: '"Останови́те, пожа́луйста, у гла́вного..."',
            ar: '"Останови́те, пожа́луйста, у гла́вного..."',
            fr: '« Останови́те, пожа́луйста, у гла́вного... »',
          },
          level3: 'Останови́те, пожа́луйста, у гла́вного вхо́да по́сле светофо́ра.',
        },
        options: [
          {
            id: 'opt-t2',
            russianText: 'Останови́те, пожа́луйста, у гла́вного вхо́да по́сле светофо́ра.',
            translations: {
              ru: 'Останови́те, пожа́луйста, у гла́вного вхо́да по́сле светофо́ра.',
              en: 'Please stop at the main entrance after the traffic light.',
              ar: 'توقف من فضلك عند المدخل الرئيسي بعد إشارة المرور.',
              fr: 'Arrêtez-vous, s’il vous plaît, à l’entrée principale après le feu.',
            },
            isOptimal: true,
            feedback: {
              ru: 'Отлично! Вы приехали вовремя.',
              en: 'Great job! You arrived right on time.',
              ar: 'عمل رائع! وصلت في الوقت المناسب.',
              fr: 'Bravo ! Vous êtes arrivé à l’heure.',
            },
            nextNodeId: 'END',
          },
        ],
      },
    ],
  },
  {
    id: 'scen-gas',
    title: {
      ru: 'На автозапра́вочной ста́нции (АЗС)',
      en: 'At a Gas Station',
      ar: 'في محطة الوقود',
      fr: 'À la station-service',
    },
    subtitle: {
      ru: 'Запра́вьте автомоби́ль бензи́ном и прове́рьте колёса',
      en: 'Refuel the car with gasoline and check tire pressure',
      ar: 'زوّد السيارة بالبنزين وافحص ضغط الإطارات',
      fr: 'Faites le plein d’essence et vérifiez les pneus',
    },
    level: 'A2',
    topic: 'cars_roads',
    sceneTheme: 'garage',
    npcRole: {
      ru: 'Касси́р АЗС',
      en: 'Gas Station Cashier',
      ar: 'أمين صندوق محطة الوقود',
      fr: 'Caissier de la station-service',
    },
    studentRole: {
      ru: 'Автолюби́тель-инжене́р',
      en: 'Student Driver',
      ar: 'سائق طالب مهندس',
      fr: 'Conducteur étudiant',
    },
    usefulPhrases: [
      {
        ru: 'Два́дцать ли́тров бензи́на на втору́ю коло́нку.',
        en: 'Twenty liters of gasoline on pump two.',
        ar: 'عشرون لتراً من البنزين على المضخة الثانية.',
        fr: 'Vingt litres d’essence à la pompe numéro deux.',
      },
      {
        ru: 'Где мо́жно подкача́ть колёса?',
        en: 'Where can I inflate the tires?',
        ar: 'أين يمكنني نفخ الإطارات؟',
        fr: 'Où puis-je gonfler les pneus ?',
      },
    ],
    nodes: [
      {
        id: 'n1',
        npcSpeaker: 'Касси́р АЗС',
        npcLine: 'Здра́вствуйте! Кака́я у вас коло́нка и како́й бензи́н?',
        npcTranslations: {
          ru: 'Здра́вствуйте! Кака́я у вас коло́нка и како́й бензи́н?',
          en: 'Hello! Which pump are you at and what kind of gasoline?',
          ar: 'مرحباً! أي مضخة لديك وأي نوع بنزين؟',
          fr: 'Bonjour ! Quelle pompe et quel type d’essence ?',
        },
        hints: {
          level1: {
            ru: 'Числительное + родительный падеж мн. ч.: «два́дцать ли́тров бензи́на».',
            en: 'Number + Genitive plural: "два́дцать ли́тров бензи́на".',
            ar: 'عدد + مضاف إليه جمع: "два́дцать ли́тров бензи́на".',
            fr: 'Nombre + génitif pluriel : « два́дцать ли́тров бензи́на ».',
          },
          level2: {
            ru: '«Два́дцать ли́тров бензи́на на втору́ю...»',
            en: '"Два́дцать ли́тров бензи́на на втору́ю..."',
            ar: '"Два́дцать ли́тров бензи́на на втору́ю..."',
            fr: '« Два́дцать ли́тров бензи́на на втору́ю... »',
          },
          level3: 'Два́дцать ли́тров бензи́на на втору́ю коло́нку, пожа́луйста.',
        },
        options: [
          {
            id: 'opt-g1',
            russianText: 'Два́дцать ли́тров бензи́на на втору́ю коло́нку, пожа́луйста.',
            translations: {
              ru: 'Два́дцать ли́тров бензи́на на втору́ю коло́нку, пожа́луйста.',
              en: 'Twenty liters of gasoline on the second pump, please.',
              ar: 'عشرون لتراً من البنزين على المضخة الثانية، من فضلك.',
              fr: 'Vingt litres d’essence à la deuxième pompe, s’il vous plaît.',
            },
            isOptimal: true,
            feedback: {
              ru: 'Отлично! Правильный родительный падеж «ли́тров бензи́на».',
              en: 'Great! Correct Genitive case "ли́тров бензи́на".',
              ar: 'رائع! حالة المضاف إليه صحيحة.',
              fr: 'Parfait ! Bon usage du génitif « ли́тров бензи́на ».',
            },
            nextNodeId: 'END',
          },
        ],
      },
    ],
  },
  {
    id: 'scen-dorm',
    title: {
      ru: 'На ва́хте студе́нческого общежи́тия',
      en: 'At the Dormitory Reception',
      ar: 'في استقبال السكن الجامعي',
      fr: 'À la réception de la résidence étudiante',
    },
    subtitle: {
      ru: 'Получи́те ключ от ко́мнаты и узна́йте пра́вила',
      en: 'Check in, get your room key, and ask about the floor',
      ar: 'استلم مفتاح الغرفة وتعرف على الطابق',
      fr: 'Récupérez la clé de votre chambre et renseignez-vous sur l’étage',
    },
    level: 'A1',
    topic: 'campus',
    sceneTheme: 'dorm',
    npcRole: {
      ru: 'Коменда́нт О́льга Ива́новна',
      en: 'Dorm Supervisor Olga Ivanovna',
      ar: 'مشرفة السكن أولغا إيفانوفنا',
      fr: 'Responsable Olga Ivanovna',
    },
    studentRole: {
      ru: 'Но́вый жиле́ц общежи́тия',
      en: 'New Dorm Resident',
      ar: 'ساكن جديد في السكن الجامعي',
      fr: 'Nouveau résident',
    },
    usefulPhrases: [
      {
        ru: 'Вот мой студе́нческий биле́т и па́спорт.',
        en: 'Here is my student ID and passport.',
        ar: 'ها هي بطاقة الطالب وجواز السفر.',
        fr: 'Voici ma carte d’étudiant et mon passeport.',
      },
      {
        ru: 'Моя́ ко́мната на пя́том этаже́.',
        en: 'My room is on the fifth floor.',
        ar: 'غرفتي في الطابق الخامس.',
        fr: 'Ma chambre est au cinquième étage.',
      },
    ],
    nodes: [
      {
        id: 'n1',
        npcSpeaker: 'О́льга Ива́новна',
        npcLine: 'Здра́вствуйте! Покажи́те, пожа́луйста, ваш студе́нческий про́пуск и скажи́те но́мер ко́мнаты.',
        npcTranslations: {
          ru: 'Здра́вствуйте! Покажи́те, пожа́луйста, ваш студе́нческий про́пуск и скажи́те но́мер ко́мнаты.',
          en: 'Hello! Please show your student pass and tell me your room number.',
          ar: 'مرحباً! أرني من فضلك بطاقة الطالب واذكر رقم الغرفة.',
          fr: 'Bonjour ! Montrez votre carte d’étudiant et indiquez le numéro de chambre.',
        },
        hints: {
          level1: {
            ru: 'Предложный падеж места: «на пя́том этаже́».',
            en: 'Prepositional case of location: "на пя́том этаже́".',
            ar: 'حالة الجر للمكان: "на пя́том этаже́".',
            fr: 'Cas prépositionnel de lieu : « на пя́том этаже́ ».',
          },
          level2: {
            ru: '«Вот мой про́пуск, моя́ ко́мната на пя́том...»',
            en: '"Вот мой про́пуск, моя́ ко́мната на пя́том..."',
            ar: '"Вот мой про́пуск, моя́ ко́мната на пя́том..."',
            fr: '« Вот мой про́пуск, моя́ ко́мната на пя́том... »',
          },
          level3: 'Вот мой студе́нческий про́пуск, моя́ ко́мната на пя́том этаже́.',
        },
        options: [
          {
            id: 'opt-d1',
            russianText: 'Вот мой студе́нческий про́пуск, моя́ ко́мната на пя́том этаже́.',
            translations: {
              ru: 'Вот мой студе́нческий про́пуск, моя́ ко́мната на пя́том этаже́.',
              en: 'Here is my student pass; my room is on the fifth floor.',
              ar: 'ها هي بطاقة الطالب، غرفتي في الطابق الخامس.',
              fr: 'Voici mon laissez-passer étudiant, ma chambre est au cinquième étage.',
            },
            isOptimal: true,
            feedback: {
              ru: 'Добро пожаловать в общежитие МАДИ! Вот ваш ключ.',
              en: 'Welcome to the MADI dormitory! Here is your key.',
              ar: 'مرحباً بك في سكن جامعة مادي! ها هو مفتاحك.',
              fr: 'Bienvenue à la résidence MADI ! Voici votre clé.',
            },
            nextNodeId: 'END',
          },
        ],
      },
    ],
  },
  {
    id: 'scen-metro-ticket',
    title: {
      ru: 'Поку́пка биле́та и ка́рты «Тро́йка»',
      en: 'Buying a Metro Ticket & Troika Card',
      ar: 'شراء تذكرة مترو وبطاقة ترويكا',
      fr: 'Acheter un ticket de métro et une carte Troïka',
    },
    subtitle: {
      ru: 'Попо́лните бала́нс ка́рты «Тро́йка» в ка́ссе метро́',
      en: 'Buy or top up a Troika transit card at the metro counter',
      ar: 'اشترِ أو اشحن بطاقة ترويكا في شباك المترو',
      fr: 'Achetez ou rechargez une carte Troïka au guichet du métro',
    },
    level: 'A1',
    topic: 'metro',
    sceneTheme: 'metro',
    npcRole: {
      ru: 'Касси́р метрополите́на',
      en: 'Metro Ticket Clerk',
      ar: 'موظف شباك تذاكر المترو',
      fr: 'Guichetier du métro',
    },
    studentRole: {
      ru: 'Пассажи́р метро́',
      en: 'Metro Passenger',
      ar: 'راكب مترو',
      fr: 'Passager du métro',
    },
    usefulPhrases: [
      {
        ru: 'Мне нужна́ ка́рта «Тро́йка», пожа́луйста.',
        en: 'I need a Troika card, please.',
        ar: 'أحتاج إلى بطاقة ترويكا، من فضلك.',
        fr: 'J’ai besoin d’une carte Troïka, s’il vous plaît.',
      },
      {
        ru: 'Положи́те на ка́рту пятьсо́т рубле́й.',
        en: 'Put five hundred rubles on the card.',
        ar: 'ضع خمسمئة روبل في البطاقة.',
        fr: 'Mettez cinq cents roubles sur la carte.',
      },
    ],
    nodes: [
      {
        id: 'n1',
        npcSpeaker: 'Касси́р метрополите́на',
        npcLine: 'Здра́вствуйте! Вам на одну́ пое́здку или ка́рту «Тро́йка»?',
        npcTranslations: {
          ru: 'Здра́вствуйте! Вам на одну́ пое́здку или ка́рту «Тро́йка»?',
          en: 'Hello! Would you like a single ride or a Troika card?',
          ar: 'مرحباً! هل تريد رحلة واحدة أم بطاقة ترويكا؟',
          fr: 'Bonjour ! Un trajet simple ou une carte Troïka ?',
        },
        hints: {
          level1: {
            ru: 'Дательный падеж: «Мне нужна́ ка́рта Тро́йка».',
            en: 'Dative case construction: "Мне нужна́ ка́рта Тро́йка".',
            ar: 'تركيب حالة المقصود: "Мне нужна́ ка́рта Тро́йка".',
            fr: 'Construction au datif : « Мне нужна́ ка́рта Тро́йка ».',
          },
          level2: {
            ru: '«Мне нужна́ ка́рта «Тро́йка», я бу́ду плати́ть...»',
            en: '"Мне нужна́ ка́рта «Тро́йка», я бу́ду плати́ть..."',
            ar: '"Мне нужна́ ка́рта «Тро́йка», я бу́ду плати́ть..."',
            fr: '« Мне нужна́ ка́рта «Тро́йка», я бу́ду плати́ть... »',
          },
          level3: 'Мне нужна́ ка́рта «Тро́йка», я бу́ду плати́ть ка́ртой.',
        },
        options: [
          {
            id: 'opt-mt1',
            russianText: 'Мне нужна́ ка́рта «Тро́йка», я бу́ду плати́ть ка́ртой.',
            translations: {
              ru: 'Мне нужна́ ка́рта «Тро́йка», я бу́ду плати́ть ка́ртой.',
              en: 'I need a Troika card; I will pay by bank card.',
              ar: 'أحتاج إلى بطاقة ترويكا، سأدفع بالبطاقة البنكية.',
              fr: 'J’ai besoin d’une carte Troïka, je vais payer par carte.',
            },
            isOptimal: true,
            feedback: {
              ru: 'Отлично! Приложите карту к терминалу.',
              en: 'Great! Tap your bank card on the terminal.',
              ar: 'ممتاز! قرب بطاقتك من جهاز الدفع.',
              fr: 'Parfait ! Présentez votre carte sur le terminal.',
            },
            nextNodeId: 'END',
          },
        ],
      },
    ],
  },
];

// ----------------------------------------------------------------------------
// 3. LIBRARY WINDOW SEED DATA (32 OFFICIAL MADI PREPARATORY FACULTY & RKI PDF BOOKS)
// ----------------------------------------------------------------------------

import {
  OFFICIAL_LIBRARY_CATALOG,
  generateBookCoverSvgDataUrl,
  type LibrarySection,
  type LibraryItem,
  type LibraryBookPage,
} from './madiLibraryCatalog';

export type { LibrarySection, LibraryItem, LibraryBookPage };
export { generateBookCoverSvgDataUrl };

const RAW_LIBRARY_SEED_ITEMS: any[] = [
  {
    id: 'lib-01',
    title: {
      ru: 'Путеводи́тель первоку́рсника МАДИ́',
      en: 'MADI Freshman Campus & Metro Guide',
      ar: 'دليل طالب السنة الأولى في جامعة مادي والمترو',
      fr: 'Guide de l’étudiant de 1re année à MADI et du métro',
    },
    author: AI_EDITORIAL_ATTRIBUTION,
    section: 'textbooks',
    level: 'A1',
    topic: 'campus',
    explanationLang: 'all',
    licenseType: '',
    licenseText: '',
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'admin-1',
    pages: [
      {
        pageNumber: 1,
        heading: 'Гла́вный ко́рпус на Ленингра́дском проспе́кте',
        russianText:
          'Моско́вский автомоби́льно-доро́жный госуда́рственный техни́ческий университе́т (МАДИ́) нахо́дится на Ленингра́дском проспе́кте, ря́дом со ста́нцией метро́ Аэропо́рт. Ка́ждое у́тро студе́нты и преподава́тели спеша́т на ле́кции в гла́вный ко́рпус.',
        translationNotes: {
          ru: 'Ключевые слова: университе́т, ста́нция метро́, ле́кция, гла́вный ко́рпус.',
          en: 'Key vocabulary: university, metro station, lecture, main building.',
          ar: 'المفردات الأساسية: جامعة، محطة مترو، محاضرة، المبنى الرئيسي.',
          fr: 'Vocabulaire clé : université, station de métro, cours, bâtiment principal.',
        },
      },
      {
        pageNumber: 2,
        heading: 'Библиоте́ка и студе́нческая столо́вая',
        russianText:
          'На тре́тьем этаже́ нахо́дится больша́я библиоте́ка и чита́льный зал. Здесь мо́жно взять уче́бник, слова́рь и чертёж. А в переры́ве студе́нты обе́дают в столо́вой: беру́т горя́чий суп, рис с ку́рицей и чай с лимо́ном.',
        translationNotes: {
          ru: 'Обратите внимание на предложный падеж: на тре́тьем этаже́, в столо́вой.',
          en: 'Notice the Prepositional case: на тре́тьем этаже́ (on the 3rd floor), в столо́вой (in the canteen).',
          ar: 'لاحظ حالة الجر للمكان: في الطابق الثالث، في الكافتيريا.',
          fr: 'Notez le cas prépositionnel : au troisième étage, à la cantine.',
        },
      },
    ],
  },
  {
    id: 'lib-02',
    title: {
      ru: 'Шесть падеже́й ру́сского языка́ в табли́цах',
      en: 'The Six Russian Cases in Road-Sign Tables',
      ar: 'الحالات الإعرابية الست في اللغة الروسية في جداول مبسطة',
      fr: 'Les six cas russes en tableaux synthétiques',
    },
    author: AI_EDITORIAL_ATTRIBUTION,
    section: 'grammar_ref',
    level: 'A1',
    topic: 'grammar',
    explanationLang: 'all',
    licenseType: '',
    licenseText: '',
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'admin-1',
    pages: [
      {
        pageNumber: 1,
        heading: 'Имени́тельный, Роди́тельный и Да́тельный падежи́',
        russianText:
          'Имени́тельный паде́ж (Кто? Что?): э́то но́вая маши́на и широкий мост. Роди́тельный паде́ж (Кого́? Чего́?): у меня́ нет биле́та, два́дцать ли́тров бензи́на. Да́тельный паде́ж (Кому́? Чему́?): авто́бус е́дет по широкому шоссе́ к университе́ту.',
        translationNotes: {
          ru: 'Падежи — это дорожные знаки русского предложения.',
          en: 'Cases act like road signs showing each word’s role in a Russian sentence.',
          ar: 'الحالات الإعرابية تعمل مثل إشارات المرور التي توضح دور كل كلمة في الجملة.',
          fr: 'Les cas agissent comme des panneaux routiers indiquant le rôle de chaque mot.',
        },
      },
      {
        pageNumber: 2,
        heading: 'Вини́тельный, Твори́тельный и Предло́жный падежи́',
        russianText:
          'Вини́тельный паде́ж (Куда́? Что?): я иду́ на ле́кцию и чита́ю кни́гу. Твори́тельный паде́ж (Кем? Чем?): инжене́р рису́ет чертёж карандашо́м, я пью чай с лимо́ном. Предло́жный паде́ж (Где? О чём?): мы живём в Москве́ в общежи́тии.',
        translationNotes: {
          ru: 'Нажмите на любое русское слово, чтобы увидеть его полную таблицу склонения.',
          en: 'Tap any Russian word in the reader to inspect its full declension table.',
          ar: 'اضغط على أي كلمة روسية في القارئ لعرض جدول تصريفها الكامل.',
          fr: 'Touchez n’importe quel mot russe pour voir son tableau de déclinaison.',
        },
      },
    ],
  },
  {
    id: 'lib-03',
    title: {
      ru: 'Автомоби́ль и доро́га: иллюстри́рованный слова́рь',
      en: 'Automobile & Road Engineering: Illustrated Reader',
      ar: 'السيارة وهندسة الطرق: قارئ مصور',
      fr: 'L’automobile et le génie routier : manuel illustré',
    },
    author: AI_EDITORIAL_ATTRIBUTION,
    section: 'textbooks',
    level: 'A2',
    topic: 'cars_roads',
    explanationLang: 'all',
    licenseType: '',
    licenseText: '',
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'admin-1',
    pages: [
      {
        pageNumber: 1,
        heading: 'Устро́йство совреме́нного автомоби́ля',
        russianText:
          'Ка́ждый автомоби́ль име́ет двига́тель, четы́ре колеса́, руль и надёжные тормоза́. Води́тель сиди́т за рулём, смо́трит на доро́гу и соблюда́ет пра́вила доро́жного движе́ния на перекрёстке у светофо́ра.',
        translationNotes: {
          ru: 'Базовая лексика для будущих инженеров автомобильного транспорта.',
          en: 'Core terminology for future automotive and transport engineers.',
          ar: 'المصطلحات الأساسية لمهندسي السيارات والنقل المستقبليين.',
          fr: 'Terminologie de base pour les futurs ingénieurs automobiles.',
        },
      },
    ],
  },
  {
    id: 'lib-04',
    title: {
      ru: 'Л. Н. Толсто́й — Коро́ткие расска́зы (Адапти́ровано A1)',
      en: 'Leo Tolstoy — Short Fables (Adapted for A1 Learners)',
      ar: 'ليو تولستوي — قصص قصيرة مبسطة للمستوى A1',
      fr: 'Léon Tolstoï — Contes courts (Adaptés niveau A1)',
    },
    author: 'Л. Н. Толстой (Public Domain / Adapted)',
    section: 'reading',
    level: 'A1',
    topic: 'literature',
    explanationLang: 'all',
    licenseType: 'public_domain',
    licenseText: 'Public Domain (Pre-1917 Classic Text with A1 stress marks)',
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'admin-1',
    pages: [
      {
        pageNumber: 1,
        heading: 'Два това́рища',
        russianText:
          'Шли по ле́су два това́рища. Вдруг вы́шел на доро́гу большо́й медве́дь. Оди́н ма́льчик побежа́л и влез на высо́кое де́рево, а друго́й оста́лся на доро́ге. Но всё зако́нчилось хорошо́: настоя́щие друзья́ всегда́ помога́ют друг дру́гу в тру́дную мину́ту.',
        translationNotes: {
          ru: 'Классическая притча о дружбе и взаимовыручке.',
          en: 'Classic Russian fable about friendship and mutual help.',
          ar: 'حكاية روسية كلاسيكية عن الصداقة والمساعدة المتبادلة.',
          fr: 'Fable russe classique sur l’amitié et l’entraide.',
        },
      },
    ],
  },
  {
    id: 'lib-05',
    title: {
      ru: 'А. П. Че́хов — Юмористи́ческие миниатю́ры (A2)',
      en: 'Anton Chekhov — Humorous Miniatures (A2 Reader)',
      ar: 'أنطون تشيخوف — قصص قصيرة فكاهية (مستوى A2)',
      fr: 'Anton Tchekhov — Miniatures humoristiques (A2)',
    },
    author: 'А. П. Чехов (Public Domain)',
    section: 'reading',
    level: 'A2',
    topic: 'literature',
    explanationLang: 'all',
    licenseType: 'public_domain',
    licenseText: 'Public Domain Classic Russian Literature',
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'admin-1',
    pages: [
      {
        pageNumber: 1,
        heading: 'В пое́зде по доро́ге в Москву́',
        russianText:
          'По́езд бы́стро ехал в Москву́. В ваго́не сиде́ли пассажи́ры, пи́ли горя́чий чай из стака́на и разгова́ривали о пого́де, о но́вых доро́гах и о большо́м го́роде.',
        translationNotes: {
          ru: 'Традиция пить чай в поезде — важная часть русской дорожной культуры.',
          en: 'Drinking tea on a train is an iconic part of Russian travel culture.',
          ar: 'شرب الشاي في القطار جزء أصيل من ثقافة السفر الروسية.',
          fr: 'Boire du thé dans le train fait partie de la culture du voyage en Russie.',
        },
      },
    ],
  },
  {
    id: 'lib-06',
    title: {
      ru: 'Глаго́лы движе́ния: идти́ / ходи́ть, е́хать / е́здить',
      en: 'Russian Verbs of Motion: Foot vs. Vehicle',
      ar: 'أفعال الحركة الروسية: مشياً على الأقدام مقابل المركبة',
      fr: 'Les verbes de mouvement russes : à pied vs en véhicule',
    },
    author: AI_EDITORIAL_ATTRIBUTION,
    section: 'grammar_ref',
    level: 'A2',
    topic: 'grammar',
    explanationLang: 'all',
    licenseType: '',
    licenseText: '',
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'admin-1',
    pages: [
      {
        pageNumber: 1,
        heading: 'Однонапра́вленное и разнонапра́вленное движе́ние',
        russianText:
          'Когда́ вы дви́жетесь пешко́м в одно́м направле́нии прямо сейчас, говори́те: «Я иду́ в университе́т». Е́сли вы е́дете на авто́бусе, метро́ или маши́не, говори́те: «Я е́ду по шоссе́ в Москву́». Для регуля́рных пое́здок испо́льзуйте глаго́лы «ходи́ть» и «е́здить».',
        translationNotes: {
          ru: 'Идти́/ходи́ть = пешком; е́хать/е́здить = на транспорте.',
          en: 'Идти́/ходи́ть = on foot; е́хать/е́здить = by vehicle/transport.',
          ar: 'Идти́/ходи́ть = مشياً؛ е́хать/е́здить = بوسيلة نقل.',
          fr: 'Идти́/ходи́ть = à pied ; е́хать/е́здить = en transport.',
        },
      },
    ],
  },
  {
    id: 'lib-07',
    title: {
      ru: 'Подгото́вка к ТРКИ-1 (B1): Образцы́ зада́ний',
      en: 'TORFL-1 (TRKI) Exam Prep: Speaking & Grammar Drills',
      ar: 'التحضير لامتحان اللغة الروسية ТРКИ-1: تدريبات القواعد والمحادثة',
      fr: 'Préparation à l’examen TRKI-1 : exercices de grammaire et d’oral',
    },
    author: AI_EDITORIAL_ATTRIBUTION,
    section: 'exam_prep',
    level: 'B1',
    topic: 'exam',
    explanationLang: 'all',
    licenseType: '',
    licenseText: '',
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'admin-1',
    pages: [
      {
        pageNumber: 1,
        heading: 'Тре́бования к у́стному экза́мену',
        russianText:
          'На экза́мене студе́нт до́лжен уме́ть поддержа́ть диало́г в бытово́й и уче́бной ситуа́ции, пра́вильно испо́льзовать падежи́ и прочита́ть короткий текст с ве́рным ударе́нием.',
        translationNotes: {
          ru: 'Тренируйтесь в окне «Говорить» перед сдачей зачёта.',
          en: 'Practice in the "Speak" window before taking your oral test.',
          ar: 'تدرب في نافذة "تحدث" قبل التقدم للاختبار الشفهي.',
          fr: 'Entraînez-vous dans l’onglet « Parler » avant l’examen oral.',
        },
      },
    ],
  },
  {
    id: 'lib-08',
    title: {
      ru: 'Мосты́ и на́бережные Москвы́: текст для чте́ния',
      en: 'Bridges and Embankments of Moscow: Cultural Reader',
      ar: 'جسور وضفاف موسكو: نص للقراءة الثقافية',
      fr: 'Ponts et quais de Moscou : lecture culturelle',
    },
    author: AI_EDITORIAL_ATTRIBUTION,
    section: 'reading',
    level: 'A2',
    topic: 'cars_roads',
    explanationLang: 'all',
    licenseType: '',
    licenseText: '',
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'admin-1',
    pages: [
      {
        pageNumber: 1,
        heading: 'Инжене́рное иску́сство моско́вских мосто́в',
        russianText:
          'В Москве́ мно́го краси́вых и про́чных мосто́в че́рез реку́. Ка́ждый мост — э́то сло́жная инжене́рная констру́кция, по кото́рой день и ночь е́дут маши́ны, авто́бусы и тролле́йбусы.',
        translationNotes: {
          ru: 'Отличный текст для повторения лексики по теме «Дороги и мосты».',
          en: 'Great reading text to review vocabulary on "Roads and Bridges".',
          ar: 'نص قراءة ممتاز لمراجعة مفردات "الطرق والجسور".',
          fr: 'Excellent texte pour réviser le vocabulaire des « Routes et ponts ».',
        },
      },
    ],
  },
  {
    id: 'lib-09',
    title: {
      ru: 'Слова́рь математи́ческих и физи́ческих те́рминов (A2)',
      en: 'Glossary of Math & Physics Terms for Preparatory Faculty',
      ar: 'مسرد مصطلحات الرياضيات والفيزياء للسنة التحضيرية',
      fr: 'Glossaire de mathématiques et de physique (Faculté préparatoire)',
    },
    author: AI_EDITORIAL_ATTRIBUTION,
    section: 'textbooks',
    level: 'A2',
    topic: 'campus',
    explanationLang: 'all',
    licenseType: '',
    licenseText: '',
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'admin-1',
    pages: [
      {
        pageNumber: 1,
        heading: 'Ско́рость, вре́мя и расстоя́ние',
        russianText:
          'Чтобы найти́ ско́рость автомоби́ля, ну́жно раздели́ть расстоя́ние на вре́мя в пути́. В ме́ждународной систе́ме ско́рость измеря́ется в киломе́трах в час или в ме́трах в секу́нду.',
        translationNotes: {
          ru: 'Базовые формулы физики движения на русском языке.',
          en: 'Basic formulas of motion physics in Russian.',
          ar: 'المعادلات الأساسية لفيزياء الحركة باللغة الروسية.',
          fr: 'Formules de base de la physique du mouvement en russe.',
        },
      },
    ],
  },
  {
    id: 'lib-10',
    title: {
      ru: 'Методи́ческое посо́бие для преподава́телей РКИ',
      en: 'Teacher’s Handbook: Running Speaking & Typing Labs',
      ar: 'دليل المدرس: إدارة مختبرات المحادثة والطباعة',
      fr: 'Guide de l’enseignant : animer les ateliers d’oral et de frappe',
    },
    author: AI_EDITORIAL_ATTRIBUTION,
    section: 'teacher_materials',
    level: 'B2',
    topic: 'campus',
    explanationLang: 'all',
    licenseType: '',
    licenseText: '',
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'admin-1',
    pages: [
      {
        pageNumber: 1,
        heading: 'Как испо́льзовать «Гара́ж» и «Лаборато́рию печа́ти» на уро́ке',
        russianText:
          'Рекоменду́ется начина́ть заня́тие с пятимину́тной разми́нки в «Лаборато́рии печа́ти», а зате́м назнача́ть студе́нтам ролевы́е диало́ги и ко́роткие аудиокли́пы по теме неде́ли.',
        translationNotes: {
          ru: 'Пособие для кураторов учебных групп в панели преподавателя.',
          en: 'Guide for group instructors using the Teacher Dashboard.',
          ar: 'دليل لمدرسي المجموعات الذين يستخدمون لوحة تحكم المدرس.',
          fr: 'Guide pour les enseignants utilisant le tableau de bord.',
        },
      },
    ],
  },
  {
    id: 'lib-11',
    title: {
      ru: 'А. С. Пу́шкин — Стихи́ о зиме́ и доро́ге (Адапти́ровано)',
      en: 'Alexander Pushkin — Winter Road Poems (With Stress Marks)',
      ar: 'ألكسندر بوشكين — قصائد عن الشتاء والطريق (مع علامات النبر)',
      fr: 'Alexandre Pouchkine — Poèmes sur l’hiver et la route (Accentués)',
    },
    author: 'А. С. Пушкин (Public Domain)',
    section: 'reading',
    level: 'A2',
    topic: 'literature',
    explanationLang: 'all',
    licenseType: 'public_domain',
    licenseText: 'Public Domain Classic Poetry',
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'admin-1',
    pages: [
      {
        pageNumber: 1,
        heading: 'Зи́мняя доро́га (Отры́вок)',
        russianText:
          'Моро́з и со́лнце; день чуде́сный! По зи́мней доро́ге бы́стро лети́т тройка, а вокру́г блести́т бе́лый снег под голубы́м не́бом.',
        translationNotes: {
          ru: 'Знаменитые строки А. С. Пушкина для тренировки ритма и ударения.',
          en: 'Famous lines by Pushkin for practicing Russian rhythm and word stress.',
          ar: 'أبيات شهيرة لبوشكين للتدرب على الإيقاع والنبر الروسي.',
          fr: 'Vers célèbres de Pouchkine pour travailler le rythme et l’accent tonique.',
        },
      },
    ],
  },
  {
    id: 'lib-12',
    title: {
      ru: 'Ви́ды глаго́ла: несоверше́нный и соверше́нный вид',
      en: 'Verb Aspects: Imperfective Process vs. Perfective Result',
      ar: 'هيئات الفعل الروسي: الاستمرارية مقابل النتيجة المكتملة',
      fr: 'Les aspects du verbe : processus imperfectif vs résultat perfectif',
    },
    author: AI_EDITORIAL_ATTRIBUTION,
    section: 'grammar_ref',
    level: 'A2',
    topic: 'grammar',
    explanationLang: 'all',
    licenseType: '',
    licenseText: '',
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'admin-1',
    pages: [
      {
        pageNumber: 1,
        heading: 'Чита́ть / Прочита́ть, Де́лать / Сде́лать',
        russianText:
          'Несоверше́нный вид пока́зывает проце́сс или повторе́ние: «Вчера́ ве́чером я до́лго чита́л уче́бник». Соверше́нный вид пока́зывает гото́вый результа́т: «Я уже́ прочита́л всю главу́ и сде́лал дома́шнее зада́ние».',
        translationNotes: {
          ru: 'Процесс (долго, часто) = НСВ; Результат (уже, вдруг) = СВ.',
          en: 'Process/habit = Imperfective; Completed result = Perfective.',
          ar: 'العملية أو العادة = غير مكتمل؛ النتيجة التامة = مكتمل.',
          fr: 'Processus/habitude = Imperfectif ; Résultat achevé = Perfectif.',
        },
      },
    ],
  },
  {
    id: 'lib-13',
    title: {
      ru: 'Тест по ле́ксике A1: Ка́мпус, Метро́ и Кафе́',
      en: 'A1 Vocabulary Checkpoint: Campus, Metro & Cafe',
      ar: 'اختبار مفردات المستوى A1: الجامعة والمترو والمقهى',
      fr: 'Test de vocabulaire A1 : Campus, Métro et Café',
    },
    author: AI_EDITORIAL_ATTRIBUTION,
    section: 'exam_prep',
    level: 'A1',
    topic: 'exam',
    explanationLang: 'all',
    licenseType: '',
    licenseText: '',
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'admin-1',
    pages: [
      {
        pageNumber: 1,
        heading: 'Контро́льный спи́сок фра́з пе́рвого семесте́ра',
        russianText:
          'Проверьте себя́: мо́жете ли вы спроси́ть доро́гу к ста́нции метро́, заказа́ть обе́д в столо́вой, купи́ть ка́рту «Тро́йка» и назва́ть но́мер свое́й аудито́рии?',
        translationNotes: {
          ru: 'Используйте этот список перед контрольной работой.',
          en: 'Use this checklist before your first-semester progress test.',
          ar: 'استخدم قائمة المراجعة هذه قبل اختبار منتصف الفصل.',
          fr: 'Utilisez cette liste de contrôle avant votre évaluation.',
        },
      },
    ],
  },
  {
    id: 'lib-14',
    title: {
      ru: 'Пра́вила доро́жного движе́ния (ПДД) для пешехо́дов и води́телей',
      en: 'Russian Road Traffic Signs & Safety Rules Explained',
      ar: 'قواعد المرور وإشارات الطرق الروسية للمشاة والسائقين',
      fr: 'Code de la route russe et panneaux expliqués',
    },
    author: AI_EDITORIAL_ATTRIBUTION,
    section: 'textbooks',
    level: 'A2',
    topic: 'cars_roads',
    explanationLang: 'all',
    licenseType: '',
    licenseText: '',
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'admin-1',
    pages: [
      {
        pageNumber: 1,
        heading: 'Сигна́лы светофо́ра и пешехо́дный перехо́д',
        russianText:
          'Кра́сный свет светофо́ра означа́ет «Сто́йте!», жёлтый свет — «Пригото́вьтесь!», а зелёный свет разреша́ет движе́ние че́рез перекрёсток по пешехо́дному перехо́ду.',
        translationNotes: {
          ru: 'Знание дорожных знаков помогает и на дороге, и в изучении грамматики.',
          en: 'Knowing road signs helps both on the road and in mastering Russian grammar.',
          ar: 'معرفة إشارات المرور تساعد في الطريق وفي إتقان القواعد الروسية.',
          fr: 'Connaître les panneaux aide sur la route comme en grammaire russe.',
        },
      },
    ],
  },
  {
    id: 'lib-15',
    title: {
      ru: 'Исто́рия моско́вского метрополите́на (Кни́га для чте́ния)',
      en: 'History of the Moscow Metro: Underground Palaces',
      ar: 'تاريخ مترو موسكو: قصور تحت الأرض',
      fr: 'Histoire du métro de Moscou : palais souterrains',
    },
    author: AI_EDITORIAL_ATTRIBUTION,
    section: 'reading',
    level: 'B1',
    topic: 'metro',
    explanationLang: 'all',
    licenseType: '',
    licenseText: '',
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'admin-1',
    pages: [
      {
        pageNumber: 1,
        heading: 'Ста́нция «Аэропо́рт» и архитекту́ра тридца́тых годо́в',
        russianText:
          'Ста́нция метро́ «Аэропо́рт» была́ откры́та в ты́сяча девятьсо́т три́дцать восьмо́м году́. Её просто́рный свод укра́шен дли́нными релье́фными ли́ниями, кото́рые напомина́ют парашю́тные стро́пы в небе́.',
        translationNotes: {
          ru: 'Станция «Аэропорт» расположена прямо у учебного кампуса МАДИ.',
          en: 'Aeroport station is located right outside the MADI university campus.',
          ar: 'تقع محطة "أيروبورت" مباشرة أمام حرم جامعة مادي.',
          fr: 'La station « Aeroport » est située juste devant le campus de MADI.',
        },
      },
    ],
  },
  {
    id: 'lib-16',
    title: {
      ru: 'Секре́ты ру́сского ударе́ния и реду́кции гла́сных',
      en: 'Secrets of Russian Word Stress & Vowel Reduction (о -> а)',
      ar: 'أسرار النبر الصوتي وتخفيف الحروف الصوتية في الروسية',
      fr: 'Secrets de l’accent tonique russe et de la réduction vocalique',
    },
    author: AI_EDITORIAL_ATTRIBUTION,
    section: 'grammar_ref',
    level: 'A1',
    topic: 'grammar',
    explanationLang: 'all',
    licenseType: '',
    licenseText: '',
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'admin-1',
    pages: [
      {
        pageNumber: 1,
        heading: 'Почему́ «молоко́» звучи́т как [малако́]?',
        russianText:
          'В ру́сском языке́ то́лько оди́н слог в сло́ве произно́сится под ударе́нием чётко и си́льно. Безуда́рная бу́ква «о» произно́сится кра́тко, почти́ как звук [а]: молоко́, хорошо́, Москва́, доро́га.',
        translationNotes: {
          ru: 'Это главное правило для естественного произношения в окне «Говорить».',
          en: 'This is the #1 rule for natural pronunciation in the "Speak" window.',
          ar: 'هذه هي القاعدة الأولى للنطق الطبيعي في نافذة "تحدث".',
          fr: 'C’est la règle n°1 pour une prononciation naturelle dans l’onglet « Parler ».',
        },
      },
    ],
  },
  {
    id: 'lib-17',
    title: {
      ru: 'Экзаменацио́нные диало́ги для инжене́рных специа́льностей (A2)',
      en: 'Oral Exam Dialogues for Engineering Students (A2)',
      ar: 'حوارات الامتحان الشفهي لطلاب التخصصات الهندسية (A2)',
      fr: 'Dialogues d’examen oral pour étudiants ingénieurs (A2)',
    },
    author: AI_EDITORIAL_ATTRIBUTION,
    section: 'exam_prep',
    level: 'A2',
    topic: 'exam',
    explanationLang: 'all',
    licenseType: '',
    licenseText: '',
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'admin-1',
    pages: [
      {
        pageNumber: 1,
        heading: 'Диало́г в лаборато́рии испита́ния двига́телей',
        russianText:
          'Преподава́тель спра́шивает студе́нта о рабо́те двига́теля вну́треннего сгора́ния, о расхо́де бензи́на и о безопа́сности на скоростно́м шоссе́.',
        translationNotes: {
          ru: 'Обязательный минимум для зачёта по научному стилю речи.',
          en: 'Required minimum for the Scientific Russian credit test.',
          ar: 'الحد الأدنى المطلوب لاجتياز اختبار اللغة الروسية العلمية.',
          fr: 'Minimum requis pour l’évaluation de russe scientifique.',
        },
      },
    ],
  },
  {
    id: 'lib-18',
    title: {
      ru: 'Ш.Абло́ны уро́ков и зада́ний для конструктора (Teacher Pack)',
      en: 'Lesson Builder Templates & Rubric Guide for Teachers',
      ar: 'قوالب بناء الدروس ودليل التقييم للمدرسين',
      fr: 'Modèles de leçons et grille d’évaluation pour enseignants',
    },
    author: AI_EDITORIAL_ATTRIBUTION,
    section: 'teacher_materials',
    level: 'B1',
    topic: 'campus',
    explanationLang: 'all',
    licenseType: '',
    licenseText: '',
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'admin-1',
    pages: [
      {
        pageNumber: 1,
        heading: 'Структу́ра пятнадцатимину́тного микро-уро́ка',
        russianText:
          'Идеа́льный уро́к включа́ет одну́ ка́рточку с пра́вилом, четы́ре упражне́ния на трениро́вку падеже́й и оди́н ролево́й аудиокли́п для закрепле́ния в у́стной ре́чи.',
        translationNotes: {
          ru: 'Используйте визуальный конструктор уроков в панели преподавателя.',
          en: 'Use the visual No-Code Lesson Builder inside the Teacher Dashboard.',
          ar: 'استخدم أداة بناء الدروس المرئية داخل لوحة تحكم المدرس.',
          fr: 'Utilisez le créateur de leçons sans code dans le tableau de bord.',
        },
      },
    ],
  },
  {
    id: 'lib-19',
    title: {
      ru: 'Русские наро́дные посло́вицы о доро́ге и труде́',
      en: 'Russian Folk Proverbs About Roads, Travel & Craft',
      ar: 'أمثال شعبية روسية عن الطريق والسفر والعمل',
      fr: 'Proverbes populaires russes sur la route et le travail',
    },
    author: 'В. И. Даль (Public Domain Collection)',
    section: 'reading',
    level: 'A2',
    topic: 'literature',
    explanationLang: 'all',
    licenseType: 'public_domain',
    licenseText: 'Public Domain Folklore Collection',
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'admin-1',
    pages: [
      {
        pageNumber: 1,
        heading: 'Посло́вицы в пу́ть',
        russianText:
          '«Ти́ше е́дешь — да́льше бу́дешь». «Са́мая тру́дная доро́га та, кото́рую не зна́ешь». «Терпе́ние и труд всё перетру́т».',
        translationNotes: {
          ru: 'Крылатые выражения, которые часто встречаются в живой русской речи.',
          en: 'Idiomatic sayings frequently heard in everyday Russian conversation.',
          ar: 'عبارات مأثورة تُسمع كثيراً في المحادثات الروسية اليومية.',
          fr: 'Expressions idiomatiques fréquentes dans la conversation russe.',
        },
      },
    ],
  },
  {
    id: 'lib-20',
    title: {
      ru: 'Этике́т обще́ния в университе́те: «Ты» или «Вы»?',
      en: 'University Etiquette: Formal "Вы" vs. Informal "Ты"',
      ar: 'آداب التواصل الجامعي: متى تستخدم الصيغة الرسمية وغير الرسمية؟',
      fr: 'Étiquette universitaire : le vouvoiement « Вы » vs le tutoiement « Ты »',
    },
    author: AI_EDITORIAL_ATTRIBUTION,
    section: 'grammar_ref',
    level: 'A1',
    topic: 'campus',
    explanationLang: 'all',
    licenseType: '',
    licenseText: '',
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'admin-1',
    pages: [
      {
        pageNumber: 1,
        heading: 'Пра́вила ве́жливого обраще́ния в России',
        russianText:
          'К преподава́телю, дека́ну, води́телю такси́ и прода́вцу в магази́не всегда́ обраща́йтесь на «Вы» и по и́мени-о́тчеству: «Здра́вствуйте, Еле́на Петро́вна! Скажи́те, пожа́луйста...». К друзья́м и одногру́ппникам обраща́йтесь на «ты»: «Приве́т, Ми́ша! Как дела́?».',
        translationNotes: {
          ru: 'В клипах madingo всегда указан регистр: официальный или разговорный.',
          en: 'Every clip in madingo shows a badge for "Formal" or "Colloquial" register.',
          ar: 'يظهر في كل مقطع في madingo شارة توضح الأسلوب: رسمي أو غير رسمي.',
          fr: 'Chaque clip de madingo indique le registre : « Formel » ou « Familier ».',
        },
      },
    ],
  },
];

const VERIFIED_PUBLIC_DOMAIN_URLS: Record<string, { author: string; sourceUrl: string }> = {
  'lib-04': {
    author: 'Л. Н. Толстой (1828–1910, Public Domain)',
    sourceUrl: 'https://ru.wikisource.org/wiki/Два_товарища_(Толстой)',
  },
  'lib-11': {
    author: 'А. С. Пушкин (1799–1837, Public Domain)',
    sourceUrl: 'https://ru.wikisource.org/wiki/Зимняя_дорога_(Пушкин)',
  },
  'lib-19': {
    author: 'В. И. Даль (1801–1872, Public Domain)',
    sourceUrl: 'https://ru.wikisource.org/wiki/Пословицы_русского_народа_(Даль)',
  },
};

export const LIBRARY_SEED_ITEMS: LibraryItem[] = OFFICIAL_LIBRARY_CATALOG;
void RAW_LIBRARY_SEED_ITEMS;
void VERIFIED_PUBLIC_DOMAIN_URLS;

// ----------------------------------------------------------------------------
// 4. TEACHER DASHBOARD, GROUPS, REVIEW QUEUE & AUDIT SEED DATA
// ----------------------------------------------------------------------------

export interface StudentProgressSummary {
  id: string;
  name: string;
  email: string;
  nativeLang: 'en' | 'ar' | 'fr' | 'ru';
  lessonsCompleted: number;
  accuracy: number;
  streakDays: number;
  fuel: number;
  timeSpentMin: number;
  avgSpeakingScore: number;
  typingCpm: number;
  garageDueCount: number;
  weakLetters: string[];
  weakCases: string[];
  weakWords: string[];
  lastActiveAt: string;
  inactiveAlert: boolean;
}

export interface TeacherGroup {
  id: string;
  name: string;
  inviteCode: string;
  teacherId: string;
  teacherName: string;
  level: 'A1' | 'A2';
  students: StudentProgressSummary[];
}

export interface GroupAssignment {
  id: string;
  groupId: string;
  targetType: 'lesson' | 'speaking_clip' | 'scenario' | 'typing_lab';
  targetId: string;
  title: string;
  dueDate: string;
  createdBy: string;
  completedStudentIds: string[];
}

export interface GroupAnnouncement {
  id: string;
  groupId: string;
  authorName: string;
  message: string;
  createdAt: string;
}

export interface ReviewQueueItem {
  id: string;
  itemType: 'ai_dialogue' | 'speaking_clip' | 'custom_lesson' | 'library_upload';
  title: string;
  level: 'A1' | 'A2' | 'B1' | 'B2';
  topic: string;
  grammarPoint: string;
  register: 'formal' | 'colloquial';
  status: ReviewStatus;
  createdBy: string;
  createdAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewerComments: string;
  consentConfirmed: boolean;
  consentDocumentUrl?: string | null;
  license?: string;
  sourceUrl?: string;
  lines: {
    speaker: string;
    ru: string;
    en: string;
    ar: string;
    fr: string;
  }[];
  vocabulary: string[];
  validationSummary: {
    stressMarksPassed: boolean;
    safeContentPassed: boolean;
    vocabLevelPassed: boolean;
  };
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  timestamp: string;
}

export interface ContentReportItem {
  id: string;
  targetType: 'library_item' | 'speaking_clip';
  targetId: string;
  targetTitle: string;
  reportedBy: string;
  reason: string;
  status: 'open' | 'unpublished_resolved' | 'dismissed';
  createdAt: string;
}

// Production defaults: empty arrays (no fabricated groups, students, assignments, or announcements)
export const INITIAL_TEACHER_GROUPS: TeacherGroup[] = [];
export const INITIAL_ASSIGNMENTS: GroupAssignment[] = [];
export const INITIAL_ANNOUNCEMENTS: GroupAnnouncement[] = [];

// Explicit Demo Mode synthetic data (only displayed when Demo Mode is explicitly toggled ON)
export const DEMO_TEACHER_GROUPS: TeacherGroup[] = [
  {
    id: 'demo-grp-101',
    name: '[DEMO] Подфа́к МАДИ́ — Гру́ппа 101',
    inviteCode: 'DEMO-101',
    teacherId: 'demo-teacher-1',
    teacherName: '[DEMO] Instructor #1',
    level: 'A1',
    students: [
      {
        id: 'demo-stu-1',
        name: '[DEMO] Student #1 (AR)',
        email: 'demo.student1@example.invalid',
        nativeLang: 'ar',
        lessonsCompleted: 4,
        accuracy: 90,
        streakDays: 3,
        fuel: 120,
        timeSpentMin: 45,
        avgSpeakingScore: 85,
        typingCpm: 110,
        garageDueCount: 2,
        weakLetters: ['Ы', 'Щ'],
        weakCases: ['Instrumental'],
        weakWords: ['перекрёсток', 'общежи́тие'],
        lastActiveAt: '2026-10-25T11:20:00Z',
        inactiveAlert: false,
      },
      {
        id: 'demo-stu-2',
        name: '[DEMO] Student #2 (FR)',
        email: 'demo.student2@example.invalid',
        nativeLang: 'fr',
        lessonsCompleted: 2,
        accuracy: 82,
        streakDays: 1,
        fuel: 60,
        timeSpentMin: 25,
        avgSpeakingScore: 76,
        typingCpm: 95,
        garageDueCount: 4,
        weakLetters: ['Ё', 'Й'],
        weakCases: ['Genitive', 'Prepositional'],
        weakWords: ['двига́тель', 'светофо́р'],
        lastActiveAt: '2026-10-25T08:45:00Z',
        inactiveAlert: false,
      },
    ],
  },
];

export const DEMO_ASSIGNMENTS: GroupAssignment[] = [
  {
    id: 'demo-asgn-01',
    groupId: 'demo-grp-101',
    targetType: 'lesson',
    targetId: 'u2-l1',
    title: '[DEMO] Уро́к: На кампусе МАДИ́ и в аудито́рии',
    dueDate: '2026-11-05',
    createdBy: '[DEMO] Instructor #1',
    completedStudentIds: [],
  },
];

export const DEMO_ANNOUNCEMENTS: GroupAnnouncement[] = [
  {
    id: 'demo-ann-01',
    groupId: 'demo-grp-101',
    authorName: '[DEMO] Instructor #1',
    message:
      '[DEMO] Приме́р объявле́ния для уче́бной гру́ппы в демонстрацио́нном режи́ме.',
    createdAt: '2026-10-25T09:00:00Z',
  },
];

export const INITIAL_REVIEW_QUEUE: ReviewQueueItem[] = [
  {
    id: 'rq-01',
    itemType: 'ai_dialogue',
    title: 'Диало́г в лаборато́рии доро́жных материа́лов',
    level: 'A2',
    topic: 'cars_roads',
    grammarPoint: 'Instrumental & Genitive Cases',
    register: 'formal',
    status: 'needs_review',
    createdBy: AI_EDITORIAL_ATTRIBUTION,
    createdAt: '2026-10-25T10:15:00Z',
    reviewedBy: null,
    reviewedAt: null,
    reviewerComments: 'Unreviewed AI editorial draft awaiting human teacher verification.',
    consentConfirmed: false,
    consentDocumentUrl: null,
    license: '',
    sourceUrl: '',
    lines: [
      {
        speaker: 'Преподава́тель',
        ru: 'Каки́м прибо́ром мы проверя́ем про́чность но́вого асфа́льта?',
        en: 'With which instrument do we test the strength of the new asphalt?',
        ar: 'بأي جهاز نفحص متانة الأسفلت الجديد؟',
        fr: 'Avec quel appareil vérifions-nous la résistance du nouvel asphalte ?',
      },
      {
        speaker: 'Студе́нт',
        ru: 'Мы измеря́ем нагру́зку специа́льным пре́ссом в доро́жной лаборато́рии.',
        en: 'We measure the load with a special press in the road laboratory.',
        ar: 'نقيس الحمولة بمكبس خاص في مختبر الطرق.',
        fr: 'Nous mesurons la charge avec une presse spéciale au laboratoire routier.',
      },
    ],
    vocabulary: ['прибо́р', 'асфа́льт', 'лаборато́рия', 'нагру́зка'],
    validationSummary: {
      stressMarksPassed: true,
      safeContentPassed: true,
      vocabLevelPassed: true,
    },
  },
];

export const INITIAL_AUDIT_LOG: AuditLogEntry[] = [];

export const INITIAL_REPORTS: ContentReportItem[] = [];


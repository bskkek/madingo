import { ReviewStatus } from '../lib/phase3Engine';

export type LibrarySection =
  | 'textbooks'
  | 'grammar_ref'
  | 'exercises'
  | 'reading'
  | 'scientific_engineering'
  | 'exam_prep'
  | 'teacher_materials';

export interface LibraryBookPage {
  pageNumber: number;
  heading: string;
  russianText: string;
  translationNotes: { ru: string; en: string; ar: string; fr: string };
}

export interface LibraryItem {
  id: string;
  title: { ru: string; en: string; ar: string; fr: string };
  author: string;
  publisher?: string;
  publicationYear?: number;
  totalPagesCount?: number;
  origin?: 'madi_official' | 'rki_classic';
  section: LibrarySection;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  topic: string;
  explanationLang: 'ru' | 'en' | 'ar' | 'fr' | 'all';
  licenseType: string;
  licenseText: string;
  sourceUrl?: string;
  pdfUrl?: string;
  coverImageUrl?: string;
  coverTheme?: 'madi_blue' | 'grammar_navy' | 'exercises_emerald' | 'reading_burgundy' | 'engineering_slate' | 'exam_amber';
  description?: { ru: string; en: string; ar: string; fr: string };
  permissionConfirmed: boolean;
  reviewStatus: ReviewStatus;
  reviewedBy: string | null;
  reviewedAt?: string | null;
  pages: LibraryBookPage[];
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function splitTitleLines(text: string, maxCharsPerLine = 22, maxLines = 4): string[] {
  const words = text.replace(/\u0301/g, '').split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if (!current) {
      current = w;
    } else if ((current + ' ' + w).length <= maxCharsPerLine) {
      current += ' ' + w;
    } else {
      lines.push(current);
      current = w;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines;
}

export function generateBookCoverSvgDataUrl(params: {
  titleRu: string;
  author: string;
  publisher: string;
  year: number;
  pagesCount: number;
  level: string;
  theme: NonNullable<LibraryItem['coverTheme']>;
  isMadiOfficial: boolean;
}): string {
  const lines = splitTitleLines(params.titleRu.toUpperCase(), 21, 5);
  const shortAuthor =
    params.author.length > 38 ? params.author.slice(0, 36) + '…' : params.author;

  const titleTspans = lines
    .map(
      (line, idx) =>
        `<tspan x="285" dy="${idx === 0 ? 0 : 26}">${escapeXml(line)}</tspan>`
    )
    .join('');

  const topInstitution = params.isMadiOfficial
    ? 'МОСКОВСКИЙ АВТОМОБИЛЬНО-ДОРОЖНЫЙ'
    : 'РУССКИЙ ЯЗЫК КАК ИНОСТРАННЫЙ (РКИ)';
  const subInstitution = params.isMadiOfficial
    ? 'ГОСУДАРСТВЕННЫЙ ТЕХНИЧЕСКИЙ УНИВЕРСИТЕТ (МАДИ)'
    : params.publisher.toUpperCase();

  // Authentic Russian Page 1 Title Sheet ("Титульный лист — Страница 1")
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 500" width="360" height="500">
    <!-- White Paper Page 1 Background -->
    <rect width="360" height="500" fill="#FFFFFF" />
    <!-- Subtle Paper Border -->
    <rect x="10" y="10" width="340" height="480" fill="none" stroke="#CBD5E1" stroke-width="1" />
    <!-- Top University / Publisher Header & Emblem -->
    <text x="34" y="42" fill="#0F172A" font-family="Liberation Sans, Arial, sans-serif" font-size="9.5" font-weight="700">${escapeXml(
      topInstitution
    )}</text>
    <text x="34" y="55" fill="#0F172A" font-family="Liberation Sans, Arial, sans-serif" font-size="9" font-weight="700">${escapeXml(
      subInstitution
    )}</text>
    <!-- Official MADI / RKI Circle Emblem Top-Right -->
    <g transform="translate(306, 48)">
      <circle cx="0" cy="0" r="20" fill="none" stroke="#0F172A" stroke-width="2.5" />
      <circle cx="0" cy="0" r="15" fill="none" stroke="#0F172A" stroke-width="1" />
      <line x1="-22" y1="2" x2="22" y2="2" stroke="#0F172A" stroke-width="1.8" />
      <text x="0" y="-2" text-anchor="middle" fill="#0F172A" font-family="Liberation Sans, Arial, sans-serif" font-size="8.5" font-weight="900">${escapeXml(
        params.isMadiOfficial ? 'МАДИ' : 'РКИ'
      )}</text>
    </g>
    <!-- Author Name (Italic above frame, matching real MADI Page 1 layout) -->
    <text x="54" y="138" fill="#0F172A" font-family="Liberation Sans, Arial, sans-serif" font-size="13" font-style="italic" font-weight="700">${escapeXml(
      shortAuthor.replace(/\u0301/g, '')
    )}</text>
    <!-- Classic MADI Double-Line Step Frame around Title -->
    <polyline points="42,105 42,156 306,156 306,320 42,320 42,372" fill="none" stroke="#0F172A" stroke-width="2.4" />
    <polyline points="46,105 46,152 310,152 310,324 46,324 46,372" fill="none" stroke="#0F172A" stroke-width="1.1" />
    <!-- Right-Aligned Bold Uppercase Book Title inside Frame -->
    <text x="285" y="192" text-anchor="end" fill="#0F172A" font-family="Liberation Sans, Arial, sans-serif" font-size="17.5" font-weight="800">${titleTspans}</text>
    <!-- Subtitle Below Frame -->
    <text x="54" y="352" fill="#0F172A" font-family="Liberation Sans, Arial, sans-serif" font-size="12.5" font-style="italic">УЧЕБНОЕ ПОСОБИЕ · ${escapeXml(
      params.level
    )}</text>
    <!-- Bottom Imprint (Москва · Year · Pages) -->
    <text x="180" y="458" text-anchor="middle" fill="#0F172A" font-family="Liberation Sans, Arial, sans-serif" font-size="11.5" font-weight="700">Москва · ${
      params.year
    }</text>
    <text x="180" y="474" text-anchor="middle" fill="#475569" font-family="Liberation Sans, Arial, sans-serif" font-size="10">${
      params.pagesCount
    } с. · Титульный лист (стр. 1)</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const RAW_OFFICIAL_BOOKS: Omit<LibraryItem, 'coverImageUrl'>[] = [
  // ==========================================================================
  // 1. TEXTBOOKS & PREPARATORY COURSES (7 BOOKS)
  // ==========================================================================
  {
    id: 'madi-pf-01',
    title: {
      ru: 'Адаптацио́нный курс ру́сского языка́ для уча́щихся подготови́тельного факульте́та',
      en: 'Adaptation Course of Russian for Preparatory Faculty Students',
      ar: 'دورة التكيف في اللغة الروسية لطلاب السنة التحضيرية (جامعة مادي)',
      fr: 'Cours d’adaptation de russe pour la faculté préparatoire MADI',
    },
    author: 'Кожевникова М.Н. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2014,
    totalPagesCount: 44,
    origin: 'madi_official',
    section: 'textbooks',
    level: 'A1',
    topic: 'campus',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальная электронная библиотека ПФ МАДИ (lib.madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://lib.madi.ru/fel/fel1/fel14E182.pdf',
    coverTheme: 'madi_blue',
    description: {
      ru: 'Базовое учебное пособие кафедры русского языка МАДИ для первых недель обучения иностранных студентов.',
      en: 'Foundational MADI Russian Department textbook for the first weeks of international preparatory study.',
      ar: 'الكتاب الأساسي لقسم اللغة الروسية في جامعة مادي للأسابيع الأولى لطلاب السنة التحضيرية.',
      fr: 'Manuel fondamental du département de russe de MADI pour les premières semaines.',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра русского языка ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Уро́к 1. Знако́мство с университе́том МАДИ́ и алфави́том',
        russianText:
          'Здра́вствуйте! Добро́ пожа́ловать в Моско́вский автомоби́льно-доро́жный госуда́рственный техни́ческий университе́т (МАДИ́). Э́то наш гла́вный уче́бный ко́рпус на Ленингра́дском проспе́кте, дом шестьдеся́т четы́ре. Здесь студе́нты подготови́тельного факульте́та изуча́ют ру́сский язы́к, матема́тику, фи́зику и черче́ние.',
        translationNotes: {
          ru: 'Официальное пособие М.Н. Кожевниковой (МАДИ, 44 с.). Нажмите на любое слово для мгновенного перевода.',
          en: 'Official MADI textbook by M.N. Kozhevnikova (44 pp.). Tap any Russian word for instant AI translation.',
          ar: 'كتاب رسمي من جامعة مادي تأليف م.ن. كوجيفنيكوفا (44 صفحة). اضغط على أي كلمة للترجمة الفورية.',
          fr: 'Manuel officiel MADI par M.N. Kozhevnikova (44 p.). Touchez un mot pour le traduire.',
        },
      },
      {
        pageNumber: 2,
        heading: 'Уро́к 2. В уче́бной аудито́рии и на переры́ве',
        russianText:
          'В аудито́рии стои́т стол преподава́теля, сту́лья и больша́я доска́. На столе́ лежа́т уче́бник, слова́рь, тетра́дь и ру́чка. Преподава́тель чита́ет но́вый текст, а студе́нты внима́тельно слу́шают, повторя́ют слова́ и пи́шут упражне́ния.',
        translationNotes: {
          ru: 'Лексика первого месяца обучения на подготовительном факультете.',
          en: 'Core classroom vocabulary for month 1 at the Preparatory Faculty.',
          ar: 'مفردات القاعة الدراسية للشهر الأول في الكلية التحضيرية.',
          fr: 'Vocabulaire de la salle de classe pour le premier mois.',
        },
      },
    ],
  },
  {
    id: 'madi-pf-02',
    title: {
      ru: 'Уче́бное посо́бие по обуче́нию разгово́рной ре́чи. Нача́льный эта́п',
      en: 'Spoken Russian Training Manual for International Students (Elementary)',
      ar: 'كتاب تعليم المحادثة باللغة الروسية للطلاب الأجانب — المرحلة الابتدائية (مادي)',
      fr: 'Manuel d’expression orale russe pour étudiants internationaux (Niveau initial)',
    },
    author: 'Алешичева Н.Н. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2005,
    totalPagesCount: 43,
    origin: 'madi_official',
    section: 'textbooks',
    level: 'A1',
    topic: 'campus',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальная электронная библиотека ПФ МАДИ (lib.madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://lib.madi.ru/fel/fel1/fel15E337.pdf',
    coverTheme: 'madi_blue',
    description: {
      ru: 'Диалоги, речевые модели и коммуникативные упражнения для развития устной речи на подготовительном факультете.',
      en: 'Dialogues, speech models, and communicative drills for developing spoken Russian at MADI.',
      ar: 'حوارات ونماذج كلامية وتمارين تواصلية لتطوير مهارات التحدث بالروسية في السنة التحضيرية.',
      fr: 'Dialogues et modèles de communication pour développer l’expression orale.',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра русского языка ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Разде́л 1. Речево́й этике́т: Приве́тствие, знако́мство и обраще́ние',
        russianText:
          '— Скажи́те, пожа́луйста, как вас зову́т и отку́да вы прие́хали? — Меня́ зову́т Ами́р, я прие́хал из Алжи́ра. Сейча́с я живу́ в Москве́ в студе́нческом общежи́тии и учу́сь на подготови́тельном факульте́те МАДИ́.',
        translationNotes: {
          ru: 'Отработка устных диалогов при знакомстве с преподавателем и одногруппниками.',
          en: 'Practicing spoken dialogues when meeting professors and classmates.',
          ar: 'تدريبات الحوار الشفهي عند التعارف مع الأساتذة والزملاء.',
          fr: 'Pratique des dialogues oraux lors des présentations.',
        },
      },
    ],
  },
  {
    id: 'madi-pf-03',
    title: {
      ru: 'Слова́рь-приложе́ние к уче́бнику по РКИ «На́ше вре́мя» (Элемента́рный у́ровень)',
      en: 'Companion Dictionary to the RKI Textbook "Our Time" (Elementary A1)',
      ar: 'القاموس الملحق بكتاب اللغة الروسية للأجانب «وقتنا — Наше время» (المستوى الابتدائي)',
      fr: 'Dictionnaire compagnon du manuel de russe « Notre Temps » (Niveau A1)',
    },
    author: 'Кафедра русского языка ПФ МАДИ',
    publisher: 'Издательство МАДИ',
    publicationYear: 2016,
    totalPagesCount: 116,
    origin: 'madi_official',
    section: 'textbooks',
    level: 'A1',
    topic: 'campus',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальная электронная библиотека ПФ МАДИ (lib.madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://lib.madi.ru/fel/fel1/fel16M478.pdf',
    coverTheme: 'madi_blue',
    description: {
      ru: 'Полный учебный словарь лексического минимума элементарного уровня к комплексу «Наше время» (116 стр.).',
      en: 'Complete 116-page elementary lexical minimum dictionary for the "Nashe Vremya" textbook series.',
      ar: 'معجم مفردات المستوى الابتدائي الكامل (116 صفحة) المعتمد مع سلسلة كتب «Наше время» في جامعة مادي.',
      fr: 'Dictionnaire complet du vocabulaire élémentaire (116 pages) pour la série « Nashe Vremya ».',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра русского языка ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Лекси́ческий ми́нимум элемента́рного у́ровня (A1)',
        russianText:
          'Авто́бус, апте́ка, аудито́рия, библиоте́ка, биле́т, вокза́л, вре́мя, го́род, декана́т, дома́шнее зада́ние, доро́га, зачёт, изуча́ть, инжене́р, ко́мната, ле́кция, магази́н, метро́, мо́ст, общежи́тие, остано́вка, па́спорт, перекрёсток, преподава́тель, расписа́ние, слова́рь, ста́нция, столо́вая, студе́нт, тетра́дь, у́лица, университе́т, уче́бник, экза́мен.',
        translationNotes: {
          ru: 'Базовый лексический фонд для сдачи теста элементарного уровня (ТЭУ / A1).',
          en: 'Core lexical minimum required for the Elementary Level Russian Test (TEU / A1).',
          ar: 'الحد الأدنى للمفردات الأساسية المطلوبة لاجتياز اختبار المستوى الابتدائي (A1).',
          fr: 'Vocabulaire de base requis pour le test de niveau élémentaire (A1).',
        },
      },
    ],
  },
  {
    id: 'madi-pf-04',
    title: {
      ru: 'Пра́ктикум: Адапта́ция выпускнико́в ПФ МАДИ́ к реа́льным коммуникати́вным ситуа́циям',
      en: 'Practicum: Adapting MADI Preparatory Graduates to Real-Life Communication',
      ar: 'التطبيق العملي: تأهيل طلاب السنة التحضيرية بمادي لمواقف التواصل الرسمية واليومية',
      fr: 'Practicum : Adaptation aux situations réelles de communication en Russie',
    },
    author: 'Супоницкая М.Л., Никишина Ю.В. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2014,
    totalPagesCount: 32,
    origin: 'madi_official',
    section: 'textbooks',
    level: 'A2',
    topic: 'campus',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальная электронная библиотека ПФ МАДИ (lib.madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://lib.madi.ru/fel/fel1/fel14M192.pdf',
    coverTheme: 'madi_blue',
    description: {
      ru: 'Официально-деловое и повседневное общение в деканате, поликлинике, банке и транспорте Москвы.',
      en: 'Official business and everyday communication in the dean’s office, clinic, bank, and Moscow transit.',
      ar: 'التواصل الرسمي واليومي في العمادة والعيادة والبنك ووسائل النقل في موسكو.',
      fr: 'Communication officielle et quotidienne au décanat, à la banque et dans les transports.',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра русского языка ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'В декана́те и па́спортном отде́ле университе́та',
        russianText:
          'Чтобы получи́ть спра́вку об обуче́нии или продли́ть уче́бную ви́зу, студе́нт обраща́ется в декана́т подготови́тельного факульте́та. Необходи́мо предъяви́ть па́спорт, миграцио́нную ка́рту и студе́нческий биле́т.',
        translationNotes: {
          ru: 'Официально-деловая лексика для иностранных учащихся в России.',
          en: 'Administrative and official vocabulary for international students in Russia.',
          ar: 'المفردات الإدارية والرسمية الضرورية للطلاب الأجانب في روسيا.',
          fr: 'Vocabulaire administratif officiel pour les étudiants internationaux.',
        },
      },
    ],
  },
  {
    id: 'rki-classic-01',
    title: {
      ru: 'Доро́га в Росси́ю: Уче́бник ру́сского языка́ (Элемента́рный у́ровень A1)',
      en: 'Road to Russia (Doroga v Rossiyu): Russian Textbook — Elementary Level A1',
      ar: 'الطريق إلى روسيا (Дорога в Россию): الكتاب الرسمي لتعلم الروسية — المستوى الابتدائي A1',
      fr: 'La Route vers la Russie (Doroga v Rossiyu) : Manuel de russe — Niveau A1',
    },
    author: 'Антонова В.Е., Нахабина М.М., Сафронова М.В., Толстых А.А.',
    publisher: 'Златоуст · ЦМО МГУ',
    publicationYear: 2021,
    totalPagesCount: 344,
    origin: 'rki_classic',
    section: 'textbooks',
    level: 'A1',
    topic: 'campus',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Классический базовый учебник РКИ (УМК «Дорога в Россию»)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: '/api/library/pdf/rki-classic-01',
    coverTheme: 'madi_blue',
    description: {
      ru: 'Самый популярный в российских вузах базовый учебник русского языка как иностранного (вводно-фонетический и элементарный курс).',
      en: 'The #1 foundational Russian as a Foreign Language textbook used across Russian university preparatory faculties.',
      ar: 'أشهر كتاب أساسي لتعليم اللغة الروسية للأجانب المعتمد في السنين التحضيرية بالجامعات الروسية.',
      fr: 'Le manuel de référence n°1 pour le russe langue étrangère dans les universités russes.',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Методический совет РКИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Уро́к 1–3. Вво́дно-фонети́ческий курс: ударе́ние и интонацио́нные констру́кции (ИК-1, ИК-2, ИК-3)',
        russianText:
          'Э́то Москва́. Э́то у́лица и проспе́кт. Вот университе́т, а там ста́нция метро́. — Скажи́те, э́то слова́рь? — Да, э́то но́вый ру́сско-ара́бский слова́рь. — А что э́то? — Э́то мой уче́бник, тетра́дь и каранда́ш.',
        translationNotes: {
          ru: 'Отработка ИК-1 (точка), ИК-2 (вопрос с вопросительным словом «Что? Где?») и ИК-3 (общий вопрос «Это словарь?»).',
          en: 'Practicing Russian intonation contours IK-1 (statement), IK-2 (wh-question), and IK-3 (yes/no question).',
          ar: 'التدرب على نغمات الجملة الروسية: الخبرية (ИК-1) والسؤال بأداة استفهام (ИК-2) والسؤال بنعم/لا (ИК-3).',
          fr: 'Pratique des courbes d’intonation russes IK-1, IK-2 et IK-3.',
        },
      },
      {
        pageNumber: 2,
        heading: 'Уро́к 4–6. Род существи́тельных (Он, Она́, Оно́) и глаго́лы I и II спряже́ния',
        russianText:
          'Анто́н и Кла́ра — студе́нты. У́тром они́ слу́шают ле́кцию, днём обе́дают в столо́вой, а ве́чером чита́ют ру́сские те́ксты, пи́шут но́вые слова́ и говоря́т по-ру́сски.',
        translationNotes: {
          ru: 'Первое спряжение (-ать/-ять: чита́ть, зна́ть) и второе спряжение (-ить: говори́ть, учи́ть).',
          en: 'First conjugation (-ать/-ять: чита́ть) and second conjugation (-ить: говори́ть).',
          ar: 'التصريف الأول للأفعال (-ать) والتصريف الثاني (-ить) في المضارع.',
          fr: 'Première conjugaison (-ать) et deuxième conjugaison (-ить) au présent.',
        },
      },
    ],
  },
  {
    id: 'rki-classic-02',
    title: {
      ru: 'Доро́га в Росси́ю: Уче́бник ру́сского языка́ (Ба́зовый у́ровень A2)',
      en: 'Road to Russia (Doroga v Rossiyu): Russian Textbook — Basic Level A2',
      ar: 'الطريق إلى روسيا (Дорога в Россию): الكتاب الجامعي — المستوى الأساسي A2',
      fr: 'La Route vers la Russie (Doroga v Rossiyu) : Manuel de russe — Niveau A2',
    },
    author: 'Антонова В.Е., Нахабина М.М., Сафронова М.В., Толстых А.А.',
    publisher: 'Златоуст · ЦМО МГУ',
    publicationYear: 2021,
    totalPagesCount: 256,
    origin: 'rki_classic',
    section: 'textbooks',
    level: 'A2',
    topic: 'campus',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Классический базовый учебник РКИ (УМК «Дорога в Россию» — Том 2)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: '/api/library/pdf/rki-classic-02',
    coverTheme: 'madi_blue',
    description: {
      ru: 'Второй том комплекса «Дорога в Россию»: вся падежная система, глаголы движения с приставками и сложные предложения.',
      en: 'Volume 2 of "Road to Russia": complete case system, prefixed verbs of motion, and complex sentences.',
      ar: 'الجزء الثاني من سلسلة «الطريق إلى روسيا»: نظام الحالات الإعرابية الكامل، أفعال الحركة مع السوابق، والجمل المركبة.',
      fr: 'Tome 2 de « La Route vers la Russie » : système complet des cas et verbes de mouvement.',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Методический совет РКИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Глаго́лы движе́ния с приста́вками (по-, при-, у-, во-, вы-, пере-)',
        russianText:
          'У́тром студе́нт вы́шел из общежи́тия, перешёл че́рез широ́кую у́лицу, вошёл в метро́ и прие́хал в университе́т за де́сять мину́т до нача́ла ле́кции.',
        translationNotes: {
          ru: 'Приставки направления движения: войти́ (внутрь), вы́йти (наружу), перейти́ (через дорогу).',
          en: 'Directional motion prefixes: войти́ (enter), вы́йти (exit), перейти́ (cross).',
          ar: 'سوابق اتجاه الحركة: войти́ (الدخول)، вы́йти (الخروج)، перейти́ (عبور الطريق).',
          fr: 'Préfixes directionnels : войти́ (entrer), вы́йти (sortir), перейти́ (traverser).',
        },
      },
    ],
  },
  {
    id: 'rki-classic-03',
    title: {
      ru: 'Жили-бы́ли... 28 уро́ков ру́сского языка́ для начина́ющих',
      en: 'Once Upon a Time (Zhili-Byli): 28 Russian Lessons for Beginners',
      ar: 'كان يا ما كان (Жили-были): 28 درساً في اللغة الروسية للمبتدئين',
      fr: 'Il était une fois (Jili-Byli) : 28 leçons de russe pour débutants',
    },
    author: 'Миллер Л.В., Политова Л.В., Рыбакова И.Я.',
    publisher: 'Златоуст · Санкт-Петербург',
    publicationYear: 2020,
    totalPagesCount: 152,
    origin: 'rki_classic',
    section: 'textbooks',
    level: 'A1',
    topic: 'street_speech',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Интенсивный коммуникативный курс РКИ («Златоуст»)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: '/api/library/pdf/rki-classic-03',
    coverTheme: 'madi_blue',
    description: {
      ru: 'Знаменитый интенсивный коммуникативный учебник для быстрого освоения разговорной речи и базовой грамматики.',
      en: 'Renowned communicative intensive course for rapid mastery of everyday Russian speech and core grammar.',
      ar: 'الكتاب التواصلي المكثف الشهير لإتقان المحادثة الروسية اليومية والقواعد الأساسية بسرعة.',
      fr: 'Célèbre cours communicatif intensif pour maîtriser rapidement le russe parlé.',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Методический совет РКИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Коммуникати́вные диало́ги в го́роде, магази́не и тра́нспорте',
        russianText:
          '— Извини́те, вы выхо́дите на сле́дующей остано́вке? — Нет, я е́ду до ста́нции «Аэропо́рт». — Отли́чно, тогда́ разреши́те пройти́, пожа́луйста!',
        translationNotes: {
          ru: 'Естественная разговорная фраза в автобусе и вагоне метро.',
          en: 'Natural everyday phrasing used inside buses and metro cars in Russia.',
          ar: 'عبارات محادثة طبيعية تُستخدم يومياً في الحافلات وعربات المترو في روسيا.',
          fr: 'Expressions courantes naturelles dans le bus et le métro.',
        },
      },
    ],
  },

  // ==========================================================================
  // 2. GRAMMAR REFERENCE & TABLES (5 BOOKS)
  // ==========================================================================
  {
    id: 'madi-pf-05',
    title: {
      ru: 'Ру́сский язы́к в схе́мах и табли́цах: пра́ктикум для иностра́нных студе́нтов',
      en: 'Russian Language in Charts and Tables: Practicum for International Students',
      ar: 'اللغة الروسية في مخططات وجداول: دليل عملي للطلاب الأجانب (جامعة مادي)',
      fr: 'Le russe en schémas et tableaux : manuel pratique (MADI)',
    },
    author: 'Касарова В.Г., Кременецкая Л.С. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2022,
    totalPagesCount: 52,
    origin: 'madi_official',
    section: 'grammar_ref',
    level: 'A1',
    topic: 'grammar',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальное издание ПФ МАДИ (madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://www.madi.ru/uploads/files/2022/03/21/1647865068_fel22M707.pdf',
    coverTheme: 'grammar_navy',
    description: {
      ru: 'Наглядные грамматические таблицы всех шести падежей, предлогов, местоимений и глагольных форм (МАДИ, 2022).',
      en: 'Visual grammar reference tables covering all six Russian cases, prepositions, pronouns, and verbs (MADI, 2022).',
      ar: 'جداول نحوية بصرية شاملة للحالات الإعرابية الست وحروف الجر والضمائر والأفعال من إصدار جامعة مادي 2022.',
      fr: 'Tableaux synthétiques des six cas russes, prépositions, pronoms et verbes (MADI, 2022).',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра русского языка ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Сво́дная табли́ца оконча́ний существи́тельных в шести́ падежа́х',
        russianText:
          'Имени́тельный (Кто? Что?): студе́нт, доро́га, окно́. Роди́тельный (Кого́? Чего́?): нет студе́нта, доро́ги, окна́. Да́тельный (Кому́? Чему́?): звоню́ студе́нту, е́ду по доро́ге. Вини́тельный (Кого́? Что? Куда́?): ви́жу студе́нта, стро́ю доро́гу. Твори́тельный (Кем? Чем?): горжу́сь студе́нтом, ри́сую карандашо́м. Предло́жный (О ком? Где?): говорю́ о студе́нте, на доро́ге.',
        translationNotes: {
          ru: 'Прямой PDF-файл книги доступен по кнопке «Скачать / Открыть PDF МАДИ».',
          en: 'Direct official MADI PDF available via the "Download / Open MADI PDF" button.',
          ar: 'ملف PDF الرسمي المباشر من موقع جامعة مادي متاح للفتح والتحميل الفوري.',
          fr: 'Fichier PDF officiel de MADI disponible en téléchargement direct.',
        },
      },
    ],
  },
  {
    id: 'madi-pf-06',
    title: {
      ru: 'Ру́сская грамма́тика в иллюстри́рованных упражне́ниях (Ба́зовый у́ровень)',
      en: 'Russian Grammar in Illustrated Exercises (Basic Level A2)',
      ar: 'القواعد الروسية في تمارين مصورة — المستوى الأساسي (إصدار جامعة مادي 2023)',
      fr: 'La grammaire russe en exercices illustrés (Niveau de base A2 — MADI)',
    },
    author: 'Медведева С.В. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2023,
    totalPagesCount: 114,
    origin: 'madi_official',
    section: 'grammar_ref',
    level: 'A2',
    topic: 'grammar',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальная электронная библиотека ПФ МАДИ (lib.madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://lib.madi.ru/fel/fel1/fel24E663.pdf',
    coverTheme: 'grammar_navy',
    description: {
      ru: 'Современное иллюстрированное пособие С.В. Медведевой (МАДИ, 2023, 114 с.) для наглядного закрепления падежей и глаголов.',
      en: 'Modern 2023 illustrated grammar manual by S.V. Medvedeva (MADI, 114 pp.) for visual mastery of cases and verbs.',
      ar: 'كتاب حديث ومصور للقواعد النحوية تأليف س.ف. ميدفيديفا (جامعة مادي 2023، 114 صفحة) لإتقان الحالات الإعرابية والأفعال.',
      fr: 'Manuel illustré moderne de S.V. Medvedeva (MADI, 2023, 114 p.) sur les cas et les verbes.',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра русского языка ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Предло́ги ме́ста и направле́ния: В / НА — ИЗ / С',
        russianText:
          'Куда́ идёт студе́нт? Он идёт в университе́т на ле́кцию. Где сейча́с студе́нт? Он в университе́те на ле́кции. Отку́да он возвраща́ется ве́чером? Он идёт из университе́та с ле́кции в общежи́тие.',
        translationNotes: {
          ru: 'Золотое правило соответствия предлогов: В -> В -> ИЗ; НА -> НА -> С.',
          en: 'Golden rule of paired prepositions: В (to) -> В (at) -> ИЗ (from); НА (to) -> НА (at) -> С (from).',
          ar: 'القاعدة الذهبية لتطابق حروف الجر: (В -> В -> ИЗ) للأماكن المغلقة، و(НА -> НА -> С) للأنشطة والأسطح.',
          fr: 'Règle d’or des prépositions appariées : В -> В -> ИЗ ; НА -> НА -> С.',
        },
      },
    ],
  },
  {
    id: 'madi-pf-07',
    title: {
      ru: 'Глаго́льная тетра́дь-спра́вочник к уче́бнику «На́ше вре́мя-3» (У́ровень B1)',
      en: 'Verb Reference Workbook for "Our Time-3" ( First Certification Level B1)',
      ar: 'دفتر ومرجع تصريف الأفعال الروسية لكتاب «Наше время-3» (المستوى B1 — جامعة مادي)',
      fr: 'Cahier de référence des verbes russes « Notre Temps-3 » (Niveau B1 — MADI)',
    },
    author: 'Богомолова И.А. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2022,
    totalPagesCount: 170,
    origin: 'madi_official',
    section: 'grammar_ref',
    level: 'B1',
    topic: 'grammar',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальная электронная библиотека ПФ МАДИ (lib.madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://lib.madi.ru/fel/fel1/fel22E593.pdf',
    coverTheme: 'grammar_navy',
    description: {
      ru: 'Полный справочник спряжения русских глаголов НСВ/СВ, управления падежами и видовых пар (170 стр., МАДИ, 2022).',
      en: 'Comprehensive 170-page reference of Russian imperfective/perfective verb conjugations and case governance (MADI, 2022).',
      ar: 'مرجع شامل (170 صفحة) لتصريف الأفعال الروسية (المكتملة وغير المكتملة) والحالات الإعرابية المرتبطة بكل فعل.',
      fr: 'Répertoire complet de 170 pages sur la conjugaison des verbes russes et les cas régis.',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра русского языка ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Видовы́е па́ры глаго́лов и глаго́льное управле́ние',
        russianText:
          'Изуча́ть — изучи́ть (что? Вини́тельный паде́ж): изуча́ть ру́сский язы́к и матема́тику. Занима́ться — заня́ться (чем? Твори́тельный паде́ж): занима́ться спо́ртом и нау́кой. Помога́ть — помо́чь (кому́? Да́тельный паде́ж): помога́ть дру́гу и преподава́телю.',
        translationNotes: {
          ru: 'Запоминайте каждый русский глагол сразу вместе с падежным вопросом.',
          en: 'Always learn each Russian verb together with the case question it governs.',
          ar: 'احفظ كل فعل روسي دائماً مع سؤال الحالة الإعرابية التي يطلبها.',
          fr: 'Apprenez chaque verbe russe avec la question de cas qu’il régit.',
        },
      },
    ],
  },
  {
    id: 'madi-pf-08',
    title: {
      ru: 'Изуча́ем имена́ прилага́тельные еди́нственного числа́: уче́бное посо́бие',
      en: 'Mastering Singular Russian Adjectives: Grammar & Declension Guide',
      ar: 'دراسة الصفات المفردة في اللغة الروسية وتصريفها (جامعة مادي)',
      fr: 'Étude des adjectifs russes au singulier : manuel grammatical (MADI)',
    },
    author: 'Алешичева Н.Н. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2013,
    totalPagesCount: 51,
    origin: 'madi_official',
    section: 'grammar_ref',
    level: 'A1',
    topic: 'grammar',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальная электронная библиотека ПФ МАДИ (lib.madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://lib.madi.ru/fel/fel1/fel15E335.pdf',
    coverTheme: 'grammar_navy',
    description: {
      ru: 'Подробный разбор согласования и склонения русских прилагательных мужского, женского и среднего рода (51 стр.).',
      en: 'Detailed guide to agreement and declension of masculine, feminine, and neuter Russian adjectives (51 pp.).',
      ar: 'شرح تفصيلي لتطابق وتصريف الصفات الروسية للمذكر والمؤنث والمحايد في جميع الحالات الإعرابية.',
      fr: 'Guide détaillé de l’accord et de la déclinaison des adjectifs russes au singulier.',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра русского языка ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Согласова́ние прилага́тельных с существи́тельными (Како́й? Кака́я? Како́е?)',
        russianText:
          'Но́вый студе́нт и широ́кий проспе́кт (мужско́й род: -ый/-ий/-ой). Но́вая маши́на и краси́вая ста́нция (же́нский род: -ая/-яя). Но́вое общежи́тие и большо́е окно́ (сре́дний род: -ое/-ее).',
        translationNotes: {
          ru: 'Окончание прилагательного всегда зависит от рода, числа и падежа существительного.',
          en: 'An adjective’s ending always matches the gender, number, and case of its noun.',
          ar: 'نهاية الصفة في اللغة الروسية تتبع دائماً جنس وعدد والحالة الإعرابية للاسم الموصوف.',
          fr: 'La terminaison de l’adjectif s’accorde en genre, en nombre et en cas avec le nom.',
        },
      },
    ],
  },
  {
    id: 'rki-classic-04',
    title: {
      ru: 'Чи́стая грамма́тика: Посо́бие по ру́сской грамма́тике для иностра́нцев',
      en: 'Pure Grammar (Chistaya Grammatika): Russian Grammar Reference & Drills',
      ar: 'القواعد الصافية (Чистая грамматика): المرجع الشامل لقواعد اللغة الروسية',
      fr: 'Grammaire Pure (Tchistaïa Grammatika) : Grammaire russe de référence',
    },
    author: 'Ласкарева Е.Р.',
    publisher: 'Златоуст · Санкт-Петербург',
    publicationYear: 2021,
    totalPagesCount: 336,
    origin: 'rki_classic',
    section: 'grammar_ref',
    level: 'B1',
    topic: 'grammar',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Классическое грамматическое пособие издательства «Златоуст»',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: '/api/library/pdf/rki-classic-04',
    coverTheme: 'grammar_navy',
    description: {
      ru: 'Знаменитая книга Е.Р. Ласкаревой: системное объяснение всей русской грамматики от А1 до В2 с проверочными тестами.',
      en: 'E.R. Laskareva’s acclaimed grammar reference explaining Russian grammar systematically from A1 to B2.',
      ar: 'كتاب القواعد الشهير للمؤلفة لاسكاريفا: شرح منهجي شامل لقواعد اللغة الروسية من المستوى A1 حتى B2.',
      fr: 'L’ouvrage de référence d’E.R. Laskareva expliquant toute la grammaire russe de A1 à B2.',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Методический совет РКИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Систе́ма времён, ви́дов глаго́ла и прича́стных оборо́тов',
        russianText:
          'Инжене́р, спроекти́ровавший но́вый мост че́рез реку́, представил рабо́чий чертёж на конфере́нции в университе́те. Зада́ча, реша́емая студе́нтами на семина́ре, тре́бует то́чного расчёта.',
        translationNotes: {
          ru: 'Причастия характерны для книжной и научно-инженерной речи.',
          en: 'Participles are essential for reading academic and engineering textbooks.',
          ar: 'أسماء الفاعل والمفعول ضرورية لقراءة الكتب الجامعية والهندسية بالروسية.',
          fr: 'Les participes sont essentiels pour lire les manuels scientifiques et techniques.',
        },
      },
    ],
  },

  // ==========================================================================
  // 3. EXERCISES & WORKBOOKS (6 BOOKS)
  // ==========================================================================
  {
    id: 'madi-pf-09',
    title: {
      ru: 'Сбо́рник зада́ний по ру́сскому языку́ к уче́бнику «Ру́сский язы́к бу́дущему инжене́ру»',
      en: 'Russian Workbook for "Russian for the Future Engineer" (MADI)',
      ar: 'مجموعة التمارين والتدريبات لكتاب «اللغة الروسية لمهندس المستقبل» (جامعة مادي)',
      fr: 'Recueil d’exercices pour le manuel « Le russe pour le futur ingénieur » (MADI)',
    },
    author: 'Агеева А.Ю., Касарова В.Г. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2012,
    totalPagesCount: 97,
    origin: 'madi_official',
    section: 'exercises',
    level: 'A2',
    topic: 'cars_roads',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальная электронная библиотека ПФ МАДИ (lib.madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://lib.madi.ru/fel/fel1/fel12M102.pdf',
    coverTheme: 'exercises_emerald',
    description: {
      ru: 'Официальный сборник лексико-грамматических упражнений для студентов инженерно-технического профиля ПФ МАДИ (97 стр.).',
      en: 'Official 97-page workbook of lexical and grammatical exercises for engineering-track preparatory students at MADI.',
      ar: 'كتاب التمارين الرسمي (97 صفحة) لطلاب المسار الهندسي والتقني في السنة التحضيرية بجامعة مادي.',
      fr: 'Cahier d’exercices officiel (97 pages) pour la filière ingénierie de la faculté préparatoire de MADI.',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра русского языка ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Упражне́ния на нау́чный стиль ре́чи: Чтo состои́т из чего́? Что измеря́ется чем?',
        russianText:
          'Упражне́ние 1. Раскро́йте ско́бки: Автомоби́ль состои́т из (двига́тель, ку́зов, шасси́ и колёса) — Автомоби́ль состои́т из двига́теля, ку́зова, шасси́ и колёс. Ско́рость движе́ния измеря́ется (спидо́метр) — Ско́рость движе́ния измеря́ется спидо́метром.',
        translationNotes: {
          ru: 'Конструкция «состоя́ть из + Родительный падеж» и «измеря́ться + Творительный падеж».',
          en: 'Scientific constructions: "состоя́ть из + Genitive" (consist of) and "измеря́ться + Instrumental" (measured by).',
          ar: 'التراكيب الهندسية: «يتكون من + مضاف إليه» و«يُقاس بـ + حالة الأداة».',
          fr: 'Constructions scientifiques : « состоя́ть из + Génitif » et « измеря́ться + Instrumental ».',
        },
      },
    ],
  },
  {
    id: 'madi-pf-10',
    title: {
      ru: 'Практи́ческие зада́ния по РКИ к уче́бнику «На́ше вре́мя» (Элемента́рный у́ровень A1)',
      en: 'Practical Russian Exercises for "Our Time" — Elementary Level A1 (MADI)',
      ar: 'التمارين العملية في اللغة الروسية لكتاب «Наше время» — المستوى الابتدائي A1 (مادي)',
      fr: 'Exercices pratiques de russe « Notre Temps » — Niveau élémentaire A1 (MADI)',
    },
    author: 'Алешичева Н.Н. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2019,
    totalPagesCount: 144,
    origin: 'madi_official',
    section: 'exercises',
    level: 'A1',
    topic: 'grammar',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальное издание ПФ МАДИ (madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://www.madi.ru/uploads/files/2022/03/21/1647864916_fel21E557.pdf',
    coverTheme: 'exercises_emerald',
    description: {
      ru: 'Большой сборник практических упражнений (144 стр., МАДИ, 2019) по всем урокам элементарного уровня A1.',
      en: 'Comprehensive 144-page workbook (MADI, 2019) covering all lessons of the Elementary A1 curriculum.',
      ar: 'كتاب التمارين الشامل (144 صفحة، إصدار جامعة مادي 2019) لجميع دروس المستوى الابتدائي A1.',
      fr: 'Grand recueil d’exercices pratiques (144 pages, MADI, 2019) pour tout le niveau A1.',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра русского языка ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Трениро́вочные упражне́ния: Предло́жный и Вини́тельный падежи́',
        russianText:
          'Зада́ние 1. Поста́вьте слова́ в пра́вильную фо́рму: 1) Студе́нты живу́т в (Москва́, общежи́тие) — Студе́нты живу́т в Москве́ в общежи́тии. 2) Ка́ждое у́тро мы слу́шаем (ле́кция) и пи́шем (упражне́ние) — Ка́ждое у́тро мы слу́шаем ле́кцию и пи́шем упражне́ние.',
        translationNotes: {
          ru: 'Пошаговая отработка падежных окончаний с ключами для самопроверки.',
          en: 'Step-by-step case ending drills with self-check examples.',
          ar: 'تدريبات متدرجة على نهايات الحالات الإعرابية مع نماذج الحل.',
          fr: 'Exercices progressifs sur les terminaisons des cas avec corrigés.',
        },
      },
    ],
  },
  {
    id: 'madi-pf-11',
    title: {
      ru: 'Практи́ческие зада́ния по РКИ к уче́бнику «На́ше вре́мя» (Ба́зовый у́ровень A2)',
      en: 'Practical Russian Exercises for "Our Time" — Basic Level A2 (MADI)',
      ar: 'التمارين العملية في اللغة الروسية لكتاب «Наше время» — المستوى الأساسي A2 (مادي)',
      fr: 'Exercices pratiques de russe « Notre Temps » — Niveau de base A2 (MADI)',
    },
    author: 'Алешичева Н.Н. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2019,
    totalPagesCount: 123,
    origin: 'madi_official',
    section: 'exercises',
    level: 'A2',
    topic: 'grammar',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальное издание ПФ МАДИ (madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://www.madi.ru/uploads/files/2022/03/21/1647864912_fel21E556.pdf',
    coverTheme: 'exercises_emerald',
    description: {
      ru: 'Вторая часть практикума Н.Н. Алешичевой (123 стр., МАДИ, 2019): упражнения для базового уровня владения русским языком.',
      en: 'Part 2 of N.N. Aleshicheva’s workbook (123 pp., MADI, 2019): drills for Basic Level A2 Russian proficiency.',
      ar: 'الجزء الثاني من كتاب التمارين العملية (123 صفحة، جامعة مادي 2019) للمستوى الأساسي A2.',
      fr: 'Deuxième partie du cahier d’exercices de N.N. Aleshicheva (123 p., MADI, 2019) pour le niveau A2.',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра русского языка ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Упражне́ния на Да́тельный, Твори́тельный падежи́ и сло́жное предложе́ние',
        russianText:
          'Зада́ние 1. Зако́нчите предложе́ния сою́зами «потому́ что» и́ли «поэ́тому»: 1) Студе́нт хорошо́ сда́л экза́мен по фи́зике, потому́ что он мно́го занима́лся в библиоте́ке. 2) На у́лице шёл си́льный снег, поэ́тому авто́бусы е́хали ме́дленно.',
        translationNotes: {
          ru: 'Причина («потому́ что») и следствие («поэ́тому») в русской речи.',
          en: 'Expressing cause ("потому́ что") and consequence ("поэ́тому") in Russian.',
          ar: 'التعبير عن السبب («потому́ что» لأن) والنتيجة («поэ́тому» لذلك) في الجمل الروسية.',
          fr: 'Exprimer la cause (« потому́ что ») et la conséquence (« поэ́тому »).',
        },
      },
    ],
  },
  {
    id: 'madi-pf-12',
    title: {
      ru: 'Сбо́рник практи́ческих зада́ний к уче́бнику «Вре́мя-1» (Часть 1)',
      en: 'Workbook of Practical Assignments for "Time-1" (Part 1 — MADI)',
      ar: 'مجموعة التدريبات العملية لكتاب «الوقت-1» — الجزء الأول (جامعة مادي)',
      fr: 'Recueil d’exercices pratiques pour le manuel « Temps-1 » (Partie 1 — MADI)',
    },
    author: 'Алешичева Н.Н. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2011,
    totalPagesCount: 56,
    origin: 'madi_official',
    section: 'exercises',
    level: 'A1',
    topic: 'grammar',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальная электронная библиотека ПФ МАДИ (lib.madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://lib.madi.ru/fel/fel1/fel15E248.pdf',
    coverTheme: 'exercises_emerald',
    description: {
      ru: 'Практические задания по фонетике, местоимениям, роду существительных и спряжению глаголов (Ч. 1, 56 с.).',
      en: 'Practical exercises on phonetics, pronouns, noun gender, and verb conjugation (Part 1, 56 pp.).',
      ar: 'تمارين تطبيقية حول الصوتيات والضمائر وجنس الأسماء وتصريف الأفعال في المضارع (الجزء الأول، 56 صفحة).',
      fr: 'Exercices pratiques sur la phonétique, les pronoms, le genre des noms et les verbes (56 p.).',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра русского языка ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Притяжа́тельные местоиме́ния: Мой, Моя́, Моё, Мои́ / Твой, Наш, Ваш',
        russianText:
          '— Чей э́то уче́бник? — Э́то мой уче́бник. — Чья э́то тетра́дь? — Э́то моя́ тетра́дь. — Чьё э́то письмо́? — Э́то на́ше письмо́. — Чьи э́то чертежи́? — Э́то ва́ши чертежи́.',
        translationNotes: {
          ru: 'Вопросы принадлежности: Чей? (м.р.), Чья? (ж.р.), Чьё? (ср.р.), Чьи? (мн.ч.).',
          en: 'Possessive question words: Чей? (masc.), Чья? (fem.), Чьё? (neut.), Чьи? (plural).',
          ar: 'أدوات الاستفهام عن الملكية في الروسية حسب جنس وعدد الاسم.',
          fr: 'Pronoms interrogatifs de possession : Чей ? Чья ? Чьё ? Чьи ?',
        },
      },
    ],
  },
  {
    id: 'madi-pf-13',
    title: {
      ru: 'Сбо́рник практи́ческих зада́ний к уче́бнику «Вре́мя-1» (Часть 2)',
      en: 'Workbook of Practical Assignments for "Time-1" (Part 2 — MADI)',
      ar: 'مجموعة التدريبات العملية لكتاب «الوقت-1» — الجزء الثاني (جامعة مادي)',
      fr: 'Recueil d’exercices pratiques pour le manuel « Temps-1 » (Partie 2 — MADI)',
    },
    author: 'Алешичева Н.Н. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2011,
    totalPagesCount: 64,
    origin: 'madi_official',
    section: 'exercises',
    level: 'A1',
    topic: 'grammar',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальная электронная библиотека ПФ МАДИ (lib.madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://lib.madi.ru/fel/fel1/fel15E249.pdf',
    coverTheme: 'exercises_emerald',
    description: {
      ru: 'Продолжение сборника упражнений к курсу «Время-1»: прошедшее и будущее время, глаголы движения и падежи (64 с.).',
      en: 'Continuation of the "Time-1" exercise book: past and future tense, verbs of motion, and case drills (64 pp.).',
      ar: 'الجزء الثاني من تدريبات «الوقت-1»: الزمن الماضي والمستقبل وأفعال الحركة والحالات الإعرابية (64 صفحة).',
      fr: 'Suite du recueil d’exercices « Temps-1 » : passé, futur, verbes de mouvement et cas (64 p.).',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра русского языка ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Проше́дшее и бу́дущее вре́мя глаго́ла в упражне́ниях',
        russianText:
          'Вчера́ студе́нты бы́ли на экскурсии в музе́е и смотре́ли вы́ставку автомоби́лей. За́втра они́ бу́дут писа́ть контро́льную рабо́ту и реша́ть зада́чи по матема́тике.',
        translationNotes: {
          ru: 'Образование прошедшего времени (-л, -ла, -ло, -ли) и сложного будущего («бу́ду + инфинитив»).',
          en: 'Forming past tense (-л, -ла, -ло, -ли) and compound future ("бу́ду + infinitive").',
          ar: 'صياغة الزمن الماضي (-л, -ла, -ло, -ли) والمستقبل المركب في اللغة الروسية.',
          fr: 'Formation du passé (-л, -ла, -ло, -ли) et du futur composé (« бу́ду + infinitif »).',
        },
      },
    ],
  },
  {
    id: 'rki-classic-05',
    title: {
      ru: 'Ру́сский язы́к в упражне́ниях (Russian in Exercises)',
      en: 'Russian in Exercises (Russkiy Yazyk v Uprazhneniyakh — Khavronina)',
      ar: 'اللغة الروسية في تمارين (Русский язык в упражнениях — خافرونينا)',
      fr: 'Le russe par les exercices (Khavronina & Chirotchenskaïa)',
    },
    author: 'Хавронина С.А., Широченская А.И.',
    publisher: 'Русский язык. Курсы · Москва',
    publicationYear: 2022,
    totalPagesCount: 384,
    origin: 'rki_classic',
    section: 'exercises',
    level: 'A2',
    topic: 'grammar',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Золотой фонд учебной литературы по РКИ («Русский язык. Курсы»)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: '/api/library/pdf/rki-classic-05',
    coverTheme: 'exercises_emerald',
    description: {
      ru: 'Мировой бестселлер по практике русской грамматики: более 800 упражнений от простых моделей до свободного владения падежами.',
      en: 'The world’s most famous Russian grammar workbook: over 800 progressive drills covering all cases and verbs.',
      ar: 'أشهر كتاب تمارين قواعد اللغة الروسية في العالم للمؤلفتين خافرونينا وشيروتشينسكايا (أكثر من 800 تمرين متدرج).',
      fr: 'Le cahier d’exercices de grammaire russe le plus célèbre au monde (plus de 800 exercices).',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Методический совет РКИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Часть 2. Употребле́ние падеже́й с предло́гами и без предло́гов',
        russianText:
          'Моде́ль: У кого́ есть что? — У студе́нта есть слова́рь. У кого́ нет чего́? — У студе́нта нет словаря́. Кому́ ну́жно что? — Студе́нту ну́жен слова́рь. Кем хо́чет стать ваш брат? — Мой брат хо́чет стать инжене́ром-строи́телем.',
        translationNotes: {
          ru: 'Классические трансформационные модели С.А. Хаврониной.',
          en: 'Classic transformational drill patterns by S.A. Khavronina.',
          ar: 'النماذج التطبيقية الكلاسيكية لكتاب خافرونينا لتحويل الجمل بين الحالات الإعرابية.',
          fr: 'Modèles transformationnels classiques de S.A. Khavronina.',
        },
      },
    ],
  },

  // ==========================================================================
  // 4. READING, TEXT RETELLING & LITERATURE (6 BOOKS)
  // ==========================================================================
  {
    id: 'madi-pf-14',
    title: {
      ru: 'У́чимся переска́зывать те́ксты: уче́бно-методи́ческое посо́бие для иностра́нных уча́щихся',
      en: 'Learning to Retell Russian Texts: Reading & Summary Reader (MADI)',
      ar: 'نتعلم قراءة وتلخيص النصوص الروسية: كتاب القراءة للطلاب الأجانب (جامعة مادي)',
      fr: 'Apprendre à résumer des textes russes : manuel de lecture (MADI)',
    },
    author: 'Тимофеева И.М., Рычагова Л.В., Кожевникова М.Н., Алёшичева Н.Н. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2022,
    totalPagesCount: 100,
    origin: 'madi_official',
    section: 'reading',
    level: 'A2',
    topic: 'literature',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальная электронная библиотека ПФ МАДИ (lib.madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://lib.madi.ru/fel/fel1/fel22E591.pdf',
    coverTheme: 'reading_burgundy',
    description: {
      ru: 'Сборник адаптированных текстов для чтения, анализа, составления плана и устного пересказа (МАДИ, 2022, 100 с.).',
      en: 'Collection of graded reading texts with comprehension questions, outlining, and oral retelling guides (MADI, 2022, 100 pp.).',
      ar: 'مجموعة نصوص قراءة متدرجة مع أسئلة الفهم وكيفية إعداد خطة النص وإعادة سرده شفوياً (جامعة مادي 2022، 100 صفحة).',
      fr: 'Recueil de textes adaptés pour la lecture, l’analyse et le compte-rendu oral (MADI, 2022, 100 p.).',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра русского языка ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Текст 1. Моя́ учёба в Москве́ и пе́рвая зима́ в Росси́и',
        russianText:
          'О́сенью я прие́хал в Москву́, чтобы учи́ться в университе́те. Сначала мне бы́ло тру́дно понима́ть бы́струю ру́сскую речь, но ка́ждый день я чита́л небольши́е расска́зы, выпи́сывал но́вые слова́ и переска́зывал те́ксты на уро́ке. Тепе́рь я свобо́дно чита́ю уче́бники и обща́юсь с росси́йскими друзьями.',
        translationNotes: {
          ru: 'Вопросы к тексту: 1) Зачем рассказчик приехал в Москву? 2) Что помогло ему выучить язык?',
          en: 'Comprehension questions: 1) Why did the narrator come to Moscow? 2) What helped him master Russian?',
          ar: 'أسئلة الفهم: 1) لماذا جاء الراوي إلى موسكو؟ 2) ما الذي ساعده على إتقان اللغة الروسية؟',
          fr: 'Questions de compréhension sur le texte et préparation au résumé.',
        },
      },
    ],
  },
  {
    id: 'madi-pf-15',
    title: {
      ru: 'Осно́вы литературове́дения. Ру́сская литерату́ра XVIII, XIX, XX веко́в',
      en: 'Foundations of Literary Studies: Russian Literature of the 18th–20th Centuries (MADI)',
      ar: 'أسس الأدب الروسي في القرون الثامن عشر والتاسع عشر والعشرين (كتاب القراءة — جامعة مادي)',
      fr: 'Introduction à la littérature russe des XVIIIe, XIXe et XXe siècles (MADI)',
    },
    author: 'Касарова В.Г., Филипская Т.А. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2023,
    totalPagesCount: 102,
    origin: 'madi_official',
    section: 'reading',
    level: 'B1',
    topic: 'literature',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальная электронная библиотека ПФ МАДИ (lib.madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://lib.madi.ru/fel/fel1/fel23E648.pdf',
    coverTheme: 'reading_burgundy',
    description: {
      ru: 'Учебное пособие для иностранных учащихся довузовского этапа: биографии и произведения классиков русской литературы (102 с.).',
      en: 'Preparatory faculty textbook introducing biographies and key works of classic Russian writers (MADI, 2023, 102 pp.).',
      ar: 'كتاب رسمي من جامعة مادي (2023، 102 صفحة) يقدم سير ومختارات من روائع كبار الأدباء الروس لطلاب السنة التحضيرية.',
      fr: 'Manuel de la faculté préparatoire présentant les grands auteurs classiques russes (MADI, 2023, 102 p.).',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра русского языка ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Золото́й век ру́сской поэ́зии и про́зы: Пу́шкин, Лéрмонтов, Гóголь, Толсто́й, Чéхов',
        russianText:
          'Алекса́ндр Серге́евич Пу́шкин счита́ется созда́телем совреме́нного ру́сского литерату́рного языка́. Его́ стихотворе́ния, поэ́мы и «По́вести Бе́лкина» отлича́ются я́сностью, музыка́льностью и глубо́ким гумани́змом.',
        translationNotes: {
          ru: 'Культурологический и литературный минимум для иностранных абитуриентов.',
          en: 'Cultural and literary reading minimum for international university applicants.',
          ar: 'الرصيد الثقافي والأدبي الأساسي للطلاب المتقدمين للجامعات الروسية.',
          fr: 'Minimum culturel et littéraire pour les futurs étudiants universitaires.',
        },
      },
    ],
  },
  {
    id: 'madi-pf-16',
    title: {
      ru: 'Исто́рия и геогра́фия Росси́и: уче́бное посо́бие для чте́ния иностра́нных уча́щихся',
      en: 'History & Geography of Russia: Reader for Preparatory Faculty Students (MADI)',
      ar: 'تاريخ وجغرافيا روسيا: كتاب القراءة والثقافة لطلاب السنة التحضيرية (جامعة مادي)',
      fr: 'Histoire et géographie de la Russie : manuel de lecture (Faculté préparatoire MADI)',
    },
    author: 'Кузнецов А.Л., Касарова В.Г., Никишина Ю.В. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2015,
    totalPagesCount: 204,
    origin: 'madi_official',
    section: 'reading',
    level: 'B1',
    topic: 'campus',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальная электронная библиотека ПФ МАДИ (lib.madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://lib.madi.ru/fel/fel1/fel15E227.pdf',
    coverTheme: 'reading_burgundy',
    description: {
      ru: 'Фундаментальное 204-страничное пособие ПФ МАДИ с адаптированными текстами о городах, дорогах, науке и истории России.',
      en: 'Comprehensive 204-page MADI reader featuring adapted texts on Russian cities, transport history, and science.',
      ar: 'كتاب موسوعي (204 صفحات) من جامعة مادي يضم نصوص قراءة مبسطة عن المدن الروسية وتاريخ العلوم والمواصلات.',
      fr: 'Manuel complet de 204 pages (MADI) avec des textes adaptés sur l’histoire, les villes et la science russe.',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра русского языка ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Москва́ — нау́чный, культу́рный и тра́нспортный центр Росси́и',
        russianText:
          'Москва́ — столи́ца Росси́и и один из са́мых кру́пных мегапо́лисов ми́ра. В Москве́ рабо́тают веду́щие университе́ты, нау́чные институ́ты, театры и музе́и, а моско́вский метрополите́н и автомоби́льные магистра́ли соединя́ют все райо́ны го́рода.',
        translationNotes: {
          ru: 'Тексты для развития навыков изучающего и ознакомительного чтения.',
          en: 'Texts designed to build academic reading comprehension and vocabulary.',
          ar: 'نصوص مصممة لتنمية مهارات القراءة الاستيعابية وإثراء المفردات الأكاديمية.',
          fr: 'Textes conçus pour développer la compréhension écrite académique.',
        },
      },
    ],
  },
  {
    id: 'lib-04',
    title: {
      ru: 'Л. Н. Толсто́й — Коро́ткие расска́зы и ба́сни для чте́ния (A1–A2)',
      en: 'Leo Tolstoy — Short Stories & Fables (Graded Reader with Stress Marks A1–A2)',
      ar: 'ليو تولستوي — قصص وحكايات قصيرة للقراءة (مشكلّة بالنبر الصوتي للمستوى A1–A2)',
      fr: 'Léon Tolstoï — Contes et récits courts (Lecture graduée avec accents A1–A2)',
    },
    author: 'Л. Н. Толстой (1828–1910, Public Domain)',
    publisher: 'Классика РКИ · Wikisource',
    publicationYear: 1875,
    totalPagesCount: 48,
    origin: 'rki_classic',
    section: 'reading',
    level: 'A1',
    topic: 'literature',
    explanationLang: 'all',
    licenseType: 'public_domain',
    licenseText: 'public_domain',
    sourceUrl: 'https://ru.wikisource.org/wiki/Два_товарища_(Толстой)',
    pdfUrl: '/api/library/pdf/lib-04',
    coverTheme: 'reading_burgundy',
    description: {
      ru: 'Короткие и мудрые рассказы Л.Н. Толстого из «Новой азбуки» с проставленными ударениями для начинающих.',
      en: 'Short, timeless stories by Leo Tolstoy from "The New Alphabet" with full stress marks for beginners.',
      ar: 'قصص قصيرة وحكيمة للأديب العالمي ليو تولستوي مع وضع علامات النبر الصوتي للمبتدئين.',
      fr: 'Contes courts et sages de Léon Tolstoï tirés du « Nouvel Alphabet » avec accents toniques.',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Public Domain Verification (Wikisource)',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Два това́рища (Л. Н. Толсто́й)',
        russianText:
          'Шли по ле́су два това́рища, и вы́скочил на них медве́дь. Оди́н бро́сился бежа́ть, влез на де́рево и спря́тался, а друго́й оста́лся на доро́ге. Де́лать ему́ бы́ло не́чего — он упа́л на зе́млю и притвори́лся мёртвым. Медве́дь подошёл к нему́ и стал ню́хать: он и дыша́ть переста́л. Медве́дь поню́хал ему́ лицо́, поду́мал, что мёртвый, и отошёл.',
        translationNotes: {
          ru: 'Классическая притча Л.Н. Толстого о верности и настоящей дружбе.',
          en: 'Leo Tolstoy’s classic fable about loyalty and true friendship in moments of danger.',
          ar: 'حكاية تولستوي الكلاسيكية الشهيرة عن الصداقة الحقيقية وقت الشدة.',
          fr: 'Fable classique de Léon Tolstoï sur la fidélité et la vraie amitié.',
        },
      },
    ],
  },
  {
    id: 'lib-11',
    title: {
      ru: 'А. С. Пу́шкин — Стихи́ о зиме́, доро́ге и «По́вести Бе́лкина» (A2)',
      en: 'Alexander Pushkin — Winter Road Poems & Belkin Tales (A2 Reader)',
      ar: 'ألكسندر بوشكين — قصائد الشتاء والطريق ومختارات قصصية (كتاب قراءة A2)',
      fr: 'Alexandre Pouchkine — Poèmes d’hiver et Récits de Belkine (Niveau A2)',
    },
    author: 'А. С. Пушкин (1799–1837, Public Domain)',
    publisher: 'Классика РКИ · Wikisource',
    publicationYear: 1831,
    totalPagesCount: 64,
    origin: 'rki_classic',
    section: 'reading',
    level: 'A2',
    topic: 'literature',
    explanationLang: 'all',
    licenseType: 'public_domain',
    licenseText: 'public_domain',
    sourceUrl: 'https://ru.wikisource.org/wiki/Зимняя_дорога_(Пушкин)',
    pdfUrl: '/api/library/pdf/lib-11',
    coverTheme: 'reading_burgundy',
    description: {
      ru: 'Поэзия и проза А.С. Пушкина с ударениями и комментариями для тренировки правильного русского произношения.',
      en: 'Poetry and prose by Alexander Pushkin with stress marks and notes for practicing Russian pronunciation.',
      ar: 'قصائد ونثر شاعر روسيا الأكبر ألكسندر بوشكين مع علامات النبر الصوتي والتعليقات اللغوية.',
      fr: 'Poésie et prose d’Alexandre Pouchkine avec accents toniques et commentaires.',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Public Domain Verification (Wikisource)',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Зи́мняя доро́га и Зи́мнее у́тро',
        russianText:
          'Моро́з и со́лнце; день чуде́сный! Ещё ты дре́млешь, друг преле́стный — Пора́, краса́вица, просни́сь: Откро́й сомкну́ты не́гой взо́ры Навстре́чу се́верной Авро́ры, Звездо́ю се́вера яви́сь!',
        translationNotes: {
          ru: 'Чтение стихов Пушкина вслух вырабатывает безупречный ритм и интонацию.',
          en: 'Reading Pushkin’s verse aloud builds natural Russian rhythm and stress accuracy.',
          ar: 'قراءة أبيات بوشكين بصوت عالٍ تمنح المتعلم إيقاعاً ونطقاً روسياً متقناً.',
          fr: 'Lire les vers de Pouchkine à voix haute développe le rythme et l’accent tonique.',
        },
      },
    ],
  },
  {
    id: 'lib-19',
    title: {
      ru: 'В. И. Даль — Посло́вицы и погово́рки ру́сского наро́да (Кни́га для чте́ния)',
      en: 'Vladimir Dal — Russian Folk Proverbs on Learning, Roads & Craft',
      ar: 'فلاديمير دال — الأمثال والحكم الروسية في طلب العلم والطريق والعمل',
      fr: 'Vladimir Dal — Proverbes russes sur l’étude, la route et le travail',
    },
    author: 'В. И. Даль (1801–1872, Public Domain)',
    publisher: 'Классика РКИ · Wikisource',
    publicationYear: 1862,
    totalPagesCount: 54,
    origin: 'rki_classic',
    section: 'reading',
    level: 'A2',
    topic: 'literature',
    explanationLang: 'all',
    licenseType: 'public_domain',
    licenseText: 'public_domain',
    sourceUrl: 'https://ru.wikisource.org/wiki/Пословицы_русского_народа_(Даль)',
    pdfUrl: '/api/library/pdf/lib-19',
    coverTheme: 'reading_burgundy',
    description: {
      ru: 'Избранные русские пословицы из собрания В.И. Даля с переводом и объяснением смысла.',
      en: 'Selected Russian proverbs from Vladimir Dal’s treasury with translations and cultural explanations.',
      ar: 'مختارات من أشهر الأمثال والحكم الروسية من معجم فلاديمير دال مع شرح معانيها.',
      fr: 'Sélection de proverbes russes du recueil de Vladimir Dal avec explications.',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Public Domain Verification (Wikisource)',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Посло́вицы об учёбе, зна́ниях и доро́ге',
        russianText:
          'Ученье — свет, а неученье — тьма. Ти́ше е́дешь — да́льше бу́дешь. Повторе́ние — мать уче́ния. Без труда́ не вы́тащишь и ры́бку из пруда́. Не име́й сто рубле́й, а име́й сто друзе́й.',
        translationNotes: {
          ru: 'Пословицы, которые знает каждый носитель русского языка.',
          en: 'Essential proverbs known by every native Russian speaker.',
          ar: 'أمثال شهيرة يعرفها ويستخدمها كل متحدث باللغة الروسية.',
          fr: 'Proverbes essentiels connus de tous les locuteurs natifs russes.',
        },
      },
    ],
  },

  // ==========================================================================
  // 5. SCIENTIFIC & ENGINEERING RUSSIAN AT MADI (5 BOOKS)
  // ==========================================================================
  {
    id: 'madi-pf-17',
    title: {
      ru: 'Назе́мные тра́нспортно-технологи́ческие сре́дства: вво́дный курс по языку́ специа́льности',
      en: 'Ground Transport & Technological Vehicles: Intro to Engineering Russian (MADI)',
      ar: 'وسائل النقل البري والتقني: مدخل إلى لغة التخصص الهندسي (جامعة مادي)',
      fr: 'Véhicules de transport terrestre : introduction au russe technique (MADI)',
    },
    author: 'Иванова Э.И., Богомолова И.А. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2014,
    totalPagesCount: 56,
    origin: 'madi_official',
    section: 'scientific_engineering',
    level: 'A2',
    topic: 'cars_roads',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальная электронная библиотека ПФ МАДИ (lib.madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://lib.madi.ru/fel/fel1/fel14E196.pdf',
    coverTheme: 'engineering_slate',
    description: {
      ru: 'Специализированное пособие ПФ МАДИ по устройству автомобиля, двигателей и транспортных систем (56 стр.).',
      en: 'Specialized MADI preparatory textbook on automotive engineering, engines, and transport systems (56 pp.).',
      ar: 'كتاب متخصص من الكلية التحضيرية بجامعة مادي حول هندسة المركبات والمحركات وأنظمة النقل (56 صفحة).',
      fr: 'Manuel spécialisé de MADI sur l’ingénierie automobile, les moteurs et les transports (56 p.).',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра русского языка ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Тема 1. Классифика́ция и устро́йство автомоби́льного тра́нспорта',
        russianText:
          'Назе́мные тра́нспортные сре́дства де́лятся на пассажи́рские (легковы́е автомоби́ли, авто́бусы), грузовы́е автомоби́ли и специа́льные маши́ны. Гла́вные ча́сти автомоби́ля — э́то двига́тель, трансми́ссия, ходова́я часть, ку́зов и систе́ма рулево́го управле́ния.',
        translationNotes: {
          ru: 'Обязательная терминология для будущих студентов автотранспортных факультетов МАДИ.',
          en: 'Mandatory terminology for future students of MADI’s automotive transport faculties.',
          ar: 'المصطلحات الأساسية الإلزامية لطلاب كليات هندسة السيارات والنقل في جامعة مادي.',
          fr: 'Terminologie indispensable pour les futurs étudiants des facultés automobiles de MADI.',
        },
      },
    ],
  },
  {
    id: 'madi-pf-18',
    title: {
      ru: 'Строи́тельные и доро́жные маши́ны: вво́дный курс в язы́к специа́льности',
      en: 'Construction & Road Machinery: Introduction to Technical Russian (MADI)',
      ar: 'آلات البناء ورصف الطرق: مدخل إلى اللغة الروسية الهندسية (جامعة مادي)',
      fr: 'Engins de construction et de génie routier : russe de spécialité (MADI)',
    },
    author: 'Иванова Э.И., Орлова Т.К. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2016,
    totalPagesCount: 76,
    origin: 'madi_official',
    section: 'scientific_engineering',
    level: 'A2',
    topic: 'cars_roads',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальная электронная библиотека ПФ МАДИ (lib.madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://lib.madi.ru/fel/fel1/fel16E340.pdf',
    coverTheme: 'engineering_slate',
    description: {
      ru: 'Учебное пособие ПФ МАДИ для будущих инженеров дорожно-строительных машин и механизмов (76 стр.).',
      en: 'MADI Preparatory Faculty textbook for future road-construction and heavy machinery engineers (76 pp.).',
      ar: 'كتاب رسمي من جامعة مادي لمهندسي المستقبل في تخصص آلات ومعدات بناء الطرق والجسور (76 صفحة).',
      fr: 'Manuel de la faculté préparatoire de MADI pour les futurs ingénieurs des ponts et chaussées (76 p.).',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра русского языка ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Маши́ны для строи́тельства автомоби́льных доро́г и мосто́в',
        russianText:
          'При строи́тельстве совреме́нной автомагистра́ли испо́льзуются бульдо́зеры, экскава́торы, автогре́йдеры, асфальтоукла́дчики и доро́жные катки́. Ка́ждая маши́на выполня́ет то́чную технологи́ческую опера́цию.',
        translationNotes: {
          ru: 'Лексика специальности «Наземные транспортно-технологические комплексы».',
          en: 'Specialist vocabulary for Road Construction & Transport Complexes.',
          ar: 'مفردات تخصص هندسة ومعدات إنشاء الطرق السريعة والجسور.',
          fr: 'Vocabulaire spécialisé des machines de construction routière.',
        },
      },
    ],
  },
  {
    id: 'madi-pf-19',
    title: {
      ru: 'Ру́сский язы́к на материа́ле ку́рса «Геоде́зия»: уче́бное посо́бие',
      en: 'Russian for Geodesy & Highway Surveying: Preparatory Course (MADI)',
      ar: 'اللغة الروسية من خلال مقرر «الجيوديسيا ومساحة الطرق» (جامعة مادي)',
      fr: 'Le russe appliqué au cours de « Géodésie et topographie routière » (MADI)',
    },
    author: 'Саенко Л.П. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2016,
    totalPagesCount: 24,
    origin: 'madi_official',
    section: 'scientific_engineering',
    level: 'B1',
    topic: 'cars_roads',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальная электронная библиотека ПФ МАДИ (lib.madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://lib.madi.ru/fel/fel1/fel16E410.pdf',
    coverTheme: 'engineering_slate',
    description: {
      ru: 'Терминология геодезии, проектирования трасс, измерения углов и рельефа местности на русском языке (МАДИ, 24 с.).',
      en: 'Terminology of geodesy, highway alignment, angle measurement, and terrain surveying in Russian (MADI, 24 pp.).',
      ar: 'مصطلحات المساحة والجيوديسيا وتخطيط مسارات الطرق وقياس الزوايا والتضاريس باللغة الروسية (جامعة مادي).',
      fr: 'Terminologie de la géodésie, du tracé routier et de la topographie en russe (MADI, 24 p.).',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра русского языка ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Поня́тие о геоде́зии, пла́не, ка́рте и масшта́бе чертёжа',
        russianText:
          'Геоде́зия — э́то нау́ка об измере́ниях на земно́й пове́рхности для составле́ния пла́нов, карт и то́чного проекти́рования автомоби́льных доро́г, мосто́в и аэродро́мов.',
        translationNotes: {
          ru: 'Научные определения: «Что — это наука о чём».',
          en: 'Scientific definition structure: "X — это наука о + Prepositional case".',
          ar: 'تركيب التعريفات العلمية بالروسية: «... هو علم يدرس ...».',
          fr: 'Structure des définitions scientifiques en russe.',
        },
      },
    ],
  },
  {
    id: 'madi-pf-20',
    title: {
      ru: 'Курс ле́кций по матема́тике для студе́нтов-иностра́нцев подготови́тельного факульте́та',
      en: 'Lecture Course in Mathematics for International Preparatory Students (MADI)',
      ar: 'محاضرات الرياضيات باللغة الروسية لطلاب السنة التحضيرية الأجانب (جامعة مادي)',
      fr: 'Cours de mathématiques en russe pour étudiants étrangers de la faculté préparatoire (MADI)',
    },
    author: 'Васильева О.Н., Полевая Т.А., Ромашова И.Н. и др. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2016,
    totalPagesCount: 100,
    origin: 'madi_official',
    section: 'scientific_engineering',
    level: 'A2',
    topic: 'campus',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальная электронная библиотека ПФ МАДИ (lib.madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://lib.madi.ru/fel/fel1/fel16E372.pdf',
    coverTheme: 'engineering_slate',
    description: {
      ru: 'Полный курс лекций по математике на русском языке для иностранных слушателей ПФ МАДИ (арифметика, алгебра, функции, векторы — 100 с.).',
      en: 'Complete 100-page mathematics lecture course in Russian for MADI preparatory students (algebra, functions, vectors).',
      ar: 'مقرر محاضرات الرياضيات الكامل (100 صفحة) باللغة الروسية لطلاب السنة التحضيرية في مادي (الجبر، الدوال، المتجهات).',
      fr: 'Cours complet de mathématiques en russe (100 pages) pour la faculté préparatoire de MADI.',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра общетеоретических дисциплин ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Чита́ем математи́ческие фо́рмулы, дро́би и уравне́ния по-ру́сски',
        russianText:
          'Сложе́ние (плюс), вычита́ние (ми́нус), умноже́ние (умно́жить на) и деле́ние (раздели́ть на). Реши́ть линейное и квадра́тное уравне́ние значи́т найти́ все его́ ко́рни и́ли доказа́ть, что корне́й нет.',
        translationNotes: {
          ru: 'Математическая лексика для чтения формул на доске во время лекции.',
          en: 'Mathematical vocabulary for reading formulas aloud at the blackboard.',
          ar: 'المفردات الرياضية الأساسية لقراءة المعادلات والرموز على السبورة باللغة الروسية.',
          fr: 'Vocabulaire mathématique pour lire les formules au tableau.',
        },
      },
    ],
  },
  {
    id: 'madi-pf-21',
    title: {
      ru: 'Фи́зика для иностра́нных гра́ждан ПФ МАДИ́. Часть 1: Кинема́тика',
      en: 'Physics for International Preparatory Students at MADI — Part 1: Kinematics',
      ar: 'الفيزياء باللغة الروسية للطلاب الأجانب في مادي — الجزء الأول: الكينماتيكا والحركة',
      fr: 'Physique en russe pour étudiants étrangers de MADI — Partie 1 : Cinématique',
    },
    author: 'Бахтина Е.Ю., Косарева И.А. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2020,
    totalPagesCount: 80,
    origin: 'madi_official',
    section: 'scientific_engineering',
    level: 'A2',
    topic: 'cars_roads',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальная электронная библиотека ПФ МАДИ (lib.madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://lib.madi.ru/fel/fel1/fel24E673.pdf',
    coverTheme: 'engineering_slate',
    description: {
      ru: 'Учебно-методическое пособие по физике на русском языке: механическое движение, скорость, ускорение и задачи (МАДИ, 2020, 80 с.).',
      en: 'MADI physics textbook in Russian: mechanical motion, velocity, acceleration, and solved problems (2020, 80 pp.).',
      ar: 'كتاب الفيزياء الرسمي لطلاب السنة التحضيرية بجامعة مادي (80 صفحة): الحركة الميكانيكية، السرعة، التسارع، وحل المسائل.',
      fr: 'Manuel de physique de MADI en russe : mouvement mécanique, vitesse et accélération (80 p.).',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра общетеоретических дисциплин ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Механи́ческое движе́ние, траекто́рия, путь и ско́рость автомоби́ля',
        russianText:
          'Механи́ческим движе́нием те́ла называ́ется измене́ние его́ положе́ния в простра́нстве относи́тельно други́х тел с тече́нием вре́мени. Ли́ния, по кото́рой дви́жется автомоби́ль, называ́ется траекто́рией движе́ния.',
        translationNotes: {
          ru: 'Конструкция «Чем (Тв. п.) называется что (Им. п.)».',
          en: 'Scientific passive definition: "Instrumental case + называется + Nominative case".',
          ar: 'صياغة التعريف العلمي في الفيزياء بالروسية باستخدام الفعل «называется».',
          fr: 'Formulation des définitions physiques avec « называется ».',
        },
      },
    ],
  },
  {
    id: 'madi-pf-22',
    title: {
      ru: 'Проекцио́нное черче́ние и техни́ческий рису́нок для студе́нтов-иностра́нцев ПФ МАДИ́',
      en: 'Projection Drafting & Engineering Drawing for Preparatory Students (MADI)',
      ar: 'الرسم الهندسي والإسقاط لطلاب السنة التحضيرية الأجانب (جامعة مادي 2023)',
      fr: 'Dessin industriel et projection géométrique pour étudiants étrangers (MADI 2023)',
    },
    author: 'Жовниренко Л.Е., Коняева Н.Е., Петрова М.В. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2023,
    totalPagesCount: 60,
    origin: 'madi_official',
    section: 'scientific_engineering',
    level: 'A2',
    topic: 'cars_roads',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальная электронная библиотека ПФ МАДИ (lib.madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://lib.madi.ru/fel/fel1/fel23E646.pdf',
    coverTheme: 'engineering_slate',
    description: {
      ru: 'Сборник заданий и терминов по инженерному черчению и техническому рисунку для подготовительного факультета (МАДИ, 2023, 60 с.).',
      en: 'Workbook and terminology guide for engineering drafting and technical drawing at MADI (2023, 60 pp.).',
      ar: 'كتاب تدريبات ومصطلحات الرسم الهندسي والتقني لطلاب السنة التحضيرية في جامعة مادي (2023، 60 صفحة).',
      fr: 'Recueil d’exercices et de terminologie de dessin technique à MADI (2023, 60 p.).',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра начертательной геометрии и черчения МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Инструме́нты для черче́ния, ли́нии чертежа́ и проекции дета́ли',
        russianText:
          'Для выполне́ния инжене́рного чертежа́ студе́нту нужны́ миллиметро́вая бума́га, каранда́ш, лине́йка, уго́льник и ци́ркуль. На чертеже́ изобража́ются три проекции дета́ли: ви́д спереди, ви́д све́рху и ви́д сле́ва.',
        translationNotes: {
          ru: 'Базовая лексика для занятий на кафедре черчения МАДИ.',
          en: 'Essential vocabulary for Engineering Drawing classes at MADI.',
          ar: 'المفردات الأساسية لحصص الرسم الهندسي في جامعة مادي.',
          fr: 'Vocabulaire de base pour les cours de dessin industriel à MADI.',
        },
      },
    ],
  },
  {
    id: 'madi-pf-23',
    title: {
      ru: 'Осно́вы информа́тики. Алгоритмиза́ция и программи́рование для иностра́нных гра́ждан',
      en: 'Foundations of Computer Science, Algorithms & Programming in Russian (MADI 2024)',
      ar: 'أساسيات المعلوماتية والخوارزميات والبرمجة بالروسية للطلاب الأجانب (جامعة مادي 2024)',
      fr: 'Fondements de l’informatique, algorithmique et programmation en russe (MADI 2024)',
    },
    author: 'Блинова Т.А., Новиков А.В., Руднова Н.Н. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2024,
    totalPagesCount: 60,
    origin: 'madi_official',
    section: 'scientific_engineering',
    level: 'B1',
    topic: 'campus',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальное издание ПФ МАДИ 2024 (madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl:
      'https://www.madi.ru/uploads/files/2026/06/09/1780994628_OSNOVYINFORMATIKI-ALGORITMIZACIYaIPROGRAMMIROVANIE2024-BlinovaNovikovRudnova.Posobie.pdf',
    coverTheme: 'engineering_slate',
    description: {
      ru: 'Новейшее пособие ПФ МАДИ (2024 г., 60 с.) по информатике, блок-схемам алгоритмов и программированию на русском языке.',
      en: 'Latest 2024 MADI preparatory manual (60 pp.) on computer science, flowcharts, and programming terminology in Russian.',
      ar: 'أحدث إصدار من جامعة مادي (2024، 60 صفحة) في علوم الحاسب ومخططات الخوارزميات والبرمجة باللغة الروسية.',
      fr: 'Nouveau manuel 2024 de MADI (60 p.) sur l’informatique et l’algorithmique en russe.',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра общетеоретических дисциплин ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Поня́тие алгоритма, блок-схе́мы и ти́пы да́нных',
        russianText:
          'Алгори́тм — э́то то́чная после́довательность кома́нд, кото́рая приво́дит от исхо́дных да́нных к иско́мому результа́ту за коне́чное вре́мя. Основные алгоритми́ческие структу́ры: сле́дование, ветвле́ние и цикл.',
        translationNotes: {
          ru: 'Терминология информатики для будущих IT-специалистов и инженеров.',
          en: 'Computer science terminology for future IT specialists and engineers.',
          ar: 'مصطلحات علوم الحاسب الأساسية لطلاب الهندسة وتقنية المعلومات.',
          fr: 'Terminologie informatique pour les futurs ingénieurs.',
        },
      },
    ],
  },
  {
    id: 'madi-pf-24',
    title: {
      ru: 'Ру́сский язы́к бу́дущему экономи́сту: уче́бное посо́бие по нау́чному сти́лю ре́чи',
      en: 'Russian for the Future Economist: Academic & Scientific Style Manual (MADI)',
      ar: 'اللغة الروسية لخبير الاقتصاد المستقبلي: كتاب الأسلوب العلمي (جامعة مادي)',
      fr: 'Le russe pour le futur économiste : style scientifique (Faculté préparatoire MADI)',
    },
    author: 'Дубинская Е.В., Пай Л.П. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2007,
    totalPagesCount: 112,
    origin: 'madi_official',
    section: 'scientific_engineering',
    level: 'B1',
    topic: 'campus',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальная электронная библиотека ПФ МАДИ (lib.madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://lib.madi.ru/fel/fel1/fel16E344.pdf',
    coverTheme: 'engineering_slate',
    description: {
      ru: 'Учебное пособие ПФ МАДИ по научному стилю речи для студентов экономического и управленческого профиля (112 с.).',
      en: 'MADI textbook on academic Russian for students in economics, logistics, and transport management (112 pp.).',
      ar: 'كتاب الأسلوب العلمي باللغة الروسية لطلاب تخصصات الاقتصاد واللوجستيات وإدارة النقل في مادي (112 صفحة).',
      fr: 'Manuel de russe scientifique pour les filières économie, logistique et gestion (MADI, 112 p.).',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра русского языка ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Эконо́мика, тра́нспортная логи́стика и междунаро́дная торго́вля',
        russianText:
          'Эконо́мика изуча́ет произво́дство, распределе́ние и потребле́ние това́ров и услу́г. Тра́нспортная логи́стика обеспечи́вает бы́струю и надёжную доста́вку гру́зов по автомоби́льным и желе́зным доро́гам.',
        translationNotes: {
          ru: 'Лексический минимум для экономических факультетов МАДИ.',
          en: 'Lexical minimum for Economics & Logistics faculties at MADI.',
          ar: 'المفردات الأساسية لكليات الاقتصاد واللوجستيات في جامعة مادي.',
          fr: 'Vocabulaire de base pour les facultés d’économie et de logistique de MADI.',
        },
      },
    ],
  },

  // ==========================================================================
  // 6. EXAM PREP, TESTS & TEACHER GUIDES (5 BOOKS)
  // ==========================================================================
  {
    id: 'madi-pf-25',
    title: {
      ru: 'Сбо́рник контро́льных рабо́т к уче́бнику по РКИ «На́ше вре́мя-1» (A1)',
      en: 'Official Test & Assessment Booklet for "Our Time-1" — Level A1 (MADI 2023)',
      ar: 'مجموعة الاختبارات الرسمية لكتاب اللغة الروسية «Наше время-1» — المستوى A1 (مادي 2023)',
      fr: 'Recueil d’évaluations officielles pour « Notre Temps-1 » — Niveau A1 (MADI 2023)',
    },
    author: 'Медведева С.В. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2023,
    totalPagesCount: 36,
    origin: 'madi_official',
    section: 'exam_prep',
    level: 'A1',
    topic: 'exam',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальная электронная библиотека ПФ МАДИ (lib.madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://lib.madi.ru/fel/fel1/fel23M743.pdf',
    coverTheme: 'exam_amber',
    description: {
      ru: 'Официальные проверочные и контрольные работы ПФ МАДИ для проверки знаний на элементарном уровне (2023, 36 с.).',
      en: 'Official MADI Preparatory Faculty progress tests and exam papers for Elementary Level A1 (2023, 36 pp.).',
      ar: 'نماذج الاختبارات الدورية والنهائية الرسمية في الكلية التحضيرية بجامعة مادي للمستوى الابتدائي A1 (2023).',
      fr: 'Épreuves et contrôles officiels de la faculté préparatoire de MADI pour le niveau A1 (2023, 36 p.).',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра русского языка ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Контро́льная рабо́та № 1. Лексика, грамма́тика и чте́ние (У́ровень A1)',
        russianText:
          'Часть 1. Вы́берите пра́вильный вариа́нт отве́та: 1) Мои́ друзья́ сейча́с у́чатся ... (а: университе́т, б: в университе́те, в: университе́ту) -> Пра́вильный отве́т: в университе́те. 2) Вчера́ ве́чером я звони́л ... (а: преподава́тель, б: преподава́теля, в: преподава́телю) -> Пра́вильный отве́т: преподава́телю.',
        translationNotes: {
          ru: 'Тренировка тестового формата перед рубежным контролем в МАДИ.',
          en: 'Practice test items matching the official MADI checkpoint examination format.',
          ar: 'تدريب عملي على نمط أسئلة الاختبارات الرسمية المعتمدة في جامعة مادي.',
          fr: 'Entraînement au format des examens officiels de MADI.',
        },
      },
    ],
  },
  {
    id: 'madi-pf-26',
    title: {
      ru: 'Сбо́рник контро́льных рабо́т к уче́бнику «На́ше вре́мя-2» для студе́нтов-иностра́нцев (A2)',
      en: 'Official Test Booklet for "Our Time-2" — Basic Level A2 (MADI)',
      ar: 'مجموعة الاختبارات الرسمية لكتاب «Наше время-2» — المستوى الأساسي A2 (جامعة مادي)',
      fr: 'Recueil de contrôles pour « Notre Temps-2 » — Niveau de base A2 (MADI)',
    },
    author: 'Фролова А.Н. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2014,
    totalPagesCount: 24,
    origin: 'madi_official',
    section: 'exam_prep',
    level: 'A2',
    topic: 'exam',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальная электронная библиотека ПФ МАДИ (lib.madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://lib.madi.ru/fel/fel1/fel14M219.pdf',
    coverTheme: 'exam_amber',
    description: {
      ru: 'Контрольные тесты по всем падежам и глаголам движения к базовому курсу «Наше время-2» (МАДИ, 24 с.).',
      en: 'Assessment tests covering all six cases and verbs of motion for Basic Level A2 "Our Time-2" (MADI, 24 pp.).',
      ar: 'اختبارات تقييم شاملة لجميع الحالات الإعرابية وأفعال الحركة للمستوى الأساسي A2 (جامعة مادي).',
      fr: 'Tests d’évaluation sur les six cas et les verbes de mouvement pour le niveau A2 (MADI, 24 p.).',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра русского языка ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Ито́говый тест по падежа́м и глаго́лам движе́ния (У́ровень A2)',
        russianText:
          'Прове́рьте себя́: 1) Авто́бус е́дет по (широ́кая у́лица) к (но́вая ста́нция метро́) -> Авто́бус е́дет по широ́кой у́лице к но́вой ста́нции метро́. 2) У меня́ ещё нет (си́няя ру́чка и большо́й слова́рь) -> У меня́ ещё нет си́ней ру́чки и большо́го словаря́.',
        translationNotes: {
          ru: 'Дательный падеж с предлогами «по» и «к»; Родительный падеж после «нет».',
          en: 'Dative case with "по" and "к"; Genitive case after "нет".',
          ar: 'حالة المقصود مع حروف الجر «по» و«к»، وحالة المضاف إليه بعد النفي «нет».',
          fr: 'Le datif avec « по » et « к » ; le génitif après « нет ».',
        },
      },
    ],
  },
  {
    id: 'madi-pf-27',
    title: {
      ru: 'Сбо́рник контро́льных рабо́т к уче́бнику «На́ше вре́мя-3» (У́ровень B1 / ТРКИ-1)',
      en: 'Official Test Booklet for "Our Time-3" — Certification Level B1 / TORFL-1 (MADI)',
      ar: 'مجموعة الاختبارات النهائية لكتاب «Наше время-3» — المستوى الأول ТРКИ-1 / B1 (مادي)',
      fr: 'Recueil d’examens pour « Notre Temps-3 » — Niveau certifiant B1 / TRKI-1 (MADI)',
    },
    author: 'Фролова А.Н. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2016,
    totalPagesCount: 40,
    origin: 'madi_official',
    section: 'exam_prep',
    level: 'B1',
    topic: 'exam',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальная электронная библиотека ПФ МАДИ (lib.madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://lib.madi.ru/fel/fel1/fel16M508.pdf',
    coverTheme: 'exam_amber',
    description: {
      ru: 'Экзаменационные и контрольные материалы для выпускного экзамена подготовительного факультета МАДИ (уровень B1, 40 с.).',
      en: 'Final examination and assessment papers for graduating from the MADI Preparatory Faculty (Level B1, 40 pp.).',
      ar: 'اختبارات التخرج النهائية من السنة التحضيرية بجامعة مادي للمستوى الأول B1 / ТРКИ-1 (40 صفحة).',
      fr: 'Sujets d’examen final de la faculté préparatoire de MADI (Niveau B1, 40 p.).',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра русского языка ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Выпускно́й тест подготови́тельного факульте́та (У́ровень B1)',
        russianText:
          'Заме́ните прида́точные предложе́ния со сло́вом «кото́рый» прича́стным оборо́том: Студе́нты, кото́рые изуча́ют инжене́рные нау́ки в МАДИ́, прохо́дят пра́ктику в совреме́нных лаборато́риях -> Студе́нты, изуча́ющие инжене́рные нау́ки в МАДИ́, прохо́дят пра́ктику в совреме́нных лаборато́риях.',
        translationNotes: {
          ru: 'Трансформация сложных предложений с «который» в причастные обороты (ключевой навык B1).',
          en: 'Transforming relative clauses with "который" into participial phrases (core B1 exam skill).',
          ar: 'تحويل جمل الوصل («кото́рый») إلى تراكيب اسم الفاعل (من أهم مهارات امتحان المستوى B1).',
          fr: 'Transformation des propositions relatives avec « который » en participes (compétence clé B1).',
        },
      },
    ],
  },
  {
    id: 'madi-pf-28',
    title: {
      ru: 'Нау́чный стиль ре́чи: контро́льные рабо́ты для иностра́нных студе́нтов ПФ МАДИ́',
      en: 'Scientific Style of Speech: Assessment Tests for Preparatory Students (MADI)',
      ar: 'الأسلوب العلمي للكلام: اختبارات التقييم للطلاب الأجانب في السنة التحضيرية (مادي)',
      fr: 'Style du discours scientifique : contrôles pour la faculté préparatoire (MADI)',
    },
    author: 'Щемелинина О.Н. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2017,
    totalPagesCount: 60,
    origin: 'madi_official',
    section: 'exam_prep',
    level: 'B1',
    topic: 'exam',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальная электронная библиотека ПФ МАДИ (lib.madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://lib.madi.ru/fel/fel1/fel17M591.pdf',
    coverTheme: 'exam_amber',
    description: {
      ru: 'Контрольные работы по научному стилю речи для проверки готовности к слушанию университетских лекций (МАДИ, 60 с.).',
      en: 'Scientific Russian assessment tests evaluating readiness for first-year university lectures (MADI, 60 pp.).',
      ar: 'اختبارات قياس الجاهزية لفهم المحاضرات العلمية والجامعية باللغة الروسية (جامعة مادي، 60 صفحة).',
      fr: 'Évaluations de russe scientifique préparant aux cours magistraux universitaires (MADI, 60 p.).',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра русского языка ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Контро́ль понима́ния нау́чного те́кста и конспекти́рования ле́кций',
        russianText:
          'При чте́нии нау́чного те́кста выдели́те гла́вную информа́цию ка́ждого абза́ца, ключевы́е те́рмины и формулиро́вки зако́нов, а зате́м соста́вьте кра́ткий конспе́кт в виде те́зисов.',
        translationNotes: {
          ru: 'Методика составления конспекта лекции в российском техническом вузе.',
          en: 'Methodology for taking structured lecture notes at a Russian technical university.',
          ar: 'منهجية تلخيص وتدوين المحاضرات الجامعية في الجامعات التقنية الروسية.',
          fr: 'Méthodologie de prise de notes en cours magistral dans une université technique russe.',
        },
      },
    ],
  },
  {
    id: 'madi-pf-29',
    title: {
      ru: 'Преподава́ние матема́тики на РКИ: методи́ческие указа́ния для вво́дного эта́па',
      en: 'Teaching Mathematics in Russian as a Foreign Language: Methodological Guide (MADI)',
      ar: 'تدريس الرياضيات باللغة الروسية للأجانب: الدليل المنهجي للمرحلة التمهيدية (مادي)',
      fr: 'Enseigner les mathématiques en russe langue étrangère : guide méthodologique (MADI)',
    },
    author: 'Васильева О.Н., Ильенко Н.А., Матвеева Н.В., Блинова Т.А. (МАДИ)',
    publisher: 'Издательство МАДИ',
    publicationYear: 2011,
    totalPagesCount: 100,
    origin: 'madi_official',
    section: 'teacher_materials',
    level: 'B1',
    topic: 'campus',
    explanationLang: 'all',
    licenseType: 'all_rights_reserved_with_permission',
    licenseText: 'Официальная электронная библиотека ПФ МАДИ (lib.madi.ru)',
    sourceUrl: 'https://www.madi.ru/6999-podgotovitelnyy-fakultet-dlya-inostrannyhgrazhdan-pfi-.html',
    pdfUrl: 'https://lib.madi.ru/fel/fel1/fel15M402.pdf',
    coverTheme: 'exam_amber',
    description: {
      ru: 'Методическое руководство для преподавателей и студентов по введению математической терминологии на русском языке (МАДИ, 100 с.).',
      en: 'Methodological guide for instructors and students on introducing mathematical terminology in Russian (MADI, 100 pp.).',
      ar: 'الدليل المنهجي للأساتذة والطلاب لشرح وتطبيق المصطلحات الرياضية باللغة الروسية (جامعة مادي، 100 صفحة).',
      fr: 'Guide méthodologique pour l’introduction de la terminologie mathématique en russe (MADI, 100 p.).',
    },
    permissionConfirmed: true,
    reviewStatus: 'approved',
    reviewedBy: 'Кафедра общетеоретических дисциплин ПФ МАДИ',
    reviewedAt: '2026-10-01T00:00:00Z',
    pages: [
      {
        pageNumber: 1,
        heading: 'Поуро́чное введе́ние математи́ческих те́рминов и речевы́х констру́кций',
        russianText:
          'На пе́рвых заня́тиях студе́нты осва́ивают чте́ние нату́ральных, це́лых и дробных чи́сел, зна́ков арифмети́ческих де́йствий и ско́бок, а зате́м перехо́дят к формулиро́вкам теоре́м и реше́нию текстовы́х зада́ч.',
        translationNotes: {
          ru: 'Официальное пособие кафедры общетеоретических дисциплин ПФ МАДИ.',
          en: 'Official manual of the Department of Theoretical Disciplines at MADI Preparatory Faculty.',
          ar: 'مرجع رسمي من قسم المواد النظرية العامة بالكلية التحضيرية في جامعة مادي.',
          fr: 'Manuel officiel du département des disciplines théoriques de la faculté préparatoire de MADI.',
        },
      },
    ],
  },
];

export const OFFICIAL_LIBRARY_CATALOG: LibraryItem[] = RAW_OFFICIAL_BOOKS.map((book) => ({
  ...book,
  coverImageUrl:
    book.origin === 'madi_official'
      ? `/covers/${book.id}.jpg`
      : generateBookCoverSvgDataUrl({
          titleRu: book.title.ru,
          author: book.author,
          publisher: book.publisher || 'Издательство МАДИ',
          year: book.publicationYear || 2022,
          pagesCount: book.totalPagesCount || 64,
          level: book.level,
          theme: book.coverTheme || 'madi_blue',
          isMadiOfficial: false,
        }),
}));


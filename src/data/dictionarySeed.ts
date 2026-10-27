/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dictionary Seed (Static vocabulary removed per user request in favor of the
 * live AI Instant Translator for RU / AR / EN / FR)
 * & 40 Starter Typing Lab Paragraphs (20-60 words across 4 themes).
 */

import {
  DictionaryWordRecord,
  stripStressMarks,
  SupportedLang,
} from '../lib/phase2Engine';

// Static vocabulary has been removed; DictionaryView now uses the AI Instant Translator.
export const DICTIONARY_WORDS: DictionaryWordRecord[] = [];

// ==========================================
// 40 STARTER TYPING LAB PARAGRAPHS (A1-A2, 20-60 words)
// Themes: campus (10), greetings (10), city_metro (10), cars_roads (10)
// ==========================================

export interface TypingParagraphSeed {
  id: string;
  slug: string;
  level: 'A1' | 'A2';
  topic: 'campus' | 'greetings' | 'city_metro' | 'cars_roads';
  title: Record<SupportedLang, string>;
  textStressed: string;
  textClean: string;
  errorSpotting: {
    corruptedText: string;
    mistakes: Array<{ wrongWord: string; correctWord: string; wordIndex: number }>;
  };
  fillInBlankWords: string[];
  audioSlug: string;
}

const RAW_TYPING_PARAGRAPHS: Array<{
  slug: string;
  level: 'A1' | 'A2';
  topic: 'campus' | 'greetings' | 'city_metro' | 'cars_roads';
  title: Record<SupportedLang, string>;
  textStressed: string;
  wrongWord: string;
  correctWord: string;
  fillWords: string[];
}> = [
  // --- THEME 1: CAMPUS LIFE (10) ---
  {
    slug: 'campus-madi-morning',
    level: 'A1',
    topic: 'campus',
    title: {
      en: '01. Morning at the MADI Main Building',
      ru: '01. Утро в главном корпусе МАДИ',
      ar: '01. صباح في المبنى الرئيسي لجامعة مادي',
      fr: '01. Matin au bâtiment principal de MADI',
    },
    textStressed:
      'Ка́ждое у́тро я иду́ в гла́вный ко́рпус МАДИ́ на Ленингра́дском проспе́кте. У вхо́да я пока́зываю студе́нческий биле́т. Сего́дня у нас пе́рвая ле́кция по матема́тике в большо́й аудито́рии.',
    wrongWord: 'биле́т',
    correctWord: 'про́пуск',
    fillWords: ['ко́рпус', 'биле́т', 'ле́кция'],
  },
  {
    slug: 'campus-engineering-lab',
    level: 'A1',
    topic: 'campus',
    title: {
      en: '02. Inside the Engine Laboratory',
      ru: '02. В лаборатории двигателей',
      ar: '02. في مختبر المحركات',
      fr: '02. Dans le laboratoire des moteurs',
    },
    textStressed:
      'На второ́м этаже́ нахо́дится на́ша лаборато́рия. Здесь студе́нты изуча́ют но́вый автомоби́льный дви́гатель и смо́трят то́чный чертёж. Преподава́тель объясня́ет, как рабо́тает ка́ждый цили́ндр и порше́нь.',
    wrongWord: 'дви́гатель',
    correctWord: 'мото́р',
    fillWords: ['лаборато́рия', 'дви́гатель', 'чертёж'],
  },
  {
    slug: 'campus-library-study',
    level: 'A1',
    topic: 'campus',
    title: {
      en: '03. Studying in the Reading Room',
      ru: '03. Занятия в читальном зале',
      ar: '03. الدراسة في قاعة المطالعة',
      fr: '03. Étudier dans la salle de lecture',
    },
    textStressed:
      'По́сле семина́ра мы с дру́гом идём в библиоте́ку. В чита́льном за́ле о́чень ти́хо и светло́. Мы берём уче́бник по фи́зике, открыва́ем тетра́дь и пи́шем дома́шнее зада́ние.',
    wrongWord: 'библиоте́ку',
    correctWord: 'столо́вую',
    fillWords: ['библиоте́ку', 'уче́бник', 'тетра́дь'],
  },
  {
    slug: 'campus-canteen-lunch',
    level: 'A1',
    topic: 'campus',
    title: {
      en: '04. Lunch Break at the Student Canteen',
      ru: '04. Обед в студенческой столовой',
      ar: '04. استراحة الغداء في كافتيريا الطلاب',
      fr: '04. Pause déjeuner à la cantine',
    },
    textStressed:
      'В два часа́ дня начина́ется переры́в на обе́д. В столо́вой МАДИ́ всегда́ вку́сный горя́чий суп, све́жий сала́т, рис с ку́рицей и тёплый чай с са́харом.',
    wrongWord: 'обе́д',
    correctWord: 'за́втрак',
    fillWords: ['обе́д', 'столо́вой', 'суп'],
  },
  {
    slug: 'campus-dormitory-evening',
    level: 'A1',
    topic: 'campus',
    title: {
      en: '05. Evening in the Student Dormitory',
      ru: '05. Вечер в студенческом общежитии',
      ar: '05. المساء في السكن الجامعي',
      fr: '05. Soirée à la résidence universitaire',
    },
    textStressed:
      'Ве́чером я возвраща́юсь в студе́нческое общежи́тие. Мой сосе́д по ко́мнате гото́вит у́жин и слу́шает му́зыку. Пото́м мы вме́сте повторя́ем но́вые ру́сские слова́ и глаго́лы.',
    wrongWord: 'общежи́тие',
    correctWord: 'университе́т',
    fillWords: ['общежи́тие', 'сосе́д', 'слова́'],
  },
  {
    slug: 'campus-deans-office',
    level: 'A2',
    topic: 'campus',
    title: {
      en: '06. Visiting the Dean’s Office',
      ru: '06. Визит в деканат факультета',
      ar: '06. زيارة عمادة الكلية',
      fr: '06. Visite au décanat de la faculté',
    },
    textStressed:
      'Сего́дня мне нужна́ официа́льная спра́вка об обуче́нии. Я поднима́юсь на тре́тий эта́ж, стучу́ в дверь декана́та и ве́жливо говорю́: «Здра́вствуйте, мо́жно войти́? Вот мой студе́нческий биле́т».',
    wrongWord: 'спра́вка',
    correctWord: 'ви́за',
    fillWords: ['спра́вка', 'декана́та', 'биле́т'],
  },
  {
    slug: 'campus-blueprint-drafting',
    level: 'A2',
    topic: 'campus',
    title: {
      en: '07. Drafting a Bridge Blueprint',
      ru: '07. Проектирование чертежа моста',
      ar: '07. رسم مخطط هندسي للجسر',
      fr: '07. Dessiner le plan d’un pont',
    },
    textStressed:
      'Бу́дущий инжене́р до́лжен аккура́тно черти́ть на бума́ге и на компью́тере. Сего́дня на́ша гру́ппа дела́ет чертёж широ́кого моста́ че́рез реку́. Преподава́тель проверя́ет ка́ждый разме́р и пролёт.',
    wrongWord: 'чертёж',
    correctWord: 'план',
    fillWords: ['инжене́р', 'чертёж', 'пролёт'],
  },
  {
    slug: 'campus-exam-session',
    level: 'A2',
    topic: 'campus',
    title: {
      en: '08. Preparing for Semester Exams',
      ru: '08. Подготовка к зимней сессии',
      ar: '08. التحضير لامتحانات الفصل الدراسي',
      fr: '08. Préparation aux examens du semestre',
    },
    textStressed:
      'В январе́ начина́ется экзаменацио́нная се́ссия. Студе́нты усе́рдно у́чат фо́рмулы по меха́нике и доро́жному строи́тельству. Е́сли ты зна́ешь материа́л, преподава́тель поста́вит отли́чный зачёт в зачётку.',
    wrongWord: 'зачёт',
    correctWord: 'дипло́м',
    fillWords: ['фо́рмулы', 'меха́нике', 'зачёт'],
  },
  {
    slug: 'campus-schedule-check',
    level: 'A1',
    topic: 'campus',
    title: {
      en: '09. Checking the Weekly Timetable',
      ru: '09. Расписание лекций на неделю',
      ar: '09. مراجعة جدول المحاضرات الأسبوعي',
      fr: '09. Vérifier l’emploi du temps de la semaine',
    },
    textStressed:
      'В понеде́льник и сре́ду у на́шей гру́ппы три ле́кции и оди́н семина́р. Во вто́рник мы рабо́таем в техни́ческой мастерско́й, а в пя́тницу изуча́ем ру́сский язы́к и слова́рь.',
    wrongWord: 'мастерско́й',
    correctWord: 'аудито́рии',
    fillWords: ['понеде́льник', 'мастерско́й', 'слова́рь'],
  },
  {
    slug: 'campus-international-club',
    level: 'A2',
    topic: 'campus',
    title: {
      en: '10. International Student Friendship at MADI',
      ru: '10. Дружба иностранных студентов в МАДИ',
      ar: '10. صداقة الطلاب الدوليين في مادي',
      fr: '10. Amitié internationale à MADI',
    },
    textStressed:
      'В МАДИ́ у́чатся студе́нты из ра́зных стран ми́ра. Мы говори́м по-ру́сски, помога́ем друг дру́гу понима́ть тру́дные техни́ческие те́рмины и вме́сте гуля́ем по краси́вой Москве́ в выходны́е дни.',
    wrongWord: 'те́рмины',
    correctWord: 'пе́сни',
    fillWords: ['студе́нты', 'по-ру́сски', 'те́рмины'],
  },

  // --- THEME 2: GREETINGS & CONVERSATIONS (10) ---
  {
    slug: 'greet-first-day',
    level: 'A1',
    topic: 'greetings',
    title: {
      en: '11. Meeting Your Classmates on Day One',
      ru: '11. Знакомство в первый день',
      ar: '11. التعارف في اليوم الأول',
      fr: '11. Rencontre le premier jour',
    },
    textStressed:
      'Приве́т! Меня́ зову́т Ами́р, я но́вый студе́нт пе́рвого ку́рса. А как тебя́ зову́т? О́чень прия́тно познако́миться! Дава́й пойдём в аудито́рию вме́сте.',
    wrongWord: 'пе́рвого',
    correctWord: 'второ́го',
    fillWords: ['Приве́т', 'студе́нт', 'прия́тно'],
  },
  {
    slug: 'greet-professor-polite',
    level: 'A1',
    topic: 'greetings',
    title: {
      en: '12. Greeting Professor Ivanov Respectfully',
      ru: '12. Вежливое приветствие профессора',
      ar: '12. تحية الأستاذ الجامعي باحترام',
      fr: '12. Saluer le professeur avec respect',
    },
    textStressed:
      'Здра́вствуйте, уважа́емый профе́ссор! До́брое у́тро! Извини́те, пожа́луйста, у меня́ есть оди́н ва́жный вопро́с по чертежу́ автомоби́льного моста́. Большо́е вам спаси́бо за отве́т!',
    wrongWord: 'у́тро',
    correctWord: 'ве́чер',
    fillWords: ['Здра́вствуйте', 'вопро́с', 'спаси́бо'],
  },
  {
    slug: 'greet-how-are-you',
    level: 'A1',
    topic: 'greetings',
    title: {
      en: '13. Friendly Chat in the Hallway',
      ru: '13. Разговор друзей в коридоре',
      ar: '13. حديث ودي في الممر',
      fr: '13. Discussion amicale dans le couloir',
    },
    textStressed:
      'До́брый день, Мари́я! Как твои́ дела́ сего́дня? Спаси́бо, всё отли́чно! Я уже́ сде́лала дома́шнее зада́ние и сейча́с иду́ пить горя́чий чай в кафе́.',
    wrongWord: 'чай',
    correctWord: 'ко́фе',
    fillWords: ['дела́', 'отли́чно', 'зада́ние'],
  },
  {
    slug: 'greet-where-from',
    level: 'A1',
    topic: 'greetings',
    title: {
      en: '14. Talking About Countries & Languages',
      ru: '14. Откуда вы приехали?',
      ar: '14. من أي بلد جئت؟',
      fr: '14. D’où venez-vous ?',
    },
    textStressed:
      'Скажи́те, пожа́луйста, отку́да вы прие́хали? Я прие́хал в Росси́ю из Алжи́ра, а мой друг прие́хал из Фра́нции. Сейча́с мы живём в Москве́ и изуча́ем ру́сский язы́к.',
    wrongWord: 'Москве́',
    correctWord: 'центре',
    fillWords: ['отку́да', 'Росси́ю', 'язы́к'],
  },
  {
    slug: 'greet-thanking-mechanic',
    level: 'A1',
    topic: 'greetings',
    title: {
      en: '15. Thanking Misha in the Workshop',
      ru: '15. Благодарность механику Мише',
      ar: '15. شكر الميكانيكي ميشا في الورشة',
      fr: '15. Remercier Micha à l’atelier',
    },
    textStressed:
      'До́брый ве́чер, Ми́ша! Большо́е спаси́бо за по́мощь в гараже́. Тепе́рь я понима́ю, как называ́ются все дета́ли маши́ны по-ру́сски. До свида́ния и до за́втра!',
    wrongWord: 'гараже́',
    correctWord: 'музе́е',
    fillWords: ['спаси́бо', 'гараже́', 'маши́ны'],
  },
  {
    slug: 'greet-asking-help',
    level: 'A1',
    topic: 'greetings',
    title: {
      en: '16. Asking a Polite Question on Campus',
      ru: '16. Вежливая просьба о помощи',
      ar: '16. طلب مساعدة بلطف في الحرم الجامعي',
      fr: '16. Demander de l’aide poliment',
    },
    textStressed:
      'Извини́те, пожа́луйста, вы не подска́жете, где нахо́дится чита́льный зал? Да, коне́чно! Иди́те пря́мо по коридо́ру и поверни́те нале́во. Пожа́луйста, не́ за что!',
    wrongWord: 'нале́во',
    correctWord: 'напра́во',
    fillWords: ['Извини́те', 'коридо́ру', 'нале́во'],
  },
  {
    slug: 'greet-phone-call',
    level: 'A2',
    topic: 'greetings',
    title: {
      en: '17. Calling a Study Partner',
      ru: '17. Телефонный разговор со старостой',
      ar: '17. مكالمة هاتفية مع زميل الدراسة',
      fr: '17. Appel téléphonique à un camarade',
    },
    textStressed:
      'Алло́, до́брый день! Э́то Ива́н из тре́тьей гру́ппы. Скажи́, пожа́луйста, во ско́лько за́втра начина́ется консульта́ция по фи́зике? В де́сять часо́в утра́. Спаси́бо, пока́!',
    wrongWord: 'де́сять',
    correctWord: 'во́семь',
    fillWords: ['гру́ппы', 'фи́зике', 'утра́'],
  },
  {
    slug: 'greet-welcoming-guests',
    level: 'A2',
    topic: 'greetings',
    title: {
      en: '18. Welcoming New Students to MADI',
      ru: '18. Добро пожаловать в МАДИ!',
      ar: '18. أهلاً بكم في جامعة مادي!',
      fr: '18. Bienvenue à l’université MADI !',
    },
    textStressed:
      'Дороги́е друзья́, добро́ пожа́ловать в Моско́вский автомоби́льно-доро́жный университе́т! Мы ра́ды ви́деть вас в на́ших аудито́риях и лаборато́риях. Жела́ем вам большо́го успе́ха в учёбе!',
    wrongWord: 'аудито́риях',
    correctWord: 'парках',
    fillWords: ['друзья́', 'университе́т', 'успе́ха'],
  },
  {
    slug: 'greet-goodbye-weekend',
    level: 'A1',
    topic: 'greetings',
    title: {
      en: '19. Wishing a Good Weekend',
      ru: '19. Прощание перед выходными',
      ar: '19. تمنيات بعطلة نهاية أسبوع سعيدة',
      fr: '19. Souhaiter un bon week-end',
    },
    textStressed:
      'Сего́дня пя́тница, все ле́кции уже́ зако́нчились. До свида́ния, друзья́! Хоро́ших вам выходны́х! Уви́димся в понеде́льник у́тром на ста́нции метро́ «Аэропо́рт».',
    wrongWord: 'пя́тница',
    correctWord: 'суббо́та',
    fillWords: ['пя́тница', 'До свида́ния', 'понеде́льник'],
  },
  {
    slug: 'greet-cafe-order',
    level: 'A2',
    topic: 'greetings',
    title: {
      en: '20. Ordering Tea and Pastries Politenes',
      ru: '20. Вежливый заказ в городском кафе',
      ar: '20. طلب الشاي بلطف في المقهى',
      fr: '20. Commander poliment dans un café',
    },
    textStressed:
      'Здра́вствуйте! Да́йте мне, пожа́луйста, оди́н большо́й зелёный чай и све́жий хлеб с сы́ром. Ско́лько э́то сто́ит? Возьми́те, пожа́луйста, ка́рту. Большо́е спаси́бо!',
    wrongWord: 'зелёный',
    correctWord: 'чёрный',
    fillWords: ['пожа́луйста', 'чай', 'ка́рту'],
  },

  // --- THEME 3: CITY & METRO (10) ---
  {
    slug: 'metro-aeroport-station',
    level: 'A1',
    topic: 'city_metro',
    title: {
      en: '21. Arriving at Aeroport Metro Station',
      ru: '21. Станция метро «Аэропорт»',
      ar: '21. الوصول إلى محطة مترو أيروبورت',
      fr: '21. Arrivée à la station de métro Aéroport',
    },
    textStressed:
      'Ста́нция метро́ «Аэропо́рт» нахо́дится на зелёной ли́нии совсе́м ря́дом с МАДИ́. Я прикла́дываю ка́рту «Тро́йка» к турнике́ту, спуска́юсь на платфо́рму и жду свой по́езд.',
    wrongWord: 'зелёной',
    correctWord: 'кра́сной',
    fillWords: ['Ста́нция', 'турнике́ту', 'по́езд'],
  },
  {
    slug: 'metro-ring-line-transfer',
    level: 'A1',
    topic: 'city_metro',
    title: {
      en: '22. Transferring to the Ring Line',
      ru: '22. Пересадка на Кольцевую линию',
      ar: '22. الانتقال إلى الخط الدائري في المترو',
      fr: '22. Correspondance sur la ligne circulaire',
    },
    textStressed:
      'Что́бы дое́хать до восто́ка Москвы́, мне нужна́ переса́дка на ста́нции «Белору́сская». Я иду́ по указа́телям в перехо́д и сажу́сь в по́езд Кольцево́й ли́нии.',
    wrongWord: 'переса́дка',
    correctWord: 'остано́вка',
    fillWords: ['переса́дка', 'перехо́д', 'ли́нии'],
  },
  {
    slug: 'city-red-square-walk',
    level: 'A1',
    topic: 'city_metro',
    title: {
      en: '23. Evening Walk on Red Square',
      ru: '23. Прогулка по Красной площади',
      ar: '23. جولة مسائية في الساحة الحمراء',
      fr: '23. Promenade du soir sur la Place Rouge',
    },
    textStressed:
      'В суббо́ту ве́чером мы е́дем в центр столи́цы. Вот Кра́сная пло́щадь, дре́вний Кремль и высо́кая ба́шня с часа́ми. Вокру́г гуля́ют лю́ди и де́лают краси́вые фотогра́фии.',
    wrongWord: 'суббо́ту',
    correctWord: 'среду́',
    fillWords: ['центр', 'пло́щадь', 'ба́шня'],
  },
  {
    slug: 'city-electric-bus',
    level: 'A1',
    topic: 'city_metro',
    title: {
      en: '24. Riding a Moscow Electric Bus',
      ru: '24. Поездка на московском электробусе',
      ar: '24. ركوب الحافلة الكهربائية في موسكو',
      fr: '24. Trajet en bus électrique à Moscou',
    },
    textStressed:
      'По Ленингра́дскому проспе́кту бы́стро и ти́хо е́дет си́ний моско́вский электро́бус. На экра́не в сало́не видна́ сле́дующая остано́вка и то́чное вре́мя прибы́тия.',
    wrongWord: 'си́ний',
    correctWord: 'жёлтый',
    fillWords: ['проспе́кту', 'электро́бус', 'остано́вка'],
  },
  {
    slug: 'city-vdnkh-exhibition',
    level: 'A2',
    topic: 'city_metro',
    title: {
      en: '25. Exploring Rockets and Pavilions at VDNKh',
      ru: '25. Экскурсия на ВДНХ',
      ar: '25. استكشاف أجنحة معرض فدنخا',
      fr: '25. Explorer le parc des expositions VDNKh',
    },
    textStressed:
      'В воскресе́нье на́ша студе́нческая гру́ппа е́дет в большо́й парк ВДНХ. Мы смо́трим па́мятник покори́телям ко́смоса, высо́кую раке́ту и совреме́нный музе́й нау́ки и те́хники.',
    wrongWord: 'воскресе́нье',
    correctWord: 'вто́рник',
    fillWords: ['парк', 'па́мятник', 'музе́й'],
  },
  {
    slug: 'city-moskva-river-bridge',
    level: 'A2',
    topic: 'city_metro',
    title: {
      en: '26. Crossing the Moskva River Bridge',
      ru: '26. На мосту через Москву-реку',
      ar: '26. عبور الجسر فوق نهر موسكو',
      fr: '26. Traverser le pont sur la Moskova',
    },
    textStressed:
      'Мы стои́м на широ́ком мосту́ че́рез Москву́-реку́. Внизу́ по воде́ плывёт речно́й трамва́й, а на на́бережной горя́т я́ркие ве́черние фонари́. Констру́кция моста́ о́чень про́чная.',
    wrongWord: 'мосту́',
    correctWord: 'вокза́ле',
    fillWords: ['мосту́', 'на́бережной', 'фонари́'],
  },
  {
    slug: 'city-asking-directions',
    level: 'A1',
    topic: 'city_metro',
    title: {
      en: '27. Finding the Nearest Pharmacy and Bank',
      ru: '27. Как пройти к аптеке и банку',
      ar: '27. البحث عن أقرب صيدلية وبنك',
      fr: '27. Trouver la pharmacie et la banque',
    },
    textStressed:
      'Скажи́те, пожа́луйста, где здесь ближа́йшая апте́ка и банкома́т? Перейди́те у́лицу по подзе́мному перехо́ду, поверни́те напра́во и иди́те пря́мо сто ме́тров до угла́.',
    wrongWord: 'апте́ка',
    correctWord: 'по́чта',
    fillWords: ['апте́ка', 'перехо́ду', 'пря́мо'],
  },
  {
    slug: 'city-belorussky-station',
    level: 'A2',
    topic: 'city_metro',
    title: {
      en: '28. Catching the Aeroexpress at Belorussky Terminal',
      ru: '28. Аэроэкспресс на Белорусском вокзале',
      ar: '28. قطار المطار من محطة بيلوروسكي',
      fr: '28. Prendre l’Aéroexpress à la gare Biélorusse',
    },
    textStressed:
      'С Белору́сского вокза́ла ка́ждые три́дцать мину́т отправля́ется кра́сный двухэта́жный по́езд в аэропо́рт Шереме́тьево. Пое́здка без про́бок занима́ет всего́ со́рок мину́т.',
    wrongWord: 'три́дцать',
    correctWord: 'де́сять',
    fillWords: ['вокза́ла', 'по́езд', 'аэропо́рт'],
  },
  {
    slug: 'city-pedestrian-safety',
    level: 'A1',
    topic: 'city_metro',
    title: {
      en: '29. Crossing the Avenue Safely',
      ru: '29. Безопасный переход проспекта',
      ar: '29. عبور الجادة بأمان',
      fr: '29. Traverser l’avenue en sécurité',
    },
    textStressed:
      'Внима́тельный пешехо́д всегда́ смо́трит на светофо́р пе́ред перекрёстком. Когда́ гори́т кра́сный свет, переходи́ть доро́гу нельзя́. Мы ждём зелёный сигна́л и идём по зе́бре.',
    wrongWord: 'кра́сный',
    correctWord: 'си́ний',
    fillWords: ['пешехо́д', 'светофо́р', 'зелёный'],
  },
  {
    slug: 'city-winter-snow-moscow',
    level: 'A2',
    topic: 'city_metro',
    title: {
      en: '30. Snowy Winter Streets in Moscow',
      ru: '30. Зимний день на улицах Москвы',
      ar: '30. شوارع موسكو في يوم شتوي مثلج',
      fr: '30. Rues enneigées d’hiver à Moscou',
    },
    textStressed:
      'Зимо́й в Москве́ идёт пуши́стый бе́лый снег и быва́ет моро́з. Я надева́ю тёплую ку́ртку, ша́пку, шарф и перча́тки, а в метро́ всегда́ тепло́ и удо́бно е́здить.',
    wrongWord: 'снег',
    correctWord: 'дождь',
    fillWords: ['снег', 'ку́ртку', 'метро́'],
  },

  // --- THEME 4: CARS & ROADS (10) ---
  {
    slug: 'cars-pre-trip-inspection',
    level: 'A1',
    topic: 'cars_roads',
    title: {
      en: '31. Pre-Trip Car Check with Misha',
      ru: '31. Осмотр автомобиля перед поездкой',
      ar: '31. فحص السيارة قبل الرحلة مع ميشا',
      fr: '31. Vérification de la voiture avant le départ',
    },
    textStressed:
      'Пе́ред да́льней доро́гой меха́ник Ми́ша проверя́ет наш автомоби́ль. Он смо́трит давле́ние в ши́нах, у́ровень ма́сла в дви́гателе, чи́стые фа́ры и надёжный то́рмоз.',
    wrongWord: 'ши́нах',
    correctWord: 'окнах',
    fillWords: ['автомоби́ль', 'ши́нах', 'то́рмоз'],
  },
  {
    slug: 'cars-highway-interchange',
    level: 'A2',
    topic: 'cars_roads',
    title: {
      en: '32. Designing a Multi-Level Highway Interchange',
      ru: '32. Многоуровневая дорожная развязка',
      ar: '32. تصميم تقاطع طرق متعدد المستويات',
      fr: '32. Concevoir un échangeur autoroutier',
    },
    textStressed:
      'Совреме́нная доро́жная развя́зка помога́ет маши́нам е́хать без про́бок. Наверху́ прохо́дит широ́кая эстака́да, а внизу́ нахо́дится удо́бный поворо́т и полоса́ для авто́бусов.',
    wrongWord: 'развя́зка',
    correctWord: 'парко́вка',
    fillWords: ['развя́зка', 'эстака́да', 'полоса́'],
  },
  {
    slug: 'cars-asphalt-construction',
    level: 'A2',
    topic: 'cars_roads',
    title: {
      en: '33. Laying New Asphalt on the Highway',
      ru: '33. Укладка нового асфальта на трассе',
      ar: '33. رصف الأسفلت الجديد على الطريق السريع',
      fr: '33. Pose d’un nouvel asphalte sur la route',
    },
    textStressed:
      'Доро́жные инжене́ры стро́ят но́вое шоссе́. Снача́ла они́ укла́дывают про́чный ще́бень и бето́н, а зате́м тяжёлый като́к выра́внивает горя́чий чёрный асфа́льт.',
    wrongWord: 'като́к',
    correctWord: 'кран',
    fillWords: ['шоссе́', 'бето́н', 'асфа́льт'],
  },
  {
    slug: 'cars-gearbox-and-clutch',
    level: 'A2',
    topic: 'cars_roads',
    title: {
      en: '34. How the Gearbox and Clutch Work',
      ru: '34. Работа коробки передач и сцепления',
      ar: '34. كيف تعمل علبة التروس والقابض',
      fr: '34. Fonctionnement de la boîte de vitesses',
    },
    textStressed:
      'Води́тель пла́вно нажима́ет педа́ль сцепле́ния и переключа́ет переда́чу. Коро́бка переда́ч соединя́ет мото́р с колёсами, что́бы маши́на легко́ поднима́лась в го́ру.',
    wrongWord: 'сцепле́ния',
    correctWord: 'то́рмоза',
    fillWords: ['педа́ль', 'сцепле́ния', 'колёсами'],
  },
  {
    slug: 'cars-suspension-and-brakes',
    level: 'A2',
    topic: 'cars_roads',
    title: {
      en: '35. Suspension and Braking Distance on Wet Roads',
      ru: '35. Подвеска и тормозной путь на мокрой дороге',
      ar: '35. نظام التعليق ومسافة الكبح على طريق مبلل',
      fr: '35. Suspension et distance de freinage sous la pluie',
    },
    textStressed:
      'Когда́ на у́лице идёт дождь и́ли снег, тормозно́й путь автомоби́ля стано́вится длинне́е. Испра́вная подве́ска, амортиза́тор и но́вые ши́ны обеспечи́вают безопа́сность на поворо́те.',
    wrongWord: 'длинне́е',
    correctWord: 'коро́че',
    fillWords: ['дождь', 'подве́ска', 'безопа́сность'],
  },
  {
    slug: 'cars-refueling-station',
    level: 'A1',
    topic: 'cars_roads',
    title: {
      en: '36. Refueling at the Highway Gas Station',
      ru: '36. На автомобильной заправке',
      ar: '36. التزود بالوقود في محطة الطريق السريع',
      fr: '36. Faire le plein à la station-service',
    },
    textStressed:
      'Стре́лка ука́зывает, что в бензоба́ке оста́лось ма́ло то́плива. Мы заезжа́ем на запра́вку, открыва́ем бак и залива́ем со́рок ли́тров чи́стого бензи́на.',
    wrongWord: 'бензи́на',
    correctWord: 'молока́',
    fillWords: ['то́плива', 'запра́вку', 'бензи́на'],
  },
  {
    slug: 'cars-bridge-piers-steel',
    level: 'A2',
    topic: 'cars_roads',
    title: {
      en: '37. Steel Reinforcement and Bridge Supports',
      ru: '37. Стальная арматура и опоры моста',
      ar: '37. حديد التسليح ودعامات الجسر',
      fr: '37. Armature en acier et piliers de pont',
    },
    textStressed:
      'Ка́ждая бето́нная опо́ра моста́ име́ет глубо́кий фунда́мент и стальну́ю армату́ру. По э́тому мосту́ ка́ждый день проезжа́ют ты́сячи легковы́х маши́н и тяжёлых грузовико́в.',
    wrongWord: 'опо́ра',
    correctWord: 'ла́мпа',
    fillWords: ['опо́ра', 'фунда́мент', 'грузовико́в'],
  },
  {
    slug: 'cars-changing-spare-tire',
    level: 'A2',
    topic: 'cars_roads',
    title: {
      en: '38. Changing a Spare Tire with a Jack and Wrench',
      ru: '38. Замена запасного колеса домкратом',
      ar: '38. تغيير الإطار الاحتياطي بالرافعة والمفتاح',
      fr: '38. Changer la roue de secours avec un cric',
    },
    textStressed:
      'Е́сли в пути́ спусти́ло колесо́, не ну́жно волнова́ться. Води́тель достаёт из бага́жника домкра́т, га́ечный ключ и запасно́е колесо́, а зате́м аккура́тно откру́чивает га́йки.',
    wrongWord: 'домкра́т',
    correctWord: 'телефо́н',
    fillWords: ['колесо́', 'домкра́т', 'га́йки'],
  },
  {
    slug: 'cars-road-signs-rules',
    level: 'A1',
    topic: 'cars_roads',
    title: {
      en: '39. Reading Road Signs and Lane Markings',
      ru: '39. Дорожные знаки и белая разметка',
      ar: '39. قراءة إشارات المرور وتخطيط الطريق',
      fr: '39. Lire les panneaux et le marquage routier',
    },
    textStressed:
      'На широ́ком шоссе́ води́тель внима́тельно смо́трит на доро́жный знак и бе́лую разме́тку. Знак пока́зывает ограниче́ние ско́рости и расстоя́ние в киломе́трах до Москвы́.',
    wrongWord: 'знак',
    correctWord: 'биле́т',
    fillWords: ['шоссе́', 'знак', 'ско́рости'],
  },
  {
    slug: 'cars-electric-autonomous-future',
    level: 'A2',
    topic: 'cars_roads',
    title: {
      en: '40. Future Electric and Smart Vehicles at MADI',
      ru: '40. Будущие электромобили и умные дороги',
      ar: '40. السيارات الكهربائية والطرق الذكية في مادي',
      fr: '40. Véhicules électriques et routes intelligentes à MADI',
    },
    textStressed:
      'В нау́чном це́нтре МАДИ́ молоды́е инжене́ры создаю́т у́мный автомоби́ль бу́дущего. Мо́щный аккумуля́тор, то́чная автоматиза́ция и чи́стая эне́ргия де́лают движе́ние по доро́гам безопа́сным.',
    wrongWord: 'аккумуля́тор',
    correctWord: 'глуши́тель',
    fillWords: ['инжене́ры', 'аккумуля́тор', 'движе́ние'],
  },
];

export const TYPING_TEXTS: TypingParagraphSeed[] = RAW_TYPING_PARAGRAPHS.map((item, idx) => {
  const clean = stripStressMarks(item.textStressed);
  const cleanWrong = stripStressMarks(item.wrongWord);
  const cleanCorrect = stripStressMarks(item.correctWord);
  const wordsArr = clean.split(/\s+/);
  let targetWordIdx = wordsArr.findIndex((w) =>
    w.toLowerCase().replace(/[.,!?;:«»]/g, '') === cleanWrong.toLowerCase()
  );
  if (targetWordIdx === -1) targetWordIdx = 2;

  // Build corrupted text by swapping cleanWrong with cleanCorrect (so user spots the semantic mismatch and restores cleanWrong)
  const corruptedWords = [...wordsArr];
  const origToken = corruptedWords[targetWordIdx] || '';
  const punctMatch = origToken.match(/[.,!?;:«»]+$/);
  const suffix = punctMatch ? punctMatch[0] : '';
  corruptedWords[targetWordIdx] = `${cleanCorrect}${suffix}`;

  return {
    id: `tp_${String(idx + 1).padStart(2, '0')}`,
    slug: item.slug,
    level: item.level,
    topic: item.topic,
    title: item.title,
    textStressed: item.textStressed,
    textClean: clean,
    errorSpotting: {
      corruptedText: corruptedWords.join(' '),
      mistakes: [
        {
          wrongWord: cleanCorrect,
          correctWord: cleanWrong,
          wordIndex: targetWordIdx,
        },
      ],
    },
    fillInBlankWords: item.fillWords.map((w) => stripStressMarks(w)),
    audioSlug: `typing-${item.slug}`,
  };
});

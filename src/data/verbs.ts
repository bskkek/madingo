// AUTO-GENERATED from ~/workspace/madingo/verbs/verbs-data.json — do not edit by hand.
// Regenerate: node ~/workspace/madingo/verbs/verbs-to-ts.mjs
// 225 verbs in 9 categories.

export interface VerbEntry {
  id: string;
  ru: string;
  ar: string;
  en: string;
  fr: string;
  ruDef: string;
  scene: string;
  variant: number;
}

export interface VerbCategory {
  id: string;
  ar: string;
  ru: string;
  verbs: VerbEntry[];
}

export const VERB_CATEGORIES: VerbCategory[] = [
  {
    "id": "movement",
    "ar": "أفعال الحركة",
    "ru": "Движение",
    "verbs": [
      {
        "id": "v001",
        "ru": "идти",
        "ar": "يمشي",
        "scene": "walk",
        "variant": 0,
        "fr": "aller à pied (une fois)",
        "en": "to go on foot (once)",
        "ruDef": "двигаться пешком"
      },
      {
        "id": "v002",
        "ru": "ходить",
        "ar": "يتجول",
        "scene": "walk",
        "variant": 1,
        "fr": "aller à pied (souvent)",
        "en": "to go on foot (regularly)",
        "ruDef": "передвигаться пешком часто"
      },
      {
        "id": "v003",
        "ru": "бежать",
        "ar": "يجري",
        "scene": "run",
        "variant": 2,
        "fr": "courir (une fois)",
        "en": "to run (once)",
        "ruDef": "мчаться вперёд"
      },
      {
        "id": "v004",
        "ru": "бегать",
        "ar": "يركض",
        "scene": "run",
        "variant": 0,
        "fr": "courir (souvent)",
        "en": "to run (regularly)",
        "ruDef": "двигаться бегом часто"
      },
      {
        "id": "v005",
        "ru": "ехать",
        "ar": "يذهب بالمواصلات",
        "scene": "drive",
        "variant": 1,
        "fr": "aller en transport (une fois)",
        "en": "to go by transport (once)",
        "ruDef": "двигаться на транспорте"
      },
      {
        "id": "v006",
        "ru": "ездить",
        "ar": "يتنقل",
        "scene": "travel",
        "variant": 2,
        "fr": "aller en transport (souvent)",
        "en": "to go by transport (regularly)",
        "ruDef": "передвигаться на транспорте часто"
      },
      {
        "id": "v007",
        "ru": "летать",
        "ar": "يطير",
        "scene": "fly",
        "variant": 0,
        "fr": "voler (souvent)",
        "en": "to fly (regularly)",
        "ruDef": "передвигаться по воздуху часто"
      },
      {
        "id": "v008",
        "ru": "лететь",
        "ar": "يسافر جوا",
        "scene": "fly",
        "variant": 1,
        "fr": "voler (une fois)",
        "en": "to fly (once)",
        "ruDef": "двигаться по воздуху прямо"
      },
      {
        "id": "v009",
        "ru": "плавать",
        "ar": "يسبح",
        "scene": "swim",
        "variant": 2,
        "fr": "nager (souvent)",
        "en": "to swim (regularly)",
        "ruDef": "передвигаться в воде часто"
      },
      {
        "id": "v010",
        "ru": "плыть",
        "ar": "يعوم",
        "scene": "swim",
        "variant": 0,
        "fr": "nager (une fois)",
        "en": "to swim (once)",
        "ruDef": "двигаться в воде"
      },
      {
        "id": "v011",
        "ru": "прыгать",
        "ar": "يقفز",
        "scene": "jump",
        "variant": 1,
        "fr": "sauter",
        "en": "to jump",
        "ruDef": "делать прыжки"
      },
      {
        "id": "v012",
        "ru": "толкать",
        "ar": "يدفع",
        "scene": "push",
        "variant": 2,
        "fr": "pousser",
        "en": "to push",
        "ruDef": "сдвигать силой"
      },
      {
        "id": "v013",
        "ru": "тянуть",
        "ar": "يسحب",
        "scene": "push",
        "variant": 0,
        "fr": "tirer",
        "en": "to pull",
        "ruDef": "тащить к себе"
      },
      {
        "id": "v014",
        "ru": "нести",
        "ar": "يحمل",
        "scene": "carry",
        "variant": 1,
        "fr": "porter (une fois)",
        "en": "to carry (once)",
        "ruDef": "переносить груз"
      },
      {
        "id": "v015",
        "ru": "носить",
        "ar": "ينقل",
        "scene": "carry",
        "variant": 2,
        "fr": "porter (souvent)",
        "en": "to carry (regularly)",
        "ruDef": "переносить груз часто"
      },
      {
        "id": "v016",
        "ru": "падать",
        "ar": "يسقط",
        "scene": "fall",
        "variant": 0,
        "fr": "tomber",
        "en": "to fall",
        "ruDef": "опускаться вниз"
      },
      {
        "id": "v017",
        "ru": "вставать",
        "ar": "ينهض",
        "scene": "stand",
        "variant": 1,
        "fr": "se lever",
        "en": "to get up",
        "ruDef": "подниматься на ноги"
      },
      {
        "id": "v018",
        "ru": "садиться",
        "ar": "يجلس",
        "scene": "sit",
        "variant": 2,
        "fr": "s'asseoir",
        "en": "to sit down",
        "ruDef": "опускаться на сиденье"
      },
      {
        "id": "v019",
        "ru": "стоять",
        "ar": "يقف",
        "scene": "stand",
        "variant": 0,
        "fr": "se tenir debout",
        "en": "to stand",
        "ruDef": "находиться стоя"
      },
      {
        "id": "v020",
        "ru": "сидеть",
        "ar": "يكون جالسا",
        "scene": "sit",
        "variant": 1,
        "fr": "être assis",
        "en": "to be sitting",
        "ruDef": "находиться сидя"
      },
      {
        "id": "v021",
        "ru": "ложиться",
        "ar": "يستلقي",
        "scene": "rest",
        "variant": 2,
        "fr": "s'allonger",
        "en": "to lie down",
        "ruDef": "принимать лежачее положение"
      },
      {
        "id": "v022",
        "ru": "подниматься",
        "ar": "يصعد",
        "scene": "walk",
        "variant": 0,
        "fr": "monter",
        "en": "to go up",
        "ruDef": "двигаться вверх"
      },
      {
        "id": "v023",
        "ru": "спускаться",
        "ar": "ينزل",
        "scene": "walk",
        "variant": 1,
        "fr": "descendre",
        "en": "to go down",
        "ruDef": "двигаться вниз"
      },
      {
        "id": "v024",
        "ru": "поворачивать",
        "ar": "يستدير",
        "scene": "stand",
        "variant": 2,
        "fr": "tourner",
        "en": "to turn",
        "ruDef": "менять направление"
      },
      {
        "id": "v025",
        "ru": "возвращаться",
        "ar": "يعود",
        "scene": "travel",
        "variant": 0,
        "fr": "revenir",
        "en": "to return",
        "ruDef": "приходить обратно"
      }
    ]
  },
  {
    "id": "daily",
    "ar": "الحياة اليومية",
    "ru": "Повседневная жизнь",
    "verbs": [
      {
        "id": "v026",
        "ru": "просыпаться",
        "ar": "يستيقظ",
        "scene": "sleep",
        "variant": 1,
        "fr": "se réveiller",
        "en": "to wake up",
        "ruDef": "выходить из сна"
      },
      {
        "id": "v027",
        "ru": "умываться",
        "ar": "يغسل وجهه",
        "scene": "wash",
        "variant": 2,
        "fr": "se laver le visage",
        "en": "to wash one's face",
        "ruDef": "мыть лицо"
      },
      {
        "id": "v028",
        "ru": "чистить",
        "ar": "ينظف",
        "scene": "clean",
        "variant": 0,
        "fr": "nettoyer",
        "en": "to clean",
        "ruDef": "делать чистым"
      },
      {
        "id": "v029",
        "ru": "одеваться",
        "ar": "يرتدي ملابسه",
        "scene": "dress",
        "variant": 1,
        "fr": "s'habiller",
        "en": "to get dressed",
        "ruDef": "надевать одежду"
      },
      {
        "id": "v030",
        "ru": "раздеваться",
        "ar": "يخلع ملابسه",
        "scene": "dress",
        "variant": 2,
        "fr": "se déshabiller",
        "en": "to get undressed",
        "ruDef": "снимать одежду"
      },
      {
        "id": "v031",
        "ru": "завтракать",
        "ar": "يفطر",
        "scene": "eat",
        "variant": 0,
        "fr": "prendre le petit-déjeuner",
        "en": "to have breakfast",
        "ruDef": "есть утром"
      },
      {
        "id": "v032",
        "ru": "обедать",
        "ar": "يتغدى",
        "scene": "eat",
        "variant": 1,
        "fr": "déjeuner",
        "en": "to have lunch",
        "ruDef": "есть днём"
      },
      {
        "id": "v033",
        "ru": "ужинать",
        "ar": "يتعشى",
        "scene": "eat",
        "variant": 2,
        "fr": "dîner",
        "en": "to have dinner",
        "ruDef": "есть вечером"
      },
      {
        "id": "v034",
        "ru": "гулять",
        "ar": "يتنزه",
        "scene": "walk",
        "variant": 0,
        "fr": "se promener",
        "en": "to go for a walk",
        "ruDef": "ходить на прогулке"
      },
      {
        "id": "v035",
        "ru": "спать",
        "ar": "ينام",
        "scene": "sleep",
        "variant": 1,
        "fr": "dormir",
        "en": "to sleep",
        "ruDef": "находиться во сне"
      },
      {
        "id": "v036",
        "ru": "мыться",
        "ar": "يغتسل",
        "scene": "wash",
        "variant": 2,
        "fr": "se laver",
        "en": "to wash oneself",
        "ruDef": "мыть тело"
      },
      {
        "id": "v037",
        "ru": "бриться",
        "ar": "يحلق",
        "scene": "wash",
        "variant": 0,
        "fr": "se raser",
        "en": "to shave",
        "ruDef": "сбривать бороду"
      },
      {
        "id": "v038",
        "ru": "расчёсываться",
        "ar": "يمشط شعره",
        "scene": "dress",
        "variant": 1,
        "fr": "se peigner",
        "en": "to comb one's hair",
        "ruDef": "причёсывать волосы"
      },
      {
        "id": "v039",
        "ru": "смотреть",
        "ar": "يشاهد",
        "scene": "look",
        "variant": 2,
        "fr": "regarder",
        "en": "to watch",
        "ruDef": "направлять взгляд"
      },
      {
        "id": "v040",
        "ru": "слушать",
        "ar": "يستمع",
        "scene": "listen",
        "variant": 0,
        "fr": "écouter",
        "en": "to listen",
        "ruDef": "воспринимать слухом"
      },
      {
        "id": "v041",
        "ru": "покупать",
        "ar": "يشتري",
        "scene": "buy",
        "variant": 1,
        "fr": "acheter",
        "en": "to buy",
        "ruDef": "приобретать за деньги"
      },
      {
        "id": "v042",
        "ru": "платить",
        "ar": "يدفع المال",
        "scene": "buy",
        "variant": 2,
        "fr": "payer",
        "en": "to pay",
        "ruDef": "отдавать деньги"
      },
      {
        "id": "v043",
        "ru": "продавать",
        "ar": "يبيع",
        "scene": "buy",
        "variant": 0,
        "fr": "vendre",
        "en": "to sell",
        "ruDef": "отдавать за деньги"
      },
      {
        "id": "v044",
        "ru": "играть",
        "ar": "يلعب",
        "scene": "play",
        "variant": 1,
        "fr": "jouer",
        "en": "to play",
        "ruDef": "развлекаться игрой"
      },
      {
        "id": "v045",
        "ru": "заниматься",
        "ar": "يمارس",
        "scene": "work",
        "variant": 2,
        "fr": "pratiquer",
        "en": "to practise",
        "ruDef": "делать регулярно"
      },
      {
        "id": "v046",
        "ru": "встречаться",
        "ar": "يلتقي",
        "scene": "meet",
        "variant": 0,
        "fr": "se rencontrer",
        "en": "to meet",
        "ruDef": "видеться с кем-то"
      },
      {
        "id": "v047",
        "ru": "надевать",
        "ar": "يلبس",
        "scene": "dress",
        "variant": 1,
        "fr": "mettre",
        "en": "to put on",
        "ruDef": "натягивать одежду"
      },
      {
        "id": "v048",
        "ru": "снимать",
        "ar": "يخلع",
        "scene": "dress",
        "variant": 2,
        "fr": "enlever",
        "en": "to take off",
        "ruDef": "убирать с себя"
      },
      {
        "id": "v049",
        "ru": "завязывать",
        "ar": "يربط",
        "scene": "work",
        "variant": 0,
        "fr": "nouer",
        "en": "to tie",
        "ruDef": "делать узел"
      },
      {
        "id": "v050",
        "ru": "засыпать",
        "ar": "يغفو",
        "scene": "sleep",
        "variant": 1,
        "fr": "s'endormir",
        "en": "to fall asleep",
        "ruDef": "погружаться в сон"
      }
    ]
  },
  {
    "id": "speech",
    "ar": "الكلام والتواصل",
    "ru": "Общение",
    "verbs": [
      {
        "id": "v051",
        "ru": "говорить",
        "ar": "يتكلم",
        "scene": "talk",
        "variant": 2,
        "fr": "parler",
        "en": "to speak",
        "ruDef": "произносить слова"
      },
      {
        "id": "v052",
        "ru": "разговаривать",
        "ar": "يتحدث",
        "scene": "talk",
        "variant": 0,
        "fr": "converser",
        "en": "to talk",
        "ruDef": "вести беседу"
      },
      {
        "id": "v053",
        "ru": "рассказывать",
        "ar": "يحكي",
        "scene": "talk",
        "variant": 1,
        "fr": "raconter",
        "en": "to tell",
        "ruDef": "излагать историю"
      },
      {
        "id": "v054",
        "ru": "спрашивать",
        "ar": "يسأل",
        "scene": "ask",
        "variant": 2,
        "fr": "demander",
        "en": "to ask",
        "ruDef": "задавать вопрос"
      },
      {
        "id": "v055",
        "ru": "отвечать",
        "ar": "يجيب",
        "scene": "answer",
        "variant": 0,
        "fr": "répondre",
        "en": "to answer",
        "ruDef": "давать ответ"
      },
      {
        "id": "v056",
        "ru": "кричать",
        "ar": "يصرخ",
        "scene": "shout",
        "variant": 1,
        "fr": "crier",
        "en": "to shout",
        "ruDef": "громко говорить"
      },
      {
        "id": "v057",
        "ru": "шептать",
        "ar": "يهمس",
        "scene": "talk",
        "variant": 2,
        "fr": "chuchoter",
        "en": "to whisper",
        "ruDef": "говорить тихо"
      },
      {
        "id": "v058",
        "ru": "молчать",
        "ar": "يصمت",
        "scene": "stand",
        "variant": 0,
        "fr": "se taire",
        "en": "to be silent",
        "ruDef": "ничего не говорить"
      },
      {
        "id": "v059",
        "ru": "объяснять",
        "ar": "يشرح",
        "scene": "talk",
        "variant": 1,
        "fr": "expliquer",
        "en": "to explain",
        "ruDef": "делать понятным"
      },
      {
        "id": "v060",
        "ru": "обсуждать",
        "ar": "يناقش",
        "scene": "talk",
        "variant": 2,
        "fr": "discuter",
        "en": "to discuss",
        "ruDef": "вести обсуждение"
      },
      {
        "id": "v061",
        "ru": "спорить",
        "ar": "يجادل",
        "scene": "shout",
        "variant": 0,
        "fr": "argumenter",
        "en": "to argue",
        "ruDef": "отстаивать своё мнение"
      },
      {
        "id": "v062",
        "ru": "обещать",
        "ar": "يعد",
        "scene": "give",
        "variant": 1,
        "fr": "promettre",
        "en": "to promise",
        "ruDef": "давать обещание"
      },
      {
        "id": "v063",
        "ru": "благодарить",
        "ar": "يشكر",
        "scene": "smile",
        "variant": 2,
        "fr": "remercier",
        "en": "to thank",
        "ruDef": "выражать благодарность"
      },
      {
        "id": "v064",
        "ru": "извиняться",
        "ar": "يعتذر",
        "scene": "stand",
        "variant": 0,
        "fr": "s'excuser",
        "en": "to apologize",
        "ruDef": "просить прощения"
      },
      {
        "id": "v065",
        "ru": "здороваться",
        "ar": "يحيي",
        "scene": "meet",
        "variant": 1,
        "fr": "saluer",
        "en": "to greet",
        "ruDef": "приветствовать при встрече"
      },
      {
        "id": "v066",
        "ru": "прощаться",
        "ar": "يودع",
        "scene": "meet",
        "variant": 2,
        "fr": "dire au revoir",
        "en": "to say goodbye",
        "ruDef": "говорить до свидания"
      },
      {
        "id": "v067",
        "ru": "называть",
        "ar": "يسمي",
        "scene": "call",
        "variant": 0,
        "fr": "nommer",
        "en": "to name",
        "ruDef": "давать имя"
      },
      {
        "id": "v068",
        "ru": "звонить",
        "ar": "يتصل",
        "scene": "phone",
        "variant": 1,
        "fr": "appeler",
        "en": "to call",
        "ruDef": "делать телефонный звонок"
      },
      {
        "id": "v069",
        "ru": "слышать",
        "ar": "يسمع",
        "scene": "hear",
        "variant": 2,
        "fr": "entendre",
        "en": "to hear",
        "ruDef": "воспринимать слухом"
      },
      {
        "id": "v070",
        "ru": "понимать",
        "ar": "يفهم",
        "scene": "think",
        "variant": 0,
        "fr": "comprendre",
        "en": "to understand",
        "ruDef": "улавливать смысл"
      },
      {
        "id": "v071",
        "ru": "переводить",
        "ar": "يترجم",
        "scene": "read",
        "variant": 1,
        "fr": "traduire",
        "en": "to translate",
        "ruDef": "передавать на другом языке"
      },
      {
        "id": "v072",
        "ru": "повторять",
        "ar": "يكرر",
        "scene": "learn",
        "variant": 2,
        "fr": "répéter",
        "en": "to repeat",
        "ruDef": "говорить ещё раз"
      },
      {
        "id": "v073",
        "ru": "смеяться",
        "ar": "يضحك",
        "scene": "laugh",
        "variant": 0,
        "fr": "rire",
        "en": "to laugh",
        "ruDef": "издавать смех"
      },
      {
        "id": "v074",
        "ru": "договариваться",
        "ar": "يتفق",
        "scene": "meet",
        "variant": 1,
        "fr": "se mettre d'accord",
        "en": "to agree",
        "ruDef": "приходить к согласию"
      },
      {
        "id": "v075",
        "ru": "жаловаться",
        "ar": "يشتكي",
        "scene": "cry",
        "variant": 2,
        "fr": "se plaindre",
        "en": "to complain",
        "ruDef": "выражать недовольство"
      }
    ]
  },
  {
    "id": "study",
    "ar": "العمل والدراسة",
    "ru": "Учёба и работа",
    "verbs": [
      {
        "id": "v076",
        "ru": "учиться",
        "ar": "يدرس",
        "scene": "study",
        "variant": 0,
        "fr": "étudier",
        "en": "to study",
        "ruDef": "получать знания"
      },
      {
        "id": "v077",
        "ru": "учить",
        "ar": "يتعلم",
        "scene": "learn",
        "variant": 1,
        "fr": "apprendre",
        "en": "to learn",
        "ruDef": "усваивать знания"
      },
      {
        "id": "v078",
        "ru": "читать",
        "ar": "يقرأ",
        "scene": "read",
        "variant": 2,
        "fr": "lire",
        "en": "to read",
        "ruDef": "воспринимать текст"
      },
      {
        "id": "v079",
        "ru": "писать",
        "ar": "يكتب",
        "scene": "write",
        "variant": 0,
        "fr": "écrire",
        "en": "to write",
        "ruDef": "создавать текст"
      },
      {
        "id": "v080",
        "ru": "считать",
        "ar": "يحسب",
        "scene": "think",
        "variant": 1,
        "fr": "calculer",
        "en": "to calculate",
        "ruDef": "производить вычисления"
      },
      {
        "id": "v081",
        "ru": "решать",
        "ar": "يحل",
        "scene": "think",
        "variant": 2,
        "fr": "résoudre",
        "en": "to solve",
        "ruDef": "находить решение"
      },
      {
        "id": "v082",
        "ru": "запоминать",
        "ar": "يحفظ",
        "scene": "remember",
        "variant": 0,
        "fr": "mémoriser",
        "en": "to memorize",
        "ruDef": "удерживать в памяти"
      },
      {
        "id": "v083",
        "ru": "вспоминать",
        "ar": "يتذكر",
        "scene": "remember",
        "variant": 1,
        "fr": "se souvenir",
        "en": "to recall",
        "ruDef": "вызывать в памяти"
      },
      {
        "id": "v084",
        "ru": "забывать",
        "ar": "ينسى",
        "scene": "think",
        "variant": 2,
        "fr": "oublier",
        "en": "to forget",
        "ruDef": "терять из памяти"
      },
      {
        "id": "v085",
        "ru": "знать",
        "ar": "يعرف",
        "scene": "think",
        "variant": 0,
        "fr": "savoir",
        "en": "to know",
        "ruDef": "обладать знаниями"
      },
      {
        "id": "v086",
        "ru": "изучать",
        "ar": "يدرس بعمق",
        "scene": "learn",
        "variant": 1,
        "fr": "approfondir",
        "en": "to study in depth",
        "ruDef": "углублённо познавать"
      },
      {
        "id": "v087",
        "ru": "преподавать",
        "ar": "يعلم",
        "scene": "work",
        "variant": 2,
        "fr": "enseigner",
        "en": "to teach",
        "ruDef": "передавать знания"
      },
      {
        "id": "v088",
        "ru": "работать",
        "ar": "يعمل",
        "scene": "work",
        "variant": 0,
        "fr": "travailler",
        "en": "to work",
        "ruDef": "выполнять работу"
      },
      {
        "id": "v089",
        "ru": "помогать",
        "ar": "يساعد",
        "scene": "help",
        "variant": 1,
        "fr": "aider",
        "en": "to help",
        "ruDef": "оказывать помощь"
      },
      {
        "id": "v090",
        "ru": "проверять",
        "ar": "يفحص",
        "scene": "look",
        "variant": 2,
        "fr": "vérifier",
        "en": "to check",
        "ruDef": "контролировать правильность"
      },
      {
        "id": "v091",
        "ru": "исправлять",
        "ar": "يصحح",
        "scene": "write",
        "variant": 0,
        "fr": "corriger",
        "en": "to correct",
        "ruDef": "устранять ошибки"
      },
      {
        "id": "v092",
        "ru": "сдавать",
        "ar": "يجتاز الامتحان",
        "scene": "study",
        "variant": 1,
        "fr": "passer un examen",
        "en": "to pass an exam",
        "ruDef": "проходить экзамен"
      },
      {
        "id": "v093",
        "ru": "готовиться",
        "ar": "يستعد",
        "scene": "study",
        "variant": 2,
        "fr": "se préparer",
        "en": "to prepare",
        "ruDef": "подготавливаться к делу"
      },
      {
        "id": "v094",
        "ru": "начинать",
        "ar": "يبدأ",
        "scene": "start",
        "variant": 0,
        "fr": "commencer",
        "en": "to begin",
        "ruDef": "приступать к делу"
      },
      {
        "id": "v095",
        "ru": "заканчивать",
        "ar": "ينهي",
        "scene": "work",
        "variant": 1,
        "fr": "terminer",
        "en": "to finish",
        "ruDef": "доводить до конца"
      },
      {
        "id": "v096",
        "ru": "рисовать",
        "ar": "يرسم",
        "scene": "draw",
        "variant": 2,
        "fr": "dessiner",
        "en": "to draw",
        "ruDef": "создавать изображение"
      },
      {
        "id": "v097",
        "ru": "чертить",
        "ar": "يرسم مخططا",
        "scene": "draw",
        "variant": 0,
        "fr": "dessiner un plan",
        "en": "to draft",
        "ruDef": "создавать чертёж"
      },
      {
        "id": "v098",
        "ru": "искать",
        "ar": "يبحث",
        "scene": "find",
        "variant": 1,
        "fr": "chercher",
        "en": "to look for",
        "ruDef": "разыскивать нужное"
      },
      {
        "id": "v099",
        "ru": "находить",
        "ar": "يجد",
        "scene": "find",
        "variant": 2,
        "fr": "trouver",
        "en": "to find",
        "ruDef": "обнаруживать искомое"
      },
      {
        "id": "v100",
        "ru": "думать",
        "ar": "يفكر",
        "scene": "think",
        "variant": 0,
        "fr": "penser",
        "en": "to think",
        "ruDef": "мыслить, размышлять"
      }
    ]
  },
  {
    "id": "feelings",
    "ar": "المشاعر",
    "ru": "Чувства",
    "verbs": [
      {
        "id": "v101",
        "ru": "любить",
        "ar": "يحب",
        "scene": "love",
        "variant": 1,
        "fr": "aimer",
        "en": "to love",
        "ruDef": "испытывать любовь"
      },
      {
        "id": "v102",
        "ru": "нравиться",
        "ar": "يعجب",
        "scene": "love",
        "variant": 2,
        "fr": "plaire",
        "en": "to be liked",
        "ruDef": "вызывать симпатию"
      },
      {
        "id": "v103",
        "ru": "ненавидеть",
        "ar": "يكره",
        "scene": "love",
        "variant": 0,
        "fr": "haïr",
        "en": "to hate",
        "ruDef": "испытывать ненависть"
      },
      {
        "id": "v104",
        "ru": "радоваться",
        "ar": "يفرح",
        "scene": "laugh",
        "variant": 1,
        "fr": "se réjouir",
        "en": "to rejoice",
        "ruDef": "испытывать радость"
      },
      {
        "id": "v105",
        "ru": "грустить",
        "ar": "يحزن",
        "scene": "cry",
        "variant": 2,
        "fr": "être triste",
        "en": "to be sad",
        "ruDef": "испытывать грусть"
      },
      {
        "id": "v106",
        "ru": "плакать",
        "ar": "يبكي",
        "scene": "cry",
        "variant": 0,
        "fr": "pleurer",
        "en": "to cry",
        "ruDef": "лить слёзы"
      },
      {
        "id": "v107",
        "ru": "бояться",
        "ar": "يخاف",
        "scene": "cry",
        "variant": 1,
        "fr": "avoir peur",
        "en": "to be afraid",
        "ruDef": "испытывать страх"
      },
      {
        "id": "v108",
        "ru": "волноваться",
        "ar": "يقلق",
        "scene": "think",
        "variant": 2,
        "fr": "s'inquiéter",
        "en": "to worry",
        "ruDef": "испытывать тревогу"
      },
      {
        "id": "v109",
        "ru": "успокаиваться",
        "ar": "يهدأ",
        "scene": "rest",
        "variant": 0,
        "fr": "se calmer",
        "en": "to calm down",
        "ruDef": "становиться спокойным"
      },
      {
        "id": "v110",
        "ru": "надеяться",
        "ar": "يأمل",
        "scene": "want",
        "variant": 1,
        "fr": "espérer",
        "en": "to hope",
        "ruDef": "верить в лучшее"
      },
      {
        "id": "v111",
        "ru": "хотеть",
        "ar": "يريد",
        "scene": "want",
        "variant": 2,
        "fr": "vouloir",
        "en": "to want",
        "ruDef": "иметь желание"
      },
      {
        "id": "v112",
        "ru": "мечтать",
        "ar": "يحلم",
        "scene": "think",
        "variant": 0,
        "fr": "rêver",
        "en": "to dream",
        "ruDef": "представлять желаемое"
      },
      {
        "id": "v113",
        "ru": "верить",
        "ar": "يؤمن",
        "scene": "think",
        "variant": 1,
        "fr": "croire",
        "en": "to believe",
        "ruDef": "быть уверенным"
      },
      {
        "id": "v114",
        "ru": "удивляться",
        "ar": "يتعجب",
        "scene": "look",
        "variant": 2,
        "fr": "s'étonner",
        "en": "to be surprised",
        "ruDef": "испытывать удивление"
      },
      {
        "id": "v115",
        "ru": "улыбаться",
        "ar": "يبتسم",
        "scene": "smile",
        "variant": 0,
        "fr": "sourire",
        "en": "to smile",
        "ruDef": "выражать радость улыбкой"
      },
      {
        "id": "v116",
        "ru": "скучать",
        "ar": "يشتاق",
        "scene": "cry",
        "variant": 1,
        "fr": "se languir de",
        "en": "to miss someone",
        "ruDef": "тосковать по кому-то"
      },
      {
        "id": "v117",
        "ru": "гордиться",
        "ar": "يفتخر",
        "scene": "stand",
        "variant": 2,
        "fr": "être fier",
        "en": "to be proud",
        "ruDef": "испытывать гордость"
      },
      {
        "id": "v118",
        "ru": "злиться",
        "ar": "يغضب",
        "scene": "shout",
        "variant": 0,
        "fr": "se fâcher",
        "en": "to be angry",
        "ruDef": "испытывать злость"
      },
      {
        "id": "v119",
        "ru": "уставать",
        "ar": "يتعب",
        "scene": "rest",
        "variant": 1,
        "fr": "se fatiguer",
        "en": "to get tired",
        "ruDef": "терять силы"
      },
      {
        "id": "v120",
        "ru": "чувствовать",
        "ar": "يشعر",
        "scene": "think",
        "variant": 2,
        "fr": "sentir",
        "en": "to feel",
        "ruDef": "воспринимать ощущения"
      },
      {
        "id": "v121",
        "ru": "прощать",
        "ar": "يسامح",
        "scene": "love",
        "variant": 0,
        "fr": "pardonner",
        "en": "to forgive",
        "ruDef": "отпускать обиду"
      },
      {
        "id": "v122",
        "ru": "обнимать",
        "ar": "يعانق",
        "scene": "love",
        "variant": 1,
        "fr": "prendre dans ses bras",
        "en": "to hug",
        "ruDef": "прижимать к себе"
      },
      {
        "id": "v123",
        "ru": "дружить",
        "ar": "يصادق",
        "scene": "meet",
        "variant": 2,
        "fr": "être ami",
        "en": "to be friends",
        "ruDef": "поддерживать дружбу"
      },
      {
        "id": "v124",
        "ru": "влюбляться",
        "ar": "يقع في الحب",
        "scene": "love",
        "variant": 0,
        "fr": "tomber amoureux",
        "en": "to fall in love",
        "ruDef": "испытывать влюблённость"
      },
      {
        "id": "v125",
        "ru": "целовать",
        "ar": "يقبل",
        "scene": "love",
        "variant": 1,
        "fr": "embrasser",
        "en": "to kiss",
        "ruDef": "касаться губами"
      }
    ]
  },
  {
    "id": "body",
    "ar": "أفعال جسدية",
    "ru": "Действия тела",
    "verbs": [
      {
        "id": "v126",
        "ru": "пинать",
        "ar": "يركل",
        "scene": "kick",
        "variant": 2,
        "fr": "frapper du pied",
        "en": "to kick",
        "ruDef": "бить ногой"
      },
      {
        "id": "v127",
        "ru": "бить",
        "ar": "يضرب",
        "scene": "kick",
        "variant": 0,
        "fr": "frapper",
        "en": "to hit",
        "ruDef": "наносить удары"
      },
      {
        "id": "v128",
        "ru": "ловить",
        "ar": "يلتقط",
        "scene": "catch",
        "variant": 1,
        "fr": "attraper",
        "en": "to catch",
        "ruDef": "поймать в руки"
      },
      {
        "id": "v129",
        "ru": "бросать",
        "ar": "يرمي",
        "scene": "throw",
        "variant": 2,
        "fr": "jeter",
        "en": "to throw",
        "ruDef": "кидать предмет"
      },
      {
        "id": "v130",
        "ru": "держать",
        "ar": "يمسك",
        "scene": "carry",
        "variant": 0,
        "fr": "tenir",
        "en": "to hold",
        "ruDef": "не отпускать"
      },
      {
        "id": "v131",
        "ru": "брать",
        "ar": "يأخذ",
        "scene": "carry",
        "variant": 1,
        "fr": "prendre",
        "en": "to take",
        "ruDef": "взять в руки"
      },
      {
        "id": "v132",
        "ru": "давать",
        "ar": "يعطي",
        "scene": "give",
        "variant": 2,
        "fr": "donner",
        "en": "to give",
        "ruDef": "передавать другому"
      },
      {
        "id": "v133",
        "ru": "поднимать",
        "ar": "يرفع",
        "scene": "carry",
        "variant": 0,
        "fr": "soulever",
        "en": "to lift",
        "ruDef": "перемещать вверх"
      },
      {
        "id": "v134",
        "ru": "опускать",
        "ar": "يخفض",
        "scene": "carry",
        "variant": 1,
        "fr": "baisser",
        "en": "to lower",
        "ruDef": "перемещать вниз"
      },
      {
        "id": "v135",
        "ru": "танцевать",
        "ar": "يرقص",
        "scene": "dance",
        "variant": 2,
        "fr": "danser",
        "en": "to dance",
        "ruDef": "двигаться под музыку"
      },
      {
        "id": "v136",
        "ru": "петь",
        "ar": "يغني",
        "scene": "sing",
        "variant": 0,
        "fr": "chanter",
        "en": "to sing",
        "ruDef": "издавать мелодию голосом"
      },
      {
        "id": "v137",
        "ru": "дышать",
        "ar": "يتنفس",
        "scene": "rest",
        "variant": 1,
        "fr": "respirer",
        "en": "to breathe",
        "ruDef": "вдыхать воздух"
      },
      {
        "id": "v138",
        "ru": "кашлять",
        "ar": "يسعل",
        "scene": "rest",
        "variant": 2,
        "fr": "tousser",
        "en": "to cough",
        "ruDef": "резко выдыхать воздух"
      },
      {
        "id": "v139",
        "ru": "чихать",
        "ar": "يعطس",
        "scene": "shout",
        "variant": 0,
        "fr": "éternuer",
        "en": "to sneeze",
        "ruDef": "резко выдыхать носом"
      },
      {
        "id": "v140",
        "ru": "курить",
        "ar": "يدخن",
        "scene": "rest",
        "variant": 1,
        "fr": "fumer",
        "en": "to smoke",
        "ruDef": "вдыхать дым"
      },
      {
        "id": "v141",
        "ru": "хлопать",
        "ar": "يصفق",
        "scene": "play",
        "variant": 2,
        "fr": "applaudir",
        "en": "to clap",
        "ruDef": "ударять ладонями"
      },
      {
        "id": "v142",
        "ru": "махать",
        "ar": "يلوح",
        "scene": "play",
        "variant": 0,
        "fr": "agiter la main",
        "en": "to wave",
        "ruDef": "двигать рукой"
      },
      {
        "id": "v143",
        "ru": "кивать",
        "ar": "يومئ برأسه",
        "scene": "talk",
        "variant": 1,
        "fr": "hocher la tête",
        "en": "to nod",
        "ruDef": "двигать головой"
      },
      {
        "id": "v144",
        "ru": "моргать",
        "ar": "يرمش",
        "scene": "look",
        "variant": 2,
        "fr": "cligner des yeux",
        "en": "to blink",
        "ruDef": "закрывать глаза быстро"
      },
      {
        "id": "v145",
        "ru": "жевать",
        "ar": "يمضغ",
        "scene": "eat",
        "variant": 0,
        "fr": "mâcher",
        "en": "to chew",
        "ruDef": "перемалывать пищу зубами"
      },
      {
        "id": "v146",
        "ru": "глотать",
        "ar": "يبلع",
        "scene": "eat",
        "variant": 1,
        "fr": "avaler",
        "en": "to swallow",
        "ruDef": "пропускать пищу внутрь"
      },
      {
        "id": "v147",
        "ru": "ползать",
        "ar": "يزحف",
        "scene": "walk",
        "variant": 2,
        "fr": "ramper",
        "en": "to crawl",
        "ruDef": "двигаться на четвереньках"
      },
      {
        "id": "v148",
        "ru": "нырять",
        "ar": "يغوص",
        "scene": "swim",
        "variant": 0,
        "fr": "plonger",
        "en": "to dive",
        "ruDef": "погружаться под воду"
      },
      {
        "id": "v149",
        "ru": "шевелиться",
        "ar": "يتحرك",
        "scene": "stand",
        "variant": 1,
        "fr": "bouger",
        "en": "to move",
        "ruDef": "слегка двигаться"
      },
      {
        "id": "v150",
        "ru": "тренироваться",
        "ar": "يتدرب",
        "scene": "run",
        "variant": 2,
        "fr": "s'entraîner",
        "en": "to train",
        "ruDef": "заниматься спортом"
      }
    ]
  },
  {
    "id": "food",
    "ar": "الطعام",
    "ru": "Еда",
    "verbs": [
      {
        "id": "v151",
        "ru": "есть",
        "ar": "يأكل",
        "scene": "eat",
        "variant": 0,
        "fr": "manger",
        "en": "to eat",
        "ruDef": "принимать пищу"
      },
      {
        "id": "v152",
        "ru": "пить",
        "ar": "يشرب",
        "scene": "drink",
        "variant": 1,
        "fr": "boire",
        "en": "to drink",
        "ruDef": "принимать жидкость"
      },
      {
        "id": "v153",
        "ru": "готовить",
        "ar": "يطبخ",
        "scene": "cook",
        "variant": 2,
        "fr": "cuisiner",
        "en": "to cook",
        "ruDef": "приготавливать пищу"
      },
      {
        "id": "v154",
        "ru": "варить",
        "ar": "يسلق",
        "scene": "cook",
        "variant": 0,
        "fr": "bouillir",
        "en": "to boil",
        "ruDef": "готовить в воде"
      },
      {
        "id": "v155",
        "ru": "жарить",
        "ar": "يقلي",
        "scene": "cook",
        "variant": 1,
        "fr": "frire",
        "en": "to fry",
        "ruDef": "готовить на сковороде"
      },
      {
        "id": "v156",
        "ru": "печь",
        "ar": "يخبز",
        "scene": "cook",
        "variant": 2,
        "fr": "cuire au four",
        "en": "to bake",
        "ruDef": "готовить в духовке"
      },
      {
        "id": "v157",
        "ru": "резать",
        "ar": "يقطع",
        "scene": "cut",
        "variant": 0,
        "fr": "couper",
        "en": "to cut",
        "ruDef": "делить на части"
      },
      {
        "id": "v158",
        "ru": "пробовать",
        "ar": "يتذوق",
        "scene": "eat",
        "variant": 1,
        "fr": "goûter",
        "en": "to taste",
        "ruDef": "оценивать на вкус"
      },
      {
        "id": "v159",
        "ru": "кушать",
        "ar": "يتناول الطعام",
        "scene": "eat",
        "variant": 2,
        "fr": "manger",
        "en": "to eat",
        "ruDef": "принимать пищу вежливо"
      },
      {
        "id": "v160",
        "ru": "добавлять",
        "ar": "يضيف",
        "scene": "cook",
        "variant": 0,
        "fr": "ajouter",
        "en": "to add",
        "ruDef": "класть дополнительно"
      },
      {
        "id": "v161",
        "ru": "мешать",
        "ar": "يحرك",
        "scene": "cook",
        "variant": 1,
        "fr": "remuer",
        "en": "to stir",
        "ruDef": "помешивать ложкой"
      },
      {
        "id": "v162",
        "ru": "солить",
        "ar": "يملح",
        "scene": "cook",
        "variant": 2,
        "fr": "saler",
        "en": "to salt",
        "ruDef": "добавлять соль"
      },
      {
        "id": "v163",
        "ru": "заказывать",
        "ar": "يطلب",
        "scene": "buy",
        "variant": 0,
        "fr": "commander",
        "en": "to order",
        "ruDef": "делать заказ"
      },
      {
        "id": "v164",
        "ru": "подавать",
        "ar": "يقدم",
        "scene": "give",
        "variant": 1,
        "fr": "servir",
        "en": "to serve",
        "ruDef": "ставить на стол"
      },
      {
        "id": "v165",
        "ru": "наливать",
        "ar": "يصب",
        "scene": "drink",
        "variant": 2,
        "fr": "verser",
        "en": "to pour",
        "ruDef": "лить в посуду"
      },
      {
        "id": "v166",
        "ru": "нюхать",
        "ar": "يشم",
        "scene": "eat",
        "variant": 0,
        "fr": "renifler",
        "en": "to smell",
        "ruDef": "вдыхать запах"
      },
      {
        "id": "v167",
        "ru": "мыть",
        "ar": "يغسل",
        "scene": "wash",
        "variant": 1,
        "fr": "laver",
        "en": "to wash",
        "ruDef": "очищать водой"
      },
      {
        "id": "v168",
        "ru": "угощать",
        "ar": "يقدم الطعام",
        "scene": "give",
        "variant": 2,
        "fr": "offrir à manger",
        "en": "to offer food",
        "ruDef": "предлагать еду гостям"
      },
      {
        "id": "v169",
        "ru": "перекусывать",
        "ar": "يأكل وجبة خفيفة",
        "scene": "eat",
        "variant": 0,
        "fr": "grignoter",
        "en": "to snack",
        "ruDef": "есть на ходу"
      },
      {
        "id": "v170",
        "ru": "выбирать",
        "ar": "يختار",
        "scene": "look",
        "variant": 1,
        "fr": "choisir",
        "en": "to choose",
        "ruDef": "отдавать предпочтение"
      },
      {
        "id": "v171",
        "ru": "приносить",
        "ar": "يحضر",
        "scene": "give",
        "variant": 2,
        "fr": "apporter",
        "en": "to bring",
        "ruDef": "доставлять сюда"
      },
      {
        "id": "v172",
        "ru": "кипятить",
        "ar": "يغلي",
        "scene": "cook",
        "variant": 0,
        "fr": "faire bouillir",
        "en": "to bring to a boil",
        "ruDef": "доводить до кипения"
      },
      {
        "id": "v173",
        "ru": "разогревать",
        "ar": "يسخن",
        "scene": "cook",
        "variant": 1,
        "fr": "réchauffer",
        "en": "to reheat",
        "ruDef": "греть повторно"
      },
      {
        "id": "v174",
        "ru": "запекать",
        "ar": "يشوي",
        "scene": "cook",
        "variant": 2,
        "fr": "rôtir",
        "en": "to roast",
        "ruDef": "готовить до корочки"
      },
      {
        "id": "v175",
        "ru": "смешивать",
        "ar": "يخلط",
        "scene": "cook",
        "variant": 0,
        "fr": "mélanger",
        "en": "to mix",
        "ruDef": "соединять вместе"
      }
    ]
  },
  {
    "id": "home",
    "ar": "البيت",
    "ru": "Дом",
    "verbs": [
      {
        "id": "v176",
        "ru": "жить",
        "ar": "يعيش",
        "scene": "live",
        "variant": 1,
        "fr": "vivre",
        "en": "to live",
        "ruDef": "существовать, проживать"
      },
      {
        "id": "v177",
        "ru": "убирать",
        "ar": "ينظف البيت",
        "scene": "clean",
        "variant": 2,
        "fr": "faire le ménage",
        "en": "to clean up",
        "ruDef": "наводить порядок"
      },
      {
        "id": "v178",
        "ru": "стирать",
        "ar": "يغسل الملابس",
        "scene": "wash",
        "variant": 0,
        "fr": "faire la lessive",
        "en": "to do the laundry",
        "ruDef": "мыть одежду"
      },
      {
        "id": "v179",
        "ru": "гладить",
        "ar": "يكوي",
        "scene": "clean",
        "variant": 1,
        "fr": "repasser",
        "en": "to iron",
        "ruDef": "разглаживать утюгом"
      },
      {
        "id": "v180",
        "ru": "открывать",
        "ar": "يفتح",
        "scene": "open",
        "variant": 2,
        "fr": "ouvrir",
        "en": "to open",
        "ruDef": "делать открытым"
      },
      {
        "id": "v181",
        "ru": "закрывать",
        "ar": "يغلق",
        "scene": "open",
        "variant": 0,
        "fr": "fermer",
        "en": "to close",
        "ruDef": "делать закрытым"
      },
      {
        "id": "v182",
        "ru": "включать",
        "ar": "يشغل",
        "scene": "start",
        "variant": 1,
        "fr": "mettre en marche",
        "en": "to switch on",
        "ruDef": "запускать устройство"
      },
      {
        "id": "v183",
        "ru": "выключать",
        "ar": "يطفئ",
        "scene": "rest",
        "variant": 2,
        "fr": "éteindre",
        "en": "to switch off",
        "ruDef": "отключать питание"
      },
      {
        "id": "v184",
        "ru": "чинить",
        "ar": "يصلح",
        "scene": "build",
        "variant": 0,
        "fr": "réparer",
        "en": "to repair",
        "ruDef": "исправлять поломку"
      },
      {
        "id": "v185",
        "ru": "строить",
        "ar": "يبني",
        "scene": "build",
        "variant": 1,
        "fr": "construire",
        "en": "to build",
        "ruDef": "возводить здание"
      },
      {
        "id": "v186",
        "ru": "красить",
        "ar": "يدهن",
        "scene": "build",
        "variant": 2,
        "fr": "peindre",
        "en": "to paint",
        "ruDef": "наносить краску"
      },
      {
        "id": "v187",
        "ru": "вешать",
        "ar": "يعلق",
        "scene": "build",
        "variant": 0,
        "fr": "accrocher",
        "en": "to hang up",
        "ruDef": "подвешивать на крюк"
      },
      {
        "id": "v188",
        "ru": "ставить",
        "ar": "يضع واقفا",
        "scene": "build",
        "variant": 1,
        "fr": "mettre debout",
        "en": "to put upright",
        "ruDef": "помещать вертикально"
      },
      {
        "id": "v189",
        "ru": "класть",
        "ar": "يضع",
        "scene": "build",
        "variant": 2,
        "fr": "poser",
        "en": "to put down",
        "ruDef": "помещать горизонтально"
      },
      {
        "id": "v190",
        "ru": "сажать",
        "ar": "يزرع",
        "scene": "build",
        "variant": 0,
        "fr": "planter",
        "en": "to plant",
        "ruDef": "высаживать в землю"
      },
      {
        "id": "v191",
        "ru": "поливать",
        "ar": "يسقي",
        "scene": "wash",
        "variant": 1,
        "fr": "arroser",
        "en": "to water",
        "ruDef": "смачивать водой"
      },
      {
        "id": "v192",
        "ru": "подметать",
        "ar": "يكنس",
        "scene": "clean",
        "variant": 2,
        "fr": "balayer",
        "en": "to sweep",
        "ruDef": "мести веником"
      },
      {
        "id": "v193",
        "ru": "пылесосить",
        "ar": "ينظف بالمكنسة",
        "scene": "clean",
        "variant": 0,
        "fr": "passer l'aspirateur",
        "en": "to vacuum",
        "ruDef": "чистить пылесосом"
      },
      {
        "id": "v194",
        "ru": "отдыхать",
        "ar": "يستريح",
        "scene": "rest",
        "variant": 1,
        "fr": "se reposer",
        "en": "to rest",
        "ruDef": "восстанавливать силы"
      },
      {
        "id": "v195",
        "ru": "входить",
        "ar": "يدخل",
        "scene": "open",
        "variant": 2,
        "fr": "entrer",
        "en": "to enter",
        "ruDef": "заходить внутрь"
      },
      {
        "id": "v196",
        "ru": "выходить",
        "ar": "يخرج",
        "scene": "open",
        "variant": 0,
        "fr": "sortir",
        "en": "to go out",
        "ruDef": "покидать помещение"
      },
      {
        "id": "v197",
        "ru": "запирать",
        "ar": "يقفل",
        "scene": "open",
        "variant": 1,
        "fr": "verrouiller",
        "en": "to lock",
        "ruDef": "закрывать на замок"
      },
      {
        "id": "v198",
        "ru": "зажигать",
        "ar": "يشعل",
        "scene": "start",
        "variant": 2,
        "fr": "allumer",
        "en": "to light",
        "ruDef": "давать огонь"
      },
      {
        "id": "v199",
        "ru": "вытирать",
        "ar": "يمسح",
        "scene": "clean",
        "variant": 0,
        "fr": "essuyer",
        "en": "to wipe",
        "ruDef": "протирать тряпкой"
      },
      {
        "id": "v200",
        "ru": "переезжать",
        "ar": "ينتقل",
        "scene": "travel",
        "variant": 1,
        "fr": "déménager",
        "en": "to move house",
        "ruDef": "менять место жительства"
      }
    ]
  },
  {
    "id": "travel",
    "ar": "السفر والمواصلات",
    "ru": "Путешествия и транспорт",
    "verbs": [
      {
        "id": "v201",
        "ru": "путешествовать",
        "ar": "يسافر",
        "scene": "travel",
        "variant": 2,
        "fr": "voyager",
        "en": "to travel",
        "ruDef": "ездить по странам"
      },
      {
        "id": "v202",
        "ru": "приезжать",
        "ar": "يصل",
        "scene": "travel",
        "variant": 0,
        "fr": "arriver",
        "en": "to arrive",
        "ruDef": "прибывать на транспорте"
      },
      {
        "id": "v203",
        "ru": "уезжать",
        "ar": "يغادر",
        "scene": "travel",
        "variant": 1,
        "fr": "partir (en transport)",
        "en": "to leave by transport",
        "ruDef": "покидать место на транспорте"
      },
      {
        "id": "v204",
        "ru": "приходить",
        "ar": "يأتي",
        "scene": "walk",
        "variant": 2,
        "fr": "venir",
        "en": "to come",
        "ruDef": "прибывать пешком"
      },
      {
        "id": "v205",
        "ru": "уходить",
        "ar": "يذهب",
        "scene": "walk",
        "variant": 0,
        "fr": "partir (à pied)",
        "en": "to leave on foot",
        "ruDef": "покидать место пешком"
      },
      {
        "id": "v206",
        "ru": "прилетать",
        "ar": "يصل بالطائرة",
        "scene": "fly",
        "variant": 1,
        "fr": "arriver en avion",
        "en": "to arrive by plane",
        "ruDef": "прибывать на самолёте"
      },
      {
        "id": "v207",
        "ru": "улетать",
        "ar": "يغادر بالطائرة",
        "scene": "fly",
        "variant": 2,
        "fr": "partir en avion",
        "en": "to leave by plane",
        "ruDef": "отлетать на самолёте"
      },
      {
        "id": "v208",
        "ru": "водить",
        "ar": "يقود",
        "scene": "drive",
        "variant": 0,
        "fr": "conduire",
        "en": "to drive",
        "ruDef": "управлять машиной"
      },
      {
        "id": "v209",
        "ru": "кататься",
        "ar": "يركب",
        "scene": "drive",
        "variant": 1,
        "fr": "faire un tour",
        "en": "to ride",
        "ruDef": "ездить для удовольствия"
      },
      {
        "id": "v210",
        "ru": "переходить",
        "ar": "يعبر",
        "scene": "walk",
        "variant": 2,
        "fr": "traverser",
        "en": "to cross",
        "ruDef": "идти через дорогу"
      },
      {
        "id": "v211",
        "ru": "останавливаться",
        "ar": "يتوقف",
        "scene": "wait",
        "variant": 0,
        "fr": "s'arrêter",
        "en": "to stop",
        "ruDef": "делать остановку"
      },
      {
        "id": "v212",
        "ru": "ждать",
        "ar": "ينتظر",
        "scene": "wait",
        "variant": 1,
        "fr": "attendre",
        "en": "to wait",
        "ruDef": "находиться в ожидании"
      },
      {
        "id": "v213",
        "ru": "опаздывать",
        "ar": "يتأخر",
        "scene": "run",
        "variant": 2,
        "fr": "être en retard",
        "en": "to be late",
        "ruDef": "приходить позже времени"
      },
      {
        "id": "v214",
        "ru": "фотографировать",
        "ar": "يصور",
        "scene": "look",
        "variant": 0,
        "fr": "photographier",
        "en": "to take photos",
        "ruDef": "снимать на камеру"
      },
      {
        "id": "v215",
        "ru": "заходить",
        "ar": "يزور",
        "scene": "open",
        "variant": 1,
        "fr": "passer voir",
        "en": "to drop in",
        "ruDef": "заглядывать в гости"
      },
      {
        "id": "v216",
        "ru": "пересаживаться",
        "ar": "يغير المواصلات",
        "scene": "travel",
        "variant": 2,
        "fr": "changer de transport",
        "en": "to change transport",
        "ruDef": "менять транспорт"
      },
      {
        "id": "v217",
        "ru": "теряться",
        "ar": "يضيع",
        "scene": "find",
        "variant": 0,
        "fr": "se perdre",
        "en": "to get lost",
        "ruDef": "не знать дороги"
      },
      {
        "id": "v218",
        "ru": "бронировать",
        "ar": "يحجز",
        "scene": "buy",
        "variant": 1,
        "fr": "réserver",
        "en": "to book",
        "ruDef": "заказывать заранее"
      },
      {
        "id": "v219",
        "ru": "регистрироваться",
        "ar": "يسجل",
        "scene": "buy",
        "variant": 2,
        "fr": "s'enregistrer",
        "en": "to check in",
        "ruDef": "проходить регистрацию"
      },
      {
        "id": "v220",
        "ru": "проходить",
        "ar": "يمر",
        "scene": "walk",
        "variant": 0,
        "fr": "passer",
        "en": "to pass through",
        "ruDef": "идти мимо"
      },
      {
        "id": "v221",
        "ru": "добираться",
        "ar": "يصل إلى",
        "scene": "travel",
        "variant": 1,
        "fr": "se rendre",
        "en": "to get to",
        "ruDef": "доезжать до места"
      },
      {
        "id": "v222",
        "ru": "отправляться",
        "ar": "ينطلق",
        "scene": "travel",
        "variant": 2,
        "fr": "se mettre en route",
        "en": "to set off",
        "ruDef": "начинать путь"
      },
      {
        "id": "v223",
        "ru": "встречать",
        "ar": "يستقبل",
        "scene": "meet",
        "variant": 0,
        "fr": "accueillir",
        "en": "to meet",
        "ruDef": "принимать прибывшего"
      },
      {
        "id": "v224",
        "ru": "провожать",
        "ar": "يرافق",
        "scene": "meet",
        "variant": 1,
        "fr": "raccompagner",
        "en": "to see off",
        "ruDef": "сопровождать до отъезда"
      },
      {
        "id": "v225",
        "ru": "торопиться",
        "ar": "يتعجل",
        "scene": "run",
        "variant": 2,
        "fr": "se dépêcher",
        "en": "to hurry",
        "ruDef": "спешить куда-то"
      }
    ]
  }
];

export const VERB_TOTAL = 225;

export const ALL_VERBS: VerbEntry[] = VERB_CATEGORIES.flatMap((c) => c.verbs);

export function getVerbById(id: string): VerbEntry | undefined {
  return ALL_VERBS.find((v) => v.id === id);
}

export function getCategoryById(id: string): VerbCategory | undefined {
  return VERB_CATEGORIES.find((c) => c.id === id);
}

// ============================================================================
// MADINGO — MADI FULL-TEXT LIBRARY, CURATED OFFLINE INDEX
// Real books from the MADI scientific-technical library (НТБ МАДИ),
// full-text library http://lib.madi.ru/fel/ — every entry below was
// verified by web search (title + author + year + PDF URL all seen in
// indexed MADI / university programme documents). NEVER add a title
// here without verifying its real PDF URL first — an invented link is
// worse than no result.
//
// The live search (proxy POST /library) tries the real MADI catalog
// first; this index is the day-one fallback when the catalog cannot be
// reached. The UI always shows the source of each result and always
// offers the deep links to lib.madi.ru and lib.madi.ru/fel/.
// ============================================================================

export const MADI_LIBRARY_HOME = 'http://lib.madi.ru/';
export const MADI_LIBRARY_FULL_TEXT = 'http://lib.madi.ru/fel/';
export const MADI_LIBRARY_CATALOG = 'https://lib.madi.ru/ec_in_internet';

export type MadiBookSource =
  | 'live-catalog'
  | 'live-fulltext'
  | 'offline-index';

export interface MadiBook {
  id: string;
  title: string;
  author: string;
  year?: number;
  pages?: number;
  url: string;
  source: MadiBookSource;
  /** Lowercase search tokens: Russian + English + Arabic keywords. */
  keywords: string[];
}

/**
 * Verified MADI full-text books (2026-11-10, via indexed documents):
 *  1. fel14E166 — Остаева Г.Ю. и др. «Химия…» (МАДИ, 2013, 260 с.)
 *  2. fel16E361 — Новизенцев В.В. «Повышение безопасности дорожных
 *     условий» (МАДИ, 2012, 139 с.)
 *  3. fel15E327 — Чеснокова М.П. «Методика преподавания русского языка
 *     как иностранного» (МАДИ, 2015, 132 с.)
 *  4. fel23E643 — Трофименко Ю.В., Комков В.И. «Инвентаризация
 *     выбросов…» (МАДИ, 2023)
 *  5. fel18E481 — Мартяхин Д.С., Косцов А.В., Мордовин С.С.
 *     «Проектирование городских улиц и дорог» (МАДИ, 2018, 68 с.)
 */
export const MADI_FULL_TEXT_INDEX: MadiBook[] = [
  {
    id: 'fel14E166',
    title:
      'Химия. Теория, справочные материалы, лабораторные работы, контрольные задания и примеры решения задач',
    author: 'Остаева Г.Ю., Панасенко А.А., Полякова Е.В.',
    year: 2013,
    pages: 260,
    url: 'http://lib.madi.ru/fel/fel1/fel14E166.pdf',
    source: 'offline-index',
    keywords: [
      'химия', 'chemistry', 'كيمياء', 'chimie',
      'теория', 'лабораторные', 'задачи', 'остаева', 'паписов',
    ],
  },
  {
    id: 'fel16E361',
    title: 'Повышение безопасности дорожных условий',
    author: 'Новизенцев В.В.',
    year: 2012,
    pages: 139,
    url: 'https://lib.madi.ru/fel/fel1/fel16E361.pdf',
    source: 'offline-index',
    keywords: [
      'безопасность', 'дорожных условий', 'дороги', 'safety', 'roads',
      'سلامة', 'طرق', 'sécurité', 'routes', 'новизенцев', 'дорожные',
    ],
  },
  {
    id: 'fel15E327',
    title: 'Методика преподавания русского языка как иностранного',
    author: 'Чеснокова М.П.',
    year: 2015,
    pages: 132,
    url: 'https://lib.madi.ru/fel/fel1/fel15E327.pdf',
    source: 'offline-index',
    keywords: [
      'русский язык', 'russian', 'الروسية', 'russe',
      'методика', 'преподавание', 'рки', 'чеснокова', 'иностранного',
    ],
  },
  {
    id: 'fel23E643',
    title:
      'Инвентаризация выбросов загрязняющих веществ передвижными источниками дорожного транспорта',
    author: 'Трофименко Ю.В., Комков В.И.',
    year: 2023,
    url: 'https://lib.madi.ru/fel/fel1/fel23E643.pdf',
    source: 'offline-index',
    keywords: [
      'экология', 'выбросы', 'загрязняющих', 'ecology', 'emissions',
      'بيئة', 'انبعاثات', 'écologie', 'трофименко', 'комков', 'транспорт',
    ],
  },
  {
    id: 'fel18E481',
    title: 'Проектирование городских улиц и дорог',
    author: 'Мартяхин Д.С., Косцов А.В., Мордовин С.С.',
    year: 2018,
    pages: 68,
    url: 'https://lib.madi.ru/fel/fel1/fel18E481.pdf',
    source: 'offline-index',
    keywords: [
      'проектирование', 'городских улиц', 'дорог', 'roads', 'streets',
      'تصميم', 'شوارع', 'طرق', 'conception', 'rues', 'мартяхин',
      'косцов', 'улиц',
    ],
  },
];

function normalize(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ё/g, 'е')
    .trim();
}

/** Score a book against the query tokens (title/author/keywords). */
export function searchOfflineIndex(query: string, limit = 8): MadiBook[] {
  const q = normalize(query);
  if (!q) return [];
  const tokens = q.split(/[^a-zа-я0-9\u0600-\u06ff]+/u).filter((t) => t.length > 1);
  if (tokens.length === 0) return [];
  const scored = MADI_FULL_TEXT_INDEX.map((book) => {
    const hay = normalize(
      [book.title, book.author, ...book.keywords].join(' ')
    );
    let score = 0;
    for (const token of tokens) {
      if (hay.includes(token)) score += 2;
      else if (token.length >= 4 && hay.includes(token.slice(0, 4))) score += 1;
    }
    return { book, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.book);
}

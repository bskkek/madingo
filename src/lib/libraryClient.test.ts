import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getLibraryUrl,
  listOfflineIndex,
  searchLibrary,
  MADI_LIBRARY_LINKS,
} from './libraryClient';
import { MADI_FULL_TEXT_INDEX, searchOfflineIndex } from '../data/madiFullTextIndex';

test('offline index: 5 verified MADI books, all real lib.madi.ru/fel/ PDFs', () => {
  assert.equal(MADI_FULL_TEXT_INDEX.length, 5);
  for (const book of MADI_FULL_TEXT_INDEX) {
    assert.match(book.url, /^https?:\/\/lib\.madi\.ru\/fel\/fel1\/fel\d+[EM]\d+\.pdf$/);
    assert.ok(book.title.length > 5);
    assert.ok(book.author.length > 2);
    assert.equal(book.source, 'offline-index');
  }
});

test('searchOfflineIndex: Russian query finds the chemistry book', () => {
  const results = searchOfflineIndex('химия');
  assert.ok(results.length >= 1);
  assert.equal(results[0].id, 'fel14E166');
});

test('searchOfflineIndex: "дороги" finds road-safety and street-design books', () => {
  const ids = searchOfflineIndex('дороги').map((b) => b.id);
  assert.ok(ids.includes('fel16E361'));
  assert.ok(ids.includes('fel18E481'));
});

test('searchOfflineIndex: English and Arabic keywords work too', () => {
  assert.equal(searchOfflineIndex('chemistry')[0]?.id, 'fel14E166');
  assert.equal(searchOfflineIndex('كيمياء')[0]?.id, 'fel14E166');
  assert.equal(searchOfflineIndex('русский язык')[0]?.id, 'fel15E327');
});

test('searchOfflineIndex: unknown query returns nothing (never invents)', () => {
  assert.deepEqual(searchOfflineIndex('квантовая механика черных дыр'), []);
  assert.deepEqual(searchOfflineIndex(''), []);
});

test('searchLibrary: offline fallback returns results + source + deep links', async () => {
  // No proxy URL is baked into the test run, so the live path is skipped
  // and the curated offline index answers.
  assert.equal(getLibraryUrl(), '');
  const res = await searchLibrary('химия', 'ru');
  assert.equal(res.source, 'offline');
  assert.ok(res.results.length >= 1);
  assert.equal(res.results[0].id, 'fel14E166');
  assert.equal(res.links.home, MADI_LIBRARY_LINKS.home);
  assert.match(res.links.fullText, /lib\.madi\.ru\/fel\//);
  assert.match(res.links.catalog, /lib\.madi\.ru\/ec_in_internet/);
});

test('searchLibrary: empty query returns no results', async () => {
  const res = await searchLibrary('   ', 'ru');
  assert.deepEqual(res.results, []);
});

test('listOfflineIndex returns a copy of the full index', () => {
  assert.equal(listOfflineIndex().length, 5);
});

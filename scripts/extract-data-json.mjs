/**
 * Одноразовый помощник миграции (06.08.2026): вытаскивает содержимое
 * из src/data/*.ts в JSON-файлы для админки. Значения берутся из самих
 * .ts-модулей — ни одна буква не переписывается руками.
 * Запуск: npx tsx scripts/extract-data-json.mjs <yachts|hotels|tours|reviews>
 */
import { writeFileSync } from 'node:fs';

const what = process.argv[2];

if (what === 'yachts') {
  const { YACHTS, YACHT_PROGRAMS, YACHT_INCLUDED } = await import('../src/data/yachts.ts');
  writeFileSync(
    'src/data/yachts.json',
    JSON.stringify({ yachts: YACHTS, programs: YACHT_PROGRAMS, included: YACHT_INCLUDED }, null, 2) + '\n',
  );
  console.log('yachts.json:', YACHTS.length, 'судов');
} else if (what === 'hotels') {
  const mod = await import('../src/data/hotels.ts');
  writeFileSync('src/data/hotels.json', JSON.stringify({ hotels: mod.HOTELS }, null, 2) + '\n');
  console.log('hotels.json:', mod.HOTELS.length, 'отелей');
} else if (what === 'tours') {
  const mod = await import('../src/data/tours.ts');
  const out = {};
  for (const [k, v] of Object.entries(mod)) out[k] = v;
  writeFileSync('src/data/tours.json', JSON.stringify(out, null, 2) + '\n');
  console.log('tours.json: ключи', Object.keys(out).join(', '));
} else if (what === 'reviews') {
  const mod = await import('../src/data/reviews.ts');
  // Пишем ИСХОДНЫЙ порядок (ALL), а не отсортированный REVIEWS — если
  // ALL не экспортируется, порядок берём как есть из REVIEWS.
  const list = mod.ALL ?? mod.REVIEWS;
  writeFileSync('src/data/reviews.json', JSON.stringify({ reviews: list }, null, 2) + '\n');
  console.log('reviews.json:', list.length, 'отзывов');
} else {
  console.error('Укажи: yachts | hotels | tours | reviews');
  process.exit(1);
}

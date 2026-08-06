/**
 * Подстановки в текстах, которые владелец правит через админку /admin.
 *
 * ПРИНЦИП ПРОЕКТА «ВСЁ СЧИТАЕТСЯ»: год, стаж, количества и цены нигде
 * не вписаны цифрой — они вычисляются при сборке. Но тексты страниц
 * с 06.08.2026 живут в JSON и правятся владельцем. Чтобы вычисляемое
 * число могло стоять ВНУТРИ редактируемого текста, в тексте пишется
 * метка в фигурных скобках, а сборка заменяет её настоящим значением:
 *
 *   «Я живу здесь {ЛЕТ_НА_ОСТРОВЕ}»  →  «Я живу здесь 31 год»
 *
 * Метка, которой нет в списке, остаётся как есть (не роняет сборку).
 * Список меток продублирован подсказками в config.yml админки.
 */
import {
  CURRENT_YEAR,
  ON_ISLAND_SINCE,
  GUIDE_SINCE,
  ISLAND_YEARS_TEXT,
  GUIDE_YEARS_TEXT,
  eur,
  plural,
} from './site';
import { YACHTS, YACHT_PRICE_FROM, YACHT_PRICE_TO } from './yachts';
import { HOTELS } from './hotels';
import { REVIEWS, REVIEW_SOURCES, REVIEW_YEARS } from './reviews';

const VALUES: Record<string, string> = {
  /** Текущий год: {ГОД} → 2026 */
  ГОД: String(CURRENT_YEAR),
  /** Год переезда: {НА_ОСТРОВЕ_С} → 1995 */
  НА_ОСТРОВЕ_С: String(ON_ISLAND_SINCE),
  /** Год начала работы гидом: {ГИД_С} → 2012 */
  ГИД_С: String(GUIDE_SINCE),
  /** Стаж жизни на острове со склонением: {ЛЕТ_НА_ОСТРОВЕ} → «31 год» */
  ЛЕТ_НА_ОСТРОВЕ: ISLAND_YEARS_TEXT,
  /** Стаж гида со склонением: {ЛЕТ_ГИДОМ} → «14 лет» */
  ЛЕТ_ГИДОМ: GUIDE_YEARS_TEXT,
  /** Количество судов во флоте: {ЧИСЛО_СУДОВ} → 8 */
  ЧИСЛО_СУДОВ: String(YACHTS.length),
  /** Со склонением: {СУДОВ_ВО_ФЛОТЕ} → «8 судов» */
  СУДОВ_ВО_ФЛОТЕ: `${YACHTS.length} ${plural(YACHTS.length, 'судно', 'судна', 'судов')}`,
  /** Количество отелей подборки: {ЧИСЛО_ОТЕЛЕЙ} → 14 */
  ЧИСЛО_ОТЕЛЕЙ: String(HOTELS.length),
  /** Со склонением: {ОТЕЛЕЙ_СЛОВОМ} → «14 отелей» */
  ОТЕЛЕЙ_СЛОВОМ: `${HOTELS.length} ${plural(HOTELS.length, 'отель', 'отеля', 'отелей')}`,
  /** Со склонением: {ПРОВЕРЕННЫХ_ОТЕЛЕЙ} → «14 проверенных отелей» */
  ПРОВЕРЕННЫХ_ОТЕЛЕЙ: `${HOTELS.length} ${plural(HOTELS.length, 'проверенный отель', 'проверенных отеля', 'проверенных отелей')}`,
  /** Количество отзывов: {ЧИСЛО_ОТЗЫВОВ} → 22 */
  ЧИСЛО_ОТЗЫВОВ: String(REVIEWS.length),
  /** Со склонением: {ОТЗЫВОВ_СЛОВОМ} → «22 отзыва» */
  ОТЗЫВОВ_СЛОВОМ: `${REVIEWS.length} ${plural(REVIEWS.length, 'отзыв', 'отзыва', 'отзывов')}`,
  /** Первый год отзывов: {ГОД_ОТЗЫВОВ_ОТ} → 2014 */
  ГОД_ОТЗЫВОВ_ОТ: REVIEW_YEARS.from,
  /** Последний год отзывов: {ГОД_ОТЗЫВОВ_ДО} → 2026 */
  ГОД_ОТЗЫВОВ_ДО: REVIEW_YEARS.to,
  /** Площадки-источники: {ПЛОЩАДКИ_ОТЗЫВОВ} → «Tourister.ru или NeedGuide» */
  ПЛОЩАДКИ_ОТЗЫВОВ: REVIEW_SOURCES.map((s) => s.name).join(' или '),
  /** Минимальная цена круиза: {ЦЕНА_ЯХТ_ОТ} → «€1 200» */
  ЦЕНА_ЯХТ_ОТ: eur(YACHT_PRICE_FROM),
  /** Максимальная цена круиза: {ЦЕНА_ЯХТ_ДО} → «€7 000» */
  ЦЕНА_ЯХТ_ДО: eur(YACHT_PRICE_TO),
  /** Диапазон лет отзывов: {ГОДЫ_ОТЗЫВОВ} → «2014–2026» */
  ГОДЫ_ОТЗЫВОВ: `${REVIEW_YEARS.from}–${REVIEW_YEARS.to}`,
};

/** Заменяет метки в одной строке. */
export function fill(text: string): string {
  return text.replace(/\{([А-ЯЁ_]+)\}/g, (whole, key) => VALUES[key] ?? whole);
}

/**
 * Заменяет метки во всех строках объекта любой вложенности.
 * Страница делает это один раз с целым JSON своего содержимого.
 */
export function fillDeep<T>(value: T): T {
  if (typeof value === 'string') return fill(value) as T;
  if (Array.isArray(value)) return value.map(fillDeep) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = fillDeep(v);
    return out as T;
  }
  return value;
}

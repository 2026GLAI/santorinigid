/**
 * Флот — 8 судов.
 *
 * СОДЕРЖИМОЕ ЖИВЁТ В yachts.json — его правит владелец через админку
 * /admin (миграция 06.08.2026, собранный сайт сверен байт-в-байт).
 * Этот файл — только типы и вычисления поверх данных. Тексты и цены
 * руками сюда не вписывать — они затрутся при правке через админку.
 *
 * Исходные тексты сняты дословно со старого сайта 2026-07-25
 * (docs/harvest/verbatim-content.md). Цены подтвердить у владельца
 * на текущий сезон.
 */
import data from './yachts.json';

export interface YachtPrices {
  /** Дневной тур, 5 часов */
  day: number;
  /** Вечерний с закатом, 5 часов */
  sunset: number;
  /** Весь день, 10 часов */
  full: number;
}

export interface Yacht {
  slug: string;
  name: string;
  description: string;
  image: string;
  low: YachtPrices;
  high: YachtPrices;
  /** Подтверждённая вместимость — только там, где она указана на сайте. */
  guests?: number;
  badge?: string;
}

export const YACHTS: Yacht[] = data.yachts;

/** Стандартные программы выхода в море (тексты дословно с сайта). */
export const YACHT_PROGRAMS: { title: string; time: string; text: string; image: string }[] =
  data.programs;

/** Что включено в стоимость (тексты дословно с сайта, фото — оттуда же). */
export const YACHT_INCLUDED: { title: string; text: string; image: string }[] = data.included;

/**
 * Границы цен флота — считаются из таблиц выше, не вписаны цифрой.
 * «От» — самый дешёвый дневной круиз в низкий сезон,
 * «до» — самый дорогой Full Day в высокий сезон.
 * Используются на странице яхт, в плашках главной и в llms.txt.
 */
export const YACHT_PRICE_FROM = Math.min(...YACHTS.map((y) => y.low.day));
export const YACHT_PRICE_TO = Math.max(...YACHTS.map((y) => y.high.full));

/**
 * Экскурсия: точки маршрута, условия, FAQ, галерея.
 *
 * СОДЕРЖИМОЕ ЖИВЁТ В tours.json — его правит владелец через админку
 * /admin (миграция 06.08.2026, собранный сайт сверен байт-в-байт).
 * Этот файл — только типы поверх данных.
 *
 * Исходные тексты сняты дословно с /tours старого сайта 2026-07-25
 * (docs/harvest/verbatim-content.md). FAQ про длительность: базовая
 * программа 4 часа — подтверждено владельцем 06.08.2026.
 */
import data from './tours.json';

export interface Stop {
  title: string;
  subtitle: string;
  text: string;
  /**
   * Фото ставим ТОЛЬКО там, где сюжет снимка действительно соответствует месту
   * (проверено по alt-текстам на santorinivip.com). Для горы Пророка Ильи и
   * церкви Панагия Эпископи подходящих фото на исходном сайте нет — запрошены
   * у владельца. До получения карточка выводится без картинки, а не с чужой.
   */
  image?: string;
}

/** Точки маршрута обзорной экскурсии — дословные описания с сайта. */
export const TOUR_STOPS: Stop[] = data.TOUR_STOPS;

/** Условия экскурсии — пары «подпись → значение». */
export const TOUR_DETAILS: { label: string; value: string }[] = data.TOUR_DETAILS;

/** FAQ — 5 вопросов. Используется и для JSON-LD FAQPage (через Faq.astro). */
export const FAQ: { q: string; a: string }[] = data.FAQ;

/** Галерея страницы экскурсий — имена файлов из src/assets/img. */
export const GALLERY: string[] = data.GALLERY;

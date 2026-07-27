/**
 * Внутренние ссылки сайта.
 *
 * ЗАЧЕМ ЭТО НУЖНО
 * Пока сайт живёт по временному адресу GitHub, он лежит во вложенной
 * папке: 2026glai.github.io/santorinigid/. Значит ссылка «/tours» ведёт
 * не туда — нужна «/santorinigid/tours».
 *
 * Astro сам исправляет пути к стилям и картинкам, но ссылки, написанные
 * руками в разметке, не трогает — он не знает, ссылка это или просто текст.
 * Поэтому все внутренние ссылки проходят через эту функцию.
 *
 * После покупки домена достаточно переключить одну строку
 * в astro.config.mjs — здесь править ничего не придётся.
 */

/**
 * Превращает адрес страницы в рабочую ссылку.
 *
 *   url('/tours')  → '/santorinigid/tours/'  (пока на GitHub)
 *   url('/tours')  → '/tours/'               (на своём домене)
 *   url('/')       → '/santorinigid/'  или  '/'
 *
 * КОСАЯ ЧЕРТА В КОНЦЕ ОБЯЗАТЕЛЬНА. Страницы собираются папками, и
 * GitHub Pages отдаёт их только по адресу со слешем; без слеша он
 * отвечает «переехало» (301). Ссылки, карта сайта и canonical должны
 * называть один и тот же адрес — тот, что отдаётся сразу.
 * Связано с trailingSlash: 'always' в astro.config.mjs.
 *
 * Файлы (например '/og-default.jpg') слешем не дополняются — он им
 * не нужен и сломал бы путь.
 */
export function url(path: string): string {
  // BASE_URL Astro подставляет сам из настройки base.
  // Он всегда оканчивается косой чертой: '/santorinigid/' или '/'.
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');

  // Главная страница: '/' + '' = '/', а не пустая строка
  if (path === '/') return base ? base + '/' : '/';

  // Якоря и параметры: '/contacts#form' → '/contacts/#form'
  const [pathname, rest = ''] = path.split(/(?=[#?])/, 2);

  // У файла есть расширение — слеш не добавляем.
  const isFile = /\.[a-z0-9]+$/i.test(pathname);
  const withSlash = isFile || pathname.endsWith('/') ? pathname : pathname + '/';

  return base + withSlash + rest;
}

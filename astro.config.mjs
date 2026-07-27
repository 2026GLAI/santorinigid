// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/*
  ════════════════════════════════════════════════════════════════════
  ГДЕ СЕЙЧАС ЖИВЁТ САЙТ — переключается ОДНОЙ строкой ниже.

  true  — временный адрес GitHub: 2026glai.github.io/santorinigid/
          Сайт лежит во ВЛОЖЕННОЙ ПАПКЕ, поэтому все ссылки на стили
          и страницы должны начинаться с «/santorinigid». Без этого
          страница откроется без оформления и со сломанными ссылками.

  false — свой домен santorinigid.com (сайт в корне).
          ПЕРЕКЛЮЧИТЬ СРАЗУ ПОСЛЕ ПОКУПКИ ДОМЕНА И ПРИВЯЗКИ.

  ⚠️ Пока стоит true, в canonical и sitemap попадает адрес github.io.
  Это правильно ровно до тех пор, пока сайт там и живёт: иначе Google
  получит указание на домен, которого ещё нет.
  ════════════════════════════════════════════════════════════════════
*/
const НА_GITHUB_ВРЕМЕННО = true;

export const SITE = НА_GITHUB_ВРЕМЕННО
  ? 'https://2026glai.github.io'
  : 'https://santorinigid.com';

const BASE = НА_GITHUB_ВРЕМЕННО ? '/santorinigid' : undefined;

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'never',
  /*
    Каждая страница собирается папкой с index.html внутри: /tours/index.html.
    Из-за этого Astro.url.pathname не содержит «.html», и canonical в
    BaseLayout строится верным: santorinigid.com/tours — ровно как в sitemap
    и во всех ссылках сайта.

    При прежнем format: 'file' canonical получался «/tours.html», то есть
    сайт сам сообщал Google адрес, которого нет ни в карте сайта, ни в
    ссылках. Для сайта, ради SEO-истории которого адреса сохраняли 1:1
    с Wix, это било прямо в цель переезда.

    Побочно исчезает конфликт: раньше рядом лежали файл vip-service.html
    и папка vip-service/ — какой из них отдаст GitHub Pages по адресу
    /vip-service, документация не определяет. Теперь двойника нет.

    Связано с trailingSlash: 'never' — адреса остаются без косой черты.
    Менять одно без проверки другого нельзя.
  */
  build: { format: 'directory' },
  integrations: [
    sitemap({
      changefreq: 'monthly',
      lastmod: new Date('2026-07-25'),
    }),
  ],
  image: {
    // Sharp сжимает картинки при сборке — в готовый сайт попадают лёгкие AVIF/WebP.
    service: { entrypoint: 'astro/assets/services/sharp' },
  },

  /*
    Шрифты забираются у Google ОДИН РАЗ, при сборке, и кладутся в готовый
    сайт своими файлами. Дальше сайт от Google не зависит вовсе.

    Зачем: раньше шрифты грузились с fonts.googleapis.com при каждом
    открытии страницы. Это была единственная внешняя зависимость сайта —
    ровно то, ради избавления от чего затевался уход с Wix. Плюс адрес
    каждого гостя уходил в Google, а сайт ведётся из ЕС, где это
    регулируется отдельно.

    Начертания перечислены ровно те, что используются: лишние утяжеляют
    сайт, а Google отдаёт по умолчанию весь набор.
    subsets — латиница и кириллица: тексты русские, но названия отелей
    и яхт латинские.
  */
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-inter',
      weights: [400, 500, 600, 700],
      subsets: ['latin', 'cyrillic'],
      styles: ['normal'],
      fallbacks: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Playfair Display',
      cssVariable: '--font-playfair',
      weights: [500, 600, 700],
      subsets: ['latin', 'cyrillic'],
      styles: ['normal'],
      fallbacks: ['Georgia', 'Times New Roman', 'serif'],
    },
  ],
});

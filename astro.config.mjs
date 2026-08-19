// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/*
  ════════════════════════════════════════════════════════════════════
  АДРЕС САЙТА. Вторая версия живёт на своём домене santoriniru.com
  (куплен владельцем 19.08.2026, Cloudflare Registrar) и выкладывается в
  Cloudflare Pages (проект santorinigid-v2): `node scripts/deploy.mjs`.
  Первая версия (ветка main, GitHub Pages, santorinigid.com) — запасная.

  От SITE зависят canonical, sitemap, Open Graph, разметка для поисковиков
  (site.ts → SITE_URL). Сайт в корне домена — base не нужен.
  ════════════════════════════════════════════════════════════════════
*/
const SITE = 'https://santoriniru.com';
const BASE = undefined;

export default defineConfig({
  site: SITE,
  base: BASE,
  /*
    Косая черта в конце адреса — ОБЯЗАТЕЛЬНА, и вот почему.

    Страницы собираются папками (format: 'directory' ниже): /tours/index.html.
    GitHub Pages такую папку отдаёт по адресу СО слешем: /tours/. Если
    попросить /tours без слеша, он отвечает «переехало» (301) и отправляет
    на /tours/.

    Пока здесь стояло 'never', сайт сам сообщал Google адреса без слеша —
    в canonical, в карте сайта и во всех ссылках. То есть каждая страница
    указывала на адрес, которого нет: лишний прыжок на каждом переходе
    [ПРОВЕРЕНО 27.07.2026: curl -I по всем 10 внутренним адресам — везде 301].

    Теперь адреса, которые сайт объявляет, совпадают с теми, что он реально
    отдаёт. Менять на 'never' нельзя, не сменив format — они связаны.
  */
  trailingSlash: 'always',
  /*
    Каждая страница собирается папкой с index.html внутри: /tours/index.html.
    Из-за этого Astro.url.pathname не содержит «.html», и canonical в
    BaseLayout строится верным: santoriniru.com/tours/ — ровно как в sitemap
    и во всех ссылках сайта.

    При прежнем format: 'file' canonical получался «/tours.html», то есть
    сайт сам сообщал Google адрес, которого нет ни в карте сайта, ни в
    ссылках. Для сайта, ради SEO-истории которого адреса сохраняли 1:1
    с Wix, это било прямо в цель переезда.

    Побочно исчезает конфликт: раньше рядом лежали файл vip-service.html
    и папка vip-service/ — какой из них отдаст GitHub Pages по адресу
    /vip-service, документация не определяет. Теперь двойника нет.

    Связано с trailingSlash: 'always' выше — папки отдаются по адресу
    со слешем. Менять одно без проверки другого нельзя.
  */
  build: { format: 'directory' },
  integrations: [
    sitemap({
      changefreq: 'monthly',
      /*
        Дата сборки, не вписанная дата: сайт пересобирается автоматически
        1-го числа каждого месяца (deploy.yml), содержимое при этом реально
        обновляется (стаж, год в заголовках) — lastmod честно идёт за ним.
        Раньше здесь стояло new Date('2026-07-25') намертво.
      */
      lastmod: new Date(),
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
  /*
    ВЕРСИЯ 2 (ветка v2, редакционный стиль): три шрифта вместо пары
    Inter + Playfair. Заголовки — Cormorant Garamond (высокий контраст
    штрихов, «журнальная» гарнитура), текст — Lora (читаемая антиква
    с кириллицей), подпись «Ваш гид, Владимир» — рукописный Marck Script.
  */
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Cormorant Garamond',
      cssVariable: '--font-cormorant',
      weights: [300, 400, 500, 600],
      subsets: ['latin', 'cyrillic'],
      styles: ['normal', 'italic'],
      fallbacks: ['Georgia', 'Times New Roman', 'serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Lora',
      cssVariable: '--font-lora',
      weights: [400, 500, 600],
      subsets: ['latin', 'cyrillic'],
      /* Курсив Lora на сайте не используется (курсив — только Cormorant):
         без него на каждой странице на 63 КБ меньше предзагрузки */
      styles: ['normal'],
      fallbacks: ['Georgia', 'Times New Roman', 'serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Marck Script',
      cssVariable: '--font-script',
      weights: [400],
      subsets: ['latin', 'cyrillic'],
      styles: ['normal'],
      fallbacks: ['cursive'],
    },
  ],
});

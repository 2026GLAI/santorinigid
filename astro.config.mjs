// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Домен нового сайта. Меняется в одном месте — отсюда берутся sitemap,
// canonical-ссылки и Open Graph.
export const SITE = 'https://santorinigid.com';

export default defineConfig({
  site: SITE,
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
});

// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Домен нового сайта. Меняется в одном месте — отсюда берутся sitemap,
// canonical-ссылки и Open Graph.
export const SITE = 'https://santorinigid.com';

export default defineConfig({
  site: SITE,
  trailingSlash: 'never',
  build: { format: 'file' },
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

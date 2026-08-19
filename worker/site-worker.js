/**
 * Worker самого САЙТА (вторая версия, домен santoriniru.com).
 *
 * Сайт — чистая статика из папки dist/ (Astro). Cloudflare Workers отдаёт
 * её как «статические ресурсы» (привязка ASSETS в wrangler-site.toml).
 * Этот скрипт почти ничего не делает: он лишь сводит все адреса к одному —
 * https://santoriniru.com — и отдаёт запрошенную страницу.
 *
 *   www.santoriniru.com/…         → 301 → https://santoriniru.com/…
 *   *.workers.dev/… (служебный)   → 301 → https://santoriniru.com/…
 *   http://santoriniru.com/…      → 301 → https://santoriniru.com/…
 *
 * Зачем: один сайт должен жить по ОДНОМУ адресу, иначе поисковики видят
 * две копии и делят между ними вес. Всё остальное (косые черты в конце
 * адресов, страница 404, заголовки) делает платформа по настройкам
 * в wrangler-site.toml — здесь это не дублируется.
 *
 * Выкладка: `node scripts/deploy.mjs` (сборка + `wrangler deploy
 * --config wrangler-site.toml`). Секретов у этого Worker нет.
 */
const CANONICAL_HOST = 'santoriniru.com';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname !== CANONICAL_HOST || url.protocol !== 'https:') {
      url.hostname = CANONICAL_HOST;
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};

/**
 * Cloudflare Pages Function для ПРЕЖНЕГО предпросмотра santorinigid-v2.pages.dev.
 *
 * Сайт с 19.08.2026 живёт на домене https://santoriniru.com (Cloudflare
 * Workers, wrangler-site.toml + scripts/deploy.mjs). Проект Pages больше не
 * обновляется и оставлен лишь затем, чтобы старая ссылка предпросмотра не
 * умерла: любой запрос к *.pages.dev уходит постоянным редиректом (301) на
 * домен с тем же путём — поисковики не видят копии сайта на втором адресе.
 *
 * Файл подхватывался автоматически при `wrangler pages deploy` (папка
 * functions/); последняя выкладка Pages с ним — 19.08.2026.
 */
export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.hostname.endsWith('.pages.dev')) {
    url.hostname = 'santoriniru.com';
    return Response.redirect(url.toString(), 301);
  }
  return next();
}

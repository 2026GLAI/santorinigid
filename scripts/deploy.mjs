/**
 * Выкладка второй версии сайта на боевой адрес https://santoriniru.com
 * (Cloudflare Workers, Worker «santoriniru», аккаунт 2026glai).
 *
 *   node scripts/deploy.mjs
 *
 * Собирает сайт (npm run build → dist/) и отправляет dist в Cloudflare
 * по настройкам wrangler-site.toml (там же привязан домен и www).
 * После каждой правки в ветке v2 — запускать этот скрипт (1–2 минуты).
 *
 * Служебный адрес прежнего предпросмотра santorinigid-v2.pages.dev
 * остаётся только перенаправлением на домен (functions/_middleware.js
 * в проекте Pages) — содержимое там больше не обновляется.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: true });
  if (r.status !== 0) {
    console.error(`\n✖ Команда завершилась с ошибкой: ${cmd} ${args.join(' ')}`);
    process.exit(r.status ?? 1);
  }
}

console.log('1/2 Сборка сайта…');
run('npx', ['astro', 'build']);

console.log('2/2 Выкладка в Cloudflare (Workers, домен santoriniru.com)…');
run('npx', ['--yes', 'wrangler@4', 'deploy', '--config', 'wrangler-site.toml']);

console.log('\n✓ Готово: https://santoriniru.com');

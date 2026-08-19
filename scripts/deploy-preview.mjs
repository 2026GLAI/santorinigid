/**
 * Скрытый предпросмотр второй версии сайта — для владельца, с любого
 * устройства, без публикации на домене.
 *
 *   node scripts/deploy-preview.mjs
 *
 * Что делает:
 *  1) собирает сайт с PUBLIC_PREVIEW=1 — BaseLayout ставит noindex на все
 *     страницы (копию сайта на *.pages.dev поисковики индексировать не должны);
 *  2) переписывает dist/robots.txt на «Disallow: /» по той же причине;
 *  3) убирает dist/CNAME (это файл для GitHub Pages, здесь он ни к чему);
 *  4) выкладывает dist в Cloudflare Pages, проект santorinigid-v2
 *     (аккаунт 2026glai, тот же, где живут воркеры чата и отзывов).
 *
 * Адрес после выкладки: https://santorinigid-v2.pages.dev
 * Обычная сборка (npm run build) этим скриптом не затрагивается.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'santorinigid-v2';

function run(cmd, args, env = {}) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: true, env: { ...process.env, ...env } });
  if (r.status !== 0) {
    console.error(`\n✖ Команда завершилась с ошибкой: ${cmd} ${args.join(' ')}`);
    process.exit(r.status ?? 1);
  }
}

console.log('1/3 Сборка предпросмотра (noindex)…');
run('npx', ['astro', 'build'], { PUBLIC_PREVIEW: '1' });

const dist = path.join(root, 'dist');
fs.writeFileSync(path.join(dist, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
fs.rmSync(path.join(dist, 'CNAME'), { force: true });
console.log('2/3 robots.txt → Disallow, CNAME убран');

console.log('3/3 Выкладка в Cloudflare Pages…');
run('npx', ['--yes', 'wrangler@4', 'pages', 'deploy', 'dist', '--project-name', PROJECT, '--branch', 'main', '--commit-dirty=true']);

console.log(`\n✓ Готово: https://${PROJECT}.pages.dev`);

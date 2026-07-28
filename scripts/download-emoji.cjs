/**
 * Скачивает рисованные эмодзи (набор Twemoji) для чата.
 *
 * Источник списка — src/data/chat-emoji.ts (единственное место правды).
 * Скачивает только недостающие файлы в public/emoji/.
 * Запуск: node scripts/download-emoji.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'emoji');
const SRC = fs.readFileSync(path.join(ROOT, 'src', 'data', 'chat-emoji.ts'), 'utf8');

// Достаём все строки-эмодзи из массива CHAT_EMOJI
const m = SRC.match(/CHAT_EMOJI = \[([\s\S]*?)\] as const/);
if (!m) {
  console.error('Не найден список CHAT_EMOJI');
  process.exit(1);
}
const emojis = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);

// То же правило имени файла, что в twemojiFile() из chat-emoji.ts
function fileName(emoji) {
  const codes = [...emoji].map((c) => c.codePointAt(0));
  const hasZwj = codes.includes(0x200d);
  return codes
    .filter((c) => hasZwj || c !== 0xfe0f)
    .map((c) => c.toString(16))
    .join('-');
}

const BASE = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/';

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  let ok = 0;
  let skip = 0;
  const missing = [];

  for (const e of emojis) {
    const f = fileName(e) + '.svg';
    const dest = path.join(OUT, f);
    if (fs.existsSync(dest)) {
      skip++;
      continue;
    }
    const r = await fetch(BASE + f);
    if (!r.ok) {
      missing.push(`${e} (${f}) — HTTP ${r.status}`);
      continue;
    }
    fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
    ok++;
  }

  console.log(`Скачано: ${ok}, уже было: ${skip}, всего в списке: ${emojis.length}`);
  if (missing.length) {
    console.log('НЕ НАЙДЕНЫ в наборе (убрать из списка или заменить):');
    missing.forEach((x) => console.log('  ' + x));
  }
}
main();

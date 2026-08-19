/**
 * Иконки сайта из логотипа (фавикон, иконки на рабочий стол телефона).
 *
 *   node scripts/make-icons.mjs src/assets/img/logo-v2-light.png --ring=#2a6fb0 --zoom=1.25
 *       — светлый логотип; у ИКОНКИ ВКЛАДКИ (favicon) — синяя каёмка и сюжет
 *         крупнее на четверть: на 16–32 точках кремовый круг иначе сливается
 *         с белой вкладкой (идея владельца 19.08.2026). Иконки телефона —
 *         без каёмки, они большие.
 *
 * Пишет в public/: favicon.ico (16/32/48), favicon.svg (256px, чётко на любом
 * экране), apple-touch-icon.png (180), icon-192.png, icon-512.png (запас по
 * краям под «маскируемые» иконки Android). Цвет подложки — как у панели.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [logoArg, ...flags] = process.argv.slice(2);
if (!logoArg) { console.error('Укажите файл логотипа'); process.exit(1); }
const logo = path.resolve(root, logoArg);
const ring = (flags.find((f) => f.startsWith('--ring=')) || '').slice(7) || null;
const zoom = Number((flags.find((f) => f.startsWith('--zoom=')) || '').slice(7)) || 1;
const BG = '#0b0d0e';
const pub = path.join(root, 'public');

/** Круглая иконка вкладки: логотип (он уже круг); при --ring — с цветной
    каёмкой, при --zoom — сюжет крупнее */
async function disc(size) {
  if (ring) {
    const ringW = 0.09;
    const inner = Math.round(size * (1 - 2 * ringW));
    const z = Math.round(inner * zoom);
    let buf = await sharp(logo).resize(z, z).png().toBuffer();
    if (zoom > 1) {
      const off = Math.round((z - inner) / 2);
      const mask = Buffer.from(`<svg width="${inner}" height="${inner}"><circle cx="${inner / 2}" cy="${inner / 2}" r="${inner / 2}" fill="#fff"/></svg>`);
      buf = await sharp(buf).extract({ left: off, top: off, width: inner, height: inner }).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
    }
    const svg = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${ring}"/></svg>`);
    return sharp(svg).composite([{ input: buf, gravity: 'centre' }]).png().toBuffer();
  }
  return sharp(logo).resize(size, size).png().toBuffer();
}

/** Квадратная непрозрачная иконка (iOS, Android) — логотип на тёмной подложке */
async function square(size, pad) {
  const inner = await sharp(logo).resize(Math.round(size * pad), Math.round(size * pad)).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: inner, gravity: 'centre' }]).png().toBuffer();
}

/** ICO-контейнер с PNG внутри (Windows понимает с Vista, все браузеры тоже) */
function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
  const dirs = []; const datas = []; let offset = 6 + 16 * pngs.length;
  for (const p of pngs) {
    const d = Buffer.alloc(16);
    d.writeUInt8(p.size >= 256 ? 0 : p.size, 0); d.writeUInt8(p.size >= 256 ? 0 : p.size, 1);
    d.writeUInt16LE(1, 4); d.writeUInt16LE(32, 6); d.writeUInt32LE(p.buf.length, 8); d.writeUInt32LE(offset, 12);
    offset += p.buf.length; dirs.push(d); datas.push(p.buf);
  }
  return Buffer.concat([header, ...dirs, ...datas]);
}

const pngs = [];
for (const s of [16, 32, 48]) pngs.push({ size: s, buf: await disc(s) });
fs.writeFileSync(path.join(pub, 'favicon.ico'), ico(pngs));
const p256 = await disc(256);
fs.writeFileSync(path.join(pub, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 256 256" width="256" height="256"><image width="256" height="256" xlink:href="data:image/png;base64,${p256.toString('base64')}"/></svg>`);
fs.writeFileSync(path.join(pub, 'apple-touch-icon.png'), await square(180, 0.82));
fs.writeFileSync(path.join(pub, 'icon-192.png'), await square(192, 0.82));
fs.writeFileSync(path.join(pub, 'icon-512.png'), await square(512, 0.72));
console.log('✓ Иконки обновлены из', path.relative(root, logo), ring ? `(каёмка ${ring}, ×${zoom})` : '');

/**
 * Приём и модерация отзывов для santorinigid.com
 * =============================================
 *
 * ЗАЧЕМ ЭТО НУЖНО
 * Сайт статический — у него нет базы данных, и это сознательно (ноль
 * абонентской платы, полная независимость). Но отзыв где-то нужно подержать
 * между «гость отправил» и «Владимир одобрил». Этим и занимается Worker.
 *
 * КАК РАБОТАЕТ, ПО ШАГАМ
 *  1. Гость заполняет форму на сайте → она шлёт данные сюда.
 *  2. Worker кладёт отзыв в хранилище KV и отправляет Владимиру письмо
 *     с полным текстом, фотографиями и двумя кнопками.
 *  3. Владимир жмёт «Опубликовать» (и подтверждает) → Worker дописывает
 *     отзыв в файл src/data/reviews.json на GitHub.
 *  4. Изменение файла в ветке main запускает GitHub Actions → сайт
 *     пересобирается сам. Через 2–3 минуты отзыв на сайте.
 *  5. Жмёт «Удалить» → отзыв стирается из KV и никуда не попадает.
 *
 * ГЛАВНОЕ: без нажатия Владимира на сайт не попадает НИЧЕГО.
 * Конкурент физически не может ничего опубликовать.
 *
 * НАСТРОЙКА — в worker/wrangler-reviews.toml (переменные, камера
 * хранения KV, право отправки почты). Секретов два: GITHUB_TOKEN
 * (право дописать одобренный отзыв в репозиторий) и ADMIN_SECRET
 * (подпись кнопок в письме). Развёрнуто 28.07.2026.
 *
 * ПИСЬМА — встроенной почтой Cloudflare (Email Routing домена
 * santorinigid.com), БЕЗ сторонних сервисов: решение владельца
 * «меньше платформ». Письмо может уйти только на его подтверждённый
 * адрес — это зашито привязкой send_email в настройке.
 *
 * Цена вопроса: 0 ₽.
 */
import { EmailMessage } from 'cloudflare:email';

/**
 * Кто имеет право слать сюда отзывы.
 *
 * Раньше стояло '*' — принимали от кого угодно, и форму можно было дёргать
 * с любого чужого сайта. Теперь только наши адреса: сам сайт и его версия
 * на GitHub Pages (пока домен не привязан).
 *
 * Если появится ещё один адрес — дописать сюда, а не возвращать звёздочку.
 */
const ALLOWED_ORIGINS = [
  'https://santorinigid.com',
  'https://www.santorinigid.com',
  'https://2026glai.github.io',
  // Скрытый предпросмотр второй версии сайта (Cloudflare Pages, 19.08.2026)
  'https://santorinigid-v2.pages.dev',
];

/** Заголовки доступа для конкретного просителя. Чужому — без разрешения. */
function corsFor(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    // Ответ зависит от Origin — иначе кэш отдаст чужому разрешение нашего
    Vary: 'Origin',
  };
}

/** Ответ в формате JSON. */
const json = (data, status = 200, request = null) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(request ? corsFor(request) : {}),
    },
  });

/** Страница-ответ для Владимира после нажатия кнопки в письме.
    extra — дополнительная разметка под кнопкой (например, ссылка
    «удалить с сайта» на странице успешной публикации). */
const page = (title, text, tone = 'ok', extra = '', showLink = true) =>
  new Response(
    `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
 body{margin:0;min-height:100vh;display:grid;place-items:center;
   font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
   background:#fbfaf7;color:#12222e;padding:1.5rem}
 .card{max-width:32rem;text-align:center;background:#fff;padding:2.5rem 2rem;
   border:1px solid #e3ded4;border-radius:22px;
   box-shadow:0 10px 24px rgb(10 47 77/.08)}
 .ico{width:56px;height:56px;margin:0 auto 1.25rem;border-radius:50%;
   display:grid;place-items:center;font-size:1.6rem;
   background:${tone === 'ok' ? '#e6f5ec' : '#fdecea'}}
 h1{font-size:1.4rem;margin:0 0 .5rem}
 p{color:#43535e;margin:0}
 a.btn{display:inline-block;margin-top:1.5rem;padding:.8em 1.8em;border-radius:999px;
   background:#1b6fa8;color:#fff;text-decoration:none;font-weight:600}
 .extra{margin-top:1.25rem;font-size:.85rem}
 .extra a{color:#c0392b;text-decoration:underline}
</style></head><body><div class="card">
<div class="ico">${tone === 'ok' ? '✓' : '🗑'}</div>
<h1>${title}</h1><p>${text}</p>
${showLink ? '<a class="btn" href="https://santorinigid.com/reviews/">Открыть страницу отзывов</a>' : ''}
${extra ? `<div class="extra">${extra}</div>` : ''}
</div></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );

/** Подпись кнопок в письме: без неё ссылку не подделать. */
async function sign(id, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(id));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Сравнение подписей за постоянное время — чтобы её нельзя было подобрать. */
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Экранируем текст, чтобы он не сломал письмо и не внёс чужой код. */
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { headers: corsFor(request) });

    // --- 1. Гость отправил отзыв ---
    if (url.pathname === '/review' && request.method === 'POST') {
      return handleSubmit(request, env);
    }

    /*
      --- 2. Владимир открыл ссылку из письма ---
      GET только ПОКАЗЫВАЕТ страницу подтверждения и ничего не меняет.
      Причина: почтовые сервисы и антивирусы ходят по ссылкам в письмах
      сами (предпросмотр/проверка) — до 06.08.2026 такой робот мог
      опубликовать или удалить отзыв без ведома владельца. Роботы делают
      только GET; действие теперь выполняется по нажатию кнопки — POST.
      Старые письма продолжают работать: их ссылки ведут на подтверждение.
    */
    if (url.pathname === '/moderate' && request.method === 'GET') {
      return confirmModerate(url, env);
    }

    // --- 3. Владимир нажал кнопку подтверждения ---
    if (url.pathname === '/moderate' && request.method === 'POST') {
      return handleModerate(url, env, request);
    }

    return json({ error: 'Not found' }, 404, request);
  },
};

/**
 * Сколько отзывов можно прислать с одного адреса.
 *
 * Ловушка _gotcha останавливает простых ботов, но не того, кто задался
 * целью: без этого ограничения можно залить тысячи записей в хранилище
 * и завалить почту Владимира, сжёгши бесплатные лимиты Cloudflare и Resend.
 *
 * 3 отзыва в час с адреса — живому человеку хватает с запасом (он пишет
 * один), а поток отсекается.
 */
const RATE_LIMIT = 3;
const RATE_WINDOW_SEC = 3600;

async function tooManyRequests(request, env) {
  // Настоящий адрес гостя Cloudflare кладёт в этот заголовок
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = `rate:${ip}`;
  const count = Number((await env.REVIEWS.get(key)) || 0);

  if (count >= RATE_LIMIT) return true;

  // Запись сама исчезнет через час — чистить вручную не нужно
  await env.REVIEWS.put(key, String(count + 1), { expirationTtl: RATE_WINDOW_SEC });
  return false;
}

async function handleSubmit(request, env) {
  if (await tooManyRequests(request, env)) {
    return json(
      { error: 'Слишком много отзывов подряд. Попробуйте позже или напишите в WhatsApp.' },
      429,
      request,
    );
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: 'Некорректные данные' }, 400, request);
  }

  // Ловушка для ботов: люди это поле не видят и не заполняют.
  if (data._gotcha) return json({ ok: true }, 200, request);

  const author = String(data.author || '').trim().slice(0, 80);
  const text = String(data.text || '').trim().slice(0, 5000);
  const contact = String(data.contact || '').trim().slice(0, 120);

  if (author.length < 2) return json({ error: 'Укажите, как вас зовут' }, 400, request);
  if (text.length < 30) return json({ error: 'Отзыв слишком короткий' }, 400, request);
  if (!contact) return json({ error: 'Укажите email или телефон' }, 400, request);

  /*
    Фотографии: не больше 3, каждая до 5 МБ, и все вместе тоже до 5 МБ.

    Ограничение в браузере (ReviewForm) легко обойти — запрос можно послать
    и мимо формы. Поэтому проверяем здесь, и проверяем ОБЩИЙ объём:
    раньше стоял только предел на одну фотографию (7 МБ строки base64),
    и три штуки давали 21 МБ в одном запросе.

    5 МБ файла → примерно 6,8 МБ в виде строки base64: кодирование
    увеличивает объём на треть.
  */
  const MAX_ONE = 6_800_000;
  const MAX_ALL = 6_800_000;
  const photos = Array.isArray(data.photos) ? data.photos.slice(0, 3) : [];
  let totalSize = 0;

  for (const p of photos) {
    if (typeof p !== 'string' || p.length > MAX_ONE) {
      return json({ error: 'Фотография слишком большая — уменьшите её' }, 400, request);
    }
    totalSize += p.length;
  }

  if (totalSize > MAX_ALL) {
    return json({ error: 'Фотографии вместе весят слишком много' }, 400, request);
  }

  const now = new Date();
  const id = crypto.randomUUID();
  const review = {
    id,
    author,
    text,
    contact,
    tripDate: String(data.tripDate || '').trim().slice(0, 60),
    tripWith: String(data.tripWith || '').trim().slice(0, 80),
    photos,
    datePublished: now.toISOString().slice(0, 10),
    published: `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`,
    receivedAt: now.toISOString(),
  };

  // Держим 30 дней — требование владельца 28.07.2026: «хранить нет
  // смысла». Решил (опубликовать/удалить) — стирается сразу; не решил —
  // отзыв сам испаряется, чистить руками ничего не нужно.
  await env.REVIEWS.put(`pending:${id}`, JSON.stringify(review), {
    expirationTtl: 30 * 24 * 60 * 60,
  });

  /*
    Письмо не ушло → гостю честная ошибка, а не «спасибо»: форма на сайте
    в ответ сама предложит отправить отзыв в WhatsApp (её штатный запасной
    путь). До 06.08.2026 здесь всегда отвечалось ok:true, и при сбое почты
    отзыв тихо истекал в хранилище через 30 дней — никто не узнавал.
    Копию из хранилища стираем: отзыв уйдёт по WhatsApp, сирота не нужна.
  */
  const sent = await sendEmail(review, env);
  if (!sent) {
    await env.REVIEWS.delete(`pending:${id}`);
    return json(
      { error: 'Не получилось передать отзыв. Пожалуйста, отправьте его в WhatsApp.' },
      502,
      request,
    );
  }
  return json({ ok: true }, 200, request);
}

async function sendEmail(review, env) {
  const token = await sign(review.id, env.ADMIN_SECRET);
  const base = env.WORKER_URL || 'https://reviews.santorinigid.com';
  const approve = `${base}/moderate?id=${review.id}&action=approve&t=${token}`;
  const reject = `${base}/moderate?id=${review.id}&action=reject&t=${token}`;
  // «Передумал» — снять УЖЕ опубликованный отзыв с сайта. Подпись та же,
  // ссылка вечная: работает и через месяц, и через год.
  const unpublish = `${base}/moderate?id=${review.id}&action=unpublish&t=${token}`;

  const meta = [review.tripDate, review.tripWith].filter(Boolean).join(' · ');

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f1ea;
font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#12222e">
<div style="max-width:620px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;
box-shadow:0 4px 16px rgb(10 47 77/.08)">
  <div style="padding:22px 28px;background:#1b6fa8;color:#fff">
    <div style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;opacity:.85">
      Новый отзыв на сайте
    </div>
    <div style="font-size:20px;font-weight:600;margin-top:4px">${esc(review.author)}</div>
    ${meta ? `<div style="font-size:13px;opacity:.85;margin-top:2px">${esc(meta)}</div>` : ''}
  </div>

  <div style="padding:26px 28px">
    <div style="padding:16px 18px;background:#fbfaf7;border-left:3px solid #1b6fa8;
    border-radius:0 10px 10px 0;font-size:15px;line-height:1.7;white-space:pre-wrap">${esc(review.text)}</div>

    <p style="font-size:13px;color:#5f6e78;margin:16px 0 0">
      Связь с гостем: <strong>${esc(review.contact)}</strong><br>
      Фотографий приложено: <strong>${review.photos.length}</strong>
    </p>

    <div style="margin-top:26px;display:flex;gap:12px;flex-wrap:wrap">
      <a href="${approve}" style="display:inline-block;padding:14px 30px;background:#1b6fa8;
      color:#fff;text-decoration:none;border-radius:999px;font-weight:600;font-size:15px">
        ✓ Опубликовать на сайте
      </a>
      <a href="${reject}" style="display:inline-block;padding:14px 30px;background:#fff;
      color:#c0392b;text-decoration:none;border:1.5px solid #e3ded4;border-radius:999px;
      font-weight:600;font-size:15px">
        Удалить
      </a>
    </div>

    <p style="font-size:12px;color:#5f6e78;margin:24px 0 0;padding-top:16px;
    border-top:1px solid #e3ded4;line-height:1.6">
      Кнопка откроет страницу с подтверждением — отзыв появится на сайте
      автоматически через 2–3 минуты после нажатия кнопки там. Пока вы не
      подтвердили — на сайте его нет.
      Если не решить в течение 30 дней, отзыв удалится сам.<br><br>
      Передумали уже после публикации? Нажмите
      <a href="${unpublish}" style="color:#c0392b">удалить отзыв с сайта</a> —
      сработает в любой момент, даже спустя месяцы.
    </p>
  </div>
</div>
</body></html>`;

  /*
    Письмо собирается вручную в формате MIME и уходит встроенной почтой
    Cloudflare (привязка OWNER_MAIL). Никаких сторонних почтовых
    сервисов — решение владельца. Фотографии гостя идут вложениями.
  */
  const mime = buildMime({
    from: 'reviews@santorinigid.com',
    to: env.OWNER_EMAIL,
    replyTo: review.contact.includes('@') ? review.contact : null,
    subject: `Новый отзыв: ${review.author.slice(0, 40)}`,
    html,
    photos: review.photos,
  });

  try {
    await env.OWNER_MAIL.send(new EmailMessage('reviews@santorinigid.com', env.OWNER_EMAIL, mime));
    return true;
  } catch (e) {
    // Причина остаётся в журнале Worker; гостю ответит handleSubmit.
    console.error('Не удалось отправить письмо:', e.message);
    return false;
  }
}

/** Текст → base64 с поддержкой кириллицы (btoa сам по себе её не умеет). */
function b64utf8(s) {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(bin);
}

/** Строки base64 в письме не длиннее 76 знаков — требование формата. */
const wrap76 = (b64) => b64.replace(/(.{76})/g, '$1\r\n');

/**
 * Собирает письмо в формате MIME: заголовки, HTML-тело и фотографии
 * вложениями. Формат старый и строгий, поэтому переводы строк — \r\n,
 * а всё нелатинское кодируется в base64.
 */
function buildMime({ from, to, replyTo, subject, html, photos }) {
  const boundary = 'santorinigid-review-boundary';
  const lines = [
    `From: =?UTF-8?B?${b64utf8('Отзывы сайта')}?= <${from}>`,
    `To: <${to}>`,
    replyTo ? `Reply-To: <${replyTo}>` : null,
    `Subject: =?UTF-8?B?${b64utf8(subject)}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(b64utf8(html)),
  ].filter((l) => l !== null);

  const list = Array.isArray(photos) ? photos.slice(0, 3) : [];
  for (let i = 0; i < list.length; i++) {
    const m = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(list[i]);
    if (!m) continue; // чужой формат — письмо важнее вложения
    const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
    lines.push(
      `--${boundary}`,
      `Content-Type: image/${m[1] === 'jpg' ? 'jpeg' : m[1]}; name="foto-${i + 1}.${ext}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="foto-${i + 1}.${ext}"`,
      '',
      wrap76(m[2]),
    );
  }

  lines.push(`--${boundary}--`, '');
  return lines.join('\r\n');
}

/**
 * Страница подтверждения (ответ на GET). НИЧЕГО не меняет — показывает,
 * что именно произойдёт, и даёт одну кнопку. Проверки те же, что перед
 * действием: битая подпись не должна доводить даже до кнопки.
 */
async function confirmModerate(url, env) {
  const id = url.searchParams.get('id');
  const action = url.searchParams.get('action');
  const token = url.searchParams.get('t');

  if (!id || !action || !token) return page('Ссылка неполная', 'В адресе не хватает данных.', 'err');

  const expected = await sign(id, env.ADMIN_SECRET);
  if (!safeEqual(token, expected)) {
    return page('Ссылка недействительна', 'Подпись не совпала. Откройте ссылку из письма.', 'err');
  }

  const KNOWN = {
    approve: { title: 'Опубликовать отзыв?', btn: '✓ Опубликовать отзыв на сайте', color: '#1b6fa8', tone: 'ok' },
    reject: { title: 'Удалить отзыв?', btn: 'Да, удалить', color: '#c0392b', tone: 'err' },
    unpublish: { title: 'Снять отзыв с сайта?', btn: 'Да, снять с сайта', color: '#c0392b', tone: 'err' },
  };
  const known = KNOWN[action];
  if (!known) return page('Непонятное действие', 'Такой команды нет.', 'err');

  let text;
  let quote = '';
  let replyField = '';
  if (action === 'unpublish') {
    text = 'Отзыв будет удалён со страницы отзывов; сайт пересоберётся за 2–3 минуты.';
  } else {
    // Покажем автора; а если отзыв уже обработан — скажем сразу, без кнопки.
    const raw = await env.REVIEWS.get(`pending:${id}`);
    if (!raw) {
      return page('Отзыв уже обработан', 'Похоже, вы уже нажимали кнопку по этому отзыву.', 'ok');
    }
    const review = JSON.parse(raw);
    text =
      action === 'approve'
        ? `Отзыв от ${esc(review.author)} появится на сайте через 2–3 минуты после подтверждения.`
        : `Отзыв от ${esc(review.author)} будет стёрт и на сайт не попадёт.`;

    // Текст отзыва перед глазами: решение принимается по словам гостя,
    // а не по памяти о письме. Тем же взглядом пишется и благодарность.
    quote = `<blockquote style="margin:1.25rem 0 0;padding:.9rem 1.1rem;text-align:left;
      background:#f6f4ef;border-left:3px solid #1b6fa8;border-radius:0;
      color:#43535e;font-size:.95rem">${esc(review.text)}</blockquote>`;

    if (action === 'approve') {
      // Благодарность публикуется вместе с отзывом — тем же коммитом.
      // Пустое поле = отзыв выходит без ответа, как и раньше.
      // Голубая рамка и подпись «для Владимира» — по его просьбе 06.08:
      // владелец должен сразу видеть, что заполняет здесь именно он.
      replyField = `<div style="margin-top:1.25rem;text-align:left;background:#eef5fb;
      border:1.5px solid #1b6fa8;border-radius:14px;padding:.9rem 1rem">
      <label style="display:block">
      <span style="display:block;font-weight:600;font-size:.9rem;color:#1b6fa8;margin-bottom:.15rem">
        💙 Окно для Владимира</span>
      <span style="display:block;font-size:.85rem;color:#43535e;margin-bottom:.5rem">
        Ваша благодарность гостю — по желанию. Появится на сайте под отзывом.
        Оставите пустым — отзыв выйдет без ответа.</span>
      <textarea name="reply" rows="4" maxlength="1000"
        placeholder="Например: ${esc(review.author)}, спасибо за тёплые слова! Жду вас снова на острове."
        style="width:100%;box-sizing:border-box;padding:.7rem .9rem;font:inherit;color:inherit;
        background:#fff;border:1px solid #9dc3de;border-radius:10px;resize:vertical"></textarea>
      </label></div>`;
    }
  }

  /*
    Значения в адресе формы безопасны для HTML: подпись сверена выше
    (значит id и t — наши собственные), action взят из белого списка.
  */
  const form = `${quote}<form method="post" action="/moderate?id=${id}&action=${action}&t=${token}"
  style="margin-top:.25rem">${replyField}
  <button type="submit" style="cursor:pointer;border:0;margin-top:1.25rem;padding:.85em 2em;border-radius:999px;
  background:${known.color};color:#fff;font:600 16px/1.2 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif">
    ${known.btn}
  </button></form>`;

  return page(known.title, text, known.tone, form, false);
}

async function handleModerate(url, env, request) {
  const id = url.searchParams.get('id');
  const action = url.searchParams.get('action');
  const token = url.searchParams.get('t');

  if (!id || !action || !token) return page('Ссылка неполная', 'В адресе не хватает данных.', 'err');

  const expected = await sign(id, env.ADMIN_SECRET);
  if (!safeEqual(token, expected)) {
    return page('Ссылка недействительна', 'Подпись не совпала. Откройте ссылку из письма.', 'err');
  }

  /*
    Снятие УЖЕ опубликованного отзыва — до обращения к камере хранения:
    к этому моменту отзыв из неё давно стёрт, он живёт в файле сайта.
  */
  if (action === 'unpublish') {
    try {
      const removed = await unpublishFromGitHub(id, env);
      if (!removed) {
        return page('На сайте не найден', 'Такого отзыва на сайте нет — возможно, он уже удалён.', 'ok');
      }
    } catch (e) {
      return page('Не удалось удалить', `Ошибка: ${esc(e.message)}`, 'err');
    }
    return page(
      'Отзыв удалён с сайта',
      'Сайт сейчас пересобирается — через 2–3 минуты отзыва (и его фотографий) на странице не будет.',
      'err',
    );
  }

  const raw = await env.REVIEWS.get(`pending:${id}`);
  if (!raw) {
    return page('Отзыв уже обработан', 'Похоже, вы уже нажимали кнопку по этому отзыву.', 'ok');
  }
  const review = JSON.parse(raw);

  if (action === 'reject') {
    await env.REVIEWS.delete(`pending:${id}`);
    return page('Отзыв удалён', `Отзыв от ${esc(review.author)} стёрт и на сайт не попадёт.`, 'err');
  }

  if (action === 'approve') {
    /*
      Благодарность владельца из поля на странице подтверждения.
      Старые письма шлют форму без этого поля — formData тогда пустая,
      а на совсем пустом теле может и упасть, поэтому try/catch.
    */
    let reply = '';
    try {
      const fd = await request.formData();
      reply = String(fd.get('reply') || '').replace(/\s+/g, ' ').trim().slice(0, 1000);
    } catch {
      /* тела нет — благодарности нет, отзыв публикуется без неё */
    }
    if (reply) review.reply = reply;

    try {
      await publishToGitHub(review, env);
    } catch (e) {
      return page('Не удалось опубликовать', `Ошибка: ${esc(e.message)}`, 'err');
    }
    await env.REVIEWS.delete(`pending:${id}`);
    const unpublishUrl = `${env.WORKER_URL}/moderate?id=${id}&action=unpublish&t=${token}`;
    return page(
      'Отзыв опубликован',
      reply
        ? `Отзыв от ${esc(review.author)} и ваша благодарность появятся на сайте через 2–3 минуты — сайт сейчас пересобирается.`
        : `Отзыв от ${esc(review.author)} появится на сайте через 2–3 минуты — сайт сейчас пересобирается.`,
      'ok',
      `Передумали? <a href="${unpublishUrl}">Удалить этот отзыв с сайта</a> — можно в любой момент.`,
    );
  }

  return page('Непонятное действие', 'Такой команды нет.', 'err');
}

/**
 * Кладём фотографии гостя в public/reviews/ отдельными файлами.
 *
 * Почему не прямо в reviews.json: фото приходят строкой base64 длиной
 * в сотни тысяч знаков. Вписать их в исходный код — раздуть файл на
 * мегабайты, сломать его читаемость и заставить пересобирать сайт
 * на каждой картинке. Файлы в public/ отдаются как есть, без обработки.
 *
 * Возвращает список адресов вида /reviews/own-1a2b3c-1.jpg — именно они
 * попадают в поле photos отзыва. Если фото нет — вернётся пустой список,
 * и в карточке не появится ни блока, ни пустого места.
 */
async function uploadPhotos(review, env, headers, branch) {
  const urls = [];
  const photos = Array.isArray(review.photos) ? review.photos.slice(0, 3) : [];
  const shortId = review.id.slice(0, 8);

  for (let i = 0; i < photos.length; i++) {
    // Формат приходит как «data:image/jpeg;base64,XXXX» — нужен и тип, и данные
    const m = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(photos[i]);
    if (!m) continue; // чужой формат — молча пропускаем, отзыв важнее фото

    const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
    const name = `own-${shortId}-${i + 1}.${ext}`;
    const res = await fetch(
      `https://api.github.com/repos/${env.GITHUB_REPO}/contents/public/reviews/${name}`,
      {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Фото к отзыву от ${review.author}`,
          content: m[2],
          branch,
        }),
      },
    );

    // Не загрузилось — теряем фото, но не отзыв. Текст важнее картинки.
    if (res.ok) urls.push(`/reviews/${name}`);
  }

  return urls;
}

/**
 * Дописываем отзыв в src/data/reviews.json и коммитим на GitHub.
 * Коммит в main запускает GitHub Actions — сайт пересоберётся сам.
 *
 * С 06.08.2026 отзывы живут в JSON (не в reviews.ts): его же правит
 * владелец через админку /admin. JSON разбирается и собирается честно
 * (JSON.parse/stringify) — никакой текстовой хирургии, сломать формат
 * файла кривой вставкой невозможно.
 */
async function publishToGitHub(review, env) {
  const path = 'src/data/reviews.json';
  const api = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'santorinigid-reviews-worker',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  const branch = env.GITHUB_BRANCH || 'main';

  // Сначала фотографии: они кладутся отдельными файлами, и только потом
  // их адреса попадают в отзыв. Порядок важен — если фото не загрузятся,
  // отзыв всё равно опубликуется, просто без них.
  const photoUrls = await uploadPhotos(review, env, headers, branch);

  const getRes = await fetch(`${api}?ref=${branch}`, { headers });
  if (!getRes.ok) throw new Error(`GitHub не отдал файл (${getRes.status})`);
  const file = await getRes.json();

  // base64 → текст с поддержкой кириллицы
  const current = new TextDecoder().decode(
    Uint8Array.from(atob(file.content.replace(/\n/g, '')), (c) => c.charCodeAt(0)),
  );

  let json;
  try {
    json = JSON.parse(current);
  } catch {
    throw new Error('reviews.json повреждён — отзыв не записан');
  }
  if (!Array.isArray(json.reviews)) throw new Error('В файле не найден массив отзывов');

  const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
  const entry = {
    id: 'own-' + review.id.slice(0, 8),
    author: clean(review.author),
    text: clean(review.text),
    tripDate: clean(review.tripDate),
    tripWith: clean(review.tripWith),
    published: clean(review.published),
    datePublished: clean(review.datePublished),
    source: 'santorinigid.com',
    sourceUrl:
      (env.SITE_URL || 'https://santorinigid.com') + '/reviews/#review-own-' + review.id.slice(0, 8),
  };
  // Благодарность владельца — рисуется на сайте тем же блоком,
  // что и его ответы у прежних отзывов с площадок.
  if (review.reply) entry.reply = clean(review.reply);
  if (photoUrls.length) entry.photos = photoUrls;

  // В начало массива; на сайте порядок всё равно задаёт сортировка по дате
  json.reviews.unshift(entry);
  const updated = JSON.stringify(json, null, 2) + '\n';

  // текст → base64 с поддержкой кириллицы
  const bytes = new TextEncoder().encode(updated);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));

  const putRes = await fetch(api, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Отзыв от ${review.author} — одобрен владельцем`,
      content: btoa(bin),
      sha: file.sha,
      branch,
    }),
  });

  if (!putRes.ok) throw new Error(`GitHub отклонил запись (${putRes.status})`);
}

/**
 * Снимает опубликованный отзыв с сайта: вырезает его объект из reviews.json
 * и удаляет файлы его фотографий. Владелец делает это сам, ссылкой из
 * письма или со страницы «Отзыв опубликован» — без правки файлов.
 * Возвращает false, если отзыва в файле уже нет.
 */
async function unpublishFromGitHub(id, env) {
  const ownId = 'own-' + id.slice(0, 8);
  const path = 'src/data/reviews.json';
  const api = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/`;
  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'santorinigid-reviews-worker',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const branch = env.GITHUB_BRANCH || 'main';

  const getRes = await fetch(`${api}${path}?ref=${branch}`, { headers });
  if (!getRes.ok) throw new Error(`GitHub не отдал файл (${getRes.status})`);
  const file = await getRes.json();
  const current = new TextDecoder().decode(
    Uint8Array.from(atob(file.content.replace(/\n/g, '')), (c) => c.charCodeAt(0)),
  );

  // С 06.08.2026 отзывы в JSON — ищем и вырезаем объект честным разбором
  let json;
  try {
    json = JSON.parse(current);
  } catch {
    throw new Error('reviews.json повреждён — ничего не тронуто');
  }
  const idx = Array.isArray(json.reviews) ? json.reviews.findIndex((r) => r.id === ownId) : -1;
  if (idx < 0) return false;

  // Файлы фотографий отзыва — тоже удаляем, мусора в репозитории не оставляем
  for (const u of json.reviews[idx].photos || []) {
    const p = `public${u}`;
    try {
      const fr = await fetch(`${api}${p}?ref=${branch}`, { headers });
      if (!fr.ok) continue;
      const f = await fr.json();
      await fetch(`${api}${p}`, {
        method: 'DELETE',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Фото удалённого отзыва ${ownId}`, sha: f.sha, branch }),
      });
    } catch {
      /* фото не удалилось — не страшно, главное убрать сам отзыв */
    }
  }

  json.reviews.splice(idx, 1);
  const updated = JSON.stringify(json, null, 2) + '\n';
  const bytes = new TextEncoder().encode(updated);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));

  const putRes = await fetch(`${api}${path}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Отзыв ${ownId} удалён владельцем с сайта`,
      content: btoa(bin),
      sha: file.sha,
      branch,
    }),
  });
  if (!putRes.ok) throw new Error(`GitHub отклонил запись (${putRes.status})`);
  return true;
}

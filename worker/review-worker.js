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
 *  3. Владимир жмёт «Опубликовать» → Worker дописывает отзыв в файл
 *     src/data/reviews.ts на GitHub.
 *  4. GitHub сообщает Cloudflare Pages, что файл изменился → сайт
 *     пересобирается сам. Через 2–3 минуты отзыв на сайте.
 *  5. Жмёт «Удалить» → отзыв стирается из KV и никуда не попадает.
 *
 * ГЛАВНОЕ: без нажатия Владимира на сайт не попадает НИЧЕГО.
 * Конкурент физически не может ничего опубликовать.
 *
 * ЧТО НУЖНО НАСТРОИТЬ (один раз, инструкция — docs/setup-reviews.md):
 *  Переменные (Settings → Variables):
 *    OWNER_EMAIL      — santorinivip@gmail.com
 *    GITHUB_REPO      — например vladimir/santorinigid
 *    GITHUB_BRANCH    — main
 *    SITE_URL         — https://santorinigid.com
 *  Секреты (Settings → Variables → Encrypt):
 *    GITHUB_TOKEN     — токен GitHub с правом repo
 *    RESEND_API_KEY   — ключ сервиса писем Resend (бесплатно 3000 писем/мес)
 *    ADMIN_SECRET     — длинная случайная строка, подпись кнопок в письме
 *  Хранилище (Settings → Bindings):
 *    REVIEWS          — KV namespace
 *
 * Цена вопроса: 0 ₽. Все сервисы в бесплатных тарифах с большим запасом.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/** Ответ в формате JSON. */
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });

/** Страница-ответ для Владимира после нажатия кнопки в письме. */
const page = (title, text, tone = 'ok') =>
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
 a{display:inline-block;margin-top:1.5rem;padding:.8em 1.8em;border-radius:999px;
   background:#1b6fa8;color:#fff;text-decoration:none;font-weight:600}
</style></head><body><div class="card">
<div class="ico">${tone === 'ok' ? '✓' : '🗑'}</div>
<h1>${title}</h1><p>${text}</p>
<a href="https://santorinigid.com/reviews">Открыть страницу отзывов</a>
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

    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    // --- 1. Гость отправил отзыв ---
    if (url.pathname === '/review' && request.method === 'POST') {
      return handleSubmit(request, env);
    }

    // --- 2. Владимир нажал кнопку в письме ---
    if (url.pathname === '/moderate' && request.method === 'GET') {
      return handleModerate(url, env);
    }

    return json({ error: 'Not found' }, 404);
  },
};

async function handleSubmit(request, env) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: 'Некорректные данные' }, 400);
  }

  // Ловушка для ботов: люди это поле не видят и не заполняют.
  if (data._gotcha) return json({ ok: true });

  const author = String(data.author || '').trim().slice(0, 80);
  const text = String(data.text || '').trim().slice(0, 5000);
  const contact = String(data.contact || '').trim().slice(0, 120);

  if (author.length < 2) return json({ error: 'Укажите, как вас зовут' }, 400);
  if (text.length < 30) return json({ error: 'Отзыв слишком короткий' }, 400);
  if (!contact) return json({ error: 'Укажите email или телефон' }, 400);

  // Фото: максимум 3, каждое до 5 МБ (в base64 объём вырастает примерно на треть)
  const photos = Array.isArray(data.photos) ? data.photos.slice(0, 3) : [];
  for (const p of photos) {
    if (typeof p !== 'string' || p.length > 7_000_000) {
      return json({ error: 'Фотография слишком большая' }, 400);
    }
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

  // Держим 60 дней — если Владимир не успел решить, отзыв не висит вечно.
  await env.REVIEWS.put(`pending:${id}`, JSON.stringify(review), {
    expirationTtl: 60 * 24 * 60 * 60,
  });

  await sendEmail(review, env);
  return json({ ok: true });
}

async function sendEmail(review, env) {
  const token = await sign(review.id, env.ADMIN_SECRET);
  const base = env.WORKER_URL || 'https://reviews.santorinigid.com';
  const approve = `${base}/moderate?id=${review.id}&action=approve&t=${token}`;
  const reject = `${base}/moderate?id=${review.id}&action=reject&t=${token}`;

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
      После нажатия «Опубликовать» отзыв появится на сайте автоматически через
      2–3 минуты. Пока вы не нажали — на сайте его нет.
      Если не решить в течение 60 дней, отзыв удалится сам.
    </p>
  </div>
</div>
</body></html>`;

  // Фотографии прикладываем к письму — чтобы Владимир видел их сразу
  const attachments = review.photos.map((p, i) => ({
    filename: `foto-${i + 1}.jpg`,
    content: p.replace(/^data:image\/\w+;base64,/, ''),
  }));

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Отзывы сайта <reviews@santorinigid.com>',
      to: [env.OWNER_EMAIL],
      reply_to: review.contact.includes('@') ? review.contact : undefined,
      subject: `Новый отзыв: ${review.author}`,
      html,
      attachments: attachments.length ? attachments : undefined,
    }),
  });

  if (!res.ok) {
    // Письмо не ушло — отзыв всё равно в KV, не потеряется.
    console.error('Не удалось отправить письмо:', await res.text());
  }
}

async function handleModerate(url, env) {
  const id = url.searchParams.get('id');
  const action = url.searchParams.get('action');
  const token = url.searchParams.get('t');

  if (!id || !action || !token) return page('Ссылка неполная', 'В адресе не хватает данных.', 'err');

  const expected = await sign(id, env.ADMIN_SECRET);
  if (!safeEqual(token, expected)) {
    return page('Ссылка недействительна', 'Подпись не совпала. Откройте ссылку из письма.', 'err');
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
    try {
      await publishToGitHub(review, env);
    } catch (e) {
      return page('Не удалось опубликовать', `Ошибка: ${esc(e.message)}`, 'err');
    }
    await env.REVIEWS.delete(`pending:${id}`);
    return page(
      'Отзыв опубликован',
      `Отзыв от ${esc(review.author)} появится на сайте через 2–3 минуты — сайт сейчас пересобирается.`,
      'ok',
    );
  }

  return page('Непонятное действие', 'Такой команды нет.', 'err');
}

/**
 * Дописываем отзыв в src/data/reviews.ts и коммитим на GitHub.
 * GitHub сообщит Cloudflare Pages — сайт пересоберётся сам.
 */
async function publishToGitHub(review, env) {
  const path = 'src/data/reviews.ts';
  const api = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'santorinigid-reviews-worker',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  const branch = env.GITHUB_BRANCH || 'main';
  const getRes = await fetch(`${api}?ref=${branch}`, { headers });
  if (!getRes.ok) throw new Error(`GitHub не отдал файл (${getRes.status})`);
  const file = await getRes.json();

  // base64 → текст с поддержкой кириллицы
  const current = new TextDecoder().decode(
    Uint8Array.from(atob(file.content.replace(/\n/g, '')), (c) => c.charCodeAt(0)),
  );

  const marker = 'const ALL: Review[] = [';
  const at = current.indexOf(marker);
  if (at < 0) throw new Error('В файле не найден массив отзывов');

  const q = (s) => JSON.stringify(String(s ?? '').replace(/\s+/g, ' ').trim());
  const entry = `
  {
    id: ${q('own-' + review.id.slice(0, 8))},
    author: ${q(review.author)},
    text: ${q(review.text)},
    tripDate: ${q(review.tripDate)},
    tripWith: ${q(review.tripWith)},
    published: ${q(review.published)},
    datePublished: ${q(review.datePublished)},
    source: ${q('santorinigid.com')},
    sourceUrl: ${q((env.SITE_URL || 'https://santorinigid.com') + '/reviews#review-own-' + review.id.slice(0, 8))},
  },`;

  const insertAt = at + marker.length;
  const updated = current.slice(0, insertAt) + entry + current.slice(insertAt);

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

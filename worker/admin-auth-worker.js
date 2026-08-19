/**
 * Посредник входа в админку /admin через GitHub.
 *
 * ЗАЧЕМ ОН НУЖЕН
 * Админка (Sveltia CMS) работает прямо в браузере, а GitHub при входе
 * требует обменять одноразовый код на ключ доступа СЕКРЕТОМ приложения.
 * Секрет нельзя класть в браузер (сайт открытый — его увидит любой),
 * поэтому обмен делает этот крошечный Worker. Больше он не умеет ничего:
 * не хранит ключи, не видит содержимое, просто меняет код на ключ
 * и передаёт его в окно админки.
 *
 * НАСТРОЙКА (один раз):
 *  1. Владелец создаёт на github.com OAuth App (инструкция в отчёте):
 *     Homepage URL:            https://santorinigid.com
 *     Authorization callback:  https://santorinigid-admin-auth.2026glai.workers.dev/callback
 *  2. Клиентский номер кладётся переменной GITHUB_CLIENT_ID
 *     (wrangler.toml не секрет), а секрет — командой владельца:
 *     npx wrangler secret put GITHUB_CLIENT_SECRET --config worker/wrangler-admin-auth.toml
 *  3. Деплой: npx wrangler deploy --config worker/wrangler-admin-auth.toml
 *
 * Протокол — стандартный для Decap/Sveltia CMS: /auth открывается
 * во всплывающем окне, /callback возвращает страничку, которая передаёт
 * ключ окну-родителю через postMessage и закрывается.
 */

/** Разрешённые окна-родители: только сама админка. */
const ALLOWED_ORIGINS = ['https://santorinigid.com', 'https://santoriniru.com', 'https://www.santoriniru.com'];

const html = (body) =>
  new Response(`<!doctype html><html lang="ru"><head><meta charset="utf-8"></head><body>${body}</body></html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Если чего-то не хватает — говорим, ЧЕГО ИМЕННО: это сразу видно
    // при проверке и избавляет от гаданий, какая из двух настроек пуста.
    const missing = [
      !env.GITHUB_CLIENT_ID && 'GITHUB_CLIENT_ID',
      !env.GITHUB_CLIENT_SECRET && 'GITHUB_CLIENT_SECRET',
    ].filter(Boolean);
    if (missing.length) {
      return html(`<p>Вход не настроен: нет ${missing.join(' и ')}.</p>`);
    }

    // Шаг 1: админка открывает /auth — отправляем на GitHub за разрешением.
    if (url.pathname === '/auth') {
      // Случайная метка против подделки запроса: вернётся в /callback
      // и обязана совпасть с копией в cookie этого же браузера.
      const state = crypto.randomUUID();
      const to = new URL('https://github.com/login/oauth/authorize');
      to.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
      to.searchParams.set('scope', 'repo');
      to.searchParams.set('state', state);
      return new Response(null, {
        status: 302,
        headers: {
          Location: to.href,
          'Set-Cookie': `oauth_state=${state}; Max-Age=600; Path=/; Secure; HttpOnly; SameSite=Lax`,
        },
      });
    }

    // Шаг 2: GitHub вернул одноразовый код — меняем на ключ доступа.
    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const cookieState = /(?:^|;\s*)oauth_state=([^;]+)/.exec(request.headers.get('Cookie') || '')?.[1];

      if (!code) return html('<p>GitHub не вернул код входа. Закройте окно и попробуйте ещё раз.</p>');
      if (!state || state !== cookieState) {
        return html('<p>Метка входа не совпала (защита от подделки). Закройте окно и попробуйте ещё раз.</p>');
      }

      const res = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      const data = await res.json();
      if (!data.access_token) {
        return html(`<p>GitHub отказал во входе: ${String(data.error || 'без причины').slice(0, 100)}</p>`);
      }

      /*
        Стандартное «рукопожатие» Decap/Sveltia: страничка сообщает
        родителю «authorizing:github», ждёт его отклика и только ему
        (проверив адрес!) передаёт ключ. Ключ не попадает ни в адресную
        строку, ни в историю браузера.
      */
      const payload = JSON.stringify({ token: data.access_token, provider: 'github' });
      return html(`<p>Вход выполнен, окно сейчас закроется…</p><script>
        (() => {
          const allowed = ${JSON.stringify(ALLOWED_ORIGINS)};
          window.addEventListener('message', (e) => {
            if (e.data === 'authorizing:github' && allowed.includes(e.origin)) {
              e.source.postMessage('authorization:github:success:' + ${JSON.stringify(payload)}, e.origin);
              window.close();
            }
          });
          if (window.opener) window.opener.postMessage('authorizing:github', '*');
        })();
      </script>`);
    }

    return new Response('Not found', { status: 404 });
  },
};

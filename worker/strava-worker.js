// Cloudflare Worker: ponte entre o app Treino e o Strava.
// Guarda o client secret (que não pode ficar no GitHub Pages) e repassa chamadas à API.
//
// Variáveis (Settings → Variables and Secrets):
//   STRAVA_CLIENT_ID      (texto)   ID do seu app em strava.com/settings/api
//   STRAVA_CLIENT_SECRET  (secret)  segredo do app
//   ALLOWED_ORIGIN        (texto)   ex: https://v1n1nam.github.io
//   WATER_KEY             (secret)  chave do app (gerada em Ajustes): protege atalhos de água e backup
// Binding (Settings → Bindings → KV namespace):
//   TREINO_KV                       namespace KV: água dos atalhos e backups do app

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };
    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

    // 1) Abre a tela de autorização do Strava.
    if (url.pathname === '/login') {
      const q = new URLSearchParams({
        client_id: env.STRAVA_CLIENT_ID,
        response_type: 'code',
        redirect_uri: `${url.origin}/callback`,
        approval_prompt: 'auto',
        scope: 'read,activity:read_all',
      });
      return Response.redirect(`https://www.strava.com/oauth/authorize?${q}`, 302);
    }

    // 2) Strava volta pra cá com o código; trocamos pelo token e mostramos pra copiar.
    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      if (!code) return page('<h1>Autorização cancelada</h1><p>Volte pro app e tente de novo.</p>');
      const t = await tokenRequest(env, { grant_type: 'authorization_code', code });
      if (!t.refresh_token) return page(`<h1>Erro</h1><pre>${esc(JSON.stringify(t, null, 2))}</pre>`);
      const name = esc(`${t.athlete?.firstname ?? ''} ${t.athlete?.lastname ?? ''}`.trim());
      return page(`
        <h1>Conectado${name ? `, ${name}` : ''} ✓</h1>
        <p>Copie o código abaixo e cole no app <b>Treino → Ajustes → Strava</b>.</p>
        <textarea id="c" readonly>${esc(t.refresh_token)}</textarea>
        <button onclick="navigator.clipboard.writeText(document.getElementById('c').value).then(()=>this.textContent='Copiado ✓')">Copiar código</button>
        <p class="m">Não compartilhe esse código: ele dá acesso de leitura às suas atividades.</p>`);
    }

    // 3) Renova o access token (expira a cada 6 h).
    if (url.pathname === '/refresh' && req.method === 'POST') {
      const { refresh_token } = await req.json().catch(() => ({}));
      if (!refresh_token) return json({ message: 'refresh_token ausente' }, 400);
      const t = await tokenRequest(env, { grant_type: 'refresh_token', refresh_token });
      return json(t, t.access_token ? 200 : 400);
    }

    // 4) Proxy de leitura da API: /api/athlete/activities → strava.com/api/v3/athlete/activities
    if (url.pathname.startsWith('/api/') && req.method === 'GET') {
      const target = `https://www.strava.com/api/v3/${url.pathname.slice(5)}${url.search}`;
      const r = await fetch(target, { headers: { Authorization: req.headers.get('Authorization') || '' } });
      return new Response(r.body, { status: r.status, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // 5) Água pelos atalhos do iPhone.
    //    /water/add?ml=500&key=...   → guarda (o atalho chama isso)
    //    /water/take?key=...         → devolve o pendente e limpa (o app chama ao abrir)
    if (url.pathname.startsWith('/water/')) {
      if (!env.TREINO_KV || !env.WATER_KEY) return json({ message: 'Configure TREINO_KV e WATER_KEY no Worker' }, 500);
      if (url.searchParams.get('key') !== env.WATER_KEY) return json({ message: 'Chave inválida' }, 401);
      const list = JSON.parse((await env.TREINO_KV.get('water')) || '[]');

      if (url.pathname === '/water/add') {
        const ml = Math.round(Number(String(url.searchParams.get('ml') || '').replace(',', '.')));
        if (!(ml > 0 && ml <= 5000)) return json({ message: 'ml inválido' }, 400);
        list.push({ ml, at: Date.now() });
        await env.TREINO_KV.put('water', JSON.stringify(list));
        const total = list.reduce((a, w) => a + w.ml, 0);
        return new Response(`+${ml} ml registrado`, { headers: { ...cors, 'Content-Type': 'text/plain; charset=utf-8', 'X-Pending-Ml': String(total) } });
      }
      if (url.pathname === '/water/take') {
        if (list.length) await env.TREINO_KV.put('water', '[]');
        return json(list);
      }
    }

    // 6) Backup do app.
    //    POST /backup/put?key=...            → guarda os dados (último + 1 cópia por dia, mantém 14 dias)
    //    GET  /backup/list?key=...           → lista os backups
    //    GET  /backup/get?key=...&name=...   → devolve um backup (sem name = o mais recente)
    if (url.pathname.startsWith('/backup/')) {
      if (!env.TREINO_KV || !env.WATER_KEY) return json({ message: 'Configure TREINO_KV e WATER_KEY no Worker' }, 500);
      if (url.searchParams.get('key') !== env.WATER_KEY) return json({ message: 'Chave inválida' }, 401);
      const KV = env.TREINO_KV;

      if (url.pathname === '/backup/put' && req.method === 'POST') {
        const body = await req.text();
        try {
          const data = JSON.parse(body);
          if (!Array.isArray(data.workouts) || !Array.isArray(data.sessions)) throw new Error();
        } catch {
          return json({ message: 'Backup inválido' }, 400);
        }
        const now = Date.now();
        const day = new Date(now).toISOString().slice(0, 10);
        const meta = { at: now, size: body.length };
        await KV.put('backup:latest', body, { metadata: meta });
        // Cópia diária (no máximo 1 gravação extra por dia) e limpeza das antigas.
        if ((await KV.get('backup:lastday')) !== day) {
          await KV.put(`backup:day:${day}`, body, { metadata: meta });
          await KV.put('backup:lastday', day);
          const days = (await KV.list({ prefix: 'backup:day:' })).keys.map((k) => k.name).sort();
          for (const old of days.slice(0, Math.max(0, days.length - 14))) await KV.delete(old);
        }
        return json({ ok: true, at: now });
      }
      if (url.pathname === '/backup/list') {
        const keys = (await KV.list({ prefix: 'backup:' })).keys.filter((k) => k.name !== 'backup:lastday');
        return json(keys.map((k) => ({ name: k.name, ...(k.metadata || {}) })).sort((a, b) => (b.at || 0) - (a.at || 0)));
      }
      if (url.pathname === '/backup/get') {
        const name = url.searchParams.get('name') || 'backup:latest';
        if (!name.startsWith('backup:') || name === 'backup:lastday') return json({ message: 'Nome inválido' }, 400);
        const value = await KV.get(name);
        if (!value) return json({ message: 'Nenhum backup encontrado' }, 404);
        return new Response(value, { headers: { ...cors, 'Content-Type': 'application/json' } });
      }
    }

    return json({ ok: true, service: 'treino-strava' });
  },
};

async function tokenRequest(env, params) {
  const r = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    body: new URLSearchParams({ client_id: env.STRAVA_CLIENT_ID, client_secret: env.STRAVA_CLIENT_SECRET, ...params }),
  });
  return r.json();
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function page(body) {
  return new Response(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Treino · Strava</title>
<style>body{font:16px -apple-system,system-ui,sans-serif;background:#0e0f12;color:#f2f3f5;padding:24px;max-width:480px;margin:auto}
h1{font-size:22px}textarea{width:100%;height:90px;background:#1f2228;color:#f2f3f5;border:0;border-radius:10px;padding:12px;font:14px monospace}
button{width:100%;margin-top:10px;padding:14px;border:0;border-radius:12px;background:#c6ff3d;color:#12160a;font-weight:700;font-size:16px}
.m{color:#8b919c;font-size:13px}pre{white-space:pre-wrap;color:#ff5a5f}</style></head><body>${body}</body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

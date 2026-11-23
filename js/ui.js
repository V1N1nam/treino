// Helpers de interface.

/** Cria elemento: h('div', { class: 'x', onClick: fn }, 'texto', outroEl) */
export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') el.value = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : String(kid));
  }
  return el;
}

export function header(title, { back, action } = {}) {
  return h('header', { class: 'top' },
    back ? h('a', { class: 'back', href: back }, '‹') : h('span'),
    h('h1', {}, title),
    action || h('span'),
  );
}

/** Painel que sobe de baixo. build(close) devolve o conteúdo. */
export function sheet(title, build) {
  const close = () => {
    bg.remove();
    document.body.classList.remove('noscroll');
  };
  const bg = h('div', { class: 'sheet-bg', onClick: (e) => e.target === bg && close() });
  const panel = h('div', { class: 'sheet' },
    h('div', { class: 'sheet-head' }, h('h2', {}, title), h('button', { class: 'link', onClick: close }, 'Fechar')),
  );
  panel.append(build(close));
  bg.append(panel);
  document.body.append(bg);
  document.body.classList.add('noscroll');
  return close;
}

export const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2200);
}

export const fmtDate = (ts) =>
  new Date(ts).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

export const fmtShortDate = (ts) =>
  new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

export function fmtDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  const p = (n) => String(n).padStart(2, '0');
  return hh ? `${hh}:${p(mm)}:${p(ss)}` : `${p(mm)}:${p(ss)}`;
}

export const fmtKg = (n) => (Math.round(n * 10) / 10).toLocaleString('pt-BR');

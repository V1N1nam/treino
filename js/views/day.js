// Tela do dia: semana no topo + abas Pré | Treino | Pós | Resultados.
import { dayPlan, hasActivity } from '../store.js';
import { h } from '../ui.js';
import { todayKey, addDays, startOfWeek, parseKey, fmtDayLong, WD_SHORT } from '../dates.js';
import { TYPES, planSummary } from '../plan.js';
import { mealsPanel } from './day-meals.js';
import { trainingPanel } from './day-training.js';
import { resultsPanel } from './day-results.js';

const TABS = [['pre', 'Pré'], ['treino', 'Treino'], ['pos', 'Pós'], ['resultados', 'Resultados']];

export function dayView(key, tab) {
  if (!key || key === 'today') key = todayKey();
  if (!TABS.some(([k]) => k === tab)) tab = 'treino';
  const plan = dayPlan(key);

  const panel = {
    pre: () => mealsPanel(key, 'pre'),
    treino: () => trainingPanel(key),
    pos: () => mealsPanel(key, 'post'),
    resultados: () => resultsPanel(key),
  }[tab]();

  return h('div', { class: 'page day' },
    weekStrip(key, tab),
    h('div', { class: 'day-title' },
      h('h1', {}, fmtDayLong(key), key === todayKey() && h('span', { class: 'badge' }, 'Hoje')),
      h('p', { class: 'muted' }, `${TYPES[plan.type].icon} ${planSummary(plan)}`),
    ),
    h('nav', { class: 'seg' }, TABS.map(([k, label]) => h('a', { href: `#/day/${key}/${k}`, class: k === tab ? 'on' : '' }, label))),
    panel,
  );
}

function weekStrip(key, tab) {
  const start = startOfWeek(key);
  const today = todayKey();
  return h('div', { class: 'week-strip' },
    h('a', { class: 'wk-nav', href: `#/day/${addDays(key, -7)}/${tab}` }, '‹'),
    Array.from({ length: 7 }, (_, i) => {
      const k = addDays(start, i);
      const d = parseKey(k);
      const cls = ['wk-day', k === key && 'on', k === today && 'today', hasActivity(k) && 'done'].filter(Boolean).join(' ');
      return h('a', { class: cls, href: `#/day/${k}/${tab}` },
        h('small', {}, WD_SHORT[d.getDay()]),
        h('strong', {}, d.getDate()),
        h('span', { class: 'wk-ico' }, TYPES[dayPlan(k).type].icon),
      );
    }),
    h('a', { class: 'wk-nav', href: `#/day/${addDays(key, 7)}/${tab}` }, '›'),
  );
}

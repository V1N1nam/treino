// Tela do dia: semana no topo + abas Pré | Treino | Pós | Resultados.
import { dayPlan, hasActivity, getDay, dayRef, update } from '../store.js';
import { rerender } from '../router.js';
import { waterTarget } from '../calc.js';
import { h } from '../ui.js';
import { todayKey, addDays, startOfWeek, parseKey, fmtDayLong, WD_SHORT } from '../dates.js';
import { planSummary, typeIcon } from '../plan.js';
import { icon } from '../icons.js';
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
      h('p', { class: 'plan-line' }, typeIcon(plan.type, 16), planSummary(plan)),
    ),
    waterBar(key),
    h('nav', { class: 'seg' }, TABS.map(([k, label]) => h('a', { href: `#/day/${key}/${k}`, class: k === tab ? 'on' : '' }, label))),
    panel,
  );
}

function weekStrip(key, tab) {
  const start = startOfWeek(key);
  const today = todayKey();
  return h('div', { class: 'week-strip' },
    h('a', { class: 'wk-nav', href: `#/day/${addDays(key, -7)}/${tab}`, 'aria-label': 'Semana anterior' }, icon('left', 18)),
    Array.from({ length: 7 }, (_, i) => {
      const k = addDays(start, i);
      const d = parseKey(k);
      const cls = ['wk-day', k === key && 'on', k === today && 'today', hasActivity(k) && 'done'].filter(Boolean).join(' ');
      return h('a', { class: cls, href: `#/day/${k}/${tab}` },
        h('small', {}, WD_SHORT[d.getDay()]),
        h('strong', {}, d.getDate()),
        h('span', { class: `wk-dot t-${dayPlan(k).type}` }),
      );
    }),
    h('a', { class: 'wk-nav', href: `#/day/${addDays(key, 7)}/${tab}`, 'aria-label': 'Próxima semana' }, icon('right', 18)),
  );
}

function waterBar(key) {
  const ml = getDay(key).water ?? 0;
  const target = waterTarget();
  const add = (d) => { update((s) => { const day = dayRef(s, key); day.water = Math.max(0, (day.water ?? 0) + d); }); rerender(); };
  const L = (v) => (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  return h('div', { class: 'water' },
    h('span', { class: 'water-ico' }, icon('drop', 18)),
    h('div', { class: 'grow' },
      h('div', { class: 'water-head' }, h('strong', {}, `${L(ml)} L`), h('span', { class: 'muted small' }, `de ${L(target)} L`)),
      h('div', { class: 'goal-bar' }, h('div', { class: ml >= target ? 'done' : '', style: `width:${Math.min(100, (ml / target) * 100)}%` }))),
    h('button', { class: 'btn-icon ghost', 'aria-label': 'Tirar 250 ml', onClick: () => add(-250) }, icon('minus', 16)),
    h('button', { class: 'btn small water-add', onClick: () => add(250) }, '+250 ml'),
  );
}

// Agenda: mês com o plano + resumo da semana + plano semanal editável.
import { getState, update, dayPlan, hasActivity, sessionsOn, runsOn } from '../store.js';
import { h, header, fmtKg } from '../ui.js';
import { rerender } from '../router.js';
import { todayKey, addDays, startOfWeek, dateKey, parseKey, WEEK_ORDER, WD_SHORT, WD_LONG, MONTHS } from '../dates.js';
import { TYPES, hasGym, hasRun, planEditor, planSummary } from '../plan.js';

let openWd = null;

export function calendarView(month) {
  const today = todayKey();
  const ref = month ? parseKey(month + '-01') : parseKey(today);
  ref.setDate(1);
  const monthKey = dateKey(ref).slice(0, 7);
  const prevM = dateKey(new Date(ref.getFullYear(), ref.getMonth() - 1, 1)).slice(0, 7);
  const nextM = dateKey(new Date(ref.getFullYear(), ref.getMonth() + 1, 1)).slice(0, 7);

  const first = startOfWeek(dateKey(ref));
  const cells = [];
  for (let k = first; cells.length < 42; k = addDays(k, 1)) {
    if (cells.length >= 35 && k.slice(0, 7) !== monthKey) break;
    cells.push(k);
  }

  return h('div', { class: 'page' },
    header('Agenda'),
    weekSummary(today),
    h('div', { class: 'card' },
      h('div', { class: 'card-head' },
        h('a', { class: 'btn-icon ghost', href: `#/calendar/${prevM}` }, '‹'),
        h('h2', { class: 'cap' }, `${MONTHS[ref.getMonth()]} ${ref.getFullYear()}`),
        h('a', { class: 'btn-icon ghost', href: `#/calendar/${nextM}` }, '›'),
      ),
      h('div', { class: 'month' },
        WEEK_ORDER.map((d) => h('small', { class: 'm-head' }, WD_SHORT[d][0])),
        cells.map((k) => {
          const cls = ['m-day', k.slice(0, 7) !== monthKey && 'out', k === today && 'today', hasActivity(k) && 'done', k < today && !hasActivity(k) && dayPlan(k).type !== 'rest' && 'missed'].filter(Boolean).join(' ');
          return h('a', { class: cls, href: `#/day/${k}/treino` }, h('span', {}, +k.slice(8)), h('i', {}, TYPES[dayPlan(k).type].icon));
        }),
      ),
      h('p', { class: 'muted tiny center' }, '● verde = treinou · número apagado = treino planejado que passou'),
    ),

    h('h3', { class: 'section pad-x' }, 'Plano semanal'),
    WEEK_ORDER.map((wd) => {
      const p = getState().plan[wd];
      return h('div', { class: 'card plan-row' },
        h('button', { class: 'plan-head', onClick: () => { openWd = openWd === wd ? null : wd; rerender(); } },
          h('span', { class: 'plan-ico' }, TYPES[p.type].icon),
          h('div', { class: 'grow' }, h('strong', {}, WD_LONG[wd]), h('small', { class: 'muted' }, planSummary(p))),
          h('span', { class: 'muted' }, openWd === wd ? '▴' : '▾')),
        openWd === wd && planEditor(p, (np) => { update((s) => (s.plan[wd] = np)); rerender(); }),
      );
    }),
  );
}

function weekSummary(today) {
  const start = startOfWeek(today);
  let plannedDays = 0, doneDays = 0, kmPlan = 0, kmDone = 0, gymPlan = 0, gymDone = 0;
  for (let i = 0; i < 7; i++) {
    const k = addDays(start, i), p = dayPlan(k);
    if (p.type !== 'rest') plannedDays++;
    if (hasActivity(k)) doneDays++;
    if (hasRun(p)) kmPlan += +p.km || 0;
    if (hasGym(p)) gymPlan++;
    kmDone += runsOn(k).reduce((a, r) => a + r.km, 0);
    gymDone += sessionsOn(k).length;
  }
  return h('div', { class: 'session-stats' },
    h('div', {}, h('small', {}, 'Semana'), h('strong', {}, `${doneDays}/${plannedDays} dias`)),
    h('div', {}, h('small', {}, 'Musculação'), h('strong', {}, `${gymDone}/${gymPlan}`)),
    h('div', {}, h('small', {}, 'Corrida'), h('strong', {}, `${fmtKg(kmDone)}/${fmtKg(kmPlan)} km`)),
  );
}

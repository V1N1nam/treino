// Aba Resultados: calorias, peso, esforço, ganhos/perdas e músculos.
import { getState, getDay, dayRef, update, sessionsOn, runsOn, exerciseName } from '../store.js';
import { h, toast, fmtKg } from '../ui.js';
import { rerender } from '../router.js';
import { fmtDM } from '../dates.js';
import { MUSCLES } from '../data/muscles.js';
import { bodyMap } from '../bodymap.js';
import { icon } from '../icons.js';
import { dayCalories, musclesFor, weekKeys, exerciseDeltas, volumeDelta, runDelta, lastWeightBefore, pace, fmtPace } from '../calc.js';

let muscleRange = 'dia';
const LEGEND_MAX = 6;

export function resultsPanel(key) {
  const trained = sessionsOn(key).length || runsOn(key).length;
  return h('div', { class: 'stack' },
    summaryCard(key),
    trained ? [effortCard(key), gainsCard(key)] :
      h('div', { class: 'card empty-card' },
        h('p', { class: 'muted small' }, 'Nenhum treino registrado neste dia.'),
        h('a', { class: 'btn small', href: `#/day/${key}/treino` }, 'Ir para o treino')),
    musclesCard(key),
  );
}

function summaryCard(key) {
  const c = dayCalories(key);
  const w = getDay(key).weight;
  const prev = lastWeightBefore(key);
  const diff = w && prev ? w - prev.weight : null;
  const signed = (n, d = 0) => `${n > 0 ? '+' : ''}${d ? fmtKg(n) : Math.round(n)}`;

  return h('div', { class: 'card' },
    h('div', { class: 'stats3' },
      stat('Ingerido', Math.round(c.intake), 'kcal'),
      stat('Gasto', Math.round(c.burned), 'kcal'),
      stat('Saldo', signed(c.balance), 'kcal', c.balance < 0 ? 'down' : ''),
    ),
    h('div', { class: 'line-row' },
      h('span', { class: 'muted' }, 'Peso'),
      diff != null && h('span', { class: `delta-chip ${diff <= 0 ? 'neg' : 'pos'}` }, `${signed(diff, 1)} kg`),
      h('div', { class: 'row tight' },
        h('input', { type: 'number', inputmode: 'decimal', step: '0.1', class: 'num-input', value: w ?? '', placeholder: prev ? fmtKg(prev.weight) : '—',
          onChange: (e) => { const v = +e.target.value.replace(',', '.') || null; update((s) => { dayRef(s, key).weight = v; if (v) s.settings.weight = v; }); rerender(); } }),
        h('span', { class: 'muted small' }, 'kg')),
    ),
  );
}

function effortCard(key) {
  const day = getDay(key);
  const c = dayCalories(key);
  const runs = runsOn(key);
  const rpe = day.rpe ?? (runs.length ? Math.round(runs.reduce((a, r) => a + r.rpe, 0) / runs.length) : null);
  const label = (r) => (r <= 3 ? 'Leve' : r <= 6 ? 'Moderado' : r <= 8 ? 'Forte' : 'Máximo');

  return h('div', { class: 'card' },
    h('div', { class: 'card-head' },
      h('h3', { class: 'section' }, 'Esforço percebido'),
      rpe && h('span', { class: 'muted small' }, `${label(rpe)} · carga ${Math.round(rpe * (c.gymMin + c.runMin))}`)),
    h('div', { class: 'rpe-row' }, Array.from({ length: 10 }, (_, i) => h('button', {
      class: `rpe ${rpe === i + 1 ? 'on' : ''} ${rpe && i + 1 <= rpe ? 'fill' : ''}`,
      onClick: () => { update((s) => (dayRef(s, key).rpe = i + 1)); rerender(); },
    }, i + 1))),
  );
}

function gainsCard(key) {
  const rows = [];
  for (const s of sessionsOn(key)) {
    const vd = volumeDelta(s);
    if (vd) rows.push(deltaRow('Volume total', `${fmtKg(vd.now)} kg`, vd.pct, `${vd.pct >= 0 ? '+' : ''}${vd.pct.toFixed(0)}%`));
    for (const d of exerciseDeltas(s)) {
      const diff = d.prev ? d.now.e1rm - d.prev.e1rm : null;
      rows.push(deltaRow(exerciseName(d.exerciseId), `${fmtKg(d.now.kg)} × ${d.now.reps}`, diff,
        diff == null ? 'novo' : `${diff >= 0 ? '+' : ''}${fmtKg(diff)} kg`, `#/progress/${d.exerciseId}`));
    }
  }
  for (const r of runsOn(key)) {
    const d = runDelta(r, key);
    rows.push(deltaRow(`${r.kind} ${fmtKg(r.km)} km`, fmtPace(pace(r)), d ? -d.diff : null,
      d ? `${d.diff <= 0 ? '−' : '+'}${Math.abs(Math.round(d.diff))} s/km` : 'novo'));
  }
  return h('div', { class: 'card' },
    h('div', { class: 'card-head' }, h('h3', { class: 'section' }, 'Comparado à última vez')),
    h('div', { class: 'list' }, rows),
  );
}

function deltaRow(title, value, diff, note, href) {
  const dir = diff == null ? 0 : diff > 0.05 ? 1 : diff < -0.05 ? -1 : 0;
  const cls = diff == null ? 'new' : dir > 0 ? 'pos' : dir < 0 ? 'neg' : 'flat';
  return h(href ? 'a' : 'div', { class: 'list-row', href },
    h('div', { class: 'grow' }, h('span', {}, title), h('small', { class: 'muted' }, value)),
    h('span', { class: `delta-chip ${cls}` },
      dir > 0 ? icon('arrowUp', 13) : dir < 0 ? icon('arrowDown', 13) : null, note),
  );
}

function musclesCard(key) {
  const values = musclesFor(muscleRange === 'dia' ? [key] : weekKeys(key));
  const sorted = Object.entries(values).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] ?? 1;
  const fmtSets = (v) => (Math.round(v * 10) / 10).toLocaleString('pt-BR');

  return h('div', { class: 'card' },
    h('div', { class: 'card-head' },
      h('h3', { class: 'section' }, 'Músculos trabalhados'),
      h('div', { class: 'seg mini' }, ['dia', 'semana'].map((r) =>
        h('button', { class: muscleRange === r ? 'on' : '', onClick: () => { muscleRange = r; rerender(); } }, r === 'dia' ? 'Dia' : '7 dias'))),
    ),
    bodyMap(values, (m, label, v) => toast(`${label}: ${v ? fmtSets(v) + ' séries' : 'sem séries'}`)),
    sorted.length > 0 && h('div', { class: 'legend' }, sorted.slice(0, LEGEND_MAX).map(([m, v]) => h('div', { class: 'legend-row' },
      h('span', {}, MUSCLES[m]),
      h('div', { class: 'bar' }, h('div', { style: `width:${(v / max) * 100}%` })),
      h('strong', {}, fmtSets(v)),
    ))),
  );
}

const stat = (label, value, unit, cls = '') => h('div', { class: 'stat' },
  h('small', {}, label), h('strong', { class: cls }, value), unit && h('span', { class: 'unit' }, unit));

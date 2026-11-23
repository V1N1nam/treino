// Aba Resultados: calorias, peso, esforço, ganhos/perdas e músculos.
import { getState, getDay, dayRef, update, sessionsOn, runsOn, exerciseName } from '../store.js';
import { h, toast, fmtKg } from '../ui.js';
import { rerender } from '../router.js';
import { fmtDM } from '../dates.js';
import { MUSCLES } from '../data/muscles.js';
import { bodyMap, heat } from '../bodymap.js';
import { icon } from '../icons.js';
import { dayCalories, musclesFor, weekKeys, exerciseDeltas, volumeDelta, runDelta, lastWeightBefore, pace, fmtPace, waterTarget, hrZone, weightTrendClass } from '../calc.js';

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
  const day = getDay(key);
  const w = day.weight;
  const prev = lastWeightBefore(key);
  const diff = w && prev ? w - prev.weight : null;
  const signed = (n, d = 0) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${d ? fmtKg(Math.abs(n)) : Math.abs(Math.round(n)).toLocaleString('pt-BR')}`;
  const set = (fn) => { update((s) => fn(dayRef(s, key))); rerender(); };
  const water = day.water ?? 0, wt = waterTarget();

  return h('div', { class: 'card' },
    c.ready ? [
      goalBar('Calorias', c.intake, c.target, 'kcal'),
      goalBar('Proteína', c.protein, c.protTarget, 'g'),
    ] : h('a', { class: 'profile-hint', href: '#/settings' }, 'Complete seu perfil em Ajustes pra ver metas e o saldo real do dia', icon('right', 16)),
    h('div', { class: 'stats3' },
      stat('Ingerido', Math.round(c.intake).toLocaleString('pt-BR'), 'kcal'),
      stat('Gasto', Math.round(c.burned).toLocaleString('pt-BR'), c.ready ? 'basal + treinos' : 'só treinos'),
      stat('Saldo', signed(c.balance), c.balance < 0 ? 'kcal de déficit' : 'kcal de superávit'),
    ),
    h('div', { class: 'line-row' },
      h('span', { class: 'muted' }, 'Resto do dia'),
      h('div', { class: 'row tight' },
        h('input', { type: 'number', inputmode: 'numeric', class: 'num-input', value: day.extraKcal ?? '', placeholder: '0',
          onChange: (e) => set((d) => (d.extraKcal = +e.target.value || 0)) }),
        h('span', { class: 'muted small unit-w' }, 'kcal'),
        h('input', { type: 'number', inputmode: 'numeric', class: 'num-input', value: day.extraProt ?? '', placeholder: '0',
          onChange: (e) => set((d) => (d.extraProt = +e.target.value || 0)) }),
        h('span', { class: 'muted small unit-w' }, 'g prot')),
    ),
    h('div', { class: 'line-row' },
      h('span', { class: 'muted' }, 'Peso'),
      diff != null && h('span', { class: `delta-chip ${weightTrendClass(diff)}` }, `${signed(diff, 1)} kg`),
      h('div', { class: 'row tight' },
        h('input', { type: 'number', inputmode: 'decimal', step: '0.1', class: 'num-input', value: w ?? '', placeholder: prev ? fmtKg(prev.weight) : '—',
          onChange: (e) => { const v = +e.target.value.replace(',', '.') || null; update((s) => { dayRef(s, key).weight = v; if (v) s.settings.weight = v; }); rerender(); } }),
        h('span', { class: 'muted small unit-w' }, 'kg')),
    ),
    h('div', { class: 'line-row' },
      h('span', { class: 'muted' }, 'Água'),
      h('span', { class: 'small' }, `${(water / 1000).toLocaleString('pt-BR')} / ${(wt / 1000).toLocaleString('pt-BR')} L`),
      h('div', { class: 'row tight' },
        h('button', { class: 'btn-icon ghost', 'aria-label': 'Menos água', onClick: () => set((d) => (d.water = Math.max(0, (d.water ?? 0) - 250))) }, icon('minus', 16)),
        h('button', { class: 'btn small', onClick: () => set((d) => (d.water = (d.water ?? 0) + 250)) }, '+250 ml')),
    ),
  );
}

function goalBar(label, value, target, unit) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  const left = target - value;
  return h('div', { class: 'goal' },
    h('div', { class: 'goal-head' },
      h('span', {}, label),
      h('span', { class: 'muted small' },
        h('strong', { class: 'goal-val' }, Math.round(value).toLocaleString('pt-BR')), ` / ${Math.round(target).toLocaleString('pt-BR')} ${unit}`)),
    h('div', { class: 'goal-bar' }, h('div', { class: left < 0 ? 'over' : '', style: `width:${pct}%` })),
    h('small', { class: 'muted' }, left >= 0 ? `Faltam ${Math.round(left).toLocaleString('pt-BR')} ${unit}` : `${Math.round(-left).toLocaleString('pt-BR')} ${unit} acima da meta`),
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
    const z = hrZone(r.hr);
    rows.push(deltaRow(`${r.kind} ${fmtKg(r.km)} km`, `${fmtPace(pace(r))}${z ? ` · ${z.code} ${z.label}` : ''}`, d ? -d.diff : null,
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
      h('div', { class: 'bar' }, h('div', { style: `width:${(v / max) * 100}%;background:${heat(v / max)}` })),
      h('strong', {}, fmtSets(v)),
    ))),
  );
}

const stat = (label, value, unit, cls = '') => h('div', { class: 'stat' },
  h('small', {}, label), h('strong', { class: cls }, value), unit && h('span', { class: 'unit' }, unit));

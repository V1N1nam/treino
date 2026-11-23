// Aba Resultados: calorias, peso, intensidade, ganhos/perdas e músculos.
import { getState, getDay, dayRef, update, sessionsOn, runsOn, exerciseName } from '../store.js';
import { h, toast, fmtKg } from '../ui.js';
import { rerender } from '../router.js';
import { fmtDM } from '../dates.js';
import { MUSCLES } from '../data/muscles.js';
import { bodyMap } from '../bodymap.js';
import { dayCalories, musclesFor, weekKeys, exerciseDeltas, volumeDelta, runDelta, lastWeightBefore, pace, fmtPace } from '../calc.js';

let muscleRange = 'dia';

export function resultsPanel(key) {
  const sessions = sessionsOn(key), runs = runsOn(key);
  const active = sessions.length || runs.length;

  return h('div', { class: 'stack' },
    caloriesCard(key),
    weightCard(key),
    active ? [intensityCard(key), gainsCard(key, sessions, runs)] :
      h('div', { class: 'card empty-card' }, h('p', { class: 'muted' }, 'Sem treino registrado neste dia ainda.'), h('a', { class: 'btn block', href: `#/day/${key}/treino` }, 'Ir pro treino')),
    musclesCard(key),
  );
}

function caloriesCard(key) {
  const c = dayCalories(key);
  const { weight } = getState().settings;
  const signed = (n) => `${n > 0 ? '+' : ''}${Math.round(n)}`;
  return h('div', { class: 'card' },
    h('h3', { class: 'section' }, 'Calorias'),
    h('div', { class: 'cal-row' },
      stat('Ingerido', Math.round(c.intake), 'pré + pós'),
      stat('Gasto', Math.round(c.burned), 'treinos'),
      stat('Saldo', signed(c.balance), c.balance >= 0 ? 'superávit' : 'déficit', c.balance >= 0 ? 'up' : 'down'),
    ),
    (c.gym || c.run) && h('p', { class: 'muted small' },
      [c.gym && `Musculação ~${Math.round(c.gym)} kcal (${Math.round(c.gymMin)} min)`, c.run && `Corrida ~${Math.round(c.run)} kcal`].filter(Boolean).join(' · ')),
    c.protein > 0 && h('p', { class: 'muted small' }, `Proteína no pré/pós: ${fmtKg(c.protein)} g (${fmtKg(c.protein / weight)} g/kg)`),
    h('p', { class: 'muted tiny' }, `Estimativa com ${fmtKg(weight)} kg. O gasto não inclui seu metabolismo basal.`),
  );
}

function weightCard(key) {
  const w = getDay(key).weight;
  const prev = lastWeightBefore(key);
  const diff = w && prev ? w - prev.weight : null;
  return h('div', { class: 'card' },
    h('div', { class: 'card-head' },
      h('div', {}, h('h3', { class: 'section' }, 'Peso corporal'),
        diff != null ? h('p', { class: diff <= 0 ? 'down-good' : 'up' }, `${diff > 0 ? '+' : ''}${fmtKg(diff)} kg desde ${fmtDM(prev.key)}`)
          : h('p', { class: 'muted small' }, prev ? `Último: ${fmtKg(prev.weight)} kg em ${fmtDM(prev.key)}` : 'Registre pra acompanhar ganho/perda')),
      h('div', { class: 'row tight' },
        h('input', { type: 'number', inputmode: 'decimal', step: '0.1', class: 'km-input', value: w ?? '', placeholder: 'kg',
          onChange: (e) => { const v = +e.target.value.replace(',', '.') || null; update((s) => { dayRef(s, key).weight = v; if (v) s.settings.weight = v; }); rerender(); } }),
        h('span', { class: 'muted' }, 'kg')),
    ),
  );
}

const RPE_LABEL = (r) => (r <= 3 ? 'Leve' : r <= 6 ? 'Moderado' : r <= 8 ? 'Forte' : 'Máximo');

function intensityCard(key) {
  const day = getDay(key);
  const c = dayCalories(key);
  const runs = runsOn(key);
  const rpe = day.rpe ?? (runs.length ? Math.round(runs.reduce((a, r) => a + r.rpe, 0) / runs.length) : null);
  const minutes = c.gymMin + c.runMin;
  const sessions = sessionsOn(key);
  const planned = sessions.reduce((n, s) => n + s.entries.reduce((m, e) => m + (+e.target?.sets || e.sets.length), 0), 0);
  const done = sessions.reduce((n, s) => n + s.entries.reduce((m, e) => m + e.sets.length, 0), 0);

  return h('div', { class: 'card' },
    h('h3', { class: 'section' }, 'Intensidade'),
    h('p', { class: 'muted small' }, 'Quão pesado foi o dia? (esforço percebido)'),
    h('div', { class: 'rpe-row' }, Array.from({ length: 10 }, (_, i) => h('button', {
      class: `rpe ${rpe === i + 1 ? 'on' : ''}`, style: `--h:${110 - i * 11}`,
      onClick: () => { update((s) => (dayRef(s, key).rpe = i + 1)); rerender(); },
    }, i + 1))),
    rpe && h('div', { class: 'cal-row' },
      stat('Esforço', `${rpe}/10`, RPE_LABEL(rpe)),
      stat('Carga', Math.round(rpe * minutes), 'RPE × min'),
      planned > 0 && stat('Séries', `${done}/${planned}`, `${Math.round((done / planned) * 100)}% do plano`),
    ),
  );
}

function gainsCard(key, sessions, runs) {
  const rows = [];
  for (const s of sessions) {
    const vd = volumeDelta(s);
    if (vd) rows.push(deltaRow(`Volume · ${s.workoutName}`, `${fmtKg(vd.now)} kg`, vd.pct, `${vd.pct >= 0 ? '+' : ''}${vd.pct.toFixed(0)}% vs ${fmtDM(vd.date)}`));
    for (const d of exerciseDeltas(s)) {
      const diff = d.prev ? d.now.e1rm - d.prev.e1rm : null;
      rows.push(deltaRow(exerciseName(d.exerciseId), `${fmtKg(d.now.kg)} kg × ${d.now.reps}`, diff,
        diff == null ? 'primeira vez 🆕' : `${diff >= 0 ? '+' : ''}${fmtKg(diff)} kg 1RM vs ${fmtDM(d.prevDate)}`,
        `#/progress/${d.exerciseId}`));
    }
  }
  for (const r of runs) {
    const d = runDelta(r, key);
    // Pace menor = melhor, então inverte o sinal.
    rows.push(deltaRow(`${r.kind} · ${fmtKg(r.km)} km`, fmtPace(pace(r)), d ? -d.diff : null,
      d ? `${d.diff <= 0 ? '' : '+'}${Math.round(d.diff)} s/km vs ${fmtDM(d.date)}` : 'primeira desse tipo 🆕'));
  }

  const ups = rows.filter((r) => r.dir > 0).length, downs = rows.filter((r) => r.dir < 0).length;
  return h('div', { class: 'card' },
    h('div', { class: 'card-head' }, h('h3', { class: 'section' }, 'Ganhos e perdas'),
      h('small', {}, h('span', { class: 'up' }, `▲ ${ups}`), '  ', h('span', { class: 'down' }, `▼ ${downs}`))),
    rows.map((r) => r.node),
  );
}

function deltaRow(title, value, diff, note, href) {
  const dir = diff == null ? 0 : diff > 0.05 ? 1 : diff < -0.05 ? -1 : 0;
  const icon = diff == null ? '•' : dir > 0 ? '▲' : dir < 0 ? '▼' : '=';
  const node = h(href ? 'a' : 'div', { class: 'delta-row', href },
    h('span', { class: `delta-ico ${dir > 0 ? 'up' : dir < 0 ? 'down' : 'muted'}` }, icon),
    h('div', { class: 'grow' }, h('strong', {}, title), h('small', { class: dir > 0 ? 'up' : dir < 0 ? 'down' : 'muted' }, note)),
    h('span', { class: 'delta-val' }, value),
  );
  return { node, dir };
}

function musclesCard(key) {
  const keys = muscleRange === 'dia' ? [key] : weekKeys(key);
  const values = musclesFor(keys);
  const sorted = Object.entries(values).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] ?? 1;
  const fmtSets = (v) => (Math.round(v * 10) / 10).toLocaleString('pt-BR');

  return h('div', { class: 'card' },
    h('div', { class: 'card-head' },
      h('h3', { class: 'section' }, 'Músculos trabalhados'),
      h('div', { class: 'seg mini' }, ['dia', 'semana'].map((r) =>
        h('button', { class: muscleRange === r ? 'on' : '', onClick: () => { muscleRange = r; rerender(); } }, r === 'dia' ? 'Dia' : '7 dias'))),
    ),
    bodyMap(values, (m, label, v) => toast(`${label}: ${v ? fmtSets(v) + ' séries' : 'não trabalhado'}`)),
    !sorted.length && h('p', { class: 'muted small center' }, 'Toque num músculo pra ver o nome.'),
    h('div', { class: 'legend' }, sorted.map(([m, v]) => h('div', { class: 'legend-row' },
      h('span', {}, MUSCLES[m]),
      h('div', { class: 'macro-track' }, h('div', { style: `width:${(v / max) * 100}%;background:var(--accent)` })),
      h('strong', {}, fmtSets(v)),
    ))),
    sorted.length > 0 && h('p', { class: 'muted tiny' }, 'Séries: músculo principal conta 1, auxiliar 0,5. Corrida soma por km.'),
  );
}

const stat = (label, value, sub, cls = '') => h('div', { class: 'stat' },
  h('small', {}, label), h('strong', { class: cls }, value), sub && h('small', { class: 'muted' }, sub));

// Aba Treino: plano do dia, iniciar musculação, registrar corrida.
import { getState, update, uid, dayPlan, dayRef, sessionsOn, runsOn, startSession, sessionVolume, exerciseName } from '../store.js';
import { h, toast, fmtDuration, fmtKg } from '../ui.js';
import { go, rerender } from '../router.js';
import { RUN_KINDS, hasGym, hasRun, planEditor } from '../plan.js';
import { icon } from '../icons.js';
import { pace, fmtPace } from '../calc.js';
import { stravaReady, stravaRunsOn, toRun } from '../strava.js';

const found = {}; // corridas do Strava por dia: undefined | 'loading' | { list } | { error }

async function fetchStrava(key) {
  found[key] = 'loading';
  rerender();
  try { found[key] = { list: await stravaRunsOn(key) }; }
  catch (e) { found[key] = { error: e.message }; }
  rerender();
}

let editingKey = null; // dia com o editor "mudar só hoje" aberto

export function trainingPanel(key) {
  const plan = dayPlan(key);
  const override = !!getState().days[key]?.plan;

  const setOverride = (p) => { update((s) => (dayRef(s, key).plan = p)); rerender(); };
  const clearOverride = () => { update((s) => delete dayRef(s, key).plan); editingKey = null; rerender(); };

  return h('div', { class: 'stack' },
    editingKey === key
      ? h('div', { class: 'card' },
          h('div', { class: 'card-head' }, h('h3', { class: 'section' }, 'Plano deste dia'),
            h('button', { class: 'link', onClick: () => { editingKey = null; rerender(); } }, 'Concluir')),
          planEditor(plan, setOverride),
          override && h('button', { class: 'btn ghost small', onClick: clearOverride }, 'Voltar ao plano semanal'))
      : h('button', { class: 'plan-change', onClick: () => { editingKey = key; rerender(); } },
          override ? 'Plano alterado neste dia' : 'Alterar plano deste dia', icon('right', 16)),
    plan.type === 'rest' && h('div', { class: 'card empty-card' },
      h('p', {}, 'Dia de descanso.'),
      h('p', { class: 'muted small' }, 'Recuperação faz parte do treino.')),
    hasGym(plan) && gymBlock(key, plan),
    hasRun(plan) && runBlock(key, plan),
    plan.type !== 'rest' && !hasRun(plan) && runsOn(key).length > 0 && runBlock(key, plan),
  );
}

function gymBlock(key, plan) {
  const { workouts, active } = getState();
  const done = sessionsOn(key);
  const planned = workouts.find((w) => w.id === plan.workoutId);
  let chosen = planned?.id ?? workouts[0]?.id ?? '';

  const start = (w) => {
    if (active) return go('#/session');
    startSession(w, key);
    go('#/session');
  };

  return h('div', { class: 'card' },
    h('h3', { class: 'section' }, 'Musculação'),
    done.map((s) => h('a', { class: 'done-row', href: `#/history/${s.id}` },
      h('span', { class: 'ok' }, icon('check', 14)),
      h('div', { class: 'grow' }, h('strong', {}, s.workoutName), h('small', { class: 'muted' },
        `${fmtDuration(s.end - s.start)} · ${s.entries.reduce((n, e) => n + e.sets.length, 0)} séries · ${fmtKg(sessionVolume(s))} kg`)),
      h('span', { class: 'muted' }, icon('right', 16)))),

    active ? h('button', { class: 'btn primary block', onClick: () => go('#/session') }, `▶ Continuar ${active.workoutName}`) : [
      planned && h('div', { class: 'planned' },
        h('strong', {}, planned.name),
        h('p', { class: 'ex-list' }, planned.items.map((it) => `${exerciseName(it.exerciseId)} ${it.sets}×${it.reps}`).join(' · '))),
      !planned && workouts.length > 0 && h('select', { onChange: (e) => (chosen = e.target.value) },
        workouts.map((w) => h('option', { value: w.id }, w.name))),
      !workouts.length && h('p', { class: 'muted' }, 'Você ainda não tem fichas. Crie uma ou faça um treino livre.'),
      h('div', { class: 'row' },
        workouts.length > 0 && h('button', { class: 'btn primary grow', onClick: () => start(workouts.find((w) => w.id === (planned?.id ?? chosen))) }, done.length ? 'Treinar de novo' : 'Iniciar treino'),
        h('button', { class: `btn ${workouts.length ? '' : 'primary'} grow`, onClick: () => start(null) }, 'Treino livre'),
      ),
      !workouts.length && h('a', { class: 'btn block', href: '#/workout/new' }, 'Criar ficha'),
    ],
  );
}

function runBlock(key, plan) {
  const runs = runsOn(key);
  const v = { km: plan.km || '', min: '', sec: '', kind: plan.runKind, rpe: 6, hr: '' };

  const saveRun = () => {
    const km = +String(v.km).replace(',', '.');
    const sec = (+v.min || 0) * 60 + (+v.sec || 0);
    if (!km || !sec) return toast('Preencha distância e tempo');
    update((s) => dayRef(s, key).runs.push({ id: uid(), km, sec, kind: v.kind, rpe: +v.rpe, hr: +v.hr || null }));
    toast('Corrida salva');
    rerender();
  };
  const removeRun = (id) => {
    if (!confirm('Apagar esta corrida?')) return;
    update((s) => (dayRef(s, key).runs = dayRef(s, key).runs.filter((r) => r.id !== id)));
    rerender();
  };

  const imported = new Set(runs.map((r) => r.stravaId).filter(Boolean));
  const importRuns = async (acts) => {
    toast('Importando…');
    const fresh = [];
    for (const a of acts) fresh.push(await toRun(a, plan.runKind));
    update((s) => dayRef(s, key).runs.push(...fresh));
    toast(fresh.length > 1 ? `${fresh.length} corridas importadas` : 'Corrida importada');
    rerender();
  };
  // Busca automática uma vez quando o dia tem corrida e nada registrado.
  if (stravaReady() && found[key] === undefined && hasRun(plan) && !runs.length) setTimeout(() => fetchStrava(key));
  const st = found[key];
  const pending = st?.list?.filter((a) => !imported.has(a.id)) ?? [];

  const stravaBox = stravaReady()
    ? h('div', { class: 'strava-box' },
        h('div', { class: 'row' },
          h('strong', { class: 'grow strava-t' }, 'Strava'),
          h('button', { class: 'btn small', onClick: () => fetchStrava(key), disabled: st === 'loading' }, st === 'loading' ? 'Buscando…' : [icon('refresh', 15), ' Buscar'])),
        st?.error && h('p', { class: 'down small' }, st.error),
        st?.list && !pending.length && h('p', { class: 'muted small' }, st.list.length ? 'Tudo do Strava nesse dia já foi importado.' : 'Nenhuma corrida no Strava nesse dia.'),
        pending.map((a) => h('div', { class: 'done-row' },
          h('div', { class: 'grow' }, h('strong', {}, a.name),
            h('small', { class: 'muted' }, `${fmtKg(a.distance / 1000)} km · ${fmtDuration(a.moving_time * 1000)} · ${fmtPace(a.moving_time / (a.distance / 1000))}${a.average_heartrate ? ` · ${Math.round(a.average_heartrate)} bpm` : ''}`)),
          h('button', { class: 'btn small primary', onClick: () => importRuns([a]) }, 'Importar'))),
        pending.length > 1 && h('button', { class: 'btn primary block', onClick: () => importRuns(pending) }, `Importar todas (${pending.length})`),
      )
    : h('a', { class: 'strava-link', href: '#/settings' }, icon('link', 16), 'Conectar Strava');

  const num = (k, ph, attrs = {}) => h('input', { type: 'number', inputmode: 'decimal', placeholder: ph, value: v[k], ...attrs, onInput: (e) => (v[k] = e.target.value) });

  return h('div', { class: 'card' },
    h('h3', { class: 'section' }, 'Corrida'),
    hasRun(plan) && h('p', { class: 'muted small' }, `Meta: ${plan.runKind}, ${String(plan.km).replace('.', ',')} km`),
    runs.map((r) => h('div', { class: 'done-row' },
      h('span', { class: 'ok' }, icon('check', 14)),
      h('div', { class: 'grow' }, h('strong', {}, `${r.kind} · ${fmtKg(r.km)} km`),
        h('small', { class: 'muted' }, `${fmtDuration(r.sec * 1000)} · ${fmtPace(pace(r))} · RPE ${r.rpe}${r.hr ? ` · ${r.hr} bpm` : ''}`)),
      h('button', { class: 'btn-icon ghost', onClick: () => removeRun(r.id), 'aria-label': 'Apagar' }, icon('x', 16)))),
    stravaBox,
    h('details', { class: 'manual', open: !stravaReady() },
      h('summary', {}, 'Registrar manualmente'),
    h('div', { class: 'form' },
      h('div', { class: 'row' },
        field('Distância (km)', num('km', '5', { step: '0.01' })),
        field('Tempo', h('div', { class: 'row tight' }, num('min', 'min'), h('span', {}, ':'), num('sec', 'seg'))),
      ),
      h('div', { class: 'row' },
        field('Tipo', h('select', { onChange: (e) => (v.kind = e.target.value) }, RUN_KINDS.map((k) => h('option', { value: k, selected: k === v.kind }, k)))),
        field('Esforço (1-10)', h('select', { onChange: (e) => (v.rpe = e.target.value) }, Array.from({ length: 10 }, (_, i) => h('option', { value: i + 1, selected: i + 1 === v.rpe }, i + 1)))),
        field('FC média', num('hr', 'bpm')),
      ),
      h('button', { class: 'btn primary block', onClick: saveRun }, 'Salvar corrida'),
    )),
  );
}

const field = (label, input) => h('label', { class: 'field' }, h('span', {}, label), input);

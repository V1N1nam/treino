// Tipos de dia e editor de plano (usado no calendário e na troca de um dia).
import { getState } from './store.js';
import { h } from './ui.js';
import { icon } from './icons.js';

export const TYPES = {
  gym: { label: 'Musculação', icon: 'dumbbell' },
  run: { label: 'Corrida', icon: 'run' },
  hybrid: { label: 'Híbrido', icon: 'hybrid' },
  rest: { label: 'Descanso', icon: 'rest' },
};

export const RUN_KINDS = ['Regenerativo', 'Rodagem', 'Intervalado', 'Tempo run', 'Fartlek', 'Longão'];

export const hasGym = (p) => p.type === 'gym' || p.type === 'hybrid';
export const hasRun = (p) => p.type === 'run' || p.type === 'hybrid';

export const typeIcon = (type, size = 18) => h('span', { class: `type-ico t-${type}` }, icon(TYPES[type].icon, size));

export function planSummary(p) {
  const w = getState().workouts.find((x) => x.id === p.workoutId);
  const gym = w?.name ?? 'ficha a definir';
  const run = `${p.runKind} ${String(p.km).replace('.', ',')} km`;
  return { gym: TYPES.gym.label + ' · ' + gym, run: 'Corrida · ' + run, hybrid: `${gym} + ${run}`, rest: 'Descanso' }[p.type];
}

export function planEditor(plan, onChange) {
  const { workouts } = getState();
  const set = (patch) => onChange({ ...plan, ...patch });
  return h('div', { class: 'plan-editor' },
    h('div', { class: 'seg type-seg' }, Object.entries(TYPES).map(([k, t]) =>
      h('button', { class: plan.type === k ? 'on' : '', onClick: () => set({ type: k }) }, t.label))),
    hasGym(plan) && h('select', { onChange: (e) => set({ workoutId: e.target.value || null }) },
      h('option', { value: '' }, workouts.length ? '— escolher ficha —' : 'Crie uma ficha na aba Fichas'),
      workouts.map((w) => h('option', { value: w.id, selected: w.id === plan.workoutId }, w.name))),
    hasRun(plan) && h('div', { class: 'row' },
      h('select', { class: 'grow', onChange: (e) => set({ runKind: e.target.value }) },
        RUN_KINDS.map((k) => h('option', { value: k, selected: k === plan.runKind }, k))),
      h('input', { type: 'number', inputmode: 'decimal', step: '0.5', min: 0, value: plan.km, class: 'km-input', onChange: (e) => set({ km: +e.target.value || 0 }) }),
      h('span', { class: 'muted' }, 'km')),
  );
}

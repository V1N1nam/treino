import { getState, exerciseName, startSession } from '../store.js';
import { h, header, toast } from '../ui.js';
import { go } from '../router.js';
import { todayKey } from '../dates.js';

export function workoutsView() {
  const { workouts, sessions, active } = getState();

  const lastDone = (wid) => {
    const s = [...sessions].reverse().find((x) => x.workoutId === wid);
    return s ? daysAgo(s.start) : 'nunca feito';
  };

  const start = (w) => {
    if (active) return go('#/session');
    if (!w.items.length) return toast('Adicione exercícios na ficha primeiro');
    startSession(w, todayKey());
    go('#/session');
  };

  return h('div', { class: 'page' },
    header('Fichas', { action: h('a', { class: 'btn-icon', href: '#/workout/new' }, '+') }),

    !workouts.length && h('div', { class: 'empty' },
      h('p', {}, 'Nenhuma ficha ainda. Monte seus treinos (A, B, C...) e depois coloque no plano da Agenda.'),
      h('a', { class: 'btn primary', href: '#/workout/new' }, 'Criar primeira ficha'),
    ),

    workouts.map((w) => h('div', { class: 'card' },
      h('div', { class: 'card-head' },
        h('div', {},
          h('h2', {}, w.name),
          h('p', { class: 'muted' }, `${w.items.length} exercícios · ${lastDone(w.id)}`),
        ),
        h('a', { class: 'btn-icon ghost', href: `#/workout/${w.id}` }, '✎'),
      ),
      h('p', { class: 'ex-list' }, w.items.map((it) => exerciseName(it.exerciseId)).join(' · ')),
      h('button', {
        class: 'btn primary block',
        onClick: () => start(w),
        disabled: active && active.workoutId !== w.id,
      }, active?.workoutId === w.id ? 'Continuar treino' : 'Iniciar hoje'),
    )),
  );
}

function daysAgo(ts) {
  const d = Math.floor((Date.now() - ts) / 86400000);
  return d === 0 ? 'feito hoje' : d === 1 ? 'feito ontem' : `há ${d} dias`;
}

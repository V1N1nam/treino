import { getState, update, exerciseName, sessionVolume, est1RM, sessionsOn, runsOn, sessionDate } from '../store.js';
import { h, header, fmtDuration, fmtKg } from '../ui.js';
import { go } from '../router.js';
import { fmtDayLong } from '../dates.js';
import { dayCalories, pace, fmtPace } from '../calc.js';

export const evoTabs = (on) => h('nav', { class: 'seg' },
  h('a', { href: '#/progress', class: on === 'progress' ? 'on' : '' }, 'Exercícios'),
  h('a', { href: '#/history', class: on === 'history' ? 'on' : '' }, 'Histórico'),
);

export function historyView() {
  const { sessions, days } = getState();
  const keys = [...new Set([...sessions.map(sessionDate), ...Object.keys(days).filter((k) => days[k].runs?.length)])].sort().reverse();

  return h('div', { class: 'page' },
    header('Evolução'),
    evoTabs('history'),
    !keys.length && h('div', { class: 'empty' }, h('p', {}, 'Seus treinos e corridas aparecem aqui.')),
    keys.map((k) => {
      const c = dayCalories(k);
      return h('a', { class: 'card link-card', href: `#/day/${k}/resultados` },
        h('div', { class: 'card-head' },
          h('h2', {}, fmtDayLong(k)),
          c.burned > 0 && h('small', { class: 'muted' }, `~${Math.round(c.burned)} kcal`)),
        sessionsOn(k).map((s) => h('p', { class: 'muted small' }, `🏋️ ${s.workoutName} · ${fmtDuration(s.end - s.start)} · ${fmtKg(sessionVolume(s))} kg`)),
        runsOn(k).map((r) => h('p', { class: 'muted small' }, `🏃 ${r.kind} · ${fmtKg(r.km)} km · ${fmtPace(pace(r))}`)),
      );
    }),
  );
}

export function sessionDetailView(id) {
  const s = getState().sessions.find((x) => x.id === id);
  if (!s) { go('#/history'); return h('div'); }
  const day = sessionDate(s);

  const remove = () => {
    if (!confirm('Apagar este treino do histórico?')) return;
    update((st) => (st.sessions = st.sessions.filter((x) => x.id !== id)));
    go(`#/day/${day}/treino`);
  };

  return h('div', { class: 'page' },
    header(s.workoutName, { back: `#/day/${day}/treino` }),
    h('div', { class: 'session-stats' },
      h('div', {}, h('small', {}, 'Duração'), h('strong', {}, fmtDuration(s.end - s.start))),
      h('div', {}, h('small', {}, 'Séries'), h('strong', {}, s.entries.reduce((n, e) => n + e.sets.length, 0))),
      h('div', {}, h('small', {}, 'Volume'), h('strong', {}, `${fmtKg(sessionVolume(s))} kg`)),
    ),
    s.entries.map((en) => h('a', { class: 'card link-card', href: `#/progress/${en.exerciseId}` },
      h('h2', {}, exerciseName(en.exerciseId)),
      h('div', { class: 'set-list' }, en.sets.map((set, i) => h('div', {},
        h('span', { class: 'muted' }, `${i + 1}.`),
        ` ${fmtKg(+set.kg)} kg × ${set.reps}`,
        h('span', { class: 'muted right' }, `1RM ~${fmtKg(est1RM(+set.kg, +set.reps))}`),
      ))),
    )),
    h('a', { class: 'btn block', href: `#/day/${day}/resultados` }, 'Ver resultados do dia'),
    h('button', { class: 'btn danger block', onClick: remove }, 'Apagar do histórico'),
  );
}

import { getState, update, lastSetsFor, exerciseName, getExercise, sessionDate } from '../store.js';
import { pickExercise } from '../pickers.js';
import { MUSCLES } from '../data/muscles.js';
import { h, header, toast, fmtDuration, fmtKg } from '../ui.js';
import { go, rerender } from '../router.js';
import { startRest, stopRest } from '../timer.js';

// Tela do treino em andamento.
export function sessionView() {
  const { active } = getState();
  if (!active) { go('#/day'); return h('div'); }

  const doneCount = active.entries.reduce((n, en) => n + en.sets.filter((s) => s.done).length, 0);
  const totalCount = active.entries.reduce((n, en) => n + en.sets.length, 0);

  return h('div', { class: 'page' },
    header(active.workoutName, { back: `#/day/${sessionDate(active)}/treino`, action: h('button', { class: 'link', onClick: finish }, 'Finalizar') }),
    h('div', { class: 'session-stats' },
      h('div', {}, h('small', {}, 'Tempo'), h('strong', { 'data-elapsed': '' }, fmtDuration(Date.now() - active.start))),
      h('div', {}, h('small', {}, 'Séries'), h('strong', {}, `${doneCount}/${totalCount}`)),
    ),
    active.entries.map((en, ei) => exerciseCard(en, ei)),
    h('button', { class: 'btn block', onClick: addExercise }, '+ Adicionar exercício'),
    h('button', { class: 'btn primary block', onClick: finish }, 'Finalizar treino'),
    h('button', { class: 'btn danger block', onClick: discard }, 'Descartar treino'),
  );
}

function exerciseCard(en, ei) {
  const prev = lastSetsFor(en.exerciseId);
  const allDone = en.sets.length && en.sets.every((s) => s.done);

  return h('div', { class: `card ${allDone ? 'complete' : ''}` },
    h('div', { class: 'card-head' },
      h('div', {},
        h('h2', {}, exerciseName(en.exerciseId)),
        h('p', { class: 'muted' }, `Meta ${en.target.sets}×${en.target.reps} · ${en.target.rest}s descanso`),
        h('p', { class: 'tags' }, (getExercise(en.exerciseId)?.primary ?? []).map((m) => h('span', {}, MUSCLES[m]))),
      ),
    ),
    h('div', { class: 'sets' },
      h('div', { class: 'set-row head' }, h('span', {}, '#'), h('span', {}, 'Anterior'), h('span', {}, 'kg'), h('span', {}, 'Reps'), h('span')),
      en.sets.map((set, si) => setRow(en, ei, set, si, prev[si])),
    ),
    h('div', { class: 'row' },
      h('button', { class: 'btn small grow', onClick: () => addSet(ei) }, '+ Série'),
      en.sets.length > 0 && h('button', { class: 'btn small ghost', onClick: () => removeSet(ei) }, '− Série'),
    ),
  );
}

function setRow(en, ei, set, si, prevSet) {
  // Sugestão: o que fez da última vez nessa série (ou na série anterior de hoje).
  const ref = prevSet ?? en.sets[si - 1];
  const kgIn = h('input', {
    type: 'number', inputmode: 'decimal', step: '0.5', value: set.kg, placeholder: ref?.kg ?? '',
    onInput: (e) => update(() => (set.kg = e.target.value)),
  });
  const repsIn = h('input', {
    type: 'number', inputmode: 'numeric', value: set.reps, placeholder: ref?.reps ?? '',
    onInput: (e) => update(() => (set.reps = e.target.value)),
  });

  const toggle = () => {
    const nowDone = !set.done;
    update(() => {
      if (nowDone) {
        // Campo vazio = repetiu a sugestão.
        if (set.kg === '' && kgIn.placeholder) set.kg = kgIn.placeholder;
        if (set.reps === '' && repsIn.placeholder) set.reps = repsIn.placeholder;
      }
      set.done = nowDone;
    });
    if (nowDone) startRest(en.target.rest);
    else stopRest();
    rerender();
  };

  return h('div', { class: `set-row ${set.done ? 'done' : ''}` },
    h('span', { class: 'set-n' }, si + 1),
    h('span', { class: 'prev' }, prevSet ? `${fmtKg(+prevSet.kg)}×${prevSet.reps}` : '—'),
    kgIn,
    repsIn,
    h('button', { class: 'check', onClick: toggle, 'aria-label': 'Concluir série' }, '✓'),
  );
}

function addSet(ei) {
  update((s) => {
    const sets = s.active.entries[ei].sets;
    const last = sets[sets.length - 1];
    sets.push({ kg: last?.kg ?? '', reps: last?.reps ?? '', done: false });
  });
  rerender();
}

function removeSet(ei) {
  update((s) => s.active.entries[ei].sets.pop());
  rerender();
}

function addExercise() {
  pickExercise((exerciseId) => {
    update((s) => {
      s.active.entries.push({
        exerciseId,
        target: { sets: 3, reps: '10', rest: s.settings.defaultRest },
        sets: Array.from({ length: 3 }, () => ({ kg: '', reps: '', done: false })),
      });
    });
    rerender();
  });
}

function finish() {
  const { active } = getState();
  const done = active.entries.some((en) => en.sets.some((s) => s.done));
  if (!done) return toast('Conclua pelo menos uma série');
  if (!confirm('Finalizar e salvar o treino?')) return;
  const date = sessionDate(active);
  update((s) => {
    const session = { ...s.active, date, end: Date.now() };
    // Guarda só as séries concluídas.
    session.entries = session.entries
      .map((en) => ({ ...en, sets: en.sets.filter((x) => x.done) }))
      .filter((en) => en.sets.length);
    s.sessions.push(session);
    s.active = null;
  });
  stopRest();
  toast('Treino salvo 💪');
  go(`#/day/${date}/resultados`);
}

function discard() {
  if (!confirm('Descartar este treino? Nada será salvo.')) return;
  const date = sessionDate(getState().active);
  update((s) => (s.active = null));
  stopRest();
  go(`#/day/${date}/treino`);
}

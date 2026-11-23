import { getState, update, lastSetsFor, exerciseName, sessionDate, sessionVolume, addWorkoutFrom, workoutItemsFrom, mergeIntoWorkout } from '../store.js';
import { pickExercise } from '../pickers.js';
import { icon } from '../icons.js';
import { h, header, toast, sheet, fmtDuration, fmtKg } from '../ui.js';
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
        h('p', { class: 'muted' }, `${en.target.sets} × ${en.target.reps} · descanso ${en.target.rest}s`),
      ),
    ),
    h('div', { class: 'sets' },
      h('div', { class: 'set-row head' }, h('span', {}, '#'), h('span', {}, 'Última'), h('span', {}, 'kg'), h('span', {}, 'Reps'), h('span')),
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
    h('button', { class: 'check', onClick: toggle, 'aria-label': 'Concluir série' }, icon('check', 18)),
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
  const { active, workouts } = getState();
  const doneSets = active.entries.reduce((n, en) => n + en.sets.filter((x) => x.done).length, 0);
  if (!doneSets) return toast('Conclua pelo menos uma série');
  const fromWorkout = workouts.find((w) => w.id === active.workoutId);
  const preview = { ...active, entries: active.entries.map((en) => ({ ...en, sets: en.sets.filter((x) => x.done) })) };

  const options = fromWorkout
    ? [['none', 'Só o treino'], ['update', 'Atualizar ficha'], ['new', 'Nova ficha']]
    : [['new', 'Salvar como ficha'], ['none', 'Só o treino']];
  let mode = options[0][0];
  let name = '';

  sheet('Finalizar treino', (close) => {
    const body = h('div', { class: 'sheet-body finish' });
    const draw = () => body.replaceChildren(
      h('div', { class: 'session-stats' },
        h('div', {}, h('small', {}, 'Duração'), h('strong', {}, fmtDuration(Date.now() - active.start))),
        h('div', {}, h('small', {}, 'Séries'), h('strong', {}, doneSets)),
        h('div', {}, h('small', {}, 'Volume'), h('strong', {}, `${fmtKg(sessionVolume(preview))} kg`)),
      ),
      h('h3', { class: 'section' }, 'Ficha'),
      h('div', { class: 'seg type-seg' }, options.map(([k, label]) =>
        h('button', { class: mode === k ? 'on' : '', onClick: () => { mode = k; draw(); } }, label))),
      mode === 'new' && h('input', { placeholder: 'Nome da ficha (ex: Treino B – Costas)', value: name, autocapitalize: 'sentences', onInput: (e) => (name = e.target.value) }),
      h('p', { class: 'muted small' }, {
        none: fromWorkout ? `A ficha "${fromWorkout.name}" continua como está.` : 'O treino fica só no histórico.',
        update: `Atualiza séries e reps de "${fromWorkout?.name}" com o que você fez e inclui exercícios novos.`,
        new: `${workoutItemsFrom(preview).length} exercícios com as séries e reps que você fez hoje.`,
      }[mode]),
      h('button', { class: 'btn primary block', onClick: () => {
        if (mode === 'new' && !name.trim()) return toast('Dê um nome pra ficha');
        close();
        commit(mode, name.trim(), fromWorkout);
      } }, 'Salvar treino'),
    );
    draw();
    return body;
  });
}

function commit(mode, name, fromWorkout) {
  const date = sessionDate(getState().active);
  update((s) => {
    const session = { ...s.active, date, end: Date.now() };
    // Guarda só as séries concluídas.
    session.entries = session.entries
      .map((en) => ({ ...en, sets: en.sets.filter((x) => x.done) }))
      .filter((en) => en.sets.length);
    if (mode === 'new') {
      const w = addWorkoutFrom(s, session, name);
      Object.assign(session, { workoutId: w.id, workoutName: w.name });
    }
    if (mode === 'update') mergeIntoWorkout(s.workouts.find((w) => w.id === fromWorkout.id), session);
    s.sessions.push(session);
    s.active = null;
  });
  stopRest();
  toast(mode === 'new' ? `Treino salvo e ficha "${name}" criada` : mode === 'update' ? 'Treino salvo e ficha atualizada' : 'Treino salvo');
  go(`#/day/${date}/resultados`);
}

function discard() {
  if (!confirm('Descartar este treino? Nada será salvo.')) return;
  const date = sessionDate(getState().active);
  update((s) => (s.active = null));
  stopRest();
  go(`#/day/${date}/treino`);
}

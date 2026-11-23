import { getState, update, uid, exerciseName, getExercise } from '../store.js';
import { h, header, toast } from '../ui.js';
import { go } from '../router.js';
import { pickExercise } from '../pickers.js';
import { MUSCLES } from '../data/muscles.js';
import { icon } from '../icons.js';

// Editor de ficha. Trabalha num rascunho local e só grava ao salvar.
export function editorView(id) {
  const state = getState();
  const existing = id ? state.workouts.find((w) => w.id === id) : null;
  if (id && !existing) { go('#/workouts'); return h('div'); }

  const draft = {
    name: existing?.name ?? '',
    items: (existing?.items ?? []).map((it) => ({ ...it })),
  };

  const list = h('div', { class: 'stack' });

  function drawList() {
    list.replaceChildren(...draft.items.map((it, i) => {
      const ex = getExercise(it.exerciseId);
      return h('div', { class: 'card editor-item' },
        h('div', { class: 'row' },
          h('button', { class: 'ex-pick grow', onClick: () => pickExercise((eid) => { it.exerciseId = eid; drawList(); }) },
            h('strong', {}, exerciseName(it.exerciseId)),
            h('small', { class: 'muted' }, (ex?.primary ?? []).map((m) => MUSCLES[m]).join(', '))),
          h('button', { class: 'btn-icon ghost', onClick: () => move(i, -1), disabled: i === 0, 'aria-label': 'Subir' }, icon('up', 18)),
          h('button', { class: 'btn-icon ghost', onClick: () => move(i, 1), disabled: i === draft.items.length - 1, 'aria-label': 'Descer' }, icon('down', 18)),
          h('button', { class: 'btn-icon ghost', 'aria-label': 'Remover', onClick: () => { draft.items.splice(i, 1); drawList(); } }, icon('x', 18)),
        ),
        h('div', { class: 'row fields' },
          field('Séries', h('input', { type: 'number', inputmode: 'numeric', min: 1, value: it.sets, onInput: (e) => (it.sets = +e.target.value || 1) })),
          field('Reps', h('input', { inputmode: 'text', value: it.reps, placeholder: '8-12', onInput: (e) => (it.reps = e.target.value) })),
          field('Descanso (s)', h('input', { type: 'number', inputmode: 'numeric', min: 0, step: 15, value: it.rest, onInput: (e) => (it.rest = +e.target.value || 0) })),
        ),
      );
    }));
  }

  function move(i, dir) {
    const [it] = draft.items.splice(i, 1);
    draft.items.splice(i + dir, 0, it);
    drawList();
  }

  function add() {
    pickExercise((exerciseId) => {
      draft.items.push({ exerciseId, sets: 3, reps: '10', rest: state.settings.defaultRest });
      drawList();
    });
  }

  function save() {
    const name = draft.name.trim();
    if (!name) return toast('Dê um nome pra ficha');
    const items = draft.items.map((it) => ({ exerciseId: it.exerciseId, sets: Math.max(1, it.sets), reps: String(it.reps || '10'), rest: it.rest }));
    update((s) => {
      if (existing) Object.assign(existing, { name, items });
      else s.workouts.push({ id: uid(), name, items });
    });
    toast('Ficha salva');
    go('#/workouts');
  }

  function remove() {
    if (!confirm(`Apagar a ficha "${existing.name}"? O histórico continua salvo.`)) return;
    update((s) => {
      s.workouts = s.workouts.filter((w) => w.id !== existing.id);
      Object.values(s.plan).forEach((p) => { if (p.workoutId === existing.id) p.workoutId = null; });
    });
    go('#/workouts');
  }

  drawList();

  return h('div', { class: 'page' },
    header(existing ? 'Editar ficha' : 'Nova ficha', { back: '#/workouts', action: h('button', { class: 'link', onClick: save }, 'Salvar') }),
    h('input', { class: 'title-input', placeholder: 'Nome (ex: Treino A – Peito e Tríceps)', value: draft.name, onInput: (e) => (draft.name = e.target.value) }),
    h('h3', { class: 'section' }, 'Exercícios'),
    list,
    h('button', { class: 'btn block', onClick: add }, '+ Adicionar exercício'),
    h('button', { class: 'btn primary block', onClick: save }, 'Salvar ficha'),
    existing && h('button', { class: 'btn danger block', onClick: remove }, 'Apagar ficha'),
  );
}

const field = (label, input) => h('label', { class: 'field' }, h('span', {}, label), input);

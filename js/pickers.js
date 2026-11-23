// Seletores em painel: exercício (biblioteca) e alimento.
import { h, sheet, norm, fmtKg } from './ui.js';
import { EXERCISES, GROUPS } from './data/exercises.js';
import { FOOD_CATS, UNIT_LABEL, foodMacros, isWeightUnit } from './data/foods.js';
import { MUSCLES } from './data/muscles.js';
import { icon } from './icons.js';
import { getState, update, uid, createCustomExercise, allFoods } from './store.js';

const musclesLabel = (e) => (e.primary ?? []).map((k) => MUSCLES[k]).join(', ');

export function pickExercise(onPick) {
  sheet('Escolher exercício', (close) => {
    let q = '', group = 'Todos';
    const chips = h('div', { class: 'chips scroll' });
    const list = h('div', { class: 'pick-list' });
    const all = () => [...EXERCISES, ...getState().exercises.map((e) => ({ ...e, group: 'Meus' }))];

    function draw() {
      chips.replaceChildren(...['Todos', ...GROUPS, 'Meus'].map((g) =>
        h('button', { class: `chip-btn ${g === group ? 'on' : ''}`, onClick: () => { group = g; draw(); } }, g)));
      const nq = norm(q);
      const items = all().filter((e) => (group === 'Todos' || e.group === group) && (!nq || norm(e.name).includes(nq)));
      const rows = items.map((e) => h('button', { class: 'pick-row', onClick: () => { close(); onPick(e.id); } },
        h('div', {}, h('strong', {}, e.name), h('small', {}, musclesLabel(e) || 'sem músculo definido')),
        null));
      if (nq && !all().some((e) => norm(e.name) === nq))
        rows.unshift(h('button', { class: 'pick-row create', onClick: () => createFlow(q.trim()) }, h('strong', {}, `+ Criar "${q.trim()}"`)));
      list.replaceChildren(...(rows.length ? rows : [h('p', { class: 'muted pad' }, 'Digite o nome pra buscar ou criar.')]));
    }

    function createFlow(name) {
      chips.replaceChildren();
      list.replaceChildren(
        h('p', { class: 'pad' }, `Qual músculo "${name}" trabalha mais?`),
        h('div', { class: 'chips wrap pad' }, Object.entries(MUSCLES).map(([k, label]) =>
          h('button', { class: 'chip-btn', onClick: () => { const id = createCustomExercise(name, [k]); close(); onPick(id); } }, label))),
      );
    }

    draw();
    return h('div', { class: 'sheet-body' },
      h('input', { type: 'search', placeholder: 'Buscar (ex: supino, agachamento)', onInput: (e) => { q = e.target.value; draw(); } }),
      chips, list);
  });
}

export const qtyStep = (unit) => (isWeightUnit(unit) ? 10 : unit === 'scoop' ? 0.5 : 1);
export const fmtQty = (food, qty) => `${fmtKg(qty)} ${UNIT_LABEL[food.unit] ?? food.unit}`;

export function pickFood(onPick) {
  sheet('Adicionar alimento', (close) => {
    let q = '', cat = 'Todos', openId = null, qty = 0;
    const chips = h('div', { class: 'chips scroll' });
    const list = h('div', { class: 'pick-list' });

    function draw() {
      chips.replaceChildren(...['Todos', ...FOOD_CATS, 'Meus'].map((c) =>
        h('button', { class: `chip-btn ${c === cat ? 'on' : ''}`, onClick: () => { cat = c; draw(); } }, c)));
      const nq = norm(q);
      const foods = allFoods().filter((f) => (cat === 'Todos' || f.cat === cat) && (!nq || norm(f.name).includes(nq)));
      list.replaceChildren(
        h('button', { class: 'pick-row create', onClick: newFoodForm }, h('strong', {}, '+ Novo alimento')),
        ...foods.map((f) => f.id === openId ? openRow(f) : h('button', { class: 'pick-row', onClick: () => { openId = f.id; qty = f.def; draw(); } },
          h('div', {}, h('strong', {}, f.name), h('small', {}, `${Math.round(f.kcal)} kcal · ${fmtKg(f.p)} g prot · por ${per(f)}`)),
          h('span', { class: 'muted' }, icon('plus', 18)))),
      );
    }

    function openRow(f) {
      const m = foodMacros(f, qty);
      const step = qtyStep(f.unit);
      const setQty = (v) => { qty = Math.max(0, Math.round(v * 10) / 10); draw(); };
      return h('div', { class: 'pick-row open' },
        h('strong', {}, f.name),
        h('div', { class: 'row' },
          stepper(qty, f, setQty, step),
          h('div', { class: 'grow right-text' }, h('strong', {}, `${Math.round(m.kcal)} kcal`), h('small', {}, `P ${fmtKg(m.p)} · C ${fmtKg(m.c)} · G ${fmtKg(m.f)}`)),
        ),
        h('button', { class: 'btn primary block', onClick: () => { if (qty > 0) { close(); onPick(f.id, qty); } } }, 'Adicionar'),
      );
    }

    function newFoodForm() {
      const v = { name: q.trim(), unit: 'g', kcal: '', p: '', c: '', f: '', def: '' };
      const inp = (key, label, attrs = {}) => h('label', { class: 'field' }, h('span', {}, label),
        h('input', { value: v[key], inputmode: 'decimal', ...attrs, onInput: (e) => (v[key] = e.target.value) }));
      chips.replaceChildren();
      list.replaceChildren(h('div', { class: 'form pad' },
        inp('name', 'Nome', { inputmode: 'text' }),
        h('label', { class: 'field' }, h('span', {}, 'Medida'),
          h('select', { onChange: (e) => (v.unit = e.target.value) }, Object.entries(UNIT_LABEL).map(([k, l]) => h('option', { value: k }, l)))),
        h('p', { class: 'muted' }, 'Valores por 100 g/ml, ou por 1 unidade nas outras medidas.'),
        h('div', { class: 'row' }, inp('kcal', 'Kcal'), inp('p', 'Proteína'), inp('c', 'Carbo'), inp('f', 'Gordura')),
        inp('def', 'Quantidade padrão'),
        h('button', { class: 'btn primary block', onClick: () => {
          if (!v.name.trim()) return;
          const food = { id: uid(), name: v.name.trim(), cat: 'Meus', unit: v.unit, kcal: +v.kcal || 0, p: +v.p || 0, c: +v.c || 0, f: +v.f || 0, def: +v.def || (isWeightUnit(v.unit) ? 100 : 1) };
          update((s) => s.foods.push(food));
          q = ''; cat = 'Meus'; openId = food.id; qty = food.def; draw();
        } }, 'Salvar alimento'),
      ));
    }

    draw();
    return h('div', { class: 'sheet-body' },
      h('input', { type: 'search', placeholder: 'Buscar (ex: ovo, whey, pão)', onInput: (e) => { q = e.target.value; openId = null; draw(); } }),
      chips, list);
  });
}

const per = (f) => (isWeightUnit(f.unit) ? `100 ${f.unit}` : `1 ${UNIT_LABEL[f.unit] ?? f.unit}`);

export function stepper(qty, food, onSet, step = qtyStep(food.unit)) {
  return h('div', { class: 'stepper' },
    h('button', { onClick: () => onSet(qty - step), 'aria-label': 'Menos' }, icon('minus', 16)),
    h('input', { type: 'number', inputmode: 'decimal', value: qty, onChange: (e) => onSet(+e.target.value || 0) }),
    h('span', { class: 'unit' }, UNIT_LABEL[food.unit] ?? food.unit),
    h('button', { onClick: () => onSet(qty + step), 'aria-label': 'Mais' }, icon('plus', 16)),
  );
}

// Aba Pré / Pós: monta a refeição com alimentos e refeições prontas.
import { getState, getDay, dayRef, update, uid, getFood } from '../store.js';
import { h, toast, fmtKg } from '../ui.js';
import { rerender } from '../router.js';
import { MEALS, foodMacros } from '../data/foods.js';
import { mealTotals } from '../calc.js';
import { pickFood, stepper } from '../pickers.js';

export function mealsPanel(key, slot) {
  const items = getDay(key)[slot] ?? [];
  const t = mealTotals(items);
  const label = slot === 'pre' ? 'pré-treino' : 'pós-treino';

  const mutate = (fn) => { update((s) => fn(dayRef(s, key)[slot])); rerender(); };
  const addFood = (foodId, qty) => mutate((list) => {
    const same = list.find((x) => x.foodId === foodId);
    if (same) same.qty += qty; else list.push({ foodId, qty });
  });
  const addMeal = (meal) => { meal.items.forEach((it) => addFood(it.foodId, it.qty)); toast(`${meal.name} adicionado`); };

  const saveMeal = () => {
    const name = prompt('Nome da refeição', '');
    if (!name?.trim()) return;
    update((s) => s.meals.push({ id: uid(), name: name.trim(), when: slot, items: items.map((x) => ({ ...x })) }));
    toast('Refeição salva');
    rerender();
  };

  const meals = [...getState().meals.map((m) => ({ ...m, custom: true })), ...MEALS]
    .sort((a, b) => (a.when === slot ? 0 : 1) - (b.when === slot ? 0 : 1));

  return h('div', { class: 'stack' },
    h('div', { class: 'card macro-card' },
      h('div', { class: 'kcal-big' }, h('strong', {}, Math.round(t.kcal)), h('span', {}, 'kcal')),
      macroBar('Proteína', t.p, '#7ab8ff'),
      macroBar('Carbo', t.c, '#c6ff3d'),
      macroBar('Gordura', t.f, '#ffb35c'),
    ),

    h('div', { class: 'card' },
      h('h3', { class: 'section' }, `Seu ${label}`),
      !items.length && h('p', { class: 'muted' }, 'Nada ainda. Adicione alimentos ou escolha uma refeição pronta.'),
      items.map((it, i) => {
        const food = getFood(it.foodId);
        if (!food) return null;
        const m = foodMacros(food, it.qty);
        return h('div', { class: 'food-row' },
          h('div', { class: 'grow' }, h('strong', {}, food.name), h('small', { class: 'muted' }, `${Math.round(m.kcal)} kcal · P ${fmtKg(m.p)} g`)),
          stepper(it.qty, food, (v) => mutate((list) => { if (v <= 0) list.splice(i, 1); else list[i].qty = Math.round(v * 10) / 10; })),
        );
      }),
      h('div', { class: 'row' },
        h('button', { class: 'btn grow', onClick: () => pickFood(addFood) }, '+ Alimento'),
        items.length > 0 && h('button', { class: 'btn ghost', onClick: saveMeal }, 'Salvar refeição'),
      ),
      items.length > 0 && h('button', { class: 'btn danger small', onClick: () => confirm('Limpar refeição?') && mutate((list) => list.splice(0)) }, 'Limpar'),
    ),

    h('h3', { class: 'section pad-x' }, 'Refeições prontas'),
    h('div', { class: 'meal-grid' }, meals.map((meal) => {
      const mt = mealTotals(meal.items);
      return h('div', { class: `meal-card ${meal.when === slot ? '' : 'other'}` },
        h('button', { class: 'meal-main', onClick: () => addMeal(meal) },
          h('strong', {}, meal.name),
          h('small', {}, `${Math.round(mt.kcal)} kcal · ${fmtKg(mt.p)} g prot`),
          h('small', { class: 'muted' }, meal.items.map((x) => getFood(x.foodId)?.name).filter(Boolean).join(', ')),
        ),
        meal.custom && h('button', { class: 'meal-del', onClick: () => {
          if (!confirm(`Apagar "${meal.name}"?`)) return;
          update((s) => (s.meals = s.meals.filter((m) => m.id !== meal.id)));
          rerender();
        } }, '✕'),
      );
    })),
  );
}

function macroBar(label, grams, color) {
  return h('div', { class: 'macro' },
    h('span', {}, label),
    h('div', { class: 'macro-track' }, h('div', { style: `width:${Math.min(100, grams)}%;background:${color}` })),
    h('strong', {}, `${fmtKg(grams)} g`),
  );
}

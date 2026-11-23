// Aba Pré / Pós: monta a refeição com alimentos e refeições prontas.
import { getState, getDay, dayRef, update, uid, getFood } from '../store.js';
import { h, toast, fmtKg } from '../ui.js';
import { rerender } from '../router.js';
import { MEALS, foodMacros } from '../data/foods.js';
import { mealTotals, dayCalories } from '../calc.js';
import { pickFood, stepper } from '../pickers.js';
import { icon } from '../icons.js';

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

  const meals = [...getState().meals.map((m) => ({ ...m, custom: true })), ...MEALS].filter((m) => m.when === slot);

  return h('div', { class: 'stack' },
    h('div', { class: 'macro-strip' },
      h('div', { class: 'kcal-big' }, h('strong', {}, Math.round(t.kcal)), h('span', {}, 'kcal')),
      macro('Prot', t.p, 'p'), macro('Carbo', t.c, 'c'), macro('Gord', t.f, 'f'),
    ),
    (() => {
      const c = dayCalories(key);
      return c.ready && h('p', { class: 'muted small goal-line' },
        `Hoje: ${Math.round(c.intake).toLocaleString('pt-BR')} de ${Math.round(c.target).toLocaleString('pt-BR')} kcal · ${Math.round(c.protein)} de ${Math.round(c.protTarget)} g prot`);
    })(),

    h('div', { class: 'card' },
      h('h3', { class: 'section' }, label[0].toUpperCase() + label.slice(1)),
      !items.length && h('p', { class: 'muted small' }, 'Nenhum alimento adicionado.'),
      items.map((it, i) => {
        const food = getFood(it.foodId);
        if (!food) return null;
        const m = foodMacros(food, it.qty);
        return h('div', { class: 'food-row' },
          h('div', { class: 'grow' }, h('strong', {}, food.name), h('small', { class: 'muted' }, `${Math.round(m.kcal)} kcal · ${fmtKg(m.p)} g prot`)),
          stepper(it.qty, food, (v) => mutate((list) => { if (v <= 0) list.splice(i, 1); else list[i].qty = Math.round(v * 10) / 10; })),
        );
      }),
      h('div', { class: 'row' },
        h('button', { class: 'btn grow', onClick: () => pickFood(addFood) }, icon('plus', 16), ' Alimento'),
        items.length > 0 && h('button', { class: 'btn ghost', onClick: saveMeal }, 'Salvar'),
      ),
          ),

    h('h3', { class: 'section pad-x' }, 'Refeições prontas'),
    h('div', { class: 'meal-grid' }, meals.map((meal) => {
      const mt = mealTotals(meal.items);
      return h('div', { class: 'meal-card' },
        h('button', { class: 'meal-main', onClick: () => addMeal(meal) },
          h('strong', {}, meal.name),
          h('small', {}, `${Math.round(mt.kcal)} kcal · ${fmtKg(mt.p)} g prot`),
        ),
        meal.custom && h('button', { class: 'meal-del', onClick: () => {
          if (!confirm(`Apagar "${meal.name}"?`)) return;
          update((s) => (s.meals = s.meals.filter((m) => m.id !== meal.id)));
          rerender();
        }, 'aria-label': 'Apagar' }, icon('x', 14)),
      );
    })),
  );
}

function macro(label, grams, cls) {
  return h('div', { class: `macro m-${cls}` }, h('strong', {}, `${fmtKg(grams)}`, h('small', {}, ' g')), h('span', {}, label));
}

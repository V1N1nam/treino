// Alimentos com valores aproximados (base TACO / rótulos comuns).
// [nome, categoria, unidade, kcal, proteína, carbo, gordura, qtd padrão]
// Unidade 'g' ou 'ml': valores por 100. Outras: por 1 unidade.
import { slug } from './exercises.js';

export const UNIT_LABEL = { g: 'g', ml: 'ml', un: 'un', fatia: 'fatia', col: 'colher', scoop: 'scoop', pote: 'pote', dose: 'dose' };

const RAW = [
  // Proteínas
  ['Ovo cozido', 'Proteínas', 'un', 72, 6.3, 0.6, 4.8, 2],
  ['Ovo mexido', 'Proteínas', 'un', 90, 6.3, 0.4, 7, 2],
  ['Clara de ovo', 'Proteínas', 'un', 17, 3.6, 0.2, 0.1, 3],
  ['Whey protein (30 g)', 'Proteínas', 'scoop', 120, 24, 3, 1.5, 1],
  ['Caseína (30 g)', 'Proteínas', 'scoop', 115, 24, 3, 1, 1],
  ['Peito de frango grelhado', 'Proteínas', 'g', 159, 32, 0, 2.5, 120],
  ['Patinho moído', 'Proteínas', 'g', 219, 35.9, 0, 7.3, 120],
  ['Alcatra grelhada', 'Proteínas', 'g', 241, 31.9, 0, 11.6, 120],
  ['Tilápia grelhada', 'Proteínas', 'g', 128, 26, 0, 2.7, 120],
  ['Atum em lata (água)', 'Proteínas', 'g', 116, 26, 0, 1, 60],
  ['Sardinha em lata', 'Proteínas', 'g', 208, 24, 0, 12, 60],
  ['Peito de peru', 'Proteínas', 'fatia', 18, 3.2, 0.4, 0.4, 3],
  // Laticínios
  ['Leite integral', 'Laticínios', 'ml', 61, 3.2, 4.7, 3.3, 200],
  ['Leite desnatado', 'Laticínios', 'ml', 35, 3.4, 5, 0.1, 200],
  ['Iogurte natural (170 g)', 'Laticínios', 'pote', 100, 6.5, 8, 5, 1],
  ['Iogurte grego zero (100 g)', 'Laticínios', 'pote', 60, 9, 5, 0, 1],
  ['Queijo cottage', 'Laticínios', 'g', 98, 11, 3.4, 4.3, 50],
  ['Queijo minas frescal (30 g)', 'Laticínios', 'fatia', 79, 5.2, 1, 6, 2],
  ['Muçarela (20 g)', 'Laticínios', 'fatia', 66, 4.5, 0.6, 5, 2],
  ['Requeijão light', 'Laticínios', 'col', 38, 2.5, 1, 2.7, 1],
  // Carboidratos
  ['Pão francês', 'Carboidratos', 'un', 150, 4.5, 29, 1.6, 1],
  ['Pão de forma integral', 'Carboidratos', 'fatia', 62, 2.6, 11, 0.9, 2],
  ['Wrap / Rap10', 'Carboidratos', 'un', 140, 4, 24, 3, 1],
  ['Tapioca (goma)', 'Carboidratos', 'g', 240, 0, 60, 0, 60],
  ['Cuscuz de milho cozido', 'Carboidratos', 'g', 113, 2.2, 25, 0.7, 150],
  ['Arroz branco cozido', 'Carboidratos', 'g', 128, 2.5, 28, 0.2, 150],
  ['Arroz integral cozido', 'Carboidratos', 'g', 124, 2.6, 25.8, 1, 150],
  ['Feijão carioca cozido', 'Carboidratos', 'g', 76, 4.8, 13.6, 0.5, 100],
  ['Macarrão cozido', 'Carboidratos', 'g', 158, 5.8, 30.9, 0.9, 150],
  ['Batata-doce cozida', 'Carboidratos', 'g', 77, 0.6, 18.4, 0.1, 150],
  ['Batata inglesa cozida', 'Carboidratos', 'g', 52, 1.2, 11.9, 0, 150],
  ['Mandioca cozida', 'Carboidratos', 'g', 125, 0.6, 30, 0.3, 120],
  ['Aveia em flocos', 'Carboidratos', 'g', 394, 13.9, 66.6, 8.5, 30],
  ['Granola', 'Carboidratos', 'g', 420, 10, 65, 14, 40],
  ['Biscoito de arroz', 'Carboidratos', 'un', 28, 0.6, 6, 0.2, 3],
  ['Barra de cereal', 'Carboidratos', 'un', 90, 1, 17, 2, 1],
  ['Mel', 'Carboidratos', 'col', 64, 0, 17, 0, 1],
  // Frutas
  ['Banana prata', 'Frutas', 'un', 69, 0.9, 18, 0.1, 1],
  ['Maçã', 'Frutas', 'un', 73, 0.4, 19.5, 0.3, 1],
  ['Morango', 'Frutas', 'g', 30, 0.9, 6.8, 0.3, 100],
  ['Mamão papaia', 'Frutas', 'g', 40, 0.5, 10.4, 0.1, 150],
  ['Abacate', 'Frutas', 'g', 96, 1.2, 6, 8.4, 100],
  // Gorduras
  ['Pasta de amendoim', 'Gorduras', 'col', 94, 4, 3, 7.5, 1],
  ['Azeite de oliva', 'Gorduras', 'col', 72, 0, 0, 8, 1],
  ['Manteiga', 'Gorduras', 'col', 72, 0.1, 0, 8.2, 1],
  ['Castanha-do-pará', 'Gorduras', 'un', 33, 0.7, 0.6, 3.3, 3],
  ['Amêndoas', 'Gorduras', 'g', 581, 21, 20, 50, 20],
  // Vegetais
  ['Salada de folhas', 'Vegetais', 'g', 15, 1.3, 2.5, 0.2, 50],
  ['Brócolis cozido', 'Vegetais', 'g', 25, 2.1, 4.4, 0.5, 100],
  ['Tomate', 'Vegetais', 'g', 15, 1.1, 3.1, 0.2, 80],
  // Bebidas e suplementos
  ['Café preto (sem açúcar)', 'Bebidas', 'ml', 2, 0.1, 0, 0, 100],
  ['Suco de laranja', 'Bebidas', 'ml', 45, 0.7, 10.4, 0.2, 200],
  ['Água de coco', 'Bebidas', 'ml', 22, 0, 5.3, 0, 300],
  ['Isotônico', 'Bebidas', 'ml', 24, 0, 6, 0, 500],
  ['Creatina (3 g)', 'Bebidas', 'dose', 0, 0, 0, 0, 1],
  ['Pré-treino (dose)', 'Bebidas', 'dose', 5, 0, 1, 0, 1],
];

export const FOODS = RAW.map(([name, cat, unit, kcal, p, c, f, def]) => ({ id: slug(name), name, cat, unit, kcal, p, c, f, def }));
export const FOOD_CATS = [...new Set(RAW.map((r) => r[1]))];

export const isWeightUnit = (unit) => unit === 'g' || unit === 'ml';

export function foodMacros(food, qty) {
  const k = isWeightUnit(food.unit) ? qty / 100 : qty;
  return { kcal: food.kcal * k, p: food.p * k, c: food.c * k, f: food.f * k };
}

// Refeições prontas. when: 'pre' | 'post'
const meal = (name, when, items) => ({ id: slug(name), name, when, items: items.map(([n, qty]) => ({ foodId: slug(n), qty })) });

export const MEALS = [
  meal('Pão com ovos', 'pre', [['Pão francês', 1], ['Ovo cozido', 2]]),
  meal('Whey + banana', 'pre', [['Whey protein (30 g)', 1], ['Banana prata', 1]]),
  meal('Aveia, banana e mel', 'pre', [['Aveia em flocos', 40], ['Banana prata', 1], ['Mel', 1]]),
  meal('Tapioca com ovo', 'pre', [['Tapioca (goma)', 60], ['Ovo mexido', 2]]),
  meal('Café + pão com pasta de amendoim', 'pre', [['Café preto (sem açúcar)', 100], ['Pão francês', 1], ['Pasta de amendoim', 1]]),
  meal('Batata-doce com frango', 'pre', [['Batata-doce cozida', 150], ['Peito de frango grelhado', 120]]),
  meal('Whey com leite', 'post', [['Whey protein (30 g)', 1], ['Leite desnatado', 250]]),
  meal('Frango, arroz e feijão', 'post', [['Peito de frango grelhado', 150], ['Arroz branco cozido', 150], ['Feijão carioca cozido', 100], ['Salada de folhas', 50]]),
  meal('Ovos cozidos + pão integral', 'post', [['Ovo cozido', 3], ['Pão de forma integral', 2]]),
  meal('Iogurte, granola e morango', 'post', [['Iogurte grego zero (100 g)', 2], ['Granola', 30], ['Morango', 100]]),
  meal('Whey, banana e aveia', 'post', [['Whey protein (30 g)', 1], ['Banana prata', 1], ['Aveia em flocos', 30]]),
];

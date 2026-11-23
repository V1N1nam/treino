// Camada de dados: todo acesso ao estado passa por aqui.
// Persistência em localStorage (dados pequenos, síncrono, simples).
import { EXERCISES } from './data/exercises.js';
import { FOODS } from './data/foods.js';
import { dateKey, weekdayOf } from './dates.js';

const KEY = 'treino:v1';

const EX_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));
const EX_BY_NAME = new Map(EXERCISES.map((e) => [e.name.toLowerCase(), e]));
const FOOD_BY_ID = new Map(FOODS.map((f) => [f.id, f]));

// Plano semanal padrão (índice = dia da semana, 0 = domingo).
const DEFAULT_PLAN = {
  1: { type: 'gym', workoutId: null, runKind: 'Rodagem', km: 5 },
  2: { type: 'run', workoutId: null, runKind: 'Rodagem', km: 5 },
  3: { type: 'gym', workoutId: null, runKind: 'Rodagem', km: 5 },
  4: { type: 'run', workoutId: null, runKind: 'Intervalado', km: 5 },
  5: { type: 'gym', workoutId: null, runKind: 'Rodagem', km: 5 },
  6: { type: 'run', workoutId: null, runKind: 'Longão', km: 10 },
  0: { type: 'rest', workoutId: null, runKind: 'Rodagem', km: 5 },
};

const empty = () => ({
  version: 2,
  exercises: [],   // exercícios personalizados { id, name, primary, secondary }
  foods: [],       // alimentos personalizados (mesmo formato de data/foods.js)
  meals: [],       // refeições salvas { id, name, when, items: [{ foodId, qty }] }
  workouts: [],    // fichas { id, name, items: [{ exerciseId, sets, reps, rest }] }
  sessions: [],    // treinos de musculação { id, date, workoutId, workoutName, start, end, entries }
  active: null,    // sessão em andamento
  plan: structuredClone(DEFAULT_PLAN),
  days: {},        // por data: { pre: [], post: [], runs: [], plan?, rpe?, weight? }
  settings: { defaultRest: 90, weight: 75 },
});

let state = load();

function hydrate(data) {
  const base = empty();
  return migrate({ ...base, ...data, settings: { ...base.settings, ...data.settings }, plan: data.plan ?? base.plan });
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? hydrate(JSON.parse(raw)) : empty();
  } catch {
    return empty();
  }
}

// v1 → v2: exercícios com nome igual ao da biblioteca passam a usar o id dela.
function migrate(d) {
  if ((d.version ?? 1) < 2) {
    const map = {};
    d.exercises = d.exercises.filter((e) => {
      const lib = EX_BY_NAME.get(e.name.toLowerCase());
      if (lib) map[e.id] = lib.id;
      return !lib;
    });
    d.exercises.forEach((e) => { e.primary ??= []; e.secondary ??= []; });
    const fix = (x) => { if (map[x.exerciseId]) x.exerciseId = map[x.exerciseId]; };
    d.workouts.forEach((w) => w.items.forEach(fix));
    d.sessions.forEach((s) => s.entries.forEach(fix));
    d.active?.entries.forEach(fix);
    d.version = 2;
  }
  return d;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Falha ao salvar', e);
  }
}

export const getState = () => state;

/** Muta o estado dentro de fn e salva. */
export function update(fn) {
  fn(state);
  save();
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ---------- Exercícios ----------

export const getExercise = (id) => EX_BY_ID.get(id) ?? state.exercises.find((e) => e.id === id);
export const exerciseName = (id) => getExercise(id)?.name ?? 'Exercício removido';

export function createCustomExercise(name, primary = []) {
  const id = uid();
  update((s) => s.exercises.push({ id, name: name.trim(), primary, secondary: [] }));
  return id;
}

// ---------- Alimentos ----------

export const getFood = (id) => FOOD_BY_ID.get(id) ?? state.foods.find((f) => f.id === id);
export const allFoods = () => [...FOODS, ...state.foods];

// ---------- Dias e plano ----------

export const getDay = (key) => state.days[key] ?? {};

/** Use dentro de update(): devolve o objeto do dia, criando se precisar. */
export function dayRef(s, key) {
  return (s.days[key] ??= { pre: [], post: [], runs: [] });
}

/** Registra (ou apaga, com null) o peso de um dia. O peso do perfil passa a ser o da pesagem mais recente. */
export function setWeight(key, kg) {
  update((s) => {
    const d = dayRef(s, key);
    if (kg > 0) d.weight = Math.round(kg * 10) / 10;
    else delete d.weight;
    const latest = Object.keys(s.days).filter((k) => s.days[k].weight).sort().pop();
    if (latest) s.settings.weight = s.days[latest].weight;
  });
}

export const dayPlan = (key) => state.days[key]?.plan ?? state.plan[weekdayOf(key)];

export const sessionDate = (s) => s.date ?? dateKey(s.start);
export const sessionsOn = (key) => state.sessions.filter((s) => sessionDate(s) === key);
export const runsOn = (key) => state.days[key]?.runs ?? [];
export const hasActivity = (key) => runsOn(key).length > 0 || sessionsOn(key).length > 0;

export function startSession(workout, date) {
  update((s) => {
    s.active = {
      id: uid(),
      date,
      workoutId: workout?.id ?? null,
      workoutName: workout?.name ?? 'Treino livre',
      start: Date.now(),
      entries: (workout?.items ?? []).map((it) => ({
        exerciseId: it.exerciseId,
        target: { sets: it.sets, reps: it.reps, rest: it.rest },
        sets: Array.from({ length: it.sets }, () => ({ kg: '', reps: '', done: false })),
      })),
    };
  });
}

/** Itens de ficha a partir de uma sessão: séries feitas, reps mais frequente, descanso da meta. */
export function workoutItemsFrom(session) {
  return session.entries
    .map((en) => ({ en, done: en.sets.filter((s) => s.done) }))
    .filter(({ done }) => done.length)
    .map(({ en, done }) => {
      const count = {};
      done.forEach((s) => { const r = String(s.reps || ''); if (r) count[r] = (count[r] ?? 0) + 1; });
      const reps = Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] ?? String(en.target?.reps ?? '10');
      return { exerciseId: en.exerciseId, sets: done.length, reps, rest: en.target?.rest ?? state.settings.defaultRest };
    });
}

/** Atualiza ficha com a sessão: muda séries/reps do que foi feito, mantém o que foi pulado, acrescenta o que é novo. */
export function mergeIntoWorkout(workout, session) {
  const fresh = workoutItemsFrom(session);
  const byId = new Map(fresh.map((it) => [it.exerciseId, it]));
  workout.items = workout.items.map((it) => (byId.has(it.exerciseId) ? { ...it, ...byId.get(it.exerciseId), rest: it.rest } : it));
  const known = new Set(workout.items.map((it) => it.exerciseId));
  workout.items.push(...fresh.filter((it) => !known.has(it.exerciseId)));
}

/** Cria ficha nova a partir de uma sessão e devolve o id. Use dentro de update(). */
export function addWorkoutFrom(s, session, name) {
  const w = { id: uid(), name, items: workoutItemsFrom(session) };
  s.workouts.push(w);
  return w;
}

// ---------- Consultas de histórico ----------

/** Séries da última sessão finalizada que teve esse exercício. */
export function lastSetsFor(exerciseId) {
  for (let i = state.sessions.length - 1; i >= 0; i--) {
    const entry = state.sessions[i].entries.find((en) => en.exerciseId === exerciseId);
    const done = entry?.sets.filter((s) => s.done);
    if (done?.length) return done;
  }
  return [];
}

/** 1RM estimado (Epley). */
export const est1RM = (kg, reps) => (reps > 0 ? kg * (1 + reps / 30) : 0);

export function sessionVolume(session) {
  let v = 0;
  for (const en of session.entries)
    for (const s of en.sets) if (s.done) v += (+s.kg || 0) * (+s.reps || 0);
  return v;
}

/** Melhor série (maior 1RM estimado) de um exercício numa sessão. */
export function bestSet(entry) {
  const sets = entry?.sets.filter((x) => x.done && +x.kg > 0 && +x.reps > 0) ?? [];
  if (!sets.length) return null;
  const best = sets.reduce((a, b) => (est1RM(+b.kg, +b.reps) > est1RM(+a.kg, +a.reps) ? b : a));
  return { kg: +best.kg, reps: +best.reps, e1rm: est1RM(+best.kg, +best.reps), maxKg: Math.max(...sets.map((x) => +x.kg)) };
}

/** Série histórica por exercício: um ponto por sessão. */
export function progressFor(exerciseId) {
  const points = [];
  for (const s of state.sessions) {
    const b = bestSet(s.entries.find((e) => e.exerciseId === exerciseId));
    if (b) points.push({ date: s.start, maxKg: b.maxKg, e1rm: b.e1rm, best: b });
  }
  return points;
}

// ---------- Backup ----------

export const exportData = () => JSON.stringify(state, null, 2);

export function importData(json) {
  const data = JSON.parse(json);
  if (!Array.isArray(data.workouts) || !Array.isArray(data.sessions)) throw new Error('Arquivo inválido');
  state = hydrate(data);
  save();
}

export function resetAll() {
  state = empty();
  save();
}

save(); // grava migração, se houve
navigator.storage?.persist?.();

// Cálculos dos resultados do dia (calorias, músculos, progressão).
import { getState, getDay, getFood, getExercise, sessionsOn, runsOn, sessionDate, bestSet, sessionVolume } from './store.js';
import { foodMacros } from './data/foods.js';
import { RUN_MUSCLES_PER_KM } from './data/muscles.js';
import { addDays } from './dates.js';


export function mealTotals(items = []) {
  const t = { kcal: 0, p: 0, c: 0, f: 0 };
  for (const it of items) {
    const food = getFood(it.foodId);
    if (!food) continue;
    const m = foodMacros(food, it.qty);
    t.kcal += m.kcal; t.p += m.p; t.c += m.c; t.f += m.f;
  }
  return t;
}

// Se o cronômetro ficou curto demais (esqueceu de iniciar/finalizar), estima ~2,5 min por série.
export function sessionMinutes(s) {
  if (s.strava?.sec) return Math.min(180, s.strava.sec / 60);
  const real = (s.end - s.start) / 60000;
  const sets = s.entries.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0);
  return Math.min(180, real >= 5 ? real : sets * 2.5);
}
export const pace = (r) => (r.km > 0 ? r.sec / r.km : 0); // segundos por km

export function fmtPace(secPerKm) {
  if (!secPerKm) return '—';
  const m = Math.floor(secPerKm / 60), s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

// ---------- Perfil ----------
export const GOALS = {
  lose: { label: 'Perder peso' },
  keep: { label: 'Manter' },
  gain: { label: 'Ganhar peso' },
};

export function profile() {
  const s = getState().settings;
  return { height: 0, age: 0, goal: 'keep', ...s.profile, weight: s.weight };
}
export const bmi = (p = profile()) => (p.height > 0 ? p.weight / (p.height / 100) ** 2 : 0);
export const bmiLabel = (v) => (v < 18.5 ? 'abaixo do peso' : v < 25 ? 'normal' : v < 30 ? 'sobrepeso' : 'obesidade');
export const waterTarget = () => Math.round((getState().settings.weight * 35) / 50) * 50; // ml

/** Classe do selo de variação de peso conforme o objetivo (verde = na direção certa). */
export function weightTrendClass(diff) {
  const goal = profile().goal;
  if (!diff || goal === 'keep') return Math.abs(diff) < 0.5 ? 'flat' : 'neg';
  return (goal === 'lose' ? diff < 0 : diff > 0) ? 'pos' : 'neg';
}

/** Pesagens em ordem: [{ key, weight }]. */
export function weighIns() {
  const days = getState().days;
  return Object.keys(days).filter((k) => days[k].weight).sort().map((k) => ({ key: k, weight: days[k].weight }));
}

/** Média dos últimos 7 dias (com pesagem) até a data, e a da semana anterior. */
export function weightAverages(key) {
  const list = weighIns().filter((w) => w.key <= key);
  const avg = (a) => (a.length ? a.reduce((s, w) => s + w.weight, 0) / a.length : null);
  const from = addDays(key, -6), prevFrom = addDays(key, -13);
  return {
    week: avg(list.filter((w) => w.key >= from)),
    prev: avg(list.filter((w) => w.key >= prevFrom && w.key < from)),
  };
}

// Zonas de FC (% da FC máx estimada por Tanaka: 208 − 0,7 × idade).
export const hrMax = (age = profile().age) => Math.round(208 - 0.7 * age);
export const ZONES = [
  { code: 'Z1', label: 'Recuperação', from: 0.5 },
  { code: 'Z2', label: 'Aeróbico', from: 0.6 },
  { code: 'Z3', label: 'Tempo', from: 0.7 },
  { code: 'Z4', label: 'Limiar', from: 0.8 },
  { code: 'Z5', label: 'VO₂máx', from: 0.9 },
];
export function hrZone(hr) {
  const p = profile();
  if (!hr || !(p.age > 0)) return null;
  const pct = hr / hrMax(p.age);
  return [...ZONES].reverse().find((z) => pct >= z.from) ?? null;
}

/** Minutos de treino no dia (musculação + corrida). */
export function dayMinutes(key) {
  return sessionsOn(key).reduce((a, s) => a + sessionMinutes(s), 0) + runsOn(key).reduce((a, r) => a + r.sec / 60, 0);
}

/** Séries por músculo nos dias informados (primário = 1, secundário = 0,5). */
export function musclesFor(keys) {
  const out = {};
  const add = (m, v) => (out[m] = (out[m] ?? 0) + v);
  for (const key of keys) {
    for (const s of sessionsOn(key))
      for (const en of s.entries) {
        const n = en.sets.filter((x) => x.done).length;
        const ex = getExercise(en.exerciseId);
        if (!n || !ex) continue;
        ex.primary?.forEach((m) => add(m, n));
        ex.secondary?.forEach((m) => add(m, n * 0.5));
      }
    for (const r of runsOn(key))
      for (const [m, perKm] of Object.entries(RUN_MUSCLES_PER_KM)) add(m, perKm * r.km);
  }
  return out;
}

export const weekKeys = (key) => Array.from({ length: 7 }, (_, i) => addDays(key, i - 6));

/** Para cada exercício da sessão: melhor série vs a sessão anterior com o mesmo exercício. */
export function exerciseDeltas(session) {
  const prior = getState().sessions.filter((s) => s.start < session.start);
  return session.entries.map((en) => {
    const now = bestSet(en);
    let prev = null, prevDate = null;
    for (let i = prior.length - 1; i >= 0 && !prev; i--) {
      prev = bestSet(prior[i].entries.find((e) => e.exerciseId === en.exerciseId));
      if (prev) prevDate = sessionDate(prior[i]);
    }
    return { exerciseId: en.exerciseId, now, prev, prevDate };
  }).filter((d) => d.now);
}

export function volumeDelta(session) {
  if (!session.workoutId) return null;
  const prev = [...getState().sessions].reverse().find((s) => s.workoutId === session.workoutId && s.start < session.start);
  if (!prev) return null;
  const a = sessionVolume(prev), b = sessionVolume(session);
  return { prev: a, now: b, pct: a ? ((b - a) / a) * 100 : 0, date: sessionDate(prev) };
}

export function runDelta(run, key) {
  const days = getState().days;
  const keys = Object.keys(days).filter((k) => k < key).sort().reverse();
  for (const k of keys) {
    const prev = [...(days[k].runs ?? [])].reverse().find((r) => r.kind === run.kind);
    if (prev) return { prev, date: k, diff: pace(run) - pace(prev) };
  }
  return null;
}

export function lastWeightBefore(key) {
  const days = getState().days;
  const k = Object.keys(days).filter((d) => d < key && days[d].weight).sort().pop();
  return k ? { key: k, weight: days[k].weight } : null;
}

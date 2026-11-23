// Cálculos dos resultados do dia (calorias, músculos, progressão).
import { getState, getDay, getFood, getExercise, sessionsOn, runsOn, sessionDate, bestSet, sessionVolume } from './store.js';
import { foodMacros } from './data/foods.js';
import { RUN_MUSCLES_PER_KM } from './data/muscles.js';
import { addDays } from './dates.js';

const MET_GYM = 5; // musculação moderada/intensa

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
  const real = (s.end - s.start) / 60000;
  const sets = s.entries.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0);
  return Math.min(180, real >= 5 ? real : sets * 2.5);
}
export const gymKcal = (s, weight) => MET_GYM * weight * (sessionMinutes(s) / 60);
export const runKcal = (r, weight) => r.kcal ?? weight * r.km * 1.0; // do Strava, ou ~1 kcal por kg por km
export const pace = (r) => (r.km > 0 ? r.sec / r.km : 0); // segundos por km

export function fmtPace(secPerKm) {
  if (!secPerKm) return '—';
  const m = Math.floor(secPerKm / 60), s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

export function dayCalories(key) {
  const { weight } = getState().settings;
  const day = getDay(key);
  const pre = mealTotals(day.pre), post = mealTotals(day.post);
  const sessions = sessionsOn(key), runs = runsOn(key);
  const gym = sessions.reduce((a, s) => a + gymKcal(s, weight), 0);
  const run = runs.reduce((a, r) => a + runKcal(r, weight), 0);
  const intake = pre.kcal + post.kcal;
  return {
    intake, gym, run, burned: gym + run, balance: intake - gym - run,
    protein: pre.p + post.p, carbs: pre.c + post.c, fat: pre.f + post.f,
    gymMin: sessions.reduce((a, s) => a + sessionMinutes(s), 0),
    runMin: runs.reduce((a, r) => a + r.sec / 60, 0),
  };
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

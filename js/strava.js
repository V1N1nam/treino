// Integração com o Strava via Worker (ver worker/strava-worker.js).
import { getState, update, uid } from './store.js';
import { parseKey } from './dates.js';

const cfg = () => getState().settings.strava ?? {};
export const stravaWorker = () => cfg().worker ?? '';
export const stravaReady = () => !!(cfg().worker && cfg().refresh);
export const stravaAthlete = () => cfg().athlete ?? '';

function cleanUrl(u) {
  u = u.trim().replace(/\/+$/, '');
  return u && !/^https?:\/\//.test(u) ? `https://${u}` : u;
}

export function setWorker(u) {
  update((s) => (s.settings.strava = { ...cfg(), worker: cleanUrl(u) }));
}

async function token() {
  const c = cfg();
  if (c.access && c.expiresAt > Date.now() / 1000 + 120) return c.access;
  const r = await fetch(`${c.worker}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: c.refresh }),
  });
  const t = await r.json().catch(() => ({}));
  if (!t.access_token) throw new Error(t.message || 'Não deu pra renovar o acesso ao Strava');
  update((s) => Object.assign(s.settings.strava, { access: t.access_token, refresh: t.refresh_token, expiresAt: t.expires_at }));
  return t.access_token;
}

async function api(path) {
  const r = await fetch(`${cfg().worker}/api/${path}`, { headers: { Authorization: `Bearer ${await token()}` } });
  if (!r.ok) throw new Error(`Strava respondeu ${r.status}`);
  return r.json();
}

export async function connect(refresh) {
  update((s) => (s.settings.strava = { worker: cfg().worker, refresh: refresh.trim() }));
  try {
    const me = await api('athlete');
    update((s) => (s.settings.strava.athlete = `${me.firstname ?? ''} ${me.lastname ?? ''}`.trim()));
    return me;
  } catch (e) {
    disconnect();
    throw e;
  }
}

export function disconnect() {
  update((s) => (s.settings.strava = { worker: cfg().worker }));
}

const RUN_TYPES = ['Run', 'TrailRun', 'VirtualRun'];
const GYM_TYPES = ['WeightTraining', 'Workout', 'Crossfit', 'HighIntensityIntervalTraining'];
export const isRun = (a) => RUN_TYPES.includes(a.sport_type || a.type);
export const isGym = (a) => GYM_TYPES.includes(a.sport_type || a.type);

/** Todas as atividades do Strava no dia (fuso do celular). */
export async function stravaActivitiesOn(key) {
  const after = parseKey(key).getTime() / 1000;
  return api(`athlete/activities?after=${after}&before=${after + 86400}&per_page=30`);
}

/** Resumo de uma musculação do Strava pra vincular a uma sessão do app. */
export async function toGym(a) {
  let d = {};
  try { d = await api(`activities/${a.id}`); } catch {}
  return {
    id: a.id,
    name: a.name,
    start: Date.parse(a.start_date),
    sec: a.elapsed_time || a.moving_time,
    hr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
    maxHr: a.max_heartrate ? Math.round(a.max_heartrate) : null,
    effort: d.suffer_score ?? a.suffer_score ?? null,
  };
}

export function guessKind(name, fallback) {
  const n = name.toLowerCase();
  if (/long[aã]o|\blong\b/.test(n)) return 'Longão';
  if (/interval|tiro/.test(n)) return 'Intervalado';
  if (/regener/.test(n)) return 'Regenerativo';
  if (/fartlek/.test(n)) return 'Fartlek';
  if (/tempo/.test(n)) return 'Tempo run';
  return fallback;
}

/** Converte atividade do Strava em corrida do app (busca detalhe pra calorias e esforço). */
export async function toRun(a, fallbackKind) {
  let d = {};
  try { d = await api(`activities/${a.id}`); } catch {}
  return {
    id: uid(),
    stravaId: a.id,
    name: a.name,
    km: Math.round(a.distance / 10) / 100,
    sec: a.moving_time,
    kind: guessKind(a.name ?? '', fallbackKind),
    rpe: d.perceived_exertion ? Math.round(d.perceived_exertion) : 6,
    hr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
    kcal: d.calories || null,
    elev: Math.round(a.total_elevation_gain || 0),
  };
}

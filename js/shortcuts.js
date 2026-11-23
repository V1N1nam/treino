// Água registrada pelos atalhos do iPhone (via Worker + KV).
import { getState, update, dayRef } from './store.js';
import { dateKey } from './dates.js';
import { stravaWorker } from './strava.js';
import { toast } from './ui.js';
import { rerender } from './router.js';

export const shortcutKey = () => getState().settings.shortcutKey ?? '';
export const shortcutsReady = () => !!(stravaWorker() && shortcutKey());

export function newShortcutKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const key = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  update((s) => (s.settings.shortcutKey = key));
  return key;
}

export const waterUrl = (ml) => `${stravaWorker()}/water/add?key=${shortcutKey()}&ml=${ml}`;

let busy = false;
/** Busca a água pendente no Worker e soma no dia certo. */
export async function pullWater({ silent = false } = {}) {
  if (!shortcutsReady() || busy) return false;
  busy = true;
  try {
    const r = await fetch(`${stravaWorker()}/water/take?key=${encodeURIComponent(shortcutKey())}`);
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || `Erro ${r.status}`);
    const list = await r.json();
    if (!list.length) return true;
    update((s) => {
      for (const w of list) {
        const d = dayRef(s, dateKey(w.at));
        d.water = (d.water ?? 0) + w.ml;
        (d.waterLog ??= []).push(w.ml);
      }
    });
    const total = list.reduce((a, w) => a + w.ml, 0);
    toast(`+${total.toLocaleString('pt-BR')} ml dos atalhos`);
    rerender();
    return true;
  } catch (e) {
    if (!silent) toast(e.message);
    return false;
  } finally {
    busy = false;
  }
}

// Backup automático na nuvem (Worker + KV do Cloudflare).
// Os dados continuam no iPhone; a nuvem guarda uma cópia (a mais recente + uma por dia, 14 dias).
import { exportData, importData, update } from './store.js';
import { stravaWorker } from './strava.js';
import { shortcutKey } from './shortcuts.js';
import { toast } from './ui.js';

const LAST = 'treino:lastBackup'; // fora do estado, pra não disparar backup de si mesmo
const DEBOUNCE = 20000;

export const lastBackup = () => +localStorage.getItem(LAST) || 0;
export const backupReady = () => !!(stravaWorker() && shortcutKey());

let timer = null, running = false, dirty = false;

const cleanUrl = (u) => {
  u = u.trim().replace(/\/+$/, '');
  return u && !/^https?:\/\//.test(u) ? `https://${u}` : u;
};

/** Agenda um backup alguns segundos depois da última alteração. */
export function scheduleBackup() {
  if (!backupReady()) return;
  dirty = true;
  clearTimeout(timer);
  timer = setTimeout(() => backupNow({ silent: true }), DEBOUNCE);
}

export const flushBackup = () => dirty && backupNow({ silent: true });

export async function backupNow({ silent = false } = {}) {
  if (!backupReady() || running) return false;
  running = true;
  clearTimeout(timer);
  try {
    const body = exportData();
    const r = await fetch(`${stravaWorker()}/backup/put?key=${encodeURIComponent(shortcutKey())}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: body.length < 60000,
    });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || `Erro ${r.status}`);
    localStorage.setItem(LAST, String(Date.now()));
    dirty = false;
    if (!silent) toast('Backup feito');
    return true;
  } catch (e) {
    if (!silent) toast(`Backup falhou: ${e.message}`);
    return false;
  } finally {
    running = false;
  }
}

export async function listBackups(worker, key) {
  const r = await fetch(`${cleanUrl(worker)}/backup/list?key=${encodeURIComponent(key.trim())}`);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || `Erro ${r.status}`);
  return r.json();
}

/** Baixa um backup e substitui os dados do app. Mantém o Worker e a chave usados. */
export async function restoreBackup(worker, key, name = 'backup:latest') {
  worker = cleanUrl(worker); key = key.trim();
  const r = await fetch(`${worker}/backup/get?key=${encodeURIComponent(key)}&name=${encodeURIComponent(name)}`);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || `Erro ${r.status}`);
  importData(await r.text());
  update((s) => {
    s.settings.strava = { ...s.settings.strava, worker };
    s.settings.shortcutKey = key;
  });
  localStorage.setItem(LAST, String(Date.now()));
}

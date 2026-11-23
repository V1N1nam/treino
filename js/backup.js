// Backup automático na nuvem (Worker + KV do Cloudflare).
// Os dados continuam no iPhone; a nuvem guarda a cópia mais recente + as 14 últimas (uma por semana).
import { exportData, importData, update } from './store.js';
import { stravaWorker } from './strava.js';
import { shortcutKey } from './shortcuts.js';
import { toast } from './ui.js';

const LAST = 'treino:lastBackup'; // fora do estado, pra não disparar backup de si mesmo
const WEEK = 7 * 24 * 3600 * 1000;

export const lastBackup = () => +localStorage.getItem(LAST) || 0;
export const backupReady = () => !!(stravaWorker() && shortcutKey());

let running = false;

const cleanUrl = (u) => {
  u = u.trim().replace(/\/+$/, '');
  return u && !/^https?:\/\//.test(u) ? `https://${u}` : u;
};

/** Faz o backup se o último tiver mais de 7 dias. */
export const nextBackupAt = () => lastBackup() + WEEK;
export function backupIfDue() {
  if (backupReady() && Date.now() >= nextBackupAt()) backupNow({ silent: true });
}

export async function backupNow({ silent = false } = {}) {
  if (!backupReady() || running) return false;
  running = true;
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

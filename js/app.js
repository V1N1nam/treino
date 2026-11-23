import { getState } from './store.js';
import { fmtDuration, h, sheet } from './ui.js';
import { VERSION, CHANGES } from './version.js';
import { pullWater } from './shortcuts.js';
import { icon } from './icons.js';

document.querySelectorAll('[data-i]').forEach((el) => el.append(icon(el.dataset.i, 22)));
import { workoutsView } from './views/workouts.js';
import { dayView } from './views/day.js';
import { calendarView } from './views/calendar.js';
import { editorView } from './views/editor.js';
import { sessionView } from './views/session.js';
import { historyView, sessionDetailView } from './views/history.js';
import { progressView, exerciseProgressView } from './views/progress.js';
import { settingsView } from './views/settings.js';

// [regex da rota, view, aba ativa]
const routes = [
  [/^#\/$/, () => dayView(), 'day'],
  [/^#\/day(?:\/([\d-]+|today))?(?:\/(\w+))?$/, dayView, 'day'],
  [/^#\/calendar(?:\/([\d-]+))?$/, calendarView, 'calendar'],
  [/^#\/workouts$/, workoutsView, 'workouts'],
  [/^#\/workout\/new$/, () => editorView(null), 'workouts'],
  [/^#\/workout\/(\w+)$/, editorView, 'workouts'],
  [/^#\/session$/, sessionView, 'day'],
  [/^#\/history$/, historyView, 'progress'],
  [/^#\/history\/(\w+)$/, sessionDetailView, 'day'],
  [/^#\/progress$/, progressView, 'progress'],
  [/^#\/progress\/([\w-]+)$/, exerciseProgressView, 'progress'],
  [/^#\/settings$/, settingsView, 'settings'],
];

const app = document.getElementById('app');
let lastHash = '';

function render() {
  document.querySelectorAll('.sheet-bg').forEach((el) => el.remove());
  document.body.classList.remove('noscroll');
  const hash = location.hash || '#/';
  for (const [re, view, tab] of routes) {
    const m = hash.match(re);
    if (!m) continue;
    app.replaceChildren(view(...m.slice(1)));
    document.querySelectorAll('#tabbar a').forEach((a) => a.classList.toggle('on', a.dataset.tab === tab));
    // Rola pro topo só ao trocar de tela (não ao trocar de aba do mesmo dia).
    if (hash.split('/').slice(0, 3).join('/') !== lastHash.split('/').slice(0, 3).join('/')) window.scrollTo(0, 0);
    lastHash = hash;
    updatePill();
    return;
  }
  location.hash = '#/';
}

// Atalho pro treino em andamento quando você sai da tela do treino.
function updatePill() {
  const pill = document.getElementById('active-pill');
  const { active } = getState();
  const show = active && location.hash !== '#/session';
  pill.hidden = !show;
  if (show) pill.textContent = `Treino em andamento · ${active.workoutName} · ${fmtDuration(Date.now() - active.start)}`;
}

// Relógio único: atualiza cronômetros na tela sem re-renderizar.
setInterval(() => {
  const { active } = getState();
  if (!active) return;
  document.querySelectorAll('[data-elapsed]').forEach((el) => (el.textContent = fmtDuration(Date.now() - active.start)));
  updatePill();
}, 1000);

window.addEventListener('hashchange', render);
window.addEventListener('rerender', render);
render();

// ---------- Atualizações ----------
// 1) Versão nova assumiu com o app aberto → banner "Atualizar".
// 2) Depois de recarregar numa versão nova → painel com as novidades (uma vez).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && reg.update());
  });
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return;
    document.getElementById('update-bar').hidden = false;
  });
  document.getElementById('update-btn').addEventListener('click', () => location.reload());
}

const seen = localStorage.getItem('treino:version');
if (seen && seen !== VERSION) {
  sheet(`Atualizado para a versão ${VERSION}`, (close) => h('div', { class: 'sheet-body' },
    h('p', { class: 'muted small' }, 'O que mudou:'),
    h('ul', { class: 'changes' }, CHANGES.map((c) => h('li', {}, c))),
    h('button', { class: 'btn primary block', onClick: close }, 'Fechar'),
  ));
}
localStorage.setItem('treino:version', VERSION);

// Água registrada pelos atalhos do iPhone: busca ao abrir e ao voltar pro app.
pullWater({ silent: true });
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && pullWater({ silent: true }));

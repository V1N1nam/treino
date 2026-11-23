// Mapa muscular didático (frente e costas). Cor = quantas séries o músculo recebeu.
import { MUSCLES } from './data/muscles.js';

const SILHOUETTE_SIDE = `
  <rect x="30" y="74" width="18" height="80" rx="9" transform="rotate(10 39 76)"/>
  <rect x="18" y="150" width="16" height="72" rx="8" transform="rotate(5 26 150)"/>
  <ellipse cx="19" cy="230" rx="7" ry="10"/>
  <rect x="63" y="200" width="35" height="118" rx="16"/>
  <rect x="67" y="312" width="27" height="84" rx="12"/>
  <ellipse cx="80" cy="402" rx="14" ry="6"/>`;

const SILHOUETTE = `
  <ellipse cx="100" cy="30" rx="17" ry="21"/>
  <rect x="91" y="46" width="18" height="20" rx="4"/>
  <path d="M70,64 L130,64 Q150,68 152,84 L146,130 Q140,160 134,190 L138,212 L62,212 L66,190 Q60,160 54,130 L48,84 Q50,68 70,64 Z"/>
  ${SILHOUETTE_SIDE}
  <g transform="translate(200 0) scale(-1 1)">${SILHOUETTE_SIDE}</g>`;

// Músculos espelhados: desenhados só do lado esquerdo.
const FRONT = {
  ombros: '<ellipse cx="54" cy="84" rx="12" ry="14"/>',
  peito: '<path d="M98,76 L74,74 Q62,80 64,98 Q72,114 98,110 Z"/>',
  biceps: '<ellipse cx="33" cy="115" rx="7" ry="22" transform="rotate(10 33 115)"/>',
  antebraco: '<ellipse cx="23" cy="186" rx="6" ry="26" transform="rotate(5 23 186)"/>',
  obliquos: '<path d="M84,116 L68,118 Q64,150 70,186 L84,188 Z"/>',
  quadriceps: '<path d="M66,222 Q60,262 70,306 L90,306 Q98,262 94,222 Z"/>',
  adutores: '<path d="M95,218 L98,218 L98,268 Q92,256 92,236 Z"/>',
  panturrilha: '<ellipse cx="78" cy="352" rx="8" ry="28"/>',
};
const FRONT_CENTER = {
  abdomen: [116, 137, 158].map((y) => `<rect x="87" y="${y}" width="12" height="18" rx="4"/><rect x="101" y="${y}" width="12" height="18" rx="4"/>`).join(''),
};

const BACK = {
  costas: '<path d="M97,100 L70,86 Q58,108 68,146 Q82,166 97,172 Z"/>',
  ombros: '<ellipse cx="54" cy="84" rx="12" ry="14"/>',
  triceps: '<ellipse cx="34" cy="113" rx="7" ry="24" transform="rotate(10 34 113)"/>',
  antebraco: '<ellipse cx="23" cy="186" rx="6" ry="26" transform="rotate(5 23 186)"/>',
  gluteos: '<path d="M99,200 L70,198 Q60,222 70,244 Q88,254 99,244 Z"/>',
  posterior: '<path d="M67,252 Q62,282 71,308 L92,308 Q98,282 95,252 Z"/>',
  panturrilha: '<ellipse cx="80" cy="346" rx="11" ry="26"/>',
};
const BACK_CENTER = {
  trapezio: '<path d="M100,48 L86,62 L66,72 L100,124 L134,72 L114,62 Z"/>',
  lombar: '<rect x="88" y="168" width="24" height="28" rx="6"/>',
};

const FULL = 10; // séries no dia para cor máxima

function fill(v) {
  if (!v) return 'fill="#3a404b"';
  const t = Math.min(1, v / FULL);
  return `fill="#c6ff3d" fill-opacity="${(0.3 + 0.7 * t).toFixed(2)}"`;
}

function figure(sides, centers, values, label) {
  const g = (m, shape, mirror) =>
    `<g data-m="${m}" ${fill(values[m])}>${shape}${mirror ? `<g transform="translate(200 0) scale(-1 1)">${shape}</g>` : ''}</g>`;
  const parts = [
    ...Object.entries(sides).map(([m, s]) => g(m, s, true)),
    ...Object.entries(centers).map(([m, s]) => g(m, s, false)),
  ].join('');
  return `<figure><svg viewBox="0 0 200 412"><g fill="#23272e">${SILHOUETTE}</g><g stroke="#0e0f12" stroke-width="1.2">${parts}</g></svg><figcaption>${label}</figcaption></figure>`;
}

export function bodyMap(values, onTap) {
  const el = document.createElement('div');
  el.className = 'bodymap';
  el.innerHTML = figure(FRONT, FRONT_CENTER, values, 'Frente') + figure(BACK, BACK_CENTER, values, 'Costas');
  el.querySelectorAll('[data-m]').forEach((node) =>
    node.addEventListener('click', () => onTap?.(node.dataset.m, MUSCLES[node.dataset.m], values[node.dataset.m] ?? 0))
  );
  return el;
}

// Mapa muscular (frente e costas). Formas definidas por pontos do lado esquerdo,
// suavizadas (Catmull-Rom) e espelhadas. Cor relativa: o músculo mais trabalhado fica no máximo.
import { MUSCLES } from './data/muscles.js';

/** Pontos → caminho fechado suave. */
function smooth(pts) {
  const n = pts.length;
  const r = (v) => Math.round(v * 10) / 10;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [r(p1[0] + (p2[0] - p0[0]) / 6), r(p1[1] + (p2[1] - p0[1]) / 6)];
    const c2 = [r(p2[0] - (p3[0] - p1[0]) / 6), r(p2[1] - (p3[1] - p1[1]) / 6)];
    d += ` C${c1} ${c2} ${p2}`;
  }
  return d + 'Z';
}
const mirror = (pts) => pts.map(([x, y]) => [200 - x, y]).reverse();

// Contorno da metade esquerda do corpo (passa um pouco do centro pra não deixar emenda).
const BODY = [
  [104, 44], [93, 44], [92, 56], [80, 61], [68, 64], [56, 68], [48, 76], [46, 90], [44, 110], [41, 132], [38, 150],
  [34, 172], [29, 200], [26, 214], [21, 226], [21, 238], [26, 242], [31, 234], [34, 218], [40, 190], [46, 168],
  [51, 148], [55, 124], [58, 104], [60, 122], [63, 150], [64, 168], [61, 190], [59, 210], [60, 240], [62, 275],
  [66, 305], [68, 322], [66, 345], [69, 372], [72, 392], [68, 402], [74, 408], [86, 407], [89, 396], [90, 372],
  [92, 345], [93, 322], [95, 295], [98, 255], [100, 232], [104, 226], [104, 140],
];

const DELT = [[70, 64], [58, 67], [49, 77], [46, 92], [50, 104], [56, 100], [60, 86], [68, 72]];
const FOREARM = [[50, 150], [40, 150], [34, 170], [30, 195], [32, 208], [36, 206], [41, 186], [47, 166]];

// Cada músculo: lista de formas (pontos do lado esquerdo). center: true = já desenhado inteiro.
const FRONT = {
  trapezio: [[[92, 51], [84, 59], [72, 64], [82, 66], [93, 60]]],
  ombros: [DELT],
  peito: [[[98, 72], [80, 68], [66, 74], [61, 88], [63, 100], [73, 108], [88, 110], [98, 105]]],
  biceps: [[[56, 103], [50, 105], [45, 116], [43, 132], [46, 142], [52, 138], [55, 124]]],
  antebraco: [FOREARM],
  obliquos: [[[85, 113], [71, 111], [63, 124], [65, 150], [68, 178], [79, 191], [85, 185], [84, 150]]],
  abdomen: { center: true, rects: [[88, 114, 11, 15], [101, 114, 11, 15], [88, 132, 11, 15], [101, 132, 11, 15], [88, 150, 11, 15], [101, 150, 11, 15], [89, 168, 10, 22], [101, 168, 10, 22]] },
  quadriceps: [[[67, 218], [61, 240], [62, 275], [67, 303], [76, 314], [86, 312], [92, 299], [94, 262], [90, 233], [80, 222]]],
  adutores: [[[97, 228], [91, 236], [92, 262], [97, 282], [99, 252]]],
  panturrilha: [[[71, 330], [67, 350], [70, 375], [78, 384], [84, 372], [88, 350], [86, 332], [78, 326]]],
};

const BACK = {
  trapezio: { center: true, pts: [[100, 46], [92, 54], [80, 62], [66, 68], [72, 76], [86, 84], [94, 110], [100, 128], [106, 110], [114, 84], [128, 76], [134, 68], [120, 62], [108, 54]] },
  costas: [[[96, 112], [86, 94], [72, 90], [62, 101], [60, 122], [64, 148], [76, 168], [92, 176], [98, 160]]],
  ombros: [DELT],
  triceps: [[[57, 100], [48, 96], [44, 110], [42, 130], [46, 144], [52, 140], [56, 124]]],
  antebraco: [FOREARM],
  lombar: [[[98, 150], [91, 153], [88, 178], [92, 197], [98, 195]]],
  gluteos: [[[99, 201], [84, 197], [66, 201], [60, 218], [66, 238], [82, 246], [96, 242], [100, 226]]],
  posterior: [[[67, 247], [62, 270], [66, 300], [76, 314], [86, 312], [94, 296], [96, 262], [90, 249], [79, 251]]],
  panturrilha: [[[71, 326], [64, 342], [66, 364], [74, 377], [80, 368], [86, 377], [92, 362], [92, 340], [86, 326], [78, 322]]],
};

// Escala: sem treino → cinza; pouco → verde escuro; mais trabalhado → verde máximo.
const OFF = '#2a2f36';
const LOW = [62, 78, 22];
const HIGH = [198, 255, 61];
export function heat(t) {
  if (t <= 0) return OFF;
  const k = 0.18 + 0.82 * t;
  const c = LOW.map((lo, i) => Math.round(lo + (HIGH[i] - lo) * k));
  return `rgb(${c.join(',')})`;
}

function shapes(def) {
  if (def.rects) return def.rects.map(([x, y, w, hh]) => `<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="3.5"/>`).join('');
  if (def.center) return `<path d="${smooth(def.pts)}"/>`;
  return def.map((pts) => `<path d="${smooth(pts)}"/><path d="${smooth(mirror(pts))}"/>`).join('');
}

function figure(defs, values, max, top, label) {
  const parts = Object.entries(defs).map(([m, def]) => {
    const v = values[m] ?? 0;
    const t = v / max;
    return `<g data-m="${m}" fill="${heat(t)}" ${m === top ? 'filter="url(#glow)"' : ''}>${shapes(def)}</g>`;
  }).join('');
  return `<figure><svg viewBox="12 14 176 400">
    <defs><filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <g fill="#1a1d21"><ellipse cx="100" cy="28" rx="15" ry="19"/><path d="${smooth(BODY)}"/><path d="${smooth(mirror(BODY))}"/></g>
    <g stroke="#141619" stroke-width="1.6" stroke-linejoin="round">${parts}</g>
  </svg><figcaption>${label}</figcaption></figure>`;
}

export function bodyMap(values, onTap) {
  const entries = Object.entries(values).filter(([, v]) => v > 0);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  const top = entries.sort((a, b) => b[1] - a[1])[0]?.[0];
  const el = document.createElement('div');
  el.className = 'bodymap-wrap';
  el.innerHTML = `<div class="bodymap">${figure(FRONT, values, max, top, 'Frente')}${figure(BACK, values, max, top, 'Costas')}</div>
    <div class="heat-scale"><span>Menos</span><i></i><span>Mais</span></div>`;
  el.querySelectorAll('[data-m]').forEach((node) =>
    node.addEventListener('click', () => onTap?.(node.dataset.m, MUSCLES[node.dataset.m], values[node.dataset.m] ?? 0))
  );
  return el;
}

import { getState, exerciseName, progressFor } from '../store.js';
import { h, header, fmtShortDate, fmtDate, fmtKg } from '../ui.js';
import { evoTabs } from './history.js';

export function progressView() {
  const { exercises } = getState();
  const rows = exercises
    .map((e) => ({ e, pts: progressFor(e.id) }))
    .filter((r) => r.pts.length)
    .sort((a, b) => b.pts.at(-1).date - a.pts.at(-1).date);

  return h('div', { class: 'page' },
    header('Evolução'),
    evoTabs('progress'),
    !rows.length && h('div', { class: 'empty' }, h('p', {}, 'Finalize alguns treinos pra ver sua evolução por exercício.')),
    rows.map(({ e, pts }) => {
      const first = pts[0].e1rm, last = pts.at(-1).e1rm;
      const diff = first ? ((last - first) / first) * 100 : 0;
      return h('a', { class: 'card link-card', href: `#/progress/${e.id}` },
        h('div', { class: 'card-head' },
          h('div', {}, h('h2', {}, e.name), h('p', { class: 'muted' }, `${pts.length} sessões`)),
          h('div', { class: 'stat-right' },
            h('strong', {}, `${fmtKg(Math.max(...pts.map((p) => p.maxKg)))} kg`),
            h('small', { class: diff >= 0 ? 'up' : 'down' }, `${diff >= 0 ? '+' : ''}${diff.toFixed(0)}% 1RM`),
          ),
        ),
        pts.length > 1 && sparkline(pts.map((p) => p.e1rm)),
      );
    }),
  );
}

export function exerciseProgressView(id) {
  const pts = progressFor(id);
  const pr = pts.length ? pts.reduce((a, b) => (b.e1rm > a.e1rm ? b : a)) : null;
  const maxKg = pts.length ? pts.reduce((a, b) => (b.maxKg > a.maxKg ? b : a)) : null;

  return h('div', { class: 'page' },
    header(exerciseName(id), { back: '#/progress' }),
    !pts.length && h('div', { class: 'empty' }, h('p', {}, 'Sem dados ainda.')),
    pr && h('div', { class: 'session-stats' },
      h('div', {}, h('small', {}, 'Maior carga'), h('strong', {}, `${fmtKg(maxKg.maxKg)} kg`)),
      h('div', {}, h('small', {}, '1RM estimado'), h('strong', {}, `${fmtKg(pr.e1rm)} kg`)),
      h('div', {}, h('small', {}, 'Melhor série'), h('strong', {}, `${fmtKg(+pr.best.kg)}×${pr.best.reps}`)),
    ),
    pts.length > 1 && h('div', { class: 'card' }, h('h3', { class: 'section' }, '1RM estimado'), lineChart(pts)),
    pts.length > 0 && h('div', { class: 'card' },
      h('h3', { class: 'section' }, 'Sessões'),
      h('div', { class: 'set-list' }, [...pts].reverse().map((p) => h('div', {},
        h('span', { class: 'muted' }, fmtDate(p.date)),
        ` ${fmtKg(+p.best.kg)} kg × ${p.best.reps}`,
        h('span', { class: 'muted right' }, `~${fmtKg(p.e1rm)}`),
      ))),
    ),
  );
}

const SVG = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}) => {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

function scale(values, w, hgt, pad) {
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  return values.map((v, i) => [
    pad + (i / Math.max(1, values.length - 1)) * (w - pad * 2),
    hgt - pad - ((v - min) / span) * (hgt - pad * 2),
  ]);
}

function sparkline(values) {
  const svg = s('svg', { viewBox: '0 0 300 50', class: 'spark', preserveAspectRatio: 'none' });
  const pts = scale(values, 300, 50, 4);
  svg.append(s('polyline', { points: pts.map((p) => p.join(',')).join(' '), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }));
  return svg;
}

function lineChart(pts) {
  const W = 340, H = 180, P = 24;
  const values = pts.map((p) => p.e1rm);
  const xy = scale(values, W, H, P);
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart' });
  const min = Math.min(...values), max = Math.max(...values);

  [[min, H - P], [max, P]].forEach(([v, y]) => {
    svg.append(s('line', { x1: P, x2: W - P, y1: y, y2: y, stroke: 'var(--line)', 'stroke-dasharray': '3 4' }));
    const t = s('text', { x: 2, y: y + 4, class: 'axis' }); t.textContent = Math.round(v); svg.append(t);
  });
  const area = `M${xy[0][0]},${H - P} ` + xy.map((p) => `L${p[0]},${p[1]}`).join(' ') + ` L${xy.at(-1)[0]},${H - P} Z`;
  svg.append(s('path', { d: area, fill: 'var(--accent)', opacity: 0.12 }));
  svg.append(s('polyline', { points: xy.map((p) => p.join(',')).join(' '), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }));
  xy.forEach(([x, y]) => svg.append(s('circle', { cx: x, cy: y, r: 3.5, fill: 'var(--accent)' })));
  [[0, 'start'], [pts.length - 1, 'end']].forEach(([i, anchor]) => {
    const t = s('text', { x: xy[i][0], y: H - 4, class: 'axis', 'text-anchor': anchor }); t.textContent = fmtShortDate(pts[i].date); svg.append(t);
  });
  return svg;
}

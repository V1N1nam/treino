// Ícones de traço (24×24). icon('dumbbell', 20) devolve um <svg>.
const P = {
  today: '<rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><circle cx="12" cy="15" r="1.7" fill="currentColor" stroke="none"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M7.5 13.5h1.5M11.25 13.5h1.5M15 13.5h1.5M7.5 17h1.5M11.25 17h1.5"/>',
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  run: '<circle cx="15" cy="4.5" r="1.8"/><path d="M7.5 21l3.2-5.5 3 2.2V22M5.5 11.5l3.3-3 3.7.8 2.6 3.2 3.4 1.3M10.7 15.5l2-6.4"/>',
  hybrid: '<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6l1-8z"/>',
  rest: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  chart: '<path d="M4 4v16h16M8 15.5l3.5-4.5 3 3L20 7.5"/>',
  settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  left: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
  right: '<path d="M9.5 5.5L16 12l-6.5 6.5"/>',
  down: '<path d="M6 9.5l6 6 6-6"/>',
  up: '<path d="M6 14.5l6-6 6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>',
  refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4.8h-4.8"/>',
  arrowUp: '<path d="M12 19V5.5M6.5 11L12 5.5 17.5 11"/>',
  arrowDown: '<path d="M12 5v13.5M6.5 13l5.5 5.5 5.5-5.5"/>',
  minus: '<path d="M5 12h14"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  drop: '<path d="M12 3.5c3 3.8 6 7.4 6 10.8A6 6 0 0 1 6 14.3C6 10.9 9 7.3 12 3.5z"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
};

export function icon(name, size = 20) {
  const t = document.createElement('template');
  t.innerHTML = `<svg class="i" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] ?? ''}</svg>`;
  return t.content.firstChild;
}

export const iconHTML = (name, size = 20) => icon(name, size).outerHTML;

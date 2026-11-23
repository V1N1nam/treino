// Datas como chave 'AAAA-MM-DD' no fuso local.
const pad = (n) => String(n).padStart(2, '0');

export const dateKey = (d = new Date()) => {
  d = d instanceof Date ? d : new Date(d);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const todayKey = () => dateKey(new Date());

export const parseKey = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (k, n) => {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return dateKey(d);
};

export const weekdayOf = (k) => parseKey(k).getDay(); // 0 = domingo
export const startOfWeek = (k) => addDays(k, -((weekdayOf(k) + 6) % 7)); // segunda

export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const WD_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const WD_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const fmtDayLong = (k) => {
  const d = parseKey(k);
  return `${WD_LONG[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
};
export const fmtDM = (k) => k.slice(8, 10) + '/' + k.slice(5, 7);

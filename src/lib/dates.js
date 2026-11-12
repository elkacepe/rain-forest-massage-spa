// Utilidades de fechas sin zonas horarias: todo se maneja como 'YYYY-MM-DD' y 'HH:MM' locales.

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export const pad = (n) => String(n).padStart(2, '0');

export function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function fmtISO(dt) {
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export function todayISO() {
  return fmtISO(new Date());
}

export function addDays(s, n) {
  const dt = parseDate(s);
  dt.setDate(dt.getDate() + n);
  return fmtISO(dt);
}

export function toMin(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function fromMin(min) {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

export function lastDayOfMonth(y, m) {
  return new Date(y, m, 0).getDate(); // m 1-12
}

/** Id de quincena: 'YYYY-MM-1' (1 al 15) o 'YYYY-MM-2' (16 a fin de mes). */
export function quincenaOf(dateISO) {
  const [y, m, d] = dateISO.split('-').map(Number);
  return `${y}-${pad(m)}-${d <= 15 ? 1 : 2}`;
}

export function quincenaRange(qid) {
  const [y, m, h] = qid.split('-').map(Number);
  if (h === 1) return { start: `${y}-${pad(m)}-01`, end: `${y}-${pad(m)}-15` };
  return { start: `${y}-${pad(m)}-16`, end: `${y}-${pad(m)}-${pad(lastDayOfMonth(y, m))}` };
}

export function prevQuincena(qid) {
  const { start } = quincenaRange(qid);
  return quincenaOf(addDays(start, -1));
}

export function nextQuincena(qid) {
  const { end } = quincenaRange(qid);
  return quincenaOf(addDays(end, 1));
}

export function quincenaLabel(qid) {
  const { start, end } = quincenaRange(qid);
  const [y, m, d1] = start.split('-').map(Number);
  const d2 = Number(end.split('-')[2]);
  return `${d1}–${d2} ${MESES[m - 1]} ${y}`;
}

export function dateLabel(dateISO, { withWeekday = true } = {}) {
  const dt = parseDate(dateISO);
  const base = `${dt.getDate()} ${MESES[dt.getMonth()]}`;
  return withWeekday ? `${DIAS[dt.getDay()]} ${base}` : base;
}

export function weekday(dateISO) {
  return parseDate(dateISO).getDay();
}

/** Diferencia en minutos entre dos instantes 'YYYY-MM-DD' + 'HH:MM'. */
export function minutesBetween(d1, t1, d2, t2) {
  const a = parseDate(d1).getTime() / 60000 + toMin(t1);
  const b = parseDate(d2).getTime() / 60000 + toMin(t2);
  return Math.round(b - a);
}

export function daysInRange(start, end) {
  const out = [];
  let d = start;
  while (d <= end) {
    out.push(d);
    d = addDays(d, 1);
  }
  return out;
}

export function nowHHMM() {
  const n = new Date();
  return `${pad(n.getHours())}:${pad(n.getMinutes())}`;
}

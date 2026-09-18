const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_FULL = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return [y ?? 1970, m ?? 1, d ?? 1];
}

/** Номер дня от эпохи, в UTC: арифметика дат без часовых поясов. */
export function toN(iso: string): number {
  const [y, m, d] = parts(iso);
  return Date.UTC(y, m - 1, d) / 86400000;
}
export function isoOf(n: number): string {
  return new Date(n * 86400000).toISOString().slice(0, 10);
}
export function fmt(iso: string): string {
  const [, m, d] = parts(iso);
  return `${d} ${MONTHS[m - 1]}`;
}
export function fmtFull(iso: string): string {
  const [y, m, d] = parts(iso);
  return `${d} ${MONTHS_GEN[m - 1]} ${y}`;
}
/** 0 = понедельник … 6 = воскресенье. */
export function dow(iso: string): number {
  return (new Date(toN(iso) * 86400000).getUTCDay() + 6) % 7;
}
export function isWeekend(iso: string): boolean {
  return dow(iso) >= 5;
}
export function workdays(a: string, b: string): number {
  let n = 0;
  for (let t = toN(a); t <= toN(b); t++) if (!isWeekend(isoOf(t))) n++;
  return n;
}
export function addWorkdays(iso: string, n: number): string {
  let t = toN(iso);
  let left = n;
  while (left > 0) {
    t++;
    if (!isWeekend(isoOf(t))) left--;
  }
  return isoOf(t);
}
export function ymOf(iso: string): string {
  return iso.slice(0, 7);
}
export function addMonth(ym: string, k: number): string {
  let [y, m] = ym.split('-').map(Number) as [number, number];
  m += k;
  while (m > 12) { m -= 12; y++; }
  while (m < 1) { m += 12; y--; }
  return `${y}-${String(m).padStart(2, '0')}`;
}
export function ymLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  return `${MONTHS_FULL[m - 1]} ${y}`;
}
export function plural(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b === 1) return forms[0];
  if (b >= 2 && b <= 4) return forms[1];
  return forms[2];
}
/** «8 сентября» */
export function fmtDayMonth(iso: string): string {
  const [, m, d] = parts(iso);
  return `${d} ${MONTHS_GEN[m - 1]}`;
}
/** Отметка действия в карточке: «4 сен 17:05», по местному времени браузера. */
export function fmtStamp(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${hh}:${mm}`;
}
/** Инициалы из имени: «Иван Петров» → «ИП». */
export function initials(name: string): string {
  const p = name.replace(/\./g, '').split(' ');
  return (p[0]?.[0] ?? '') + (p[1]?.[0] ?? '');
}

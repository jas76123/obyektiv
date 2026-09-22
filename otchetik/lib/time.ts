export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

/** «Сегодня», «Вчера» или «21 сентября». */
/** Какой календарный день (локальное время) у этого момента. Если передана просто дата, возвращает её неизменённой. */
export function dayKey(iso: string): string {
  // Если это уже просто дата (YYYY-MM-DD), не сдвигаем её часовым поясом
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return iso;
  }
  // Это ISO-8601, парсим как момент времени и берём локальный день
  return todayIso(new Date(iso));
}

export function fmtDay(iso: string, now: Date = new Date()): string {
  const day = dayKey(iso);
  const today = todayIso(now);
  const yesterday = todayIso(new Date(now.getTime() - 86400000));
  if (day === today) return 'Сегодня';
  if (day === yesterday) return 'Вчера';
  const d = new Date(day + 'T00:00:00');
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

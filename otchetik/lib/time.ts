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
export function fmtDay(iso: string, now: Date = new Date()): string {
  const day = iso.slice(0, 10);
  const today = todayIso(now);
  const yesterday = todayIso(new Date(now.getTime() - 86400000));
  if (day === today) return 'Сегодня';
  if (day === yesterday) return 'Вчера';
  const d = new Date(day + 'T00:00:00');
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

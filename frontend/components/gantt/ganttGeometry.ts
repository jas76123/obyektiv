import { toN, isoOf, dow, fmt } from '@/lib/format';

export interface GanttWindow { start: string; days: number }
type Span = { plan_start: string; plan_end: string };

/** Окно по умолчанию: шесть недель, начиная с понедельника недели перед текущей. */
export function sixWeeks(asOf: string): GanttWindow {
  const monday = toN(asOf) - dow(asOf);
  return { start: isoOf(monday - 7), days: 42 };
}

export function wholeObject(works: Span[]): GanttWindow {
  const minS = Math.min(...works.map((w) => toN(w.plan_start)));
  const maxE = Math.max(...works.map((w) => toN(w.plan_end)));
  const start = minS - dow(isoOf(minS));
  const end = maxE + (6 - dow(isoOf(maxE)));
  return { start: isoOf(start), days: end - start + 1 };
}

const ix = (win: GanttWindow, iso: string) => toN(iso) - toN(win.start);

export function barStyle(win: GanttWindow, start: string, end: string): { left: string; width: string } | null {
  const a = Math.max(0, ix(win, start));
  const b = Math.min(win.days, ix(win, end) + 1);
  if (b <= a) return null;
  return { left: `${((a / win.days) * 100).toFixed(2)}%`, width: `${(((b - a) / win.days) * 100).toFixed(2)}%` };
}

export function todayLeft(win: GanttWindow, asOf: string): string {
  return `${(((ix(win, asOf) + 0.5) / win.days) * 100).toFixed(2)}%`;
}

/** Подписи недель; в длинном окне подписывается каждая вторая. */
export function weekScale(win: GanttWindow): string[] {
  const cols = Math.ceil(win.days / 7);
  const every = cols > 9 ? 2 : 1;
  return Array.from({ length: cols }, (_, i) => (i % every === 0 ? fmt(isoOf(toN(win.start) + i * 7)) : ''));
}

export function inWindow(win: GanttWindow, w: Span): boolean {
  return ix(win, w.plan_end) >= 0 && ix(win, w.plan_start) < win.days;
}

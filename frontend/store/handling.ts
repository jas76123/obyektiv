import type { Alert, Tag } from '@/contract';
import { OUTCOMES, type OutcomeCode } from '@/contract/labels';
import { addWorkdays, fmtDayMonth, fmtStamp } from '@/lib/format';

export interface Handling {
  state: 'new' | 'seen' | 'contacted' | 'closed';
  by?: string | null; role?: string | null; at?: string | null;
  target?: string | null; channel?: string | null; due?: string | null;
  outcome?: OutcomeCode | null; comment?: string | null;
}

/** Авторизации нет: действия в карточках записываются от имени демонстрационного пользователя. */
export const ME = { name: 'Титова Е.', role: 'руководитель проекта' };

export function effective(a: Alert, local: Record<string, Handling>): Handling {
  return local[a.id] ?? a.handling;
}

export function markSeen(h: Handling, now: Date): Handling {
  if (h.state !== 'new') return h;
  return { ...h, state: 'seen', by: ME.name, role: ME.role, at: fmtStamp(now) };
}

/** Срок ответа: двое рабочих суток от даты среза (BR-703). */
export function markContacted(h: Handling, p: { target: string; channel: string; asOf: string; now: Date }): Handling {
  return { ...h, state: 'contacted', by: ME.name, role: ME.role, at: fmtStamp(p.now), target: p.target, channel: p.channel, due: fmtDayMonth(addWorkdays(p.asOf, 2)) };
}

export function closeWith(h: Handling, p: { outcome: OutcomeCode; comment: string; now: Date }): Handling {
  if (!p.comment.trim()) throw new Error('Комментарий обязателен: закрыть без причины нельзя');
  return { ...h, state: 'closed', by: ME.name, role: ME.role, at: fmtStamp(p.now), outcome: p.outcome, comment: p.comment.trim() };
}

export function resolvesWork(h: Handling): boolean {
  return h.state === 'closed' && OUTCOMES.some((o) => o.code === h.outcome && o.resolves);
}

export function manualTag(h: Handling): Tag | null {
  if (h.state !== 'closed' || !h.outcome) return null;
  const o = OUTCOMES.find((x) => x.code === h.outcome);
  if (!o) return null;
  return { kind: 'manual', text: o.resolves ? `РЕШЕНО ВРУЧНУЮ · ${o.tag}` : o.tag };
}

import { describe, it, expect } from 'vitest';
import { feedList, feedCounts, setupList, gapOf, type FeedState } from '@/components/portfolio/feedLogic';
import type { Alert } from '@/contract';
import type { HandlingView } from '@/store/summary';

function alert(id: string, p: Partial<Alert> & { declared?: number; confirmed?: number | null }): Alert {
  return {
    id, kind: 'claim', tone: 'bad', severity: 50, object_id: 'o1', object_short: 'Б-объект', contractor: 'Подрядчик', untouched_days: 0,
    triad: { plan_today: 0, declared: { percent: p.declared ?? 0 }, confirmed: p.confirmed === undefined ? 0 : p.confirmed, confirmed_days: 0, elapsed_days: 0, note: '' },
    ...p,
  } as Alert;
}
const alerts = [
  alert('A-1', { severity: 95, declared: 100, confirmed: 0, untouched_days: 1 }),
  alert('A-2', { severity: 58, tone: 'warn', object_id: 'o2', object_short: 'А-объект', contractor: 'Альфа' }),
  alert('A-3', { severity: 60, tone: 'ok', untouched_days: 3 }),
  alert('A-4', { severity: 30, tone: 'grey', kind: 'setup' }),
  alert('A-5', { severity: 35, tone: 'grey', declared: 100, confirmed: null }),
];
const states: Record<string, HandlingView> = { 'A-1': { state: 'new' }, 'A-2': { state: 'seen' }, 'A-3': { state: 'closed', outcome: 'explained' }, 'A-4': { state: 'new' }, 'A-5': { state: 'new' } };
const h = (a: Alert) => states[a.id]!;
const base: FeedState = { objectId: null, sort: 'sev', onlyNew: false, onlyBad: false, showClosed: false };

describe('лента', () => {
  it('по умолчанию: претензии без закрытых, по остроте', () => {
    expect(feedList(alerts, h, base).map((a) => a.id)).toEqual(['A-1', 'A-2', 'A-5']);
  });
  it('фильтры', () => {
    expect(feedList(alerts, h, { ...base, showClosed: true }).map((a) => a.id)).toEqual(['A-1', 'A-3', 'A-2', 'A-5']);
    expect(feedList(alerts, h, { ...base, onlyNew: true }).map((a) => a.id)).toEqual(['A-1', 'A-5']);
    expect(feedList(alerts, h, { ...base, onlyBad: true }).map((a) => a.id)).toEqual(['A-1']);
    expect(feedList(alerts, h, { ...base, objectId: 'o2' }).map((a) => a.id)).toEqual(['A-2']);
  });
  it('сортировки', () => {
    expect(feedList(alerts, h, { ...base, sort: 'obj' })[0]?.id).toBe('A-2');
    expect(feedList(alerts, h, { ...base, sort: 'contr' })[0]?.id).toBe('A-2');
    expect(feedList(alerts, h, { ...base, sort: 'stale', showClosed: true })[0]?.id).toBe('A-3');
    expect(feedList(alerts, h, { ...base, sort: 'gap' }).map((a) => a.id)).toEqual(['A-1', 'A-2', 'A-5']);
  });
  it('разрыв: без наблюдения всегда в конце', () => {
    expect(gapOf(alerts[0]!)).toBe(100);
    expect(gapOf(alerts[4]!)).toBe(-999);
  });
  it('счётчики кнопок фильтров и блок настройки', () => {
    expect(feedCounts(alerts, h, null)).toEqual({ base: 4, onlyNew: 2, onlyBad: 1, closed: 1 });
    expect(setupList(alerts, null).map((a) => a.id)).toEqual(['A-4']);
    expect(setupList(alerts, 'o2')).toEqual([]);
  });
});

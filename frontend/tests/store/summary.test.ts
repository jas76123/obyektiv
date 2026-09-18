import { describe, it, expect } from 'vitest';
import { summarize, badgeOf, isOpen, type HandlingView } from '@/store/summary';
import type { Alert } from '@/contract';

function alert(p: Partial<Alert>): Alert {
  return { id: 'A', object_id: 'o1', object_short: 'Объект', work_name: 'Работа', kind: 'claim', severity: 10, tone: 'bad', ...p } as Alert;
}
const alerts = [
  alert({ id: 'A-1', object_id: 'o1', severity: 95, work_name: 'Армирование', object_short: 'Северный' }),
  alert({ id: 'A-2', object_id: 'o1', severity: 58, tone: 'warn' }),
  alert({ id: 'A-3', object_id: 'o2', severity: 60, tone: 'ok' }),
  alert({ id: 'A-4', object_id: 'o1', kind: 'setup', severity: 30, tone: 'grey' }),
];
const states: Record<string, HandlingView> = { 'A-1': { state: 'new' }, 'A-2': { state: 'seen' }, 'A-3': { state: 'closed', outcome: 'explained' }, 'A-4': { state: 'new' } };
const h = (a: Alert) => states[a.id]!;

describe('summary', () => {
  it('открытое = претензия и не закрыто', () => {
    expect(isOpen(alerts[0]!, { state: 'new' })).toBe(true);
    expect(isOpen(alerts[0]!, { state: 'closed', outcome: 'held' })).toBe(false);
    expect(isOpen(alerts[3]!, { state: 'new' })).toBe(false);
  });
  it('пять чисел сводки', () => {
    expect(summarize(alerts, h)).toEqual({
      open_alerts: 2, objects_with_alerts: 1, untouched_alerts: 1, setup_tasks: 1,
      sharpest: { alert_id: 'A-1', text: 'Армирование · Северный' },
    });
  });
  it('бейдж объекта: число открытых и тон самого острого', () => {
    expect(badgeOf('o1', alerts, h)).toEqual({ count: 2, tone: 'bad' });
    expect(badgeOf('o2', alerts, h)).toEqual({ count: 0, tone: null });
  });
});

import { describe, it, expect } from 'vitest';
import { sixWeeks, wholeObject, barStyle, todayLeft, weekScale, inWindow } from '@/components/gantt/ganttGeometry';

const win = sixWeeks('2026-09-04');

describe('геометрия Ганта', () => {
  it('окно шести недель: с понедельника прошлой недели', () => {
    expect(win).toEqual({ start: '2026-08-24', days: 42 });
  });
  it('окно «весь объект»: от понедельника первой работы до воскресенья последней', () => {
    expect(wholeObject([{ plan_start: '2026-08-18', plan_end: '2026-08-21' }, { plan_start: '2026-09-22', plan_end: '2026-10-05' }])).toEqual({ start: '2026-08-17', days: 56 });
  });
  it('полоса: отступ и ширина в процентах окна', () => {
    expect(barStyle(win, '2026-08-28', '2026-09-03')).toEqual({ left: '9.52%', width: '16.67%' });
  });
  it('полоса обрезается краями окна, вне окна её нет', () => {
    expect(barStyle(win, '2026-08-18', '2026-08-25')).toEqual({ left: '0.00%', width: '4.76%' });
    expect(barStyle(win, '2026-08-18', '2026-08-21')).toBeNull();
  });
  it('вертикаль «сегодня» по центру дня', () => {
    expect(todayLeft(win, '2026-09-04')).toBe('27.38%');
  });
  it('шкала недель', () => {
    expect(weekScale(win)).toEqual(['24 авг', '31 авг', '7 сен', '14 сен', '21 сен', '28 сен']);
    const long = weekScale({ start: '2026-06-01', days: 140 });
    expect(long).toHaveLength(20);
    expect(long[1]).toBe('');
  });
  it('работа в окне', () => {
    expect(inWindow(win, { plan_start: '2026-08-18', plan_end: '2026-08-21' })).toBe(false);
    expect(inWindow(win, { plan_start: '2026-10-01', plan_end: '2026-10-09' })).toBe(true);
  });
});

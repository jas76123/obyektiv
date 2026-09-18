import { describe, it, expect } from 'vitest';
import { fmt, fmtFull, isWeekend, workdays, addWorkdays, addMonth, ymLabel, ymOf, plural, toN, isoOf } from '@/lib/format';

describe('format', () => {
  it('короткая и полная дата', () => {
    expect(fmt('2026-09-04')).toBe('4 сен');
    expect(fmtFull('2026-09-04')).toBe('4 сентября 2026');
  });
  it('выходные: суббота и воскресенье', () => {
    expect(isWeekend('2026-09-05')).toBe(true);
    expect(isWeekend('2026-09-06')).toBe(true);
    expect(isWeekend('2026-09-04')).toBe(false);
  });
  it('рабочие дни включительно', () => {
    expect(workdays('2026-08-28', '2026-09-03')).toBe(5);
    expect(workdays('2026-09-05', '2026-09-06')).toBe(0);
  });
  it('+2 рабочих дня от пятницы это вторник', () => {
    expect(addWorkdays('2026-09-04', 2)).toBe('2026-09-08');
  });
  it('месяцы', () => {
    expect(ymOf('2026-09-04')).toBe('2026-09');
    expect(addMonth('2026-12', 1)).toBe('2027-01');
    expect(addMonth('2026-01', -1)).toBe('2025-12');
    expect(ymLabel('2026-09')).toBe('Сентябрь 2026');
  });
  it('склонение', () => {
    const f: [string, string, string] = ['день', 'дня', 'дней'];
    expect(plural(1, f)).toBe('день');
    expect(plural(3, f)).toBe('дня');
    expect(plural(11, f)).toBe('дней');
    expect(plural(25, f)).toBe('дней');
  });
  it('toN и isoOf обратны', () => {
    expect(isoOf(toN('2026-02-28') + 1)).toBe('2026-03-01');
  });
});

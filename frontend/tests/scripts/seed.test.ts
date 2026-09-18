import { describe, it, expect } from 'vitest';
import { OBJECTS, ALERTS, CAMS, TODAY } from '@/scripts/seed';
import { mapStatus } from '@/scripts/seed/map';
import { demoAcceptance, demoFrames, demoCatalog, parseCsv } from '@/scripts/seed/demo';

describe('seed', () => {
  it('данные макета перенесены целиком', () => {
    expect(Object.keys(OBJECTS)).toEqual(['sev', 'park', 'rom', 'rech', 'school', 'metro']);
    expect(ALERTS).toHaveLength(8);
    expect(Object.keys(CAMS)).toHaveLength(6);
    expect(TODAY).toBe('2026-09-04');
  });
  it('все статусы макета переводятся в словарь БА', () => {
    for (const o of Object.values(OBJECTS)) for (const w of Object.values(o.works)) expect(() => mapStatus(w.status)).not.toThrow();
    expect(mapStatus('confirmed')).toBe('in_progress');
    expect(mapStatus('reported_mismatch')).toBe('false_completion');
  });
  it('csv с кавычками и запятыми', () => {
    expect(parseCsv('a,b\n"x, y",2\n')).toEqual([{ a: 'x, y', b: '2' }]);
  });
  it('демо-набор читается', () => {
    expect(demoFrames()).toHaveLength(451);
    expect(demoCatalog().find((e) => e.pattern === 'разработка котлована')?.classes).toEqual({ excavator: 1, dump_truck: 1 });
    const acc = demoAcceptance();
    expect(acc).toHaveLength(12);
    expect(acc.find((r) => r.id === 'W-07')).toEqual({ id: 'W-07', status: 'false_completion', days: 5, confirmed: 0 });
  });
});

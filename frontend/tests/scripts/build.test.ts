import { describe, it, expect } from 'vitest';
import { PortfolioSchema, ObjectGanttSchema, WorkReviewSchema, CameraShiftSchema, SettingsSchema, type Alert } from '@/contract';
import { OBJECTS, OBJ_ORDER } from '@/scripts/seed';
import { demoAcceptance } from '@/scripts/seed/demo';
import { buildPortfolio } from '@/scripts/build/portfolio';
import { buildGantt } from '@/scripts/build/gantt';
import { buildReview } from '@/scripts/build/review';
import { buildFrameShift, cameraDates } from '@/scripts/build/frame';
import { buildSettings } from '@/scripts/build/settings';
import { summarize } from '@/store/summary';

describe('заглушки проходят схемы контракта', () => {
  it('портфель', () => { expect(() => PortfolioSchema.parse(buildPortfolio())).not.toThrow(); });
  it('Гант и настройка каждого объекта', () => {
    for (const id of OBJ_ORDER) {
      expect(() => ObjectGanttSchema.parse(buildGantt(id))).not.toThrow();
      expect(() => SettingsSchema.parse(buildSettings(id))).not.toThrow();
    }
  });
  it('разбор каждой работы', () => {
    for (const id of OBJ_ORDER) for (const wid of OBJECTS[id]!.order) expect(() => WorkReviewSchema.parse(buildReview(id, wid))).not.toThrow();
  });
  it('смена каждой камеры за каждую дату', () => {
    let n = 0;
    for (const [cam, dates] of cameraDates()) for (const d of dates) { CameraShiftSchema.parse(buildFrameShift(cam, d)); n++; }
    expect(n).toBeGreaterThan(40);
  });
});

describe('приёмочная таблица data/demo', () => {
  it('статусы двенадцати работ «Северного»', () => {
    const gantt = buildGantt('sev');
    for (const row of demoAcceptance()) {
      const w = gantt.works.find((x) => x.id === row.id);
      expect(w?.status, row.id).toBe(row.status);
    }
  });
  it('дни и подтверждение активных работ', () => {
    for (const [id, days, confirmed] of [['W-02', 10, 9], ['W-07', 5, 0], ['W-08', 1, 0]] as const) {
      const r = buildReview('sev', id);
      expect(r.calendar.elapsed_days, id).toBe(days);
      expect(r.calendar.confirmed_days, id).toBe(confirmed);
    }
  });
  it('W-09 до начала плана «не начата», W-12 «не проверяется · нет в справочнике»', () => {
    const g = buildGantt('sev');
    expect(g.works.find((w) => w.id === 'W-09')?.status).toBe('not_started');
    const w12 = g.works.find((w) => w.id === 'W-12');
    expect([w12?.status, w12?.status_reason]).toEqual(['not_checked', 'no_catalog']);
  });
});

describe('сценарий демо', () => {
  const p = buildPortfolio();
  const byId = (id: string) => p.alerts.find((a) => a.id === id) as Alert;
  it('сводка равна пересчёту по состояниям', () => {
    expect(p.summary).toEqual(summarize(p.alerts, (a) => ({ state: a.handling.state, outcome: a.handling.outcome })));
    expect(p.summary).toMatchObject({ open_alerts: 6, objects_with_alerts: 4, untouched_alerts: 4, setup_tasks: 1 });
    expect(p.summary.sharpest?.alert_id).toBe('A-01');
  });
  it('армирование: метка rep и кадр пустой зоны', () => {
    const a = byId('A-01');
    expect(a.status).toBe('false_completion');
    expect(a.tags).toEqual([{ kind: 'rep', text: 'ЗАЯВЛЕНО 100 % · В КАДРЕ 0 ДН ИЗ 5' }]);
    expect(a.evidence.frame?.camera_id).toBe('КАМ-02');
    expect(a.evidence.frame?.detections).toEqual([]);
    expect(a.contact?.name).toBe('Сафин Р. И.');
  });
  it('котлован «Речного»: отчётность отстаёт, метка lag', () => {
    expect(byId('A-05').tags[0]?.kind).toBe('lag');
  });
  it('кран вне справочника: задача настройки без контакта претензии', () => {
    expect(byId('A-06').kind).toBe('setup');
  });
  it('закрытое ложное срабатывание несёт исход', () => {
    expect(byId('A-08').handling).toMatchObject({ state: 'closed', outcome: 'false_alarm' });
  });
  it('полоска объекта: худшее наблюдение', () => {
    expect(p.objects.map((o) => [o.id, o.worst])).toEqual([['sev', 'bad'], ['park', 'bad'], ['rom', 'ok'], ['rech', 'warn'], ['school', 'ok'], ['metro', 'none']]);
  });
  it('объект без камер: подтверждено —', () => {
    expect(p.objects.find((o) => o.id === 'metro')?.bars.confirmed).toBeNull();
    const r = buildReview('metro', 'M-02');
    expect([r.mode, r.work.status_reason]).toEqual(['not_checked', 'no_camera']);
  });
  it('рамки макета переведены из процентов в пиксели 1920×1080', () => {
    const shift = buildFrameShift('КАМ-Р2', '2026-09-04');
    expect(shift.frames[0]?.detections[0]?.bbox).toEqual([269, 86, 269, 648]);
    expect(shift.link.work_id).toBe('R-03');
  });
  it('смена КАМ-01 за 4 сентября: 11 кадров, связь с котлованом', () => {
    const shift = buildFrameShift('КАМ-01', '2026-09-04');
    expect(shift.frames).toHaveLength(11);
    expect(shift.link.work_id).toBe('W-02');
    expect(shift.frames.some((f) => f.expected_found)).toBe(true);
  });
});

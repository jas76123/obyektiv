import { describe, it, expect } from 'vitest';
import { FrameSchema, DeclaredSchema, TagSchema, PlanRowSchema, AlertSchema } from '@/contract';

const frame = {
  frame_id: 'КАМ-01_20260904_0900', camera_id: 'КАМ-01', captured_at: '2026-09-04T09:00:00+03:00',
  image_path: null, width: 1920, height: 1080,
  detections: [{ class: 'excavator', confidence: 0.93, bbox: [120, 340, 500, 400] }],
};

describe('contract', () => {
  it('кадр без картинки и без track_id допустим', () => {
    expect(FrameSchema.parse(frame).detections[0]?.bbox).toEqual([120, 340, 500, 400]);
  });
  it('рамка обязана иметь четыре числа', () => {
    const bad = { ...frame, detections: [{ class: 'excavator', confidence: 0.9, bbox: [1, 2, 3] }] };
    expect(FrameSchema.safeParse(bad).success).toBe(false);
  });
  it('«заявлено»: автор, дата и источник необязательны', () => {
    expect(DeclaredSchema.parse({ percent: 80 })).toEqual({ percent: 80 });
    expect(DeclaredSchema.parse({ percent: 80, report_date: '2026-09-03', author: 'Иванов', fact_source: 'weekly_report' }).fact_source).toBe('weekly_report');
    expect(DeclaredSchema.safeParse({ percent: 80, fact_source: 'слухи' }).success).toBe(false);
  });
  it('метка: четыре вида', () => {
    expect(TagSchema.safeParse({ kind: 'rep', text: 'ЗАЯВЛЕНО 100 %' }).success).toBe(true);
    expect(TagSchema.safeParse({ kind: 'other', text: 'x' }).success).toBe(false);
  });
  it('строка плана: семь обязательных полей', () => {
    const row = { id: 'W-01', name: 'Котлован', zone: 'Секция 1', contractor: 'СУ-7', plan_start: '2026-08-24', plan_end: '2026-09-08', fact_percent: 55 };
    expect(PlanRowSchema.safeParse(row).success).toBe(true);
    const { zone: _zone, ...noZone } = row;
    expect(PlanRowSchema.safeParse(noZone).success).toBe(false);
  });
  it('замечание с неизвестным статусом отклоняется', () => {
    expect(AlertSchema.safeParse({ id: 'A-1', status: 'confirmed' }).success).toBe(false);
  });
});

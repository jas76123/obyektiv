import { describe, it, expect } from 'vitest';
import { buildRequestText } from '@/store/requestText';
import type { Alert } from '@/contract';

function alert(p: Partial<Alert>): Alert {
  return {
    object_name: 'ЖК «Северный», корпус 2', zone: 'Секция 2', work_name: 'Армирование фундамента', work_id: 'W-07',
    kind: 'claim', tone: 'bad', status: 'false_completion', tags: [],
    triad: { plan_today: 100, declared: { percent: 100 }, confirmed: 0, confirmed_days: 0, elapsed_days: 5, note: '' },
    schedule: { plan_start: '2026-08-28', plan_end: '2026-09-03' },
    ...p,
  } as Alert;
}

describe('текст запроса подрядчику', () => {
  it('закрыто без подтверждения: факты и срок +2 рабочих дня', () => {
    const t = buildRequestText(alert({}), '2026-09-04');
    expect(t).toContain('ЖК «Северный», корпус 2, Секция 2, армирование фундамента (W-07).');
    expect(t).toContain('закрыта на 100 %');
    expect(t).toContain('подтверждено 0 из 5 рабочих дней');
    expect(t).toContain('до 8 сентября');
  });
  it('сдвиг сроков', () => {
    const t = buildRequestText(alert({ tone: 'ok', status: 'in_progress', tags: [{ kind: 'sched', text: '+3 ДНЯ' }], schedule: { plan_start: '2026-08-26', plan_end: '2026-09-04', fact_start: '2026-08-31', forecast_end: '2026-09-09' } }), '2026-09-04');
    expect(t).toContain('вышла в зону 31 авг при плане 26 авг');
    expect(t).toContain('Прогноз окончания 9 сен вместо 4 сен');
  });
  it('простой, настройка, недостаточно данных', () => {
    expect(buildRequestText(alert({ tone: 'warn', status: 'resources_only' }), '2026-09-04')).toContain('причину простоя');
    expect(buildRequestText(alert({ kind: 'setup', tone: 'grey', status: 'not_checked' }), '2026-09-04')).toContain('не описан в справочнике');
    expect(buildRequestText(alert({ tone: 'grey', status: 'insufficient' }), '2026-09-04')).toContain('кадров с камеры зоны');
  });
});

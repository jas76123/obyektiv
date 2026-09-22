import { describe, expect, it } from 'vitest';
import { demo, demoShots } from '../demo';
import { buildReport } from '../lib/reports';
import { newRecord } from '../queue/types';

const now = new Date('2026-09-22T15:00:00+03:00');
function rec(uuid: string, task: string, taken: string, status: 'queued' | 'uploaded' = 'uploaded', retake_of: string | null = null) {
  return {
    ...newRecord({ local_uuid: uuid, task_id: task, work_name: task === 't-doors' ? 'Установка дверей' : 'Армирование', zone: task === 't-doors' ? 'Зона 2' : 'Зона A', taken_at: taken, geo: null, file_path: uuid, retake_of }),
    status,
  };
}

describe('buildReport', () => {
  it('groups by day, newest first, folds work status by priority', () => {
    const days = buildReport(
      [rec('a', 't-doors', '2026-09-22T12:31:00+03:00'), rec('b', 't-doors', '2026-09-22T12:40:00+03:00'), rec('c', 't-rebar', '2026-09-21T10:00:00+03:00', 'queued')],
      { a: { local_uuid: 'a', status: 'accepted', updated_at: 'x' }, b: { local_uuid: 'b', status: 'rework', verdict_comment: 'нужен пересъём', updated_at: 'x' } },
      {},
      now,
    );
    expect(days.map((d) => d.label)).toEqual(['Сегодня', 'Вчера']);
    const doors = days[0].works[0];
    expect(doors.name).toBe('Установка дверей');
    expect(doors.status).toBe('rework');
    expect(doors.comment).toBe('нужен пересъём');
    expect(doors.photos.length).toBe(2);
    expect(days[1].works[0].status).toBe('in_work');
  });

  it('shows todays tasks without photos as not_started', () => {
    const days = buildReport([], {}, { 't-concrete': { task_id: 't-concrete', work_id: 'w', name: 'Бетонирование', zone: 'Секция C' } }, now);
    expect(days[0].label).toBe('Сегодня');
    expect(days[0].works[0].status).toBe('not_started');
  });

  it('excludes photos that have been retaken from the feed', () => {
    const days = buildReport(
      [
        rec('a', 't-doors', '2026-09-22T12:00:00+03:00', 'uploaded'),
        rec('b', 't-doors', '2026-09-22T13:00:00+03:00', 'queued', 'a'),
      ],
      { a: { local_uuid: 'a', status: 'rework', verdict_comment: 'нужен пересъём', updated_at: 'x' } },
      {},
      now,
    );
    const doors = days[0].works[0];
    expect(doors.status).toBe('in_work');
    expect(doors.photos.length).toBe(1);
    expect(doors.comment).toBeNull();
  });

  it('comment comes from the newest photo with the shown status', () => {
    const days = buildReport(
      [
        rec('a', 't-doors', '2026-09-22T13:00:00+03:00', 'uploaded'),  // newest
        rec('b', 't-doors', '2026-09-22T12:00:00+03:00', 'uploaded'),  // oldest
      ],
      {
        a: { local_uuid: 'a', status: 'rework', verdict_comment: 'X', updated_at: 'x' },
        b: { local_uuid: 'b', status: 'rejected', verdict_comment: 'Y', updated_at: 'x' },
      },
      {},
      now,
    );
    const doors = days[0].works[0];
    expect(doors.status).toBe('rework');
    expect(doors.comment).toBe('X');  // from photo A, the newest with rework status
  });

  it('percent only from the defining photo', () => {
    // P1: older, accepted, has percent
    // P2: newer, under_review, no percent
    // workStatus(['on_review', 'accepted']) returns 'on_review' (higher priority)
    // So the defining photo is P2 (newest with on_review status), which has no percent
    const days = buildReport(
      [
        rec('p2', 't-rebar', '2026-09-22T13:00:00+03:00', 'uploaded'),  // newest: under_review
        rec('p1', 't-rebar', '2026-09-22T12:00:00+03:00', 'uploaded'),  // oldest: accepted
      ],
      {
        p2: { local_uuid: 'p2', status: 'under_review', updated_at: 'x' },
        p1: { local_uuid: 'p1', status: 'accepted', accepted_percent: 50, updated_at: 'x' },
      },
      {},
      now,
    );
    const rebar = days[0].works[0];
    expect(rebar.status).toBe('on_review');  // on_review has higher priority than accepted
    expect(rebar.percent).toBeNull();  // from P2, the newest with on_review status
  });

  it('demo feed does not break on a day after the demo was written: exactly two day sections, no task twice', () => {
    const laterNow = new Date('2026-09-29T15:00:00+03:00');
    const records = demoShots(laterNow).map((d) => ({
      ...newRecord({ ...d, geo: null, file_path: '' }),
      status: 'uploaded' as const,
    }));
    const tasks = Object.fromEntries(demo.schedule.tasks.map((t) => [t.task_id, { task_id: t.task_id, work_id: t.work_id, name: t.name, zone: t.zone }]));
    const days = buildReport(records, {}, tasks, laterNow);
    expect(days.map((d) => d.label)).toEqual(['Сегодня', 'Вчера']);
    const allTaskIds = days.flatMap((d) => d.works.map((w) => w.task_id));
    expect(new Set(allTaskIds).size).toBe(allTaskIds.length);
    const concrete = days[0].works.find((w) => w.task_id === 't-concrete-0922');
    expect(concrete?.status).toBe('on_review');
  });
});

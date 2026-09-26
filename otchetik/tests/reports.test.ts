import { describe, expect, it } from 'vitest';
import { demo, demoShots } from '../demo';
import { buildReport, liveRecords, taskState } from '../lib/reports';
import { newRecord } from '../queue/types';

const now = new Date('2026-09-22T15:00:00+03:00');
function rec(uuid: string, task: string, taken: string, status: 'queued' | 'uploaded' = 'uploaded', retake_of: string | null = null) {
  return {
    ...newRecord({ local_uuid: uuid, task_id: task, work_name: task === 't-doors' ? 'Установка дверей' : 'Армирование', zone: task === 't-doors' ? 'Зона 2' : 'Зона A', taken_at: taken, geo: null, file_path: uuid, retake_of }),
    status,
  };
}

describe('buildReport', () => {
  it('группирует по дням, новые сверху; сегодня — статус самого свежего фото, вчера — итог дня', () => {
    const days = buildReport(
      [rec('a', 't-doors', '2026-09-22T12:31:00+03:00'), rec('b', 't-doors', '2026-09-22T12:40:00+03:00'), rec('c', 't-rebar', '2026-09-21T10:00:00+03:00', 'queued')],
      { a: { local_uuid: 'a', status: 'accepted', updated_at: 'x' }, b: { local_uuid: 'b', status: 'rework', verdict_comment: 'нужен пересъём', updated_at: 'x' } },
      {},
      now,
    );
    expect(days.map((d) => d.label)).toEqual(['Сегодня', 'Вчера']);
    const doors = days[0].works[0];
    expect(doors.name).toBe('Установка дверей');
    expect(doors.status).toBe('retake');
    expect(doors.label).toBe('переснять');
    expect(doors.comment).toBe('нужен пересъём');
    expect(doors.time).toBe('2026-09-22T12:40:00+03:00');
    expect(doors.photos.length).toBe(2);
    // Вчера — прошедший день: итог по dayVerdict, а не статус самого свежего фото.
    expect(days[1].works[0].status).toBe('accepted');
  });

  it('свежее фото «в работе» снимает «переснять» со старого', () => {
    const days = buildReport(
      [rec('old', 't-doors', '2026-09-22T12:00:00+03:00'), rec('new', 't-doors', '2026-09-22T13:00:00+03:00')],
      { old: { local_uuid: 'old', status: 'rework', verdict_comment: 'X', updated_at: 'x' }, new: { local_uuid: 'new', status: 'uploaded', updated_at: 'x' } },
      {},
      now,
    );
    const doors = days[0].works[0];
    expect(doors.status).toBe('in_work');
    expect(doors.comment).toBeNull();
    expect(doors.time).toBe('2026-09-22T13:00:00+03:00');
  });

  it('сегодняшние наряды без фото — не начато, без времени', () => {
    const days = buildReport([], {}, { 't-concrete': { task_id: 't-concrete', work_id: 'w', name: 'Бетонирование', zone: 'Секция C' } }, now);
    expect(days[0].label).toBe('Сегодня');
    expect(days[0].works[0].status).toBe('not_started');
    expect(days[0].works[0].time).toBeNull();
  });

  it('переснятые фото не показываются', () => {
    const days = buildReport(
      [rec('a', 't-doors', '2026-09-22T12:00:00+03:00', 'uploaded'), rec('b', 't-doors', '2026-09-22T13:00:00+03:00', 'queued', 'a')],
      { a: { local_uuid: 'a', status: 'rework', verdict_comment: 'нужен пересъём', updated_at: 'x' } },
      {},
      now,
    );
    const doors = days[0].works[0];
    expect(doors.status).toBe('in_work');
    expect(doors.photos.length).toBe(1);
    expect(doors.comment).toBeNull();
  });

  it('вердикт «переснять» даёт «переснять» без слова от сервера; слово фото — вердикт', () => {
    const days = buildReport(
      [rec('a', 't-doors', '2026-09-22T12:00:00+03:00', 'uploaded')],
      { a: { local_uuid: 'a', status: 'uploaded', updated_at: 'x' } },
      {},
      now,
      { verdicts: { a: 'retake' } },
    );
    expect(days[0].works[0].status).toBe('retake');
    expect(days[0].works[0].comment).toBeNull();
    expect(days[0].works[0].photos[0].word).toBe('переснять');
    expect(days[0].works[0].photos[0].verdict).toBe('retake');
  });

  it('«принято» у свежего фото: чип за сегодня «в работе», слово фото «принято», у недоставленного — слово доставки', () => {
    const days = buildReport(
      [rec('a', 't-doors', '2026-09-22T12:00:00+03:00', 'uploaded'), rec('q', 't-doors', '2026-09-22T12:30:00+03:00', 'queued')],
      {},
      {},
      now,
      { verdicts: { a: 'accepted', q: 'accepted' }, serverSet: true },
    );
    const doors = days[0].works[0];
    expect(doors.status).toBe('in_work');
    expect(doors.photos.map((p) => p.word)).toEqual(['ждёт сети', 'принято']);
  });

  it('прошедший день: итог «принято», если есть фото не «переснять», иначе «не принято»; кнопки нет', () => {
    const days = buildReport(
      [
        rec('y1', 't-doors', '2026-09-21T09:02:00+03:00'), rec('y2', 't-doors', '2026-09-21T10:36:00+03:00'),
        rec('r1', 't-rebar', '2026-09-21T11:00:00+03:00'),
      ],
      { r1: { local_uuid: 'r1', status: 'rework', verdict_comment: 'мало', updated_at: 'x' } },
      {},
      now,
      { verdicts: { y1: 'accepted', y2: 'retake' } },
    );
    expect(days[0].label).toBe('Вчера');
    const doors = days[0].works.find((w) => w.task_id === 't-doors')!;
    const rebar = days[0].works.find((w) => w.task_id === 't-rebar')!;
    expect(doors.status).toBe('accepted');
    expect(doors.label).toBe('принято');
    expect(doors.photos.map((p) => p.word)).toEqual(['переснять', 'принято']);
    expect(rebar.status).toBe('not_accepted');
    expect(rebar.label).toBe('не принято');
    expect(rebar.comment).toBe('мало');
  });

  it('прошедший день: работы из сохранённого наряда без фото — «не принято»; сегодняшний наряд из pastSchedules не берётся', () => {
    const task = (task_id: string, name: string) => ({ task_id, work_id: 'w', name, zone: 'Зона 1' });
    const days = buildReport(
      [rec('a', 't-doors', '2026-09-21T12:00:00+03:00')],
      {},
      { 't-doors': task('t-doors', 'Установка дверей') },
      now,
      { verdicts: { a: 'accepted' }, pastSchedules: { '2026-09-21': [task('t-doors', 'Установка дверей'), task('t-concrete', 'Бетонирование')], '2026-09-22': [task('t-x', 'Лишняя')], '2026-09-20': [] } },
    );
    expect(days.map((d) => d.label)).toEqual(['Сегодня', 'Вчера']);
    expect(days[0].works.map((w) => w.task_id)).toEqual(['t-doors']);
    expect(days[0].works[0].status).toBe('not_started');
    const yesterday = days[1].works;
    expect(yesterday.map((w) => [w.task_id, w.status])).toEqual([['t-doors', 'accepted'], ['t-concrete', 'not_accepted']]);
    expect(yesterday[1].photos).toEqual([]);
    expect(yesterday[1].time).toBeNull();
  });

  it('слово доставки у фото зависит от serverSet', () => {
    const withServer = buildReport([rec('q', 't-doors', '2026-09-22T12:00:00+03:00', 'queued')], {}, {}, now, { serverSet: true });
    const without = buildReport([rec('q', 't-doors', '2026-09-22T12:00:00+03:00', 'queued')], {}, {}, now, { serverSet: false });
    expect(withServer[0].works[0].photos[0].word).toBe('ждёт сети');
    expect(without[0].works[0].photos[0].word).toBe('ждёт сервера');
  });

  it('демо-лента на следующий день: два дня, наряд не дублируется, бетонирование в работе', () => {
    const laterNow = new Date('2026-09-29T15:00:00+03:00');
    const records = demoShots(laterNow).map((d) => ({ ...newRecord({ ...d, geo: null, file_path: '' }), status: 'uploaded' as const }));
    const tasks = Object.fromEntries(demo.schedule.tasks.map((t) => [t.task_id, { task_id: t.task_id, work_id: t.work_id, name: t.name, zone: t.zone }]));
    const days = buildReport(records, {}, tasks, laterNow);
    expect(days.map((d) => d.label)).toEqual(['Сегодня', 'Вчера']);
    const allTaskIds = days.flatMap((d) => d.works.map((w) => w.task_id));
    expect(new Set(allTaskIds).size).toBe(allTaskIds.length);
    expect(days[0].works.find((w) => w.task_id === 't-concrete-0922')?.status).toBe('in_work');
  });
});

describe('taskState', () => {
  const records = [
    rec('old', 't-doors', '2026-09-22T12:00:00+03:00'),
    rec('new', 't-doors', '2026-09-22T13:00:00+03:00'),
    rec('r', 't-rebar', '2026-09-22T11:00:00+03:00'),
  ];
  it('без фото — не начато и нет uuid', () => {
    expect(taskState([], {}, 't-doors')).toEqual({ status: 'not_started', latestUuid: null });
  });
  it('статус и uuid самого свежего фото наряда', () => {
    const st = taskState(records, { new: { local_uuid: 'new', status: 'rework', updated_at: 'x' } }, 't-doors');
    expect(st).toEqual({ status: 'retake', latestUuid: 'new' });
    expect(taskState(records, {}, 't-rebar')).toEqual({ status: 'in_work', latestUuid: 'r' });
  });
  it('переснятое фото не считается', () => {
    const withRetake = [...records, rec('newer', 't-doors', '2026-09-22T14:00:00+03:00', 'queued', 'new')];
    const st = taskState(withRetake, { new: { local_uuid: 'new', status: 'rework', updated_at: 'x' } }, 't-doors');
    expect(st).toEqual({ status: 'in_work', latestUuid: 'newer' });
  });
  it('вердикт «переснять» — переснять; «принято» — в работе', () => {
    expect(taskState(records, {}, 't-rebar', { verdicts: { r: 'retake' } }).status).toBe('retake');
    expect(taskState(records, {}, 't-rebar', { verdicts: { r: 'accepted' } }).status).toBe('in_work');
  });
});

describe('liveRecords', () => {
  it('убирает фото, на которые указывает retake_of', () => {
    const live = liveRecords([rec('a', 't-doors', '2026-09-22T12:00:00+03:00'), rec('b', 't-doors', '2026-09-22T13:00:00+03:00', 'queued', 'a')]);
    expect(live.map((r) => r.local_uuid)).toEqual(['b']);
  });
});

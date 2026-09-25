import { describe, expect, it } from 'vitest';
import type { ScheduleTask } from '../contract/schemas';
import { buildLeaderboard } from '../lib/leaderboard';
import type { PhotoEntry } from '../lib/photosCache';

const brigades = [{ id: 'br-1', name: 'Бригада №1' }, { id: 'br-2', name: 'Бригада №2' }, { id: 'br-3', name: 'Бригада №3' }];
const task = (task_id: string, name: string, zone: string): ScheduleTask => ({ task_id, work_id: 'w', name, zone });
const tasks: Record<string, ScheduleTask[]> = {
  'br-1': [task('t-doors-0922', 'Установка дверей', 'Зона 2')],
  'br-2': [task('t-doors-0922', 'Установка дверей', 'Зона 4'), task('t-floor-0922', 'Стяжка пола', 'Секция B')],
  'br-3': [],
};
function photo(server: string, brigade: string, taskId: string, uuid: string, count: number, timestamp: string): PhotoEntry {
  return { id: server, file: `${server}_${brigade}.${taskId}.${uuid}.jpg`, timestamp, count };
}

describe('buildLeaderboard', () => {
  it('считает по формуле: принято = фото с детекциями, качество = доля, баллы = ×10, ранг по баллам', () => {
    const photos = [
      photo('s1', 'br-1', 't-doors-0922', 'a', 1, '2026-09-26T10:00:00'),
      photo('s2', 'br-1', 't-doors-0922', 'b', 0, '2026-09-26T10:05:00'),
      photo('s3', 'br-2', 't-doors-0922', 'c', 2, '2026-09-26T10:10:00'),
      photo('s4', 'br-2', 't-floor-0922', 'd', 1, '2026-09-26T10:20:00'),
      photo('s5', 'br-2', 't-floor-0922', 'e', 1, '2026-09-26T10:30:00'),
      { id: 's6', file: 's6_t.jpg', timestamp: '2026-09-26T11:00:00', count: 3 }, // чужое имя — не считается
    ];
    const lb = buildLeaderboard(photos, brigades, tasks, 'br-1');
    expect(lb.brigades).toEqual([
      { id: 'br-2', name: 'Бригада №2', rank: 1, points: 30, accepted: 3, quality: 100 },
      { id: 'br-1', name: 'Бригада №1', rank: 2, points: 10, accepted: 1, quality: 50 },
      { id: 'br-3', name: 'Бригада №3', rank: 3, points: 0, accepted: 0, quality: 0 },
    ]);
  });

  it('others: три последних чужих фото с детекциями, имена из расписаний, запасной вариант — task_id', () => {
    const photos = [
      photo('s1', 'br-1', 't-doors-0922', 'a', 1, '2026-09-26T10:00:00'),
      photo('s2', 'br-2', 't-doors-0922', 'b', 1, '2026-09-26T10:10:00'),
      photo('s3', 'br-2', 't-floor-0922', 'c', 0, '2026-09-26T10:15:00'), // пусто — не «сделали»
      photo('s4', 'br-2', 't-floor-0922', 'd', 1, '2026-09-26T10:20:00'),
      photo('s5', 'br-3', 't-rebar-0922', 'e', 1, '2026-09-26T10:30:00'),
      photo('s6', 'br-3', 't-rebar-0922', 'f', 1, '2026-09-26T10:40:00'),
      photo('s7', 'br-9', 't-x', 'g', 1, '2026-09-26T10:50:00'), // бригады нет на объекте — мимо
    ];
    const lb = buildLeaderboard(photos, brigades, tasks, 'br-1');
    expect(lb.others).toEqual([
      { brigade: 'Бригада №3', work: 't-rebar-0922', zone: '', status: 'accepted' },
      { brigade: 'Бригада №3', work: 't-rebar-0922', zone: '', status: 'accepted' },
      { brigade: 'Бригада №2', work: 'Стяжка пола', zone: 'Секция B', status: 'accepted' },
    ]);
  });

  it('при равных баллах порядок по имени; без фото все по нулям и в таблице', () => {
    const lb = buildLeaderboard([], brigades, tasks, null);
    expect(lb.brigades.map((b) => [b.rank, b.name])).toEqual([[1, 'Бригада №1'], [2, 'Бригада №2'], [3, 'Бригада №3']]);
    expect(lb.others).toEqual([]);
  });
});

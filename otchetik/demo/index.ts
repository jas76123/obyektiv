import leaderboard from './leaderboard.json';
import objects from './objects.json';
import photos from './photos.json';
import schedule from './schedule.json';
import shotsStatus from './shots-status.json';

export const demo = { objects, schedule, shotsStatus, leaderboard, photos };

/** `now` со сдвигом на `dayOffset` дней и заданным местным временем. */
function atLocalTime(now: Date, hour: number, minute: number, dayOffset = 0): string {
  const d = new Date(now);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/**
 * Демо-записи «моих фото» для «Отчётов», когда очередь пуста и сервер недоступен.
 * Даты всегда относительно `now` (сегодня и вчера), а не вшиты в конкретное число —
 * иначе на следующий день после 22.09 работа из демо расходится по двум дням с
 * противоречащими статусами (не начато «сегодня» и на проверке «22 сентября»).
 */
export function demoShots(now: Date = new Date()) {
  return [
    { local_uuid: 'demo-concrete-1', task_id: 't-concrete-0922', work_name: 'Бетонирование', zone: 'Секция C', taken_at: atLocalTime(now, 11, 0) },
    { local_uuid: 'demo-rebar-1', task_id: 't-rebar-0922', work_name: 'Армирование', zone: 'Зона A', taken_at: atLocalTime(now, 10, 12) },
    { local_uuid: 'demo-pit-1', task_id: 't-pit-0921', work_name: 'Котлован', zone: 'Зона B', taken_at: atLocalTime(now, 16, 50, -1) },
  ];
}

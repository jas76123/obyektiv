import leaderboard from './leaderboard.json';
import objects from './objects.json';
import schedule from './schedule.json';
import shotsStatus from './shots-status.json';

export const demo = { objects, schedule, shotsStatus, leaderboard };

/** Демо-записи «моих фото» для «Отчётов», когда очередь пуста и сервер недоступен. */
export const demoShots = [
  { local_uuid: 'demo-concrete-1', task_id: 't-concrete-0922', work_name: 'Бетонирование', zone: 'Секция C', taken_at: '2026-09-22T11:00:00+03:00' },
  { local_uuid: 'demo-rebar-1', task_id: 't-rebar-0922', work_name: 'Армирование', zone: 'Зона A', taken_at: '2026-09-22T10:12:00+03:00' },
  { local_uuid: 'demo-pit-1', task_id: 't-pit-0921', work_name: 'Котлован', zone: 'Зона B', taken_at: '2026-09-21T16:50:00+03:00' },
];

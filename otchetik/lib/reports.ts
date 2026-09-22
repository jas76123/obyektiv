import type { ScheduleTask, ShotStatusItem } from '../contract/schemas';
import type { ShotRecord } from '../queue/types';
import { SCREEN_LABEL, foldStatus, photoChip, workStatus, type AnyShotStatus, type ScreenStatus } from './status';
import { dayKey, fmtDay, todayIso } from './time';

export type ReportPhoto = { uuid: string; taken_at: string; word: string; record: ShotRecord; status: AnyShotStatus };
export type ReportWork = {
  task_id: string; name: string; zone: string; status: ScreenStatus; label: string;
  comment: string | null; percent: number | null; photos: ReportPhoto[];
};
export type ReportDay = { key: string; label: string; works: ReportWork[] };

export function buildReport(
  records: ShotRecord[],
  statuses: Record<string, ShotStatusItem>,
  todaysTasks: Record<string, Pick<ScheduleTask, 'task_id' | 'work_id' | 'name' | 'zone'>>,
  now: Date = new Date(),
): ReportDay[] {
  // Фото, которое переснято, больше не показываем в ленте — свежая версия
  // (retake_of указывает на него) уже несёт актуальный статус.
  const superseded = new Set(records.map((r) => r.retake_of).filter((v): v is string => !!v));
  const live = records.filter((r) => !superseded.has(r.local_uuid));

  const days = new Map<string, Map<string, ReportWork>>();
  const workFor = (day: string, task_id: string, name: string, zone: string) => {
    if (!days.has(day)) days.set(day, new Map());
    const w = days.get(day)!;
    if (!w.has(task_id)) w.set(task_id, { task_id, name, zone, status: 'not_started', label: '', comment: null, percent: null, photos: [] });
    return w.get(task_id)!;
  };

  for (const t of Object.values(todaysTasks)) workFor(todayIso(now), t.task_id, t.name, t.zone);

  for (const r of live) {
    const w = workFor(dayKey(r.taken_at), r.task_id, r.work_name, r.zone);
    const srv = statuses[r.local_uuid];
    const st = srv ? srv.status : r.status;
    w.photos.push({ uuid: r.local_uuid, taken_at: r.taken_at, word: photoChip(st), record: r, status: st });
  }

  const out: ReportDay[] = [];
  for (const [key, works] of [...days.entries()].sort((a, b) => b[0].localeCompare(a[0]))) {
    const list = [...works.values()].map((w) => {
      w.photos.sort((a, b) => b.taken_at.localeCompare(a.taken_at));
      const folded = w.photos.map((p) => foldStatus(p.status));
      const status = workStatus(folded);

      // Ищем самое свежее фото, чей свёрнутый статус совпадает со статусом работы
      const definingPhoto = w.photos.find((p) => foldStatus(p.status) === status);
      const comment = definingPhoto && (status === 'rework' || status === 'rejected')
        ? statuses[definingPhoto.uuid]?.verdict_comment ?? null
        : null;
      const percent = definingPhoto
        ? statuses[definingPhoto.uuid]?.accepted_percent ?? null
        : null;

      return { ...w, status, label: SCREEN_LABEL[status], comment, percent };
    });
    out.push({ key, label: fmtDay(key, now), works: list });
  }
  return out;
}

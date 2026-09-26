import type { ScheduleTask, ShotStatusItem } from '../contract/schemas';
import type { ShotRecord } from '../queue/types';
import {
  SCREEN_LABEL, dayVerdict, foldStatus, photoWord, workStatus,
  type AnyShotStatus, type PhotoVerdict, type ScreenStatus, type TodayStatus,
} from './status';
import { dayKey, fmtDay, todayIso } from './time';

export type ReportPhoto = { uuid: string; taken_at: string; word: string; record: ShotRecord; status: AnyShotStatus; verdict: PhotoVerdict };
export type ReportWork = {
  task_id: string; name: string; zone: string; status: ScreenStatus; label: string;
  /** Комментарий сервера у «переснять» / «не принято», если прислал; своих текстов не сочиняем. */
  comment: string | null;
  /** taken_at самого свежего фото работы; null без фото. */
  time: string | null;
  photos: ReportPhoto[];
};
export type ReportDay = { key: string; label: string; works: ReportWork[] };

export type TaskLite = Pick<ScheduleTask, 'task_id' | 'work_id' | 'name' | 'zone'>;

export type ReportOpts = {
  /** Адрес сервера задан (serverBase !== null): очередь «ждёт сети», иначе «ждёт сервера». */
  serverSet?: boolean;
  /** local_uuid → вердикт сверки фото (queue/mlResults.useMlVerdicts). */
  verdicts?: Record<string, PhotoVerdict>;
  /** Наряды прошедших дней (дата → работы) из кэша запросов: работа без фото за тот день — «не принято». */
  pastSchedules?: Record<string, TaskLite[]>;
};

/** Фото, которое переснято, больше не считается: свежая версия (retake_of указывает на него) уже несёт актуальный статус. */
export function liveRecords(records: ShotRecord[]): ShotRecord[] {
  const superseded = new Set(records.map((r) => r.retake_of).filter((v): v is string => !!v));
  return records.filter((r) => !superseded.has(r.local_uuid));
}

function photoStatus(r: ShotRecord, statuses: Record<string, ShotStatusItem>): AnyShotStatus {
  const srv = statuses[r.local_uuid];
  return srv ? srv.status : r.status;
}

function newestFirst(a: ShotRecord, b: ShotRecord): number {
  return b.taken_at.localeCompare(a.taken_at);
}

/** Статус работы за сегодня и uuid самого свежего живого фото наряда (для retake_of). */
export function taskState(
  records: ShotRecord[],
  statuses: Record<string, ShotStatusItem>,
  task_id: string,
  opts: ReportOpts = {},
): { status: ScreenStatus; latestUuid: string | null } {
  const mine = liveRecords(records).filter((r) => r.task_id === task_id).sort(newestFirst);
  const folded = mine.map((r) => foldStatus(photoStatus(r, statuses), { verdict: opts.verdicts?.[r.local_uuid] ?? null }));
  return { status: workStatus(folded), latestUuid: mine[0]?.local_uuid ?? null };
}

export function buildReport(
  records: ShotRecord[],
  statuses: Record<string, ShotStatusItem>,
  todaysTasks: Record<string, TaskLite>,
  now: Date = new Date(),
  opts: ReportOpts = {},
): ReportDay[] {
  const today = todayIso(now);
  const days = new Map<string, Map<string, ReportWork>>();
  const workFor = (day: string, task_id: string, name: string, zone: string) => {
    if (!days.has(day)) days.set(day, new Map());
    const w = days.get(day)!;
    if (!w.has(task_id)) w.set(task_id, { task_id, name, zone, status: 'not_started', label: SCREEN_LABEL.not_started, comment: null, time: null, photos: [] });
    return w.get(task_id)!;
  };

  for (const t of Object.values(todaysTasks)) workFor(today, t.task_id, t.name, t.zone);
  // Наряды прошедших дней: работа без фото получит «не принято». Сегодняшний и будущие дни
  // из этого словаря не берём — за сегодня наряд приходит в todaysTasks.
  for (const [day, list] of Object.entries(opts.pastSchedules ?? {})) {
    if (day >= today) continue;
    for (const t of list) workFor(day, t.task_id, t.name, t.zone);
  }

  for (const r of liveRecords(records)) {
    const w = workFor(dayKey(r.taken_at), r.task_id, r.work_name, r.zone);
    const st = photoStatus(r, statuses);
    const verdict = opts.verdicts?.[r.local_uuid] ?? null;
    w.photos.push({ uuid: r.local_uuid, taken_at: r.taken_at, word: photoWord(st, verdict, { serverSet: opts.serverSet }), record: r, status: st, verdict });
  }

  const out: ReportDay[] = [];
  for (const [key, works] of [...days.entries()].sort((a, b) => b[0].localeCompare(a[0]))) {
    const list = [...works.values()].map((w) => {
      w.photos.sort((a, b) => b.taken_at.localeCompare(a.taken_at));
      const folded: TodayStatus[] = w.photos.map((p) => foldStatus(p.status, { verdict: p.verdict }));
      // Сегодня — три слова по самому свежему фото; прошедший день — итог ставит система.
      const status: ScreenStatus = key < today ? dayVerdict(folded) : workStatus(folded);
      // Самое свежее фото определяет время и комментарий.
      const newest = w.photos[0];
      const comment = newest && (status === 'retake' || status === 'not_accepted') ? statuses[newest.uuid]?.verdict_comment ?? null : null;
      return { ...w, status, label: SCREEN_LABEL[status], comment, time: newest?.taken_at ?? null };
    });
    out.push({ key, label: fmtDay(key, now), works: list });
  }
  return out;
}

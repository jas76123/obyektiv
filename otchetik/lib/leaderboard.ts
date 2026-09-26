import type { Leaderboard, ScheduleTask } from '../contract/schemas';
import { parsePhotoFile } from './photoName';
import type { PhotoEntry } from './photosCache';

/**
 * Рейтинг бригад на телефоне из списка GET /photos (спека 26.09 §5.3). Формула Татьяны §11
 * `points = accepted × 10 + quality_bonus − rework × 5` без членов, которых в цепочке нет:
 * вердиктов руководителя и оценки качества от нейросети. «Принято» = сверка с планом
 * `confirmed` (спека 26.09 «work_status» §3.4); если сверки в ответе нет — фото с детекциями.
 * Возвращает тот же тип, что серверный /api/foreman/leaderboard, чтобы экран рисовал его без изменений.
 */
export const POINTS_PER_ACCEPTED = 10;
export const OTHERS_LIMIT = 3;

export type BrigadeRef = { id: string; name: string };

type Parsed = PhotoEntry & { brigade_id: string; task_id: string };

function parseAll(photos: PhotoEntry[]): Parsed[] {
  return photos.flatMap((p) => {
    const meta = parsePhotoFile(p.file);
    return meta ? [{ ...p, brigade_id: meta.brigade_id, task_id: meta.task_id }] : [];
  });
}

/** Фото засчитано бригаде: сверка confirmed, а без сверки — есть детекции. */
function isAccepted(p: PhotoEntry): boolean {
  return p.work_status ? p.work_status === 'confirmed' : p.count > 0;
}

export function buildLeaderboard(
  photos: PhotoEntry[],
  brigades: BrigadeRef[],
  tasks: Record<string, ScheduleTask[]>,
  myBrigadeId: string | null,
): Leaderboard {
  const parsed = parseAll(photos);

  const rows = brigades
    .map((b) => {
      const mine = parsed.filter((p) => p.brigade_id === b.id);
      const accepted = mine.filter(isAccepted).length;
      const quality = mine.length ? Math.round((100 * accepted) / mine.length) : 0;
      return { id: b.id, name: b.name, rank: 0, points: accepted * POINTS_PER_ACCEPTED, accepted, quality };
    })
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'ru'))
    .map((r, i) => ({ ...r, rank: i + 1 }));

  const nameOf = new Map(brigades.map((b) => [b.id, b.name]));
  const others = parsed
    .filter((p) => p.brigade_id !== myBrigadeId && p.count > 0 && nameOf.has(p.brigade_id))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, OTHERS_LIMIT)
    .map((p) => {
      const t = (tasks[p.brigade_id] ?? []).find((x) => x.task_id === p.task_id);
      return { brigade: nameOf.get(p.brigade_id)!, work: t?.name ?? p.task_id, zone: t?.zone ?? '', status: 'accepted' as const };
    });

  return { brigades: rows, others };
}

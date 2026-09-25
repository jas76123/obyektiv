import { z } from 'zod';

export const Brigade = z.object({ id: z.string(), name: z.string(), members: z.number().int().optional() });
export const ObjectsResponse = z.object({
  objects: z.array(z.object({ id: z.string(), name: z.string(), brigades: z.array(Brigade) })),
});
export type Objects = z.infer<typeof ObjectsResponse>;

export const ScheduleTask = z.object({
  task_id: z.string(),
  work_id: z.string(),
  name: z.string(),
  zone: z.string(),
  expected: z.string().optional(),
  plan_start: z.string().optional(),
  plan_end: z.string().optional(),
});
export type ScheduleTask = z.infer<typeof ScheduleTask>;
export const ScheduleResponse = z.object({ date: z.string(), tasks: z.array(ScheduleTask) });
export type Schedule = z.infer<typeof ScheduleResponse>;

export const ServerShotStatus = z.enum([
  'draft', 'queued', 'uploading', 'failed', 'uploaded', 'processing', 'processed',
  'under_review', 'accepted', 'partial', 'rework', 'rejected',
]);
export type ServerShotStatus = z.infer<typeof ServerShotStatus>;

export const Verdict = z.enum(['accepted', 'partial', 'rework', 'rejected']);
export type Verdict = z.infer<typeof Verdict>;

export const UploadResponse = z.object({ server_id: z.string(), status: ServerShotStatus });

export const ShotStatusItem = z.object({
  local_uuid: z.string(),
  status: ServerShotStatus,
  verdict: Verdict.optional(),
  verdict_comment: z.string().optional(),
  accepted_percent: z.number().optional(),
  updated_at: z.string(),
});
export type ShotStatusItem = z.infer<typeof ShotStatusItem>;
export const ShotsStatusResponse = z.object({ shots: z.array(ShotStatusItem) });
export type ShotsStatus = z.infer<typeof ShotsStatusResponse>;

export const LeaderboardResponse = z.object({
  brigades: z.array(z.object({
    id: z.string(), name: z.string(), rank: z.number().int(), points: z.number(),
    accepted: z.number().int(), quality: z.number(),
  })),
  others: z.array(z.object({
    brigade: z.string(), work: z.string(), zone: z.string(), status: ServerShotStatus,
  })),
});
export type Leaderboard = z.infer<typeof LeaderboardResponse>;

/** Одна запись GET /photos у Георгия: id (= server_id из POST /api/foreman/shots), имя файла
 * (сервер хранит `{server_id}_{наше имя}`, см. lib/photoName.ts), время сервера, детекции. */
export const PhotoItem = z.object({
  id: z.string(),
  file: z.string(),
  timestamp: z.string(),
  detections: z.array(z.unknown()),
});
export type PhotoItem = z.infer<typeof PhotoItem>;

/** Список разбирается поэлементно: одна кривая запись не должна ронять результаты по остальным. */
export const PhotosResponse = z.object({
  photos: z.array(z.unknown()).transform((items) =>
    items.map((i) => PhotoItem.safeParse(i)).flatMap((p) => (p.success ? [p.data] : [])),
  ),
});
export type Photos = z.infer<typeof PhotosResponse>;

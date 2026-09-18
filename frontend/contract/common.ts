import { z } from 'zod';

export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const StatusSchema = z.enum([
  'in_progress', 'resources_only', 'nothing_detected', 'insufficient',
  'not_checked', 'not_started', 'manual_resolved', 'false_completion',
]);
export type Status = z.infer<typeof StatusSchema>;

export const StatusReasonSchema = z.enum(['no_catalog', 'no_observable', 'no_camera', 'no_frames']);
export type StatusReason = z.infer<typeof StatusReasonSchema>;

/** Тон цвета: ok зелёный, warn жёлтый, bad красный, grey серый, blue синий. */
export const ToneSchema = z.enum(['ok', 'warn', 'bad', 'grey', 'blue']);
export type Tone = z.infer<typeof ToneSchema>;

/** Метки осей 2 и 3 (BR-401): rep заявлено выше наблюдения, lag отчётность отстаёт, sched сроки, manual исход. */
export const TagSchema = z.object({
  kind: z.enum(['rep', 'lag', 'sched', 'manual']),
  text: z.string(),
});
export type Tag = z.infer<typeof TagSchema>;

/** Уровень дня: 2 работа идёт, 1 только ресурсы, 0 ничего, null кадров нет. */
export const LevelSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.null()]);
export type Level = z.infer<typeof LevelSchema>;

export const FactSourceSchema = z.enum(['plan_column', 'weekly_report', 'ks2', 'manual']);
export type FactSource = z.infer<typeof FactSourceSchema>;

export const DeclaredSchema = z.object({
  percent: z.number(),
  report_date: IsoDate.nullish(),
  author: z.string().nullish(),
  fact_source: FactSourceSchema.nullish(),
});
export type Declared = z.infer<typeof DeclaredSchema>;

/** Триада работы (BR-404). confirmed = null, когда наблюдение не оценивается. */
export const TriadSchema = z.object({
  plan_today: z.number(),
  declared: DeclaredSchema,
  confirmed: z.number().nullable(),
  confirmed_days: z.number(),
  elapsed_days: z.number(),
  /** подпись под триадой: «9 из 10 дней», «кадры за 1 из 3 дней», «не проверяется», «наблюдений нет» */
  note: z.string(),
});
export type Triad = z.infer<typeof TriadSchema>;

export const DetectionSchema = z.object({
  class: z.string(),
  confidence: z.number(),
  /** [x, y, w, h] в пикселях кадра */
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  track_id: z.number().nullish(),
  /** техника не по этапу: класса нет в справочнике ни у одной работы зоны на дату */
  off_stage: z.boolean().optional(),
});
export type Detection = z.infer<typeof DetectionSchema>;

export const FrameSchema = z.object({
  frame_id: z.string(),
  camera_id: z.string(),
  captured_at: z.string(),
  image_path: z.string().nullable(),
  width: z.number(),
  height: z.number(),
  detections: z.array(DetectionSchema),
});
export type Frame = z.infer<typeof FrameSchema>;

export const ContactSchema = z.object({
  contractor: z.string(),
  object_id: z.string(),
  name: z.string(),
  role: z.string().nullish(),
  phone: z.string().nullish(),
  telegram: z.string().nullish(),
  max: z.string().nullish(),
  email: z.string().nullish(),
  scope: z.string().nullish(),
  escalation: z.string().nullish(),
});
export type Contact = z.infer<typeof ContactSchema>;

export const CameraStateSchema = z.object({
  id: z.string(),
  zone: z.string().nullish(),
  description: z.string(),
  /** ok онлайн, gap был перерыв, off молчит */
  state: z.enum(['ok', 'gap', 'off']),
  last_frame: z.string(),
});
export type CameraState = z.infer<typeof CameraStateSchema>;

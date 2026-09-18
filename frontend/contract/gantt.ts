import { z } from 'zod';
import { IsoDate, StatusSchema, StatusReasonSchema, TagSchema, DeclaredSchema, CameraStateSchema } from './common';
import { ObjectCardSchema } from './portfolio';

export const GanttWorkSchema = z.object({
  id: z.string(),
  name: z.string(),
  zone: z.string(),
  contractor: z.string(),
  plan_start: IsoDate,
  plan_end: IsoDate,
  /** первая версия дат, если план сдвигался */
  plan_v1: z.object({ start: IsoDate, end: IsoDate }).nullable(),
  declared: DeclaredSchema,
  status: StatusSchema,
  status_reason: StatusReasonSchema.nullish(),
  tags: z.array(TagSchema),
  /** полоса факта: даты и цвет наблюдения */
  fact: z.object({ start: IsoDate, end: IsoDate, tone: z.enum(['ok', 'warn', 'bad', 'done']) }).nullable(),
  forecast_end: IsoDate.nullable(),
});
export type GanttWork = z.infer<typeof GanttWorkSchema>;

export const ObjectGanttSchema = z.object({
  as_of: IsoDate,
  object: ObjectCardSchema.extend({ zones_label: z.string() }),
  cameras: z.array(CameraStateSchema),
  /** счётчики шапки объекта: всего работ, подтверждены, не подтверждены, расхождение, не проверяются */
  counts: z.object({ total: z.number(), ok: z.number(), warn: z.number(), bad: z.number(), none: z.number() }),
  /** строка «прогноз сроков»: готовый текст (BR-501…503) */
  forecast: z.object({ text: z.string(), delay_days: z.number().nullable() }),
  acts: z.array(z.object({ date: IsoDate, reason: z.string() })),
  works: z.array(GanttWorkSchema),
});
export type ObjectGantt = z.infer<typeof ObjectGanttSchema>;

import { z } from 'zod';
import { IsoDate, StatusSchema, StatusReasonSchema, TagSchema, ToneSchema, TriadSchema, FrameSchema, ContactSchema } from './common';

export const ObjectCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  short_name: z.string(),
  stage: z.string(),
  zone_type: z.enum(['area', 'linear']),
  cameras_count: z.number(),
  /** полоска сверху карточки: худшее наблюдение по объекту; none = не проверяется */
  worst: z.enum(['ok', 'warn', 'bad', 'none']),
  not_checked_count: z.number(),
  delay_days: z.number().nullable(),
  bars: z.object({ plan_today: z.number(), declared: z.number(), confirmed: z.number().nullable() }),
});
export type ObjectCard = z.infer<typeof ObjectCardSchema>;

/** Состояние обработки, каким его знает сервер; фронт накладывает поверх своё из браузера. */
export const HandlingSeedSchema = z.object({
  state: z.enum(['new', 'seen', 'contacted', 'closed']),
  by: z.string().nullish(),
  role: z.string().nullish(),
  at: z.string().nullish(),
  target: z.string().nullish(),
  channel: z.string().nullish(),
  due: z.string().nullish(),
  outcome: z.enum(['held', 'explained', 'false_alarm', 'escalated']).nullish(),
  comment: z.string().nullish(),
});
export type HandlingSeed = z.infer<typeof HandlingSeedSchema>;

export const AlertSchema = z.object({
  id: z.string(),
  object_id: z.string(),
  object_name: z.string(),
  object_short: z.string(),
  work_id: z.string(),
  work_name: z.string(),
  zone: z.string(),
  contractor: z.string(),
  /** claim претензия к ходу работ, setup задача по настройке (BR-603) */
  kind: z.enum(['claim', 'setup']),
  status: StatusSchema,
  status_reason: StatusReasonSchema.nullish(),
  tags: z.array(TagSchema),
  severity: z.number(),
  tone: ToneSchema,
  verdict: z.string(),
  triad: TriadSchema,
  schedule: z.object({
    plan_start: IsoDate, plan_end: IsoDate,
    fact_start: IsoDate.nullish(), forecast_end: IsoDate.nullish(),
  }),
  evidence: z.object({
    frame: FrameSchema.nullable(),
    label: z.string(),
    sub: z.string(),
    camera_id: z.string().nullish(),
    date: IsoDate.nullish(),
  }),
  /** сколько дней замечание никто не открывал (BR-702) */
  untouched_days: z.number(),
  handling: HandlingSeedSchema,
  contact: ContactSchema.nullable(),
});
export type Alert = z.infer<typeof AlertSchema>;

export const PortfolioSummarySchema = z.object({
  open_alerts: z.number(),
  objects_with_alerts: z.number(),
  untouched_alerts: z.number(),
  setup_tasks: z.number(),
  sharpest: z.object({ alert_id: z.string(), text: z.string() }).nullable(),
});
export type PortfolioSummary = z.infer<typeof PortfolioSummarySchema>;

export const PortfolioSchema = z.object({
  as_of: IsoDate,
  objects: z.array(ObjectCardSchema),
  summary: PortfolioSummarySchema,
  alerts: z.array(AlertSchema),
});
export type Portfolio = z.infer<typeof PortfolioSchema>;

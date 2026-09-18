import { z } from 'zod';
import { IsoDate, StatusSchema, StatusReasonSchema, TagSchema, DeclaredSchema, LevelSchema, TriadSchema, FrameSchema } from './common';

export const ExpectRowSchema = z.object({
  label: z.string(),
  expected: z.string(),
  found: z.string(),
  in_frame: z.string(),
  ok: z.boolean().nullable(),
});
export type ExpectRow = z.infer<typeof ExpectRowSchema>;

export const HistoryRowSchema = z.object({ when: z.string(), what: z.string(), who: z.string(), reason: z.string() });
export type HistoryRow = z.infer<typeof HistoryRowSchema>;

export const ShiftSchema = z.object({ camera_id: z.string(), frames: z.array(FrameSchema) });
export type Shift = z.infer<typeof ShiftSchema>;

export const WorkReviewSchema = z.object({
  as_of: IsoDate,
  object: z.object({ id: z.string(), name: z.string(), short_name: z.string() }),
  work: z.object({
    id: z.string(), name: z.string(), zone: z.string(), contractor: z.string(),
    plan_start: IsoDate, plan_end: IsoDate,
    declared: DeclaredSchema,
    status: StatusSchema, status_reason: StatusReasonSchema.nullish(), tags: z.array(TagSchema),
  }),
  /** full полный разбор; done завершена и подтверждена; not_checked; not_started (§4 экран 2, «работы без разбора») */
  mode: z.enum(['full', 'done', 'not_checked', 'not_started']),
  /** ступени 01–04: true да, false нет, null прочерк */
  ladder: z.tuple([z.boolean().nullable(), z.boolean().nullable(), z.boolean().nullable(), z.boolean().nullable()]),
  verdict: z.string(),
  expected: z.array(ExpectRowSchema),
  triad: TriadSchema.nullable(),
  calendar: z.object({
    days: z.record(IsoDate, LevelSchema),
    acts: z.array(IsoDate),
    confirmed_days: z.number(),
    elapsed_days: z.number(),
  }),
  /** кадры смен по датам; даты без ключа = «в демонстрационный набор не вошли» */
  shifts: z.record(IsoDate, ShiftSchema),
  causes: z.array(z.string()),
  history: z.array(HistoryRowSchema),
});
export type WorkReview = z.infer<typeof WorkReviewSchema>;

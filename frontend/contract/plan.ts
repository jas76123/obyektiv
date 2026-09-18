import { z } from 'zod';
import { IsoDate, FactSourceSchema } from './common';

/** Каноническая форма работы: семь обязательных полей и три необязательных (согласовано с БА 18.09.2026). */
export const PlanRowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  zone: z.string().min(1),
  contractor: z.string().min(1),
  plan_start: IsoDate,
  plan_end: IsoDate,
  fact_percent: z.number().min(0).max(100),
  report_date: IsoDate.nullish(),
  author: z.string().nullish(),
  fact_source: FactSourceSchema.nullish(),
});
export type PlanRow = z.infer<typeof PlanRowSchema>;

export const PlanUploadSchema = z.object({ object_id: z.string(), source_name: z.string(), works: z.array(PlanRowSchema) });
export type PlanUpload = z.infer<typeof PlanUploadSchema>;

export const PlanUploadResultSchema = z.object({
  loaded: z.number(),
  not_in_catalog: z.array(z.string()),
  errors: z.array(z.string()),
});
export type PlanUploadResult = z.infer<typeof PlanUploadResultSchema>;

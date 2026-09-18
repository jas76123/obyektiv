import { z } from 'zod';
import { IsoDate, CameraStateSchema, ContactSchema } from './common';

export const CatalogRuleSchema = z.object({
  work_pattern: z.string(),
  classes: z.record(z.string(), z.number()),
  min_people: z.number(),
  /** порог как его показывает интерфейс: «3 дня» или «60 % дней» */
  threshold: z.string(),
  comment: z.string().nullish(),
});
export type CatalogRule = z.infer<typeof CatalogRuleSchema>;

export const SettingsSchema = z.object({
  as_of: IsoDate,
  object: z.object({ id: z.string(), name: z.string(), short_name: z.string() }),
  objects: z.array(z.object({ id: z.string(), short_name: z.string() })),
  plan_source: z.object({ kind: z.enum(['file', 'link']), name: z.string(), updated_at: z.string() }),
  week_mode: z.union([z.literal(5), z.literal(6)]),
  holidays: z.array(z.object({ day: IsoDate, reason: z.string() })),
  acts: z.array(z.object({ date: IsoDate, reason: z.string() })),
  zone_type: z.enum(['area', 'linear']),
  zones_label: z.string(),
  cameras: z.array(CameraStateSchema),
  contacts: z.array(ContactSchema),
  /** подрядчики объекта без контакта */
  contractors_without_contact: z.array(z.string()),
  catalog: z.array(CatalogRuleSchema),
});
export type Settings = z.infer<typeof SettingsSchema>;

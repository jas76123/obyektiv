import { z } from 'zod';
import { IsoDate, FrameSchema, CameraStateSchema } from './common';

export const CameraShiftSchema = z.object({
  as_of: IsoDate,
  object: z.object({ id: z.string(), short_name: z.string() }),
  camera: CameraStateSchema,
  date: IsoDate,
  /** даты, за которые у камеры есть кадры, по возрастанию */
  dates: z.array(IsoDate),
  link: z.object({
    work_id: z.string().nullable(),
    work_name: z.string().nullable(),
    note: z.string(),
    step01: z.boolean().nullable(),
    step02: z.boolean().nullable(),
  }),
  frames: z.array(FrameSchema.extend({ expected_found: z.boolean() })),
});
export type CameraShift = z.infer<typeof CameraShiftSchema>;

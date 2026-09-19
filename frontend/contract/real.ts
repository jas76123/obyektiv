import { z } from 'zod';
import { FrameSchema } from './common';

/** Запись модели как есть: bbox = [cx, cy, w, h] в пикселях (xywh ultralytics, от центра). */
export const RawDetectionSchema = z.object({
  frame: z.number().int().nonnegative(),
  time_sec: z.number(),
  id: z.number().int(),
  class: z.string(),
  confidence: z.number(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
});
export type RawDetection = z.infer<typeof RawDetectionSchema>;

const ClassCountSchema = z.object({ class: z.string(), count: z.number() });

export const RealItemSchema = z.object({
  track_id: z.number(),
  /** код класса фронта (contract/labels.ts) */
  class: z.string(),
  /** имя класса у модели, как в data.yaml */
  model_class: z.string(),
  confidence: z.number(),
  /** центр рамки сдвинулся за время наблюдения; false не значит «простой» */
  moved: z.boolean(),
  frames: z.number(),
});
export type RealItem = z.infer<typeof RealItemSchema>;

export const RealSceneSchema = z.object({
  scene: z.number(),
  time_from: z.number(),
  time_to: z.number(),
  /** bbox уже от левого верхнего угла */
  frame: FrameSchema,
  items: z.array(RealItemSchema),
  counts: z.array(ClassCountSchema),
});
export type RealScene = z.infer<typeof RealSceneSchema>;

export const RealObservationsSchema = z.object({
  source: z.object({
    detections_file: z.string(),
    video_file: z.string().nullable(),
    fps: z.number(),
    records: z.number(),
    tracks_total: z.number(),
    tracks_kept: z.number(),
  }),
  summary: z.array(ClassCountSchema),
  scenes: z.array(RealSceneSchema),
});
export type RealObservations = z.infer<typeof RealObservationsSchema>;

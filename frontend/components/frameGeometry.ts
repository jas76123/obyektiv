import type { Detection, Frame } from '@/contract';

export const MIN_CONFIDENCE = 0.5;

export function visibleDetections(frame: Frame): Detection[] {
  return frame.detections.filter((d) => d.confidence >= MIN_CONFIDENCE);
}

export function frameCounts(frame: Frame): { tech: number; people: number } {
  const seen = visibleDetections(frame);
  const people = seen.filter((d) => d.class === 'person').length;
  return { tech: seen.length - people, people };
}

const pct = (v: number) => `${Math.round(v * 10000) / 100}%`;

/** Пиксели кадра → проценты: рамки масштабируются вместе с картинкой на любой ширине. */
export function boxStyle(d: Detection, frame: Frame): { left: string; top: string; width: string; height: string } {
  const [x, y, w, h] = d.bbox;
  const left = Math.max(0, x) / frame.width;
  const top = Math.max(0, y) / frame.height;
  const width = Math.min(w, frame.width - Math.max(0, x)) / frame.width;
  const height = Math.min(h, frame.height - Math.max(0, y)) / frame.height;
  return { left: pct(left), top: pct(top), width: pct(width), height: pct(height) };
}

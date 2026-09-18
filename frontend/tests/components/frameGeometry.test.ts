import { describe, it, expect } from 'vitest';
import { visibleDetections, boxStyle, frameCounts } from '@/components/frameGeometry';
import type { Frame } from '@/contract';

const frame: Frame = {
  frame_id: 'f', camera_id: 'c', captured_at: '2026-09-04T09:00:00+03:00', image_path: null, width: 1920, height: 1080,
  detections: [
    { class: 'excavator', confidence: 0.93, bbox: [192, 108, 480, 540] },
    { class: 'person', confidence: 0.78, bbox: [960, 540, 96, 108] },
    { class: 'dump_truck', confidence: 0.41, bbox: [0, 0, 10, 10] },
  ],
};

describe('геометрия кадра', () => {
  it('детекции ниже 0.5 не рисуются и не считаются', () => {
    expect(visibleDetections(frame).map((d) => d.class)).toEqual(['excavator', 'person']);
    expect(frameCounts(frame)).toEqual({ tech: 1, people: 1 });
  });
  it('рамка в пикселях → проценты размера кадра', () => {
    expect(boxStyle(frame.detections[0]!, frame)).toEqual({ left: '10%', top: '10%', width: '25%', height: '50%' });
  });
  it('рамка за краем кадра обрезается', () => {
    const d = { class: 'crane', confidence: 0.9, bbox: [1800, 0, 400, 100] as [number, number, number, number] };
    expect(boxStyle(d, frame).width).toBe('6.25%');
  });
});

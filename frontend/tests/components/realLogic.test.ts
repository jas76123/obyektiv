import { describe, it, expect } from 'vitest';
import { countsLine, sceneSpan } from '@/components/real/realLogic';

describe('подписи сцены', () => {
  it('счётчики по классам одной строкой', () => {
    expect(countsLine([{ class: 'excavator', count: 2 }, { class: 'concrete_mixer', count: 1 }])).toBe('экскаватор × 2 · бетоносмеситель × 1');
    expect(countsLine([])).toBe('техника не обнаружена');
  });
  it('интервал сцены в ролике', () => {
    expect(sceneSpan({ time_from: 16.2, time_to: 19.233 })).toBe('00:00:16 – 00:00:19 · 3,0 с');
  });
});

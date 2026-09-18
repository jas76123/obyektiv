import { describe, it, expect } from 'vitest';
import { displayStatus, STATUS_LABEL, STATUS_TONE, REASON_LABEL, classLabel, OUTCOMES } from '@/contract/labels';
import { StatusSchema, StatusReasonSchema } from '@/contract';

describe('labels', () => {
  it('false_completion рисуется как nothing_detected', () => {
    expect(displayStatus('false_completion')).toBe('nothing_detected');
    expect(displayStatus('in_progress')).toBe('in_progress');
  });
  it('у каждого отображаемого статуса есть подпись и тон', () => {
    for (const s of StatusSchema.options) {
      const d = displayStatus(s);
      expect(STATUS_LABEL[d]).toBeTruthy();
      expect(STATUS_TONE[d]).toBeTruthy();
    }
    expect(STATUS_LABEL.nothing_detected).toBe('НИЧЕГО НЕ ОБНАРУЖЕНО');
    expect(STATUS_TONE.nothing_detected).toBe('bad');
    expect(STATUS_TONE.manual_resolved).toBe('blue');
  });
  it('у каждой причины есть подпись', () => {
    for (const r of StatusReasonSchema.options) expect(REASON_LABEL[r]).toBeTruthy();
  });
  it('классы: известные по-русски, неизвестные кодом', () => {
    expect(classLabel('excavator')).toBe('экскаватор');
    expect(classLabel('person')).toBe('человек');
    expect(classLabel('unknown_thing')).toBe('unknown_thing');
  });
  it('четыре исхода, два из них переводят работу в «решено вручную»', () => {
    expect(OUTCOMES).toHaveLength(4);
    expect(OUTCOMES.filter((o) => o.resolves).map((o) => o.code)).toEqual(['explained', 'false_alarm']);
  });
});

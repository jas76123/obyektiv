import { describe, it, expect } from 'vitest';
import { getConfirmedBarClass } from '@/components/Bars';
import type { Tone } from '@/contract';

describe('Bars component', () => {
  it('returns empty string when tone is not provided', () => {
    expect(getConfirmedBarClass()).toBe('');
  });

  it('returns empty string when tone is undefined', () => {
    expect(getConfirmedBarClass(undefined)).toBe('');
  });

  it('returns "bad" when tone is bad', () => {
    expect(getConfirmedBarClass('bad')).toBe('bad');
  });

  it('returns "warn" when tone is warn', () => {
    expect(getConfirmedBarClass('warn')).toBe('warn');
  });

  it('returns empty string for other tone values', () => {
    const tones: Tone[] = ['ok', 'grey', 'blue'];
    for (const tone of tones) {
      expect(getConfirmedBarClass(tone)).toBe('');
    }
  });
});

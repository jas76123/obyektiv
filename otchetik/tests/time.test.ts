import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { dayKey, fmtDay, todayIso } from '../lib/time';

describe('dayKey', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('bare date string is returned unchanged', () => {
    expect(dayKey('2026-09-22')).toBe('2026-09-22');
  });

  it('ISO string is converted to local calendar date', () => {
    // Set a fixed time: 2026-09-22 01:30:00 in local time
    const d = new Date(2026, 8, 22, 1, 30, 0); // months are 0-indexed
    vi.setSystemTime(d);

    const iso = d.toISOString();
    const result = dayKey(iso);

    // Should be the local date, not UTC date
    const localDate = todayIso(d);
    expect(result).toBe(localDate);
    expect(result).toBe('2026-09-22');
  });

  it('UTC date boundaries work correctly with fixed offset', () => {
    // Test with a fixed UTC timestamp: 2026-09-21T22:30:00Z
    // This is 01:30 Moscow time (UTC+3) on 2026-09-22
    const utcIso = '2026-09-21T22:30:00Z';
    const utcDate = new Date(utcIso);

    const result = dayKey(utcIso);
    const expected = todayIso(utcDate);

    // Both should use the same Date object so they account for timezone consistently
    expect(result).toBe(expected);
  });

  it('handles early morning in eastern timezone', () => {
    // Create a date for early morning: 2026-09-22 02:45:00 local
    const d = new Date(2026, 8, 22, 2, 45, 0);
    vi.setSystemTime(d);

    const iso = d.toISOString();
    const result = dayKey(iso);

    // Should still be today in local time
    expect(result).toBe('2026-09-22');
  });
});

describe('fmtDay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Сегодня" for today\'s date', () => {
    const now = new Date(2026, 8, 22, 10, 0, 0); // Sept 22 at 10:00 local
    vi.setSystemTime(now);

    const iso = now.toISOString();
    const result = fmtDay(iso, now);

    expect(result).toBe('Сегодня');
  });

  it('returns "Вчера" for yesterday\'s date', () => {
    const now = new Date(2026, 8, 22, 10, 0, 0); // Sept 22 at 10:00
    const yesterday = new Date(2026, 8, 21, 15, 0, 0); // Sept 21 at 15:00

    const result = fmtDay(yesterday.toISOString(), now);

    expect(result).toBe('Вчера');
  });

  it('returns formatted date for older dates', () => {
    const now = new Date(2026, 8, 22, 10, 0, 0);
    const older = new Date(2026, 8, 15, 10, 0, 0); // Sept 15

    const result = fmtDay(older.toISOString(), now);

    expect(result).toBe('15 сентября');
  });

  it('handles bare date string', () => {
    const now = new Date(2026, 8, 22, 10, 0, 0);

    // Passing just the date string
    const result = fmtDay('2026-09-22', now);

    expect(result).toBe('Сегодня');
  });

  it('respects local timezone boundaries', () => {
    // Create a situation where UTC and local dates differ
    // For a 01:30 local time, the UTC date should be from previous day
    const d = new Date(2026, 8, 22, 1, 30, 0);
    vi.setSystemTime(d);

    const iso = d.toISOString();
    const result = fmtDay(iso, d);

    // Should still show as "Сегодня" based on local time
    expect(result).toBe('Сегодня');
  });
});

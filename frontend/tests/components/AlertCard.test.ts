import { describe, it, expect } from 'vitest';
import { formatAlertPath } from '@/components/portfolio/AlertCard';

describe('AlertCard', () => {
  it('returns path without suffix for claim alerts', () => {
    const path = formatAlertPath({
      object_name: 'Северный к.2',
      zone: 'Фундамент',
      contractor: 'АО Строй',
      kind: 'claim',
      triad: { declared: { percent: 100 } } as any,
    } as any);
    expect(path).toBe('Северный к.2 · Фундамент · АО Строй');
  });

  it('adds suffix for setup alerts', () => {
    const path = formatAlertPath({
      object_name: 'Северный к.2',
      zone: 'Фундамент',
      contractor: 'АО Строй',
      kind: 'setup',
      triad: { declared: { percent: 75 } } as any,
    } as any);
    expect(path).toBe('Северный к.2 · Фундамент · АО Строй · закрыто на 75 %');
  });

  it('handles zero percent for setup alerts', () => {
    const path = formatAlertPath({
      object_name: 'Объект',
      zone: 'Зона',
      contractor: 'Подрядчик',
      kind: 'setup',
      triad: { declared: { percent: 0 } } as any,
    } as any);
    expect(path).toBe('Объект · Зона · Подрядчик · закрыто на 0 %');
  });

  it('handles 100 percent for setup alerts', () => {
    const path = formatAlertPath({
      object_name: 'Объект',
      zone: 'Зона',
      contractor: 'Подрядчик',
      kind: 'setup',
      triad: { declared: { percent: 100 } } as any,
    } as any);
    expect(path).toBe('Объект · Зона · Подрядчик · закрыто на 100 %');
  });
});

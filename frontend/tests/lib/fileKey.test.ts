import { describe, it, expect } from 'vitest';
import { fileKey } from '@/lib/fileKey';

describe('fileKey', () => {
  it('латиница, цифры, дефис и подчёркивание остаются', () => {
    expect(fileKey('W-07_a')).toBe('W-07_a');
  });
  it('кириллица и прочее кодируются в ASCII', () => {
    expect(fileKey('КАМ-01')).toBe('u41au410u41c-01');
    expect(fileKey('КАМ-01')).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it('разные id дают разные ключи', () => {
    expect(fileKey('КАМ-П1')).not.toBe(fileKey('КАМ-Р1'));
  });
});

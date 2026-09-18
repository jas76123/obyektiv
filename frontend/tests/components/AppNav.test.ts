import { describe, it, expect } from 'vitest';
import { isCurrent } from '@/components/AppNav';

describe('isCurrent', () => {
  it('matches root path only exactly', () => {
    expect(isCurrent('/', '/')).toBe(true);
    expect(isCurrent('/work/', '/')).toBe(false);
  });

  it('matches non-root paths ignoring trailing slash', () => {
    expect(isCurrent('/work/', '/work/')).toBe(true);
    expect(isCurrent('/work', '/work/')).toBe(true);
    expect(isCurrent('/work/', '/work')).toBe(true);
  });

  it('does not match unrelated paths', () => {
    expect(isCurrent('/camera/', '/work/')).toBe(false);
  });

  it('does not match a path that is only a prefix', () => {
    expect(isCurrent('/work/123', '/work/')).toBe(false);
  });
});

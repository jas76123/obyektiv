import { describe, expect, it } from 'vitest';
import { resizeSpec, MAX_SIDE } from '../lib/resize';

describe('resizeSpec', () => {
  it('landscape 4000×3000 uses width constraint', () => {
    const spec = resizeSpec(4000, 3000);
    expect(spec).toEqual({ width: MAX_SIDE });
  });

  it('portrait 3000×4000 uses height constraint', () => {
    const spec = resizeSpec(3000, 4000);
    expect(spec).toEqual({ height: MAX_SIDE });
  });

  it('square defaults to width constraint', () => {
    const spec = resizeSpec(3000, 3000);
    expect(spec).toEqual({ width: MAX_SIDE });
  });

  it('undefined dimensions defaults to width (landscape)', () => {
    const spec = resizeSpec();
    expect(spec).toEqual({ width: MAX_SIDE });
  });

  it('partial undefined defaults to width (landscape)', () => {
    const spec = resizeSpec(4000);
    expect(spec).toEqual({ width: MAX_SIDE });
  });

  it('MAX_SIDE constant is 1280', () => {
    expect(MAX_SIDE).toBe(1280);
  });
});

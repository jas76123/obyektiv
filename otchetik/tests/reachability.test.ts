import { describe, expect, it } from 'vitest';
import { reachabilityPath } from '../lib/reachability';

describe('reachabilityPath', () => {
  it('turns the page path into its directory so HEAD returns 200 under a prefix', () => {
    expect(reachabilityPath('/obyektiv/')).toBe('/obyektiv/');
    expect(reachabilityPath('/obyektiv/index.html')).toBe('/obyektiv/');
    expect(reachabilityPath('/obyektiv/settings')).toBe('/obyektiv/');
    expect(reachabilityPath('/obyektiv')).toBe('/obyektiv/');
  });
  it('falls back to the root when there is no prefix', () => {
    expect(reachabilityPath('/')).toBe('/');
    expect(reachabilityPath('/index.html')).toBe('/');
    expect(reachabilityPath('')).toBe('/');
  });
});

import { describe, expect, it } from 'vitest';
import { uuidFromBytes, newUuid } from '../lib/uuid';

describe('uuidFromBytes', () => {
  it('16 zero bytes → 00000000-0000-4000-8000-000000000000', () => {
    const bytes = new Uint8Array(16);
    const result = uuidFromBytes(bytes);
    expect(result).toBe('00000000-0000-4000-8000-000000000000');
  });

  it('16 0xff bytes → ffffffff-ffff-4fff-bfff-ffffffffffff', () => {
    const bytes = new Uint8Array(16).fill(0xff);
    const result = uuidFromBytes(bytes);
    expect(result).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
  });

  it('throws on wrong length (15 bytes)', () => {
    const bytes = new Uint8Array(15);
    expect(() => uuidFromBytes(bytes)).toThrow();
  });

  it('throws on wrong length (17 bytes)', () => {
    const bytes = new Uint8Array(17);
    expect(() => uuidFromBytes(bytes)).toThrow();
  });

  it('does not mutate input', () => {
    const bytes = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const original = new Uint8Array(bytes);
    uuidFromBytes(bytes);
    expect(bytes).toEqual(original);
  });
});

describe('newUuid', () => {
  it('uses randomBytes when cryptoObj has no randomUUID (insecure context)', () => {
    let callCount = 0;
    const randomBytes = (n: number) => {
      callCount++;
      return new Uint8Array(n);
    };
    const result = newUuid(randomBytes, {});
    expect(callCount).toBe(1);
    expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('returns randomUUID() when available (secure context)', () => {
    const randomBytes = () => new Uint8Array(16);
    const result = newUuid(randomBytes, { randomUUID: () => 'fixed-uuid-value' });
    expect(result).toBe('fixed-uuid-value');
  });

  it('does not call randomBytes when randomUUID is available', () => {
    let callCount = 0;
    const randomBytes = () => {
      callCount++;
      return new Uint8Array(16);
    };
    newUuid(randomBytes, { randomUUID: () => 'fixed' });
    expect(callCount).toBe(0);
  });

  it('uses globalThis.crypto when not provided (defaults to undefined or globalThis)', () => {
    // In real usage, when not providing cryptoObj, it defaults to globalThis.crypto
    // This test just verifies the function is callable without a second arg
    let callCount = 0;
    const randomBytes = (n: number) => {
      callCount++;
      return new Uint8Array(n);
    };
    // If globalThis.crypto.randomUUID exists, it will be used; otherwise randomBytes
    const result = newUuid(randomBytes);
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);
  });
});

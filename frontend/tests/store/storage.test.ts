import { describe, it, expect } from 'vitest';
import { load, save } from '@/store/storage';

describe('storage без localStorage (node)', () => {
  it('не бросает и держит значение в памяти до перезагрузки', () => {
    expect(load('k', { a: 1 })).toEqual({ a: 1 });
    save('k', { a: 2 });
    expect(load('k', { a: 1 })).toEqual({ a: 2 });
  });
});

import { describe, expect, it } from 'vitest';
import { queueEvents } from '../queue/queueEvents';

describe('queueEvents', () => {
  it('calls a subscribed listener on emit', () => {
    let calls = 0;
    const off = queueEvents.on(() => { calls++; });
    queueEvents.emit();
    expect(calls).toBe(1);
    off();
  });

  it('calls every subscribed listener on emit', () => {
    const seen: string[] = [];
    const offA = queueEvents.on(() => seen.push('a'));
    const offB = queueEvents.on(() => seen.push('b'));
    queueEvents.emit();
    expect(seen.sort()).toEqual(['a', 'b']);
    offA();
    offB();
  });

  it('stops calling a listener after unsubscribe', () => {
    let calls = 0;
    const off = queueEvents.on(() => { calls++; });
    off();
    queueEvents.emit();
    expect(calls).toBe(0);
  });

  it('emit with no listeners does not throw', () => {
    expect(() => queueEvents.emit()).not.toThrow();
  });
});

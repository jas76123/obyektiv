import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { cacheFrom, chooseSource, fetchJson, stampSource } from '../data/source';

const demo = { tasks: ['demo'] };

describe('chooseSource', () => {
  it('server wins when it answers', async () => {
    const r = await chooseSource({ server: async () => ({ tasks: ['srv'] }), cached: { tasks: ['old'] }, demo });
    expect(r).toEqual({ data: { tasks: ['srv'] }, source: 'server' });
  });
  it('cache when server fails', async () => {
    const r = await chooseSource({ server: async () => { throw new Error('down'); }, cached: { tasks: ['old'] }, demo });
    expect(r).toEqual({ data: { tasks: ['old'] }, source: 'cache', problem: 'сервер не отвечает' });
  });
  it('demo when server fails and no cache', async () => {
    const r = await chooseSource({ server: async () => { throw new Error('down'); }, cached: undefined, demo });
    expect(r).toEqual({ data: demo, source: 'demo', problem: 'сервер не отвечает' });
  });
  it('cache when server is null but cache exists (demoOnly or no url, spec §3.3 order server->cache->demo)', async () => {
    const r = await chooseSource({ server: null, cached: { tasks: ['old'] }, demo });
    expect(r).toEqual({ data: { tasks: ['old'] }, source: 'cache' });
  });
  it('demo when server is null and no cache', async () => {
    const r = await chooseSource({ server: null, cached: undefined, demo });
    expect(r).toEqual({ data: demo, source: 'demo' });
  });
  it('a rejecting server fills problem with the zod message and falls back to cache', async () => {
    const r = await chooseSource({
      server: async () => { throw new Error('поле ok: ждали boolean, пришло string'); },
      cached: { tasks: ['old'] },
      demo,
    });
    expect(r.source).toBe('cache');
    expect(r.problem).toBe('поле ok: ждали boolean, пришло string');
  });
  it('an HTTP error names the status so a wrong route is not mistaken for a dead server', async () => {
    const r = await chooseSource({ server: async () => { throw new Error('HTTP 404 http://x/api/foreman/objects'); }, cached: undefined, demo });
    expect(r.source).toBe('demo');
    expect(r.problem).toBe('сервер ответил 404');
  });
  it('a network or timeout error falls back to a generic Russian problem text', async () => {
    const r = await chooseSource({ server: async () => { throw new TypeError('Failed to fetch'); }, cached: undefined, demo });
    expect(r.source).toBe('demo');
    expect(r.problem).toBe('сервер не отвечает');
  });
});

describe('cacheFrom', () => {
  it('forwards data when stored is a server answer', () => {
    const stored = { data: { tasks: ['srv'] }, source: 'server' as const, at: '2026-09-22T10:00:00.000Z' };
    expect(cacheFrom(stored, false)).toEqual({ tasks: ['srv'] });
  });
  it('forwards data when stored is cache (regression: second consecutive failure still gets cache)', () => {
    const stored = { data: { tasks: ['srv'] }, source: 'cache' as const, at: '2026-09-22T10:00:00.000Z' };
    expect(cacheFrom(stored, false)).toEqual({ tasks: ['srv'] });
  });
  it('is undefined when stored is demo', () => {
    const stored = { data: { tasks: ['demo'] }, source: 'demo' as const };
    expect(cacheFrom(stored, false)).toBeUndefined();
  });
  it('is undefined when demoOnly is true, even with a server-backed record', () => {
    const stored = { data: { tasks: ['srv'] }, source: 'server' as const, at: '2026-09-22T10:00:00.000Z' };
    expect(cacheFrom(stored, true)).toBeUndefined();
  });
  it('is undefined when there is nothing stored', () => {
    expect(cacheFrom(undefined, false)).toBeUndefined();
  });
});

describe('stampSource', () => {
  const now = new Date('2026-09-22T12:34:00.000Z');
  it('stamps server results with the current time', () => {
    const r = stampSource({ data: { tasks: ['srv'] }, source: 'server' }, undefined, now);
    expect(r).toEqual({ data: { tasks: ['srv'] }, source: 'server', at: now.toISOString() });
  });
  it('keeps the stored time for cache results', () => {
    const stored = { data: { tasks: ['srv'] }, source: 'server' as const, at: '2026-09-22T10:00:00.000Z' };
    const r = stampSource({ data: { tasks: ['srv'] }, source: 'cache' }, stored, now);
    expect(r).toEqual({ data: { tasks: ['srv'] }, source: 'cache', at: '2026-09-22T10:00:00.000Z' });
  });
  it('leaves cache without a time when stored had none', () => {
    const r = stampSource({ data: { tasks: ['srv'] }, source: 'cache' }, undefined, now);
    expect(r).toEqual({ data: { tasks: ['srv'] }, source: 'cache', at: undefined });
  });
  it('has no time for demo', () => {
    const r = stampSource({ data: demo, source: 'demo' }, undefined, now);
    expect(r).toEqual({ data: demo, source: 'demo', at: undefined });
  });
});

describe('fetchJson', () => {
  const schema = z.object({ ok: z.boolean() });
  it('parses valid json', async () => {
    const f = async () => new Response(JSON.stringify({ ok: true }), { status: 200 });
    expect(await fetchJson('http://x/api', schema, undefined, f as typeof fetch)).toEqual({ ok: true });
  });
  it('throws readable message on schema mismatch', async () => {
    const f = async () => new Response(JSON.stringify({ ok: 'yes' }), { status: 200 });
    await expect(fetchJson('http://x/api', schema, undefined, f as typeof fetch)).rejects.toThrow(/поле ok: ждали boolean, пришло string/);
  });
  it('throws on http error', async () => {
    const f = async () => new Response('nope', { status: 500 });
    await expect(fetchJson('http://x/api', schema, undefined, f as typeof fetch)).rejects.toThrow(/HTTP 500/);
  });

  it('rejects within the timeout when the server accepts the connection but never answers', async () => {
    vi.useFakeTimers();
    const f = (_url: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    });
    const pending = expect(fetchJson('http://x/api', schema, undefined, f as typeof fetch)).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(8_000);
    await pending;
    vi.useRealTimers();
  });
});

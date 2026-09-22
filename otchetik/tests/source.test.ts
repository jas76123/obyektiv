import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { chooseSource, fetchJson } from '../data/source';

const demo = { tasks: ['demo'] };

describe('chooseSource', () => {
  it('server wins when it answers', async () => {
    const r = await chooseSource({ server: async () => ({ tasks: ['srv'] }), cached: { tasks: ['old'] }, demo });
    expect(r).toEqual({ data: { tasks: ['srv'] }, source: 'server' });
  });
  it('cache when server fails', async () => {
    const r = await chooseSource({ server: async () => { throw new Error('down'); }, cached: { tasks: ['old'] }, demo });
    expect(r).toEqual({ data: { tasks: ['old'] }, source: 'cache' });
  });
  it('demo when server fails and no cache', async () => {
    const r = await chooseSource({ server: async () => { throw new Error('down'); }, cached: undefined, demo });
    expect(r).toEqual({ data: demo, source: 'demo' });
  });
  it('cache when server is null but cache exists (demoOnly or no url, spec §3.3 order server->cache->demo)', async () => {
    const r = await chooseSource({ server: null, cached: { tasks: ['old'] }, demo });
    expect(r).toEqual({ data: { tasks: ['old'] }, source: 'cache' });
  });
  it('demo when server is null and no cache', async () => {
    const r = await chooseSource({ server: null, cached: undefined, demo });
    expect(r).toEqual({ data: demo, source: 'demo' });
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
});

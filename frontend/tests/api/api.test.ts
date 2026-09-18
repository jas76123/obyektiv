import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { makeFileSource } from '@/api/fileSource';
import { makeHttpSource } from '@/api/httpSource';
import { makeApi, parseWith } from '@/api/api';
import { ApiError, type FetchFn } from '@/api/source';
import { PortfolioSchema } from '@/contract';

const portfolio = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../public/data/portfolio.json'), 'utf-8'));

function fakeFetch(map: Record<string, { status?: number; body?: unknown }>, calls: string[] = []): FetchFn {
  return async (url, init) => {
    calls.push(`${init?.method ?? 'GET'} ${url}`);
    const hit = map[url];
    if (!hit) return new Response('not found', { status: 404 });
    return new Response(JSON.stringify(hit.body ?? {}), { status: hit.status ?? 200 });
  };
}

describe('fileSource', () => {
  it('пути заглушек: ASCII-ключи и базовый путь', async () => {
    const calls: string[] = [];
    const src = makeFileSource(fakeFetch({}, calls), '/obyektiv');
    await src.portfolio().catch(() => null);
    await src.gantt('sev').catch(() => null);
    await src.review('W-07').catch(() => null);
    await src.frame('КАМ-02', '2026-09-03').catch(() => null);
    await src.settings('sev').catch(() => null);
    expect(calls).toEqual([
      'GET /obyektiv/data/portfolio.json',
      'GET /obyektiv/data/gantt/sev.json',
      'GET /obyektiv/data/review/W-07.json',
      'GET /obyektiv/data/frame/u41au410u41c-02_2026-09-03.json',
      'GET /obyektiv/data/settings/sev.json',
    ]);
  });
  it('в файловом режиме сервера для плана нет', async () => {
    expect(await makeFileSource(fakeFetch({}), '').uploadPlan({ object_id: 'sev', source_name: 'x.csv', works: [] })).toBeNull();
  });
});

describe('httpSource', () => {
  it('пути API по DEV_REQUIREMENTS §6', async () => {
    const calls: string[] = [];
    const src = makeHttpSource(fakeFetch({}, calls), 'http://api');
    await src.gantt('sev').catch(() => null);
    await src.review('W-07').catch(() => null);
    await src.frame('КАМ-02', '2026-09-03').catch(() => null);
    await src.settings('sev').catch(() => null);
    expect(calls).toEqual([
      'GET http://api/api/objects/sev/gantt',
      'GET http://api/api/works/W-07/review',
      `GET http://api/api/cameras/${encodeURIComponent('КАМ-02')}/frame?date=2026-09-03`,
      'GET http://api/api/settings?object=sev',
    ]);
  });
  it('POST /api/plan: 404 и 405 означают «эндпоинта нет», а не ошибку', async () => {
    const src = makeHttpSource(fakeFetch({ 'http://api/api/plan': { status: 405 } }), 'http://api');
    expect(await src.uploadPlan({ object_id: 'sev', source_name: 'x.csv', works: [] })).toBeNull();
  });
});

describe('api', () => {
  it('ответ по схеме возвращается типизированным', async () => {
    const api = makeApi(makeFileSource(fakeFetch({ '/data/portfolio.json': { body: portfolio } }), ''));
    expect((await api.portfolio()).objects).toHaveLength(6);
  });
  it('404 → ApiError not_found', async () => {
    const api = makeApi(makeFileSource(fakeFetch({}), ''));
    await expect(api.review('NOPE')).rejects.toMatchObject({ kind: 'not_found' });
  });
  it('сеть упала → ApiError network', async () => {
    const api = makeApi(makeFileSource(async () => { throw new TypeError('fetch failed'); }, ''));
    await expect(api.portfolio()).rejects.toMatchObject({ kind: 'network' });
  });
  it('расхождение со схемой: названо поле', () => {
    const broken = { ...portfolio, as_of: 20260904 };
    try {
      parseWith(PortfolioSchema, broken, 'GET /api/portfolio');
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).kind).toBe('schema');
      expect((e as ApiError).details[0]).toMatch(/^as_of: /);
    }
  });
});

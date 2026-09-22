import type { ZodError, ZodTypeAny, z } from 'zod';

export type SourceTag = 'server' | 'cache' | 'demo';
export type Sourced<T> = { data: T; source: SourceTag };

/**
 * Порядок из спеки §3.3: сервер, потом кэш, потом демо — всегда в этом порядке.
 * server === null значит «на сервер не ходим» (нет адреса или включён режим
 * «только демо»): в этом случае всё равно сначала пробуем кэш, и только если
 * его нет — демо.
 */
export async function chooseSource<T>(opts: {
  server: (() => Promise<T>) | null;
  cached: T | undefined;
  demo: T;
}): Promise<Sourced<T>> {
  if (opts.server) {
    try {
      return { data: await opts.server(), source: 'server' };
    } catch {
      if (opts.cached !== undefined) return { data: opts.cached, source: 'cache' };
      return { data: opts.demo, source: 'demo' };
    }
  }
  if (opts.cached !== undefined) return { data: opts.cached, source: 'cache' };
  return { data: opts.demo, source: 'demo' };
}

function describeZodError(e: ZodError): string {
  const issue = e.issues[0];
  const path = issue.path.join('.') || 'корень';
  if (issue.code === 'invalid_type') {
    return `поле ${path}: ждали ${issue.expected}, пришло ${issue.received}`;
  }
  return `поле ${path}: ${issue.message}`;
}

export async function fetchJson<S extends ZodTypeAny>(
  url: string,
  schema: S,
  init?: RequestInit,
  fetchImpl: typeof fetch = fetch,
): Promise<z.infer<S>> {
  const res = await fetchImpl(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const json = await res.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new Error(describeZodError(parsed.error));
  return parsed.data;
}

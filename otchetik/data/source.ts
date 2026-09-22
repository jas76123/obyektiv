import type { ZodError, ZodTypeAny, z } from 'zod';
import { GET_TIMEOUT_MS, timeoutSignal } from '../lib/network';

export type SourceTag = 'server' | 'cache' | 'demo';
/**
 * `at` — время (ISO), когда `data` пришли от сервера. Есть при source
 * 'server' и 'cache' (кэш всегда происходит от настоящего ответа сервера),
 * отсутствует при 'demo'.
 */
export type Sourced<T> = { data: T; source: SourceTag; at?: string };

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

/**
 * Что передать в chooseSource как «кэш» из уже сохранённой записи.
 * «Кэш» — это только последний успешный ответ сервера: source 'cache' сюда
 * всегда попадает от настоящего ответа сервера (демо никогда не
 * пересохраняется как 'cache'), поэтому и предыдущий кэш годится дальше,
 * сколько бы раз подряд сервер ни падал. При «только демо-данные» кэш не
 * отдаём вообще, чтобы демо оставалось демо.
 */
export function cacheFrom<T>(stored: Sourced<T> | undefined, demoOnly: boolean): T | undefined {
  if (demoOnly || !stored) return undefined;
  if (stored.source === 'server' || stored.source === 'cache') return stored.data;
  return undefined;
}

/**
 * Проставляет `at` результату chooseSource: для 'server' — текущее время
 * (это и есть момент ответа), для 'cache' — время из предыдущей записи
 * (может быть undefined, но обычно есть, раз кэш живой), для 'demo' — нет
 * времени вовсе.
 */
export function stampSource<T>(result: Sourced<T>, stored: Sourced<T> | undefined, now: Date = new Date()): Sourced<T> {
  if (result.source === 'server') return { ...result, at: now.toISOString() };
  if (result.source === 'cache') return { ...result, at: stored?.at };
  return { ...result, at: undefined };
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
  const res = await fetchImpl(url, { ...init, signal: init?.signal ?? timeoutSignal(GET_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const json = await res.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new Error(describeZodError(parsed.error));
  return parsed.data;
}

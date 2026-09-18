import type { PlanUpload } from '@/contract';

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export class ApiError extends Error {
  constructor(public kind: 'network' | 'not_found' | 'http' | 'schema', message: string, public details: string[] = []) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Источник отдаёт сырой JSON; проверку схемой делает api.ts. */
export interface Source {
  portfolio(): Promise<unknown>;
  gantt(objectId: string): Promise<unknown>;
  review(workId: string): Promise<unknown>;
  frame(cameraId: string, date: string): Promise<unknown>;
  settings(objectId: string): Promise<unknown>;
  /** null = принять план некому (файловый режим или бэкенд без POST /api/plan) */
  uploadPlan(body: PlanUpload): Promise<unknown | null>;
}

export async function getJson(fetchFn: FetchFn, url: string, init?: RequestInit): Promise<unknown> {
  let res: Response;
  try {
    res = await fetchFn(url, init);
  } catch (e) {
    throw new ApiError('network', `Источник данных недоступен: ${url}`, [String(e)]);
  }
  if (res.status === 404) throw new ApiError('not_found', `Не найдено: ${url}`);
  if (!res.ok) throw new ApiError('http', `Ошибка ${res.status}: ${url}`);
  return res.json();
}

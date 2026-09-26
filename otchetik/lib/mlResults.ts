import { photoVerdict, type PhotoVerdict } from './status';

/**
 * Результат нейросети по фото прораба: нашла ли что-то на снимке и сверка с планом
 * (`work_status`, нормализованный — см. lib/status.normalizeWorkStatus; нет — сверки не было).
 * Хранится отдельно от очереди (у SQLite нет миграций), словарь local_uuid → результат.
 * Хранилище передаётся снаружи: в приложении AsyncStorage, в тестах память.
 */
export type MlResult = { empty: boolean; count: number; checked_at: string; work_status?: string };

export interface KeyValue {
  getItem(k: string): Promise<string | null>;
  setItem(k: string, v: string): Promise<void>;
}

export interface MlResultsStore {
  load(): Promise<Record<string, MlResult>>;
  get(uuid: string): MlResult | undefined;
  set(uuid: string, r: MlResult): Promise<void>;
  /** local_uuid → вердикт фото (lib/status.photoVerdict) для taskState/buildReport. */
  verdicts(): Record<string, PhotoVerdict>;
  on(l: () => void): () => void;
}

export const ML_RESULTS_KEY = 'otchetik.ml.v1';

export function createMlResults(kv: KeyValue, key: string = ML_RESULTS_KEY): MlResultsStore {
  let cache: Record<string, MlResult> | null = null;
  const listeners = new Set<() => void>();

  async function load(): Promise<Record<string, MlResult>> {
    if (cache) return cache;
    try {
      const raw = await kv.getItem(key);
      const parsed = raw ? JSON.parse(raw) : {};
      cache = parsed && typeof parsed === 'object' ? (parsed as Record<string, MlResult>) : {};
    } catch {
      cache = {};
    }
    return cache;
  }

  return {
    load,
    get: (uuid) => cache?.[uuid],
    async set(uuid, r) {
      const next = { ...(await load()), [uuid]: r };
      cache = next;
      await kv.setItem(key, JSON.stringify(next));
      listeners.forEach((l) => l());
    },
    verdicts: () => Object.fromEntries(Object.entries(cache ?? {}).map(([u, r]) => [u, photoVerdict(r)])),
    on(l) { listeners.add(l); return () => { listeners.delete(l); }; },
  };
}

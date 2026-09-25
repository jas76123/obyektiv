/**
 * Результат нейросети по фото прораба: нашла ли что-то на снимке.
 * Хранится отдельно от очереди (у SQLite нет миграций), словарь local_uuid → результат.
 * Хранилище передаётся снаружи: в приложении AsyncStorage, в тестах память.
 */
export type MlResult = { empty: boolean; count: number; checked_at: string };

export interface KeyValue {
  getItem(k: string): Promise<string | null>;
  setItem(k: string, v: string): Promise<void>;
}

export interface MlResultsStore {
  load(): Promise<Record<string, MlResult>>;
  get(uuid: string): MlResult | undefined;
  set(uuid: string, r: MlResult): Promise<void>;
  /** local_uuid → empty, в форме, которую ждут lib/reports (ReportOpts.mlEmpty). */
  emptyMap(): Record<string, boolean>;
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
    emptyMap: () => Object.fromEntries(Object.entries(cache ?? {}).map(([u, r]) => [u, r.empty])),
    on(l) { listeners.add(l); return () => { listeners.delete(l); }; },
  };
}

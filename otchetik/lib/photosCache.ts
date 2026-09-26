import type { KeyValue } from './mlResults';

/**
 * Последний ответ GET /photos целиком (спека 26.09 §5.2): из него телефон считает рейтинг
 * бригад. Хранилище передаётся снаружи (AsyncStorage в приложении, память в тестах),
 * как у lib/mlResults.ts.
 */
export type PhotoEntry = { id: string; file: string; timestamp: string; count: number };
export type PhotosSnapshot = { at: string | null; list: PhotoEntry[] };

export interface PhotosStore {
  load(): Promise<PhotosSnapshot>;
  get(): PhotosSnapshot;
  set(list: PhotoEntry[], at: string): Promise<void>;
  on(l: () => void): () => void;
}

export const PHOTOS_KEY = 'otchetik.photos.v1';
const EMPTY: PhotosSnapshot = { at: null, list: [] };

export function createPhotosCache(kv: KeyValue, key: string = PHOTOS_KEY): PhotosStore {
  let cache: PhotosSnapshot | null = null;
  const listeners = new Set<() => void>();

  // Кривая запись (например, обрезанная запись из старой версии формата) не должна
  // ронять рендер рейтинга — отсеиваем всё, что не похоже на PhotoEntry.
  function isPhotoEntry(x: unknown): x is PhotoEntry {
    if (!x || typeof x !== 'object') return false;
    const p = x as Record<string, unknown>;
    return typeof p.id === 'string' && typeof p.file === 'string' && typeof p.timestamp === 'string' && typeof p.count === 'number';
  }

  async function load(): Promise<PhotosSnapshot> {
    if (cache) return cache;
    try {
      const raw = await kv.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;
      cache = parsed && typeof parsed === 'object' && Array.isArray(parsed.list)
        ? { at: typeof parsed.at === 'string' ? parsed.at : null, list: (parsed.list as unknown[]).filter(isPhotoEntry) }
        : { ...EMPTY };
    } catch {
      cache = { ...EMPTY };
    }
    return cache;
  }

  return {
    load,
    get: () => cache ?? EMPTY,
    async set(list, at) {
      cache = { at, list };
      await kv.setItem(key, JSON.stringify(cache));
      listeners.forEach((l) => l());
    },
    on(l) { listeners.add(l); return () => { listeners.delete(l); }; },
  };
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export type Settings = {
  serverUrl: string;
  demoOnly: boolean;
  /** Спрашивать у сервера результат нейросети по фото (GET /photos). Выключатель на демо. */
  mlCheck: boolean;
  objectId: string | null;
  objectName: string | null;
  brigadeId: string | null;
  brigadeName: string | null;
};

export const DEFAULT_SETTINGS: Settings = {
  serverUrl: '', // адрес сервера команды вписать сюда, когда появится
  demoOnly: false,
  mlCheck: true,
  objectId: null,
  objectName: null,
  brigadeId: null,
  brigadeName: null,
};

const KEY = 'otchetik.settings.v1';
let cache: Settings | null = null;
const listeners = new Set<(s: Settings) => void>();

export async function loadSettings(): Promise<Settings> {
  if (cache) return cache;
  let next: Settings;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    next = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    next = { ...DEFAULT_SETTINGS };
  }
  cache = next;
  return cache;
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await loadSettings()), ...patch };
  cache = next;
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l(next));
  return next;
}

export function useSettings(): { settings: Settings | null; save: (p: Partial<Settings>) => Promise<Settings> } {
  const [settings, setSettings] = useState<Settings | null>(cache);
  useEffect(() => {
    loadSettings().then(setSettings);
    listeners.add(setSettings);
    return () => { listeners.delete(setSettings); };
  }, []);
  const save = useCallback((p: Partial<Settings>) => saveSettings(p), []);
  return { settings, save };
}

/** Базовый адрес API или null, если ходить на сервер не нужно. */
export function serverBase(s: Settings): string | null {
  if (s.demoOnly || !s.serverUrl.trim()) return null;
  return s.serverUrl.trim().replace(/\/+$/, '');
}

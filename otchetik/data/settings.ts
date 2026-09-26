import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { defaultServerUrl, resolveServerBase } from '../lib/serverDefault';
import type { ThemePref } from '../lib/theme';

export type Settings = {
  serverUrl: string;
  demoOnly: boolean;
  /** Спрашивать у сервера результат нейросети по фото (GET /photos). Выключатель на демо. */
  mlCheck: boolean;
  /** Тема экранов: «авто» = как в телефоне или браузере (спека 26.09 §3). */
  theme: ThemePref;
  objectId: string | null;
  objectName: string | null;
  brigadeId: string | null;
  brigadeName: string | null;
};

export const DEFAULT_SETTINGS: Settings = {
  serverUrl: '', // пусто = адрес по умолчанию (lib/serverDefault.ts); скрытая настройка перекрывает
  demoOnly: false,
  mlCheck: true,
  theme: 'auto',
  objectId: null,
  objectName: null,
  brigadeId: null,
  brigadeName: null,
};

const KEY = 'otchetik.settings.v1';
let cache: Settings | null = null;
const listeners = new Set<(s: Settings) => void>();

/** Подписка на изменения настроек вне React (например, перенастройка проверки сети при смене адреса сервера). */
export function onSettingsChange(listener: (s: Settings) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

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
  // Ошибка одного слушателя (например, перенастройки NetInfo) не должна ломать сохранение
  // настроек и остальных подписчиков: смена темы не зависит от проверки сети.
  listeners.forEach((l) => { try { l(next); } catch {} });
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

/** Умолчание для текущей платформы и адреса страницы. */
export function currentDefaultServerUrl(): string {
  const loc = typeof window !== 'undefined' && window.location ? window.location : undefined;
  return defaultServerUrl({ platform: Platform.OS, hostname: loc?.hostname, origin: loc?.origin });
}

/** Базовый адрес API или null, если ходить на сервер не нужно. */
export function serverBase(s: Settings): string | null {
  return resolveServerBase(s, currentDefaultServerUrl());
}

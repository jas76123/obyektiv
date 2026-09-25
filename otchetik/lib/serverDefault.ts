/**
 * Адрес сервера по умолчанию (спека 26.09 §3). Платформа и адрес страницы
 * передаются снаружи: в lib/ нет импортов из react-native.
 */
export const TEAM_SERVER_URL = 'http://217.18.63.89:8000';
/** Хост шлюза в Yandex Cloud, где веб-версия и сервер на одном адресе. */
export const GATEWAY_HOST_SUFFIX = '.apigw.yandexcloud.net';

export type RunEnv = {
  platform: string;   // Platform.OS: 'android' | 'ios' | 'web' | …
  hostname?: string;  // window.location.hostname в вебе
  origin?: string;    // window.location.origin в вебе
};

/** Сборка на телефоне → сервер команды; веб на шлюзе → свой адрес; веб где-то ещё → '' (демо). */
export function defaultServerUrl(env: RunEnv): string {
  if (env.platform !== 'web') return TEAM_SERVER_URL;
  if (env.hostname && env.origin && env.hostname.endsWith(GATEWAY_HOST_SUFFIX)) return env.origin;
  return '';
}

/** Базовый адрес API или null: «только демо» или нет ни введённого адреса, ни умолчания. */
export function resolveServerBase(s: { serverUrl: string; demoOnly: boolean }, fallback: string): string | null {
  if (s.demoOnly) return null;
  const url = s.serverUrl.trim() || fallback.trim();
  if (!url) return null;
  return url.replace(/\/+$/, '');
}

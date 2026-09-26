import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { loadSettings, onSettingsChange, serverBase, type Settings } from '../data/settings';
import { GET_TIMEOUT_MS } from '../lib/network';
import { reachabilityPath, serverReachabilityUrl } from '../lib/reachability';

/**
 * На вебе NetInfo проверяет сеть по каталогу приложения, а не по корню сайта (см. lib/reachability.ts).
 * Метод — GET, а не HEAD по умолчанию: шлюз Yandex API Gateway на HEAD отвечает 405
 * (в apigw.yaml описан только get), и NetInfo считал бы, что интернета нет:
 * шапка «нет сети», очередь не запускается, фото навсегда «ждёт сети».
 */
export function configureNetInfoForWeb(): void {
  if (Platform.OS !== 'web') return;
  const base = process.env.EXPO_BASE_URL || (typeof location !== 'undefined' ? location.pathname : '');
  NetInfo.configure({ reachabilityUrl: reachabilityPath(base), reachabilityMethod: 'GET' });
}

let configuredUrl: string | null | undefined;

/**
 * Пауза между проверками, пока сервер «не отвечает» (по умолчанию у NetInfo 5 с). Сервер команды
 * однопоточный: пока он считает чужой /photos, лишний GET раз в 5 с только мешает отправке фото.
 * 30 с достаточно: очередь и так перезапускается по событию «сеть появилась», а не по таймеру.
 * Пока сервер отвечает, NetInfo проверяет раз в 60 с (умолчание, не трогаем).
 */
export const REACHABILITY_RETRY_MS = 30_000;

/**
 * На телефоне NetInfo по умолчанию доверяет системе Android, а та проверяет интернет по
 * серверам Google. Если до Google не достучаться, шапка показывает «нет сети» и очередь
 * стоит, хотя сервер команды доступен (эмулятор 26.09; в России такое возможно и на
 * настоящем телефоне). Поэтому проверяем сами, по серверу команды (lib/reachability.ts).
 * Без сервера («только демо») возвращаем системную проверку: очередь всё равно не ходит.
 */
export function applyNativeReachability(s: Settings): void {
  if (Platform.OS === 'web') return;
  const url = serverReachabilityUrl(serverBase(s));
  if (url === configuredUrl) return;
  configuredUrl = url;
  if (url) {
    NetInfo.configure({
      reachabilityUrl: url,
      reachabilityMethod: 'GET',
      reachabilityTest: (r) => Promise.resolve(r.status === 200),
      reachabilityRequestTimeout: GET_TIMEOUT_MS,
      reachabilityShortTimeout: REACHABILITY_RETRY_MS,
      useNativeReachability: false,
    });
  } else {
    NetInfo.configure({ useNativeReachability: true });
  }
}

/** Вызывается один раз при старте: настройка для текущего сервера и перенастройка при смене адреса. */
export function configureNetInfo(): void {
  configureNetInfoForWeb();
  if (Platform.OS === 'web') return;
  loadSettings().then(applyNativeReachability).catch(() => {});
  onSettingsChange(applyNativeReachability);
}

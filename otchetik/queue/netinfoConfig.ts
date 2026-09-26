import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
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
 * Цена: после возврата сервера при том же подключении шапка может держать «нет сети» до 30 с,
 * и очередь (она смотрит на тот же ответ NetInfo) ждёт столько же — фото лежат в очереди, не
 * теряются. Смена подключения (Wi‑Fi ↔ сотовая) и выход приложения на передний план
 * (refreshNet в queue/triggers.ts) проверяют сразу, без паузы.
 * Пока сервер отвечает, NetInfo проверяет раз в 60 с (умолчание, не трогаем).
 */
export const REACHABILITY_RETRY_MS = 30_000;

type NetListener = (s: NetInfoState) => void;
/** Живые подписчики NetInfo: слушатель → как отписаться от текущего состояния библиотеки. */
const netListeners = new Map<NetListener, () => void>();

/**
 * Подписка на NetInfo, которая переживает NetInfo.configure(). Сам configure() сносит внутреннее
 * состояние библиотеки вместе со всеми подписками (node_modules/@react-native-community/netinfo/
 * src/index.ts → tearDown), а у нас он вызывается после старта (настройки читаются асинхронно)
 * и при смене адреса сервера или «только демо». Без переподписки шапка застревала бы в «онлайн»,
 * а очередь теряла бы запуск по событию «сеть появилась». Слушатель сразу получает текущее
 * состояние, как и у NetInfo.addEventListener.
 */
export function subscribeNet(listener: NetListener): () => void {
  netListeners.set(listener, NetInfo.addEventListener(listener));
  return () => {
    const off = netListeners.get(listener);
    netListeners.delete(listener);
    off?.();
  };
}

/** После configure(): подписать всех заново на новое состояние библиотеки (старые отписки уже пустые). */
function resubscribeNet(): void {
  for (const l of [...netListeners.keys()]) netListeners.set(l, NetInfo.addEventListener(l));
}

/** Проверить сеть прямо сейчас, не дожидаясь следующего опроса (выход приложения на передний план). */
export function refreshNet(): void {
  NetInfo.refresh().catch(() => {});
}

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
  resubscribeNet();
}

/** Вызывается один раз при старте: настройка для текущего сервера и перенастройка при смене адреса. */
export function configureNetInfo(): void {
  configureNetInfoForWeb();
  if (Platform.OS === 'web') return;
  loadSettings().then(applyNativeReachability).catch(() => {});
  onSettingsChange(applyNativeReachability);
}

import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { reachabilityPath } from '../lib/reachability';

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

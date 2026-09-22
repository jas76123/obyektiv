import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { reachabilityPath } from '../lib/reachability';

/** На вебе NetInfo проверяет сеть по каталогу приложения, а не по корню сайта (см. lib/reachability.ts). */
export function configureNetInfoForWeb(): void {
  if (Platform.OS !== 'web') return;
  const base = process.env.EXPO_BASE_URL || (typeof location !== 'undefined' ? location.pathname : '');
  NetInfo.configure({ reachabilityUrl: reachabilityPath(base) });
}

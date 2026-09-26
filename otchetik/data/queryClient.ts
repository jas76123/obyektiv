import AsyncStorage from '@react-native-async-storage/async-storage';
import { focusManager, QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { AppState, Platform } from 'react-native';

export const QUERY_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // неделя: наряды прошлых дней для «не принято» (спека work_status §3.5)

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: QUERY_CACHE_MAX_AGE_MS, // неделя на диске
      staleTime: 1000 * 30,
      retry: 0, // повторы делает chooseSource через кэш и демо, а не react-query
      // chooseSource сам уходит в кэш/демо при сбое сети — react-query не должен
      // ставить запрос на паузу из-за navigator.onLine (веб, default networkMode
      // 'online'): без 'always' офлайн-заход в вебе вместо демо-данных зависал
      // в isLoading, потому что queryFn вовсе не вызывался.
      networkMode: 'always',
    },
  },
});

// focusManager у react-query по умолчанию смотрит на document.visibilitychange,
// которого нет в React Native — на телефоне isFocused() всегда true, и 30-секундный
// опрос shots/status продолжает идти, даже когда приложение свёрнуто. Подключаем
// его к AppState, как советует документация react-query для RN.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    focusManager.setFocused(state === 'active');
  });
}

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'otchetik.query-cache.v1',
});

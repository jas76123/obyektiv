import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { persister, queryClient, QUERY_CACHE_MAX_AGE_MS } from '../data/queryClient';
import { useTheme } from '../data/theme';
import { registerBackgroundTask } from '../queue/backgroundTask';
import { configureNetInfoForWeb } from '../queue/netinfoConfig';
import { installTriggers } from '../queue/triggers';

// До первого подписчика NetInfo: иначе проверка сети уйдёт на корень сайта и вернёт «нет сети».
configureNetInfoForWeb();

export default function RootLayout() {
  const t = useTheme();
  useEffect(() => {
    registerBackgroundTask().catch(() => {});
    return installTriggers();
  }, []);

  return (
    // По умолчанию persister выбрасывает кэш через 24 ч (maxAge) — наряды прошлых дней
    // должны жить неделю (usePastSchedules, спека work_status §3.5).
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: QUERY_CACHE_MAX_AGE_MS }}>
      {/* Светлые значки статус-бара на тёмной теме и наоборот */}
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      {/* contentStyle: фон между экранами тоже из темы, без белой вспышки при переходах */}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="settings"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Настройка сервера',
            headerStyle: { backgroundColor: t.paper },
            headerTintColor: t.ink,
            headerTitleStyle: { color: t.ink },
          }}
        />
      </Stack>
    </PersistQueryClientProvider>
  );
}

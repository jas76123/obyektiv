import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { persister, queryClient } from '../data/queryClient';
import { registerBackgroundTask } from '../queue/backgroundTask';
import { installTriggers } from '../queue/triggers';

export default function RootLayout() {
  useEffect(() => {
    registerBackgroundTask().catch(() => {});
    return installTriggers();
  }, []);

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={{ presentation: 'modal', headerShown: true, title: 'Настройка сервера' }} />
      </Stack>
    </PersistQueryClientProvider>
  );
}

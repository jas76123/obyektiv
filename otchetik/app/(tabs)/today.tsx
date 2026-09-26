import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Header } from '../../components/Header';
import { TaskCard } from '../../components/TaskCard';
import { useSchedule, useShotStatuses } from '../../data/queries';
import { serverBase, useSettings } from '../../data/settings';
import { useTheme } from '../../data/theme';
import { taskState } from '../../lib/reports';
import type { Theme } from '../../lib/theme';
import { dayKey, fmtDay, todayIso } from '../../lib/time';
import { useMlEmpty } from '../../queue/mlResults';
import { useShownRecords } from '../../queue/useShownRecords';

export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => NetInfo.addEventListener((s) => setOnline(!!s.isConnected && s.isInternetReachable !== false)), []);
  return online;
}

export default function Today() {
  const { settings } = useSettings();
  const date = todayIso();
  const online = useOnline();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  // Спрашиваем разрешение на геолокацию заранее: quickGeo при съёмке ждёт координаты
  // не дольше секунды, и системный диалог разрешения в это окно не должен успеть встать.
  useEffect(() => { Location.requestForegroundPermissionsAsync().catch(() => {}); }, []);
  const schedule = useSchedule(settings?.objectId ?? null, settings?.brigadeId ?? null, date);
  const { records, shown, pending, refresh } = useShownRecords(schedule.data?.source === 'demo');
  const todays = useMemo(() => records.filter((r) => dayKey(r.taken_at) === date), [records, date]);
  const uploaded = useMemo(() => shown.filter((r) => r.status === 'uploaded').map((r) => r.local_uuid), [shown]);
  const statuses = useShotStatuses(uploaded);
  const byUuid = useMemo(() => Object.fromEntries((statuses.data?.data.shots ?? []).map((s) => [s.local_uuid, s])), [statuses.data]);
  const mlEmpty = useMlEmpty();
  const serverSet = settings ? serverBase(settings) !== null : true;

  const tasks = schedule.data?.data.tasks ?? [];
  return (
    <View style={styles.screen}>
      <Header title="Сегодня" queueCount={pending} online={online} source={schedule.data?.source} at={schedule.data?.at} problem={schedule.data?.problem} />
      <Text style={styles.day}>{fmtDay(date).toUpperCase()} · {date.slice(8, 10)}.{date.slice(5, 7)}</Text>
      <FlatList
        data={tasks}
        keyExtractor={(task) => task.task_id}
        contentContainerStyle={{ padding: t.pad }}
        refreshControl={<RefreshControl refreshing={schedule.isFetching} onRefresh={() => { schedule.refetch(); refresh(); }} tintColor={t.accentText} colors={[t.accentText]} progressBackgroundColor={t.paper} />}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            shots={todays.filter((r) => r.task_id === item.task_id)}
            state={taskState(shown, byUuid, item.task_id, { mlEmpty })}
            serverSet={serverSet}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>{schedule.isLoading ? 'Загружаем работы…' : schedule.error ? String((schedule.error as Error).message) : 'На сегодня работ нет'}</Text>
        }
      />
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.bg },
  day: { paddingHorizontal: t.pad, paddingTop: 12, fontSize: 12, fontWeight: '700', color: t.faint, letterSpacing: 0.6 },
  empty: { color: t.muted, textAlign: 'center', marginTop: 24 },
});

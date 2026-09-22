import { useMemo } from 'react';
import { Alert, SectionList, StyleSheet, Text, View } from 'react-native';
import { Header } from '../../components/Header';
import { ReportRow } from '../../components/ReportRow';
import { useSchedule, useShotStatuses } from '../../data/queries';
import { useSettings } from '../../data/settings';
import { demoShots } from '../../demo';
import { showCaptureError } from '../../lib/alerts';
import { buildReport } from '../../lib/reports';
import { theme } from '../../lib/theme';
import { todayIso } from '../../lib/time';
import { captureForTask } from '../../queue/capture';
import { newRecord } from '../../queue/types';
import { useQueue } from '../../queue/useQueue';
import { useOnline } from './today';

export default function Reports() {
  const { settings } = useSettings();
  const online = useOnline();
  const date = todayIso();
  const schedule = useSchedule(settings?.objectId ?? null, settings?.brigadeId ?? null, date);
  const { records, pending } = useQueue(7);

  // Демо-режим без своих фото: показываем демо-записи, чтобы лента не была пустой.
  const isDemo = schedule.data?.source === 'demo';
  const shown = useMemo(() => (records.length === 0 && isDemo
    ? demoShots.map((d) => ({ ...newRecord({ ...d, geo: null, file_path: '' }), status: 'uploaded' as const }))
    : records), [records, isDemo]);

  const uploaded = useMemo(() => shown.filter((r) => r.status === 'uploaded').map((r) => r.local_uuid), [shown]);
  const statuses = useShotStatuses(uploaded);
  const byUuid = useMemo(() => Object.fromEntries((statuses.data?.data.shots ?? []).map((s) => [s.local_uuid, s])), [statuses.data]);
  const tasks = useMemo(() => Object.fromEntries((schedule.data?.data.tasks ?? []).map((t) => [t.task_id, t])), [schedule.data]);
  const days = useMemo(() => buildReport(shown, byUuid, tasks), [shown, byUuid, tasks]);

  async function retake(task_id: string) {
    const task = tasks[task_id];
    if (!task) { Alert.alert('Работа не в сегодняшнем наряде', 'Снять можно с экрана «Сегодня»'); return; }
    const last = [...shown].filter((r) => r.task_id === task_id).sort((a, b) => b.taken_at.localeCompare(a.taken_at))[0];
    try {
      await captureForTask(task, last ? { retakeOf: last.local_uuid } : undefined);
    } catch (e) {
      showCaptureError(e);
    }
  }

  return (
    <View style={styles.screen}>
      <Header title="Мои отчёты" queueCount={pending} online={online} source={schedule.data?.source} at={schedule.data?.at} />
      <Text style={styles.cap}>ФАКТ ВЫПОЛНЕННЫХ РАБОТ</Text>
      <SectionList
        sections={days.map((d) => ({ title: d.label, data: d.works }))}
        keyExtractor={(w, i) => w.task_id + i}
        contentContainerStyle={{ padding: theme.pad }}
        renderSectionHeader={({ section }) => <Text style={styles.day}>{section.title}</Text>}
        renderItem={({ item }) => <ReportRow work={item} onRetake={retake} />}
        ListEmptyComponent={<Text style={styles.empty}>Пока нет фото. Снимите работу на экране «Сегодня».</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  cap: { paddingHorizontal: theme.pad, paddingTop: 12, fontSize: 12, fontWeight: '700', color: theme.muted, letterSpacing: 0.6 },
  day: { fontSize: 15, fontWeight: '700', color: theme.ink, marginTop: 8, marginBottom: 8 },
  empty: { color: theme.muted, textAlign: 'center', marginTop: 24 },
});

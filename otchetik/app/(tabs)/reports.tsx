import { useMemo } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { Header } from '../../components/Header';
import { ReportRow } from '../../components/ReportRow';
import { showAlert, showCaptureError } from '../../components/alerts';
import { useSchedule, useShotStatuses } from '../../data/queries';
import { serverBase, useSettings } from '../../data/settings';
import { buildReport, taskState } from '../../lib/reports';
import { theme } from '../../lib/theme';
import { todayIso } from '../../lib/time';
import { captureForTask } from '../../queue/capture';
import { useMlEmpty } from '../../queue/mlResults';
import { useShownRecords } from '../../queue/useShownRecords';
import { useOnline } from './today';

export default function Reports() {
  const { settings } = useSettings();
  const online = useOnline();
  const date = todayIso();
  const schedule = useSchedule(settings?.objectId ?? null, settings?.brigadeId ?? null, date);
  const { shown, pending } = useShownRecords(schedule.data?.source === 'demo');

  const uploaded = useMemo(() => shown.filter((r) => r.status === 'uploaded').map((r) => r.local_uuid), [shown]);
  const statuses = useShotStatuses(uploaded);
  const byUuid = useMemo(() => Object.fromEntries((statuses.data?.data.shots ?? []).map((s) => [s.local_uuid, s])), [statuses.data]);
  const tasks = useMemo(() => Object.fromEntries((schedule.data?.data.tasks ?? []).map((t) => [t.task_id, t])), [schedule.data]);
  const mlEmpty = useMlEmpty();
  const serverSet = settings ? serverBase(settings) !== null : true;
  const days = useMemo(() => buildReport(shown, byUuid, tasks, new Date(), { serverSet, mlEmpty }), [shown, byUuid, tasks, serverSet, mlEmpty]);
  const sections = useMemo(() => days.map((d) => ({ title: d.label, data: d.works })), [days]);

  async function retake(task_id: string) {
    const task = tasks[task_id];
    if (!task) { showAlert('Работа не в сегодняшнем наряде', 'Снять можно с экрана «Сегодня»'); return; }
    // То же фото, что определяет статус на карточке «Сегодня».
    const { latestUuid } = taskState(shown, byUuid, task_id, { mlEmpty });
    try {
      await captureForTask(task, latestUuid ? { retakeOf: latestUuid } : undefined);
    } catch (e) {
      showCaptureError(e);
    }
  }

  return (
    <View style={styles.screen}>
      <Header title="Мои отчёты" queueCount={pending} online={online} source={schedule.data?.source} at={schedule.data?.at} problem={schedule.data?.problem} />
      <Text style={styles.cap}>ФАКТ ВЫПОЛНЕННЫХ РАБОТ</Text>
      <SectionList
        sections={sections}
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

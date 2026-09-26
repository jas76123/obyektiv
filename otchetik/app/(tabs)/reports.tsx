import { useMemo } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { Header } from '../../components/Header';
import { ReportRow } from '../../components/ReportRow';
import { showAlert, showCaptureError } from '../../components/alerts';
import { usePastSchedules, useSchedule, useShotStatuses } from '../../data/queries';
import { serverBase, useSettings } from '../../data/settings';
import { useTheme } from '../../data/theme';
import { buildReport, taskState } from '../../lib/reports';
import type { Theme } from '../../lib/theme';
import { todayIso } from '../../lib/time';
import { captureForTask } from '../../queue/capture';
import { useMlVerdicts } from '../../queue/mlResults';
import { useShownRecords } from '../../queue/useShownRecords';
import { useOnline } from './today';

export default function Reports() {
  const { settings } = useSettings();
  const online = useOnline();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const date = todayIso();
  const schedule = useSchedule(settings?.objectId ?? null, settings?.brigadeId ?? null, date);
  const { shown, pending } = useShownRecords(schedule.data?.source === 'demo');

  const uploaded = useMemo(() => shown.filter((r) => r.status === 'uploaded').map((r) => r.local_uuid), [shown]);
  const statuses = useShotStatuses(uploaded);
  const byUuid = useMemo(() => Object.fromEntries((statuses.data?.data.shots ?? []).map((s) => [s.local_uuid, s])), [statuses.data]);
  const tasks = useMemo(() => Object.fromEntries((schedule.data?.data.tasks ?? []).map((task) => [task.task_id, task])), [schedule.data]);
  const verdicts = useMlVerdicts();
  const serverSet = settings ? serverBase(settings) !== null : true;
  const pastSchedules = usePastSchedules(settings?.objectId ?? null, settings?.brigadeId ?? null, date, { source: schedule.data?.source, stamp: schedule.dataUpdatedAt });
  const days = useMemo(() => buildReport(shown, byUuid, tasks, new Date(), { serverSet, verdicts, pastSchedules }), [shown, byUuid, tasks, serverSet, verdicts, pastSchedules]);
  const sections = useMemo(() => days.map((d) => ({ title: d.label, data: d.works })), [days]);

  async function retake(task_id: string) {
    const task = tasks[task_id];
    if (!task) { showAlert('Работа не в сегодняшнем наряде', 'Снять можно с экрана «Сегодня»'); return; }
    // То же фото, что определяет статус на карточке «Сегодня».
    const { latestUuid } = taskState(shown, byUuid, task_id, { verdicts });
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
        contentContainerStyle={{ padding: t.pad }}
        renderSectionHeader={({ section }) => <Text style={styles.day}>{section.title}</Text>}
        renderItem={({ item }) => <ReportRow work={item} onRetake={retake} />}
        ListEmptyComponent={<Text style={styles.empty}>Пока нет фото. Снимите работу на экране «Сегодня».</Text>}
      />
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.bg },
  cap: { paddingHorizontal: t.pad, paddingTop: 12, fontSize: 12, fontWeight: '700', color: t.faint, letterSpacing: 0.6 },
  day: { fontSize: 15, fontWeight: '700', color: t.ink, marginTop: 8, marginBottom: 8 },
  empty: { color: t.muted, textAlign: 'center', marginTop: 24 },
});

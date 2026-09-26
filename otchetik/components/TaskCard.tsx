import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ScheduleTask } from '../contract/schemas';
import { useTheme } from '../data/theme';
import { photoWord, type PhotoVerdict, type ScreenStatus } from '../lib/status';
import type { Theme } from '../lib/theme';
import { captureForTask } from '../queue/capture';
import type { ShotRecord } from '../queue/types';
import { showCaptureError } from './alerts';
import { StatusChip } from './StatusChip';

export function TaskCard({ task, shots, state, serverSet, verdicts }: {
  task: ScheduleTask;
  shots: ShotRecord[];                                        // реальные фото этого наряда за сегодня, новые сверху
  state: { status: ScreenStatus; latestUuid: string | null }; // статус работы и uuid свежего фото (lib/reports.taskState)
  serverSet: boolean;                                         // адрес сервера задан
  verdicts: Record<string, PhotoVerdict>; // local_uuid → вердикт сверки (queue/mlResults.useMlVerdicts)
}) {
  const [busy, setBusy] = useState(false);
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const last = shots[0];
  const retake = state.status === 'retake';

  async function onPhoto() {
    setBusy(true);
    try {
      // «Переснять»: новое фото ссылается на то, которое вернули (retake_of).
      await captureForTask(task, retake && state.latestUuid ? { retakeOf: state.latestUuid } : undefined);
    } catch (e) {
      showCaptureError(e);
    } finally {
      setBusy(false);
    }
  }

  const label = retake ? 'Переснять' : 'Фото';
  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{task.name}</Text>
        <Text style={styles.meta}>{task.zone}{task.expected ? ` · ${task.expected}` : ''}</Text>
        <View style={styles.chipRow}><StatusChip status={state.status} /></View>
        <Text style={styles.count}>снято: {shots.length}{last ? ` · ${photoWord(last.status, verdicts[last.local_uuid] ?? null, { serverSet })}` : ''}</Text>
      </View>
      <Pressable onPress={onPhoto} disabled={busy} style={[styles.btn, busy && { opacity: 0.5 }]} accessibilityRole="button" accessibilityLabel={`${label}: ${task.name}`}>
        {busy ? <ActivityIndicator color={t.btnInk} /> : <Text style={styles.btnText}>{label}</Text>}
      </Pressable>
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.paper, borderWidth: 1, borderColor: t.line, borderRadius: t.radiusLg, padding: 14, marginBottom: 10 },
  name: { fontSize: 17, fontWeight: '700', color: t.ink },
  meta: { fontSize: 14, color: t.muted, marginTop: 2 },
  chipRow: { marginTop: 8 },
  count: { fontSize: 13, color: t.muted, marginTop: 6 },
  btn: { backgroundColor: t.btn, borderRadius: t.radius, paddingVertical: 14, paddingHorizontal: 20, minWidth: 88, alignItems: 'center' },
  btnText: { color: t.btnInk, fontSize: 16, fontWeight: '700' },
});

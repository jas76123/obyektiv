import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ScheduleTask } from '../contract/schemas';
import { showCaptureError } from '../lib/alerts';
import { photoChip, type AnyShotStatus } from '../lib/status';
import { theme } from '../lib/theme';
import { captureForTask } from '../queue/capture';
import type { ShotRecord } from '../queue/types';

export function TaskCard({ task, shots, serverStatus }: {
  task: ScheduleTask;
  shots: ShotRecord[];                      // фото этого наряда, новые сверху
  serverStatus?: (uuid: string) => string | undefined; // серверный статус по uuid, если известен
}) {
  const [busy, setBusy] = useState(false);
  const last = shots[0];
  const srv = last ? (serverStatus?.(last.local_uuid) as AnyShotStatus | undefined) : undefined;
  const lastWord = last ? photoChip(srv ?? last.status) : null;

  async function onPhoto() {
    setBusy(true);
    try {
      await captureForTask(task);
    } catch (e) {
      showCaptureError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{task.name}</Text>
        <Text style={styles.meta}>{task.zone}{task.expected ? ` · ${task.expected}` : ''}</Text>
        <Text style={styles.count}>снято: {shots.length}{lastWord ? ` · ${lastWord}` : ''}</Text>
      </View>
      <Pressable onPress={onPhoto} disabled={busy} style={[styles.btn, busy && { opacity: 0.5 }]} accessibilityRole="button" accessibilityLabel={`Фото: ${task.name}`}>
        {busy ? <ActivityIndicator color={theme.accentInk} /> : <Text style={styles.btnText}>Фото</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.paper, borderWidth: 1, borderColor: theme.line, borderRadius: theme.radius, padding: 14, marginBottom: 10 },
  name: { fontSize: 17, fontWeight: '700', color: theme.ink },
  meta: { fontSize: 14, color: theme.muted, marginTop: 2 },
  count: { fontSize: 13, color: theme.muted, marginTop: 6 },
  btn: { backgroundColor: theme.accent, borderRadius: theme.radius, paddingVertical: 14, paddingHorizontal: 20, minWidth: 88, alignItems: 'center' },
  btnText: { color: theme.accentInk, fontSize: 16, fontWeight: '700' },
});

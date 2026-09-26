import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../data/theme';
import type { ReportWork } from '../lib/reports';
import type { Theme } from '../lib/theme';
import { fmtTime } from '../lib/time';
import { photoUri } from '../queue/photoFile';
import { StatusChip } from './StatusChip';

export function ReportRow({ work, onRetake }: { work: ReportWork; onRetake: (task_id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [uris, setUris] = useState<Record<string, string>>({});
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  useEffect(() => {
    if (!open) return;
    Promise.all(work.photos.map(async (p) => [p.uuid, p.record ? await photoUri(p.record) : ''] as const))
      .then((pairs) => setUris(Object.fromEntries(pairs)))
      .catch(() => setUris({}));
  }, [open, work.photos]);

  return (
    <View style={styles.row}>
      <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{work.name}</Text>
            <Text style={styles.meta}>{work.zone}{work.time ? ` · ${fmtTime(work.time)}` : ''}{work.comment ? ` · ${work.comment}` : ''}</Text>
          </View>
          <StatusChip status={work.status} />
        </View>
      </Pressable>
      {work.status === 'retake' && (
        <Pressable onPress={() => onRetake(work.task_id)} style={styles.retake} accessibilityRole="button" accessibilityLabel={`Переснять: ${work.name}`}>
          <Text style={styles.retakeText}>Переснять</Text>
        </Pressable>
      )}
      {open && work.photos.map((p) => (
        <View key={p.uuid} style={styles.photo}>
          {uris[p.uuid] ? <Image source={{ uri: uris[p.uuid] }} style={styles.thumb} /> : <View style={[styles.thumb, { backgroundColor: t.surface2 }]} />}
          <Text style={styles.meta}>{fmtTime(p.taken_at)} · {p.word}</Text>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  row: { backgroundColor: t.paper, borderWidth: 1, borderColor: t.line, borderRadius: t.radiusLg, padding: 14, marginBottom: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 16, fontWeight: '700', color: t.ink },
  meta: { fontSize: 13, color: t.muted, marginTop: 2 },
  retake: { marginTop: 10, borderWidth: 1, borderColor: t.accent, borderRadius: t.radius, padding: 10, alignItems: 'center' },
  retakeText: { color: t.accentText, fontWeight: '700' },
  photo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  thumb: { width: 56, height: 56, borderRadius: 6 },
});

import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSettings } from '../data/settings';
import type { SourceTag } from '../data/source';
import { useTheme } from '../data/theme';
import type { Theme } from '../lib/theme';
import { fmtTime } from '../lib/time';

export function Header({ title, queueCount, online, source, at, problem }: {
  title: string; queueCount: number; online: boolean; source?: SourceTag; at?: string; problem?: string;
}) {
  const { settings } = useSettings();
  const router = useRouter();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.net}>{online ? 'онлайн' : 'нет сети, фото сохранены, отправятся позже'}</Text>
        <Text style={styles.queue}>в очереди: {queueCount}</Text>
        {source === 'demo' && <Text style={styles.demo}>демо</Text>}
        {source === 'cache' && <Text style={styles.demo}>{at ? `данные на ${fmtTime(at)}` : 'из кэша'}</Text>}
        {/* Без сети причина одна и уже названа слева; «сервер не отвечает» показываем только когда сеть есть. */}
        {problem && online && <Text style={styles.problem}>{problem}</Text>}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Pressable onPress={() => router.push('/login')} accessibilityRole="button" accessibilityLabel="Сменить бригаду">
        <Text style={styles.sub}>{settings?.objectName ?? ''}{settings?.brigadeName ? ` · ${settings.brigadeName}` : ''}</Text>
      </Pressable>
      {queueCount > 200 && (
        <View style={styles.warn}><Text style={styles.warnText}>в очереди много фото, подключите интернет</Text></View>
      )}
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  wrap: { paddingHorizontal: t.pad, paddingTop: 8, paddingBottom: 12, backgroundColor: t.paper, borderBottomWidth: 1, borderBottomColor: t.line },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  net: { fontSize: 12, color: t.muted },
  queue: { fontSize: 12, color: t.muted },
  demo: { fontSize: 12, color: t.warnInk, backgroundColor: t.warnBg, paddingHorizontal: 6, borderRadius: 6 },
  problem: { fontSize: 12, color: t.error },
  title: { fontSize: 24, fontWeight: '800', color: t.ink, marginTop: 6 },
  sub: { fontSize: 14, color: t.muted, marginTop: 2 },
  warn: { marginTop: 10, backgroundColor: t.warnBg, padding: 10, borderRadius: t.radius },
  warnText: { color: t.warnInk, fontSize: 14 },
});

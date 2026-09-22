import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSettings } from '../data/settings';
import type { SourceTag } from '../data/source';
import { fmtTime } from '../lib/time';
import { theme } from '../lib/theme';

export function Header({ title, queueCount, online, source, at }: {
  title: string; queueCount: number; online: boolean; source?: SourceTag; at?: string;
}) {
  const { settings } = useSettings();
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.net}>{online ? 'онлайн' : 'нет сети, фото сохранены, отправятся позже'}</Text>
        <Text style={styles.queue}>в очереди: {queueCount}</Text>
        {source === 'demo' && <Text style={styles.demo}>демо</Text>}
        {source === 'cache' && <Text style={styles.demo}>{at ? `данные на ${fmtTime(at)}` : 'из кэша'}</Text>}
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

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: theme.pad, paddingTop: 8, paddingBottom: 12, backgroundColor: theme.paper, borderBottomWidth: 1, borderBottomColor: theme.line },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  net: { fontSize: 12, color: theme.muted },
  queue: { fontSize: 12, color: theme.muted },
  demo: { fontSize: 12, color: theme.warnInk, backgroundColor: theme.warnBg, paddingHorizontal: 6, borderRadius: 4 },
  title: { fontSize: 24, fontWeight: '800', color: theme.ink, marginTop: 6 },
  sub: { fontSize: 14, color: theme.muted, marginTop: 2 },
  warn: { marginTop: 10, backgroundColor: theme.warnBg, padding: 10, borderRadius: theme.radius },
  warnText: { color: theme.warnInk, fontSize: 14 },
});

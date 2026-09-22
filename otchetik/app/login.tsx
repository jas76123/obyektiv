import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useObjects } from '../data/queries';
import { useSettings } from '../data/settings';
import { theme } from '../lib/theme';

export default function Login() {
  const { settings, save } = useSettings();
  const { data, isLoading, error } = useObjects();
  const router = useRouter();
  const [objectId, setObjectId] = useState<string | null>(settings?.objectId ?? null);
  const [brigadeId, setBrigadeId] = useState<string | null>(settings?.brigadeId ?? null);

  const objects = data?.data.objects ?? [];
  const object = objects.find((o) => o.id === objectId) ?? null;
  const brigade = object?.brigades.find((b) => b.id === brigadeId) ?? null;

  async function next() {
    if (!object || !brigade) return;
    await save({ objectId: object.id, objectName: object.name, brigadeId: brigade.id, brigadeName: brigade.name });
    router.replace('/(tabs)/today');
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: theme.pad, paddingTop: 48 }}>
      <Text style={styles.title}>Отчётик</Text>
      <Text style={styles.lead}>Выберите объект и бригаду. Это запомнится на телефоне.</Text>
      {data?.source === 'demo' && <Text style={styles.demo}>демо-данные</Text>}
      {isLoading && <Text style={styles.muted}>Загружаем…</Text>}
      {error && <Text style={styles.err}>{String((error as Error).message)}</Text>}

      <Text style={styles.h}>Объект</Text>
      {objects.map((o) => (
        <Pressable key={o.id} onPress={() => { setObjectId(o.id); setBrigadeId(null); }} style={[styles.opt, o.id === objectId && styles.optOn]} accessibilityRole="radio" accessibilityState={{ selected: o.id === objectId }}>
          <Text style={styles.optText}>{o.name}</Text>
        </Pressable>
      ))}

      {object && <Text style={styles.h}>Бригада</Text>}
      {object?.brigades.map((b) => (
        <Pressable key={b.id} onPress={() => setBrigadeId(b.id)} style={[styles.opt, b.id === brigadeId && styles.optOn]} accessibilityRole="radio" accessibilityState={{ selected: b.id === brigadeId }}>
          <Text style={styles.optText}>{b.name}{b.members ? ` · ${b.members} чел.` : ''}</Text>
        </Pressable>
      ))}

      <Pressable onPress={next} disabled={!brigade} style={[styles.btn, !brigade && styles.btnOff]} accessibilityRole="button">
        <Text style={styles.btnText}>Продолжить</Text>
      </Pressable>

      <Pressable onLongPress={() => router.push('/settings')} delayLongPress={800} style={{ marginTop: 40, alignSelf: 'center' }}>
        <Text style={styles.muted}>версия {Constants.expoConfig?.version ?? '0.1.0'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  title: { fontSize: 32, fontWeight: '800', color: theme.ink },
  lead: { fontSize: 15, color: theme.muted, marginTop: 6 },
  demo: { alignSelf: 'flex-start', marginTop: 8, fontSize: 12, color: theme.warnInk, backgroundColor: theme.warnBg, paddingHorizontal: 6, borderRadius: 4 },
  muted: { color: theme.muted, marginTop: 12 },
  err: { color: '#AC3529', marginTop: 12 },
  h: { fontSize: 13, fontWeight: '700', color: theme.muted, textTransform: 'uppercase', marginTop: 24, marginBottom: 8 },
  opt: { backgroundColor: theme.paper, borderWidth: 1, borderColor: theme.line, borderRadius: theme.radius, padding: 14, marginBottom: 8 },
  optOn: { borderColor: theme.accent, borderWidth: 2 },
  optText: { fontSize: 16, color: theme.ink },
  btn: { marginTop: 28, backgroundColor: theme.accent, borderRadius: theme.radius, padding: 16, alignItems: 'center' },
  btnOff: { opacity: 0.4 },
  btnText: { color: theme.accentInk, fontSize: 17, fontWeight: '700' },
});

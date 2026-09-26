import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useObjects } from '../data/queries';
import { useSettings } from '../data/settings';
import { useTheme } from '../data/theme';
import type { Theme } from '../lib/theme';

export default function Login() {
  const { settings, save } = useSettings();
  const { data, isLoading, error } = useObjects();
  const router = useRouter();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
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
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: t.pad, paddingTop: 48 }}>
      <Text style={styles.title}>Отчётик</Text>
      <Text style={styles.lead}>Выберите объект и бригаду. Это запомнится на телефоне.</Text>
      {data?.source === 'demo' && <Text style={styles.demo}>демо-данные</Text>}
      {isLoading && <Text style={styles.muted}>Загружаем…</Text>}
      {error && <Text style={styles.err}>{String((error as Error).message)}</Text>}
      {!isLoading && objects.length === 0 && <Text style={styles.muted}>Объектов нет. Проверьте адрес сервера в настройках.</Text>}

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

      <Pressable onPress={next} disabled={!brigade} style={[styles.btn, !brigade && styles.btnOff]} accessibilityRole="button" accessibilityState={{ disabled: !brigade }}>
        <Text style={styles.btnText}>Продолжить</Text>
      </Pressable>

      <Pressable onLongPress={() => router.push('/settings')} delayLongPress={800} style={{ marginTop: 40, alignSelf: 'center' }} accessibilityRole="button" accessibilityLabel="Настройки сервера">
        <Text style={styles.version}>версия {Constants.expoConfig?.version ?? '0.1.0'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.bg },
  title: { fontSize: 32, fontWeight: '800', color: t.ink },
  lead: { fontSize: 15, color: t.muted, marginTop: 6 },
  demo: { alignSelf: 'flex-start', marginTop: 8, fontSize: 12, color: t.warnInk, backgroundColor: t.warnBg, paddingHorizontal: 6, borderRadius: 6 },
  muted: { color: t.muted, marginTop: 12 },
  version: { color: t.faint, marginTop: 12 },
  err: { color: t.error, marginTop: 12 },
  h: { fontSize: 13, fontWeight: '700', color: t.faint, textTransform: 'uppercase', marginTop: 24, marginBottom: 8 },
  opt: { backgroundColor: t.paper, borderWidth: 1, borderColor: t.line, borderRadius: t.radiusLg, padding: 14, marginBottom: 8 },
  optOn: { borderColor: t.accent, borderWidth: 2 },
  optText: { fontSize: 16, color: t.ink },
  btn: { marginTop: 28, backgroundColor: t.btn, borderRadius: t.radius, padding: 16, alignItems: 'center' },
  btnOff: { opacity: 0.4 },
  btnText: { color: t.btnInk, fontSize: 17, fontWeight: '700' },
});

import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { showAlert } from '../components/alerts';
import { queryClient } from '../data/queryClient';
import { currentDefaultServerUrl, useSettings } from '../data/settings';
import { useTheme } from '../data/theme';
import type { Theme, ThemePref } from '../lib/theme';
import { useQueue } from '../queue/useQueue';

/** Три варианта темы; порядок и слова — спека 26.09 §3. */
const THEME_PREFS: { value: ThemePref; label: string }[] = [
  { value: 'auto', label: 'авто' },
  { value: 'light', label: 'светлая' },
  { value: 'dark', label: 'тёмная' },
];

export default function Settings() {
  const { settings, save } = useSettings();
  const { counts, pending, runNow } = useQueue();
  const router = useRouter();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  // Веб: react-native-web красит включённый бегунок в свой зелёный, если не задать activeThumbColor (в типах RN его нет)
  const switchColors = {
    trackColor: { false: t.lineStrong, true: t.accent },
    thumbColor: t.btnInk,
    ...(Platform.OS === 'web' ? ({ activeThumbColor: t.btnInk } as object) : {}),
  };
  const [url, setUrl] = useState('');
  // Зависим только от serverUrl, чтобы не сбрасывать введённый адрес при других изменениях в settings
  useEffect(() => { if (settings) setUrl(settings.serverUrl); }, [settings?.serverUrl]);
  if (!settings) return null;
  const fallback = currentDefaultServerUrl();

  async function apply() {
    const trimmed = url.trim();
    if (trimmed !== url) setUrl(trimmed);
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      showAlert('Не получилось', 'Адрес должен начинаться с http:// или https://');
      return;
    }
    try {
      await save({ serverUrl: trimmed });
      await queryClient.invalidateQueries();
      showAlert('Сохранено', trimmed ? `Сервер: ${trimmed}` : fallback ? `Адрес пустой: по умолчанию ${fallback}` : 'Адрес пустой: работаем на демо-данных');
    } catch (err) {
      showAlert('Не получилось', err instanceof Error ? err.message : 'Не удалось сохранить настройку');
    }
  }
  async function send() {
    try {
      const r = await runNow();
      showAlert('Прогон очереди', r.skipped ? 'Не запускался: нет адреса сервера или уже идёт' : `отправлено ${r.sent}, с ошибкой ${r.failed}`);
    } catch (err) {
      showAlert('Не получилось', err instanceof Error ? err.message : 'Не удалось отправить очередь');
    }
  }
  async function pickTheme(theme: ThemePref) {
    try {
      await save({ theme });
    } catch (err) {
      showAlert('Не получилось', err instanceof Error ? err.message : 'Не удалось сохранить настройку');
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: t.pad }}>
      <Text style={styles.h}>Адрес сервера</Text>
      <TextInput value={url} onChangeText={setUrl} placeholder="http://192.168.0.10:8000" placeholderTextColor={t.faint} autoCapitalize="none" autoCorrect={false} keyboardType="url" style={styles.input} />
      <Text style={styles.hint}>по умолчанию: {fallback || 'нет, демо-данные'}</Text>
      <Pressable onPress={apply} style={styles.btn}><Text style={styles.btnText}>Сохранить адрес</Text></Pressable>

      <View style={styles.rowBetween}>
        <Text style={styles.label}>Только демо-данные</Text>
        <Switch value={settings.demoOnly} {...switchColors} onValueChange={async (v) => { try { await save({ demoOnly: v }); await queryClient.invalidateQueries(); } catch (err) { showAlert('Не получилось', err instanceof Error ? err.message : 'Не удалось сохранить настройку'); } }} />
      </View>

      <View style={styles.rowBetween}>
        <Text style={styles.label}>Проверять фото нейросетью</Text>
        <Switch value={settings.mlCheck} {...switchColors} onValueChange={async (v) => { try { await save({ mlCheck: v }); } catch (err) { showAlert('Не получилось', err instanceof Error ? err.message : 'Не удалось сохранить настройку'); } }} />
      </View>

      <Text style={styles.h}>Тема</Text>
      <View style={styles.segments}>
        {THEME_PREFS.map((p) => (
          <Pressable key={p.value} onPress={() => pickTheme(p.value)} style={[styles.seg, settings.theme === p.value && styles.segOn]} accessibilityRole="radio" accessibilityState={{ selected: settings.theme === p.value }}>
            <Text style={styles.segText}>{p.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>авто — как в телефоне</Text>

      <Text style={styles.h}>Очередь</Text>
      <Text style={styles.label}>в очереди {pending}: ждут {counts.queued}, отправляются {counts.uploading}, с ошибкой {counts.failed}; отправлено {counts.uploaded}</Text>
      <Pressable onPress={send} style={styles.btn}><Text style={styles.btnText}>Отправить очередь сейчас</Text></Pressable>

      <Text style={styles.h}>Бригада</Text>
      <Text style={styles.label}>{settings.objectName ?? '—'} · {settings.brigadeName ?? '—'}</Text>
      <Pressable onPress={async () => { try { await save({ objectId: null, objectName: null, brigadeId: null, brigadeName: null }); router.replace('/login'); } catch (err) { showAlert('Не получилось', err instanceof Error ? err.message : 'Не удалось сохранить настройку'); } }} style={[styles.btn, styles.btnGhost]}>
        <Text style={[styles.btnText, styles.btnGhostText]}>Сбросить выбор бригады</Text>
      </Pressable>
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.bg },
  h: { fontSize: 13, fontWeight: '700', color: t.faint, textTransform: 'uppercase', marginTop: 20, marginBottom: 8 },
  input: { backgroundColor: t.paper, borderWidth: 1, borderColor: t.lineStrong, borderRadius: t.radius, padding: 12, fontSize: 16, color: t.ink },
  btn: { marginTop: 12, backgroundColor: t.btn, borderRadius: t.radius, padding: 14, alignItems: 'center' },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: t.accent },
  btnText: { color: t.btnInk, fontSize: 16, fontWeight: '700' },
  btnGhostText: { color: t.accentText },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  label: { fontSize: 15, color: t.ink },
  hint: { fontSize: 12, color: t.faint, marginTop: 6 },
  segments: { flexDirection: 'row', gap: 8 },
  seg: { flex: 1, borderWidth: 1, borderColor: t.lineStrong, borderRadius: t.radius, paddingVertical: 10, alignItems: 'center', backgroundColor: t.paper },
  segOn: { borderColor: t.accent, borderWidth: 2 },
  segText: { fontSize: 15, color: t.ink },
});

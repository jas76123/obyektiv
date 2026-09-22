import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { showAlert } from '../components/alerts';
import { queryClient } from '../data/queryClient';
import { useSettings } from '../data/settings';
import { theme } from '../lib/theme';
import { useQueue } from '../queue/useQueue';

export default function Settings() {
  const { settings, save } = useSettings();
  const { counts, pending, runNow } = useQueue();
  const router = useRouter();
  const [url, setUrl] = useState('');
  // Зависим только от serverUrl, чтобы не сбрасывать введённый адрес при других изменениях в settings
  useEffect(() => { if (settings) setUrl(settings.serverUrl); }, [settings?.serverUrl]);
  if (!settings) return null;

  async function apply() {
    try {
      await save({ serverUrl: url.trim() });
      await queryClient.invalidateQueries();
      showAlert('Сохранено', url.trim() ? `Сервер: ${url.trim()}` : 'Адрес пустой: работаем на демо-данных');
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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: theme.pad }}>
      <Text style={styles.h}>Адрес сервера</Text>
      <TextInput value={url} onChangeText={setUrl} placeholder="http://192.168.0.10:8000" autoCapitalize="none" autoCorrect={false} keyboardType="url" style={styles.input} />
      <Pressable onPress={apply} style={styles.btn}><Text style={styles.btnText}>Сохранить адрес</Text></Pressable>

      <View style={styles.rowBetween}>
        <Text style={styles.label}>Только демо-данные</Text>
        <Switch value={settings.demoOnly} onValueChange={async (v) => { try { await save({ demoOnly: v }); await queryClient.invalidateQueries(); } catch (err) { showAlert('Не получилось', err instanceof Error ? err.message : 'Не удалось сохранить настройку'); } }} />
      </View>

      <Text style={styles.h}>Очередь</Text>
      <Text style={styles.label}>в очереди {pending}: ждут {counts.queued}, отправляются {counts.uploading}, с ошибкой {counts.failed}; отправлено {counts.uploaded}</Text>
      <Pressable onPress={send} style={styles.btn}><Text style={styles.btnText}>Отправить очередь сейчас</Text></Pressable>

      <Text style={styles.h}>Бригада</Text>
      <Text style={styles.label}>{settings.objectName ?? '—'} · {settings.brigadeName ?? '—'}</Text>
      <Pressable onPress={async () => { try { await save({ objectId: null, objectName: null, brigadeId: null, brigadeName: null }); router.replace('/login'); } catch (err) { showAlert('Не получилось', err instanceof Error ? err.message : 'Не удалось сохранить настройку'); } }} style={[styles.btn, styles.btnGhost]}>
        <Text style={[styles.btnText, { color: theme.accent }]}>Сбросить выбор бригады</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  h: { fontSize: 13, fontWeight: '700', color: theme.muted, textTransform: 'uppercase', marginTop: 20, marginBottom: 8 },
  input: { backgroundColor: theme.paper, borderWidth: 1, borderColor: theme.line, borderRadius: theme.radius, padding: 12, fontSize: 16, color: theme.ink },
  btn: { marginTop: 12, backgroundColor: theme.accent, borderRadius: theme.radius, padding: 14, alignItems: 'center' },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.accent },
  btnText: { color: theme.accentInk, fontSize: 16, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  label: { fontSize: 15, color: theme.ink },
});

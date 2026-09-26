import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSettings } from '../data/settings';
import type { SourceTag } from '../data/source';
import { useTheme } from '../data/theme';
import { THEME_PREF_LABEL, nextThemePref, type Theme } from '../lib/theme';
import { fmtTime } from '../lib/time';
import { showAlert } from './alerts';

export function Header({ title, queueCount, online, source, at, problem }: {
  title: string; queueCount: number; online: boolean; source?: SourceTag; at?: string; problem?: string;
}) {
  const { settings, save } = useSettings();
  const router = useRouter();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const pref = settings?.theme ?? 'auto';

  // Кнопка темы в шапке (спека 26.09 §9): по кругу авто → светлая → тёмная.
  async function switchTheme() {
    try {
      await save({ theme: nextThemePref(pref) });
    } catch (err) {
      showAlert('Не получилось', err instanceof Error ? err.message : 'Не удалось сохранить настройку');
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.net}>{online ? 'онлайн' : 'нет сети, фото сохранены, отправятся позже'}</Text>
        <Text style={styles.queue}>в очереди: {queueCount}</Text>
        {source === 'demo' && <Text style={styles.demo}>демо</Text>}
        {source === 'cache' && <Text style={styles.demo}>{at ? `данные на ${fmtTime(at)}` : 'из кэша'}</Text>}
        {/* Без сети причина одна и уже названа слева; «сервер не отвечает» показываем только когда сеть есть. */}
        {problem && online && <Text style={styles.problem}>{problem}</Text>}
        <Pressable onPress={switchTheme} style={styles.theme} accessibilityRole="button" accessibilityLabel={`Тема: ${THEME_PREF_LABEL[pref]}. Нажмите, чтобы сменить`}>
          <Text style={styles.themeText}>тема: {THEME_PREF_LABEL[pref]}</Text>
        </Pressable>
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
  // flexWrap: длинное «нет сети…» и кнопка темы не должны выталкивать друг друга за экран
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  net: { fontSize: 12, color: t.muted },
  queue: { fontSize: 12, color: t.muted },
  demo: { fontSize: 12, color: t.warnInk, backgroundColor: t.warnBg, paddingHorizontal: 6, borderRadius: 6 },
  problem: { fontSize: 12, color: t.error },
  theme: { marginLeft: 'auto', borderWidth: 1, borderColor: t.line, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  themeText: { fontSize: 12, color: t.muted },
  title: { fontSize: 24, fontWeight: '800', color: t.ink, marginTop: 6 },
  sub: { fontSize: 14, color: t.muted, marginTop: 2 },
  warn: { marginTop: 10, backgroundColor: t.warnBg, padding: 10, borderRadius: t.radius },
  warnText: { color: t.warnInk, fontSize: 14 },
});

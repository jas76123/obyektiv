import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../data/theme';
import { SCREEN_LABEL, type ScreenStatus } from '../lib/status';

/** Слово обязательно, цвет вторичен: цвет берётся из темы (спека 26.09 §2). */
export function StatusChip({ status, label }: { status: ScreenStatus; label?: string }) {
  const color = useTheme().status[status];
  return (
    <View style={[styles.chip, { borderColor: color }]} accessibilityLabel={label ?? SCREEN_LABEL[status]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{label ?? SCREEN_LABEL[status]}</Text>
    </View>
  );
}

// Геометрия от темы не зависит — статичные стили.
const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
});

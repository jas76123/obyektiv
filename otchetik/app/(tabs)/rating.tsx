import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Header } from '../../components/Header';
import { StatusChip } from '../../components/StatusChip';
import { useLeaderboard } from '../../data/queries';
import { useSettings } from '../../data/settings';
import { foldStatus } from '../../lib/status';
import { theme } from '../../lib/theme';
import { useQueue } from '../../queue/useQueue';
import { useOnline } from './today';

// Ширины числовых колонок: «Принято», «Кач-во», «Баллы». Считалось для 360 px: 328 на ряд минус
// отступы 24, рамка 4 и четыре промежутка по 6 — названию остаётся ~108 px, «Бригада №1» (~92 px) помещается в одну строку.
const COL = { rank: 20, accepted: 56, quality: 48, points: 44 };

export default function Rating() {
  const { settings } = useSettings();
  const online = useOnline();
  const { pending } = useQueue();
  const lb = useLeaderboard(settings?.objectId ?? null);
  const brigades = [...(lb.data?.data.brigades ?? [])].sort((a, b) => a.rank - b.rank);
  const others = lb.data?.data.others ?? [];

  return (
    <View style={styles.screen}>
      <Header title="Соревнование бригад" queueCount={pending} online={online} source={lb.data?.source} at={lb.data?.at} problem={lb.data?.problem} />
      <FlatList
        data={brigades}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: theme.pad }}
        refreshControl={<RefreshControl refreshing={lb.isFetching} onRefresh={() => lb.refetch()} />}
        ListHeaderComponent={
          <View>
            <Text style={styles.cap}>ПРИНЯТЫЕ РАБОТЫ · БАЛЛЫ</Text>
            <View style={styles.headRow} accessibilityRole="header">
              <Text style={[styles.headCell, { width: COL.rank }]}>№</Text>
              <Text style={[styles.headCell, { flex: 1 }]}>Бригада</Text>
              <Text style={[styles.headCell, styles.num, { width: COL.accepted }]}>Принято</Text>
              <Text style={[styles.headCell, styles.num, { width: COL.quality }]}>Кач-во</Text>
              <Text style={[styles.headCell, styles.num, { width: COL.points }]}>Баллы</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const mine = item.id === settings?.brigadeId;
          return (
            <View style={[styles.row, mine && styles.mine]} accessibilityLabel={`${item.rank} место, ${item.name}${mine ? ', мы' : ''}: принято ${item.accepted}, качество ${item.quality}%, ${item.points} баллов`}>
              <Text style={[styles.rank, { width: COL.rank }]}>{item.rank}</Text>
              <View style={styles.nameCell}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                {mine && <View style={styles.me}><Text style={styles.meText}>мы</Text></View>}
              </View>
              <Text style={[styles.cell, styles.num, { width: COL.accepted }]}>{item.accepted}</Text>
              <Text style={[styles.cell, styles.num, { width: COL.quality }]}>{item.quality}%</Text>
              <Text style={[styles.points, styles.num, { width: COL.points }]}>{item.points}</Text>
            </View>
          );
        }}
        ListFooterComponent={
          <View>
            <Text style={[styles.cap, { marginTop: 20 }]}>ЧТО СДЕЛАЛИ ДРУГИЕ БРИГАДЫ</Text>
            {others.length === 0 && <Text style={styles.meta}>Пока нет принятых работ</Text>}
            {others.map((o, i) => (
              <View key={`${o.brigade}-${o.work}-${o.zone}-${i}`} style={styles.other}>
                <Text style={styles.meta}>{o.brigade} · {o.work} · {o.zone}</Text>
                <StatusChip status={foldStatus(o.status)} />
              </View>
            ))}
            <Text style={styles.note}>Без фото и личных данных: соревнование, а не слежка.</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.meta}>{lb.isLoading ? 'Загружаем…' : 'Рейтинга пока нет'}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  cap: { fontSize: 12, fontWeight: '700', color: theme.muted, letterSpacing: 0.6, marginBottom: 8 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 6 },
  headCell: { fontSize: 11, fontWeight: '700', color: theme.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
  num: { textAlign: 'right' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.paper, borderWidth: 1, borderColor: theme.line, borderRadius: theme.radius, paddingVertical: 12, paddingHorizontal: 12, marginBottom: 8 },
  mine: { borderColor: theme.accent, borderWidth: 2 },
  rank: { fontSize: 18, fontWeight: '800', color: theme.muted },
  nameCell: { flex: 1, alignItems: 'flex-start', gap: 4, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '700', color: theme.ink, flexShrink: 1 },
  me: { borderWidth: 1, borderColor: theme.accent, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  meText: { fontSize: 12, fontWeight: '700', color: theme.accent, textTransform: 'uppercase', letterSpacing: 0.3 },
  cell: { fontSize: 15, color: theme.ink },
  points: { fontSize: 18, fontWeight: '800', color: theme.ink },
  meta: { fontSize: 13, color: theme.muted, marginTop: 2 },
  other: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.line },
  note: { fontSize: 12, color: theme.muted, marginTop: 12 },
});

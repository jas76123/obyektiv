import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Header } from '../../components/Header';
import { StatusChip } from '../../components/StatusChip';
import { useLeaderboard } from '../../data/queries';
import { useSettings } from '../../data/settings';
import { foldStatus } from '../../lib/status';
import { theme } from '../../lib/theme';
import { useQueue } from '../../queue/useQueue';
import { useOnline } from './today';

export default function Rating() {
  const { settings } = useSettings();
  const online = useOnline();
  const { pending } = useQueue();
  const lb = useLeaderboard(settings?.objectId ?? null);
  const brigades = [...(lb.data?.data.brigades ?? [])].sort((a, b) => a.rank - b.rank);
  const others = lb.data?.data.others ?? [];

  return (
    <View style={styles.screen}>
      <Header title="Соревнование бригад" queueCount={pending} online={online} source={lb.data?.source} at={lb.data?.at} />
      <FlatList
        data={brigades}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: theme.pad }}
        refreshControl={<RefreshControl refreshing={lb.isFetching} onRefresh={() => lb.refetch()} />}
        ListHeaderComponent={<Text style={styles.cap}>ПРИНЯТЫЕ РАБОТЫ · БАЛЛЫ</Text>}
        renderItem={({ item }) => {
          const mine = item.id === settings?.brigadeId;
          return (
            <View style={[styles.row, mine && styles.mine]}>
              <Text style={styles.rank}>{item.rank}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}{mine ? ' (мы)' : ''}</Text>
                <Text style={styles.meta}>принято {item.accepted} · качество {item.quality}%</Text>
              </View>
              <Text style={styles.points}>{item.points}</Text>
            </View>
          );
        }}
        ListFooterComponent={
          <View>
            <Text style={[styles.cap, { marginTop: 20 }]}>ЧТО СДЕЛАЛИ ДРУГИЕ БРИГАДЫ</Text>
            {others.map((o, i) => (
              <View key={i} style={styles.other}>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.paper, borderWidth: 1, borderColor: theme.line, borderRadius: theme.radius, padding: 14, marginBottom: 8 },
  mine: { borderColor: theme.accent, borderWidth: 2 },
  rank: { width: 24, fontSize: 18, fontWeight: '800', color: theme.muted },
  name: { fontSize: 16, fontWeight: '700', color: theme.ink },
  meta: { fontSize: 13, color: theme.muted, marginTop: 2 },
  points: { fontSize: 22, fontWeight: '800', color: theme.ink },
  other: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.line },
  note: { fontSize: 12, color: theme.muted, marginTop: 12 },
});

import { Text, View } from 'react-native';
import { Header } from '../../components/Header';
import { theme } from '../../lib/theme';

export default function Rating() {
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Header title="Соревнование бригад" queueCount={0} online={true} />
      <Text style={{ padding: theme.pad, color: theme.muted }}>Таблица появится в задаче 8.</Text>
    </View>
  );
}

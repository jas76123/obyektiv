import { Text, View } from 'react-native';
import { Header } from '../../components/Header';
import { theme } from '../../lib/theme';

export default function Reports() {
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Header title="Мои отчёты" queueCount={0} online={true} />
      <Text style={{ padding: theme.pad, color: theme.muted }}>Лента появится в задаче 7.</Text>
    </View>
  );
}

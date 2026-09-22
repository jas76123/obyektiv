import { Text, View } from 'react-native';
import { Header } from '../../components/Header';
import { theme } from '../../lib/theme';

export default function Today() {
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Header title="Сегодня" queueCount={0} online={true} />
      <Text style={{ padding: theme.pad, color: theme.muted }}>Работы появятся в задаче 5.</Text>
    </View>
  );
}

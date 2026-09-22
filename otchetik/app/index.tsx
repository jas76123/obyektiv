import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useSettings } from '../data/settings';

export default function Index() {
  const { settings } = useSettings();
  if (!settings) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator /></View>;
  }
  return <Redirect href={settings.brigadeId ? '/(tabs)/today' : '/login'} />;
}

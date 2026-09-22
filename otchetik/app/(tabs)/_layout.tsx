import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';

function Icon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ fontSize: 18, color }}>{glyph}</Text>;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        // Панель вкладок не заезжает под нижнюю панель браузера и «безопасную зону» телефона
        tabBarStyle: { height: 56 + insets.bottom, paddingBottom: insets.bottom, paddingTop: 6 },
      }}>
      <Tabs.Screen name="today" options={{ title: 'Сегодня', tabBarIcon: ({ color }) => <Icon glyph="📷" color={color} /> }} />
      <Tabs.Screen name="reports" options={{ title: 'Отчёты', tabBarIcon: ({ color }) => <Icon glyph="📋" color={color} /> }} />
      <Tabs.Screen name="rating" options={{ title: 'Рейтинг', tabBarIcon: ({ color }) => <Icon glyph="🏆" color={color} /> }} />
    </Tabs>
  );
}

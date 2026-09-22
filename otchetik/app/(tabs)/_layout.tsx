import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { theme } from '../../lib/theme';

function Icon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ fontSize: 18, color }}>{glyph}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: theme.accent, tabBarInactiveTintColor: theme.muted, tabBarLabelStyle: { fontSize: 12, fontWeight: '600' } }}>
      <Tabs.Screen name="today" options={{ title: 'Сегодня', tabBarIcon: ({ color }) => <Icon glyph="📷" color={color} /> }} />
      <Tabs.Screen name="reports" options={{ title: 'Отчёты', tabBarIcon: ({ color }) => <Icon glyph="📋" color={color} /> }} />
      <Tabs.Screen name="rating" options={{ title: 'Рейтинг', tabBarIcon: ({ color }) => <Icon glyph="🏆" color={color} /> }} />
    </Tabs>
  );
}

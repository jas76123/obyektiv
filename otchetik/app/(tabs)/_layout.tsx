import { Tabs } from 'expo-router';
import { Platform, Text, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../data/theme';

function Icon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ fontSize: 18, color }}>{glyph}</Text>;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const t = useTheme();
  // В браузере телефона безопасная зона снизу равна нулю, а панель браузера прижата к вкладкам: даём запас
  const bottom = Math.max(insets.bottom, Platform.OS === 'web' ? 16 : 0);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.accentText,
        tabBarInactiveTintColor: t.faint,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        // Панель вкладок не заезжает под нижнюю панель браузера и «безопасную зону» телефона
        tabBarStyle: { height: 58 + bottom, paddingBottom: bottom, paddingTop: 6, backgroundColor: t.paper, borderTopColor: t.line },
      }}>
      <Tabs.Screen name="today" options={{ title: 'Сегодня', tabBarIcon: ({ color }) => <Icon glyph="📷" color={color} /> }} />
      <Tabs.Screen name="reports" options={{ title: 'Отчёты', tabBarIcon: ({ color }) => <Icon glyph="📋" color={color} /> }} />
      <Tabs.Screen name="rating" options={{ title: 'Рейтинг', tabBarIcon: ({ color }) => <Icon glyph="🏆" color={color} /> }} />
    </Tabs>
  );
}

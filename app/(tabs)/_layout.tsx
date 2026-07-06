import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const floatingBottom = Math.max(insets.bottom + 36, 56);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarShowLabel: true,
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: floatingBottom,
          height: 88,
          paddingBottom: 14,
          paddingTop: 12,
          borderTopWidth: 0,
          borderRadius: 24,
          backgroundColor: '#ffffff',
          shadowColor: '#0f172a',
          shadowOpacity: 0.14,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 16,
          overflow: 'visible',
        },
        tabBarItemStyle: {
          height: 62,
          paddingVertical: 2,
          justifyContent: 'center',
        },
        tabBarIconStyle: {
          marginTop: 2,
          marginBottom: 2,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '800',
          lineHeight: 12,
          marginTop: 0,
          marginBottom: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="two-week"
        options={{
          title: '2-Week',
          tabBarIcon: ({ color }) => <Ionicons name="grid-outline" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="master"
        options={{
          title: 'Master',
          tabBarIcon: ({ color }) => <Ionicons name="calendar-outline" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="trades"
        options={{
          title: 'Trades',
          tabBarIcon: ({ color }) => <Ionicons name="briefcase-outline" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="issue"
        options={{
          title: 'Issue',
          tabBarIcon: ({ color }) => <Ionicons name="send-outline" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="qa"
        options={{
          title: 'QA',
          tabBarIcon: ({ color }) => <Ionicons name="shield-checkmark-outline" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="exports"
        options={{
          title: 'Exports',
          tabBarIcon: ({ color }) => <Ionicons name="download-outline" color={color} size={22} />,
        }}
      />
      <Tabs.Screen name="plots" options={{ href: null }} />
      <Tabs.Screen name="more" options={{ href: null }} />
      <Tabs.Screen name="trades-nofix" options={{ href: null }} />
      <Tabs.Screen name="trades-simple" options={{ href: null }} />
    </Tabs>
  );
}

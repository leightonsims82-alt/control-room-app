import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { siteprogTheme } from '../../theme/siteprogTheme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: siteprogTheme.colors.blue,
        tabBarInactiveTintColor: '#98A2B3',
        tabBarShowLabel: true,
        tabBarStyle: {
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: Math.max(insets.bottom + 8, 12),
          height: 70,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopWidth: 0,
          borderRadius: 18,
          backgroundColor: '#ffffff',
          shadowColor: siteprogTheme.colors.navy,
          shadowOpacity: 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 18,
          overflow: 'visible',
        },
        tabBarItemStyle: {
          height: 54,
          paddingVertical: 2,
          justifyContent: 'center',
        },
        tabBarIconStyle: {
          marginTop: 1,
          marginBottom: 1,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '900',
          lineHeight: 11,
          marginTop: 0,
          marginBottom: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" color={color} size={21} />,
        }}
      />
      <Tabs.Screen
        name="two-week"
        options={{
          title: '2 Week',
          tabBarIcon: ({ color }) => <Ionicons name="grid-outline" color={color} size={21} />,
        }}
      />
      <Tabs.Screen
        name="master"
        options={{
          title: 'Master',
          tabBarIcon: ({ color }) => <Ionicons name="calendar-outline" color={color} size={21} />,
        }}
      />
      <Tabs.Screen
        name="trades"
        options={{
          title: 'Trades',
          tabBarIcon: ({ color }) => <Ionicons name="briefcase-outline" color={color} size={21} />,
        }}
      />
      <Tabs.Screen
        name="issue"
        options={{
          title: 'Issue',
          tabBarIcon: ({ color }) => <Ionicons name="send-outline" color={color} size={21} />,
        }}
      />
      <Tabs.Screen
        name="qa"
        options={{
          title: 'QA',
          tabBarIcon: ({ color }) => <Ionicons name="shield-checkmark-outline" color={color} size={21} />,
        }}
      />
      <Tabs.Screen
        name="exports"
        options={{
          title: 'Exports',
          tabBarIcon: ({ color }) => <Ionicons name="download-outline" color={color} size={21} />,
        }}
      />
      <Tabs.Screen name="walk" options={{ href: null }} />
      <Tabs.Screen name="dabs" options={{ href: null }} />
      <Tabs.Screen name="plots" options={{ href: null }} />
      <Tabs.Screen name="more" options={{ href: null }} />
    </Tabs>
  );
}

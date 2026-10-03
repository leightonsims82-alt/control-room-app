import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { siteprogTheme } from '../theme/siteprogTheme';
import { FloatingFeedbackButton } from './FloatingFeedbackButton';
import { MasterPlotManager } from './MasterPlotManager';

export function AppScreen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.brandBar}>
        <View style={styles.brandInner}>
          <View style={styles.brandLeft}>
            <View style={styles.brandIcon}>
              <Ionicons name="construct-outline" size={18} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.brandName}>SiteProg</Text>
              <Text style={styles.brandSub}>Programme Buddy</Text>
            </View>
          </View>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Site Sync</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 155 + insets.bottom }]}>
        <View style={styles.maxWidth}>{children}</View>
      </ScrollView>

      <FloatingFeedbackButton />
      {pathname === '/master' ? <MasterPlotManager /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: siteprogTheme.colors.page,
  },
  brandBar: {
    backgroundColor: siteprogTheme.colors.navy,
    borderBottomWidth: 1,
    borderBottomColor: siteprogTheme.colors.navySoft,
  },
  brandInner: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brandLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: siteprogTheme.colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { color: '#ffffff', fontSize: 15, fontWeight: '900', letterSpacing: 0.2 },
  brandSub: { color: '#AEB8D6', fontSize: 10, fontWeight: '700', marginTop: 1 },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#13254A',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#213A70',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  liveDot: { width: 7, height: 7, borderRadius: 999, backgroundColor: '#2DD4A3' },
  liveText: { color: '#D8E0F7', fontSize: 10, fontWeight: '900' },
  content: {
    padding: 18,
  },
  maxWidth: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    gap: 16,
  },
});

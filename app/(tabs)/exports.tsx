import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';

export default function ExportsScreen() {
  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="download-outline" size={28} color="#16a34a" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Exports</Text>
          <Text style={styles.subtitle}>A holding screen for Excel, PDF, wall chart and trade issue outputs.</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Coming next</Text>
        <Text style={styles.cardText}>This section will generate site-ready programme outputs once the dashboard, master programme and 2-week view are locked in.</Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  iconWrap: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, minWidth: 240 },
  title: { fontSize: 30, fontWeight: '900', color: '#0f172a' },
  subtitle: { marginTop: 6, fontSize: 15, color: '#64748b', lineHeight: 22 },
  card: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', padding: 20 },
  cardTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  cardText: { color: '#64748b', fontSize: 14, lineHeight: 21, marginTop: 6 },
});

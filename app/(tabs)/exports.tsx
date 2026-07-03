import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { useSitePlanner } from '../../data/sitePlannerStore';

const outputCards = [
  ['2-Week Lookahead', 'Trade-by-trade programme for the selected 10-day window', 'grid-outline'],
  ['Master Programme', 'Plot milestone view with stage numbers across programme weeks', 'calendar-outline'],
  ['Plot Breakdown', 'Full daily plot-by-plot activity grid', 'business-outline'],
  ['Trade Issue Sheet', 'Simple contractor issue list for weekly trade call-offs', 'briefcase-outline'],
  ['Wall Chart', 'Site office view for progress meetings and daily reviews', 'easel-outline'],
] as const;

export default function ExportsScreen() {
  const { sitePlots, siteSetup } = useSitePlanner();

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="download-outline" size={28} color="#16a34a" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Output preview</Text>
          <Text style={styles.title}>Exports</Text>
          <Text style={styles.subtitle}>A clear preview of the programme outputs we will generate next.</Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{siteSetup.siteName}</Text>
        <Text style={styles.summaryText}>{sitePlots.length} plot{sitePlots.length === 1 ? '' : 's'} ready for output</Text>
      </View>

      <View style={styles.grid}>
        {outputCards.map(([title, detail, icon]) => (
          <View key={title} style={styles.card}>
            <View style={styles.cardIcon}><Ionicons name={icon} size={24} color="#2563eb" /></View>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardText}>{detail}</Text>
            <View style={styles.statusPill}><Text style={styles.statusText}>Preview</Text></View>
          </View>
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  iconWrap: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, minWidth: 240 },
  eyebrow: { color: '#16a34a', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { fontSize: 32, fontWeight: '900', color: '#0f172a', marginTop: 4 },
  subtitle: { marginTop: 6, fontSize: 15, color: '#64748b', lineHeight: 22 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', padding: 18 },
  summaryTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  summaryText: { color: '#64748b', fontSize: 14, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { flex: 1, minWidth: 280, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, gap: 8 },
  cardIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  cardTitle: { color: '#0f172a', fontSize: 16, fontWeight: '900' },
  cardText: { color: '#64748b', fontSize: 13, lineHeight: 19 },
  statusPill: { alignSelf: 'flex-start', backgroundColor: '#f8fafc', borderRadius: 999, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 6, marginTop: 4 },
  statusText: { color: '#475569', fontSize: 11, fontWeight: '900' },
});

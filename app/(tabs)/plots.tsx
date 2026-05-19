import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { PlotCard } from '../../components/PlotCard';
import { SectionCard } from '../../components/SectionCard';
import { useProgrammeData } from '../../data/programmeStore';
import { getDelayedStages, getHeldPlots } from '../../utils/programmeLogic';

export default function PlotsScreen() {
  const { plotProgrammes, plotStages } = useProgrammeData();
  const heldPlots = getHeldPlots(plotProgrammes);
  const delayedStages = getDelayedStages(plotStages);

  return (
    <AppScreen>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Plots</Text>
          <Text style={styles.subtitle}>Live plot status, current stage and programme progress</Text>
        </View>
        <Link href="/plot/new" asChild>
          <Pressable style={styles.newPlotButton}>
            <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
            <Text style={styles.newPlotButtonText}>New Plot</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{plotProgrammes.length}</Text>
          <Text style={styles.summaryLabel}>Plots</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{plotProgrammes.length - heldPlots.length}</Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{heldPlots.length}</Text>
          <Text style={styles.summaryLabel}>On hold</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{delayedStages.length}</Text>
          <Text style={styles.summaryLabel}>Delayed stages</Text>
        </View>
      </View>

      <View style={styles.plotGrid}>
        {plotProgrammes.map((plot) => (
          <PlotCard key={plot.id} plot={plot} stages={plotStages} />
        ))}
      </View>

      <SectionCard title="Plot setup" subtitle="Create a new local plot programme from the default template">
        <Text style={styles.note}>Use New Plot to set up a plot, choose a house type and generate the first programme stages locally.</Text>
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14 },
  newPlotButton: { backgroundColor: '#2563eb', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', gap: 8, alignItems: 'center' },
  newPlotButtonText: { color: '#ffffff', fontWeight: '900', fontSize: 13 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryCard: { flex: 1, minWidth: 140, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 16 },
  summaryValue: { color: '#0f172a', fontSize: 26, fontWeight: '900' },
  summaryLabel: { color: '#64748b', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  plotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  note: { color: '#475569', lineHeight: 20 },
});

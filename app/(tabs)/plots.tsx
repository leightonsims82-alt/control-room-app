import { router } from 'expo-router';
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
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Plots</Text>
          <Text style={styles.subtitle}>Live plot status, current stage and programme progress</Text>
        </View>
        <Pressable style={styles.newButton} onPress={() => router.push('/plot/new')}>
          <Text style={styles.newButtonText}>+ New Plot</Text>
        </Pressable>
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

      <SectionCard title="Base44 parity" subtitle="Create plot flow now available">
        <Text style={styles.note}>Use New Plot to create a programme from phase, bedroom size, build type and forward or reverse scheduling.</Text>
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' },
  headerText: { gap: 4, flex: 1, minWidth: 220 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14 },
  newButton: { backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  newButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryCard: { flex: 1, minWidth: 140, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 16 },
  summaryValue: { color: '#0f172a', fontSize: 26, fontWeight: '900' },
  summaryLabel: { color: '#64748b', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  plotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  note: { color: '#475569', lineHeight: 20 },
});

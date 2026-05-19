import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { StageStatusPill } from '../../components/StageStatusPill';
import { plotProgrammes, plotStages } from '../../data/demoData';
import { getPlotProgress, getStagesForPlot } from '../../utils/programmeLogic';

export default function MasterProgrammeScreen() {
  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Master Programme</Text>
        <Text style={styles.subtitle}>Long-term plot progress and stage overview</Text>
      </View>

      {plotProgrammes.map((plot) => {
        const stages = getStagesForPlot(plot.id, plotStages);
        const progress = getPlotProgress(plot.id, plotStages);

        return (
          <SectionCard key={plot.id} title={plot.plotName} subtitle={`${plot.phase} · ${progress}% complete`}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            {plot.holdStatus === 'On hold' ? <Text style={styles.holdText}>On hold: {plot.holdReason}</Text> : null}
            {stages.map((stage) => (
              <View key={stage.id} style={styles.stageRow}>
                <View style={styles.stageMain}>
                  <Text style={styles.stageName}>{stage.stageName}</Text>
                  <Text style={styles.stageMeta}>{stage.trade} · {stage.startDate} to {stage.endDate}</Text>
                </View>
                <StageStatusPill status={stage.status} />
              </View>
            ))}
          </SectionCard>
        );
      })}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14 },
  progressTrack: { height: 10, backgroundColor: '#e2e8f0', borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#2563eb', borderRadius: 999 },
  holdText: { color: '#b91c1c', backgroundColor: '#fee2e2', padding: 10, borderRadius: 10, fontWeight: '700' },
  stageRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  stageMain: { flex: 1 },
  stageName: { color: '#0f172a', fontWeight: '800' },
  stageMeta: { color: '#64748b', fontSize: 12, marginTop: 3 },
});

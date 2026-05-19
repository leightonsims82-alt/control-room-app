import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { StageStatusPill } from '../../components/StageStatusPill';
import { houseTypes, plotProgrammes, plotStages } from '../../data/demoData';
import { getActiveStage, getPlotProgress, getStagesForPlot } from '../../utils/programmeLogic';

export default function PlotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plot = plotProgrammes.find((item) => item.id === id);

  if (!plot) {
    return (
      <AppScreen>
        <Text style={styles.title}>Plot not found</Text>
        <Link href="/(tabs)/plots" style={styles.backLink}>Back to plots</Link>
      </AppScreen>
    );
  }

  const stages = getStagesForPlot(plot.id, plotStages);
  const progress = getPlotProgress(plot.id, plotStages);
  const activeStage = getActiveStage(plot.id, plotStages);
  const houseType = houseTypes.find((item) => item.id === plot.houseTypeId);

  return (
    <AppScreen>
      <Link href="/(tabs)/plots" style={styles.backLink}>‹ Back to plots</Link>

      <View style={styles.hero}>
        <View>
          <Text style={styles.title}>{plot.plotName}</Text>
          <Text style={styles.subtitle}>{plot.phase} · {houseType?.name ?? 'House type pending'}</Text>
        </View>
        <View style={styles.progressCircle}>
          <Text style={styles.progressValue}>{progress}%</Text>
          <Text style={styles.progressLabel}>complete</Text>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <InfoTile icon="calendar-outline" label="Start" value={plot.startDate} />
        <InfoTile icon="flag-outline" label="End" value={plot.endDate} />
        <InfoTile icon="home-outline" label="Build" value={houseType?.buildType ?? 'Pending'} />
        <InfoTile icon="bed-outline" label="Size" value={houseType?.bedroomSize ?? 'Pending'} />
      </View>

      {plot.holdStatus === 'On hold' ? (
        <SectionCard title="Hold status" subtitle="This plot is currently paused">
          <Text style={styles.holdReason}>{plot.holdReason}</Text>
        </SectionCard>
      ) : null}

      <SectionCard title="Current Stage" subtitle="The live focus stage for this plot">
        <View style={styles.currentStageRow}>
          <View style={styles.currentIcon}>
            <Ionicons name="construct-outline" size={24} color="#2563eb" />
          </View>
          <View style={styles.currentMain}>
            <Text style={styles.currentTitle}>{activeStage?.stageName ?? 'No active stage'}</Text>
            <Text style={styles.currentText}>{activeStage?.trade ?? 'Trade pending'}</Text>
          </View>
          {activeStage ? <StageStatusPill status={activeStage.status} /> : null}
        </View>
      </SectionCard>

      <SectionCard title="Stage Timeline" subtitle="Programme stages imported from the current demo data">
        {stages.map((stage) => (
          <View key={stage.id} style={styles.stageRow}>
            <View style={styles.orderBadge}>
              <Text style={styles.orderText}>{stage.order}</Text>
            </View>
            <View style={styles.stageMain}>
              <Text style={styles.stageName}>{stage.stageName}</Text>
              <Text style={styles.stageMeta}>{stage.trade} · {stage.startDate} to {stage.endDate}</Text>
              {stage.delayDays > 0 ? <Text style={styles.delayText}>{stage.delayDays} day delay: {stage.delayReason}</Text> : null}
              {stage.inspectionStatus !== 'Not applicable' ? <Text style={styles.inspectionText}>Inspection: {stage.inspectionStatus}</Text> : null}
            </View>
            <StageStatusPill status={stage.status} />
          </View>
        ))}
      </SectionCard>
    </AppScreen>
  );
}

function InfoTile({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoTile}>
      <Ionicons name={icon} size={20} color="#2563eb" />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backLink: { color: '#2563eb', fontWeight: '900', fontSize: 14 },
  hero: { backgroundColor: '#0f172a', borderRadius: 24, padding: 24, flexDirection: 'row', justifyContent: 'space-between', gap: 20, alignItems: 'center' },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', marginTop: 4 },
  progressCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  progressValue: { color: '#2563eb', fontSize: 24, fontWeight: '900' },
  progressLabel: { color: '#64748b', fontSize: 11, fontWeight: '800' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  infoTile: { flex: 1, minWidth: 150, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, gap: 4 },
  infoLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  infoValue: { color: '#0f172a', fontWeight: '900' },
  holdReason: { color: '#991b1b', backgroundColor: '#fee2e2', borderRadius: 12, padding: 12, fontWeight: '800' },
  currentStageRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  currentIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  currentMain: { flex: 1 },
  currentTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  currentText: { color: '#64748b', marginTop: 3 },
  stageRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  orderBadge: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  orderText: { color: '#2563eb', fontWeight: '900' },
  stageMain: { flex: 1 },
  stageName: { color: '#0f172a', fontWeight: '900' },
  stageMeta: { color: '#64748b', fontSize: 12, marginTop: 3 },
  delayText: { color: '#c2410c', fontSize: 12, marginTop: 5, fontWeight: '800' },
  inspectionText: { color: '#2563eb', fontSize: 12, marginTop: 5, fontWeight: '800' },
});

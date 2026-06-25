import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { StageStatusPill } from '../../components/StageStatusPill';
import { getInspectionTemplateForStage } from '../../data/keyStageInspectionTemplates';
import { useProgrammeData } from '../../data/programmeStore';
import { getPlotProgress, getStagesForPlot } from '../../utils/programmeLogic';

export default function MasterProgrammeScreen() {
  const { plotProgrammes, plotStages, inspections, defects } = useProgrammeData();

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Master Programme</Text>
        <Text style={styles.subtitle}>Long-term plot progress, stage inspections and trade actions</Text>
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
            {stages.map((stage) => {
              const template = getInspectionTemplateForStage(stage.stageName);
              const inspection = inspections.find((item) => item.plotStageId === stage.id);
              const openActions = defects.filter((item) => item.plotStageId === stage.id && item.status !== 'Verified fixed').length;
              return (
                <View key={stage.id} style={styles.stageRow}>
                  <View style={styles.stageMain}>
                    <Text style={styles.stageName}>{stage.stageName}</Text>
                    <Text style={styles.stageMeta}>{stage.trade} · {stage.startDate} to {stage.endDate}</Text>
                    <Text style={styles.inspectionMeta}>Inspection: {inspection?.status ?? stage.inspectionStatus}</Text>
                    {openActions > 0 ? <Text style={styles.actionMeta}>{openActions} open trade action{openActions === 1 ? '' : 's'}</Text> : null}
                    {template ? (
                      <Link href={`/inspection/${stage.id}`} asChild>
                        <Pressable style={styles.inspectButton}>
                          <Text style={styles.inspectButtonText}>{inspection ? 'Open Checklist' : 'Start Checklist'} · {template.keyStageName}</Text>
                        </Pressable>
                      </Link>
                    ) : null}
                  </View>
                  <StageStatusPill status={stage.status} />
                </View>
              );
            })}
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
  stageRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  stageMain: { flex: 1, gap: 6 },
  stageName: { color: '#0f172a', fontWeight: '800' },
  stageMeta: { color: '#64748b', fontSize: 12 },
  inspectionMeta: { color: '#2563eb', fontSize: 12, fontWeight: '800' },
  actionMeta: { color: '#dc2626', fontSize: 12, fontWeight: '900' },
  inspectButton: { alignSelf: 'flex-start', backgroundColor: '#0f172a', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  inspectButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
});

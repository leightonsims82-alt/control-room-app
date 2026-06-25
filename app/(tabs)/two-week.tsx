import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { StageStatusPill } from '../../components/StageStatusPill';
import { useProgrammeData } from '../../data/programmeStore';
import { getInspectionTemplateForStage } from '../../utils/inspectionTemplateResolver';

export default function TwoWeekProgrammeScreen() {
  const { plotProgrammes, plotStages, inspections, defects } = useProgrammeData();
  const visibleStages = plotStages
    .slice()
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 14);

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>2-Week Programme</Text>
        <Text style={styles.subtitle}>Short-term site focus by plot, stage, trade and inspection</Text>
      </View>

      <SectionCard title="Next priority stages" subtitle="Tap a checklist when a stage is ready to inspect">
        {visibleStages.map((stage) => {
          const plot = plotProgrammes.find((item) => item.id === stage.plotProgrammeId);
          const template = getInspectionTemplateForStage(stage.stageName);
          const inspection = inspections.find((item) => item.plotStageId === stage.id);
          const openActions = defects.filter((item) => item.plotStageId === stage.id && item.status !== 'Verified fixed').length;
          return (
            <View key={stage.id} style={styles.row}>
              <View style={styles.dateBox}>
                <Text style={styles.dateMonth}>{stage.startDate.slice(5, 7)}</Text>
                <Text style={styles.dateDay}>{stage.startDate.slice(8, 10)}</Text>
              </View>
              <View style={styles.main}>
                <Text style={styles.plot}>{plot?.plotName ?? 'Plot'}</Text>
                <Text style={styles.stage}>{stage.stageName}</Text>
                <Text style={styles.meta}>{stage.trade} · {stage.durationDays} working days</Text>
                <Text style={styles.inspection}>Inspection: {inspection?.status ?? stage.inspectionStatus}</Text>
                {openActions > 0 ? <Text style={styles.actions}>{openActions} open trade action{openActions === 1 ? '' : 's'}</Text> : null}
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
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  dateBox: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  dateMonth: { color: '#2563eb', fontSize: 11, fontWeight: '900' },
  dateDay: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  main: { flex: 1, gap: 4 },
  plot: { color: '#2563eb', fontWeight: '900', fontSize: 12 },
  stage: { color: '#0f172a', fontWeight: '800' },
  meta: { color: '#64748b', fontSize: 12 },
  inspection: { color: '#2563eb', fontSize: 12, fontWeight: '800' },
  actions: { color: '#dc2626', fontSize: 12, fontWeight: '900' },
  inspectButton: { alignSelf: 'flex-start', backgroundColor: '#0f172a', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, marginTop: 4 },
  inspectButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
});

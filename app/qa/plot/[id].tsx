import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../../components/AppScreen';
import { QAStatusPill } from '../../../components/qa/QAUI';
import { SectionCard } from '../../../components/SectionCard';
import { useQAData } from '../../../data/qaStore';
import { useSitePlanner } from '../../../data/sitePlannerStore';

export default function PlotQAStoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { sitePlots, plotTemplates } = useSitePlanner();
  const { inspections, actions, startReinspection } = useQAData();
  const plot = sitePlots.find((item) => item.id === id);
  const template = plotTemplates.find((item) => item.id === plot?.templateId);
  const plotInspections = inspections.filter((item) => item.plotId === id).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const plotActions = actions.filter((item) => item.plotId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const openActions = plotActions.filter((item) => item.status !== 'Verified fixed');
  const passed = plotInspections.filter((item) => item.status === 'Passed').length;
  const failed = plotInspections.filter((item) => item.status === 'Failed').length;

  if (!plot) {
    return (
      <AppScreen>
        <Pressable onPress={() => router.replace('/qa')} style={styles.backButton}><Text style={styles.backButtonText}>‹ Back to QA</Text></Pressable>
        <Text style={styles.title}>Plot story not found</Text>
      </AppScreen>
    );
  }

  const recheck = async (inspectionId: string) => {
    const next = await startReinspection(inspectionId);
    if (next) router.push(`/qa/inspection/${next.id}`);
  };

  return (
    <AppScreen>
      <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backButtonText}>‹ Back</Text></Pressable>

      <View style={styles.hero}>
        <View style={styles.heroIcon}><Ionicons name="home-outline" size={30} color="#2563eb" /></View>
        <View style={styles.heroMain}><Text style={styles.kicker}>Permanent quality record</Text><Text style={styles.title}>Plot {plot.plotNo} QA Story</Text><Text style={styles.subtitle}>{template?.name || 'Plot template'} · Every inspection, failure, action and recheck remains in this timeline.</Text></View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.stat}><Text style={styles.statValue}>{plotInspections.length}</Text><Text style={styles.statLabel}>Inspections</Text></View>
        <View style={styles.stat}><Text style={[styles.statValue, { color: '#16a34a' }]}>{passed}</Text><Text style={styles.statLabel}>Passed</Text></View>
        <View style={styles.stat}><Text style={[styles.statValue, { color: '#dc2626' }]}>{failed}</Text><Text style={styles.statLabel}>Failed</Text></View>
        <View style={styles.stat}><Text style={[styles.statValue, { color: '#d97706' }]}>{openActions.length}</Text><Text style={styles.statLabel}>Open actions</Text></View>
      </View>

      <SectionCard title="Inspection timeline" subtitle="Reinspections create new entries. Original failures and evidence are never overwritten.">
        {plotInspections.length === 0 ? <Text style={styles.emptyText}>No inspections have been started for this plot.</Text> : null}
        {plotInspections.map((inspection, index) => {
          const linkedActions = plotActions.filter((action) => action.inspectionId === inspection.id);
          return (
            <View key={inspection.id} style={styles.timelineRow}>
              <View style={styles.timelineRail}>
                <View style={[styles.timelineDot, inspection.status === 'Passed' ? styles.timelineDotPassed : inspection.status === 'Failed' ? styles.timelineDotFailed : styles.timelineDotPending]} />
                {index < plotInspections.length - 1 ? <View style={styles.timelineLine} /> : null}
              </View>
              <View style={styles.timelineCard}>
                <View style={styles.timelineHeader}>
                  <View style={styles.timelineTitleWrap}><Text style={styles.timelineTitle}>{inspection.activityName}</Text><Text style={styles.timelineMeta}>Inspection {inspection.sequence} · Stage {inspection.stage} · {new Date(inspection.startedAt).toLocaleString('en-GB')}</Text></View>
                  <QAStatusPill status={inspection.status} />
                </View>
                {inspection.reinspectionOfId ? <View style={styles.recheckPill}><Ionicons name="refresh-outline" size={13} color="#7c3aed" /><Text style={styles.recheckPillText}>Reinspection</Text></View> : null}
                {inspection.inspectorName ? <Text style={styles.detailText}>Inspector: {inspection.inspectorName}</Text> : null}
                {inspection.generalNotes ? <Text style={styles.notes}>{inspection.generalNotes}</Text> : null}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryText}>{inspection.items.filter((item) => item.answer === 'Yes').length} passed</Text>
                  <Text style={[styles.summaryText, { color: '#dc2626' }]}>{inspection.items.filter((item) => item.answer === 'No').length} failed</Text>
                  <Text style={styles.summaryText}>{linkedActions.length} action{linkedActions.length === 1 ? '' : 's'}</Text>
                </View>
                <View style={styles.buttonRow}>
                  <Pressable onPress={() => router.push(`/qa/inspection/${inspection.id}`)} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Open record</Text></Pressable>
                  {inspection.status !== 'Passed' && inspection.completedAt ? <Pressable onPress={() => recheck(inspection.id)} style={styles.secondaryButton}><Ionicons name="refresh-outline" size={16} color="#7c3aed" /><Text style={styles.secondaryButtonText}>Start recheck</Text></Pressable> : null}
                </View>
              </View>
            </View>
          );
        })}
      </SectionCard>

      <SectionCard title="Trade action history" subtitle="Open and closed actions generated by failed checklist items.">
        {plotActions.length === 0 ? <Text style={styles.emptyText}>No QA actions have been raised for this plot.</Text> : null}
        {plotActions.map((action) => (
          <Pressable key={action.id} onPress={() => router.push(`/qa/action/${action.id}`)} style={styles.actionRow}>
            <View style={styles.actionIcon}><Ionicons name={action.status === 'Verified fixed' ? 'checkmark-circle-outline' : 'construct-outline'} size={21} color={action.status === 'Verified fixed' ? '#16a34a' : '#dc2626'} /></View>
            <View style={styles.actionMain}><Text style={styles.actionTitle}>{action.trade} · {action.activityCode}</Text><Text style={styles.actionDescription} numberOfLines={2}>{action.requiredAction}</Text><Text style={styles.actionMeta}>Raised {new Date(action.createdAt).toLocaleString('en-GB')}</Text></View>
            <QAStatusPill status={action.status} />
          </Pressable>
        ))}
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  backButton: { alignSelf: 'flex-start', paddingVertical: 7 },
  backButtonText: { color: '#2563eb', fontWeight: '900', fontSize: 14 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 15, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 22, padding: 20, flexWrap: 'wrap' },
  heroIcon: { width: 62, height: 62, borderRadius: 20, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  heroMain: { flex: 1, minWidth: 240 },
  kicker: { color: '#2563eb', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#0f172a', fontSize: 29, fontWeight: '900', marginTop: 3 },
  subtitle: { color: '#64748b', fontSize: 13, lineHeight: 19, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flex: 1, minWidth: 130, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 14 },
  statValue: { color: '#0f172a', fontSize: 24, fontWeight: '900' },
  statLabel: { color: '#64748b', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginTop: 2 },
  emptyText: { color: '#64748b', fontWeight: '800', paddingVertical: 8 },
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineRail: { width: 18, alignItems: 'center' },
  timelineDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: '#ffffff' },
  timelineDotPassed: { backgroundColor: '#16a34a' },
  timelineDotFailed: { backgroundColor: '#dc2626' },
  timelineDotPending: { backgroundColor: '#f59e0b' },
  timelineLine: { width: 2, flex: 1, minHeight: 120, backgroundColor: '#e2e8f0', marginTop: 3 },
  timelineCard: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 17, backgroundColor: '#ffffff', padding: 15, gap: 10, marginBottom: 4 },
  timelineHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  timelineTitleWrap: { flex: 1, minWidth: 180 },
  timelineTitle: { color: '#0f172a', fontSize: 16, fontWeight: '900' },
  timelineMeta: { color: '#64748b', fontSize: 11, fontWeight: '700', marginTop: 3 },
  recheckPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f3e8ff', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  recheckPillText: { color: '#7c3aed', fontSize: 10, fontWeight: '900' },
  detailText: { color: '#475569', fontSize: 12, fontWeight: '700' },
  notes: { color: '#475569', fontSize: 13, lineHeight: 19, backgroundColor: '#f8fafc', borderRadius: 11, padding: 10 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryText: { color: '#64748b', fontSize: 11, fontWeight: '900' },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primaryButton: { backgroundColor: '#0f172a', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  primaryButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#ddd6fe', backgroundColor: '#faf5ff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  secondaryButtonText: { color: '#7c3aed', fontSize: 12, fontWeight: '900' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 11, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  actionIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  actionMain: { flex: 1, minWidth: 180 },
  actionTitle: { color: '#0f172a', fontWeight: '900' },
  actionDescription: { color: '#475569', fontSize: 12, fontWeight: '700', marginTop: 2 },
  actionMeta: { color: '#94a3b8', fontSize: 10, fontWeight: '700', marginTop: 3 },
});

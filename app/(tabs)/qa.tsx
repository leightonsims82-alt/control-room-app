import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { QAStatCard, QAStatusPill } from '../../components/qa/QAUI';
import { SectionCard } from '../../components/SectionCard';
import { isQualityGatewayActivity } from '../../data/qaTemplates';
import { useQAData } from '../../data/qaStore';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { QAInspectionStatus } from '../../types/qa';
import { getTemplateForPlot, orderedActivities, TemplateActivity, TemplateSitePlot } from '../../utils/templateProgramme';

const FILTERS = ['All', 'Due', 'Failed', 'Incomplete', 'Passed'] as const;
type DashboardFilter = typeof FILTERS[number];

type Gateway = {
  key: string;
  plot: TemplateSitePlot;
  templateId: string;
  activity: TemplateActivity;
  latestStatus?: QAInspectionStatus;
  latestInspectionId?: string;
};

export default function QAScreen() {
  const router = useRouter();
  const { sitePlots, plotTemplates, isSitePlannerLoaded } = useSitePlanner();
  const { inspections, actions, isQALoaded, startInspection } = useQAData();
  const [filter, setFilter] = useState<DashboardFilter>('All');
  const [selectedPlotId, setSelectedPlotId] = useState<string>('all');
  const [startingKey, setStartingKey] = useState('');

  const gateways = useMemo<Gateway[]>(() => sitePlots.flatMap((plot) => {
    const template = getTemplateForPlot(plot, plotTemplates);
    return orderedActivities(template)
      .filter(isQualityGatewayActivity)
      .map((activity) => {
        const plotInspections = inspections
          .filter((inspection) => inspection.plotId === plot.id && inspection.activityCode === activity.code)
          .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
        const latest = plotInspections[0];
        return {
          key: `${plot.id}-${activity.code}`,
          plot,
          templateId: template.id,
          activity,
          latestStatus: latest?.status,
          latestInspectionId: latest?.id,
        };
      });
  }), [sitePlots, plotTemplates, inspections]);

  const filteredGateways = gateways.filter((gateway) => {
    if (selectedPlotId !== 'all' && gateway.plot.id !== selectedPlotId) return false;
    if (filter === 'All') return true;
    if (filter === 'Due') return !gateway.latestStatus || gateway.latestStatus === 'Draft';
    return gateway.latestStatus === filter;
  });

  const failedInspections = inspections.filter((inspection) => inspection.status === 'Failed');
  const incompleteInspections = inspections.filter((inspection) => inspection.status === 'Incomplete' || inspection.status === 'Draft');
  const passedInspections = inspections.filter((inspection) => inspection.status === 'Passed');
  const openActions = actions.filter((action) => action.status !== 'Verified fixed');
  const recentInspections = inspections.slice().sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 6);

  const openGateway = async (gateway: Gateway) => {
    if (gateway.latestInspectionId && gateway.latestStatus !== 'Passed' && gateway.latestStatus !== 'Failed' && gateway.latestStatus !== 'Incomplete') {
      router.push(`/qa/inspection/${gateway.latestInspectionId}`);
      return;
    }
    if (gateway.latestInspectionId && gateway.latestStatus) {
      router.push(`/qa/inspection/${gateway.latestInspectionId}`);
      return;
    }
    setStartingKey(gateway.key);
    try {
      const inspection = await startInspection({
        plotId: gateway.plot.id,
        plotNo: gateway.plot.plotNo,
        templateId: gateway.templateId,
        activityCode: gateway.activity.code,
        activityName: gateway.activity.displayText || gateway.activity.code,
        stage: gateway.activity.stage,
        trade: gateway.activity.trade,
      });
      router.push(`/qa/inspection/${inspection.id}`);
    } finally {
      setStartingKey('');
    }
  };

  if (!isSitePlannerLoaded || !isQALoaded) {
    return (
      <AppScreen>
        <View style={styles.loadingCard}><Text style={styles.loadingText}>Loading QA control room…</Text></View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.iconWrap}><Ionicons name="shield-checkmark-outline" size={29} color="#7c3aed" /></View>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Quality control</Text>
          <Text style={styles.title}>QA / Plot Story</Text>
          <Text style={styles.subtitle}>Inspection gateways, failed actions, rechecks and permanent plot-by-plot quality history.</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <QAStatCard icon="clipboard-outline" label="Due" value={gateways.filter((gateway) => !gateway.latestStatus || gateway.latestStatus === 'Draft').length} helper="Not yet completed" tone="blue" />
        <QAStatCard icon="alert-circle-outline" label="Failed" value={failedInspections.length} helper="Recheck required" tone="red" />
        <QAStatCard icon="warning-outline" label="Open actions" value={openActions.length} helper="Trade close-out pending" tone="amber" />
        <QAStatCard icon="checkmark-circle-outline" label="Passed" value={passedInspections.length} helper="Inspection records" tone="green" />
      </View>

      <SectionCard title="Inspection control" subtitle="Filter the programme quality gateways, then open or start the inspection.">
        <View style={styles.filterRow}>
          {FILTERS.map((item) => (
            <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filterChip, filter === item ? styles.filterChipActive : null]}>
              <Text style={[styles.filterText, filter === item ? styles.filterTextActive : null]}>{item}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.plotFilterRow}>
          <Pressable onPress={() => setSelectedPlotId('all')} style={[styles.plotChip, selectedPlotId === 'all' ? styles.plotChipActive : null]}><Text style={[styles.plotChipText, selectedPlotId === 'all' ? styles.plotChipTextActive : null]}>All plots</Text></Pressable>
          {sitePlots.map((plot) => (
            <Pressable key={plot.id} onPress={() => setSelectedPlotId(plot.id)} style={[styles.plotChip, selectedPlotId === plot.id ? styles.plotChipActive : null]}>
              <Text style={[styles.plotChipText, selectedPlotId === plot.id ? styles.plotChipTextActive : null]}>Plot {plot.plotNo}</Text>
            </Pressable>
          ))}
        </View>

        {filteredGateways.length === 0 ? <Text style={styles.emptyText}>No inspection gateways match the current filters.</Text> : null}
        {filteredGateways.map((gateway) => {
          const buttonLabel = gateway.latestInspectionId ? 'Open inspection' : 'Start inspection';
          return (
            <View key={gateway.key} style={styles.gatewayRow}>
              <View style={[styles.gatewayStage, { backgroundColor: gateway.latestStatus === 'Passed' ? '#dcfce7' : gateway.latestStatus === 'Failed' ? '#fee2e2' : '#eff6ff' }]}>
                <Text style={styles.gatewayStageNumber}>{gateway.activity.stage}</Text>
                <Text style={styles.gatewayStageLabel}>Stage</Text>
              </View>
              <View style={styles.gatewayMain}>
                <View style={styles.gatewayTitleRow}>
                  <View style={styles.gatewayTitleText}><Text style={styles.gatewayTitle}>Plot {gateway.plot.plotNo} · {gateway.activity.code}</Text><Text style={styles.gatewayMeta}>{gateway.activity.displayText} · {gateway.activity.trade}</Text></View>
                  {gateway.latestStatus ? <QAStatusPill status={gateway.latestStatus} /> : <View style={styles.notStartedPill}><Text style={styles.notStartedText}>Not started</Text></View>}
                </View>
                <View style={styles.gatewayActions}>
                  <Pressable disabled={startingKey === gateway.key} onPress={() => openGateway(gateway)} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{startingKey === gateway.key ? 'Opening…' : buttonLabel}</Text></Pressable>
                  <Pressable onPress={() => router.push(`/qa/plot/${gateway.plot.id}`)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Plot story</Text></Pressable>
                </View>
              </View>
            </View>
          );
        })}
      </SectionCard>

      <SectionCard title="Open trade actions" subtitle="Failed checks remain here until evidence is reviewed and the item is verified fixed.">
        {openActions.length === 0 ? <Text style={styles.emptyText}>No open QA actions.</Text> : null}
        {openActions.slice(0, 8).map((action) => (
          <Pressable key={action.id} onPress={() => router.push(`/qa/action/${action.id}`)} style={styles.actionRow}>
            <View style={styles.actionIcon}><Ionicons name="construct-outline" size={20} color="#dc2626" /></View>
            <View style={styles.actionMain}><Text style={styles.actionTitle}>Plot {action.plotNo} · {action.trade}</Text><Text style={styles.actionDescription} numberOfLines={2}>{action.requiredAction}</Text><Text style={styles.actionMeta}>{action.activityCode} · {new Date(action.createdAt).toLocaleDateString('en-GB')}</Text></View>
            <QAStatusPill status={action.status} />
          </Pressable>
        ))}
      </SectionCard>

      <SectionCard title="Recent inspections" subtitle={`${incompleteInspections.length} incomplete or draft inspection${incompleteInspections.length === 1 ? '' : 's'} currently require attention.`}>
        {recentInspections.length === 0 ? <Text style={styles.emptyText}>No inspections have been started yet.</Text> : null}
        {recentInspections.map((inspection) => (
          <Pressable key={inspection.id} onPress={() => router.push(`/qa/inspection/${inspection.id}`)} style={styles.recentRow}>
            <View style={styles.recentMain}><Text style={styles.recentTitle}>Plot {inspection.plotNo} · {inspection.activityName}</Text><Text style={styles.recentMeta}>Inspection {inspection.sequence} · {new Date(inspection.startedAt).toLocaleString('en-GB')}</Text></View>
            <QAStatusPill status={inspection.status} />
          </Pressable>
        ))}
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  iconWrap: { width: 60, height: 60, borderRadius: 19, backgroundColor: '#f3e8ff', alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, minWidth: 250 },
  kicker: { color: '#7c3aed', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 31, fontWeight: '900', color: '#0f172a', marginTop: 2 },
  subtitle: { marginTop: 6, fontSize: 15, color: '#64748b', lineHeight: 22 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, backgroundColor: '#ffffff', paddingHorizontal: 13, paddingVertical: 8 },
  filterChipActive: { borderColor: '#0f172a', backgroundColor: '#0f172a' },
  filterText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  filterTextActive: { color: '#ffffff' },
  plotFilterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  plotChip: { borderRadius: 999, backgroundColor: '#f1f5f9', paddingHorizontal: 11, paddingVertical: 7 },
  plotChipActive: { backgroundColor: '#dbeafe' },
  plotChipText: { color: '#64748b', fontSize: 11, fontWeight: '900' },
  plotChipTextActive: { color: '#1d4ed8' },
  emptyText: { color: '#64748b', fontWeight: '800', paddingVertical: 8 },
  gatewayRow: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 13 },
  gatewayStage: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  gatewayStageNumber: { color: '#0f172a', fontSize: 20, fontWeight: '900' },
  gatewayStageLabel: { color: '#64748b', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  gatewayMain: { flex: 1, gap: 10 },
  gatewayTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  gatewayTitleText: { flex: 1, minWidth: 180 },
  gatewayTitle: { color: '#0f172a', fontSize: 15, fontWeight: '900' },
  gatewayMeta: { color: '#64748b', fontSize: 12, fontWeight: '700', marginTop: 3 },
  gatewayActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primaryButton: { backgroundColor: '#0f172a', borderRadius: 11, paddingHorizontal: 13, paddingVertical: 9 },
  primaryButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  secondaryButton: { borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff', borderRadius: 11, paddingHorizontal: 13, paddingVertical: 9 },
  secondaryButtonText: { color: '#334155', fontSize: 12, fontWeight: '900' },
  notStartedPill: { borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#f8fafc', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  notStartedText: { color: '#64748b', fontSize: 11, fontWeight: '900' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 11, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  actionIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' },
  actionMain: { flex: 1, minWidth: 180 },
  actionTitle: { color: '#0f172a', fontWeight: '900' },
  actionDescription: { color: '#475569', fontSize: 12, fontWeight: '700', marginTop: 2 },
  actionMeta: { color: '#94a3b8', fontSize: 11, fontWeight: '700', marginTop: 3 },
  recentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  recentMain: { flex: 1 },
  recentTitle: { color: '#0f172a', fontWeight: '900' },
  recentMeta: { color: '#64748b', fontSize: 11, marginTop: 3, fontWeight: '700' },
  loadingCard: { backgroundColor: '#ffffff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', padding: 22 },
  loadingText: { color: '#64748b', fontWeight: '900' },
});

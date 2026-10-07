import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { StageStatusPill } from '../../components/StageStatusPill';
import { useProgrammeData } from '../../data/programmeStore';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { PlotStage, StageStatus } from '../../types/models';
import { getActiveStage, getPlotProgress, getStagesForPlot } from '../../utils/programmeLogic';
import { getHouseTypeLabel, getTemplateForPlot } from '../../utils/templateProgramme';

const stageStatuses: StageStatus[] = ['Not started', 'In progress', 'Complete'];

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

export default function PlotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { plotProgrammes, plotStages, inspections, defects, updateStageStatus } = useProgrammeData();
  const { sitePlots, plotTemplates } = useSitePlanner();
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
  const sitePlot = sitePlots.find((item) => item.id === plot.id || item.plotNo === plot.plotName);
  const template = sitePlot ? getTemplateForPlot(sitePlot, plotTemplates) : plotTemplates.find((item) => item.id === plot.houseTypeId);
  const today = dateOnly(new Date());
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 14);
  const horizonDate = dateOnly(horizon);
  const next14 = stages.filter((stage) => stage.endDate >= today && stage.startDate <= horizonDate && stage.status !== 'Complete');
  const plotInspections = inspections.filter((inspection) => inspection.plotProgrammeId === plot.id);
  const inspectionIssues = plotInspections.filter((inspection) => ['Issues noted', 'Failed awaiting close out', 'Blocked'].includes(inspection.status));
  const openDefects = defects.filter((defect) => defect.plotProgrammeId === plot.id && defect.status !== 'Verified fixed');
  const overdueStages = stages.filter((stage) => stage.status !== 'Complete' && stage.endDate < today);
  const programmeHealth = plot.holdStatus === 'On hold'
    ? 'On Hold'
    : overdueStages.length || inspectionIssues.length
      ? 'At Risk'
      : 'On Track';
  const healthTone = programmeHealth === 'On Track' ? styles.healthGood : programmeHealth === 'On Hold' ? styles.healthHold : styles.healthRisk;

  return (
    <AppScreen>
      <Link href="/(tabs)/plots" style={styles.backLink}>‹ Back to plots</Link>

      <View style={styles.hero}>
        <View style={styles.heroTextWrap}>
          <Text style={styles.heroTitle}>{plot.plotName}</Text>
          <Text style={styles.heroSubtitle}>{plot.phase} · {template ? getHouseTypeLabel(template) : 'House type pending'}</Text>
          <View style={[styles.healthPill, healthTone]}><Text style={styles.healthText}>{programmeHealth}</Text></View>
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
        <InfoTile icon="warning-outline" label="Open QA" value={String(openDefects.length)} />
        <InfoTile icon="shield-checkmark-outline" label="Inspection issues" value={String(inspectionIssues.length)} />
        <InfoTile icon="time-outline" label="Overdue stages" value={String(overdueStages.length)} />
        <InfoTile icon="calendar-number-outline" label="Next 14 days" value={String(next14.length)} />
      </View>

      <View style={styles.quickGrid}>
        <QuickLink href="/(tabs)/qa" icon="shield-checkmark-outline" title="QA & Actions" />
        <QuickLink href="/(tabs)/trades" icon="briefcase-outline" title="Trades" />
        <QuickLink href="/(tabs)/walk" icon="walk-outline" title="8am Walk" />
        <QuickLink href="/handover" icon="key-outline" title="Handover" />
        <QuickLink href="/(tabs)/two-week" icon="grid-outline" title="2 Week" />
        <QuickLink href="/(tabs)/master" icon="calendar-outline" title="Master" />
      </View>

      {plot.holdStatus === 'On hold' ? (
        <SectionCard title="Hold status" subtitle="This plot is currently paused">
          <Text style={styles.holdReason}>{plot.holdReason}</Text>
        </SectionCard>
      ) : null}

      <SectionCard title="Current Stage" subtitle="The live focus stage for this plot">
        <View style={styles.currentStageRow}>
          <View style={styles.currentIcon}><Ionicons name="construct-outline" size={24} color="#2563eb" /></View>
          <View style={styles.currentMain}>
            <Text style={styles.currentTitle}>{activeStage?.stageName ?? 'No active stage'}</Text>
            <Text style={styles.currentText}>{activeStage?.trade ?? 'Trade pending'}</Text>
          </View>
          {activeStage ? <StageStatusPill status={activeStage.status} /> : null}
        </View>
      </SectionCard>

      <SectionCard title="Next 14 Days" subtitle="Upcoming live activities for this plot">
        {next14.length === 0 ? (
          <Text style={styles.emptyText}>No incomplete activities fall inside the next 14 days.</Text>
        ) : next14.map((stage) => (
          <View key={`next-${stage.id}`} style={styles.nextRow}>
            <View style={styles.nextDate}><Text style={styles.nextDateText}>{stage.startDate.slice(5)}</Text></View>
            <View style={styles.currentMain}>
              <Text style={styles.stageName}>{stage.stageName}</Text>
              <Text style={styles.stageMeta}>{stage.trade} · {stage.startDate} to {stage.endDate}</Text>
            </View>
            <StageStatusPill status={stage.status} />
          </View>
        ))}
      </SectionCard>

      {(openDefects.length > 0 || inspectionIssues.length > 0) ? (
        <SectionCard title="Quality blockers" subtitle="Items that can threaten completion or handover">
          {inspectionIssues.map((inspection) => (
            <View key={inspection.id} style={styles.riskRow}>
              <Ionicons name="alert-circle-outline" size={18} color="#d97706" />
              <View style={styles.currentMain}>
                <Text style={styles.stageName}>{inspection.templateName}</Text>
                <Text style={styles.stageMeta}>{inspection.status}</Text>
              </View>
            </View>
          ))}
          {openDefects.slice(0, 6).map((defect) => (
            <View key={defect.id} style={styles.riskRow}>
              <Ionicons name="warning-outline" size={18} color="#dc2626" />
              <View style={styles.currentMain}>
                <Text style={styles.stageName}>{defect.trade} · {defect.status}</Text>
                <Text style={styles.stageMeta}>{defect.description}</Text>
              </View>
            </View>
          ))}
          <Link href="/(tabs)/qa" style={styles.backLink}>Open full QA record →</Link>
        </SectionCard>
      ) : null}

      <SectionCard title="Stage Timeline" subtitle="Tap a status button to update the live view">
        {stages.map((stage) => (
          <View key={stage.id} style={styles.stageRow}>
            <View style={styles.orderBadge}><Text style={styles.orderText}>{stage.order}</Text></View>
            <View style={styles.stageMain}>
              <View style={styles.stageHeaderRow}>
                <View style={styles.stageHeaderText}>
                  <Text style={styles.stageName}>{stage.stageName}</Text>
                  <Text style={styles.stageMeta}>{stage.trade} · {stage.startDate} to {stage.endDate}</Text>
                </View>
                <StageStatusPill status={stage.status} />
              </View>
              {stage.delayDays > 0 ? <Text style={styles.delayText}>{stage.delayDays} day delay: {stage.delayReason}</Text> : null}
              {stage.inspectionStatus !== 'Not applicable' ? <Text style={styles.inspectionText}>Inspection: {stage.inspectionStatus}</Text> : null}
              <StageStatusControls stage={stage} onChange={updateStageStatus} />
              {stage.isKeyStage ? (
                <Link href={`/inspection/${stage.id}`} asChild>
                  <Pressable style={styles.inspectButton}>
                    <Ionicons name="shield-checkmark-outline" size={16} color="#ffffff" />
                    <Text style={styles.inspectButtonText}>{stage.inspectionStatus === 'Passed' ? 'View Inspection' : 'Open Inspection'}</Text>
                  </Pressable>
                </Link>
              ) : null}
            </View>
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

function QuickLink({ href, icon, title }: { href: string; icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <Link href={href as never} asChild>
      <Pressable style={styles.quickLink}>
        <Ionicons name={icon} size={18} color="#2563eb" />
        <Text style={styles.quickLinkText}>{title}</Text>
      </Pressable>
    </Link>
  );
}

function StageStatusControls({ stage, onChange }: { stage: PlotStage; onChange: (stageId: string, status: StageStatus) => Promise<void> }) {
  return (
    <View style={styles.statusControls}>
      {stageStatuses.map((status) => {
        const isSelected = stage.status === status;
        return (
          <Pressable key={status} accessibilityRole="button" accessibilityState={{ selected: isSelected }} onPress={() => onChange(stage.id, status)} style={[styles.statusButton, isSelected ? styles.statusButtonSelected : null]}>
            <Text style={[styles.statusButtonText, isSelected ? styles.statusButtonTextSelected : null]}>{status}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  backLink: { color: '#2563eb', fontWeight: '900', fontSize: 14 },
  hero: { backgroundColor: '#0f172a', borderRadius: 24, padding: 24, flexDirection: 'row', justifyContent: 'space-between', gap: 20, alignItems: 'center' },
  heroTextWrap: { flex: 1 },
  heroTitle: { color: '#ffffff', fontSize: 30, fontWeight: '900' },
  heroSubtitle: { color: '#cbd5e1', marginTop: 4 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  healthPill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginTop: 10 },
  healthGood: { backgroundColor: '#166534' },
  healthHold: { backgroundColor: '#a16207' },
  healthRisk: { backgroundColor: '#b91c1c' },
  healthText: { color: '#ffffff', fontWeight: '900', fontSize: 11 },
  progressCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  progressValue: { color: '#2563eb', fontSize: 24, fontWeight: '900' },
  progressLabel: { color: '#64748b', fontSize: 11, fontWeight: '800' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  infoTile: { flex: 1, minWidth: 135, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, gap: 4 },
  infoLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  infoValue: { color: '#0f172a', fontWeight: '900' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickLink: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dbe3ef', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6 },
  quickLinkText: { color: '#1d4ed8', fontSize: 12, fontWeight: '900' },
  holdReason: { color: '#991b1b', backgroundColor: '#fee2e2', borderRadius: 12, padding: 12, fontWeight: '800' },
  currentStageRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  currentIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  currentMain: { flex: 1 },
  currentTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  currentText: { color: '#64748b', marginTop: 3 },
  nextRow: { flexDirection: 'row', gap: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  nextDate: { borderRadius: 10, backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 7 },
  nextDateText: { color: '#1d4ed8', fontWeight: '900', fontSize: 11 },
  emptyText: { color: '#64748b', fontSize: 13 },
  riskRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  stageRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  orderBadge: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  orderText: { color: '#2563eb', fontWeight: '900' },
  stageMain: { flex: 1, gap: 8 },
  stageHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  stageHeaderText: { flex: 1 },
  stageName: { color: '#0f172a', fontWeight: '900' },
  stageMeta: { color: '#64748b', fontSize: 12, marginTop: 3 },
  delayText: { color: '#c2410c', fontSize: 12, fontWeight: '800' },
  inspectionText: { color: '#2563eb', fontSize: 12, fontWeight: '800' },
  inspectButton: { alignSelf: 'flex-start', marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0f172a', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  inspectButtonText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
  statusControls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#ffffff' },
  statusButtonSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  statusButtonText: { color: '#64748b', fontWeight: '800', fontSize: 12 },
  statusButtonTextSelected: { color: '#2563eb' },
});

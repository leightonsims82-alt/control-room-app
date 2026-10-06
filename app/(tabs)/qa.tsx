import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { PhotoCaptureField } from '../../components/PhotoCaptureField';
import { useProgrammeData } from '../../data/programmeStore';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { DefectAction, DefectStatus } from '../../types/models';
import { buildCanonicalQaPlots, canonicalEvidenceBelongsToPlot, findCanonicalQaPlot } from '../../utils/canonicalQaProgramme';
import { exportActionLogCsv, exportInspectionLogCsv } from '../../utils/qaExports';

const statusOrder: DefectStatus[] = [
  'Open',
  'Sent to trade',
  'In progress',
  'Fixed awaiting verification',
  'Verified fixed',
  'Rejected',
];

export default function QAScreen() {
  const { plotProgrammes: legacyPlots, inspections, defects, updateDefect } = useProgrammeData();
  const { sitePlots, plotTemplates, siteSetup } = useSitePlanner();
  const canonicalPlots = useMemo(
    () => buildCanonicalQaPlots(sitePlots, plotTemplates, siteSetup, legacyPlots),
    [sitePlots, plotTemplates, siteSetup, legacyPlots],
  );
  const [plotFilter, setPlotFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'open' | 'all' | 'verify'>('open');
  const [message, setMessage] = useState('');

  const plotName = (plotId: string) => findCanonicalQaPlot(canonicalPlots, plotId)?.plotName ?? 'Archived plot';

  const filteredActions = useMemo(() => {
    const selectedPlot = canonicalPlots.find((plot) => plot.id === plotFilter);
    return defects
      .filter((defect) => selectedPlot
        ? canonicalEvidenceBelongsToPlot(selectedPlot, defect.plotProgrammeId)
        : canonicalPlots.some((plot) => canonicalEvidenceBelongsToPlot(plot, defect.plotProgrammeId)))
      .filter((defect) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'verify') return defect.status === 'Fixed awaiting verification';
        return defect.status !== 'Verified fixed';
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [defects, canonicalPlots, plotFilter, statusFilter]);

  const filteredInspections = useMemo(() => {
    const selectedPlot = canonicalPlots.find((plot) => plot.id === plotFilter);
    return inspections
      .filter((inspection) => selectedPlot
        ? canonicalEvidenceBelongsToPlot(selectedPlot, inspection.plotProgrammeId)
        : canonicalPlots.some((plot) => canonicalEvidenceBelongsToPlot(plot, inspection.plotProgrammeId)))
      .sort((a, b) => (b.completedAt ?? b.startedAt).localeCompare(a.completedAt ?? a.startedAt));
  }, [inspections, canonicalPlots, plotFilter]);

  const canonicalDefects = defects.filter((item) => canonicalPlots.some((plot) => canonicalEvidenceBelongsToPlot(plot, item.plotProgrammeId)));
  const canonicalInspections = inspections.filter((item) => canonicalPlots.some((plot) => canonicalEvidenceBelongsToPlot(plot, item.plotProgrammeId)));
  const openCount = canonicalDefects.filter((item) => item.status !== 'Verified fixed').length;
  const verifyCount = canonicalDefects.filter((item) => item.status === 'Fixed awaiting verification').length;
  const closedCount = canonicalDefects.filter((item) => item.status === 'Verified fixed').length;

  const exportActions = () => {
    const downloaded = exportActionLogCsv(canonicalDefects, canonicalPlots);
    setMessage(downloaded ? 'Action log CSV downloaded.' : 'CSV export is available in the browser version.');
  };

  const exportInspections = () => {
    const downloaded = exportInspectionLogCsv(canonicalInspections, canonicalPlots);
    setMessage(downloaded ? 'Inspection log CSV downloaded.' : 'CSV export is available in the browser version.');
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="shield-checkmark-outline" size={28} color="#7c3aed" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Quality control</Text>
          <Text style={styles.title}>QA / Plot Story</Text>
          <Text style={styles.subtitle}>
            Inspection evidence, trade actions, close-out photos and verification in one place.
          </Text>
        </View>
      </View>

      {message ? <Text style={styles.notice}>{message}</Text> : null}

      <View style={styles.summaryRow}>
        <Summary label="Open actions" value={openCount} danger={openCount > 0} />
        <Summary label="Awaiting verification" value={verifyCount} warning={verifyCount > 0} />
        <Summary label="Verified fixed" value={closedCount} />
        <Summary label="Inspections" value={canonicalInspections.length} />
      </View>

      <View style={styles.toolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chips}>
            <FilterChip label="All plots" active={plotFilter === 'all'} onPress={() => setPlotFilter('all')} />
            {canonicalPlots.map((plot) => (
              <FilterChip
                key={plot.id}
                label={`${plot.plotName} · ${plot.plotCompletionDate}`}
                active={plotFilter === plot.id}
                onPress={() => setPlotFilter(plot.id)}
              />
            ))}
          </View>
        </ScrollView>
        <View style={styles.buttonRow}>
          <Pressable style={styles.secondaryButton} onPress={exportActions}>
            <Ionicons name="download-outline" size={16} color="#1d4ed8" />
            <Text style={styles.secondaryButtonText}>Actions CSV</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={exportInspections}>
            <Ionicons name="download-outline" size={16} color="#1d4ed8" />
            <Text style={styles.secondaryButtonText}>Inspections CSV</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Trade action register</Text>
            <Text style={styles.sectionText}>Move each defect from issue to verified close-out.</Text>
          </View>
          <View style={styles.chips}>
            <FilterChip label="Open" active={statusFilter === 'open'} onPress={() => setStatusFilter('open')} />
            <FilterChip label="Awaiting verify" active={statusFilter === 'verify'} onPress={() => setStatusFilter('verify')} />
            <FilterChip label="All" active={statusFilter === 'all'} onPress={() => setStatusFilter('all')} />
          </View>
        </View>

        {filteredActions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No matching trade actions</Text>
            <Text style={styles.emptyText}>Failed inspection checks will appear here automatically.</Text>
          </View>
        ) : (
          filteredActions.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              plotName={plotName(action.plotProgrammeId)}
              updateDefect={updateDefect}
              setMessage={setMessage}
            />
          ))
        )}
      </View>

      <View style={styles.sectionCard}>
        <View>
          <Text style={styles.sectionTitle}>Inspection story</Text>
          <Text style={styles.sectionText}>Latest inspection records and photographic evidence for the selected plot.</Text>
        </View>

        {filteredInspections.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No inspections recorded</Text>
            <Text style={styles.emptyText}>Complete a key stage inspection and it will be retained here.</Text>
          </View>
        ) : (
          filteredInspections.map((inspection) => {
            const failed = inspection.items.filter((item) => item.compliant === 'No');
            const photos = inspection.items
              .flatMap((item) => [item.imageUri, item.fixedImageUri])
              .filter(Boolean) as string[];
            return (
              <View key={inspection.id} style={styles.inspectionCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderCopy}>
                    <Text style={styles.cardTitle}>{plotName(inspection.plotProgrammeId)} · {inspection.templateName}</Text>
                    <Text style={styles.cardMeta}>
                      {inspection.status} · {inspection.completedAt ? `Completed ${new Date(inspection.completedAt).toLocaleString('en-GB')}` : `Started ${new Date(inspection.startedAt).toLocaleString('en-GB')}`}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, failed.length ? styles.statusRisk : styles.statusGood]}>
                    <Text style={[styles.statusPillText, failed.length ? styles.statusRiskText : styles.statusGoodText]}>
                      {failed.length ? `${failed.length} failed` : 'No failed checks'}
                    </Text>
                  </View>
                </View>

                {failed.map((item) => (
                  <View key={item.id} style={styles.failedRow}>
                    <Text style={styles.failedTrade}>{item.trade}</Text>
                    <Text style={styles.failedCheck}>{item.description || item.check}</Text>
                  </View>
                ))}

                {photos.length ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.photoRow}>
                      {photos.map((uri, index) => <Image key={`${inspection.id}-${index}`} source={{ uri }} style={styles.thumb} />)}
                    </View>
                  </ScrollView>
                ) : null}
              </View>
            );
          })
        )}
      </View>
    </AppScreen>
  );
}

function ActionCard({
  action,
  plotName,
  updateDefect,
  setMessage,
}: {
  action: DefectAction;
  plotName: string;
  updateDefect: ReturnType<typeof useProgrammeData>['updateDefect'];
  setMessage: (value: string) => void;
}) {
  const moveStatus = async (status: DefectStatus) => {
    await updateDefect(action.id, {
      status,
      sentToTrade: action.sentToTrade || status === 'Sent to trade' || status === 'In progress' || status === 'Fixed awaiting verification' || status === 'Verified fixed',
      fixed: status === 'Verified fixed' || status === 'Fixed awaiting verification' ? 'Yes' : status === 'Rejected' ? 'No' : action.fixed,
    });
    setMessage(`${plotName} · ${action.trade}: ${status}`);
  };

  const addCloseoutPhoto = async (uri?: string) => {
    if (!uri) {
      await updateDefect(action.id, { fixedImageUri: undefined });
      return;
    }
    await updateDefect(action.id, {
      fixedImageUri: uri,
      fixed: 'Yes',
      status: action.status === 'Verified fixed' ? 'Verified fixed' : 'Fixed awaiting verification',
      sentToTrade: true,
    });
    setMessage(`${plotName} · ${action.trade}: close-out photo saved for verification.`);
  };

  return (
    <View style={[styles.actionCard, action.status === 'Verified fixed' ? styles.actionClosed : null]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderCopy}>
          <Text style={styles.cardTitle}>{plotName} · {action.trade}</Text>
          <Text style={styles.cardMeta}>{action.stage} · {action.type} · {new Date(action.createdAt).toLocaleDateString('en-GB')}</Text>
        </View>
        <View style={[styles.statusPill, action.status === 'Verified fixed' ? styles.statusGood : action.status === 'Fixed awaiting verification' ? styles.statusWarn : styles.statusRisk]}>
          <Text style={[styles.statusPillText, action.status === 'Verified fixed' ? styles.statusGoodText : action.status === 'Fixed awaiting verification' ? styles.statusWarnText : styles.statusRiskText]}>
            {action.status}
          </Text>
        </View>
      </View>

      <Text style={styles.actionDescription}>{action.description}</Text>
      <Text style={styles.requiredAction}><Text style={styles.requiredLabel}>Required: </Text>{action.requiredAction}</Text>

      {action.imageUri ? (
        <View style={styles.evidenceBlock}>
          <Text style={styles.smallLabel}>Original evidence</Text>
          <Image source={{ uri: action.imageUri }} style={styles.evidenceImage} />
        </View>
      ) : null}

      <PhotoCaptureField
        label="Close-out evidence"
        value={action.fixedImageUri}
        onChange={addCloseoutPhoto}
        compact
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.statusActions}>
          {statusOrder.map((status) => (
            <Pressable
              key={status}
              style={[styles.statusButton, action.status === status ? styles.statusButtonActive : null]}
              onPress={() => moveStatus(status)}
            >
              <Text style={[styles.statusButtonText, action.status === status ? styles.statusButtonTextActive : null]}>
                {status}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.filterChip, active ? styles.filterChipActive : null]} onPress={onPress}>
      <Text style={[styles.filterChipText, active ? styles.filterChipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

function Summary({ label, value, danger, warning }: { label: string; value: number; danger?: boolean; warning?: boolean }) {
  return (
    <View style={[styles.summary, danger ? styles.summaryDanger : warning ? styles.summaryWarning : null]}>
      <Text style={[styles.summaryValue, danger ? styles.summaryValueDanger : warning ? styles.summaryValueWarning : null]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  iconWrap: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#f3e8ff', alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, minWidth: 240 },
  eyebrow: { color: '#7c3aed', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 30, fontWeight: '900', color: '#0f172a', marginTop: 3 },
  subtitle: { marginTop: 6, fontSize: 15, color: '#64748b', lineHeight: 22 },
  notice: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1, color: '#1d4ed8', fontWeight: '900', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summary: { flex: 1, minWidth: 140, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 14 },
  summaryDanger: { backgroundColor: '#fff7f7', borderColor: '#fecaca' },
  summaryWarning: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  summaryValue: { color: '#0f172a', fontSize: 23, fontWeight: '900' },
  summaryValueDanger: { color: '#b91c1c' },
  summaryValueWarning: { color: '#b45309' },
  summaryLabel: { color: '#64748b', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginTop: 2 },
  toolbar: { backgroundColor: '#ffffff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, gap: 10 },
  chips: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  filterChip: { borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  filterChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  filterChipText: { color: '#64748b', fontSize: 11, fontWeight: '900' },
  filterChipTextActive: { color: '#ffffff' },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  secondaryButton: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6 },
  secondaryButtonText: { color: '#1d4ed8', fontSize: 11, fontWeight: '900' },
  sectionCard: { backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  sectionTitle: { color: '#0f172a', fontSize: 19, fontWeight: '900' },
  sectionText: { color: '#64748b', fontSize: 12, lineHeight: 18, marginTop: 3 },
  emptyCard: { backgroundColor: '#f8fafc', borderRadius: 15, borderWidth: 1, borderColor: '#e2e8f0', padding: 16 },
  emptyTitle: { color: '#0f172a', fontSize: 16, fontWeight: '900' },
  emptyText: { color: '#64748b', fontSize: 12, lineHeight: 18, marginTop: 4 },
  actionCard: { borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fffafa', borderRadius: 17, padding: 14, gap: 10 },
  actionClosed: { borderColor: '#bbf7d0', backgroundColor: '#f7fff9' },
  inspectionCard: { borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', borderRadius: 17, padding: 14, gap: 9 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' },
  cardHeaderCopy: { flex: 1, minWidth: 220 },
  cardTitle: { color: '#0f172a', fontSize: 15, fontWeight: '900' },
  cardMeta: { color: '#64748b', fontSize: 11, fontWeight: '700', marginTop: 3 },
  statusPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  statusPillText: { fontSize: 10, fontWeight: '900' },
  statusRisk: { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
  statusRiskText: { color: '#b91c1c' },
  statusWarn: { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
  statusWarnText: { color: '#b45309' },
  statusGood: { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' },
  statusGoodText: { color: '#166534' },
  actionDescription: { color: '#0f172a', fontSize: 14, fontWeight: '800', lineHeight: 20 },
  requiredAction: { color: '#475569', fontSize: 12, lineHeight: 18 },
  requiredLabel: { fontWeight: '900', color: '#0f172a' },
  evidenceBlock: { gap: 6 },
  smallLabel: { color: '#64748b', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  evidenceImage: { width: 180, height: 120, borderRadius: 12, backgroundColor: '#e2e8f0' },
  statusActions: { flexDirection: 'row', gap: 7, paddingVertical: 2 },
  statusButton: { borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  statusButtonActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  statusButtonText: { color: '#64748b', fontSize: 10, fontWeight: '900' },
  statusButtonTextActive: { color: '#ffffff' },
  failedRow: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8 },
  failedTrade: { color: '#b91c1c', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  failedCheck: { color: '#0f172a', fontSize: 12, fontWeight: '800', marginTop: 2 },
  photoRow: { flexDirection: 'row', gap: 8, paddingVertical: 3 },
  thumb: { width: 90, height: 70, borderRadius: 10, backgroundColor: '#e2e8f0' },
});
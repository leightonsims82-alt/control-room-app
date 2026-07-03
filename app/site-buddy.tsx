import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { SectionCard } from '../components/SectionCard';
import { useSitePlanner } from '../data/sitePlannerStore';
import { getHouseTypeLabel, getSortedSitePlots, getTemplateForPlot } from '../utils/templateProgramme';

export const SITE_BUDDY_READINESS_KEY = 'programme-buddy:site-buddy-readiness:v1';

const COMPLETION_CHOICES = ['Complete - ready for SM inspection', 'Part complete', 'Blocked'] as const;
const REASONS = ['Previous trade incomplete', 'Materials missing', 'Access issue', 'Information issue', 'Plant / forklift required', 'Weather issue', 'Waiting for others', 'Other'] as const;

type CompletionChoice = typeof COMPLETION_CHOICES[number];
type Reason = typeof REASONS[number];
type QueueStatus = 'Started' | 'Ready for inspection' | 'Needs review' | 'Accepted' | 'Returned to trade';

type ReadinessRecord = {
  id: string;
  plotId: string;
  plotNo: string;
  houseType: string;
  activityCode: string;
  activityLabel: string;
  trade: string;
  stage: number;
  queueStatus: QueueStatus;
  startedBy: string;
  company: string;
  startedAt?: string;
  completedAt?: string;
  completionStatus?: CompletionChoice;
  reason?: Reason;
  tradeComment?: string;
  photoNote?: string;
  smComment?: string;
  smUpdatedAt?: string;
  updatedAt: string;
};

function stamp(value?: string) {
  return value ? new Date(value).toLocaleString() : 'Not recorded';
}

function queueFromCompletion(status: CompletionChoice): QueueStatus {
  return status === 'Complete - ready for SM inspection' ? 'Ready for inspection' : 'Needs review';
}

export default function SiteBuddyScreen() {
  const { siteSetup, sitePlots, plotTemplates } = useSitePlanner();
  const sortedPlots = useMemo(() => getSortedSitePlots(sitePlots), [sitePlots]);
  const [records, setRecords] = useState<ReadinessRecord[]>([]);
  const [selectedPlotId, setSelectedPlotId] = useState(sortedPlots[0]?.id ?? '');
  const selectedPlot = sortedPlots.find((plot) => plot.id === selectedPlotId) ?? sortedPlots[0];
  const selectedTemplate = selectedPlot ? getTemplateForPlot(selectedPlot, plotTemplates) : plotTemplates[0];
  const activities = selectedTemplate?.activities ?? [];
  const [activityCode, setActivityCode] = useState(activities[0]?.code ?? '');
  const selectedActivity = activities.find((activity) => activity.code === activityCode) ?? activities[0];
  const [person, setPerson] = useState('');
  const [company, setCompany] = useState('');
  const [completion, setCompletion] = useState<CompletionChoice>('Complete - ready for SM inspection');
  const [reason, setReason] = useState<Reason>('Previous trade incomplete');
  const [tradeComment, setTradeComment] = useState('');
  const [photoNote, setPhotoNote] = useState('');
  const [smComment, setSmComment] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        const stored = await AsyncStorage.getItem(SITE_BUDDY_READINESS_KEY);
        if (active) setRecords(stored ? JSON.parse(stored) : []);
      }
      load();
      return () => {
        active = false;
      };
    }, []),
  );

  const save = async (next: ReadinessRecord[]) => {
    setRecords(next);
    await AsyncStorage.setItem(SITE_BUDDY_READINESS_KEY, JSON.stringify(next));
  };

  const selectPlot = (plotId: string) => {
    setSelectedPlotId(plotId);
    const plot = sortedPlots.find((item) => item.id === plotId);
    const template = plot ? getTemplateForPlot(plot, plotTemplates) : undefined;
    setActivityCode(template?.activities[0]?.code ?? '');
  };

  const upsert = async (input: Partial<ReadinessRecord>) => {
    if (!selectedPlot || !selectedTemplate || !selectedActivity) return;
    const id = `${selectedPlot.id}:${selectedActivity.code}`;
    const existing = records.find((record) => record.id === id);
    const now = new Date().toISOString();
    const nextRecord: ReadinessRecord = {
      id,
      plotId: selectedPlot.id,
      plotNo: selectedPlot.plotNo,
      houseType: getHouseTypeLabel(selectedTemplate),
      activityCode: selectedActivity.code,
      activityLabel: selectedActivity.displayText,
      trade: selectedActivity.trade,
      stage: selectedActivity.stage,
      queueStatus: input.queueStatus ?? existing?.queueStatus ?? 'Started',
      startedBy: person.trim() || existing?.startedBy || 'Trade user',
      company: company.trim() || existing?.company || selectedActivity.trade,
      startedAt: input.startedAt ?? existing?.startedAt,
      completedAt: input.completedAt ?? existing?.completedAt,
      completionStatus: input.completionStatus ?? existing?.completionStatus,
      reason: input.reason ?? existing?.reason,
      tradeComment: input.tradeComment ?? existing?.tradeComment,
      photoNote: input.photoNote ?? existing?.photoNote,
      smComment: input.smComment ?? existing?.smComment,
      smUpdatedAt: input.smUpdatedAt ?? existing?.smUpdatedAt,
      updatedAt: now,
    };
    await save(existing ? records.map((record) => (record.id === id ? nextRecord : record)) : [nextRecord, ...records]);
  };

  const startTask = () => upsert({ queueStatus: 'Started', startedAt: new Date().toISOString() });

  const submitTradeUpdate = async () => {
    await upsert({
      queueStatus: queueFromCompletion(completion),
      completionStatus: completion,
      completedAt: new Date().toISOString(),
      reason: completion === 'Complete - ready for SM inspection' ? undefined : reason,
      tradeComment: tradeComment.trim(),
      photoNote: photoNote.trim(),
    });
    setTradeComment('');
    setPhotoNote('');
  };

  const smUpdate = async (id: string, queueStatus: QueueStatus) => {
    const next = records.map((record) => record.id === id ? { ...record, queueStatus, smComment: smComment.trim() || record.smComment, smUpdatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : record);
    await save(next);
    setSmComment('');
  };

  const ready = records.filter((record) => record.queueStatus === 'Ready for inspection');
  const review = records.filter((record) => record.queueStatus === 'Needs review' || record.queueStatus === 'Returned to trade');
  const accepted = records.filter((record) => record.queueStatus === 'Accepted');
  const visibleRecords = records.filter((record) => record.queueStatus !== 'Accepted');

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Site Buddy readiness</Text>
        <Text style={styles.title}>Trade Readiness & SM Inspection Queue</Text>
        <Text style={styles.subtitle}>Prepares Programme Buddy to receive Site Buddy trade updates before the separate app is built.</Text>
      </View>

      <SectionCard title="Connection model" subtitle="Programme Buddy is the control app. Site Buddy will send start, complete and blocker records back to the live site.">
        <View style={styles.summaryGrid}>
          <InfoBox label="Site" value={siteSetup.siteName} />
          <InfoBox label="Plots" value={`${sitePlots.length}`} />
          <InfoBox label="Records" value={`${records.length}`} />
          <InfoBox label="Ready" value={`${ready.length}`} />
        </View>
        <Text style={styles.helper}>Pilot mode: local records only. Live version needs backend accounts, task sync, photo upload, notifications and Site Buddy subscription checks.</Text>
      </SectionCard>

      <SectionCard title="Trade start / completion record" subtitle="Trade selects plot and activity, starts the fix, then marks complete or records why it is incomplete.">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {sortedPlots.map((plot) => (
              <Pressable key={plot.id} style={[styles.chip, plot.id === selectedPlot?.id ? styles.chipActive : null]} onPress={() => selectPlot(plot.id)}>
                <Text style={[styles.chipText, plot.id === selectedPlot?.id ? styles.chipTextActive : null]}>Plot {plot.plotNo}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.activityChips}>
            {activities.map((activity) => (
              <Pressable key={activity.code} style={[styles.activityChip, activity.code === selectedActivity?.code ? styles.activityChipActive : null]} onPress={() => setActivityCode(activity.code)}>
                <Text style={[styles.activityCode, activity.code === selectedActivity?.code ? styles.chipTextActive : null]}>{activity.code}</Text>
                <Text style={[styles.activityMeta, activity.code === selectedActivity?.code ? styles.chipTextActive : null]}>{activity.trade} · Stage {activity.stage}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <View style={styles.formGrid}>
          <Field label="Tradesperson"><TextInput value={person} onChangeText={setPerson} placeholder="Name" style={styles.input} /></Field>
          <Field label="Company"><TextInput value={company} onChangeText={setCompany} placeholder="Company" style={styles.input} /></Field>
        </View>
        <View style={styles.selectedTaskBox}>
          <Text style={styles.selectedTaskTitle}>Plot {selectedPlot?.plotNo ?? '-'} · {selectedActivity?.code ?? '-'}</Text>
          <Text style={styles.selectedTaskMeta}>{selectedActivity?.trade ?? 'Trade'} · {selectedActivity?.displayText ?? 'Activity'} · Stage {selectedActivity?.stage ?? '-'}</Text>
          <Pressable style={styles.primaryButton} onPress={startTask}><Text style={styles.primaryButtonText}>Start Fix</Text></Pressable>
        </View>
        <View style={styles.chipRow}>
          {COMPLETION_CHOICES.map((status) => (
            <Pressable key={status} style={[styles.statusChip, completion === status ? styles.chipActive : null]} onPress={() => setCompletion(status)}>
              <Text style={[styles.chipText, completion === status ? styles.chipTextActive : null]}>{status}</Text>
            </Pressable>
          ))}
        </View>
        {completion !== 'Complete - ready for SM inspection' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {REASONS.map((item) => (
                <Pressable key={item} style={[styles.reasonChip, reason === item ? styles.chipActive : null]} onPress={() => setReason(item)}>
                  <Text style={[styles.chipText, reason === item ? styles.chipTextActive : null]}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : null}
        <TextInput value={tradeComment} onChangeText={setTradeComment} placeholder="Trade comment / missing items / incomplete works" multiline style={[styles.input, styles.noteInput]} />
        <TextInput value={photoNote} onChangeText={setPhotoNote} placeholder="Photo note for future Site Buddy upload" multiline style={[styles.input, styles.noteInput]} />
        <Pressable style={styles.primaryButton} onPress={submitTradeUpdate}><Text style={styles.primaryButtonText}>Submit Trade Update</Text></Pressable>
      </SectionCard>

      <SectionCard title="SM inspection queue" subtitle="Complete tasks trigger inspection. Incomplete or blocked tasks stay visible for review.">
        <View style={styles.summaryGrid}>
          <InfoBox label="Ready" value={`${ready.length}`} />
          <InfoBox label="Needs review" value={`${review.length}`} />
          <InfoBox label="Accepted" value={`${accepted.length}`} />
        </View>
        <TextInput value={smComment} onChangeText={setSmComment} placeholder="SM inspection comment" multiline style={[styles.input, styles.noteInput]} />
        {visibleRecords.length === 0 ? <Text style={styles.empty}>No trade readiness records yet.</Text> : null}
        {visibleRecords.map((record) => (
          <View key={record.id} style={[styles.recordRow, record.queueStatus === 'Ready for inspection' ? styles.readyRow : record.queueStatus === 'Needs review' || record.queueStatus === 'Returned to trade' ? styles.reviewRow : null]}>
            <View style={styles.recordMain}>
              <Text style={styles.recordTitle}>Plot {record.plotNo} · {record.activityCode}</Text>
              <Text style={styles.recordMeta}>{record.trade} · {record.houseType} · Stage {record.stage}</Text>
              <Text style={styles.recordMeta}>Queue: {record.queueStatus}</Text>
              <Text style={styles.recordMeta}>Started: {stamp(record.startedAt)}</Text>
              <Text style={styles.recordMeta}>Completed: {stamp(record.completedAt)}</Text>
              {record.reason ? <Text style={styles.recordNote}>Reason: {record.reason}</Text> : null}
              {record.tradeComment ? <Text style={styles.recordNote}>Trade: {record.tradeComment}</Text> : null}
              {record.photoNote ? <Text style={styles.recordNote}>Photo note: {record.photoNote}</Text> : null}
              {record.smComment ? <Text style={styles.recordNote}>SM: {record.smComment}</Text> : null}
            </View>
            <View style={styles.actionColumn}>
              <Pressable style={styles.acceptButton} onPress={() => smUpdate(record.id, 'Accepted')}><Text style={styles.acceptButtonText}>Accept</Text></Pressable>
              <Pressable style={styles.returnButton} onPress={() => smUpdate(record.id, 'Returned to trade')}><Text style={styles.returnButtonText}>Return</Text></Pressable>
              <Pressable style={styles.reviewButton} onPress={() => smUpdate(record.id, 'Needs review')}><Text style={styles.reviewButtonText}>Review</Text></Pressable>
            </View>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Backend requirements before Site Buddy" subtitle="These must exist before the separate app goes live.">
        <Text style={styles.item}>Unique site ID and live / archived site status.</Text>
        <Text style={styles.item}>User accounts linked by email and site-specific access.</Text>
        <Text style={styles.item}>Task records for every plot activity.</Text>
        <Text style={styles.item}>Trade start, part-complete, complete and blocked updates.</Text>
        <Text style={styles.item}>Photo upload, notifications, audit trail and Site Buddy subscription checks.</Text>
      </SectionCard>
    </AppScreen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text>{children}</View>;
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return <View style={styles.infoBox}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  eyebrow: { color: '#7c3aed', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  helper: { color: '#64748b', fontSize: 12, fontWeight: '700', lineHeight: 18 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoBox: { flex: 1, minWidth: 150, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 12, backgroundColor: '#ffffff' },
  infoLabel: { color: '#64748b', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  infoValue: { color: '#0f172a', fontSize: 14, fontWeight: '900', marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 2 },
  chip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff' },
  chipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  chipText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  chipTextActive: { color: '#ffffff' },
  activityChips: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  activityChip: { width: 170, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 10, backgroundColor: '#ffffff' },
  activityChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  activityCode: { color: '#0f172a', fontWeight: '900', fontSize: 12 },
  activityMeta: { color: '#64748b', fontWeight: '800', fontSize: 11, marginTop: 3 },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' },
  field: { flex: 1, minWidth: 180, gap: 6 },
  label: { color: '#334155', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', fontWeight: '800' },
  noteInput: { minHeight: 74, textAlignVertical: 'top' },
  selectedTaskBox: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 14, padding: 14, gap: 8 },
  selectedTaskTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  selectedTaskMeta: { color: '#2563eb', fontSize: 12, fontWeight: '900' },
  primaryButton: { alignSelf: 'flex-start', backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  primaryButtonText: { color: '#ffffff', fontWeight: '900' },
  statusChip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff' },
  reasonChip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff' },
  empty: { color: '#64748b', fontWeight: '700' },
  recordRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 12, backgroundColor: '#ffffff' },
  readyRow: { backgroundColor: '#ecfdf5', borderColor: '#86efac' },
  reviewRow: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  recordMain: { flex: 1 },
  recordTitle: { color: '#0f172a', fontWeight: '900', fontSize: 15 },
  recordMeta: { color: '#64748b', fontSize: 12, fontWeight: '800', marginTop: 3 },
  recordNote: { color: '#334155', fontSize: 12, fontWeight: '700', marginTop: 4, lineHeight: 17 },
  actionColumn: { gap: 6 },
  acceptButton: { backgroundColor: '#dcfce7', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  acceptButtonText: { color: '#166534', fontSize: 12, fontWeight: '900' },
  returnButton: { backgroundColor: '#fee2e2', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  returnButtonText: { color: '#991b1b', fontSize: 12, fontWeight: '900' },
  reviewButton: { backgroundColor: '#dbeafe', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  reviewButtonText: { color: '#1d4ed8', fontSize: 12, fontWeight: '900' },
  item: { color: '#0f172a', fontWeight: '700', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12, lineHeight: 20 },
});

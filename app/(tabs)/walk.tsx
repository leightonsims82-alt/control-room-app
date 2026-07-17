import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { useProgrammeData } from '../../data/programmeStore';
import { ChecklistAnswer } from '../../types/models';
import { getActiveStage } from '../../utils/programmeLogic';

const WALK_KEY = 'siteprog:8am-walk:v1';
const WALK_NOTES_KEY = 'siteprog:8am-walk-notes:v1';
const answers: ChecklistAnswer[] = ['Yes', 'No', 'N/A'];

type WalkItem = {
  id: string;
  walkDate: string;
  plotProgrammeId: string;
  plotStageId?: string;
  plotChecked: boolean;
  tradePresent: ChecklistAnswer;
  correctTradePresent: ChecklistAnswer;
  workStarted: ChecklistAnswer;
  issueFound: boolean;
  issueNotes: string;
  actionOwner: string;
  complete: boolean;
  updatedAt: string;
};

type WalkNote = { walkDate: string; notes: string; updatedAt: string };

function today() { return new Date().toISOString().slice(0, 10); }

function blankItem(plotId: string, stageId?: string): WalkItem {
  const date = today();
  return { id: `walk-${date}-${plotId}`, walkDate: date, plotProgrammeId: plotId, plotStageId: stageId, plotChecked: false, tradePresent: 'Not checked', correctTradePresent: 'Not checked', workStarted: 'Not checked', issueFound: false, issueNotes: '', actionOwner: '', complete: false, updatedAt: new Date().toISOString() };
}

export default function WalkScreen() {
  const { plotProgrammes, plotStages } = useProgrammeData();
  const [items, setItems] = useState<WalkItem[]>([]);
  const [walkNotes, setWalkNotes] = useState<WalkNote[]>([]);
  const walkDate = today();
  const noteText = walkNotes.find((note) => note.walkDate === walkDate)?.notes ?? '';

  useEffect(() => {
    async function load() {
      const [storedItems, storedNotes] = await Promise.all([AsyncStorage.getItem(WALK_KEY), AsyncStorage.getItem(WALK_NOTES_KEY)]);
      setItems(storedItems ? (JSON.parse(storedItems) as WalkItem[]) : []);
      setWalkNotes(storedNotes ? (JSON.parse(storedNotes) as WalkNote[]) : []);
    }
    load();
  }, []);

  async function saveItem(plotId: string, stageId: string | undefined, update: Partial<WalkItem>) {
    const existing = items.find((item) => item.plotProgrammeId === plotId && item.walkDate === walkDate);
    const updated = { ...(existing ?? blankItem(plotId, stageId)), ...update, updatedAt: new Date().toISOString() };
    const nextItems = existing ? items.map((item) => (item.id === existing.id ? updated : item)) : [updated, ...items];
    setItems(nextItems);
    await AsyncStorage.setItem(WALK_KEY, JSON.stringify(nextItems));
  }

  async function saveWalkNotes(notes: string) {
    const existing = walkNotes.find((note) => note.walkDate === walkDate);
    const updated = { walkDate, notes, updatedAt: new Date().toISOString() };
    const nextNotes = existing ? walkNotes.map((note) => (note.walkDate === walkDate ? updated : note)) : [updated, ...walkNotes];
    setWalkNotes(nextNotes);
    await AsyncStorage.setItem(WALK_NOTES_KEY, JSON.stringify(nextNotes));
  }

  const rows = useMemo(() => plotProgrammes.map((plot) => {
    const stage = getActiveStage(plot.id, plotStages) ?? plotStages.find((item) => item.plotProgrammeId === plot.id && item.status === 'In progress');
    const saved = items.find((item) => item.plotProgrammeId === plot.id && item.walkDate === walkDate);
    return { plot, stage, saved };
  }).filter((row) => row.stage?.status === 'In progress'), [items, plotProgrammes, plotStages, walkDate]);

  const completeCount = rows.filter((row) => row.saved?.complete).length;
  const issuesCount = rows.filter((row) => row.saved?.issueFound).length;

  return (
    <AppScreen>
      <View style={styles.header}><Text style={styles.eyebrow}>8am Walk</Text><Text style={styles.title}>Morning Site Walk</Text><Text style={styles.subtitle}>Only plots currently in build are shown. Use the note box for general site observations.</Text></View>
      <View style={styles.summaryRow}><Summary label="Plots in build" value={String(rows.length)} /><Summary label="Checked" value={`${completeCount}/${rows.length}`} /><Summary label="Issues" value={String(issuesCount)} danger={issuesCount > 0} /></View>
      <SectionCard title="Site Notes" subtitle={`Walk date: ${walkDate}`}><TextInput style={[styles.input, styles.siteNotes]} defaultValue={noteText} placeholder="General site notes and actions" multiline onEndEditing={(event) => saveWalkNotes(event.nativeEvent.text)} /></SectionCard>
      <SectionCard title="Plots in build" subtitle={`Walk date: ${walkDate}`}>
        {rows.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>No plots currently in build</Text><Text style={styles.emptyText}>Plots appear here when they have a stage marked as In progress.</Text></View> : rows.map(({ plot, stage, saved }) => {
          const item = saved ?? blankItem(plot.id, stage?.id);
          return (
            <View key={plot.id} style={styles.card}>
              <View style={styles.cardHeader}><View style={styles.cardTitleWrap}><Text style={styles.plotName}>{plot.plotName}</Text><Text style={styles.meta}>{plot.phase} · {stage?.stageName ?? 'No active stage'} · {stage?.trade ?? 'Trade pending'}</Text></View><Pressable style={[styles.chip, item.plotChecked ? styles.darkChip : null]} onPress={() => saveItem(plot.id, stage?.id, { plotChecked: !item.plotChecked, plotStageId: stage?.id })}><Text style={[styles.chipText, item.plotChecked ? styles.lightText : null]}>{item.plotChecked ? 'Checked' : 'Check plot'}</Text></Pressable></View>
              <AnswerRow label="Trade present" value={item.tradePresent} onChange={(value) => saveItem(plot.id, stage?.id, { tradePresent: value, plotStageId: stage?.id })} />
              <AnswerRow label="Correct trade" value={item.correctTradePresent} onChange={(value) => saveItem(plot.id, stage?.id, { correctTradePresent: value, plotStageId: stage?.id })} />
              <AnswerRow label="Work started" value={item.workStarted} onChange={(value) => saveItem(plot.id, stage?.id, { workStarted: value, plotStageId: stage?.id })} />
              <View style={styles.actionRow}><Pressable style={[styles.chip, item.issueFound ? styles.riskChip : null]} onPress={() => saveItem(plot.id, stage?.id, { issueFound: !item.issueFound, plotStageId: stage?.id })}><Text style={[styles.chipText, item.issueFound ? styles.lightText : null]}>Issue found</Text></Pressable><Pressable style={[styles.chip, item.complete ? styles.doneChip : null]} onPress={() => saveItem(plot.id, stage?.id, { complete: !item.complete, plotStageId: stage?.id })}><Text style={[styles.chipText, item.complete ? styles.doneText : null]}>{item.complete ? 'Complete' : 'Mark complete'}</Text></Pressable></View>
              <TextInput style={[styles.input, styles.notes]} defaultValue={item.issueNotes} placeholder="Plot-specific issue or action" multiline onEndEditing={(event) => saveItem(plot.id, stage?.id, { issueNotes: event.nativeEvent.text, plotStageId: stage?.id })} />
              <TextInput style={styles.input} defaultValue={item.actionOwner} placeholder="Action owner or trade" onEndEditing={(event) => saveItem(plot.id, stage?.id, { actionOwner: event.nativeEvent.text, plotStageId: stage?.id })} />
            </View>
          );
        })}
      </SectionCard>
    </AppScreen>
  );
}

function AnswerRow({ label, value, onChange }: { label: string; value: ChecklistAnswer; onChange: (value: ChecklistAnswer) => void }) {
  return <View style={styles.answerRow}><Text style={styles.label}>{label}</Text><View style={styles.actionRow}>{answers.map((answer) => { const active = value === answer; return <Pressable key={answer} style={[styles.answerChip, active ? styles.blueChip : null]} onPress={() => onChange(answer)}><Text style={[styles.chipText, active ? styles.lightText : null]}>{answer}</Text></Pressable>; })}</View></View>;
}
function Summary({ label, value, danger }: { label: string; value: string; danger?: boolean }) { return <View style={[styles.summary, danger ? styles.summaryDanger : null]}><Text style={[styles.summaryValue, danger ? styles.summaryValueDanger : null]}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>; }

const styles = StyleSheet.create({
  header: { gap: 4 }, eyebrow: { color: '#2563eb', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' }, title: { color: '#0f172a', fontSize: 30, fontWeight: '900' }, subtitle: { color: '#64748b', fontSize: 14 }, summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, summary: { flex: 1, minWidth: 120, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 16 }, summaryDanger: { borderColor: '#fecaca', backgroundColor: '#fff7f7' }, summaryValue: { color: '#0f172a', fontSize: 22, fontWeight: '900' }, summaryValueDanger: { color: '#dc2626' }, summaryLabel: { color: '#64748b', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }, emptyCard: { backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 18 }, emptyTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900' }, emptyText: { color: '#64748b', fontSize: 14, lineHeight: 21, marginTop: 6 }, card: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 14, gap: 10 }, cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }, cardTitleWrap: { flex: 1, minWidth: 210 }, plotName: { color: '#0f172a', fontSize: 18, fontWeight: '900' }, meta: { color: '#64748b', fontSize: 12, marginTop: 3 }, answerRow: { gap: 6 }, label: { color: '#475569', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' }, actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff' }, answerChip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#ffffff' }, darkChip: { backgroundColor: '#0f172a', borderColor: '#0f172a' }, blueChip: { backgroundColor: '#2563eb', borderColor: '#2563eb' }, riskChip: { backgroundColor: '#dc2626', borderColor: '#dc2626' }, doneChip: { backgroundColor: '#dcfce7', borderColor: '#86efac' }, chipText: { color: '#64748b', fontSize: 12, fontWeight: '900' }, lightText: { color: '#ffffff' }, doneText: { color: '#166534' }, input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', backgroundColor: '#ffffff' }, notes: { minHeight: 62, textAlignVertical: 'top' }, siteNotes: { minHeight: 110, textAlignVertical: 'top' },
});

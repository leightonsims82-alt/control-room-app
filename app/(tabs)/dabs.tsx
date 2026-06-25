import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { useProgrammeData } from '../../data/programmeStore';
import { getActiveStage } from '../../utils/programmeLogic';

function getTomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

export default function DabsScreen() {
  const { plotProgrammes, plotStages, dabsBriefings, upsertDabsBriefing } = useProgrammeData();
  const briefingDate = getTomorrowDate();

  const rows = useMemo(() => {
    return plotProgrammes.map((plot) => {
      const activeStage = getActiveStage(plot.id, plotStages) ?? plotStages.find((stage) => stage.plotProgrammeId === plot.id && stage.status !== 'Complete');
      const saved = dabsBriefings.find((item) => item.plotProgrammeId === plot.id && item.briefingDate === briefingDate);
      return { plot, activeStage, saved };
    });
  }, [briefingDate, dabsBriefings, plotProgrammes, plotStages]);

  const completeCount = rows.filter((row) => row.saved?.briefingComplete).length;
  const riskCount = rows.filter((row) => row.saved?.programmeRisk).length;

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>DABS</Text>
        <Text style={styles.title}>Daily Activity Briefings</Text>
        <Text style={styles.subtitle}>Afternoon setup for {briefingDate}. Prepare tomorrow's 8am walk.</Text>
      </View>

      <View style={styles.summaryRow}>
        <Summary label="Plots" value={String(rows.length)} />
        <Summary label="Briefed" value={`${completeCount}/${rows.length}`} />
        <Summary label="Risks" value={String(riskCount)} danger={riskCount > 0} />
      </View>

      <SectionCard title="Tomorrow's plot setup" subtitle="Confirm planned activity, expected trade and 8am notes">
        {rows.map(({ plot, activeStage, saved }) => {
          const item = saved ?? {
            liveTomorrow: true,
            plannedActivity: activeStage?.stageName ?? '',
            expectedTrade: activeStage?.trade ?? '',
            programmeRisk: false,
            notesFor8am: '',
            briefingComplete: false,
          };

          return (
            <View key={plot.id} style={styles.plotCard}>
              <View style={styles.plotHeader}>
                <View style={styles.plotTitleWrap}>
                  <Text style={styles.plotName}>{plot.plotName}</Text>
                  <Text style={styles.plotMeta}>{plot.phase} · {activeStage?.stageName ?? 'No active stage'}</Text>
                </View>
                <Pressable
                  style={[styles.chip, item.liveTomorrow ? styles.chipActive : null]}
                  onPress={() => upsertDabsBriefing(plot.id, briefingDate, { liveTomorrow: !item.liveTomorrow, plotStageId: activeStage?.id })}
                >
                  <Text style={[styles.chipText, item.liveTomorrow ? styles.chipTextActive : null]}>{item.liveTomorrow ? 'Live tomorrow' : 'Not live'}</Text>
                </Pressable>
              </View>

              <Text style={styles.label}>Planned activity</Text>
              <TextInput
                style={styles.input}
                defaultValue={item.plannedActivity}
                placeholder="e.g. 2nd lift brickwork"
                onBlur={(event) => upsertDabsBriefing(plot.id, briefingDate, { plannedActivity: event.nativeEvent.text, plotStageId: activeStage?.id })}
              />

              <Text style={styles.label}>Expected trade</Text>
              <TextInput
                style={styles.input}
                defaultValue={item.expectedTrade}
                placeholder="e.g. Brickwork"
                onBlur={(event) => upsertDabsBriefing(plot.id, briefingDate, { expectedTrade: event.nativeEvent.text, plotStageId: activeStage?.id })}
              />

              <Text style={styles.label}>Notes for 8am walk</Text>
              <TextInput
                style={[styles.input, styles.notes]}
                defaultValue={item.notesFor8am}
                placeholder="What needs checking first thing?"
                multiline
                onBlur={(event) => upsertDabsBriefing(plot.id, briefingDate, { notesFor8am: event.nativeEvent.text, plotStageId: activeStage?.id })}
              />

              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.chip, item.programmeRisk ? styles.riskChip : null]}
                  onPress={() => upsertDabsBriefing(plot.id, briefingDate, { programmeRisk: !item.programmeRisk, plotStageId: activeStage?.id })}
                >
                  <Text style={[styles.chipText, item.programmeRisk ? styles.chipTextActive : null]}>Programme risk</Text>
                </Pressable>
                <Pressable
                  style={[styles.chip, item.briefingComplete ? styles.doneChip : null]}
                  onPress={() => upsertDabsBriefing(plot.id, briefingDate, { briefingComplete: !item.briefingComplete, plotStageId: activeStage?.id })}
                >
                  <Text style={[styles.chipText, item.briefingComplete ? styles.doneText : null]}>{item.briefingComplete ? 'Briefed' : 'Mark briefed'}</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </SectionCard>
    </AppScreen>
  );
}

function Summary({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View style={[styles.summary, danger ? styles.summaryDanger : null]}>
      <Text style={[styles.summaryValue, danger ? styles.summaryValueDanger : null]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  eyebrow: { color: '#2563eb', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summary: { flex: 1, minWidth: 120, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 16 },
  summaryDanger: { borderColor: '#fecaca', backgroundColor: '#fff7f7' },
  summaryValue: { color: '#0f172a', fontSize: 24, fontWeight: '900' },
  summaryValueDanger: { color: '#dc2626' },
  summaryLabel: { color: '#64748b', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  plotCard: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 14, gap: 9 },
  plotHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' },
  plotTitleWrap: { flex: 1, minWidth: 210 },
  plotName: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  plotMeta: { color: '#64748b', fontSize: 12, marginTop: 3 },
  label: { color: '#475569', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', backgroundColor: '#ffffff' },
  notes: { minHeight: 64, textAlignVertical: 'top' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff' },
  chipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  riskChip: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  doneChip: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  chipText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  chipTextActive: { color: '#ffffff' },
  doneText: { color: '#166534' },
});

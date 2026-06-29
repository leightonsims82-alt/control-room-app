import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { getMilestoneForWeek, getStage1StartWeek, WEEK_NUMBERS } from '../../utils/siteProgrammeEngine';

export default function MasterProgrammeScreen() {
  const { sitePlots, upsertSitePlot, removeSitePlot } = useSitePlanner();
  const [plotNo, setPlotNo] = useState('105');
  const [stage9Week, setStage9Week] = useState('26');

  const savePlot = async () => {
    const parsedWeek = Number(stage9Week);
    if (!plotNo.trim() || !Number.isFinite(parsedWeek)) return;
    await upsertSitePlot({ plotNo, stage9CompleteWeek: parsedWeek });
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Master 23 Week Build</Text>
        <Text style={styles.subtitle}>Milestone completion view. Enter plot number and Stage 9 complete week; the app calculates Stage 1 start and all milestone weeks.</Text>
      </View>

      <SectionCard title="Add / update plot" subtitle="This replaces the Excel input columns: Plot No and Stage 9 Complete Week">
        <View style={styles.formRow}>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Plot No</Text>
            <TextInput value={plotNo} onChangeText={setPlotNo} style={styles.input} placeholder="101" />
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Stage 9 Complete Week</Text>
            <TextInput value={stage9Week} onChangeText={setStage9Week} style={styles.input} keyboardType="number-pad" placeholder="23" />
          </View>
          <Pressable style={styles.saveButton} onPress={savePlot}>
            <Text style={styles.saveButtonText}>Save Plot</Text>
          </Pressable>
        </View>
      </SectionCard>

      <SectionCard title="Master 23 Week Build Programme" subtitle="Only stage numbers appear in the week they complete: 1, 2, 4, 5, 6, 7, 8, 9">
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={styles.tableRow}>
              <Text style={[styles.headerCell, styles.plotCell]}>Plot No</Text>
              <Text style={[styles.headerCell, styles.weekInputCell]}>Stage 9 Complete Week</Text>
              <Text style={[styles.headerCell, styles.weekInputCell]}>Stage 1 Start Week</Text>
              {WEEK_NUMBERS.map((week) => (
                <Text key={week} style={styles.weekHeader}>WK{String(week).padStart(2, '0')}</Text>
              ))}
              <Text style={[styles.headerCell, styles.actionCell]}>Action</Text>
            </View>

            {sitePlots.map((plot, rowIndex) => (
              <View key={plot.id} style={[styles.tableRow, rowIndex % 2 ? styles.altRow : null]}>
                <Text style={[styles.bodyCell, styles.plotCell]}>{plot.plotNo}</Text>
                <Text style={[styles.bodyCell, styles.weekInputBody]}>{plot.stage9CompleteWeek}</Text>
                <Text style={[styles.bodyCell, styles.stageStartBody]}>{getStage1StartWeek(plot)}</Text>
                {WEEK_NUMBERS.map((week) => (
                  <Text key={week} style={styles.weekCell}>{getMilestoneForWeek(plot, week)}</Text>
                ))}
                <Pressable style={styles.removeButton} onPress={() => removeSitePlot(plot.id)}>
                  <Text style={styles.removeButtonText}>Remove</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  formRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' },
  inputWrap: { gap: 6, minWidth: 180, flex: 1 },
  label: { color: '#334155', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', fontWeight: '800' },
  saveButton: { backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  saveButtonText: { color: '#ffffff', fontWeight: '900' },
  tableRow: { flexDirection: 'row', minHeight: 38, alignItems: 'stretch' },
  altRow: { backgroundColor: '#eaf2fb' },
  headerCell: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 8, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  plotCell: { width: 90 },
  weekInputCell: { width: 150 },
  actionCell: { width: 86 },
  weekHeader: { width: 58, backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 8, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  bodyCell: { color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '800' },
  weekInputBody: { width: 150, backgroundColor: '#fff4cc', color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '900' },
  stageStartBody: { width: 150, backgroundColor: '#e3f3d8', color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '900' },
  weekCell: { width: 58, color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '900' },
  removeButton: { width: 86, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#c8d7e6' },
  removeButtonText: { color: '#dc2626', fontSize: 12, fontWeight: '900' },
});

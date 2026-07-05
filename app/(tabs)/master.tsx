import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { WEEK_NUMBERS } from '../../utils/siteProgrammeEngine';
import { getMilestoneForPlotWeek, getStage1StartWeekForPlot, getTemplateForPlot } from '../../utils/templateProgramme';

function getShortWeekDate(week: number) {
  const year = new Date().getFullYear();
  const firstThursday = new Date(year, 0, 4);
  const firstMonday = new Date(firstThursday);
  const day = firstThursday.getDay() || 7;
  firstMonday.setDate(firstThursday.getDate() - day + 1);

  const weekStart = new Date(firstMonday);
  weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);

  const date = String(weekStart.getDate()).padStart(2, '0');
  const month = String(weekStart.getMonth() + 1).padStart(2, '0');
  return `${date}/${month}`;
}

export default function MasterProgrammeScreen() {
  const { sitePlots, plotTemplates, upsertSitePlot, removeSitePlot } = useSitePlanner();
  const [plotNo, setPlotNo] = useState('105');
  const [stage9Week, setStage9Week] = useState('26');
  const [templateId, setTemplateId] = useState(plotTemplates[2]?.id ?? 'threeBed');

  const savePlot = async () => {
    const parsedWeek = Number(stage9Week);
    if (!plotNo.trim() || !Number.isFinite(parsedWeek)) return;
    await upsertSitePlot({ plotNo, stage9CompleteWeek: parsedWeek, templateId });
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Master 23 Week Build</Text>
        <Text style={styles.subtitle}>Milestone completion view. Add a plot, choose its house type template, and enter the Stage 9 complete week.</Text>
      </View>

      <SectionCard title="Add / update plot" subtitle="Plot template controls the build duration and task durations used by the plot breakdown.">
        <View style={styles.formRow}>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Plot No</Text>
            <TextInput value={plotNo} onChangeText={setPlotNo} style={styles.input} placeholder="101" />
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Stage 9 Complete Week</Text>
            <TextInput value={stage9Week} onChangeText={setStage9Week} style={styles.input} keyboardType="number-pad" placeholder="23" />
          </View>
          <View style={styles.inputWrapWide}>
            <Text style={styles.label}>Plot template</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.templateChips}>
                {plotTemplates.map((template) => {
                  const active = template.id === templateId;
                  return (
                    <Pressable key={template.id} style={[styles.templateChip, active ? styles.templateChipActive : null]} onPress={() => setTemplateId(template.id)}>
                      <Text style={[styles.templateChipText, active ? styles.templateChipTextActive : null]}>{template.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
          <Pressable style={styles.saveButton} onPress={savePlot}>
            <Text style={styles.saveButtonText}>Save Plot</Text>
          </Pressable>
        </View>
      </SectionCard>

      <SectionCard title="Master Build Programme" subtitle="Milestone numbers are generated from each plot template, so a 2 bed, 5 bed or apartment can run to different programme lengths.">
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={styles.tableRow}>
              <Text style={[styles.headerCell, styles.plotCell]}>Plot No</Text>
              <Text style={[styles.headerCell, styles.templateCell]}>Template</Text>
              <Text style={[styles.headerCell, styles.weekInputCell]}>Stage 9 Complete Week</Text>
              <Text style={[styles.headerCell, styles.weekInputCell]}>Stage 1 Start Week</Text>
              {WEEK_NUMBERS.map((week) => (
                <View key={week} style={styles.weekHeader}>
                  <Text style={styles.weekHeaderDate}>{getShortWeekDate(week)}</Text>
                  <Text style={styles.weekHeaderLabel}>WK{String(week).padStart(2, '0')}</Text>
                </View>
              ))}
              <Text style={[styles.headerCell, styles.actionCell]}>Action</Text>
            </View>

            {sitePlots.map((plot, rowIndex) => {
              const template = getTemplateForPlot(plot, plotTemplates);
              return (
                <View key={plot.id} style={[styles.tableRow, rowIndex % 2 ? styles.altRow : null]}>
                  <Text style={[styles.bodyCell, styles.plotCell]}>{plot.plotNo}</Text>
                  <Text style={[styles.bodyCell, styles.templateCell]}>{template.name}</Text>
                  <Text style={[styles.weekInputBody, styles.weekInputCell]}>{plot.stage9CompleteWeek}</Text>
                  <Text style={[styles.stageStartBody, styles.weekInputCell]}>{getStage1StartWeekForPlot(plot, plotTemplates)}</Text>
                  {WEEK_NUMBERS.map((week) => (
                    <Text key={week} style={styles.weekCell}>{getMilestoneForPlotWeek(plot, week, plotTemplates)}</Text>
                  ))}
                  <Pressable style={styles.removeButton} onPress={() => removeSitePlot(plot.id)}>
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </Pressable>
                </View>
              );
            })}
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
  inputWrapWide: { gap: 6, minWidth: 260, flex: 2 },
  label: { color: '#334155', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', fontWeight: '800' },
  saveButton: { backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  saveButtonText: { color: '#ffffff', fontWeight: '900' },
  templateChips: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  templateChip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff' },
  templateChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  templateChipText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  templateChipTextActive: { color: '#ffffff' },
  tableRow: { flexDirection: 'row', minHeight: 38, alignItems: 'stretch' },
  altRow: { backgroundColor: '#eaf2fb' },
  headerCell: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 8, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  plotCell: { width: 90 },
  templateCell: { width: 120 },
  weekInputCell: { width: 150 },
  actionCell: { width: 86 },
  weekHeader: { width: 58, backgroundColor: '#173b5f', borderWidth: 1, borderColor: '#9fb6ce', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, paddingVertical: 3 },
  weekHeaderDate: { color: '#c7d2fe', fontWeight: '900', fontSize: 8.5, lineHeight: 10 },
  weekHeaderLabel: { color: '#ffffff', fontWeight: '900', fontSize: 11, lineHeight: 13 },
  bodyCell: { color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '800' },
  weekInputBody: { backgroundColor: '#fff4cc', color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '900' },
  stageStartBody: { backgroundColor: '#e3f3d8', color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '900' },
  weekCell: { width: 58, color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '900' },
  removeButton: { width: 86, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#c8d7e6' },
  removeButtonText: { color: '#dc2626', fontSize: 12, fontWeight: '900' },
});
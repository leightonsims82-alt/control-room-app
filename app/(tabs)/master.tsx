import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { PROGRAMME_STAGE_SEQUENCE, WEEK_NUMBERS } from '../../utils/siteProgrammeEngine';
import { getStage1StartWeekForPlot, getStageNumberForPlotWeek, getTemplateForPlot } from '../../utils/templateProgramme';

export default function MasterProgrammeScreen() {
  const { sitePlots, plotTemplates, upsertSitePlot, removeSitePlot } = useSitePlanner();
  const [plotNo, setPlotNo] = useState('');
  const [preHandoverWeek, setPreHandoverWeek] = useState('');
  const [templateId, setTemplateId] = useState(plotTemplates[2]?.id ?? 'threeBed');
  const nextPlotHint = String(sitePlots.length + 1);
  const nextPreHandoverHint = String((sitePlots.length ? Math.max(...sitePlots.map((plot) => plot.stage9CompleteWeek)) : 22) + 1);

  const savePlot = async () => {
    const parsedWeek = Number(preHandoverWeek);
    if (!plotNo.trim() || !Number.isFinite(parsedWeek) || parsedWeek <= 0) return;
    await upsertSitePlot({ plotNo, stage9CompleteWeek: parsedWeek, templateId });
    setPlotNo('');
    setPreHandoverWeek('');
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Master 23 Week Programme</Text>
        <Text style={styles.subtitle}>Excel-style stage matrix. One row per plot, week columns across the top, stage numbers only in the cells.</Text>
      </View>

      <SectionCard title="Plot input" subtitle="Enter the plot number and pre-handover week. The boxes stay blank until you type into them.">
        <View style={styles.formRow}>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Plot No</Text>
            <TextInput value={plotNo} onChangeText={setPlotNo} style={styles.input} placeholder={`e.g. ${nextPlotHint}`} />
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Pre-handover week</Text>
            <TextInput value={preHandoverWeek} onChangeText={setPreHandoverWeek} style={styles.input} keyboardType="number-pad" placeholder={`e.g. ${nextPreHandoverHint}`} />
          </View>
          <View style={styles.inputWrapWide}>
            <Text style={styles.label}>House type</Text>
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

      <SectionCard title="Master stage-number matrix" subtitle="Numbers only. Use the stage key below for meanings.">
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={styles.tableRow}>
              <Text style={[styles.headerCell, styles.plotCell]}>Plot</Text>
              <Text style={[styles.headerCell, styles.templateCell]}>Type</Text>
              <Text style={[styles.headerCell, styles.weekInputCell]}>Start</Text>
              <Text style={[styles.headerCell, styles.weekInputCell]}>Pre-H/O</Text>
              {WEEK_NUMBERS.map((week) => (
                <Text key={week} style={styles.weekHeader}>WK{String(week).padStart(2, '0')}</Text>
              ))}
              <Text style={[styles.headerCell, styles.actionCell]}>Action</Text>
            </View>

            {sitePlots.map((plot, rowIndex) => {
              const template = getTemplateForPlot(plot, plotTemplates);
              return (
                <View key={plot.id} style={[styles.tableRow, rowIndex % 2 ? styles.altRow : null]}>
                  <Text style={[styles.bodyCell, styles.plotCell]}>{plot.plotNo}</Text>
                  <Text style={[styles.bodyCell, styles.templateCell]}>{template.name}</Text>
                  <Text style={[styles.stageStartBody, styles.weekInputCell]}>WK{String(getStage1StartWeekForPlot(plot, plotTemplates)).padStart(2, '0')}</Text>
                  <Text style={[styles.weekInputBody, styles.weekInputCell]}>WK{String(plot.stage9CompleteWeek).padStart(2, '0')}</Text>
                  {WEEK_NUMBERS.map((week) => {
                    const stage = getStageNumberForPlotWeek(plot, week, plotTemplates);
                    return <Text key={week} style={[styles.weekCell, stage ? styles.activeWeekCell : null]}>{stage}</Text>;
                  })}
                  <Pressable style={styles.removeButton} onPress={() => removeSitePlot(plot.id)}>
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SectionCard>

      <SectionCard title="Stage key" subtitle="This is the key behind the number-only cells.">
        <View style={styles.stageKeyGrid}>
          {PROGRAMME_STAGE_SEQUENCE.map((stage) => (
            <View key={stage.stage} style={styles.stageKeyItem}>
              <Text style={styles.stageKeyNumber}>{stage.stage}</Text>
              <View style={styles.stageKeyTextWrap}>
                <Text style={styles.stageKeyLabel}>{stage.label}</Text>
                <Text style={styles.stageKeyMeta}>{stage.durationWeeks} week{stage.durationWeeks === 1 ? '' : 's'}</Text>
              </View>
            </View>
          ))}
        </View>
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
  altRow: { backgroundColor: '#f8fbff' },
  headerCell: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 8, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  plotCell: { width: 90 },
  templateCell: { width: 118 },
  weekInputCell: { width: 104 },
  actionCell: { width: 86 },
  weekHeader: { width: 58, backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 8, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  bodyCell: { color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '800' },
  weekInputBody: { backgroundColor: '#fff4cc', color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '900' },
  stageStartBody: { backgroundColor: '#e3f3d8', color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '900' },
  weekCell: { width: 58, color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '900' },
  activeWeekCell: { backgroundColor: '#dff0ff' },
  removeButton: { width: 86, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#c8d7e6' },
  removeButtonText: { color: '#dc2626', fontSize: 12, fontWeight: '900' },
  stageKeyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stageKeyItem: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 240, flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 10 },
  stageKeyNumber: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#173b5f', color: '#ffffff', textAlign: 'center', lineHeight: 34, fontWeight: '900' },
  stageKeyTextWrap: { flex: 1 },
  stageKeyLabel: { color: '#0f172a', fontWeight: '900' },
  stageKeyMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
});

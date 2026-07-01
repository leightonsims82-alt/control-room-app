import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { SitePlotInput, useSitePlanner } from '../../data/sitePlannerStore';
import { PROGRAMME_STAGE_SEQUENCE, WEEK_NUMBERS } from '../../utils/siteProgrammeEngine';
import { getHouseTypeLabel, getPlotBuildOrder, getSortedSitePlots, getStage1StartWeekForPlot, getStageNumberForPlotWeek, getTemplateForPlot } from '../../utils/templateProgramme';

export default function MasterProgrammeScreen() {
  const { sitePlots, plotTemplates, upsertSitePlot, bulkUpsertSitePlots, removeSitePlot } = useSitePlanner();
  const sortedPlots = useMemo(() => getSortedSitePlots(sitePlots), [sitePlots]);
  const [plotNo, setPlotNo] = useState('');
  const [buildOrder, setBuildOrder] = useState('');
  const [preHandoverWeek, setPreHandoverWeek] = useState('');
  const [templateId, setTemplateId] = useState(plotTemplates[2]?.id ?? 'threeBed');
  const [bulkText, setBulkText] = useState('');
  const nextPlotHint = String(sitePlots.length + 1);
  const nextBuildOrderHint = String(sitePlots.length + 1);
  const nextPreHandoverHint = String((sitePlots.length ? Math.max(...sitePlots.map((plot) => plot.stage9CompleteWeek)) : 22) + 1);

  const findTemplateId = (houseTypeText: string) => {
    const clean = houseTypeText.trim().toLowerCase();
    if (!clean) return templateId;
    const matched = plotTemplates.find((template) =>
      template.id.toLowerCase() === clean ||
      template.name.toLowerCase() === clean ||
      template.houseTypeCode.toLowerCase() === clean ||
      getHouseTypeLabel(template).toLowerCase() === clean,
    );
    return matched?.id ?? templateId;
  };

  const savePlot = async () => {
    const parsedWeek = Number(preHandoverWeek);
    if (!plotNo.trim() || !Number.isFinite(parsedWeek) || parsedWeek <= 0) return;
    await upsertSitePlot({
      plotNo,
      buildOrder: Number(buildOrder) || sitePlots.length + 1,
      stage9CompleteWeek: parsedWeek,
      templateId,
    });
    setPlotNo('');
    setBuildOrder('');
    setPreHandoverWeek('');
  };

  const importBulkPlots = async () => {
    const inputs = parseBulkPlotText(bulkText, findTemplateId);
    if (!inputs.length) return;
    await bulkUpsertSitePlots(inputs);
    setBulkText('');
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Master 23 Week Programme</Text>
        <Text style={styles.subtitle}>Excel-style stage matrix ordered by build sequence, not plot number. Stage numbers only in the cells.</Text>
      </View>

      <SectionCard title="Plot input" subtitle="Enter the build order as well as the plot number. This stops the programme assuming plots are built numerically.">
        <View style={styles.formRow}>
          <View style={styles.inputWrapSmall}>
            <Text style={styles.label}>Build Order</Text>
            <TextInput value={buildOrder} onChangeText={setBuildOrder} style={styles.input} keyboardType="number-pad" placeholder={`e.g. ${nextBuildOrderHint}`} />
          </View>
          <View style={styles.inputWrapSmall}>
            <Text style={styles.label}>Plot No</Text>
            <TextInput value={plotNo} onChangeText={setPlotNo} style={styles.input} placeholder={`e.g. ${nextPlotHint}`} />
          </View>
          <View style={styles.inputWrapSmall}>
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
                      <Text style={[styles.templateChipText, active ? styles.templateChipTextActive : null]}>{getHouseTypeLabel(template)}</Text>
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

      <SectionCard title="Bulk plot entry" subtitle="Paste multiple plots at once: Build Order, Plot No, House Type Code, Pre-Handover Week. Plot numbers do not need to be in sequence.">
        <TextInput
          value={bulkText}
          onChangeText={setBulkText}
          multiline
          placeholder={'1, 24, HT-A, 33\n2, 18, HT-B, 34\n3, 31, 3B, 35\n4, 12, 4B, 36'}
          style={styles.bulkInput}
        />
        <View style={styles.bulkFooter}>
          <Text style={styles.bulkHelp}>Format: build order, plot no, house type/code, pre-handover week. Commas or tabs both work.</Text>
          <Pressable style={styles.saveButton} onPress={importBulkPlots}>
            <Text style={styles.saveButtonText}>Import Plots</Text>
          </Pressable>
        </View>
      </SectionCard>

      <SectionCard title="Master stage-number matrix" subtitle="Sorted by Build Order. Numbers only. Use the stage key below for meanings.">
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={styles.tableRow}>
              <Text style={[styles.headerCell, styles.buildCell]}>Build</Text>
              <Text style={[styles.headerCell, styles.plotCell]}>Plot</Text>
              <Text style={[styles.headerCell, styles.templateCell]}>Type</Text>
              <Text style={[styles.headerCell, styles.weekInputCell]}>Start</Text>
              <Text style={[styles.headerCell, styles.weekInputCell]}>Pre-H/O</Text>
              {WEEK_NUMBERS.map((week) => (
                <Text key={week} style={styles.weekHeader}>WK{String(week).padStart(2, '0')}</Text>
              ))}
              <Text style={[styles.headerCell, styles.actionCell]}>Action</Text>
            </View>

            {sortedPlots.map((plot, rowIndex) => {
              const template = getTemplateForPlot(plot, plotTemplates);
              return (
                <View key={plot.id} style={[styles.tableRow, rowIndex % 2 ? styles.altRow : null]}>
                  <Text style={[styles.bodyCell, styles.buildCell]}>{getPlotBuildOrder(plot, rowIndex)}</Text>
                  <Text style={[styles.bodyCell, styles.plotCell]}>{plot.plotNo}</Text>
                  <Text style={[styles.bodyCell, styles.templateCell]}>{getHouseTypeLabel(template)}</Text>
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

function parseBulkPlotText(text: string, findTemplateId: (houseTypeText: string) => string): SitePlotInput[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/[\t,]+/).map((part) => part.trim()))
    .map(([buildOrder, plotNo, houseType, preHandoverWeek]) => ({
      buildOrder: Number(buildOrder),
      plotNo: plotNo || '',
      templateId: findTemplateId(houseType || ''),
      stage9CompleteWeek: Number(preHandoverWeek),
    }))
    .filter((item) => item.plotNo && Number.isFinite(item.stage9CompleteWeek) && item.stage9CompleteWeek > 0);
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  formRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' },
  inputWrapSmall: { gap: 6, minWidth: 140, flex: 1 },
  inputWrapWide: { gap: 6, minWidth: 260, flex: 2 },
  label: { color: '#334155', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', fontWeight: '800' },
  bulkInput: { minHeight: 130, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, color: '#0f172a', fontWeight: '800', textAlignVertical: 'top' },
  bulkFooter: { flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  bulkHelp: { flex: 1, minWidth: 280, color: '#64748b', fontSize: 12, lineHeight: 18 },
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
  buildCell: { width: 76 },
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

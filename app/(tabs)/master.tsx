import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { SitePlotInput, useSitePlanner } from '../../data/sitePlannerStore';
import { PROGRAMME_STAGE_SEQUENCE, ProgrammeStageNumber, WEEK_NUMBERS } from '../../utils/siteProgrammeEngine';
import {
  getHouseTypeLabel,
  getPlotBuildOrder,
  getPlotHoldDetail,
  getPlotHoldLabel,
  getSortedSitePlots,
  getStage1StartWeekForPlot,
  getStageLabelForNumber,
  getStageNumberForPlotWeek,
  getTemplateForPlot,
} from '../../utils/templateProgramme';

type ResetMode = 'all' | 'single';

export default function MasterProgrammeScreen() {
  const { sitePlots, plotTemplates, upsertSitePlot, bulkUpsertSitePlots, removeSitePlot, clearSitePlotData, holdPlotAtStage } = useSitePlanner();
  const sortedPlots = useMemo(() => getSortedSitePlots(sitePlots), [sitePlots]);
  const [plotNo, setPlotNo] = useState('');
  const [buildOrder, setBuildOrder] = useState('');
  const [preHandoverWeek, setPreHandoverWeek] = useState('');
  const [templateId, setTemplateId] = useState(plotTemplates[2]?.id ?? 'threeBed');
  const [bulkText, setBulkText] = useState('');
  const [resetMode, setResetMode] = useState<ResetMode>('single');
  const [selectedResetPlotId, setSelectedResetPlotId] = useState('');
  const [clearConfirm, setClearConfirm] = useState(false);
  const [holdPlotId, setHoldPlotId] = useState('');
  const [holdStage, setHoldStage] = useState<ProgrammeStageNumber | undefined>();
  const [holdReason, setHoldReason] = useState('');
  const selectedResetPlot = sortedPlots.find((plot) => plot.id === selectedResetPlotId) ?? sortedPlots[0];
  const selectedHoldPlot = sortedPlots.find((plot) => plot.id === holdPlotId) ?? sortedPlots[0];
  const nextPlotHint = String(sitePlots.length + 1);
  const nextBuildOrderHint = String(sitePlots.length + 1);
  const nextPreHandoverHint = String((sitePlots.length ? Math.max(...sitePlots.map((plot) => plot.stage9CompleteWeek)) : 22) + 1);

  useEffect(() => {
    if (!selectedResetPlotId && sortedPlots[0]?.id) setSelectedResetPlotId(sortedPlots[0].id);
    if (!holdPlotId && sortedPlots[0]?.id) {
      setHoldPlotId(sortedPlots[0].id);
      setHoldStage(sortedPlots[0].holdStage);
      setHoldReason(sortedPlots[0].holdReason ?? '');
    }
  }, [holdPlotId, selectedResetPlotId, sortedPlots]);

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
    setClearConfirm(false);
  };

  const importBulkPlots = async () => {
    const inputs = parseBulkPlotText(bulkText, findTemplateId);
    if (!inputs.length) return;
    await bulkUpsertSitePlots(inputs);
    setBulkText('');
    setClearConfirm(false);
  };

  const selectResetMode = (mode: ResetMode) => {
    setResetMode(mode);
    setClearConfirm(false);
  };

  const selectResetPlot = (plotId: string) => {
    setSelectedResetPlotId(plotId);
    setClearConfirm(false);
  };

  const clearRequestedPlotData = async () => {
    if (!sitePlots.length) return;
    if (!clearConfirm) {
      setClearConfirm(true);
      return;
    }
    if (resetMode === 'all') {
      await clearSitePlotData();
    } else if (selectedResetPlot) {
      await removeSitePlot(selectedResetPlot.id);
    }
    setClearConfirm(false);
  };

  const selectHoldPlot = (plotId: string) => {
    const plot = sortedPlots.find((item) => item.id === plotId);
    setHoldPlotId(plotId);
    setHoldStage(plot?.holdStage);
    setHoldReason(plot?.holdReason ?? '');
  };

  const applyStageHold = async () => {
    if (!selectedHoldPlot || !holdStage) return;
    await holdPlotAtStage({ plotId: selectedHoldPlot.id, holdStage, holdReason });
  };

  const releaseStageHold = async () => {
    if (!selectedHoldPlot) return;
    await holdPlotAtStage({ plotId: selectedHoldPlot.id });
    setHoldStage(undefined);
    setHoldReason('');
  };

  const clearButtonLabel = (() => {
    if (!sitePlots.length) return 'No Plot Data To Clear';
    if (resetMode === 'all') return clearConfirm ? 'Confirm Clear All Plot Data' : `Clear All ${sitePlots.length} Plots`;
    return clearConfirm ? `Confirm Clear Plot ${selectedResetPlot?.plotNo ?? ''}` : `Clear Plot ${selectedResetPlot?.plotNo ?? ''}`;
  })();

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

      <SectionCard title="Hold plot at stage" subtitle="Use this when a plot has stopped and should not progress into later stages until released.">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.templateChips}>
            {sortedPlots.map((plot) => (
              <Pressable key={plot.id} style={[styles.templateChip, plot.id === selectedHoldPlot?.id ? styles.templateChipActive : null]} onPress={() => selectHoldPlot(plot.id)}>
                <Text style={[styles.templateChipText, plot.id === selectedHoldPlot?.id ? styles.templateChipTextActive : null]}>Plot {plot.plotNo}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <View style={styles.holdPanel}>
          <Text style={styles.holdStatus}>{selectedHoldPlot ? getPlotHoldDetail(selectedHoldPlot) : 'No plot selected.'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.stageChips}>
              {PROGRAMME_STAGE_SEQUENCE.map((stage) => {
                const active = holdStage === stage.stage;
                return (
                  <Pressable key={stage.stage} style={[styles.stageChip, active ? styles.stageChipActive : null]} onPress={() => setHoldStage(stage.stage)}>
                    <Text style={[styles.stageChipNumber, active ? styles.stageChipTextActive : null]}>Stage {stage.stage}</Text>
                    <Text style={[styles.stageChipLabel, active ? styles.stageChipTextActive : null]}>{stage.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <TextInput value={holdReason} onChangeText={setHoldReason} placeholder="Reason for hold e.g. awaiting scaffold, materials, QA recheck" style={styles.input} />
          <View style={styles.buttonRow}>
            <Pressable disabled={!selectedHoldPlot || !holdStage} style={[styles.saveButton, !selectedHoldPlot || !holdStage ? styles.disabledButton : null]} onPress={applyStageHold}>
              <Text style={styles.saveButtonText}>{holdStage ? `Hold At Stage ${holdStage}` : 'Select Stage To Hold'}</Text>
            </Pressable>
            <Pressable disabled={!selectedHoldPlot?.holdStage} style={[styles.releaseButton, !selectedHoldPlot?.holdStage ? styles.disabledButton : null]} onPress={releaseStageHold}>
              <Text style={styles.releaseButtonText}>Release Hold</Text>
            </Pressable>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Reset plot data" subtitle="Choose whether to clear every plot or only one selected plot. A second confirmation press is required.">
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Warning</Text>
          <Text style={styles.warningText}>Clearing plot data removes programme rows, delays, dragged trade moves, programme notes and QA records for the selected option. House type templates and site setup stay in place.</Text>
        </View>
        <View style={styles.modeRow}>
          <Pressable style={[styles.modeButton, resetMode === 'single' ? styles.modeButtonActive : null]} onPress={() => selectResetMode('single')}>
            <Text style={[styles.modeButtonText, resetMode === 'single' ? styles.modeButtonTextActive : null]}>Individual Plot</Text>
          </Pressable>
          <Pressable style={[styles.modeButton, resetMode === 'all' ? styles.modeButtonActiveDanger : null]} onPress={() => selectResetMode('all')}>
            <Text style={[styles.modeButtonText, resetMode === 'all' ? styles.modeButtonTextActive : null]}>Clear All Plots</Text>
          </Pressable>
        </View>
        {resetMode === 'single' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.templateChips}>
              {sortedPlots.map((plot) => (
                <Pressable key={plot.id} style={[styles.templateChip, plot.id === selectedResetPlot?.id ? styles.templateChipActive : null]} onPress={() => selectResetPlot(plot.id)}>
                  <Text style={[styles.templateChipText, plot.id === selectedResetPlot?.id ? styles.templateChipTextActive : null]}>Plot {plot.plotNo}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : null}
        <Text style={styles.resetText}>{resetMode === 'all' ? `You are about to clear all ${sitePlots.length} saved plots from this device.` : `You are about to clear Plot ${selectedResetPlot?.plotNo ?? '-'} only.`}</Text>
        {clearConfirm ? <Text style={styles.confirmText}>Confirm this action by pressing the button again.</Text> : null}
        <Pressable
          disabled={!sitePlots.length || (resetMode === 'single' && !selectedResetPlot)}
          style={[styles.clearButton, clearConfirm ? styles.clearButtonArmed : null, !sitePlots.length ? styles.clearButtonDisabled : null]}
          onPress={clearRequestedPlotData}
        >
          <Text style={styles.clearButtonText}>{clearButtonLabel}</Text>
        </Pressable>
      </SectionCard>

      <SectionCard title="Master stage-number matrix" subtitle="Sorted by Build Order. Held plots show H in the week cells and future-stage trade activities are hidden until released.">
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={styles.tableRow}>
              <Text style={[styles.headerCell, styles.buildCell]}>Build</Text>
              <Text style={[styles.headerCell, styles.plotCell]}>Plot</Text>
              <Text style={[styles.headerCell, styles.templateCell]}>Type</Text>
              <Text style={[styles.headerCell, styles.holdCell]}>Hold</Text>
              <Text style={[styles.headerCell, styles.weekInputCell]}>Start</Text>
              <Text style={[styles.headerCell, styles.weekInputCell]}>Pre-H/O</Text>
              {WEEK_NUMBERS.map((week) => (
                <Text key={week} style={styles.weekHeader}>WK{String(week).padStart(2, '0')}</Text>
              ))}
              <Text style={[styles.headerCell, styles.actionCell]}>Action</Text>
            </View>

            {sortedPlots.length === 0 ? (
              <View style={styles.emptyMatrixRow}>
                <Text style={styles.emptyMatrixText}>No plots saved. Add a plot above or paste your plot schedule into Bulk Plot Entry.</Text>
              </View>
            ) : null}

            {sortedPlots.map((plot, rowIndex) => {
              const template = getTemplateForPlot(plot, plotTemplates);
              return (
                <View key={plot.id} style={[styles.tableRow, rowIndex % 2 ? styles.altRow : null]}>
                  <Text style={[styles.bodyCell, styles.buildCell]}>{getPlotBuildOrder(plot, rowIndex)}</Text>
                  <Text style={[styles.bodyCell, styles.plotCell]}>{plot.plotNo}</Text>
                  <Text style={[styles.bodyCell, styles.templateCell]}>{getHouseTypeLabel(template)}</Text>
                  <Text style={[styles.holdBodyCell, styles.holdCell, plot.holdStage ? styles.holdBodyCellActive : null]}>{getPlotHoldLabel(plot)}</Text>
                  <Text style={[styles.stageStartBody, styles.weekInputCell]}>WK{String(getStage1StartWeekForPlot(plot, plotTemplates)).padStart(2, '0')}</Text>
                  <Text style={[styles.weekInputBody, styles.weekInputCell]}>WK{String(plot.stage9CompleteWeek).padStart(2, '0')}</Text>
                  {WEEK_NUMBERS.map((week) => {
                    const stage = getStageNumberForPlotWeek(plot, week, plotTemplates);
                    const heldStageCell = String(stage).includes('H');
                    return <Text key={week} style={[styles.weekCell, stage ? styles.activeWeekCell : null, heldStageCell ? styles.heldWeekCell : null]}>{stage}</Text>;
                  })}
                  <Pressable style={styles.removeButton} onPress={() => selectResetPlot(plot.id)}>
                    <Text style={styles.removeButtonText}>Select</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SectionCard>

      <SectionCard title="Stage key" subtitle="This is the key behind the number-only cells. Held plots show 5H at the held stage and H5 for future weeks.">
        <View style={styles.stageKeyGrid}>
          {PROGRAMME_STAGE_SEQUENCE.map((stage) => (
            <View key={stage.stage} style={styles.stageKeyItem}>
              <Text style={styles.stageKeyNumber}>{stage.stage}</Text>
              <View style={styles.stageKeyTextWrap}>
                <Text style={styles.stageKeyLabel}>{getStageLabelForNumber(stage.stage)}</Text>
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
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  disabledButton: { backgroundColor: '#cbd5e1' },
  releaseButton: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  releaseButtonText: { color: '#0f172a', fontWeight: '900' },
  holdPanel: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 14, gap: 12 },
  holdStatus: { color: '#0f172a', fontWeight: '900', lineHeight: 20 },
  stageChips: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  stageChip: { width: 150, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 10, backgroundColor: '#ffffff' },
  stageChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  stageChipNumber: { color: '#0f172a', fontSize: 12, fontWeight: '900' },
  stageChipLabel: { color: '#64748b', fontSize: 11, fontWeight: '800', marginTop: 3 },
  stageChipTextActive: { color: '#ffffff' },
  warningBox: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fdba74', borderRadius: 14, padding: 14, gap: 4 },
  warningTitle: { color: '#9a3412', fontWeight: '900' },
  warningText: { color: '#9a3412', fontSize: 13, lineHeight: 19, fontWeight: '700' },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modeButton: { borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  modeButtonActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  modeButtonActiveDanger: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  modeButtonText: { color: '#64748b', fontWeight: '900', fontSize: 12 },
  modeButtonTextActive: { color: '#ffffff' },
  resetText: { color: '#64748b', fontSize: 13, lineHeight: 20, fontWeight: '700' },
  confirmText: { color: '#dc2626', fontSize: 13, lineHeight: 20, fontWeight: '900' },
  clearButton: { alignSelf: 'flex-start', backgroundColor: '#dc2626', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  clearButtonArmed: { backgroundColor: '#991b1b' },
  clearButtonDisabled: { backgroundColor: '#cbd5e1' },
  clearButtonText: { color: '#ffffff', fontWeight: '900' },
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
  holdCell: { width: 96 },
  weekInputCell: { width: 104 },
  actionCell: { width: 86 },
  weekHeader: { width: 58, backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 8, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  bodyCell: { color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '800' },
  holdBodyCell: { color: '#64748b', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '900' },
  holdBodyCellActive: { backgroundColor: '#fee2e2', color: '#991b1b' },
  weekInputBody: { backgroundColor: '#fff4cc', color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '900' },
  stageStartBody: { backgroundColor: '#e3f3d8', color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '900' },
  weekCell: { width: 58, color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '900' },
  activeWeekCell: { backgroundColor: '#dff0ff' },
  heldWeekCell: { backgroundColor: '#fee2e2', color: '#991b1b' },
  emptyMatrixRow: { width: 1080, borderWidth: 1, borderColor: '#c8d7e6', backgroundColor: '#f8fafc', padding: 18 },
  emptyMatrixText: { color: '#64748b', fontWeight: '800' },
  removeButton: { width: 86, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#c8d7e6' },
  removeButtonText: { color: '#2563eb', fontSize: 12, fontWeight: '900' },
  stageKeyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stageKeyItem: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 240, flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 10 },
  stageKeyNumber: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#173b5f', color: '#ffffff', textAlign: 'center', lineHeight: 34, fontWeight: '900' },
  stageKeyTextWrap: { flex: 1 },
  stageKeyLabel: { color: '#0f172a', fontWeight: '900' },
  stageKeyMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
});

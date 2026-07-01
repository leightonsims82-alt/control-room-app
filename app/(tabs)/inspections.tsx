import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { useSitePlanner } from '../../data/sitePlannerStore';
import {
  CHECKLIST_DEFINITIONS,
  CustomChecklistItem,
  getChecklistDefinition,
  getChecklistItems,
  INSPECTION_STATUS_OPTIONS,
  InspectionStatus,
} from '../../utils/inspectionChecklists';
import { getConstructionMethod, getConstructionMethodLabel, getHouseTypeLabel, getSortedSitePlots, getTemplateForPlot } from '../../utils/templateProgramme';

const CUSTOM_ITEMS_KEY = 'programme-buddy:inspection-custom-items:v1';
const INSPECTION_RESULTS_KEY = 'programme-buddy:inspection-results:v1';
const INSPECTION_STORY_KEY = 'programme-buddy:plot-inspection-story:v1';

type InspectionResult = {
  status?: InspectionStatus;
  trade?: string;
  description?: string;
  imageRef?: string;
  updatedAt?: string;
};

type InspectionResults = Record<string, InspectionResult>;

type PlotInspectionStoryRecord = {
  id: string;
  plotId: string;
  checklistId: string;
  checklistTitle: string;
  activityCode?: string;
  trade?: string;
  status: 'Passed' | 'Failed' | 'Incomplete';
  completedCount: number;
  itemCount: number;
  failCount: number;
  completedAt: string;
};

function resultKey(plotId: string, checklistId: string, itemId: string) {
  return `${plotId}:${checklistId}:${itemId}`;
}

export default function InspectionsScreen() {
  const params = useLocalSearchParams<{ plotId?: string; checklistId?: string; activityCode?: string; trade?: string }>();
  const { sitePlots, plotTemplates } = useSitePlanner();
  const sortedPlots = useMemo(() => getSortedSitePlots(sitePlots), [sitePlots]);
  const [selectedPlotId, setSelectedPlotId] = useState(params.plotId ?? sortedPlots[0]?.id ?? '');
  const [selectedChecklistId, setSelectedChecklistId] = useState(params.checklistId ?? 'foundation-formation');
  const [selectedActivityCode, setSelectedActivityCode] = useState(params.activityCode ?? '');
  const [selectedTrade, setSelectedTrade] = useState(params.trade ?? '');
  const [customItems, setCustomItems] = useState<CustomChecklistItem[]>([]);
  const [results, setResults] = useState<InspectionResults>({});
  const [storyRecords, setStoryRecords] = useState<PlotInspectionStoryRecord[]>([]);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemGuidance, setNewItemGuidance] = useState('');

  useEffect(() => {
    if (params.plotId) setSelectedPlotId(params.plotId);
    if (params.checklistId) setSelectedChecklistId(params.checklistId);
    if (params.activityCode) setSelectedActivityCode(params.activityCode);
    if (params.trade) setSelectedTrade(params.trade);
  }, [params.plotId, params.checklistId, params.activityCode, params.trade]);

  useEffect(() => {
    if (!selectedPlotId && sortedPlots[0]?.id) setSelectedPlotId(sortedPlots[0].id);
  }, [selectedPlotId, sortedPlots]);

  useEffect(() => {
    async function loadInspectionData() {
      const [storedCustomItems, storedResults, storedStory] = await Promise.all([
        AsyncStorage.getItem(CUSTOM_ITEMS_KEY),
        AsyncStorage.getItem(INSPECTION_RESULTS_KEY),
        AsyncStorage.getItem(INSPECTION_STORY_KEY),
      ]);
      if (storedCustomItems) setCustomItems(JSON.parse(storedCustomItems));
      if (storedResults) setResults(JSON.parse(storedResults));
      if (storedStory) setStoryRecords(JSON.parse(storedStory));
    }
    loadInspectionData();
  }, []);

  const selectedPlot = sortedPlots.find((plot) => plot.id === selectedPlotId) ?? sortedPlots[0];
  const selectedTemplate = selectedPlot ? getTemplateForPlot(selectedPlot, plotTemplates) : plotTemplates[0];
  const constructionMethod = selectedTemplate ? getConstructionMethod(selectedTemplate) : 'traditional';
  const selectedChecklist = getChecklistDefinition(selectedChecklistId);
  const checklistItems = getChecklistItems(selectedChecklist.id, constructionMethod, customItems);
  const plotStory = storyRecords.filter((record) => record.plotId === selectedPlot?.id);
  const completedCount = selectedPlot ? checklistItems.filter((item) => results[resultKey(selectedPlot.id, selectedChecklist.id, item.id)]?.status).length : 0;
  const failCount = selectedPlot ? checklistItems.filter((item) => results[resultKey(selectedPlot.id, selectedChecklist.id, item.id)]?.status === 'Fail').length : 0;
  const inspectionStatus: PlotInspectionStoryRecord['status'] = failCount ? 'Failed' : completedCount === checklistItems.length && checklistItems.length ? 'Passed' : 'Incomplete';

  const updateResult = async (itemId: string, update: InspectionResult) => {
    if (!selectedPlot) return;
    const key = resultKey(selectedPlot.id, selectedChecklist.id, itemId);
    const nextResults = {
      ...results,
      [key]: {
        ...results[key],
        trade: results[key]?.trade ?? selectedTrade,
        ...update,
        updatedAt: new Date().toISOString(),
      },
    };
    setResults(nextResults);
    await AsyncStorage.setItem(INSPECTION_RESULTS_KEY, JSON.stringify(nextResults));
  };

  const saveInspectionToStory = async () => {
    if (!selectedPlot) return;
    const nextRecord: PlotInspectionStoryRecord = {
      id: `story-${Date.now()}`,
      plotId: selectedPlot.id,
      checklistId: selectedChecklist.id,
      checklistTitle: selectedChecklist.title,
      activityCode: selectedActivityCode,
      trade: selectedTrade,
      status: inspectionStatus,
      completedCount,
      itemCount: checklistItems.length,
      failCount,
      completedAt: new Date().toISOString(),
    };
    const nextStory = [nextRecord, ...storyRecords];
    setStoryRecords(nextStory);
    await AsyncStorage.setItem(INSPECTION_STORY_KEY, JSON.stringify(nextStory));
  };

  const addCustomItem = async () => {
    const label = newItemLabel.trim();
    if (!label) return;
    const nextItems = [
      ...customItems,
      {
        id: `custom-${Date.now()}`,
        label,
        guidance: newItemGuidance.trim(),
        createdAt: new Date().toISOString(),
      },
    ];
    setCustomItems(nextItems);
    await AsyncStorage.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(nextItems));
    setNewItemLabel('');
    setNewItemGuidance('');
  };

  const removeCustomItem = async (id: string) => {
    const nextItems = customItems.filter((item) => item.id !== id);
    setCustomItems(nextItems);
    await AsyncStorage.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(nextItems));
  };

  const openStoryRecord = (record: PlotInspectionStoryRecord) => {
    setSelectedChecklistId(record.checklistId);
    setSelectedActivityCode(record.activityCode ?? '');
    setSelectedTrade(record.trade ?? '');
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Plot QA Story</Text>
        <Text style={styles.subtitle}>Inspections are started from the programme. This page stores the story for each plot: what was inspected, when, by trade, and with images/comments.</Text>
      </View>

      <SectionCard title="Select plot" subtitle="Choose a plot to view its QA history. New inspections should be triggered from the programme cell.">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chips}>
            {sortedPlots.map((plot) => {
              const active = plot.id === selectedPlot?.id;
              return (
                <Pressable key={plot.id} style={[styles.chip, active ? styles.chipActive : null]} onPress={() => setSelectedPlotId(plot.id)}>
                  <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>Plot {plot.plotNo}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
        <View style={styles.plotSummaryGrid}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>House type</Text>
            <Text style={styles.summaryValue}>{selectedTemplate ? getHouseTypeLabel(selectedTemplate) : '-'}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Build method</Text>
            <Text style={styles.summaryValueSmall}>{getConstructionMethodLabel(constructionMethod)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>QA records</Text>
            <Text style={styles.summaryValue}>{plotStory.length}</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Current inspection" subtitle={selectedActivityCode ? `Started from programme item ${selectedActivityCode}` : 'No programme item selected. Use Inspect on the rolling 2-week programme to start a new QA check.'}>
        <View style={styles.currentHeader}>
          <View style={styles.currentMain}>
            <Text style={styles.currentTitle}>{selectedChecklist.title}</Text>
            <Text style={styles.currentMeta}>Plot {selectedPlot?.plotNo ?? '-'}{selectedTrade ? ` | ${selectedTrade}` : ''}{selectedActivityCode ? ` | ${selectedActivityCode}` : ''}</Text>
            <Text style={styles.currentDescription}>{selectedChecklist.description}</Text>
          </View>
          <View style={[styles.statusSummary, inspectionStatus === 'Failed' ? styles.statusSummaryFailed : inspectionStatus === 'Passed' ? styles.statusSummaryPassed : null]}>
            <Text style={styles.statusSummaryValue}>{inspectionStatus}</Text>
            <Text style={styles.statusSummaryMeta}>{completedCount}/{checklistItems.length} checked</Text>
          </View>
        </View>

        <View style={styles.simpleTableHeader}>
          <Text style={[styles.tableHeaderText, styles.checkCol]}>Check</Text>
          <Text style={[styles.tableHeaderText, styles.statusCol]}>Result</Text>
          <Text style={[styles.tableHeaderText, styles.tradeCol]}>Trade</Text>
          <Text style={[styles.tableHeaderText, styles.descCol]}>Description</Text>
          <Text style={[styles.tableHeaderText, styles.imageCol]}>Image</Text>
        </View>

        {checklistItems.map((item, index) => {
          const key = selectedPlot ? resultKey(selectedPlot.id, selectedChecklist.id, item.id) : '';
          const result = results[key] ?? {};
          const tradeValue = result.trade ?? selectedTrade;
          return (
            <View key={item.id} style={[styles.simpleTableRow, index % 2 ? styles.altRow : null]}>
              <View style={styles.checkCol}>
                <Text style={styles.sectionLabel}>{item.section}</Text>
                <Text style={styles.itemTitle}>{item.label}</Text>
                <Text style={styles.guidance}>{item.guidance}</Text>
                {item.photoRequired ? <Text style={styles.photoRequired}>Photo required</Text> : null}
              </View>

              <View style={styles.statusCol}>
                {INSPECTION_STATUS_OPTIONS.map((status) => {
                  const active = result.status === status;
                  return (
                    <Pressable key={status} style={[styles.statusButton, active ? styles.statusButtonActive : null, status === 'Fail' && active ? styles.statusFail : null]} onPress={() => updateResult(item.id, { status, trade: tradeValue })}>
                      <Text style={[styles.statusText, active ? styles.statusTextActive : null]}>{status}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                value={tradeValue}
                onChangeText={(trade) => updateResult(item.id, { trade })}
                placeholder="Trade"
                style={[styles.input, styles.tradeCol]}
              />
              <TextInput
                value={result.description ?? ''}
                onChangeText={(description) => updateResult(item.id, { description })}
                placeholder="Description / action"
                style={[styles.input, styles.descCol]}
                multiline
              />
              <TextInput
                value={result.imageRef ?? ''}
                onChangeText={(imageRef) => updateResult(item.id, { imageRef })}
                placeholder="Image ref"
                style={[styles.input, styles.imageCol]}
              />
            </View>
          );
        })}

        <Pressable style={styles.saveButton} onPress={saveInspectionToStory}>
          <Text style={styles.saveButtonText}>Save Inspection to Plot Story</Text>
        </Pressable>
      </SectionCard>

      <SectionCard title={`Plot ${selectedPlot?.plotNo ?? ''} QA story`} subtitle="Saved inspection records for this plot. This becomes the QA timeline for the plot.">
        {plotStory.length === 0 ? <Text style={styles.empty}>No saved QA records for this plot yet. Start from the rolling programme and save the inspection.</Text> : null}
        {plotStory.map((record) => (
          <View key={record.id} style={styles.storyRow}>
            <View style={styles.storyMain}>
              <Text style={styles.storyTitle}>{record.checklistTitle}</Text>
              <Text style={styles.storyMeta}>{record.activityCode || 'Manual QA'}{record.trade ? ` | ${record.trade}` : ''} | {new Date(record.completedAt).toLocaleDateString()}</Text>
              <Text style={styles.storyMeta}>{record.completedCount}/{record.itemCount} checked · {record.failCount} failed</Text>
            </View>
            <View style={[styles.storyStatus, record.status === 'Failed' ? styles.storyFailed : record.status === 'Passed' ? styles.storyPassed : null]}>
              <Text style={styles.storyStatusText}>{record.status}</Text>
            </View>
            <Pressable style={styles.openButton} onPress={() => openStoryRecord(record)}>
              <Text style={styles.openButtonText}>Open</Text>
            </Pressable>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Custom checks" subtitle="Optional site-specific checks. These are added to every inspection checklist.">
        <View style={styles.addCustomGrid}>
          <TextInput value={newItemLabel} onChangeText={setNewItemLabel} placeholder="New checklist item" style={styles.customInput} />
          <TextInput value={newItemGuidance} onChangeText={setNewItemGuidance} placeholder="Tolerance / guidance shown in app" style={styles.customInput} />
          <Pressable style={styles.saveButton} onPress={addCustomItem}>
            <Text style={styles.saveButtonText}>Add</Text>
          </Pressable>
        </View>
        {customItems.map((item) => (
          <View key={item.id} style={styles.customRow}>
            <View style={styles.customMain}>
              <Text style={styles.customTitle}>{item.label}</Text>
              <Text style={styles.customMeta}>{item.guidance || 'No guidance added yet.'}</Text>
            </View>
            <Pressable style={styles.removeButton} onPress={() => removeCustomItem(item.id)}>
              <Text style={styles.removeButtonText}>Remove</Text>
            </Pressable>
          </View>
        ))}
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  chips: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  chip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff' },
  chipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  chipText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  chipTextActive: { color: '#ffffff' },
  plotSummaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryBox: { minWidth: 180, backgroundColor: '#eff6ff', borderRadius: 14, padding: 14 },
  summaryLabel: { color: '#2563eb', fontSize: 12, fontWeight: '900' },
  summaryValue: { color: '#0f172a', fontSize: 20, fontWeight: '900', marginTop: 4 },
  summaryValueSmall: { color: '#0f172a', fontSize: 14, fontWeight: '900', marginTop: 4 },
  currentHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'stretch' },
  currentMain: { flex: 1, minWidth: 320, gap: 4 },
  currentTitle: { color: '#0f172a', fontSize: 22, fontWeight: '900' },
  currentMeta: { color: '#2563eb', fontSize: 12, fontWeight: '900' },
  currentDescription: { color: '#64748b', fontSize: 13, lineHeight: 19 },
  statusSummary: { minWidth: 150, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 14, justifyContent: 'center' },
  statusSummaryFailed: { backgroundColor: '#fff1f2', borderColor: '#fecdd3' },
  statusSummaryPassed: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  statusSummaryValue: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  statusSummaryMeta: { color: '#64748b', fontSize: 12, fontWeight: '800', marginTop: 3 },
  simpleTableHeader: { flexDirection: 'row', backgroundColor: '#173b5f', borderRadius: 10, overflow: 'hidden' },
  tableHeaderText: { color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 8, textAlign: 'center' },
  simpleTableRow: { flexDirection: 'row', alignItems: 'stretch', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, overflow: 'hidden', backgroundColor: '#ffffff' },
  altRow: { backgroundColor: '#f8fbff' },
  checkCol: { width: 320, padding: 10 },
  statusCol: { width: 100, padding: 8, gap: 6 },
  tradeCol: { width: 140 },
  descCol: { width: 260 },
  imageCol: { width: 160 },
  sectionLabel: { color: '#2563eb', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  itemTitle: { color: '#0f172a', fontSize: 14, fontWeight: '900', marginTop: 2 },
  guidance: { color: '#475569', fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 3 },
  photoRequired: { alignSelf: 'flex-start', color: '#92400e', backgroundColor: '#fef3c7', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontWeight: '900', marginTop: 5 },
  statusButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingVertical: 6, alignItems: 'center', backgroundColor: '#ffffff' },
  statusButtonActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  statusFail: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  statusText: { color: '#475569', fontSize: 11, fontWeight: '900' },
  statusTextActive: { color: '#ffffff' },
  input: { minHeight: 78, borderLeftWidth: 1, borderLeftColor: '#e2e8f0', padding: 8, color: '#0f172a', backgroundColor: '#ffffff', fontSize: 12, fontWeight: '700', textAlignVertical: 'top' },
  saveButton: { alignSelf: 'flex-start', backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  saveButtonText: { color: '#ffffff', fontWeight: '900' },
  empty: { color: '#64748b', fontWeight: '700' },
  storyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 12, backgroundColor: '#ffffff' },
  storyMain: { flex: 1 },
  storyTitle: { color: '#0f172a', fontWeight: '900', fontSize: 15 },
  storyMeta: { color: '#64748b', fontSize: 12, fontWeight: '700', marginTop: 3 },
  storyStatus: { borderRadius: 999, backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 6 },
  storyFailed: { backgroundColor: '#fee2e2' },
  storyPassed: { backgroundColor: '#dcfce7' },
  storyStatusText: { color: '#0f172a', fontWeight: '900', fontSize: 11 },
  openButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  openButtonText: { color: '#0f172a', fontWeight: '900', fontSize: 12 },
  addCustomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' },
  customInput: { minWidth: 220, flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', fontWeight: '800', backgroundColor: '#ffffff' },
  customRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  customMain: { flex: 1 },
  customTitle: { color: '#0f172a', fontWeight: '900' },
  customMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
  removeButton: { borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff1f2' },
  removeButtonText: { color: '#dc2626', fontSize: 12, fontWeight: '900' },
});

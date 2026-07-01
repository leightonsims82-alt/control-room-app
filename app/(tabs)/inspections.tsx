import AsyncStorage from '@react-native-async-storage/async-storage';
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

type InspectionResult = {
  status?: InspectionStatus;
  comment?: string;
  photoRef?: string;
  updatedAt?: string;
};

type InspectionResults = Record<string, InspectionResult>;

function resultKey(plotId: string, checklistId: string, itemId: string) {
  return `${plotId}:${checklistId}:${itemId}`;
}

export default function InspectionsScreen() {
  const { sitePlots, plotTemplates } = useSitePlanner();
  const sortedPlots = useMemo(() => getSortedSitePlots(sitePlots), [sitePlots]);
  const [selectedPlotId, setSelectedPlotId] = useState(sortedPlots[0]?.id ?? '');
  const [selectedChecklistId, setSelectedChecklistId] = useState('pre-plaster');
  const [customItems, setCustomItems] = useState<CustomChecklistItem[]>([]);
  const [results, setResults] = useState<InspectionResults>({});
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemGuidance, setNewItemGuidance] = useState('');

  useEffect(() => {
    if (!selectedPlotId && sortedPlots[0]?.id) setSelectedPlotId(sortedPlots[0].id);
  }, [selectedPlotId, sortedPlots]);

  useEffect(() => {
    async function loadInspectionData() {
      const [storedCustomItems, storedResults] = await Promise.all([
        AsyncStorage.getItem(CUSTOM_ITEMS_KEY),
        AsyncStorage.getItem(INSPECTION_RESULTS_KEY),
      ]);
      if (storedCustomItems) setCustomItems(JSON.parse(storedCustomItems));
      if (storedResults) setResults(JSON.parse(storedResults));
    }
    loadInspectionData();
  }, []);

  const selectedPlot = sortedPlots.find((plot) => plot.id === selectedPlotId) ?? sortedPlots[0];
  const selectedTemplate = selectedPlot ? getTemplateForPlot(selectedPlot, plotTemplates) : plotTemplates[0];
  const constructionMethod = selectedTemplate ? getConstructionMethod(selectedTemplate) : 'traditional';
  const selectedChecklist = getChecklistDefinition(selectedChecklistId);
  const checklistItems = getChecklistItems(selectedChecklist.id, constructionMethod, customItems);
  const completedCount = selectedPlot ? checklistItems.filter((item) => results[resultKey(selectedPlot.id, selectedChecklist.id, item.id)]?.status).length : 0;
  const failCount = selectedPlot ? checklistItems.filter((item) => results[resultKey(selectedPlot.id, selectedChecklist.id, item.id)]?.status === 'Fail').length : 0;

  const updateResult = async (itemId: string, update: InspectionResult) => {
    if (!selectedPlot) return;
    const key = resultKey(selectedPlot.id, selectedChecklist.id, itemId);
    const nextResults = {
      ...results,
      [key]: { ...results[key], ...update, updatedAt: new Date().toISOString() },
    };
    setResults(nextResults);
    await AsyncStorage.setItem(INSPECTION_RESULTS_KEY, JSON.stringify(nextResults));
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

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Stage Inspections</Text>
        <Text style={styles.subtitle}>Holistic plot inspections with checklist items filtered by house type setup: traditional masonry, timber frame, hybrid or project-specific.</Text>
      </View>

      <SectionCard title="Inspection setup" subtitle="Select the plot and the inspection. The checklist will follow the construction method set in Setup for the plot's house type.">
        <View style={styles.selectorGrid}>
          <View style={styles.selectorPanel}>
            <Text style={styles.label}>Plot</Text>
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
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>House type</Text>
            <Text style={styles.summaryValue}>{selectedTemplate ? getHouseTypeLabel(selectedTemplate) : '-'}</Text>
            <Text style={styles.summaryMeta}>{getConstructionMethodLabel(constructionMethod)}</Text>
          </View>
        </View>

        <Text style={styles.label}>Inspection checklist</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.checklistChips}>
            {CHECKLIST_DEFINITIONS.map((checklist) => {
              const active = checklist.id === selectedChecklist.id;
              return (
                <Pressable key={checklist.id} style={[styles.checklistChip, active ? styles.checklistChipActive : null]} onPress={() => setSelectedChecklistId(checklist.id)}>
                  <Text style={[styles.checklistChipTitle, active ? styles.checklistChipTitleActive : null]}>{checklist.title}</Text>
                  <Text style={[styles.checklistChipMeta, active ? styles.checklistChipMetaActive : null]}>{checklist.stage}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </SectionCard>

      <SectionCard title={selectedChecklist.title} subtitle={selectedChecklist.description}>
        <View style={styles.progressRow}>
          <View style={styles.progressBox}>
            <Text style={styles.progressNumber}>{completedCount}/{checklistItems.length}</Text>
            <Text style={styles.progressLabel}>Items marked</Text>
          </View>
          <View style={[styles.progressBox, failCount ? styles.failBox : null]}>
            <Text style={styles.progressNumber}>{failCount}</Text>
            <Text style={styles.progressLabel}>Failed items</Text>
          </View>
        </View>

        {checklistItems.map((item) => {
          const key = selectedPlot ? resultKey(selectedPlot.id, selectedChecklist.id, item.id) : '';
          const result = results[key] ?? {};
          return (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.itemTitleWrap}>
                  <Text style={styles.sectionLabel}>{item.section}</Text>
                  <Text style={styles.itemTitle}>{item.label}</Text>
                  <Text style={styles.guidance}>{item.guidance}</Text>
                </View>
                {item.photoRequired ? <Text style={styles.photoBadge}>Photo required</Text> : null}
              </View>

              <View style={styles.statusRow}>
                {INSPECTION_STATUS_OPTIONS.map((status) => {
                  const active = result.status === status;
                  return (
                    <Pressable key={status} style={[styles.statusButton, active ? styles.statusButtonActive : null, status === 'Fail' && active ? styles.statusFail : null]} onPress={() => updateResult(item.id, { status })}>
                      <Text style={[styles.statusText, active ? styles.statusTextActive : null]}>{status}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.itemInputs}>
                <TextInput
                  value={result.comment ?? ''}
                  onChangeText={(comment) => updateResult(item.id, { comment })}
                  placeholder="Comment / action required"
                  style={styles.commentInput}
                  multiline
                />
                <TextInput
                  value={result.photoRef ?? ''}
                  onChangeText={(photoRef) => updateResult(item.id, { photoRef })}
                  placeholder="Photo reference / file note"
                  style={styles.photoInput}
                />
              </View>
            </View>
          );
        })}
      </SectionCard>

      <SectionCard title="Add item to every checklist" subtitle="Use this when a new company, developer or site requirement comes up. It will appear under Custom site checks on every inspection.">
        <View style={styles.addCustomGrid}>
          <TextInput value={newItemLabel} onChangeText={setNewItemLabel} placeholder="New checklist item" style={styles.input} />
          <TextInput value={newItemGuidance} onChangeText={setNewItemGuidance} placeholder="Tolerance / guidance shown in app" style={styles.input} />
          <Pressable style={styles.saveButton} onPress={addCustomItem}>
            <Text style={styles.saveButtonText}>Add to All</Text>
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
  selectorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'stretch' },
  selectorPanel: { flex: 1, minWidth: 280, gap: 8 },
  label: { color: '#334155', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  chips: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  chip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff' },
  chipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  chipText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  chipTextActive: { color: '#ffffff' },
  summaryBox: { minWidth: 240, backgroundColor: '#eff6ff', borderRadius: 14, padding: 14 },
  summaryLabel: { color: '#2563eb', fontSize: 12, fontWeight: '900' },
  summaryValue: { color: '#0f172a', fontSize: 18, fontWeight: '900', marginTop: 4 },
  summaryMeta: { color: '#475569', fontSize: 12, fontWeight: '800', marginTop: 3 },
  checklistChips: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  checklistChip: { width: 190, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#ffffff' },
  checklistChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  checklistChipTitle: { color: '#0f172a', fontSize: 12, fontWeight: '900' },
  checklistChipTitleActive: { color: '#ffffff' },
  checklistChipMeta: { color: '#64748b', fontSize: 11, fontWeight: '800', marginTop: 3 },
  checklistChipMetaActive: { color: '#cbd5e1' },
  progressRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  progressBox: { minWidth: 150, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 14 },
  failBox: { backgroundColor: '#fff1f2', borderColor: '#fecdd3' },
  progressNumber: { color: '#0f172a', fontSize: 24, fontWeight: '900' },
  progressLabel: { color: '#64748b', fontSize: 12, fontWeight: '800' },
  itemCard: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 14, gap: 12, backgroundColor: '#ffffff' },
  itemHeader: { flexDirection: 'row', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start' },
  itemTitleWrap: { flex: 1, gap: 4 },
  sectionLabel: { color: '#2563eb', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  itemTitle: { color: '#0f172a', fontSize: 16, fontWeight: '900' },
  guidance: { color: '#475569', fontSize: 13, lineHeight: 19, fontWeight: '700' },
  photoBadge: { color: '#92400e', backgroundColor: '#fef3c7', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, fontSize: 11, fontWeight: '900' },
  statusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#ffffff' },
  statusButtonActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  statusFail: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  statusText: { color: '#334155', fontWeight: '900', fontSize: 12 },
  statusTextActive: { color: '#ffffff' },
  itemInputs: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  commentInput: { flex: 2, minWidth: 260, minHeight: 52, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 10, color: '#0f172a', backgroundColor: '#f8fafc', textAlignVertical: 'top' },
  photoInput: { flex: 1, minWidth: 220, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 10, color: '#0f172a', backgroundColor: '#fffdf2' },
  addCustomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  input: { flex: 1, minWidth: 220, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', backgroundColor: '#ffffff', fontWeight: '800' },
  saveButton: { backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  saveButtonText: { color: '#ffffff', fontWeight: '900' },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  customMain: { flex: 1 },
  customTitle: { color: '#0f172a', fontWeight: '900' },
  customMeta: { color: '#64748b', fontSize: 12, marginTop: 3 },
  removeButton: { borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  removeButtonText: { color: '#dc2626', fontWeight: '900', fontSize: 12 },
});

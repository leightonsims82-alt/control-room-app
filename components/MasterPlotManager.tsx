import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSitePlanner } from '../data/sitePlannerStore';
import { formatBritishDate, formatProgrammeDate, getProgrammeWeekForDate, parseProgrammeDate, validatePlotCompletionDate } from '../utils/programmeDates';
import { getPlotMetadataKey, PlotBuildRoute, readPlotMetadata, removePlotMetadata, savePlotMetadata } from '../utils/plotMetadata';
import { getEffectiveProgrammeWeeks, getHouseTypeTemplates, getTemplateById } from '../utils/templateProgramme';

type ManagePlotListener = (plotId: string) => void;
const managePlotListeners = new Set<ManagePlotListener>();

export function openMasterPlotManager(plotId: string) {
  managePlotListeners.forEach((listener) => listener(plotId));
}

const DAY_MS = 24 * 60 * 60 * 1000;
function shiftWeeks(value: string, weeks: number) {
  const date = parseProgrammeDate(value);
  return date ? formatBritishDate(new Date(date.getTime() + weeks * 7 * DAY_MS)) : '';
}

export function MasterPlotManager() {
  const { sitePlots, plotTemplates, siteSetup, upsertSitePlot, removeSitePlot } = useSitePlanner();
  const [visible, setVisible] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [buildRoute, setBuildRoute] = useState<PlotBuildRoute>('Traditional');
  const [houseTypeId, setHouseTypeId] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const houseTypes = useMemo(() => getHouseTypeTemplates(plotTemplates), [plotTemplates]);
  const selectedPlot = sitePlots.find((plot) => plot.id === selectedId) ?? sitePlots[0];
  const selectedHouseType = houseTypes.find((template) => template.id === houseTypeId) ?? houseTypes[0];

  const loadPlot = async (plotId: string) => {
    const plot = sitePlots.find((item) => item.id === plotId) ?? sitePlots[0];
    if (!plot) return;
    const metadata = await readPlotMetadata();
    const detail = metadata[getPlotMetadataKey(plot.plotNo)];
    setSelectedId(plot.id);
    setBuildRoute(detail?.buildRoute ?? (plot.constructionMethod === 'timberFrame' ? 'Timber Frame' : 'Traditional'));
    setHouseTypeId(plot.houseTypeId ?? detail?.houseTypeId ?? detail?.bedroomTemplateId ?? (plot.templateId === 'timberFrame' ? '' : plot.templateId ?? ''));
    setCompletionDate(detail?.plotCompletionDate || formatProgrammeDate(siteSetup.programmeStartDate, plot.stage9CompleteWeek));
    setMessage('');
    setConfirmDelete(false);
  };

  const open = async () => {
    setVisible(true);
    if (sitePlots[0]) await loadPlot(selectedPlot?.id ?? sitePlots[0].id);
  };

  useEffect(() => {
    const listener: ManagePlotListener = (plotId) => {
      setVisible(true);
      loadPlot(plotId).catch((error) => {
        setMessage(`Unable to open plot: ${String(error)}`);
      });
    };
    managePlotListeners.add(listener);
    return () => {
      managePlotListeners.delete(listener);
    };
  });

  useEffect(() => {
    if (visible && selectedPlot && selectedPlot.id !== selectedId) loadPlot(selectedPlot.id).catch(() => undefined);
  }, [visible, selectedId, sitePlots.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveChanges = async () => {
    if (!selectedPlot) return;
    const error = validatePlotCompletionDate(siteSetup.programmeStartDate, completionDate);
    if (error) { setMessage(error); return; }
    const completionWeek = getProgrammeWeekForDate(siteSetup.programmeStartDate, completionDate);
    if (!completionWeek) { setMessage('Unable to calculate the programme week for that date.'); return; }
    setSaving(true);
    try {
      if (!selectedHouseType) { setMessage('Create and select a house type before saving this plot.'); return; }
      const programmeTemplateId = buildRoute === 'Timber Frame' ? 'timberFrame' : selectedHouseType.id;
      await upsertSitePlot({
        plotNo: selectedPlot.plotNo,
        buildOrder: selectedPlot.buildOrder,
        stage9CompleteWeek: completionWeek,
        templateId: selectedHouseType.id,
        houseTypeId: selectedHouseType.id,
        constructionMethod: buildRoute === 'Timber Frame' ? 'timberFrame' : 'traditional',
      });
      const programmeTemplate = getTemplateById(programmeTemplateId, plotTemplates);
      const programmeWeeks = getEffectiveProgrammeWeeks(programmeTemplate, siteSetup);
      await savePlotMetadata({
        plotNo: selectedPlot.plotNo,
        houseTypeName: selectedHouseType.name,
        houseTypeId: selectedHouseType.id,
        buildRoute,
        programmeGenerationBasis: 'completion',
        plotStartDate: shiftWeeks(completionDate, -(programmeWeeks - 1)),
        plotCompletionDate: completionDate,
      });
      setMessage(`Plot ${selectedPlot.plotNo} updated successfully.`);
    } catch (error) {
      setMessage(String(error));
    } finally {
      setSaving(false);
    }
  };

  const deletePlot = async () => {
    if (!selectedPlot) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setSaving(true);
    try {
      await removeSitePlot(selectedPlot.id);
      await removePlotMetadata(selectedPlot.plotNo);
      setMessage(`Plot ${selectedPlot.plotNo} deleted.`);
      setConfirmDelete(false);
      const remaining = sitePlots.filter((plot) => plot.id !== selectedPlot.id);
      if (remaining[0]) await loadPlot(remaining[0].id); else setVisible(false);
    } finally {
      setSaving(false);
    }
  };

  return <>
    <Pressable style={styles.floatingButton} onPress={open} accessibilityRole="button"><Ionicons name="create-outline" size={18} color="#ffffff" /><Text style={styles.floatingText}>Manage plots</Text></Pressable>
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={styles.overlay}><View style={styles.card}>
        <View style={styles.header}><View><Text style={styles.title}>Manage plots</Text><Text style={styles.subtitle}>Edit an existing plot without deleting or rebuilding it.</Text></View><Pressable style={styles.close} onPress={() => setVisible(false)}><Text style={styles.closeText}>×</Text></Pressable></View>
        {sitePlots.length ? <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.plotChips}>{sitePlots.map((plot) => <Pressable key={plot.id} onPress={() => loadPlot(plot.id)} style={[styles.chip, selectedPlot?.id === plot.id ? styles.chipActive : null]}><Text style={[styles.chipText, selectedPlot?.id === plot.id ? styles.chipTextActive : null]}>Plot {plot.plotNo}</Text></Pressable>)}</ScrollView>
          <View style={styles.formGrid}>
            <View style={styles.field}><Text style={styles.label}>Plot</Text><Text style={styles.readonly}>{selectedPlot?.plotNo}</Text></View>
            <View style={styles.field}><Text style={styles.label}>House type</Text><Text style={styles.readonly}>{selectedHouseType?.name ?? 'Select below'}</Text></View>
            <View style={styles.field}><Text style={styles.label}>Completion date</Text><TextInput value={completionDate} onChangeText={setCompletionDate} placeholder="DD/MM/YYYY" style={styles.input} /></View>
          </View>
          <View style={styles.field}><Text style={styles.label}>Build route</Text><View style={styles.routeRow}>{(['Traditional','Timber Frame'] as PlotBuildRoute[]).map((route) => <Pressable key={route} onPress={() => setBuildRoute(route)} style={[styles.chip, buildRoute === route ? styles.chipActive : null]}><Text style={[styles.chipText, buildRoute === route ? styles.chipTextActive : null]}>{route}</Text></Pressable>)}</View></View>
          <View style={styles.field}><Text style={styles.label}>House type</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.routeRow}>{houseTypes.map((template) => <Pressable key={template.id} onPress={() => setHouseTypeId(template.id)} style={[styles.chip, selectedHouseType?.id === template.id ? styles.chipActive : null]}><Text style={[styles.chipText, selectedHouseType?.id === template.id ? styles.chipTextActive : null]}>{template.name}</Text></Pressable>)}</ScrollView>{selectedHouseType ? <Text style={styles.subtitle}>{selectedHouseType.bedrooms ?? '-'} bedrooms · {selectedHouseType.floors ?? '-'} storeys</Text> : <Text style={styles.subtitle}>Create a house type in Site Setup first.</Text>}</View>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}><Pressable disabled={saving} style={styles.saveButton} onPress={saveChanges}><Text style={styles.saveText}>{saving ? 'Saving…' : 'Save Plot Changes'}</Text></Pressable><Pressable disabled={saving} style={[styles.deleteButton, confirmDelete ? styles.deleteConfirm : null]} onPress={deletePlot}><Text style={styles.deleteText}>{confirmDelete ? `Confirm Delete Plot ${selectedPlot?.plotNo}` : 'Delete Plot'}</Text></Pressable></View>
        </> : <View style={styles.empty}><Text style={styles.emptyTitle}>No plots saved</Text><Text style={styles.subtitle}>Add a plot from the Master Programme first.</Text></View>}
      </View></View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  floatingButton: { position: 'absolute', right: 18, bottom: 104, zIndex: 30, elevation: 10, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#173b5f', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12 },
  floatingText: { color: '#ffffff', fontWeight: '900', fontSize: 13 },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.58)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  card: { width: '100%', maxWidth: 760, maxHeight: '90%', backgroundColor: '#ffffff', borderRadius: 20, padding: 18, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  title: { color: '#0f172a', fontSize: 24, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 13, lineHeight: 19, marginTop: 3 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 25, color: '#334155', lineHeight: 28 },
  plotChips: { gap: 7, paddingVertical: 2 },
  routeRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  chipText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  chipTextActive: { color: '#ffffff' },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  field: { gap: 6, minWidth: 170, flex: 1 },
  label: { color: '#475569', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 10, color: '#0f172a', fontWeight: '800' },
  readonly: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 10, color: '#0f172a', fontWeight: '900' },
  message: { color: '#166534', backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', borderRadius: 10, padding: 10, fontWeight: '800' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  saveButton: { backgroundColor: '#0f172a', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11 },
  saveText: { color: '#ffffff', fontWeight: '900' },
  deleteButton: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11 },
  deleteConfirm: { backgroundColor: '#b91c1c', borderColor: '#b91c1c' },
  deleteText: { color: '#991b1b', fontWeight: '900' },
  empty: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 18 },
  emptyTitle: { color: '#0f172a', fontWeight: '900', fontSize: 17 },
});
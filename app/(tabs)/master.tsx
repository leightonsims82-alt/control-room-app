import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { SectionCard } from '../../components/SectionCard';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { WEEK_NUMBERS } from '../../utils/siteProgrammeEngine';
import { getMilestoneForPlotWeek, getStage1StartWeekForPlot, getTemplateForPlot, normaliseProgrammeWeek } from '../../utils/templateProgramme';

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

function workingWeekLabel(includeSaturday: boolean, includeSunday: boolean) {
  if (includeSaturday && includeSunday) return 'Monday to Sunday';
  if (includeSaturday) return 'Monday to Saturday';
  if (includeSunday) return 'Monday to Friday + Sunday';
  return 'Monday to Friday';
}

type BuildRoute = 'Traditional' | 'Timber Frame';

export default function MasterProgrammeScreen() {
  const { sitePlots, plotTemplates, siteSetup, upsertSitePlot, removeSitePlot, updateSiteSetup } = useSitePlanner();
  const bedroomTemplates = plotTemplates.filter((template) => template.id !== 'timberFrame');
  const [plotNo, setPlotNo] = useState('');
  const [stage9Week, setStage9Week] = useState('');
  const [buildRoute, setBuildRoute] = useState<BuildRoute>('Traditional');
  const [templateId, setTemplateId] = useState(bedroomTemplates[2]?.id ?? bedroomTemplates[0]?.id ?? 'threeBed');
  const [moveScope, setMoveScope] = useState('all');
  const [moveMessage, setMoveMessage] = useState('');
  const includeSaturday = Boolean(siteSetup.includeSaturday);
  const includeSunday = Boolean(siteSetup.includeSunday);

  const savePlot = async () => {
    const parsedWeek = Number(stage9Week);
    if (!plotNo.trim() || !Number.isFinite(parsedWeek)) return;
    const routeTemplateId = buildRoute === 'Timber Frame' ? 'timberFrame' : templateId;
    await upsertSitePlot({ plotNo, stage9CompleteWeek: parsedWeek, templateId: routeTemplateId });
    setPlotNo('');
    setStage9Week('');
  };

  const toggleWorkingDay = async (day: 'saturday' | 'sunday') => {
    const nextSaturday = day === 'saturday' ? !includeSaturday : includeSaturday;
    const nextSunday = day === 'sunday' ? !includeSunday : includeSunday;
    await updateSiteSetup({ includeSaturday: nextSaturday, includeSunday: nextSunday, workingWeek: workingWeekLabel(nextSaturday, nextSunday) });
    setMoveMessage(`Working week set to ${workingWeekLabel(nextSaturday, nextSunday)}`);
  };

  const moveProgrammeByWeek = async (change: number) => {
    const selectedPlot = sitePlots.find((plot) => plot.id === moveScope);
    const plotsToMove = moveScope === 'all' ? sitePlots : selectedPlot ? [selectedPlot] : [];
    if (!plotsToMove.length) { setMoveMessage('Add a plot first'); return; }
    for (const plot of plotsToMove) {
      await upsertSitePlot({ plotNo: plot.plotNo, stage9CompleteWeek: normaliseProgrammeWeek(plot.stage9CompleteWeek + change), templateId: plot.templateId || 'threeBed' });
    }
    const scopeLabel = moveScope === 'all' ? 'Whole programme' : `Plot ${selectedPlot?.plotNo}`;
    const direction = change > 0 ? 'forward' : 'back';
    setMoveMessage(`${scopeLabel} moved ${direction} 1 week`);
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Master 23 Week Build</Text>
        <Text style={styles.subtitle}>Milestone completion view. Add a plot, choose its build route and house type, then enter the Stage 9 complete week.</Text>
      </View>

      <SectionCard title="WORKING WEEK" subtitle="Choose whether Saturday and Sunday are included separately in the programme setup.">
        <View style={styles.workingWeekPanel}>
          <View style={styles.workingWeekSummary}>
            <Text style={styles.label}>Current working week</Text>
            <Text style={styles.workingWeekTitle}>{siteSetup.workingWeek || workingWeekLabel(includeSaturday, includeSunday)}</Text>
            <Text style={styles.workingWeekHelp}>Saturday and Sunday can be switched on independently.</Text>
          </View>
          <View style={styles.weekendButtons}>
            <Pressable style={[styles.weekendChip, includeSaturday ? styles.weekendChipActive : null]} onPress={() => toggleWorkingDay('saturday')}><Text style={[styles.weekendChipText, includeSaturday ? styles.weekendChipTextActive : null]}>{includeSaturday ? 'Saturday included ✓' : 'Include Saturday'}</Text></Pressable>
            <Pressable style={[styles.weekendChip, includeSunday ? styles.weekendChipActive : null]} onPress={() => toggleWorkingDay('sunday')}><Text style={[styles.weekendChipText, includeSunday ? styles.weekendChipTextActive : null]}>{includeSunday ? 'Sunday included ✓' : 'Include Sunday'}</Text></Pressable>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="MOVE PROGRAMME FORWARD / BACK" subtitle="Use this to manually move the whole site programme or one selected plot. This changes the Stage 9 week and recalculates the programme.">
        <View style={styles.movePanel}>
          <View style={styles.inputWrapWide}>
            <Text style={styles.label}>What do you want to move?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.templateChips}>
                <Pressable style={[styles.templateChip, moveScope === 'all' ? styles.templateChipActive : null]} onPress={() => { setMoveScope('all'); setMoveMessage(''); }}><Text style={[styles.templateChipText, moveScope === 'all' ? styles.templateChipTextActive : null]}>Whole programme</Text></Pressable>
                {sitePlots.map((plot) => {
                  const active = plot.id === moveScope;
                  return <Pressable key={plot.id} style={[styles.templateChip, active ? styles.templateChipActive : null]} onPress={() => { setMoveScope(plot.id); setMoveMessage(''); }}><Text style={[styles.templateChipText, active ? styles.templateChipTextActive : null]}>Plot {plot.plotNo}</Text></Pressable>;
                })}
              </View>
            </ScrollView>
          </View>
          <View style={styles.moveButtons}>
            <Pressable style={styles.moveBackButton} onPress={() => moveProgrammeByWeek(-1)}><Text style={styles.moveButtonText}>Move Back 1 Week</Text></Pressable>
            <Pressable style={styles.moveForwardButton} onPress={() => moveProgrammeByWeek(1)}><Text style={styles.moveButtonText}>Move Forward 1 Week</Text></Pressable>
          </View>
          {moveMessage ? <Text style={styles.moveMessage}>{moveMessage}</Text> : null}
        </View>
      </SectionCard>

      <SectionCard title="Add / update plot" subtitle="Build route and bedroom size link back to the templates set up in Site Setup.">
        <View style={styles.formRow}>
          <View style={styles.inputWrap}><Text style={styles.label}>Plot No</Text><TextInput value={plotNo} onChangeText={setPlotNo} style={styles.input} placeholder="Enter plot no" /></View>
          <View style={styles.inputWrap}><Text style={styles.label}>Stage 9 Complete Week</Text><TextInput value={stage9Week} onChangeText={setStage9Week} style={styles.input} keyboardType="number-pad" placeholder="Enter week no" /></View>
          <View style={styles.inputWrapWide}>
            <Text style={styles.label}>Build route</Text>
            <View style={styles.templateChips}>{(['Traditional', 'Timber Frame'] as BuildRoute[]).map((route) => { const active = route === buildRoute; return <Pressable key={route} style={[styles.routeChip, active ? styles.routeChipActive : null]} onPress={() => setBuildRoute(route)}><Text style={[styles.routeChipText, active ? styles.routeChipTextActive : null]}>{route}</Text></Pressable>; })}</View>
          </View>
          <View style={styles.inputWrapWide}>
            <Text style={styles.label}>House type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.templateChips}>
                {bedroomTemplates.map((template) => {
                  const active = template.id === templateId;
                  return <Pressable key={template.id} style={[styles.templateChip, active ? styles.templateChipActive : null]} onPress={() => setTemplateId(template.id)}><Text style={[styles.templateChipText, active ? styles.templateChipTextActive : null]}>{template.name}</Text></Pressable>;
                })}
              </View>
            </ScrollView>
          </View>
          <Pressable style={styles.saveButton} onPress={savePlot}><Text style={styles.saveButtonText}>Save Plot</Text></Pressable>
        </View>
      </SectionCard>

      <SectionCard title="Master Build Programme" subtitle="Milestone numbers are generated from each build route and house type, so plots can run to different programme lengths.">
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={styles.tableRow}>
              <Text style={[styles.headerCell, styles.plotCell]}>Plot</Text>
              <Text style={[styles.headerCell, styles.templateCell]}>House</Text>
              <Text style={[styles.headerCell, styles.weekInputCell]}>S9 Week</Text>
              <Text style={[styles.headerCell, styles.weekInputCell]}>S1 Start</Text>
              {WEEK_NUMBERS.map((week) => <View key={week} style={styles.weekHeader}><Text style={styles.weekHeaderDate}>{getShortWeekDate(week)}</Text><Text style={styles.weekHeaderLabel}>WK{String(week).padStart(2, '0')}</Text></View>)}
              <Text style={[styles.headerCell, styles.actionCell]}>Del</Text>
            </View>

            {sitePlots.map((plot, rowIndex) => {
              const template = getTemplateForPlot(plot, plotTemplates);
              return (
                <View key={plot.id} style={[styles.tableRow, rowIndex % 2 ? styles.altRow : null]}>
                  <Text style={[styles.bodyCell, styles.plotCell]}>{plot.plotNo}</Text>
                  <Text style={[styles.bodyCell, styles.templateCell]} numberOfLines={1}>{template.name.replace(' Bedroom', ' Bed')}</Text>
                  <Text style={[styles.weekInputBody, styles.weekInputCell]}>{plot.stage9CompleteWeek}</Text>
                  <Text style={[styles.stageStartBody, styles.weekInputCell]}>{getStage1StartWeekForPlot(plot, plotTemplates)}</Text>
                  {WEEK_NUMBERS.map((week) => <Text key={week} style={styles.weekCell}>{getMilestoneForPlotWeek(plot, week, plotTemplates)}</Text>)}
                  <Pressable style={styles.removeButton} onPress={() => removeSitePlot(plot.id)}><Text style={styles.removeButtonText}>X</Text></Pressable>
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
  templateChips: { flexDirection: 'row', gap: 8, paddingVertical: 2, flexWrap: 'wrap' },
  templateChip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff' },
  templateChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  templateChipText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  templateChipTextActive: { color: '#ffffff' },
  routeChip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#ffffff' },
  routeChipActive: { backgroundColor: '#173b5f', borderColor: '#173b5f' },
  routeChipText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  routeChipTextActive: { color: '#ffffff' },
  workingWeekPanel: { gap: 12, backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' },
  workingWeekSummary: { flex: 1, minWidth: 240, gap: 4 },
  workingWeekTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  workingWeekHelp: { color: '#64748b', fontSize: 12, fontWeight: '800' },
  weekendButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  weekendChip: { borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#ffffff' },
  weekendChipActive: { backgroundColor: '#166534', borderColor: '#166534' },
  weekendChipText: { color: '#1d4ed8', fontSize: 12, fontWeight: '900' },
  weekendChipTextActive: { color: '#ffffff' },
  movePanel: { gap: 12, backgroundColor: '#fff7ed', borderColor: '#fed7aa', borderWidth: 1, borderRadius: 14, padding: 12 },
  moveButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moveBackButton: { backgroundColor: '#7f1d1d', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  moveForwardButton: { backgroundColor: '#166534', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  moveButtonText: { color: '#ffffff', fontWeight: '900' },
  moveMessage: { alignSelf: 'flex-start', backgroundColor: '#dcfce7', color: '#166534', borderColor: '#86efac', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontWeight: '900' },
  tableRow: { flexDirection: 'row', minHeight: 34, alignItems: 'stretch' },
  altRow: { backgroundColor: '#eaf2fb' },
  headerCell: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 9, lineHeight: 10, paddingHorizontal: 2, paddingVertical: 5, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  plotCell: { width: 56 },
  templateCell: { width: 68 },
  weekInputCell: { width: 58 },
  actionCell: { width: 38 },
  weekHeader: { width: 52, backgroundColor: '#173b5f', borderWidth: 1, borderColor: '#9fb6ce', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 1, paddingVertical: 2 },
  weekHeaderDate: { color: '#c7d2fe', fontWeight: '900', fontSize: 8, lineHeight: 9 },
  weekHeaderLabel: { color: '#ffffff', fontWeight: '900', fontSize: 10, lineHeight: 11 },
  bodyCell: { color: '#0f172a', paddingHorizontal: 2, paddingVertical: 6, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '800', fontSize: 10 },
  weekInputBody: { backgroundColor: '#fff4cc', color: '#0f172a', paddingHorizontal: 2, paddingVertical: 6, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '900', fontSize: 10 },
  stageStartBody: { backgroundColor: '#e3f3d8', color: '#0f172a', paddingHorizontal: 2, paddingVertical: 6, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '900', fontSize: 10 },
  weekCell: { width: 52, color: '#0f172a', paddingHorizontal: 2, paddingVertical: 6, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '900', fontSize: 11 },
  removeButton: { width: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#c8d7e6' },
  removeButtonText: { color: '#dc2626', fontSize: 10, fontWeight: '900' },
});
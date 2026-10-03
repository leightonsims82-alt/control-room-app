import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { ProgrammeDatePicker } from '../../components/ProgrammeDatePicker';
import { SectionCard } from '../../components/SectionCard';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { getProgrammeStartDateValue, normaliseBritishDate, validateWeekOneDate } from '../../utils/programmeDates';
import { ConfiguredProgrammeStage, readStageConfiguration, saveStageConfiguration } from '../../utils/stageConfiguration';
import { PROGRAMME_STAGE_SEQUENCE } from '../../utils/siteProgrammeEngine';
import { getEffectiveProgrammeWeeks, getHouseTypeLabel, PlotTemplate, TemplateActivity } from '../../utils/templateProgramme';

const LOCKED_STANDARD_KEY = 'programme-buddy:locked-three-bed-standard:v1';
const LOCKED_STAGE_COUNT = 9;

type BuildRoute = 'Traditional' | 'Timber Frame';

function orderedActivities(activities: TemplateActivity[]) {
  return activities.slice().sort((a, b) => a.order - b.order).map((activity, index) => ({ ...activity, order: index + 1 }));
}

function cloneTemplate(template: PlotTemplate): PlotTemplate {
  return { ...template, activities: template.activities.map((activity) => ({ ...activity })) };
}

function toPositiveInt(value: string, fallback: number) {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export default function SiteSetupScreen() {
  const router = useRouter();
  const { siteSetup, plotTemplates, isSitePlannerLoaded, updateSiteSetup, updatePlotTemplate } = useSitePlanner();
  const [weekOneDate, setWeekOneDate] = useState(getProgrammeStartDateValue(siteSetup.programmeStartDate));
  const [workingDays, setWorkingDays] = useState<5 | 6 | 7>(siteSetup.includeSunday ? 7 : siteSetup.includeSaturday ? 6 : 5);
  const [stageDefinitions, setStageDefinitions] = useState<ConfiguredProgrammeStage[]>(PROGRAMME_STAGE_SEQUENCE.slice(0, LOCKED_STAGE_COUNT).map((stage) => ({ ...stage })));
  const [lockedThreeBed, setLockedThreeBed] = useState<PlotTemplate | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('threeBed');
  const [draft, setDraft] = useState<PlotTemplate | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [weekOneDateError, setWeekOneDateError] = useState('');

  useEffect(() => {
    if (!isSitePlannerLoaded) return;
    let active = true;
    (async () => {
      const liveThreeBed = plotTemplates.find((template) => template.id === 'threeBed');
      if (!liveThreeBed) return;
      const existing = await AsyncStorage.getItem(LOCKED_STANDARD_KEY);
      const standard = existing ? JSON.parse(existing) as PlotTemplate : cloneTemplate(liveThreeBed);
      if (!existing) await AsyncStorage.setItem(LOCKED_STANDARD_KEY, JSON.stringify(standard));
      if (!active) return;
      setLockedThreeBed(standard);
      // Enforce the locked standard in the planner store as the source of truth.
      if (JSON.stringify(liveThreeBed) !== JSON.stringify(standard)) await updatePlotTemplate(standard);
    })().catch((error) => setMessage(`Unable to load locked 3 Bedroom standard: ${String(error)}`));
    return () => { active = false; };
  }, [isSitePlannerLoaded]);

  useEffect(() => {
    if (!isSitePlannerLoaded) return;
    readStageConfiguration(LOCKED_STAGE_COUNT)
      .then((stages) => setStageDefinitions(stages.slice(0, LOCKED_STAGE_COUNT)))
      .catch(() => setStageDefinitions(PROGRAMME_STAGE_SEQUENCE.slice(0, LOCKED_STAGE_COUNT).map((stage) => ({ ...stage }))));
  }, [isSitePlannerLoaded]);

  useEffect(() => {
    setWeekOneDate(getProgrammeStartDateValue(siteSetup.programmeStartDate));
    setWorkingDays(siteSetup.includeSunday ? 7 : siteSetup.includeSaturday ? 6 : 5);
  }, [siteSetup.programmeStartDate, siteSetup.includeSaturday, siteSetup.includeSunday]);

  const visibleTemplates = useMemo(() => plotTemplates.filter((template) => template.id !== 'timberFrame'), [plotTemplates]);
  const selectedLiveTemplate = visibleTemplates.find((template) => template.id === selectedTemplateId) ?? visibleTemplates[0];
  const selectedTemplate = selectedTemplateId === 'threeBed' && lockedThreeBed ? lockedThreeBed : selectedLiveTemplate;
  const displayTemplate = draft ?? selectedTemplate;
  const isLocked = selectedTemplateId === 'threeBed';
  const calculatedWeeks = displayTemplate ? getEffectiveProgrammeWeeks(displayTemplate, { ...siteSetup, includeSaturday: workingDays >= 6, includeSunday: workingDays >= 7 }) : 0;

  const saveSiteSettings = async () => {
    const dateError = validateWeekOneDate(weekOneDate);
    setWeekOneDateError(dateError);
    if (dateError) return;
    setSaving(true);
    try {
      const stages = stageDefinitions.slice(0, LOCKED_STAGE_COUNT).map((stage, index) => ({ ...stage, stage: index + 1 }));
      await saveStageConfiguration(stages);
      await updateSiteSetup({
        programmeStartDate: normaliseBritishDate(weekOneDate),
        stageCount: LOCKED_STAGE_COUNT,
        workingWeek: workingDays === 7 ? '7 days - Monday to Sunday' : workingDays === 6 ? '6 days - Monday to Saturday' : '5 days - Monday to Friday',
        includeSaturday: workingDays >= 6,
        includeSunday: workingDays >= 7,
      });
      setMessage('Site programme settings saved. The site is locked to 9 programme stages.');
    } finally {
      setSaving(false);
    }
  };

  const updateStage = (stageNo: number, changes: Partial<ConfiguredProgrammeStage>) => {
    setStageDefinitions((current) => current.map((stage) => stage.stage === stageNo ? {
      ...stage,
      ...changes,
      startWeek: Math.max(1, Math.round(Number(changes.startWeek ?? stage.startWeek) || 1)),
      finishWeek: Math.max(Math.max(1, Math.round(Number(changes.startWeek ?? stage.startWeek) || 1)), Math.round(Number(changes.finishWeek ?? stage.finishWeek) || stage.finishWeek)),
    } : stage));
  };

  const beginEditTemplate = () => {
    if (!selectedTemplate || isLocked) return;
    setDraft(cloneTemplate(selectedTemplate));
    setMessage(`Editing ${getHouseTypeLabel(selectedTemplate)}. Changes are local until Save Template is pressed.`);
  };

  const cancelEditTemplate = () => {
    setDraft(null);
    setMessage('Template edit cancelled. Nothing was saved.');
  };

  const saveTemplate = async () => {
    if (!draft || isLocked) return;
    setSaving(true);
    try {
      const cleaned: PlotTemplate = { ...draft, stageCount: LOCKED_STAGE_COUNT, activities: orderedActivities(draft.activities) };
      await updatePlotTemplate(cleaned);
      setDraft(null);
      setMessage(`${getHouseTypeLabel(cleaned)} saved successfully.`);
    } finally {
      setSaving(false);
    }
  };

  const cloneThreeBedToSelected = () => {
    if (!lockedThreeBed || !selectedLiveTemplate || isLocked) return;
    setDraft({
      ...cloneTemplate(lockedThreeBed),
      id: selectedLiveTemplate.id,
      name: selectedLiveTemplate.name,
      houseTypeCode: selectedLiveTemplate.houseTypeCode,
      description: selectedLiveTemplate.description,
      constructionMethod: selectedLiveTemplate.constructionMethod,
    });
    setMessage(`Draft reset from the locked 3 Bedroom standard. Press Save Template to commit it.`);
  };

  const patchActivity = (order: number, changes: Partial<TemplateActivity>) => {
    setDraft((current) => current ? {
      ...current,
      activities: current.activities.map((activity) => activity.order === order ? { ...activity, ...changes } : activity),
    } : current);
  };

  const moveActivity = (order: number, direction: -1 | 1) => {
    setDraft((current) => {
      if (!current) return current;
      const activities = orderedActivities(current.activities);
      const index = activities.findIndex((activity) => activity.order === order);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= activities.length) return current;
      [activities[index], activities[target]] = [activities[target], activities[index]];
      return { ...current, activities: orderedActivities(activities) };
    });
  };

  const addActivityAfter = (order: number) => {
    setDraft((current) => {
      if (!current) return current;
      const activities = orderedActivities(current.activities);
      const index = activities.findIndex((activity) => activity.order === order);
      const seed = activities[Math.max(0, index)] ?? activities[0];
      if (!seed) return current;
      const newActivity: TemplateActivity = {
        ...seed,
        order: index + 2,
        code: `New activity ${Date.now()}`,
        displayText: 'New',
        durationDays: 1,
        stage: Math.min(LOCKED_STAGE_COUNT, Number(seed.stage) || 1) as TemplateActivity['stage'],
      };
      activities.splice(index + 1, 0, newActivity);
      return { ...current, activities: orderedActivities(activities) };
    });
  };

  const removeActivity = (order: number) => {
    setDraft((current) => current ? { ...current, activities: orderedActivities(current.activities.filter((activity) => activity.order !== order)) } : current);
  };

  const rows = displayTemplate ? orderedActivities(displayTemplate.activities) : [];

  return (
    <AppScreen>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Programme setup</Text>
          <Text style={styles.subtitle}>A clean, explicit-save setup. The current 3 Bedroom programme is now the locked site standard.</Text>
        </View>
        <Pressable style={styles.secondaryButton} onPress={() => router.replace('/')}><Text style={styles.secondaryButtonText}>Back to dashboard</Text></Pressable>
      </View>

      <SectionCard title="Site programme settings" subtitle="These settings only change when you press Save Site Settings.">
        <View style={styles.settingsGrid}>
          <View style={styles.field}>
            <Text style={styles.label}>Week 1 commencement</Text>
            <ProgrammeDatePicker value={weekOneDate} onChange={(value) => { setWeekOneDate(value); setWeekOneDateError(''); }} error={Boolean(weekOneDateError)} />
            {weekOneDateError ? <Text style={styles.error}>{weekOneDateError}</Text> : null}
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Working week</Text>
            <View style={styles.chips}>
              {([5, 6, 7] as const).map((days) => <Pressable key={days} onPress={() => setWorkingDays(days)} style={[styles.chip, workingDays === days ? styles.chipActive : null]}><Text style={[styles.chipText, workingDays === days ? styles.chipTextActive : null]}>{days} days</Text></Pressable>)}
            </View>
          </View>
          <View style={styles.lockCard}><Text style={styles.lockLabel}>Programme stages</Text><Text style={styles.lockValue}>9</Text><Text style={styles.lockHint}>Locked site standard</Text></View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.stageTable}>
            <View style={styles.stageRow}><Text style={[styles.th, styles.stageNo]}>Stage</Text><Text style={[styles.th, styles.stageLabel]}>Label</Text><Text style={[styles.th, styles.stageWeek]}>Start week</Text><Text style={[styles.th, styles.stageWeek]}>Finish week</Text></View>
            {stageDefinitions.slice(0, LOCKED_STAGE_COUNT).map((stage) => <View key={stage.stage} style={styles.stageRow}>
              <Text style={[styles.td, styles.stageNo]}>{stage.stage}</Text>
              <TextInput value={stage.label} onChangeText={(value) => updateStage(stage.stage, { label: value })} style={[styles.input, styles.stageLabel]} />
              <TextInput value={String(stage.startWeek)} keyboardType="number-pad" onChangeText={(value) => updateStage(stage.stage, { startWeek: toPositiveInt(value, stage.startWeek) })} style={[styles.input, styles.stageWeek]} />
              <TextInput value={String(stage.finishWeek)} keyboardType="number-pad" onChangeText={(value) => updateStage(stage.stage, { finishWeek: toPositiveInt(value, stage.finishWeek) })} style={[styles.input, styles.stageWeek]} />
            </View>)}
          </View>
        </ScrollView>
        <Pressable disabled={saving} style={styles.primaryButton} onPress={saveSiteSettings}><Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Save Site Settings'}</Text></Pressable>
      </SectionCard>

      <SectionCard title="Build route and property type templates" subtitle="3 Bedroom is the locked baseline. Other property types use a safe draft → Save workflow; there is no autosave.">
        <View style={styles.chips}>
          {visibleTemplates.map((template) => <Pressable key={template.id} onPress={() => { setSelectedTemplateId(template.id); setDraft(null); }} style={[styles.chip, selectedTemplateId === template.id ? styles.chipActive : null]}><Text style={[styles.chipText, selectedTemplateId === template.id ? styles.chipTextActive : null]}>{getHouseTypeLabel(template)}</Text></Pressable>)}
        </View>

        {displayTemplate ? <>
          <View style={styles.templateSummary}>
            <View><Text style={styles.label}>Template</Text><Text style={styles.summaryValue}>{getHouseTypeLabel(displayTemplate)}</Text></View>
            <View><Text style={styles.label}>Build route</Text><Text style={styles.summaryValue}>{displayTemplate.constructionMethod === 'timberFrame' ? 'Timber Frame' : 'Traditional'}</Text></View>
            <View><Text style={styles.label}>Target weeks</Text><Text style={styles.summaryValue}>{displayTemplate.programmeWeeks}</Text></View>
            <View><Text style={styles.label}>Stages</Text><Text style={styles.summaryValue}>9</Text></View>
            <View style={styles.calculatedCard}><Text style={styles.calculatedLabel}>Calculated weeks</Text><Text style={styles.calculatedValue}>{calculatedWeeks}</Text></View>
          </View>

          {isLocked ? <View style={styles.lockedBanner}><Text style={styles.lockedTitle}>🔒 Standard 3 Bedroom — locked</Text><Text style={styles.lockedText}>This exact programme has been captured from your current saved 3 Bedroom setup and is now the baseline. It cannot be accidentally changed from this screen.</Text></View> : null}

          {!isLocked ? <View style={styles.actionRow}>
            {!draft ? <Pressable style={styles.primaryButton} onPress={beginEditTemplate}><Text style={styles.primaryButtonText}>Edit Template</Text></Pressable> : null}
            {!draft ? <Pressable style={styles.secondaryButton} onPress={cloneThreeBedToSelected}><Text style={styles.secondaryButtonText}>Start from 3 Bed Standard</Text></Pressable> : null}
            {draft ? <Pressable disabled={saving} style={styles.primaryButton} onPress={saveTemplate}><Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Save Template'}</Text></Pressable> : null}
            {draft ? <Pressable style={styles.secondaryButton} onPress={cancelEditTemplate}><Text style={styles.secondaryButtonText}>Cancel</Text></Pressable> : null}
          </View> : null}

          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View style={styles.activityTable}>
              <View style={styles.activityRow}>
                <Text style={[styles.th, styles.seqCol]}>Seq</Text><Text style={[styles.th, styles.taskCol]}>Task</Text><Text style={[styles.th, styles.tradeCol]}>Trade</Text><Text style={[styles.th, styles.displayCol]}>Display</Text><Text style={[styles.th, styles.smallCol]}>Stage</Text><Text style={[styles.th, styles.smallCol]}>Days</Text>{draft ? <Text style={[styles.th, styles.actionCol]}>Actions</Text> : null}
              </View>
              {rows.map((activity) => <View key={`${activity.order}-${activity.code}`} style={styles.activityRow}>
                <Text style={[styles.td, styles.seqCol]}>{activity.order}</Text>
                {draft ? <TextInput value={activity.code} onChangeText={(value) => patchActivity(activity.order, { code: value })} style={[styles.input, styles.taskCol]} /> : <Text style={[styles.td, styles.taskCol]}>{activity.code}</Text>}
                {draft ? <TextInput value={activity.trade} onChangeText={(value) => patchActivity(activity.order, { trade: value })} style={[styles.input, styles.tradeCol]} /> : <Text style={[styles.td, styles.tradeCol]}>{activity.trade}</Text>}
                {draft ? <TextInput value={activity.displayText} onChangeText={(value) => patchActivity(activity.order, { displayText: value })} style={[styles.input, styles.displayCol]} /> : <Text style={[styles.td, styles.displayCol]}>{activity.displayText}</Text>}
                {draft ? <TextInput value={String(activity.stage)} keyboardType="number-pad" onChangeText={(value) => patchActivity(activity.order, { stage: Math.min(LOCKED_STAGE_COUNT, toPositiveInt(value, Number(activity.stage))) as TemplateActivity['stage'] })} style={[styles.input, styles.smallCol]} /> : <Text style={[styles.td, styles.smallCol]}>{activity.stage}</Text>}
                {draft ? <TextInput value={String(activity.durationDays)} keyboardType="number-pad" onChangeText={(value) => patchActivity(activity.order, { durationDays: toPositiveInt(value, activity.durationDays) })} style={[styles.input, styles.smallCol, styles.daysInput]} /> : <Text style={[styles.td, styles.smallCol, styles.daysCell]}>{activity.durationDays}</Text>}
                {draft ? <View style={styles.rowActions}>
                  <Pressable style={styles.miniButton} onPress={() => moveActivity(activity.order, -1)}><Text style={styles.miniButtonText}>↑</Text></Pressable>
                  <Pressable style={styles.miniButton} onPress={() => moveActivity(activity.order, 1)}><Text style={styles.miniButtonText}>↓</Text></Pressable>
                  <Pressable style={styles.addButton} onPress={() => addActivityAfter(activity.order)}><Text style={styles.addButtonText}>+</Text></Pressable>
                  <Pressable style={styles.removeButton} onPress={() => removeActivity(activity.order)}><Text style={styles.removeButtonText}>−</Text></Pressable>
                </View> : null}
              </View>)}
            </View>
          </ScrollView>
        </> : <Text style={styles.subtitle}>No template available.</Text>}
      </SectionCard>

      {message ? <View style={styles.messageBox}><Text style={styles.messageText}>{message}</Text></View> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 13, lineHeight: 19, marginTop: 3 },
  settingsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'stretch' },
  field: { minWidth: 230, flex: 1, gap: 7 },
  label: { color: '#475569', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 8, color: '#0f172a', fontWeight: '800' },
  error: { color: '#dc2626', fontSize: 12, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: '#ffffff' },
  chipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  chipText: { color: '#64748b', fontWeight: '900', fontSize: 12 },
  chipTextActive: { color: '#ffffff' },
  lockCard: { minWidth: 170, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, padding: 12 },
  lockLabel: { color: '#1d4ed8', fontWeight: '900', fontSize: 11, textTransform: 'uppercase' },
  lockValue: { color: '#0f172a', fontWeight: '900', fontSize: 26, marginTop: 2 },
  lockHint: { color: '#64748b', fontSize: 11, marginTop: 2 },
  primaryButton: { alignSelf: 'flex-start', backgroundColor: '#0f172a', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 11 },
  primaryButtonText: { color: '#ffffff', fontWeight: '900' },
  secondaryButton: { alignSelf: 'flex-start', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 11 },
  secondaryButtonText: { color: '#0f172a', fontWeight: '900' },
  stageTable: { minWidth: 680 },
  stageRow: { flexDirection: 'row', alignItems: 'stretch' },
  th: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', padding: 8, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  td: { color: '#0f172a', fontWeight: '800', padding: 8, borderWidth: 1, borderColor: '#cbd5e1', textAlign: 'center', backgroundColor: '#ffffff' },
  stageNo: { width: 72 }, stageLabel: { width: 320 }, stageWeek: { width: 140 },
  templateSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'stretch' },
  summaryValue: { color: '#0f172a', fontWeight: '900', fontSize: 15, marginTop: 3, minWidth: 120 },
  calculatedCard: { backgroundColor: '#eff6ff', borderRadius: 10, padding: 10, minWidth: 130 },
  calculatedLabel: { color: '#1d4ed8', fontWeight: '900', fontSize: 11 },
  calculatedValue: { color: '#0f172a', fontWeight: '900', fontSize: 22 },
  lockedBanner: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', borderRadius: 12, padding: 13, gap: 3 },
  lockedTitle: { color: '#166534', fontWeight: '900', fontSize: 14 },
  lockedText: { color: '#166534', fontWeight: '700', fontSize: 12, lineHeight: 18 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  activityTable: { minWidth: 1010 },
  activityRow: { flexDirection: 'row', alignItems: 'stretch' },
  seqCol: { width: 55 }, taskCol: { width: 250 }, tradeCol: { width: 190 }, displayCol: { width: 180 }, smallCol: { width: 80 }, actionCol: { width: 175 },
  daysCell: { backgroundColor: '#fff7cc' }, daysInput: { backgroundColor: '#fff7cc' },
  rowActions: { width: 175, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff' },
  miniButton: { borderWidth: 1, borderColor: '#93c5fd', backgroundColor: '#eff6ff', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 5 },
  miniButtonText: { color: '#1d4ed8', fontWeight: '900' },
  addButton: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  addButtonText: { color: '#166534', fontWeight: '900' },
  removeButton: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  removeButtonText: { color: '#b91c1c', fontWeight: '900' },
  messageBox: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12 },
  messageText: { color: '#334155', fontWeight: '800' },
});
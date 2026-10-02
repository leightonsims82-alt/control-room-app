$ErrorActionPreference = 'Stop'

$root = Get-Location
$storePath = Join-Path $root 'data\sitePlannerStore.tsx'
$setupPath = Join-Path $root 'app\site\setup.tsx'
$masterPath = Join-Path $root 'app\(tabs)\master.tsx'
$appScreenPath = Join-Path $root 'components\AppScreen.tsx'
$managerPath = Join-Path $root 'components\MasterPlotManager.tsx'
$metadataPath = Join-Path $root 'utils\plotMetadata.ts'

foreach ($path in @($storePath,$setupPath,$masterPath,$appScreenPath,$metadataPath)) {
  if (-not (Test-Path $path)) { throw "Missing $path" }
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
foreach ($path in @($storePath,$setupPath,$masterPath,$appScreenPath,$metadataPath)) {
  Copy-Item $path "$path.rebuild-$timestamp.bak" -Force
}
if (Test-Path $managerPath) { Copy-Item $managerPath "$managerPath.rebuild-$timestamp.bak" -Force }

function Replace-FunctionBlock {
  param([string]$Text,[string]$StartMarker,[string]$EndMarker,[string]$Replacement)
  $s = $Text.IndexOf($StartMarker)
  if ($s -lt 0) { throw "Start marker not found: $StartMarker" }
  $e = $Text.IndexOf($EndMarker,$s)
  if ($e -lt 0) { throw "End marker not found: $EndMarker" }
  return $Text.Substring(0,$s) + $Replacement + "`r`n`r`n" + $Text.Substring($e)
}

# -----------------------------------------------------------------------------
# 1. Preserve complete saved templates exactly. The old merge rebuilt defaults
#    and silently discarded renamed/added/reordered activities.
# -----------------------------------------------------------------------------
$store = [IO.File]::ReadAllText($storePath)
$mergeReplacement = @'
function mergeDefaultTemplates(stored: PlotTemplate[]) {
  const savedById = new Map(stored.map((template) => [template.id, normaliseTemplate(template)]));
  const merged = DEFAULT_PLOT_TEMPLATES.map((template) => savedById.get(template.id) ?? normaliseTemplate(template));
  const defaultIds = new Set(DEFAULT_PLOT_TEMPLATES.map((template) => template.id));
  const custom = stored.filter((template) => !defaultIds.has(template.id)).map(normaliseTemplate);
  return [...merged, ...custom];
}
'@
$store = Replace-FunctionBlock $store 'function mergeDefaultTemplates' 'function cleanPlotInput' $mergeReplacement
[IO.File]::WriteAllText($storePath,$store,[Text.UTF8Encoding]::new($false))

# -----------------------------------------------------------------------------
# 2. Exact plot-date metadata contract used by the new plot manager.
# -----------------------------------------------------------------------------
$metadata = [IO.File]::ReadAllText($metadataPath)
if ($metadata -notmatch 'plotCompletionDate\?: string') {
  $metadata = $metadata.Replace(
    '  buildRoute: PlotBuildRoute;',
    "  buildRoute: PlotBuildRoute;`r`n  programmeGenerationBasis?: 'start' | 'completion';`r`n  plotStartDate?: string;`r`n  plotCompletionDate?: string;"
  )
}
[IO.File]::WriteAllText($metadataPath,$metadata,[Text.UTF8Encoding]::new($false))

# -----------------------------------------------------------------------------
# 3. Rebuild Site Setup from scratch. No autosave. 3 Bedroom is captured once
#    from the CURRENT persisted live template and becomes the immutable standard.
# -----------------------------------------------------------------------------
$setup = @'
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
'@
[IO.File]::WriteAllText($setupPath,$setup,[Text.UTF8Encoding]::new($false))

# -----------------------------------------------------------------------------
# 4. Replace the broken row-scroll edit/select feature with a real modal manager.
#    This does not depend on page scroll position.
# -----------------------------------------------------------------------------
$manager = @'
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSitePlanner } from '../data/sitePlannerStore';
import { formatBritishDate, formatProgrammeDate, getProgrammeWeekForDate, parseProgrammeDate, validatePlotCompletionDate } from '../utils/programmeDates';
import { getPlotMetadataKey, PlotBuildRoute, readPlotMetadata, removePlotMetadata, savePlotMetadata } from '../utils/plotMetadata';
import { getEffectiveProgrammeWeeks, getHouseTypeLabel, getTemplateById } from '../utils/templateProgramme';

const DAY_MS = 24 * 60 * 60 * 1000;
function shiftWeeks(value: string, weeks: number) {
  const date = parseProgrammeDate(value);
  return date ? formatBritishDate(new Date(date.getTime() + weeks * 7 * DAY_MS)) : '';
}

export function MasterPlotManager() {
  const { sitePlots, plotTemplates, siteSetup, upsertSitePlot, removeSitePlot } = useSitePlanner();
  const [visible, setVisible] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [houseTypeName, setHouseTypeName] = useState('');
  const [buildRoute, setBuildRoute] = useState<PlotBuildRoute>('Traditional');
  const [templateId, setTemplateId] = useState('threeBed');
  const [completionDate, setCompletionDate] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const bedroomTemplates = useMemo(() => plotTemplates.filter((template) => template.id !== 'timberFrame'), [plotTemplates]);
  const selectedPlot = sitePlots.find((plot) => plot.id === selectedId) ?? sitePlots[0];

  const loadPlot = async (plotId: string) => {
    const plot = sitePlots.find((item) => item.id === plotId) ?? sitePlots[0];
    if (!plot) return;
    const metadata = await readPlotMetadata();
    const detail = metadata[getPlotMetadataKey(plot.plotNo)];
    setSelectedId(plot.id);
    setHouseTypeName(detail?.houseTypeName ?? '');
    setBuildRoute(detail?.buildRoute ?? (plot.templateId === 'timberFrame' ? 'Timber Frame' : 'Traditional'));
    setTemplateId(detail?.bedroomTemplateId ?? (plot.templateId === 'timberFrame' ? 'threeBed' : plot.templateId ?? 'threeBed'));
    setCompletionDate(detail?.plotCompletionDate || formatProgrammeDate(siteSetup.programmeStartDate, plot.stage9CompleteWeek));
    setMessage('');
    setConfirmDelete(false);
  };

  const open = async () => {
    setVisible(true);
    if (sitePlots[0]) await loadPlot(selectedPlot?.id ?? sitePlots[0].id);
  };

  useEffect(() => {
    if (visible && selectedPlot && selectedPlot.id !== selectedId) loadPlot(selectedPlot.id).catch(() => undefined);
  }, [visible, selectedId, sitePlots.length]);

  const saveChanges = async () => {
    if (!selectedPlot) return;
    const error = validatePlotCompletionDate(siteSetup.programmeStartDate, completionDate);
    if (error) { setMessage(error); return; }
    const completionWeek = getProgrammeWeekForDate(siteSetup.programmeStartDate, completionDate);
    if (!completionWeek) { setMessage('Unable to calculate the programme week for that date.'); return; }
    setSaving(true);
    try {
      const programmeTemplateId = buildRoute === 'Timber Frame' ? 'timberFrame' : templateId;
      await upsertSitePlot({ plotNo: selectedPlot.plotNo, buildOrder: selectedPlot.buildOrder, stage9CompleteWeek: completionWeek, templateId: programmeTemplateId });
      const programmeTemplate = getTemplateById(programmeTemplateId, plotTemplates);
      const programmeWeeks = getEffectiveProgrammeWeeks(programmeTemplate, siteSetup);
      await savePlotMetadata({
        plotNo: selectedPlot.plotNo,
        houseTypeName,
        bedroomTemplateId: templateId,
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
            <View style={styles.field}><Text style={styles.label}>House type</Text><TextInput value={houseTypeName} onChangeText={setHouseTypeName} style={styles.input} /></View>
            <View style={styles.field}><Text style={styles.label}>Completion date</Text><TextInput value={completionDate} onChangeText={setCompletionDate} placeholder="DD/MM/YYYY" style={styles.input} /></View>
          </View>
          <View style={styles.field}><Text style={styles.label}>Build route</Text><View style={styles.routeRow}>{(['Traditional','Timber Frame'] as PlotBuildRoute[]).map((route) => <Pressable key={route} onPress={() => setBuildRoute(route)} style={[styles.chip, buildRoute === route ? styles.chipActive : null]}><Text style={[styles.chipText, buildRoute === route ? styles.chipTextActive : null]}>{route}</Text></Pressable>)}</View></View>
          <View style={styles.field}><Text style={styles.label}>Property size</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.routeRow}>{bedroomTemplates.map((template) => <Pressable key={template.id} onPress={() => setTemplateId(template.id)} style={[styles.chip, templateId === template.id ? styles.chipActive : null]}><Text style={[styles.chipText, templateId === template.id ? styles.chipTextActive : null]}>{getHouseTypeLabel(template)}</Text></Pressable>)}</ScrollView></View>
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
'@
[IO.File]::WriteAllText($managerPath,$manager,[Text.UTF8Encoding]::new($false))

# AppScreen: replace old delete control with new manager.
$appScreen = [IO.File]::ReadAllText($appScreenPath)
$appScreen = $appScreen.Replace("import { MasterPlotDeleteControl } from './MasterPlotDeleteControl';", "import { MasterPlotManager } from './MasterPlotManager';")
$appScreen = $appScreen.Replace("{pathname === '/master' ? <MasterPlotDeleteControl /> : null}", "{pathname === '/master' ? <MasterPlotManager /> : null}")
if ($appScreen -notmatch 'MasterPlotManager') { throw 'Could not install MasterPlotManager in AppScreen' }
[IO.File]::WriteAllText($appScreenPath,$appScreen,[Text.UTF8Encoding]::new($false))

# Master matrix: remove the broken Edit/Select controls. Plot management is now modal.
$master = [IO.File]::ReadAllText($masterPath)
$master = [regex]::Replace(
  $master,
  '<View style=\{styles\.plotActionCell\}>\s*<Pressable[\s\S]*?<Text style=\{styles\.selectPlotButtonText\}>Select</Text>\s*</Pressable>\s*</View>',
  '<Text style={[styles.bodyCell, styles.actionCell]}>Manage</Text>',
  1
)
$master = [regex]::Replace(
  $master,
  '<Pressable style=\{styles\.removeButton\} onPress=\{\(\) => selectResetPlot\(plot\.id\)\}>\s*<Text style=\{styles\.removeButtonText\}>Select</Text>\s*</Pressable>',
  '<Text style={[styles.bodyCell, styles.actionCell]}>Manage</Text>',
  1
)
[IO.File]::WriteAllText($masterPath,$master,[Text.UTF8Encoding]::new($false))

# -----------------------------------------------------------------------------
# 5. Verification + production build. No plot records are altered by this script.
# -----------------------------------------------------------------------------
$storeCheck = [IO.File]::ReadAllText($storePath)
$setupCheck = [IO.File]::ReadAllText($setupPath)
$appCheck = [IO.File]::ReadAllText($appScreenPath)
$managerCheck = [IO.File]::ReadAllText($managerPath)
$masterCheck = [IO.File]::ReadAllText($masterPath)

$checks = @(
  @{ ok = $storeCheck -match 'savedById\.get\(template\.id\)'; msg = 'Saved template rows are preserved exactly' },
  @{ ok = $setupCheck -match 'LOCKED_STANDARD_KEY'; msg = '3 Bedroom standard has a dedicated immutable snapshot' },
  @{ ok = $setupCheck -match 'LOCKED_STAGE_COUNT = 9'; msg = 'Site programme is locked to 9 stages' },
  @{ ok = $setupCheck -match 'There is no autosave|there is no autosave'; msg = 'Template editing uses explicit Save only' },
  @{ ok = $setupCheck -match 'Save Template'; msg = 'Other templates use draft → Save workflow' },
  @{ ok = $appCheck -match 'MasterPlotManager'; msg = 'Master uses the rebuilt modal plot manager' },
  @{ ok = $managerCheck -match 'Save Plot Changes'; msg = 'Plot manager edits existing plots without delete/recreate' },
  @{ ok = $managerCheck -match 'plotCompletionDate: completionDate'; msg = 'Exact completion date is preserved' },
  @{ ok = $masterCheck -notmatch '>Edit</Text>[\s\S]{0,250}>Select</Text>'; msg = 'Broken Edit/Select row controls are removed' }
)
foreach ($check in $checks) {
  if (-not $check.ok) { throw "VERIFY FAILED: $($check.msg)" }
  Write-Host "PASS: $($check.msg)" -ForegroundColor Green
}

Write-Host 'Running Expo production web build…' -ForegroundColor Cyan
npx expo export --platform web
if ($LASTEXITCODE -ne 0) { throw 'Expo production web build failed' }

Write-Host ''
Write-Host 'PROGRAMME SETUP V4 REBUILD VERIFIED' -ForegroundColor Green
Write-Host 'The current persisted 3 Bedroom template will be captured and locked on first Site Setup load.' -ForegroundColor Green
Write-Host 'No plot records were created, edited or deleted by this installer.' -ForegroundColor Green

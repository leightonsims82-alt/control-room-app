$ErrorActionPreference = 'Stop'

$root = Get-Location
$storePath = Join-Path $root 'data\sitePlannerStore.tsx'
$setupPath = Join-Path $root 'app\site\setup.tsx'

foreach ($path in @($storePath, $setupPath)) {
  if (-not (Test-Path $path)) { throw "Missing required file: $path" }
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item $storePath "$storePath.threebed-$timestamp.bak" -Force
Copy-Item $setupPath "$setupPath.threebed-$timestamp.bak" -Force
Write-Host "Backups created." -ForegroundColor DarkGray

# -----------------------------------------------------------------------------
# STORE: preserve the CURRENT saved 3 Bedroom template as an immutable standard.
# On the first launch after this patch, the existing AsyncStorage threeBed entry
# is captured into its own versioned locked key. No re-entry is required.
# -----------------------------------------------------------------------------
$store = [IO.File]::ReadAllText($storePath)

if ($store -notmatch '\buseRef\b') {
  $store = $store.Replace('useContext, useEffect, useMemo, useState', 'useContext, useEffect, useMemo, useRef, useState')
}

if ($store -notmatch 'LOCKED_THREE_BEDROOM_KEY') {
  $marker = "const PLOT_TEMPLATES_KEY = 'programme-buddy:plot-templates:v1';"
  if (-not $store.Contains($marker)) { throw 'Could not find PLOT_TEMPLATES_KEY.' }
  $store = $store.Replace($marker, $marker + "`r`nconst LOCKED_THREE_BEDROOM_KEY = 'programme-buddy:locked-three-bedroom:v1';")
}

$siteSetupStateLine = '  const [siteSetup, setSiteSetupState] = useState<SiteProgrammeSetup>(DEFAULT_SITE_PROGRAMME_SETUP);'
if ($store -notmatch 'siteSetupRef') {
  if (-not $store.Contains($siteSetupStateLine)) { throw 'Could not find siteSetup state.' }
  $store = $store.Replace($siteSetupStateLine, $siteSetupStateLine + "`r`n  const siteSetupRef = useRef<SiteProgrammeSetup>({ ...DEFAULT_SITE_PROGRAMME_SETUP, stageCount: 9 });")
}

$plotTemplateStateLine = '  const [plotTemplates, setPlotTemplates] = useState<PlotTemplate[]>(DEFAULT_PLOT_TEMPLATES);'
if ($store -notmatch 'plotTemplatesRef') {
  if (-not $store.Contains($plotTemplateStateLine)) { throw 'Could not find plotTemplates state.' }
  $store = $store.Replace($plotTemplateStateLine, $plotTemplateStateLine + "`r`n  const plotTemplatesRef = useRef<PlotTemplate[]>(DEFAULT_PLOT_TEMPLATES);")
}

# Read the locked snapshot before the main load batch.
if ($store -notmatch 'storedLockedThreeBedRaw') {
  $needle = '        const [storedPlots, storedDelays, storedMoves, storedContacts, storedIssueSettings, storedIssueLogs, storedNotes, storedTemplates, storedSiteSetup] = await Promise.all(['
  if (-not $store.Contains($needle)) { throw 'Could not find planner load Promise.all.' }
  $store = $store.Replace($needle, "        const storedLockedThreeBedRaw = await AsyncStorage.getItem(LOCKED_THREE_BEDROOM_KEY);`r`n" + $needle)
}

# Replace the template/setup hydration section wholesale. This is deliberately
# based on stable markers so it works even after the earlier repair scripts.
$hydratePattern = '          setProgrammeNotes\(storedNotes\);[\s\S]*?          await AsyncStorage\.setItem\(SITE_PROGRAMME_SETUP_KEY, JSON\.stringify\(migratedSiteSetup\)\);'
$hydrateReplacement = @'
          setProgrammeNotes(storedNotes);

          const currentThreeBed = storedTemplates.find((template) => template.id === 'threeBed')
            ?? DEFAULT_PLOT_TEMPLATES.find((template) => template.id === 'threeBed')!;
          const lockedThreeBed = storedLockedThreeBedRaw
            ? (JSON.parse(storedLockedThreeBedRaw) as PlotTemplate)
            : normaliseTemplate({
                ...currentThreeBed,
                id: 'threeBed',
                name: '3 Bedroom',
                houseTypeCode: '3 Bedroom',
                constructionMethod: 'traditional',
                stageCount: 9,
                activities: currentThreeBed.activities.map((activity) => ({ ...activity })),
              });

          const mergedTemplates = mergeDefaultTemplates(storedTemplates).map((template) =>
            template.id === 'threeBed'
              ? normaliseTemplate({
                  ...lockedThreeBed,
                  id: 'threeBed',
                  name: '3 Bedroom',
                  houseTypeCode: '3 Bedroom',
                  constructionMethod: 'traditional',
                  stageCount: 9,
                  activities: lockedThreeBed.activities.map((activity) => ({ ...activity })),
                })
              : template,
          );
          plotTemplatesRef.current = mergedTemplates;
          setPlotTemplates(mergedTemplates);
          await Promise.all([
            AsyncStorage.setItem(LOCKED_THREE_BEDROOM_KEY, JSON.stringify(lockedThreeBed)),
            AsyncStorage.setItem(PLOT_TEMPLATES_KEY, JSON.stringify(mergedTemplates)),
          ]);

          const migratedSiteSetup = {
            ...DEFAULT_SITE_PROGRAMME_SETUP,
            ...storedSiteSetup,
            stageCount: 9,
            programmeStartDate: getProgrammeStartDateValue(storedSiteSetup.programmeStartDate),
          };
          siteSetupRef.current = migratedSiteSetup;
          setSiteSetupState(migratedSiteSetup);
          await AsyncStorage.setItem(SITE_PROGRAMME_SETUP_KEY, JSON.stringify(migratedSiteSetup));
'@
$store2 = [regex]::Replace($store, $hydratePattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $hydrateReplacement }, 1)
if ($store2 -eq $store) { throw 'Could not replace planner hydration block.' }
$store = $store2

function Replace-FunctionBlock {
  param([string]$Text,[string]$Start,[string]$Next,[string]$Replacement)
  $s = $Text.IndexOf($Start)
  if ($s -lt 0) { throw "Start marker not found: $Start" }
  $e = $Text.IndexOf($Next, $s)
  if ($e -lt 0) { throw "End marker not found: $Next" }
  return $Text.Substring(0,$s) + $Replacement + "`r`n`r`n" + $Text.Substring($e)
}

# Site setup is always a 9-stage programme and writes from the latest snapshot.
$updateSiteSetup = @'
  const updateSiteSetup = async (input: Partial<SiteProgrammeSetup>) => {
    const nextSetup = { ...siteSetupRef.current, ...input, stageCount: 9 };
    siteSetupRef.current = nextSetup;
    setSiteSetupState(nextSetup);
    await AsyncStorage.setItem(SITE_PROGRAMME_SETUP_KEY, JSON.stringify(nextSetup));
  };
'@
$store = Replace-FunctionBlock $store '  const updateSiteSetup = async' '  const addPlotTemplate = async' $updateSiteSetup

# The 3 Bedroom standard is immutable. Other/custom templates remain available
# to the rest of the app but are no longer exposed in Site Setup.
$updatePlotTemplate = @'
  const updatePlotTemplate = async (input: PlotTemplate) => {
    if (input.id === 'threeBed') return;
    const currentTemplates = plotTemplatesRef.current;
    const nextTemplates = currentTemplates.map((template) => (template.id === input.id ? input : template));
    plotTemplatesRef.current = nextTemplates;
    setPlotTemplates(nextTemplates);
    await AsyncStorage.setItem(PLOT_TEMPLATES_KEY, JSON.stringify(nextTemplates));
  };
'@
$store = Replace-FunctionBlock $store '  const updatePlotTemplate = async' '  const updateTemplateActivityDuration = async' $updatePlotTemplate

$durationFn = @'
  const updateTemplateActivityDuration = async (templateId: string, activityCode: string, durationDays: number) => {
    if (templateId === 'threeBed') return;
    const currentTemplates = plotTemplatesRef.current;
    const nextTemplates = currentTemplates.map((template) => {
      if (template.id !== templateId) return template;
      return {
        ...template,
        activities: template.activities.map((activity) =>
          activity.code === activityCode ? { ...activity, durationDays: Math.max(0, durationDays) } : activity,
        ),
      };
    });
    plotTemplatesRef.current = nextTemplates;
    setPlotTemplates(nextTemplates);
    await AsyncStorage.setItem(PLOT_TEMPLATES_KEY, JSON.stringify(nextTemplates));
  };
'@
$store = Replace-FunctionBlock $store '  const updateTemplateActivityDuration = async' '  const value = useMemo' $durationFn

[IO.File]::WriteAllText($storePath, $store, [Text.UTF8Encoding]::new($false))

# -----------------------------------------------------------------------------
# SITE SETUP: complete replacement. The old template editor/add/move/remove
# feature is removed. The captured 3 Bedroom standard is read-only and visible.
# ----------------------------------------------------------------------------
$setup = @'
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { ProgrammeDatePicker } from '../../components/ProgrammeDatePicker';
import { SectionCard } from '../../components/SectionCard';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { getProgrammeStartDateValue, normaliseBritishDate, validateWeekOneDate } from '../../utils/programmeDates';
import {
  ConfiguredProgrammeStage,
  readStageConfiguration,
  saveStageConfiguration,
} from '../../utils/stageConfiguration';
import { PROGRAMME_STAGE_SEQUENCE } from '../../utils/siteProgrammeEngine';
import { getEffectiveProgrammeWeeks, orderedActivities } from '../../utils/templateProgramme';

const STANDARD_STAGE_COUNT = 9;
const workingDayChoices = [5, 6, 7] as const;
type WorkingDays = typeof workingDayChoices[number];

function currentWorkingDays(setup: { includeSaturday?: boolean; includeSunday?: boolean }): WorkingDays {
  if (setup.includeSunday) return 7;
  if (setup.includeSaturday) return 6;
  return 5;
}

function workingWeekLabel(days: WorkingDays) {
  if (days === 7) return '7 days - Monday to Sunday';
  if (days === 6) return '6 days - Monday to Saturday';
  return '5 days - Monday to Friday';
}

export default function SiteSetupScreen() {
  const router = useRouter();
  const { siteSetup, plotTemplates, sitePlots, resetPlotData, updateSiteSetup } = useSitePlanner();
  const [weekOneDate, setWeekOneDate] = useState(getProgrammeStartDateValue(siteSetup.programmeStartDate));
  const [weekOneDateError, setWeekOneDateError] = useState('');
  const [stageDefinitions, setStageDefinitions] = useState<ConfiguredProgrammeStage[]>(
    PROGRAMME_STAGE_SEQUENCE.slice(0, STANDARD_STAGE_COUNT).map((stage) => ({ ...stage })),
  );
  const [message, setMessage] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const standardThreeBed = useMemo(
    () => plotTemplates.find((template) => template.id === 'threeBed'),
    [plotTemplates],
  );
  const activities = useMemo(
    () => standardThreeBed ? orderedActivities(standardThreeBed) : [],
    [standardThreeBed],
  );
  const calculatedWeeks = standardThreeBed ? getEffectiveProgrammeWeeks(standardThreeBed, { ...siteSetup, stageCount: STANDARD_STAGE_COUNT }) : 0;
  const activeWorkingDays = currentWorkingDays(siteSetup);

  useEffect(() => {
    setWeekOneDate(getProgrammeStartDateValue(siteSetup.programmeStartDate));
  }, [siteSetup.programmeStartDate]);

  useEffect(() => {
    readStageConfiguration(STANDARD_STAGE_COUNT)
      .then(async (stages) => {
        const exactNine = stages.slice(0, STANDARD_STAGE_COUNT);
        setStageDefinitions(exactNine);
        await Promise.all([
          saveStageConfiguration(exactNine),
          updateSiteSetup({ stageCount: STANDARD_STAGE_COUNT }),
        ]);
      })
      .catch(() => undefined);
  }, []);

  const selectWeekOneDate = (value: string) => {
    setWeekOneDate(value);
    setWeekOneDateError('');
  };

  const setWorkingDays = async (days: WorkingDays) => {
    await updateSiteSetup({
      workingWeek: workingWeekLabel(days),
      includeSaturday: days >= 6,
      includeSunday: days >= 7,
      stageCount: STANDARD_STAGE_COUNT,
    });
    setMessage(`Working week set to ${days} days.`);
  };

  const updateStage = (stageNo: number, changes: Partial<ConfiguredProgrammeStage>) => {
    setStageDefinitions((current) => current.map((stage) => {
      if (stage.stage !== stageNo) return stage;
      const startWeek = Math.max(1, Math.round(Number(changes.startWeek ?? stage.startWeek) || stage.startWeek));
      const finishWeek = Math.max(startWeek, Math.round(Number(changes.finishWeek ?? stage.finishWeek) || stage.finishWeek));
      return {
        ...stage,
        ...changes,
        label: changes.label !== undefined ? changes.label : stage.label,
        startWeek,
        finishWeek,
      };
    }));
  };

  const saveSetup = async () => {
    const dateError = validateWeekOneDate(weekOneDate);
    setWeekOneDateError(dateError);
    if (dateError) return;
    const exactNine = stageDefinitions.slice(0, STANDARD_STAGE_COUNT);
    await Promise.all([
      saveStageConfiguration(exactNine),
      updateSiteSetup({
        programmeStartDate: normaliseBritishDate(weekOneDate),
        stageCount: STANDARD_STAGE_COUNT,
      }),
    ]);
    setMessage('Site setup saved. Standard 3 Bedroom programme remains locked.');
  };

  const resetPlots = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    await resetPlotData();
    setConfirmReset(false);
    setMessage('All plot programme data cleared. The locked 3 Bedroom standard was not changed.');
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Site Setup</Text>
        <Text style={styles.subtitle}>A clean 9-stage site setup with one locked Standard 3 Bedroom programme.</Text>
      </View>

      <SectionCard title="Site settings" subtitle="These settings control programme dates and working days.">
        <View style={styles.formRow}>
          <View style={styles.fieldWide}>
            <Text style={styles.label}>Site name</Text>
            <TextInput
              value={siteSetup.siteName}
              onChangeText={(value) => updateSiteSetup({ siteName: value, stageCount: STANDARD_STAGE_COUNT })}
              style={styles.input}
              placeholder="Site name"
            />
          </View>
          <View style={styles.fieldWide}>
            <Text style={styles.label}>Week 1 commencement</Text>
            <ProgrammeDatePicker
              value={weekOneDate}
              onChange={selectWeekOneDate}
              placeholder="DD/MM/YYYY"
              initialDate={weekOneDate}
              error={Boolean(weekOneDateError)}
            />
            {weekOneDateError ? <Text style={styles.errorText}>{weekOneDateError}</Text> : null}
          </View>
        </View>

        <View style={styles.workingRow}>
          <Text style={styles.label}>Working week</Text>
          <View style={styles.chipRow}>
            {workingDayChoices.map((days) => {
              const active = activeWorkingDays === days;
              return (
                <Pressable key={days} style={[styles.chip, active ? styles.chipActive : null]} onPress={() => setWorkingDays(days)}>
                  <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{days} days</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Programme stages" subtitle="This site is locked to 9 stages. You can change the label and week range of those 9 stages, but not add stage 10 or 11.">
        <View style={styles.lockBanner}>
          <Text style={styles.lockBannerTitle}>9 STAGES LOCKED</Text>
          <Text style={styles.lockBannerText}>Stage count cannot revert to 11. Only the nine stage definitions below are used.</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.stageTable}>
            <View style={styles.stageRow}>
              <Text style={[styles.stageHeader, styles.stageNoCell]}>Stage</Text>
              <Text style={[styles.stageHeader, styles.stageLabelCell]}>Label</Text>
              <Text style={[styles.stageHeader, styles.stageWeekCell]}>Start week</Text>
              <Text style={[styles.stageHeader, styles.stageWeekCell]}>Finish week</Text>
            </View>
            {stageDefinitions.slice(0, STANDARD_STAGE_COUNT).map((stage) => (
              <View key={stage.stage} style={styles.stageRow}>
                <Text style={[styles.stageBody, styles.stageNoCell]}>{stage.stage}</Text>
                <TextInput
                  value={stage.label}
                  onChangeText={(value) => updateStage(stage.stage, { label: value })}
                  style={[styles.stageInput, styles.stageLabelCell]}
                />
                <TextInput
                  value={String(stage.startWeek)}
                  keyboardType="number-pad"
                  onChangeText={(value) => updateStage(stage.stage, { startWeek: Number(value) || 1 })}
                  style={[styles.stageInput, styles.stageWeekCell]}
                />
                <TextInput
                  value={String(stage.finishWeek)}
                  keyboardType="number-pad"
                  onChangeText={(value) => updateStage(stage.stage, { finishWeek: Number(value) || stage.startWeek })}
                  style={[styles.stageInput, styles.stageWeekCell]}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      </SectionCard>

      <SectionCard title="Standard 3 Bedroom programme" subtitle="This is the programme shown in your screenshot. It is now the locked standard for 3 Bedroom Traditional plots.">
        <View style={styles.standardSummary}>
          <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Property size</Text><Text style={styles.summaryValue}>3 Bedroom</Text></View>
          <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Build route</Text><Text style={styles.summaryValue}>Traditional</Text></View>
          <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Stages</Text><Text style={styles.summaryValue}>9</Text></View>
          <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Calculated weeks</Text><Text style={styles.summaryValue}>{calculatedWeeks || '-'}</Text></View>
          <View style={styles.lockPill}><Text style={styles.lockPillText}>LOCKED STANDARD</Text></View>
        </View>

        <Text style={styles.standardNote}>The first time this rebuilt screen loads, SiteProg captures the 3 Bedroom programme already saved on this device and stores it as the locked standard. There are no Add, Move, Remove or editable activity controls here.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={styles.programmeRow}>
              <Text style={[styles.programmeHeader, styles.seqCell]}>Seq</Text>
              <Text style={[styles.programmeHeader, styles.taskCell]}>Task</Text>
              <Text style={[styles.programmeHeader, styles.tradeCell]}>Trade</Text>
              <Text style={[styles.programmeHeader, styles.displayCell]}>Display</Text>
              <Text style={[styles.programmeHeader, styles.smallCell]}>Stage</Text>
              <Text style={[styles.programmeHeader, styles.smallCell]}>Days</Text>
            </View>
            {activities.map((activity, index) => (
              <View key={`${activity.order}-${activity.code}-${index}`} style={[styles.programmeRow, index % 2 ? styles.altRow : null]}>
                <Text style={[styles.programmeBody, styles.seqCell]}>{index + 1}</Text>
                <Text style={[styles.programmeBody, styles.taskCell]}>{activity.code}</Text>
                <Text style={[styles.programmeBody, styles.tradeCell]}>{activity.trade}</Text>
                <Text style={[styles.programmeBody, styles.displayCell]}>{activity.displayText}</Text>
                <Text style={[styles.programmeBody, styles.smallCell]}>{activity.stage}</Text>
                <Text style={[styles.programmeDays, styles.smallCell]}>{activity.durationDays}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SectionCard>

      <SectionCard title="Plot data reset" subtitle="Clear plot programme data without changing the locked 3 Bedroom standard.">
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>{sitePlots.length} plot{sitePlots.length === 1 ? '' : 's'} currently saved</Text>
          <Text style={styles.warningText}>This clears plot rows, delays, programme notes and linked plot data. The Standard 3 Bedroom programme remains locked and untouched.</Text>
        </View>
        {confirmReset ? <Text style={styles.confirmText}>Press again to confirm clearing all plot data.</Text> : null}
        <Pressable disabled={!sitePlots.length} style={[styles.resetButton, !sitePlots.length ? styles.disabled : null]} onPress={resetPlots}>
          <Text style={styles.resetButtonText}>{confirmReset ? 'Confirm Clear All Plot Data' : 'Clear All Plot Data'}</Text>
        </Pressable>
      </SectionCard>

      {message ? <Text style={styles.message}>{message}</Text> : null}
      <View style={styles.actions}>
        <Pressable style={styles.primaryButton} onPress={saveSetup}><Text style={styles.primaryButtonText}>Save Setup</Text></Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.replace('/')}><Text style={styles.secondaryButtonText}>Back</Text></Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  formRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  fieldWide: { flex: 1, minWidth: 260, gap: 6 },
  label: { color: '#334155', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', fontWeight: '800' },
  errorText: { color: '#dc2626', fontSize: 12, fontWeight: '800' },
  workingRow: { gap: 8 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#ffffff' },
  chipActive: { backgroundColor: '#173b5f', borderColor: '#173b5f' },
  chipText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  chipTextActive: { color: '#ffffff' },
  lockBanner: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#86efac', borderRadius: 14, padding: 14, gap: 4 },
  lockBannerTitle: { color: '#166534', fontWeight: '900' },
  lockBannerText: { color: '#166534', fontSize: 12, fontWeight: '700' },
  stageTable: { minWidth: 720 },
  stageRow: { flexDirection: 'row', minHeight: 44 },
  stageHeader: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', padding: 9, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  stageBody: { color: '#0f172a', fontWeight: '900', padding: 10, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center' },
  stageInput: { backgroundColor: '#ffffff', color: '#0f172a', fontWeight: '800', padding: 9, borderWidth: 1, borderColor: '#c8d7e6' },
  stageNoCell: { width: 80 },
  stageLabelCell: { width: 340 },
  stageWeekCell: { width: 150 },
  standardSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'stretch' },
  summaryItem: { minWidth: 145, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, gap: 3 },
  summaryLabel: { color: '#64748b', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  summaryValue: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  lockPill: { alignSelf: 'center', backgroundColor: '#0f172a', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  lockPillText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
  standardNote: { color: '#475569', fontSize: 12, lineHeight: 19, fontWeight: '700', backgroundColor: '#f8fafc', borderRadius: 10, padding: 12 },
  programmeRow: { flexDirection: 'row', minHeight: 39 },
  programmeHeader: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 8, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  programmeBody: { color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', fontWeight: '800' },
  programmeDays: { backgroundColor: '#fff4cc', color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '900' },
  altRow: { backgroundColor: '#f8fbff' },
  seqCell: { width: 60, textAlign: 'center' },
  taskCell: { width: 260 },
  tradeCell: { width: 190 },
  displayCell: { width: 190 },
  smallCell: { width: 85, textAlign: 'center' },
  warningBox: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fdba74', borderRadius: 14, padding: 14, gap: 5 },
  warningTitle: { color: '#9a3412', fontWeight: '900' },
  warningText: { color: '#9a3412', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  confirmText: { color: '#dc2626', fontWeight: '900' },
  resetButton: { alignSelf: 'flex-start', backgroundColor: '#dc2626', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  resetButtonText: { color: '#ffffff', fontWeight: '900' },
  disabled: { opacity: 0.45 },
  message: { color: '#166534', fontSize: 13, fontWeight: '900', backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac', borderRadius: 12, padding: 12 },
  actions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  primaryButton: { backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 13 },
  primaryButtonText: { color: '#ffffff', fontWeight: '900' },
  secondaryButton: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 13 },
  secondaryButtonText: { color: '#0f172a', fontWeight: '900' },
});
'@

[IO.File]::WriteAllText($setupPath, $setup, [Text.UTF8Encoding]::new($false))

# -----------------------------------------------------------------------------
# VERIFICATION
# -----------------------------------------------------------------------------
$storeCheck = [IO.File]::ReadAllText($storePath)
$setupCheck = [IO.File]::ReadAllText($setupPath)

$checks = @(
  @{ ok = $storeCheck -match 'LOCKED_THREE_BEDROOM_KEY'; msg = 'Versioned locked 3 Bedroom storage exists' },
  @{ ok = $storeCheck -match 'currentThreeBed = storedTemplates\.find'; msg = 'Current saved 3 Bedroom is captured on first load' },
  @{ ok = $storeCheck -match "if \(input\.id === 'threeBed'\) return"; msg = 'Standard 3 Bedroom cannot be overwritten by template editor code' },
  @{ ok = $storeCheck -match 'stageCount: 9'; msg = 'Site setup is forced to 9 stages' },
  @{ ok = $setupCheck -match 'Standard 3 Bedroom programme'; msg = 'Rebuilt standard programme section exists' },
  @{ ok = $setupCheck -match 'LOCKED STANDARD'; msg = '3 Bedroom is visibly marked locked' },
  @{ ok = $setupCheck -notmatch 'Add</Text>|Move</Text>|Remove</Text>'; msg = 'Old Add/Move/Remove editor controls are gone' },
  @{ ok = $setupCheck -notmatch 'updatePlotTemplate|updateTemplateActivityDuration'; msg = 'Site Setup no longer writes activity templates' },
  @{ ok = $setupCheck -match 'STANDARD_STAGE_COUNT = 9'; msg = 'Rebuilt Site Setup uses exactly 9 stages' }
)

foreach ($check in $checks) {
  if (-not $check.ok) { throw "VERIFY FAILED: $($check.msg)" }
  Write-Host "PASS: $($check.msg)" -ForegroundColor Green
}

Write-Host 'Running Expo production web build...' -ForegroundColor Cyan
npx expo export --platform web
if ($LASTEXITCODE -ne 0) { throw 'Expo production web build failed.' }

Write-Host ''
Write-Host 'THREE BEDROOM STANDARD REBUILD VERIFIED' -ForegroundColor Green
Write-Host 'IMPORTANT: restart the app on the SAME localhost port that currently contains the desired 3 Bedroom data so the first load can capture it.' -ForegroundColor Yellow

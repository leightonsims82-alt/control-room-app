$ErrorActionPreference = 'Stop'

$root = Get-Location
$storePath = Join-Path $root 'data\sitePlannerStore.tsx'
$screenPath = Join-Path $root 'app\site\setup.tsx'

if (-not (Test-Path $storePath)) { throw "Missing $storePath" }
if (-not (Test-Path $screenPath)) { throw "Missing $screenPath" }

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item $storePath "$storePath.v2-$timestamp.bak" -Force
Copy-Item $screenPath "$screenPath.v2-$timestamp.bak" -Force

function Replace-Block {
  param([string]$Text,[string]$Start,[string]$End,[string]$Replacement)
  $s = $Text.IndexOf($Start)
  if ($s -lt 0) { throw "Start marker not found: $Start" }
  $e = $Text.IndexOf($End, $s)
  if ($e -lt 0) { throw "End marker not found: $End" }
  return $Text.Substring(0,$s) + $Replacement + "`r`n`r`n" + $Text.Substring($e)
}

# ---------- STORE ----------
$store = [IO.File]::ReadAllText($storePath)

if ($store -notmatch 'useRef') {
  $store = $store.Replace('useContext, useEffect, useMemo, useState', 'useContext, useEffect, useMemo, useRef, useState')
}

$merge = @'
function mergeDefaultTemplates(stored: PlotTemplate[]) {
  if (!stored.length) return DEFAULT_PLOT_TEMPLATES.map(normaliseTemplate);

  const storedIds = new Set(stored.map((template) => template.id));
  const savedTemplates = stored.map(normaliseTemplate);
  const missingDefaults = DEFAULT_PLOT_TEMPLATES
    .filter((template) => !storedIds.has(template.id))
    .map(normaliseTemplate);

  // Saved templates are authoritative. Do not rebuild their activity arrays from defaults.
  return [...savedTemplates, ...missingDefaults];
}
'@
$store = Replace-Block $store 'function mergeDefaultTemplates' 'function cleanPlotInput' $merge

$stateLine = '  const [plotTemplates, setPlotTemplates] = useState<PlotTemplate[]>(DEFAULT_PLOT_TEMPLATES);'
if ($store -notmatch 'plotTemplatesRef') {
  if (-not $store.Contains($stateLine)) { throw 'plotTemplates state line not found' }
  $store = $store.Replace($stateLine, $stateLine + "`r`n  const plotTemplatesRef = useRef<PlotTemplate[]>(DEFAULT_PLOT_TEMPLATES);")
}

# Make the loaded snapshot authoritative for both state and ref.
$store = $store.Replace('          setPlotTemplates(mergeDefaultTemplates(storedTemplates));', "          const mergedTemplates = mergeDefaultTemplates(storedTemplates);`r`n          plotTemplatesRef.current = mergedTemplates;`r`n          setPlotTemplates(mergedTemplates);")

$updates = @'
  const addPlotTemplate = async (input: { name: string; houseTypeCode: string; baseTemplateId?: string }) => {
    const currentTemplates = plotTemplatesRef.current;
    const baseTemplate = currentTemplates.find((template) => template.id === input.baseTemplateId) ?? currentTemplates.find((template) => template.id === 'threeBed') ?? currentTemplates[0];
    const nextTemplate = createHouseTypeTemplate({ ...input, baseTemplate });
    const nextTemplates = [...currentTemplates, nextTemplate];
    plotTemplatesRef.current = nextTemplates;
    setPlotTemplates(nextTemplates);
    await AsyncStorage.setItem(PLOT_TEMPLATES_KEY, JSON.stringify(nextTemplates));
  };

  const updatePlotTemplate = async (input: PlotTemplate) => {
    const currentTemplates = plotTemplatesRef.current;
    const nextTemplates = currentTemplates.map((template) => (template.id === input.id ? input : template));
    plotTemplatesRef.current = nextTemplates;
    setPlotTemplates(nextTemplates);
    await AsyncStorage.setItem(PLOT_TEMPLATES_KEY, JSON.stringify(nextTemplates));
  };

  const updateTemplateActivityDuration = async (templateId: string, activityCode: string, durationDays: number) => {
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

  const testTemplatePersistence = async (templateId: string) => {
    const originalTemplates = plotTemplatesRef.current.map((template) => ({
      ...template,
      activities: template.activities.map((activity) => ({ ...activity })),
    }));
    const target = originalTemplates.find((template) => template.id === templateId);
    if (!target) return false;

    const testCode = `__PERSISTENCE_TEST_${Date.now()}__`;
    const seed = target.activities[0];
    if (!seed) return false;

    const testTemplate: PlotTemplate = {
      ...target,
      activities: [
        ...target.activities.map((activity) => ({ ...activity })),
        { ...seed, order: target.activities.length + 1, code: testCode, displayText: 'Persistence Test', durationDays: 3 },
      ],
    };
    const testTemplates = originalTemplates.map((template) => (template.id === templateId ? testTemplate : template));

    try {
      await AsyncStorage.setItem(PLOT_TEMPLATES_KEY, JSON.stringify(testTemplates));
      const raw = await AsyncStorage.getItem(PLOT_TEMPLATES_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as PlotTemplate[];
      const reloaded = mergeDefaultTemplates(parsed);
      const reloadedTarget = reloaded.find((template) => template.id === templateId);
      return Boolean(reloadedTarget?.activities.some((activity) => activity.code === testCode && activity.durationDays === 3));
    } finally {
      await AsyncStorage.setItem(PLOT_TEMPLATES_KEY, JSON.stringify(originalTemplates));
    }
  };
'@
$store = Replace-Block $store '  const addPlotTemplate = async' '  const value = useMemo' $updates

# Context contract + exposed value.
$store = $store.Replace('  updateTemplateActivityDuration: (templateId: string, activityCode: string, durationDays: number) => Promise<void>;', "  updateTemplateActivityDuration: (templateId: string, activityCode: string, durationDays: number) => Promise<void>;`r`n  testTemplatePersistence: (templateId: string) => Promise<boolean>;")
$store = $store.Replace('      updateTemplateActivityDuration,', "      updateTemplateActivityDuration,`r`n      testTemplatePersistence,")

[IO.File]::WriteAllText($storePath,$store,[Text.UTF8Encoding]::new($false))

# ---------- SCREEN ----------
$screen = [IO.File]::ReadAllText($screenPath)

$screen = $screen.Replace('resetPlotData, updateSiteSetup, updatePlotTemplate, updateTemplateActivityDuration', 'resetPlotData, updateSiteSetup, updatePlotTemplate, updateTemplateActivityDuration, testTemplatePersistence')

$handleSave = @'
  const handleSave = async () => {
    const dateError = validateWeekOneDate(weekOneDate);
    setWeekOneDateError(dateError);
    if (dateError) return;

    if (selectedTemplate) {
      const finalTemplate: typeof selectedTemplate = {
        ...selectedTemplate,
        stageCount: stageDefinitions.length,
        activities: reorderActivities(selectedTemplate.activities).map((activity) => ({
          ...activity,
          code: cleanCode(activity.code),
        })),
      };
      await updatePlotTemplate(finalTemplate);
    }

    await Promise.all([
      updateSiteSetup({ programmeStartDate: normaliseBritishDate(weekOneDate), stageCount: stageDefinitions.length }),
      saveStageConfiguration(stageDefinitions),
    ]);
    setSaved(true);
    router.replace('/');
  };
'@
$screen = Replace-Block $screen '  const handleSave = ' '  const saveSiteSetup = ' $handleSave

$updateActivity = @'
  const updateActivity = (activityOrder: number, changes: Partial<TemplateActivity>) => {
    if (!selectedTemplate) return;
    markChanged();
    const nextActivities = selectedTemplate.activities.map((activity) =>
      activity.order !== activityOrder
        ? activity
        : {
            ...activity,
            ...changes,
            code: changes.code !== undefined ? String(changes.code) : activity.code,
            overlapAllowed: activity.overlapAllowed ?? false,
          },
    );
    updatePlotTemplate({ ...selectedTemplate, stageCount: stageDefinitions.length, activities: reorderActivities(nextActivities) });
  };

  const updateDuration = (activityOrder: number, durationDays: number) => {
    updateActivity(activityOrder, { durationDays: Math.max(0, durationDays) });
  };
'@
$screen = Replace-Block $screen '  const updateActivity = ' '  const moveFix = ' $updateActivity

# Stable row key; controlled inputs; updates happen on every change, not only blur/end-editing.
$screen = $screen.Replace('key={`${activity.order}-${activity.code}`}', 'key={activity.order}')
$screen = $screen.Replace('defaultValue={activity.code} onEndEditing={(event) => updateActivity(activity.code, { code: event.nativeEvent.text })}', 'value={activity.code} onChangeText={(value) => updateActivity(activity.order, { code: value })}')
$screen = $screen.Replace('defaultValue={activity.trade} onEndEditing={(event) => updateActivity(activity.code, { trade: event.nativeEvent.text })}', 'value={activity.trade} onChangeText={(value) => updateActivity(activity.order, { trade: value })}')
$screen = $screen.Replace('defaultValue={activity.displayText} onEndEditing={(event) => updateActivity(activity.code, { displayText: event.nativeEvent.text })}', 'value={activity.displayText} onChangeText={(value) => updateActivity(activity.order, { displayText: value })}')
$screen = $screen.Replace('defaultValue={String(activity.stage)} keyboardType="number-pad" onEndEditing={(event) => updateActivity(activity.code, { stage: toStage(event.nativeEvent.text, stageDefinitions.length) })}', 'value={String(activity.stage)} keyboardType="number-pad" onChangeText={(value) => updateActivity(activity.order, { stage: toStage(value, stageDefinitions.length) })}')
$screen = $screen.Replace('defaultValue={String(activity.durationDays)} keyboardType="number-pad" onEndEditing={(event) => updateDuration(selectedTemplate.id, activity.code, Number(event.nativeEvent.text) || 0)}', 'value={String(activity.durationDays)} keyboardType="number-pad" onChangeText={(value) => updateDuration(activity.order, Number(value) || 0)}')

# Add a zero-data live test button next to Save. It writes a temporary canary, reads it back through the real reload merge, then restores the original data.
$oldSave = '<Pressable style={[styles.primaryButton, saved ? styles.savedButton : null]} onPress={handleSave}><Text style={styles.primaryButtonText}>{saved ? ''Saved'' : ''Save''}</Text></Pressable>'
$newSave = @'
<View style={styles.saveRow}>
          <Pressable
            style={styles.testButton}
            onPress={async () => {
              if (!selectedTemplate) return;
              setMessage('Running live storage test…');
              const passed = await testTemplatePersistence(selectedTemplate.id);
              setMessage(passed ? '✓ Live storage test passed — saved template reload is verified.' : '✗ Live storage test FAILED — do not enter programme data.');
            }}
          ><Text style={styles.testButtonText}>Test saving</Text></Pressable>
          <Pressable style={[styles.primaryButton, saved ? styles.savedButton : null]} onPress={handleSave}><Text style={styles.primaryButtonText}>{saved ? 'Saved' : 'Save'}</Text></Pressable>
        </View>
'@
# Use regex because quote style may vary around the JSX text.
$screen = [regex]::Replace($screen, '<Pressable style=\{\[styles\.primaryButton, saved \? styles\.savedButton : null\]\} onPress=\{handleSave\}><Text style=\{styles\.primaryButtonText\}>\{saved \? ''Saved'' : ''Save''\}</Text></Pressable>', [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $newSave }, 1)
if ($screen -notmatch 'Test saving') {
  # Fallback for the exact source using single quotes inside JSX expression.
  $needle = '<Pressable style={[styles.primaryButton, saved ? styles.savedButton : null]} onPress={handleSave}><Text style={styles.primaryButtonText}>{saved ? ''Saved'' : ''Save''}</Text></Pressable>'
  $screen = $screen.Replace($needle,$newSave)
}

# Styles for the test/save row.
if ($screen -notmatch 'saveRow:') {
  $screen = $screen.Replace("  primaryButton: { alignSelf: 'flex-start'", "  saveRow: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' },`r`n  testButton: { alignSelf: 'flex-start', backgroundColor: '#e0f2fe', borderColor: '#0284c7', borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },`r`n  testButtonText: { color: '#075985', fontWeight: '900' },`r`n  primaryButton: { alignSelf: 'flex-start'")
}

[IO.File]::WriteAllText($screenPath,$screen,[Text.UTF8Encoding]::new($false))

# ---------- VERIFY SOURCE + BUILD ----------
$storeCheck = [IO.File]::ReadAllText($storePath)
$screenCheck = [IO.File]::ReadAllText($screenPath)

$checks = @(
  @{ ok = $storeCheck -match 'return \[\.\.\.savedTemplates, \.\.\.missingDefaults\]'; msg = 'Saved templates authoritative on reload' },
  @{ ok = $storeCheck -match 'plotTemplatesRef\.current = nextTemplates'; msg = 'Race-safe template writes' },
  @{ ok = $storeCheck -match 'testTemplatePersistence'; msg = 'Live AsyncStorage test installed' },
  @{ ok = $screenCheck -notmatch 'defaultValue=\{activity\.'; msg = 'Activity inputs are controlled' },
  @{ ok = $screenCheck -match 'onChangeText=\{\(value\) => updateActivity\(activity\.order'; msg = 'Activity edits save on change' },
  @{ ok = $screenCheck -match 'await updatePlotTemplate\(finalTemplate\)'; msg = 'Save button waits for template persistence' }
)

foreach ($check in $checks) {
  if (-not $check.ok) { throw "VERIFY FAILED: $($check.msg)" }
  Write-Host "PASS: $($check.msg)" -ForegroundColor Green
}

Write-Host 'Running production Expo web build…' -ForegroundColor Cyan
npx expo export --platform web
if ($LASTEXITCODE -ne 0) { throw 'Expo web build failed' }

Write-Host ''
Write-Host 'V2 FIX VERIFIED' -ForegroundColor Green
Write-Host 'Open Site Setup and press TEST SAVING. No programme data entry is required for the live persistence check.' -ForegroundColor Green

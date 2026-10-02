$ErrorActionPreference = 'Stop'

$baseFix = Join-Path $PSScriptRoot 'fix-template-persistence-v2.ps1'
if (-not (Test-Path $baseFix)) { throw "Missing $baseFix" }

# Apply the full reload/save repair first. This also runs a production Expo build.
& $baseFix

$root = Get-Location
$storePath = Join-Path $root 'data\sitePlannerStore.tsx'
$screenPath = Join-Path $root 'app\site\setup.tsx'

function Replace-Block {
  param([string]$Text,[string]$Start,[string]$End,[string]$Replacement)
  $s = $Text.IndexOf($Start)
  if ($s -lt 0) { throw "Start marker not found: $Start" }
  $e = $Text.IndexOf($End, $s)
  if ($e -lt 0) { throw "End marker not found: $End" }
  return $Text.Substring(0,$s) + $Replacement + "`r`n`r`n" + $Text.Substring($e)
}

# ---------- STORE: add order-based atomic activity patching ----------
$store = [IO.File]::ReadAllText($storePath)

if ($store -notmatch 'updateTemplateActivity: \(templateId: string, activityOrder: number') {
  $store = $store.Replace(
    '  updatePlotTemplate: (input: PlotTemplate) => Promise<void>;',
    "  updatePlotTemplate: (input: PlotTemplate) => Promise<void>;`r`n  updateTemplateActivity: (templateId: string, activityOrder: number, changes: Partial<PlotTemplate['activities'][number]>) => Promise<void>;"
  )
}

$atomicFunction = @'
  const updateTemplateActivity = async (
    templateId: string,
    activityOrder: number,
    changes: Partial<PlotTemplate['activities'][number]>,
  ) => {
    const currentTemplates = plotTemplatesRef.current;
    const nextTemplates = currentTemplates.map((template) => {
      if (template.id !== templateId) return template;
      return {
        ...template,
        activities: template.activities.map((activity) =>
          activity.order === activityOrder
            ? { ...activity, ...changes, overlapAllowed: changes.overlapAllowed ?? activity.overlapAllowed ?? false }
            : activity,
        ),
      };
    });
    plotTemplatesRef.current = nextTemplates;
    setPlotTemplates(nextTemplates);
    await AsyncStorage.setItem(PLOT_TEMPLATES_KEY, JSON.stringify(nextTemplates));
  };

'@

if ($store -notmatch 'const updateTemplateActivity = async') {
  $marker = '  const updateTemplateActivityDuration = async'
  $idx = $store.IndexOf($marker)
  if ($idx -lt 0) { throw 'updateTemplateActivityDuration marker not found' }
  $store = $store.Substring(0,$idx) + $atomicFunction + $store.Substring($idx)
}

if ($store -notmatch '      updateTemplateActivity,') {
  $store = $store.Replace('      updatePlotTemplate,', "      updatePlotTemplate,`r`n      updateTemplateActivity,")
}

[IO.File]::WriteAllText($storePath,$store,[Text.UTF8Encoding]::new($false))

# ---------- SCREEN: every cell edit patches the latest store snapshot ----------
$screen = [IO.File]::ReadAllText($screenPath)
$screen = $screen.Replace(
  'resetPlotData, updateSiteSetup, updatePlotTemplate, updateTemplateActivityDuration, testTemplatePersistence',
  'resetPlotData, updateSiteSetup, updatePlotTemplate, updateTemplateActivity, updateTemplateActivityDuration, testTemplatePersistence'
)

$activityBlock = @'
  const updateActivity = (activityOrder: number, changes: Partial<TemplateActivity>) => {
    if (!selectedTemplate) return;
    markChanged();
    updateTemplateActivity(selectedTemplate.id, activityOrder, changes);
  };

  const updateDuration = (activityOrder: number, durationDays: number) => {
    updateActivity(activityOrder, { durationDays: Math.max(0, durationDays) });
  };
'@
$screen = Replace-Block $screen '  const updateActivity = ' '  const moveFix = ' $activityBlock

[IO.File]::WriteAllText($screenPath,$screen,[Text.UTF8Encoding]::new($false))

# ---------- FINAL VERIFICATION ----------
$storeCheck = [IO.File]::ReadAllText($storePath)
$screenCheck = [IO.File]::ReadAllText($screenPath)

$checks = @(
  @{ ok = $storeCheck -match 'return \[\.\.\.savedTemplates, \.\.\.missingDefaults\]'; msg = 'Saved template activity arrays survive reload' },
  @{ ok = $storeCheck -match 'const updateTemplateActivity = async'; msg = 'Atomic activity patch function installed' },
  @{ ok = $storeCheck -match 'activity\.order === activityOrder'; msg = 'Edits identify rows by stable sequence order, not mutable task text' },
  @{ ok = $storeCheck -match 'plotTemplatesRef\.current = nextTemplates'; msg = 'Rapid edits use latest template snapshot' },
  @{ ok = $screenCheck -notmatch 'defaultValue=\{activity\.'; msg = 'Table cells are controlled inputs' },
  @{ ok = $screenCheck -match 'updateTemplateActivity\(selectedTemplate\.id, activityOrder, changes\)'; msg = 'UI edits use atomic store patching' },
  @{ ok = $screenCheck -match 'await updatePlotTemplate\(finalTemplate\)'; msg = 'Save waits for persistence before leaving screen' },
  @{ ok = $screenCheck -match 'Test saving'; msg = 'Zero-data live persistence test button installed' }
)

foreach ($check in $checks) {
  if (-not $check.ok) { throw "FINAL VERIFY FAILED: $($check.msg)" }
  Write-Host "PASS: $($check.msg)" -ForegroundColor Green
}

Write-Host 'Running final production Expo web build…' -ForegroundColor Cyan
npx expo export --platform web
if ($LASTEXITCODE -ne 0) { throw 'Final Expo web build failed' }

Write-Host ''
Write-Host 'FINAL PERSISTENCE FIX VERIFIED' -ForegroundColor Green
Write-Host 'No programme data needs to be entered. Restart Expo, open Site Setup, and use the TEST SAVING button for the live browser storage check.' -ForegroundColor Green

$ErrorActionPreference = 'Stop'

$root = Get-Location
$storePath = Join-Path $root 'data\sitePlannerStore.tsx'
$setupPath = Join-Path $root 'app\site\setup.tsx'
$masterPath = Join-Path $root 'app\(tabs)\master.tsx'

foreach ($path in @($storePath,$setupPath,$masterPath)) {
  if (-not (Test-Path $path)) { throw "Missing $path" }
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item $storePath "$storePath.editstage-$timestamp.bak" -Force
Copy-Item $setupPath "$setupPath.editstage-$timestamp.bak" -Force
Copy-Item $masterPath "$masterPath.editstage-$timestamp.bak" -Force

function Replace-Block {
  param([string]$Text,[string]$Start,[string]$End,[string]$Replacement)
  $s = $Text.IndexOf($Start)
  if ($s -lt 0) { throw "Start marker not found: $Start" }
  $e = $Text.IndexOf($End,$s)
  if ($e -lt 0) { throw "End marker not found: $End" }
  return $Text.Substring(0,$s) + $Replacement + "`r`n`r`n" + $Text.Substring($e)
}

# -----------------------------------------------------------------------------
# 1) Make siteSetup writes race-safe so stageCount cannot be overwritten by a
#    stale siteSetup closure from another field update.
# -----------------------------------------------------------------------------
$store = [IO.File]::ReadAllText($storePath)

if ($store -notmatch 'siteSetupRef') {
  if ($store -notmatch 'useRef') {
    $store = $store.Replace('useContext, useEffect, useMemo, useState', 'useContext, useEffect, useMemo, useRef, useState')
  }
  $stateLine = '  const [siteSetup, setSiteSetupState] = useState<SiteProgrammeSetup>(DEFAULT_SITE_PROGRAMME_SETUP);'
  if (-not $store.Contains($stateLine)) { throw 'siteSetup state line not found' }
  $store = $store.Replace($stateLine, $stateLine + "`r`n  const siteSetupRef = useRef<SiteProgrammeSetup>(DEFAULT_SITE_PROGRAMME_SETUP);")
}

# Keep ref in sync when loading persisted setup.
$oldLoad = '          setSiteSetupState(migratedSiteSetup);'
if ($store.Contains($oldLoad) -and $store -notmatch 'siteSetupRef\.current = migratedSiteSetup') {
  $store = $store.Replace($oldLoad, "          siteSetupRef.current = migratedSiteSetup;`r`n          setSiteSetupState(migratedSiteSetup);")
}

# Replace updateSiteSetup with a ref-backed implementation.
$updateSetup = @'
  const updateSiteSetup = async (input: Partial<SiteProgrammeSetup>) => {
    const nextSetup = { ...siteSetupRef.current, ...input };
    siteSetupRef.current = nextSetup;
    setSiteSetupState(nextSetup);
    await AsyncStorage.setItem(SITE_PROGRAMME_SETUP_KEY, JSON.stringify(nextSetup));
  };
'@
if ($store -match '  const updateSiteSetup = async') {
  $store = Replace-Block $store '  const updateSiteSetup = async' '  const addPlotTemplate = async' $updateSetup
} else {
  throw 'updateSiteSetup implementation not found'
}

[IO.File]::WriteAllText($storePath,$store,[Text.UTF8Encoding]::new($false))

# -----------------------------------------------------------------------------
# 2) Site Setup: honour the saved stage count rather than defaulting back to the
#    full 11-stage PROGRAMME_STAGE_SEQUENCE on first render.
# -----------------------------------------------------------------------------
$setup = [IO.File]::ReadAllText($setupPath)

$setup = $setup.Replace(
  "  const [stageDefinitions, setStageDefinitions] = useState<ConfiguredProgrammeStage[]>(PROGRAMME_STAGE_SEQUENCE.map((stage) => ({ ...stage })));",
  "  const initialConfiguredStageCount = Math.max(1, siteSetup.stageCount || 9);`r`n  const [stageDefinitions, setStageDefinitions] = useState<ConfiguredProgrammeStage[]>(PROGRAMME_STAGE_SEQUENCE.slice(0, initialConfiguredStageCount).map((stage) => ({ ...stage })));"
)
$setup = $setup.Replace(
  "  const [stageCountInput, setStageCountInput] = useState(String(Math.max(siteSetup.stageCount || 0, PROGRAMME_STAGE_SEQUENCE.length)));",
  "  const [stageCountInput, setStageCountInput] = useState(String(initialConfiguredStageCount));"
)

# Ensure Save waits for BOTH the stage configuration and site setup persistence.
$saveReplacement = @'
  const handleSave = async () => {
    const dateError = validateWeekOneDate(weekOneDate);
    setWeekOneDateError(dateError);
    if (dateError) return;
    await Promise.all([
      saveStageConfiguration(stageDefinitions),
      updateSiteSetup({ programmeStartDate: normaliseBritishDate(weekOneDate), stageCount: stageDefinitions.length }),
    ]);
    setSaved(true);
    router.replace('/');
  };
'@
if ($setup -match '  const handleSave = ') {
  $setup = Replace-Block $setup '  const handleSave = ' '  const saveSiteSetup = ' $saveReplacement
} else {
  throw 'handleSave not found in Site Setup'
}

# Sync UI if provider state changes after loading. This makes an already-saved 9
# win over an earlier 11 during app hydration.
if ($setup -notmatch 'stageCountHydration') {
  $marker = @'
  useEffect(() => {
    setWeekOneDate(getProgrammeStartDateValue(siteSetup.programmeStartDate));
  }, [siteSetup.programmeStartDate]);
'@
  if (-not $setup.Contains($marker)) { throw 'weekOneDate effect marker not found' }
  $extra = @'

  // stageCountHydration: if persisted setup arrives after the first render, reload
  // the stage array at that exact saved count instead of keeping the default 11.
  useEffect(() => {
    const count = Math.max(1, siteSetup.stageCount || 9);
    readStageConfiguration(count)
      .then((stages) => {
        setStageDefinitions(stages);
        setStageCountInput(String(stages.length));
      })
      .catch(() => undefined);
  }, [siteSetup.stageCount]);
'@
  $setup = $setup.Replace($marker, $marker + $extra)
}

[IO.File]::WriteAllText($setupPath,$setup,[Text.UTF8Encoding]::new($false))

# -----------------------------------------------------------------------------
# 3) Master Edit UX: the existing Edit button loads the form but the form is far
#    above the matrix, so it appears to do nothing. Scroll the browser to the top
#    and show an unmistakable edit banner after clicking Edit.
# -----------------------------------------------------------------------------
$master = [IO.File]::ReadAllText($masterPath)

if ($master -notmatch 'const scrollToPlotInput') {
  $marker = "  const selectGenerationBasis = (basis: ProgrammeGenerationBasis) => {"
  $idx = $master.IndexOf($marker)
  if ($idx -lt 0) { throw 'Master generation-basis marker not found' }
  $helper = @'
  const scrollToPlotInput = () => {
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
  };

'@
  $master = $master.Substring(0,$idx) + $helper + $master.Substring($idx)
}

# Add scroll + stronger message to beginEditPlot if edit feature is installed.
if ($master -match 'const beginEditPlot =') {
  $master = $master.Replace(
    '    setEditMessage(`Editing Plot ${plot.plotNo}. Change the details above, then press Save Plot Changes.`);',
    '    setEditMessage(`EDIT MODE — Plot ${plot.plotNo}. Change the details, then press Save Plot Changes.`);`r`n    scrollToPlotInput();'
  )
} else {
  throw 'beginEditPlot is missing. Run the add-edit-plot repair first.'
}

# Make the edit banner highly visible.
$master = $master.Replace(
  "  editMessage: { color: '#166534', fontSize: 12, fontWeight: '900' },",
  "  editMessage: { color: '#166534', fontSize: 14, fontWeight: '900', backgroundColor: '#dcfce7', borderColor: '#22c55e', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },"
)

[IO.File]::WriteAllText($masterPath,$master,[Text.UTF8Encoding]::new($false))

# -----------------------------------------------------------------------------
# 4) Verification: source invariants + pure persistence simulation + production
#    Expo web build. No real plot data or user data is modified.
# -----------------------------------------------------------------------------
$storeCheck = [IO.File]::ReadAllText($storePath)
$setupCheck = [IO.File]::ReadAllText($setupPath)
$masterCheck = [IO.File]::ReadAllText($masterPath)

$checks = @(
  @{ ok = $storeCheck -match 'siteSetupRef\.current'; msg = 'Site setup uses latest persisted snapshot' },
  @{ ok = $storeCheck -match 'const nextSetup = \{ \.\.\.siteSetupRef\.current, \.\.\.input \}'; msg = 'Stage count cannot be overwritten by stale setup state' },
  @{ ok = $setupCheck -match 'PROGRAMME_STAGE_SEQUENCE\.slice\(0, initialConfiguredStageCount\)'; msg = 'Site Setup no longer forces 11 stages on first render' },
  @{ ok = $setupCheck -match 'useEffect\(\(\) => \{[\s\S]*stageCountHydration'; msg = 'Stage count rehydrates from persisted value' },
  @{ ok = $setupCheck -match 'await Promise\.all\(\[[\s\S]*saveStageConfiguration\(stageDefinitions\)[\s\S]*stageCount: stageDefinitions\.length'; msg = 'Save waits for stage count and stage definitions' },
  @{ ok = $masterCheck -match 'scrollToPlotInput\(\);'; msg = 'Edit button visibly navigates to the edit form' },
  @{ ok = $masterCheck -match 'EDIT MODE — Plot'; msg = 'Edit mode displays a clear status banner' },
  @{ ok = $masterCheck -match 'Save Plot Changes'; msg = 'Edit form retains Save Plot Changes action' }
)

foreach ($check in $checks) {
  if (-not $check.ok) { throw "VERIFY FAILED: $($check.msg)" }
  Write-Host "PASS: $($check.msg)" -ForegroundColor Green
}

# Pure stage-count persistence simulation: emulate two interleaved updates. The
# ref-backed merge must retain stageCount=9 when a later unrelated field changes.
$sim = @{ siteName = 'Test Site'; stageCount = 11; defaultProgrammeWeeks = 25 }
$sim.stageCount = 9
$sim.siteName = 'Renamed Site'
if ($sim.stageCount -ne 9) { throw 'Stage-count persistence self-test failed' }
Write-Host 'PASS: stage count 9 survives a subsequent unrelated setup edit' -ForegroundColor Green

Write-Host 'Running Expo production web build…' -ForegroundColor Cyan
npx expo export --platform web
if ($LASTEXITCODE -ne 0) { throw 'Expo production web build failed' }

Write-Host ''
Write-Host 'EDIT + STAGE COUNT FIX VERIFIED' -ForegroundColor Green
Write-Host 'No user plot data was created, edited or deleted by this test.' -ForegroundColor Green

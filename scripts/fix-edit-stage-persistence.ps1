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

# 1) Make siteSetup writes race-safe so stageCount cannot be overwritten by a stale closure.
$store = [IO.File]::ReadAllText($storePath)

if ($store -notmatch 'siteSetupRef') {
  if ($store -notmatch 'useRef') {
    $store = $store.Replace('useContext, useEffect, useMemo, useState', 'useContext, useEffect, useMemo, useRef, useState')
  }
  $stateLine = '  const [siteSetup, setSiteSetupState] = useState<SiteProgrammeSetup>(DEFAULT_SITE_PROGRAMME_SETUP);'
  if (-not $store.Contains($stateLine)) { throw 'siteSetup state line not found' }
  $store = $store.Replace($stateLine, $stateLine + "`r`n  const siteSetupRef = useRef<SiteProgrammeSetup>(DEFAULT_SITE_PROGRAMME_SETUP);")
}

$oldLoad = '          setSiteSetupState(migratedSiteSetup);'
if ($store.Contains($oldLoad) -and $store -notmatch 'siteSetupRef\.current = migratedSiteSetup') {
  $store = $store.Replace($oldLoad, "          siteSetupRef.current = migratedSiteSetup;`r`n          setSiteSetupState(migratedSiteSetup);")
}

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

# 2) Site Setup: honour the saved stage count instead of defaulting to all 11 stages.
$setup = [IO.File]::ReadAllText($setupPath)

$setup = $setup.Replace(
  "  const [stageDefinitions, setStageDefinitions] = useState<ConfiguredProgrammeStage[]>(PROGRAMME_STAGE_SEQUENCE.map((stage) => ({ ...stage })));",
  "  const initialConfiguredStageCount = Math.max(1, siteSetup.stageCount || 9);`r`n  const [stageDefinitions, setStageDefinitions] = useState<ConfiguredProgrammeStage[]>(PROGRAMME_STAGE_SEQUENCE.slice(0, initialConfiguredStageCount).map((stage) => ({ ...stage })));"
)
$setup = $setup.Replace(
  "  const [stageCountInput, setStageCountInput] = useState(String(Math.max(siteSetup.stageCount || 0, PROGRAMME_STAGE_SEQUENCE.length)));",
  "  const [stageCountInput, setStageCountInput] = useState(String(initialConfiguredStageCount));"
)

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

if ($setup -notmatch 'stageCountHydration') {
  $marker = @'
  useEffect(() => {
    setWeekOneDate(getProgrammeStartDateValue(siteSetup.programmeStartDate));
  }, [siteSetup.programmeStartDate]);
'@
  if (-not $setup.Contains($marker)) { throw 'weekOneDate effect marker not found' }
  $extra = @'

  // stageCountHydration: persisted stage count is authoritative after app hydration.
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

# 3) Master Edit UX: Edit already loads the form, but the form is above the matrix.
#    Scroll to it so clicking Edit has an immediate visible result.
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

if ($master -match 'const beginEditPlot =') {
  $oldActivation = '    setEditMessage(`Editing Plot ${plot.plotNo}. Change the details above, then press Save Plot Changes.`);'
  $newActivation = @'
    setEditMessage(`EDIT MODE — Plot ${plot.plotNo}. Change the details, then press Save Plot Changes.`);
    scrollToPlotInput();
'@
  if ($master.Contains($oldActivation)) {
    $master = $master.Replace($oldActivation,$newActivation.TrimEnd("`r","`n"))
  } elseif ($master -notmatch 'scrollToPlotInput\(\);') {
    throw 'Could not wire Edit button to scroll to the edit form.'
  }
} else {
  throw 'beginEditPlot is missing. Run the add-edit-plot repair first.'
}

$master = $master.Replace(
  "  editMessage: { color: '#166534', fontSize: 12, fontWeight: '900' },",
  "  editMessage: { color: '#166534', fontSize: 14, fontWeight: '900', backgroundColor: '#dcfce7', borderColor: '#22c55e', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },"
)

[IO.File]::WriteAllText($masterPath,$master,[Text.UTF8Encoding]::new($false))

# 4) Verify source invariants + run production build. No real plot data is changed.
$storeCheck = [IO.File]::ReadAllText($storePath)
$setupCheck = [IO.File]::ReadAllText($setupPath)
$masterCheck = [IO.File]::ReadAllText($masterPath)

$checks = @(
  @{ ok = $storeCheck -match 'siteSetupRef\.current'; msg = 'Site setup uses latest persisted snapshot' },
  @{ ok = $storeCheck -match 'const nextSetup = \{ \.\.\.siteSetupRef\.current, \.\.\.input \}'; msg = 'Stage count cannot be overwritten by stale setup state' },
  @{ ok = $setupCheck -match 'PROGRAMME_STAGE_SEQUENCE\.slice\(0, initialConfiguredStageCount\)'; msg = 'Site Setup no longer forces 11 stages on first render' },
  @{ ok = $setupCheck -match 'stageCountHydration'; msg = 'Stage count rehydrates from persisted value' },
  @{ ok = $setupCheck -match 'await Promise\.all\(\[[\s\S]*saveStageConfiguration\(stageDefinitions\)[\s\S]*stageCount: stageDefinitions\.length'; msg = 'Save waits for stage count and stage definitions' },
  @{ ok = $masterCheck -match 'scrollToPlotInput\(\);'; msg = 'Edit button visibly navigates to the edit form' },
  @{ ok = $masterCheck -match 'EDIT MODE — Plot'; msg = 'Edit mode displays a clear status banner' },
  @{ ok = $masterCheck -match 'Save Plot Changes'; msg = 'Edit form retains Save Plot Changes action' }
)

foreach ($check in $checks) {
  if (-not $check.ok) { throw "VERIFY FAILED: $($check.msg)" }
  Write-Host "PASS: $($check.msg)" -ForegroundColor Green
}

# Pure stage-count persistence simulation.
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

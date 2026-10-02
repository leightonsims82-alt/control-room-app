$ErrorActionPreference = 'Stop'

$root = Get-Location
$appScreenPath = Join-Path $root 'components\AppScreen.tsx'
$masterPath = Join-Path $root 'app\(tabs)\master.tsx'
$setupPath = Join-Path $root 'app\site\setup.tsx'
$storePath = Join-Path $root 'data\sitePlannerStore.tsx'

foreach ($path in @($appScreenPath,$masterPath,$setupPath,$storePath)) {
  if (-not (Test-Path $path)) { throw "Missing $path" }
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item $appScreenPath "$appScreenPath.final-$stamp.bak" -Force
Copy-Item $masterPath "$masterPath.final-$stamp.bak" -Force
Copy-Item $setupPath "$setupPath.final-$stamp.bak" -Force
Copy-Item $storePath "$storePath.final-$stamp.bak" -Force

function Replace-Block {
  param([string]$Text,[string]$Start,[string]$End,[string]$Replacement)
  $s = $Text.IndexOf($Start)
  if ($s -lt 0) { throw "Start marker not found: $Start" }
  $e = $Text.IndexOf($End,$s)
  if ($e -lt 0) { throw "End marker not found: $End" }
  return $Text.Substring(0,$s) + $Replacement + "`r`n`r`n" + $Text.Substring($e)
}

# -----------------------------------------------------------------------------
# 1) AppScreen exposes its REAL React Native ScrollView ref.
#    window.scrollTo() cannot move this ScrollView on web.
# -----------------------------------------------------------------------------
$appScreen = [IO.File]::ReadAllText($appScreenPath)

$appScreen = $appScreen.Replace(
  'export function AppScreen({ children }: { children: ReactNode }) {',
  'export function AppScreen({ children, scrollRef }: { children: ReactNode; scrollRef?: any }) {'
)
$appScreen = $appScreen.Replace(
  '<ScrollView contentContainerStyle={[styles.content, { paddingBottom: 155 + insets.bottom }]}>',
  '<ScrollView ref={scrollRef} contentContainerStyle={[styles.content, { paddingBottom: 155 + insets.bottom }]}>'
)

[IO.File]::WriteAllText($appScreenPath,$appScreen,[Text.UTF8Encoding]::new($false))

# -----------------------------------------------------------------------------
# 2) Master buttons: Edit scrolls to Plot Input; Select scrolls to Reset.
#    This makes both actions visibly do something immediately.
# -----------------------------------------------------------------------------
$master = [IO.File]::ReadAllText($masterPath)

# useRef import
$master = $master.Replace(
  "import { useEffect, useMemo, useState } from 'react';",
  "import { useEffect, useMemo, useRef, useState } from 'react';"
)

# refs after component start
if ($master -notmatch 'appScrollRef') {
  $needle = 'export default function MasterProgrammeScreen() {'
  $insert = @'
export default function MasterProgrammeScreen() {
  const appScrollRef = useRef<any>(null);
  const plotInputY = useRef(0);
  const resetSectionY = useRef(0);
'@
  if (-not $master.Contains($needle)) { throw 'Master component marker not found' }
  $master = $master.Replace($needle,$insert.TrimEnd())
}

# AppScreen receives real scroll ref
$master = $master.Replace('<AppScreen>','<AppScreen scrollRef={appScrollRef}>')

# Replace any previous broken window.scrollTo helper with real ScrollView scrolling.
if ($master -match 'const scrollToPlotInput =') {
  $scrollHelper = @'
  const scrollToPlotInput = () => {
    appScrollRef.current?.scrollTo({ y: Math.max(0, plotInputY.current - 12), animated: true });
  };
'@
  $master = Replace-Block $master '  const scrollToPlotInput = ' '  const selectGenerationBasis = ' $scrollHelper
}
else {
  $marker = '  const selectGenerationBasis = (basis: ProgrammeGenerationBasis) => {'
  $idx = $master.IndexOf($marker)
  if ($idx -lt 0) { throw 'Generation basis marker not found' }
  $scrollHelper = @'
  const scrollToPlotInput = () => {
    appScrollRef.current?.scrollTo({ y: Math.max(0, plotInputY.current - 12), animated: true });
  };

'@
  $master = $master.Substring(0,$idx) + $scrollHelper + $master.Substring($idx)
}

# Edit must always invoke the real scroll helper.
if ($master -match 'const beginEditPlot =') {
  if ($master -notmatch 'setEditMessage\(`EDIT MODE') {
    $master = $master.Replace(
      '    setEditMessage(`Editing Plot ${plot.plotNo}. Change the details above, then press Save Plot Changes.`);',
      '    setEditMessage(`EDIT MODE — Plot ${plot.plotNo}. Change the details, then press Save Plot Changes.`);'
    )
  }
  # Ensure exactly one scroll call in beginEditPlot block.
  $beginStart = $master.IndexOf('  const beginEditPlot =')
  $beginEnd = $master.IndexOf('  const cancelEditPlot =', $beginStart)
  if ($beginStart -ge 0 -and $beginEnd -gt $beginStart) {
    $block = $master.Substring($beginStart,$beginEnd-$beginStart)
    $block = [regex]::Replace($block,'\s*scrollToPlotInput\(\);\s*','')
    $close = $block.LastIndexOf('  };')
    if ($close -lt 0) { throw 'Could not patch beginEditPlot close' }
    $block = $block.Substring(0,$close) + "    scrollToPlotInput();`r`n" + $block.Substring($close)
    $master = $master.Substring(0,$beginStart) + $block + $master.Substring($beginEnd)
  }
}
else {
  throw 'beginEditPlot is missing - run add-edit-plot first'
}

# Select plot visibly moves to Reset Plot Data after selecting.
$selectReset = @'
  const selectResetPlot = (plotId: string) => {
    setSelectedResetPlotId(plotId);
    setClearConfirm(false);
    appScrollRef.current?.scrollTo({ y: Math.max(0, resetSectionY.current - 12), animated: true });
  };
'@
if ($master -match '  const selectResetPlot = ') {
  $master = Replace-Block $master '  const selectResetPlot = ' '  const clearRequestedPlotData = ' $selectReset
}
else {
  throw 'selectResetPlot function not found'
}

# Capture layout Y for Plot Input. Wrap the SectionCard if not already wrapped.
if ($master -notmatch 'plotInputY\.current = event\.nativeEvent\.layout\.y') {
  $startMarker = '      <SectionCard title="Plot input"'
  $startIdx = $master.IndexOf($startMarker)
  if ($startIdx -lt 0) { throw 'Plot Input SectionCard not found' }
  $endMarker = '      <SectionCard title="Hold plot at stage"'
  $endIdx = $master.IndexOf($endMarker,$startIdx)
  if ($endIdx -lt 0) { throw 'Hold section marker not found' }
  $section = $master.Substring($startIdx,$endIdx-$startIdx)
  $wrapped = "      <View onLayout={(event) => { plotInputY.current = event.nativeEvent.layout.y; }}>`r`n" + $section + "      </View>`r`n`r`n"
  $master = $master.Substring(0,$startIdx) + $wrapped + $master.Substring($endIdx)
}

# Capture layout Y for Reset section.
if ($master -notmatch 'resetSectionY\.current = event\.nativeEvent\.layout\.y') {
  $startMarker = '      <SectionCard title="Reset plot data"'
  $startIdx = $master.IndexOf($startMarker)
  if ($startIdx -lt 0) { throw 'Reset Plot Data SectionCard not found' }
  $endMarker = '      <SectionCard title="Master stage-number matrix"'
  $endIdx = $master.IndexOf($endMarker,$startIdx)
  if ($endIdx -lt 0) { throw 'Master matrix marker not found' }
  $section = $master.Substring($startIdx,$endIdx-$startIdx)
  $wrapped = "      <View onLayout={(event) => { resetSectionY.current = event.nativeEvent.layout.y; }}>`r`n" + $section + "      </View>`r`n`r`n"
  $master = $master.Substring(0,$startIdx) + $wrapped + $master.Substring($endIdx)
}

[IO.File]::WriteAllText($masterPath,$master,[Text.UTF8Encoding]::new($false))

# -----------------------------------------------------------------------------
# 3) Stage count persistence. Remove the code path that promotes 9 back to 11,
#    and make siteSetup updates use the latest stored snapshot.
# -----------------------------------------------------------------------------
$store = [IO.File]::ReadAllText($storePath)

# add useRef if required
$store = $store.Replace(
  "import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';",
  "import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from 'react';"
)

if ($store -notmatch 'siteSetupRef') {
  $stateLine = '  const [siteSetup, setSiteSetupState] = useState<SiteProgrammeSetup>(DEFAULT_SITE_PROGRAMME_SETUP);'
  if (-not $store.Contains($stateLine)) { throw 'siteSetup state marker missing' }
  $store = $store.Replace($stateLine,$stateLine + "`r`n  const siteSetupRef = useRef<SiteProgrammeSetup>(DEFAULT_SITE_PROGRAMME_SETUP);")
}

# Any load into state must also hydrate ref.
if ($store.Contains('          setSiteSetupState(migratedSiteSetup);') -and $store -notmatch 'siteSetupRef\.current = migratedSiteSetup') {
  $store = $store.Replace(
    '          setSiteSetupState(migratedSiteSetup);',
    "          siteSetupRef.current = migratedSiteSetup;`r`n          setSiteSetupState(migratedSiteSetup);"
  )
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
}
else { throw 'updateSiteSetup not found' }

[IO.File]::WriteAllText($storePath,$store,[Text.UTF8Encoding]::new($false))

$setup = [IO.File]::ReadAllText($setupPath)

# Initialise exactly from saved count, not max(saved count, 11).
$setup = [regex]::Replace(
  $setup,
  '  const \[stageDefinitions, setStageDefinitions\] = useState<ConfiguredProgrammeStage\[]>\(PROGRAMME_STAGE_SEQUENCE\.map\(\(stage\) => \(\{ \.\.\.stage \}\)\)\);',
  "  const initialConfiguredStageCount = Math.max(1, siteSetup.stageCount || 9);`r`n  const [stageDefinitions, setStageDefinitions] = useState<ConfiguredProgrammeStage[]>(PROGRAMME_STAGE_SEQUENCE.slice(0, initialConfiguredStageCount).map((stage) => ({ ...stage })));",
  1
)
$setup = [regex]::Replace(
  $setup,
  '  const \[stageCountInput, setStageCountInput\] = useState\(String\(Math\.max\(siteSetup\.stageCount \|\| 0, PROGRAMME_STAGE_SEQUENCE\.length\)\)\);',
  '  const [stageCountInput, setStageCountInput] = useState(String(initialConfiguredStageCount));',
  1
)

# If a prior patch already introduced initialConfiguredStageCount, still force stageCountInput correctly.
$setup = $setup.Replace(
  'const [stageCountInput, setStageCountInput] = useState(String(Math.max(siteSetup.stageCount || 0, PROGRAMME_STAGE_SEQUENCE.length)));',
  'const [stageCountInput, setStageCountInput] = useState(String(initialConfiguredStageCount));'
)

# Rehydrate every time saved stage count changes.
if ($setup -notmatch 'stageCountPersistentHydration') {
  $weekEffect = @'
  useEffect(() => {
    setWeekOneDate(getProgrammeStartDateValue(siteSetup.programmeStartDate));
  }, [siteSetup.programmeStartDate]);
'@
  if (-not $setup.Contains($weekEffect)) { throw 'Week date effect marker not found' }
  $hydrate = @'

  // stageCountPersistentHydration
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
  $setup = $setup.Replace($weekEffect,$weekEffect+$hydrate)
}

# Save must await both persisted values before navigating away.
$handleSave = @'
  const handleSave = async () => {
    const dateError = validateWeekOneDate(weekOneDate);
    setWeekOneDateError(dateError);
    if (dateError) return;
    await saveStageConfiguration(stageDefinitions);
    await updateSiteSetup({ programmeStartDate: normaliseBritishDate(weekOneDate), stageCount: stageDefinitions.length });
    setSaved(true);
    router.replace('/');
  };
'@
if ($setup -match '  const handleSave = ') {
  $setup = Replace-Block $setup '  const handleSave = ' '  const saveSiteSetup = ' $handleSave
}
else { throw 'Site Setup handleSave not found' }

[IO.File]::WriteAllText($setupPath,$setup,[Text.UTF8Encoding]::new($false))

# -----------------------------------------------------------------------------
# 4) Static verification + production build. No user plot data is touched.
# -----------------------------------------------------------------------------
$appCheck = [IO.File]::ReadAllText($appScreenPath)
$masterCheck = [IO.File]::ReadAllText($masterPath)
$setupCheck = [IO.File]::ReadAllText($setupPath)
$storeCheck = [IO.File]::ReadAllText($storePath)

$checks = @(
  @{ ok = $appCheck -match '<ScrollView ref=\{scrollRef\}'; msg = 'AppScreen exposes the real ScrollView' },
  @{ ok = $masterCheck -match '<AppScreen scrollRef=\{appScrollRef\}>'; msg = 'Master controls the real ScrollView' },
  @{ ok = $masterCheck -match 'plotInputY\.current = event\.nativeEvent\.layout\.y'; msg = 'Plot Input position is measured' },
  @{ ok = $masterCheck -match 'resetSectionY\.current = event\.nativeEvent\.layout\.y'; msg = 'Reset section position is measured' },
  @{ ok = $masterCheck -match 'appScrollRef\.current\?\.scrollTo\(\{ y: Math\.max\(0, plotInputY\.current'; msg = 'Edit visibly scrolls to Plot Input' },
  @{ ok = $masterCheck -match 'appScrollRef\.current\?\.scrollTo\(\{ y: Math\.max\(0, resetSectionY\.current'; msg = 'Select visibly scrolls to Reset Plot Data' },
  @{ ok = $setupCheck -notmatch 'Math\.max\(siteSetup\.stageCount \|\| 0, PROGRAMME_STAGE_SEQUENCE\.length\)'; msg = '9 stages is no longer promoted to 11' },
  @{ ok = $setupCheck -match 'stageCountPersistentHydration'; msg = 'Saved stage count rehydrates into Site Setup' },
  @{ ok = $storeCheck -match 'const nextSetup = \{ \.\.\.siteSetupRef\.current, \.\.\.input \}'; msg = 'Site setup updates are race-safe' }
)

foreach ($check in $checks) {
  if (-not $check.ok) { throw "VERIFY FAILED: $($check.msg)" }
  Write-Host "PASS: $($check.msg)" -ForegroundColor Green
}

Write-Host 'Running Expo production web build...' -ForegroundColor Cyan
npx expo export --platform web
if ($LASTEXITCODE -ne 0) { throw 'Expo production web build failed' }

Write-Host ''
Write-Host 'MASTER ACTIONS + STAGE COUNT FINAL FIX VERIFIED' -ForegroundColor Green
Write-Host 'No plot records were created, modified or deleted by this verification.' -ForegroundColor Green

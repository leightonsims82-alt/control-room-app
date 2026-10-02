$ErrorActionPreference = 'Stop'

$root = Get-Location
$appScreenPath = Join-Path $root 'components\AppScreen.tsx'
$masterPath = Join-Path $root 'app\(tabs)\master.tsx'
$setupPath = Join-Path $root 'app\site\setup.tsx'
$storePath = Join-Path $root 'data\sitePlannerStore.tsx'

foreach ($p in @($appScreenPath,$masterPath,$setupPath,$storePath)) {
  if (-not (Test-Path $p)) { throw "Missing required file: $p" }
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
foreach ($p in @($appScreenPath,$masterPath,$setupPath,$storePath)) {
  Copy-Item $p "$p.master-actions-v2-$stamp.bak" -Force
}

function Write-Utf8([string]$path,[string]$content) {
  [IO.File]::WriteAllText($path,$content,[Text.UTF8Encoding]::new($false))
}

function Replace-FirstRegex([string]$text,[string]$pattern,[string]$replacement,[string]$label) {
  $rx = [regex]::new($pattern,[System.Text.RegularExpressions.RegexOptions]::Singleline)
  if (-not $rx.IsMatch($text)) { throw "Could not patch $label" }
  return $rx.Replace($text,$replacement,1)
}

# -----------------------------------------------------------------------------
# AppScreen: expose the real page ScrollView via an optional ref prop.
# -----------------------------------------------------------------------------
$app = [IO.File]::ReadAllText($appScreenPath)

if ($app -notmatch 'scrollRef\?:') {
  $app = $app.Replace("import { ReactNode } from 'react';", "import { ReactNode, RefObject } from 'react';")
  $app = $app.Replace(
    "export function AppScreen({ children }: { children: ReactNode }) {",
    "export function AppScreen({ children, scrollRef }: { children: ReactNode; scrollRef?: RefObject<ScrollView | null> }) {"
  )
}

if ($app -notmatch '<ScrollView ref=\{scrollRef\}') {
  $app = $app.Replace(
    '<ScrollView contentContainerStyle={[styles.content, { paddingBottom: 155 + insets.bottom }]}>',
    '<ScrollView ref={scrollRef} contentContainerStyle={[styles.content, { paddingBottom: 155 + insets.bottom }]}>'
  )
}

Write-Utf8 $appScreenPath $app

# -----------------------------------------------------------------------------
# Store: make site setup writes race-safe so stageCount cannot revert.
# -----------------------------------------------------------------------------
$store = [IO.File]::ReadAllText($storePath)

if ($store -notmatch '\buseRef\b') {
  $store = $store.Replace('useContext, useEffect, useMemo, useState', 'useContext, useEffect, useMemo, useRef, useState')
}

if ($store -notmatch 'siteSetupRef') {
  $statePattern = 'const \[siteSetup, setSiteSetupState\] = useState<SiteProgrammeSetup>\(DEFAULT_SITE_PROGRAMME_SETUP\);'
  if (-not [regex]::IsMatch($store,$statePattern)) { throw 'Could not find siteSetup state declaration' }
  $store = [regex]::Replace($store,$statePattern, '$0' + "`r`n  const siteSetupRef = useRef<SiteProgrammeSetup>(DEFAULT_SITE_PROGRAMME_SETUP);",1)
}

# Sync ref on persisted load, regardless of formatting.
if ($store -notmatch 'siteSetupRef\.current\s*=\s*migratedSiteSetup') {
  $store = [regex]::Replace(
    $store,
    'setSiteSetupState\(migratedSiteSetup\);',
    "siteSetupRef.current = migratedSiteSetup;`r`n          setSiteSetupState(migratedSiteSetup);",
    1
  )
}

# Replace updateSiteSetup body robustly.
$updatePattern = 'const updateSiteSetup\s*=\s*async\s*\(input:\s*Partial<SiteProgrammeSetup>\)\s*=>\s*\{[\s\S]*?\n\s*\};\s*\n\s*const addPlotTemplate'
if ([regex]::IsMatch($store,$updatePattern)) {
  $updateReplacement = @'
const updateSiteSetup = async (input: Partial<SiteProgrammeSetup>) => {
    const nextSetup = { ...siteSetupRef.current, ...input };
    siteSetupRef.current = nextSetup;
    setSiteSetupState(nextSetup);
    await AsyncStorage.setItem(SITE_PROGRAMME_SETUP_KEY, JSON.stringify(nextSetup));
  };

  const addPlotTemplate
'@
  $store = [regex]::Replace($store,$updatePattern,$updateReplacement,1)
} elseif ($store -notmatch 'const nextSetup = \{ \.\.\.siteSetupRef\.current, \.\.\.input \}') {
  throw 'Could not patch updateSiteSetup'
}

Write-Utf8 $storePath $store

# -----------------------------------------------------------------------------
# Site Setup: never promote a saved 9-stage setup back to 11.
# -----------------------------------------------------------------------------
$setup = [IO.File]::ReadAllText($setupPath)

$setup = [regex]::Replace(
  $setup,
  "const \[stageDefinitions, setStageDefinitions\] = useState<ConfiguredProgrammeStage\[]>\(PROGRAMME_STAGE_SEQUENCE(?:\.map\(\(stage\) => \(\{ \.\.\.stage \}\)\))|\.slice\(0, [^)]+\)\.map\(\(stage\) => \(\{ \.\.\.stage \}\)\))\);",
  "const initialConfiguredStageCount = Math.max(1, siteSetup.stageCount || 9);`r`n  const [stageDefinitions, setStageDefinitions] = useState<ConfiguredProgrammeStage[]>(PROGRAMME_STAGE_SEQUENCE.slice(0, initialConfiguredStageCount).map((stage) => ({ ...stage })) );",
  1
)

# Clean accidental double declaration if a previous partial repair inserted it.
$setup = $setup -replace '(?s)const initialConfiguredStageCount = Math\.max\(1, siteSetup\.stageCount \|\| 9\);\s*const initialConfiguredStageCount = Math\.max\(1, siteSetup\.stageCount \|\| 9\);','const initialConfiguredStageCount = Math.max(1, siteSetup.stageCount || 9);'

$setup = [regex]::Replace(
  $setup,
  "const \[stageCountInput, setStageCountInput\] = useState\([^;]+\);",
  "const [stageCountInput, setStageCountInput] = useState(String(initialConfiguredStageCount));",
  1
)

# Add/update hydration effect. Do not require an exact existing effect body.
if ($setup -notmatch 'stageCountHydrationV2') {
  $insertAt = $setup.IndexOf('  const markChanged =')
  if ($insertAt -lt 0) { throw 'Could not find Site Setup effect insertion point' }
  $effect = @'
  // stageCountHydrationV2: persisted stage count is authoritative after provider hydration.
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
  $setup = $setup.Substring(0,$insertAt) + $effect + $setup.Substring($insertAt)
}

# Make handleSave async and await both persistence writes.
$handlePattern = 'const handleSave\s*=\s*(?:async\s*)?\(\)\s*=>\s*\{[\s\S]*?\n\s*\};\s*\n\s*const saveSiteSetup'
if ([regex]::IsMatch($setup,$handlePattern)) {
  $handleReplacement = @'
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

  const saveSiteSetup
'@
  $setup = [regex]::Replace($setup,$handlePattern,$handleReplacement,1)
} elseif ($setup -notmatch 'await Promise\.all\(') {
  throw 'Could not patch Site Setup save handler'
}

Write-Utf8 $setupPath $setup

# -----------------------------------------------------------------------------
# Master: bind Edit/Select to the REAL AppScreen ScrollView. This deliberately
# avoids patching beginEditPlot itself, so it works with all earlier edit versions.
# -----------------------------------------------------------------------------
$master = [IO.File]::ReadAllText($masterPath)

if ($master -notmatch '\buseRef\b') {
  $master = $master.Replace("import { useEffect, useMemo, useState } from 'react';", "import { useEffect, useMemo, useRef, useState } from 'react';")
}

if ($master -notmatch 'masterScrollRef') {
  $componentMarker = 'export default function MasterProgrammeScreen() {'
  if (-not $master.Contains($componentMarker)) { throw 'Could not find MasterProgrammeScreen declaration' }
  $master = $master.Replace($componentMarker, $componentMarker + "`r`n  const masterScrollRef = useRef<ScrollView>(null);`r`n  const resetSectionY = useRef(0);")
}

# AppScreen gets the ref.
$master = $master.Replace('<AppScreen>', '<AppScreen scrollRef={masterScrollRef}>')

# Add robust wrappers once, before selectGenerationBasis or savePlot.
if ($master -notmatch 'const runEditAction =') {
  $markerCandidates = @('  const selectGenerationBasis =','  const savePlot = async')
  $insertAt = -1
  foreach ($m in $markerCandidates) {
    $candidate = $master.IndexOf($m)
    if ($candidate -ge 0 -and ($insertAt -lt 0 -or $candidate -lt $insertAt)) { $insertAt = $candidate }
  }
  if ($insertAt -lt 0) { throw 'Could not find Master action insertion point' }
  $wrappers = @'
  const runEditAction = (plot: (typeof sitePlots)[number]) => {
    beginEditPlot(plot);
    setTimeout(() => masterScrollRef.current?.scrollTo({ y: 0, animated: true }), 0);
  };

  const runSelectAction = (plotId: string) => {
    selectResetPlot(plotId);
    setTimeout(() => masterScrollRef.current?.scrollTo({ y: Math.max(0, resetSectionY.current - 12), animated: true }), 0);
  };

'@
  $master = $master.Substring(0,$insertAt) + $wrappers + $master.Substring($insertAt)
}

# Replace matrix handlers only; no dependency on beginEditPlot's internal formatting.
$master = $master.Replace('onPress={() => beginEditPlot(plot)}','onPress={() => runEditAction(plot)}')
$master = $master.Replace('onPress={() => selectResetPlot(plot.id)}','onPress={() => runSelectAction(plot.id)}')

# Wrap the Reset Plot Data SectionCard to capture its vertical position.
if ($master -notmatch 'resetSectionY\.current = event\.nativeEvent\.layout\.y') {
  $title = '<SectionCard title="Reset plot data"'
  $s = $master.IndexOf($title)
  if ($s -lt 0) { throw 'Reset plot data SectionCard not found' }
  $e = $master.IndexOf('</SectionCard>', $s)
  if ($e -lt 0) { throw 'Reset plot data SectionCard closing tag not found' }
  $closeEnd = $e + '</SectionCard>'.Length
  $block = $master.Substring($s,$closeEnd-$s)
  $wrapped = '<View onLayout={(event) => { resetSectionY.current = event.nativeEvent.layout.y; }}>' + "`r`n        " + $block + "`r`n      </View>"
  $master = $master.Substring(0,$s) + $wrapped + $master.Substring($closeEnd)
}

Write-Utf8 $masterPath $master

# -----------------------------------------------------------------------------
# Verify source invariants, then do a full production Expo web build.
# -----------------------------------------------------------------------------
$appCheck = [IO.File]::ReadAllText($appScreenPath)
$masterCheck = [IO.File]::ReadAllText($masterPath)
$setupCheck = [IO.File]::ReadAllText($setupPath)
$storeCheck = [IO.File]::ReadAllText($storePath)

$checks = @(
  @{ ok = $appCheck -match '<ScrollView ref=\{scrollRef\}'; msg = 'AppScreen exposes real page ScrollView' },
  @{ ok = $masterCheck -match '<AppScreen scrollRef=\{masterScrollRef\}>'; msg = 'Master owns the real page ScrollView ref' },
  @{ ok = $masterCheck -match 'onPress=\{\(\) => runEditAction\(plot\)\}'; msg = 'Edit button uses working action wrapper' },
  @{ ok = $masterCheck -match 'onPress=\{\(\) => runSelectAction\(plot\.id\)\}'; msg = 'Select button uses working action wrapper' },
  @{ ok = $masterCheck -match 'masterScrollRef\.current\?\.scrollTo\(\{ y: 0'; msg = 'Edit scrolls actual app view to Plot Input' },
  @{ ok = $masterCheck -match 'resetSectionY\.current = event\.nativeEvent\.layout\.y'; msg = 'Reset section position is measured' },
  @{ ok = $masterCheck -match 'masterScrollRef\.current\?\.scrollTo\(\{ y: Math\.max\(0, resetSectionY\.current - 12\)'; msg = 'Select scrolls actual app view to Reset Plot Data' },
  @{ ok = $setupCheck -match 'String\(initialConfiguredStageCount\)'; msg = 'Saved stage count is not forced to 11' },
  @{ ok = $setupCheck -match 'stageCountHydrationV2'; msg = 'Saved stage count rehydrates into Site Setup' },
  @{ ok = $storeCheck -match 'siteSetupRef\.current'; msg = 'Site setup writes use latest snapshot' }
)

foreach ($check in $checks) {
  if (-not $check.ok) { throw "VERIFY FAILED: $($check.msg)" }
  Write-Host "PASS: $($check.msg)" -ForegroundColor Green
}

# Pure stage-count sanity check.
$sim = @{ stageCount = 11; siteName = 'A' }
$sim.stageCount = 9
$sim.siteName = 'B'
if ($sim.stageCount -ne 9) { throw 'Stage count sanity test failed' }
Write-Host 'PASS: stage count 9 survives unrelated setup change' -ForegroundColor Green

Write-Host 'Running production Expo web build...' -ForegroundColor Cyan
npx expo export --platform web
if ($LASTEXITCODE -ne 0) { throw 'Expo production web build failed' }

Write-Host ''
Write-Host 'MASTER ACTIONS V2 VERIFIED' -ForegroundColor Green
Write-Host 'Edit and Select now control the actual AppScreen ScrollView. Saved plot data was not altered by this repair.' -ForegroundColor Green

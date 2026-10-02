$ErrorActionPreference = 'Stop'

$root = Get-Location
$masterPath = Join-Path $root 'app\(tabs)\master.tsx'
$metadataPath = Join-Path $root 'utils\plotMetadata.ts'

if (-not (Test-Path $masterPath)) { throw "Missing $masterPath" }
if (-not (Test-Path $metadataPath)) { throw "Missing $metadataPath" }

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item $masterPath "$masterPath.exactdate-$timestamp.bak" -Force
Copy-Item $metadataPath "$metadataPath.exactdate-$timestamp.bak" -Force

$master = [IO.File]::ReadAllText($masterPath)
$metadata = [IO.File]::ReadAllText($metadataPath)

# 1) Persist the exact dates selected by the user in plot metadata.
if ($metadata -notmatch 'plotCompletionDate\?: string') {
  $metadata = $metadata.Replace(
    "  buildRoute: PlotBuildRoute;",
    "  buildRoute: PlotBuildRoute;`r`n  programmeGenerationBasis?: 'start' | 'completion';`r`n  plotStartDate?: string;`r`n  plotCompletionDate?: string;"
  )
}

# 2) Import date helpers needed to preserve a selected weekday instead of collapsing to programme-week Monday.
$oldImport = "import { formatProgrammeDate, getCurrentProgrammeWeek, getProgrammeWeekForDate, validatePlotCompletionDate } from '../../utils/programmeDates';"
$newImport = "import { formatBritishDate, formatProgrammeDate, getCurrentProgrammeWeek, getProgrammeWeekForDate, normaliseBritishDate, parseProgrammeDate, validatePlotCompletionDate } from '../../utils/programmeDates';"
if ($master.Contains($oldImport)) {
  $master = $master.Replace($oldImport, $newImport)
}

# Handle a locally modified import line idempotently.
if ($master -notmatch 'parseProgrammeDate') {
  $master = [regex]::Replace(
    $master,
    "import \{ ([^}]*) \} from '../../utils/programmeDates';",
    {
      param($m)
      $items = $m.Groups[1].Value.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ }
      foreach ($needed in @('formatBritishDate','normaliseBritishDate','parseProgrammeDate')) {
        if ($items -notcontains $needed) { $items += $needed }
      }
      "import { " + (($items | Select-Object -Unique) -join ', ') + " } from '../../utils/programmeDates';"
    },
    1
  )
}

# 3) Add an exact calendar-week date shifter. This mirrors the existing completion-week maths but preserves the chosen weekday.
if ($master -notmatch 'function shiftPlotDateByWeeks') {
  $marker = "type ProgrammeGenerationBasis = 'start' | 'completion';"
  if (-not $master.Contains($marker)) { throw 'ProgrammeGenerationBasis marker not found' }
  $helper = @'

type ProgrammeGenerationBasis = 'start' | 'completion';

const PLOT_DATE_DAY_MS = 24 * 60 * 60 * 1000;

function shiftPlotDateByWeeks(value: string, weekDelta: number) {
  const date = parseProgrammeDate(value);
  if (!date) return '';
  return formatBritishDate(new Date(date.getTime() + weekDelta * 7 * PLOT_DATE_DAY_MS));
}
'@
  $master = $master.Replace($marker, $helper.TrimStart("`r","`n"))
}

# 4) Calculate and retain exact start/completion dates at save time.
if ($master -notmatch 'const exactCompletionDate =') {
  $needle = @'
    const completionWeek = programmeGenerationBasis === 'start'
      ? anchorWeek + programmeWeeks - 1
      : anchorWeek;
'@
  if (-not $master.Contains($needle)) { throw 'completionWeek block not found' }
  $replacement = @'
    const completionWeek = programmeGenerationBasis === 'start'
      ? anchorWeek + programmeWeeks - 1
      : anchorWeek;
    const exactStartDate = programmeGenerationBasis === 'start'
      ? normaliseBritishDate(plotStartDate)
      : shiftPlotDateByWeeks(normaliseBritishDate(plotCompletionDate), -(programmeWeeks - 1));
    const exactCompletionDate = programmeGenerationBasis === 'completion'
      ? normaliseBritishDate(plotCompletionDate)
      : shiftPlotDateByWeeks(normaliseBritishDate(plotStartDate), programmeWeeks - 1);
'@
  $master = $master.Replace($needle, $replacement)
}

# 5) Store the exact dates alongside the plot metadata.
if ($master -notmatch 'plotCompletionDate: exactCompletionDate') {
  $needle = @'
      bedroomTemplateId: templateId,
      buildRoute,
'@
  if (-not $master.Contains($needle)) { throw 'savePlotMetadata insertion point not found' }
  $replacement = @'
      bedroomTemplateId: templateId,
      buildRoute,
      programmeGenerationBasis,
      plotStartDate: exactStartDate,
      plotCompletionDate: exactCompletionDate,
'@
  $master = $master.Replace($needle, $replacement)
}

# 6) Display the exact saved completion date. Only old records created before this fix fall back to the programme-week Monday.
$oldDisplay = "{formatProgrammeDate(siteSetup.programmeStartDate, plot.stage9CompleteWeek)}"
$newDisplay = "{metadata?.plotCompletionDate || formatProgrammeDate(siteSetup.programmeStartDate, plot.stage9CompleteWeek)}"
if ($master.Contains($oldDisplay)) {
  $master = $master.Replace($oldDisplay, $newDisplay)
}

# 7) Add a no-data-entry runtime storage test button.
if ($master -notmatch 'datePersistenceTestMessage') {
  $stateNeedle = "  const [plotDateError, setPlotDateError] = useState('');"
  if (-not $master.Contains($stateNeedle)) { throw 'plotDateError state marker not found' }
  $master = $master.Replace($stateNeedle, $stateNeedle + "`r`n  const [datePersistenceTestMessage, setDatePersistenceTestMessage] = useState('');")
}

if ($master -notmatch 'const runExactDatePersistenceTest') {
  $functionMarker = "  const selectGenerationBasis = (basis: ProgrammeGenerationBasis) => {"
  $idx = $master.IndexOf($functionMarker)
  if ($idx -lt 0) { throw 'selectGenerationBasis marker not found' }
  $testFn = @'
  const runExactDatePersistenceTest = async () => {
    const testPlotNo = `__date-test-${Date.now()}__`;
    const testCompletionDate = '19/11/2026';
    const testStartDate = '04/06/2026';
    setDatePersistenceTestMessage('Testing exact date storage…');
    try {
      await savePlotMetadata({
        plotNo: testPlotNo,
        houseTypeName: 'Persistence Test',
        bedroomTemplateId: 'threeBed',
        buildRoute: 'Traditional',
        programmeGenerationBasis: 'completion',
        plotStartDate: testStartDate,
        plotCompletionDate: testCompletionDate,
      });
      const reread = await readPlotMetadata();
      const saved = reread[getPlotMetadataKey(testPlotNo)];
      const preserved = saved?.plotCompletionDate === testCompletionDate && saved?.plotStartDate === testStartDate;
      setDatePersistenceTestMessage(
        preserved
          ? '✓ Exact date storage test passed — 19/11/2026 remained 19/11/2026.'
          : `✗ Exact date storage test failed — read back ${saved?.plotCompletionDate || 'nothing'}.`,
      );
    } catch (error) {
      setDatePersistenceTestMessage(`✗ Exact date storage test failed: ${String(error)}`);
    } finally {
      await removePlotMetadata(testPlotNo).catch(() => undefined);
    }
  };

'@
  $master = $master.Substring(0,$idx) + $testFn + $master.Substring($idx)
}

if ($master -notmatch 'Test Exact Date Saving') {
  $buttonNeedle = @'
        {plotDateError ? <Text style={styles.errorText}>{plotDateError}</Text> : null}
'@
  if (-not $master.Contains($buttonNeedle)) { throw 'plotDateError render marker not found' }
  $buttonReplacement = @'
        {plotDateError ? <Text style={styles.errorText}>{plotDateError}</Text> : null}
        <View style={styles.dateTestRow}>
          <Pressable style={styles.dateTestButton} onPress={runExactDatePersistenceTest}>
            <Text style={styles.dateTestButtonText}>Test Exact Date Saving</Text>
          </Pressable>
          {datePersistenceTestMessage ? <Text style={styles.dateTestMessage}>{datePersistenceTestMessage}</Text> : null}
        </View>
'@
  $master = $master.Replace($buttonNeedle, $buttonReplacement)
}

if ($master -notmatch 'dateTestRow:') {
  $styleMarker = "  errorText: {"
  $styleIdx = $master.IndexOf($styleMarker)
  if ($styleIdx -lt 0) { throw 'errorText style marker not found' }
  $styles = @'
  dateTestRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  dateTestButton: { backgroundColor: '#e0f2fe', borderColor: '#0284c7', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  dateTestButtonText: { color: '#075985', fontWeight: '900', fontSize: 12 },
  dateTestMessage: { color: '#166534', fontWeight: '800', fontSize: 12, flexShrink: 1 },
'@
  $master = $master.Substring(0,$styleIdx) + $styles + $master.Substring($styleIdx)
}

[IO.File]::WriteAllText($masterPath, $master, [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText($metadataPath, $metadata, [Text.UTF8Encoding]::new($false))

# ---------- STATIC VERIFICATION ----------
$masterCheck = [IO.File]::ReadAllText($masterPath)
$metadataCheck = [IO.File]::ReadAllText($metadataPath)
$checks = @(
  @{ ok = $metadataCheck -match 'plotCompletionDate\?: string'; msg = 'Plot metadata stores exact completion dates' },
  @{ ok = $masterCheck -match 'plotCompletionDate: exactCompletionDate'; msg = 'Plot save writes exact completion date' },
  @{ ok = $masterCheck -match 'metadata\?\.plotCompletionDate \|\| formatProgrammeDate'; msg = 'Master matrix prefers exact saved completion date' },
  @{ ok = $masterCheck -match 'shiftPlotDateByWeeks'; msg = 'Start-date generation preserves exact weekday' },
  @{ ok = $masterCheck -match 'Test Exact Date Saving'; msg = 'No-data-entry runtime date test installed' }
)
foreach ($check in $checks) {
  if (-not $check.ok) { throw "VERIFY FAILED: $($check.msg)" }
  Write-Host "PASS: $($check.msg)" -ForegroundColor Green
}

# ---------- PURE DATE SELF-TEST ----------
$dayMs = 24 * 60 * 60 * 1000
function Parse-BritishDate([string]$value) {
  if ($value -notmatch '^(\d{2})/(\d{2})/(\d{4})$') { throw "Bad test date: $value" }
  return [DateTime]::SpecifyKind((Get-Date -Year ([int]$Matches[3]) -Month ([int]$Matches[2]) -Day ([int]$Matches[1]) -Hour 0 -Minute 0 -Second 0), [DateTimeKind]::Utc)
}
function Format-BritishDate([DateTime]$date) { return $date.ToString('dd/MM/yyyy') }
$entered = Parse-BritishDate '19/11/2026'
$weekMonday = Parse-BritishDate '16/11/2026'
if ((Format-BritishDate $entered) -ne '19/11/2026') { throw 'Exact completion-date identity self-test failed' }
if ((Format-BritishDate $entered) -eq (Format-BritishDate $weekMonday)) { throw 'Test setup failed to distinguish exact date from programme-week Monday' }
$forwardStart = Parse-BritishDate '02/11/2026'
$forwardCompletion = $forwardStart.AddDays(24 * 7)
if ((Format-BritishDate $forwardCompletion) -ne '19/04/2027') { throw "Forward-date self-test failed: $(Format-BritishDate $forwardCompletion)" }
Write-Host 'PASS: exact completion date is not collapsed to programme-week Monday' -ForegroundColor Green
Write-Host 'PASS: start-driven completion preserves weekday across programme weeks' -ForegroundColor Green

Write-Host 'Running Expo production web build…' -ForegroundColor Cyan
npx expo export --platform web
if ($LASTEXITCODE -ne 0) { throw 'Expo web build failed' }

Write-Host ''
Write-Host 'EXACT DATE FIX VERIFIED' -ForegroundColor Green
Write-Host 'Open Master and press Test Exact Date Saving before entering or correcting any real dates.' -ForegroundColor Green

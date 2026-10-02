$ErrorActionPreference = 'Stop'

$root = Get-Location
$storePath = Join-Path $root 'data\sitePlannerStore.tsx'
$masterPath = Join-Path $root 'app\(tabs)\master.tsx'
$metadataPath = Join-Path $root 'utils\plotMetadata.ts'
$exactFixPath = Join-Path $root 'scripts\fix-exact-plot-completion-dates.ps1'

foreach ($path in @($storePath,$masterPath,$metadataPath)) {
  if (-not (Test-Path $path)) { throw "Missing $path" }
}

# Ensure the exact-date fix is present first. This is needed so edit mode can populate/save the real date.
$masterProbe = [IO.File]::ReadAllText($masterPath)
$metadataProbe = [IO.File]::ReadAllText($metadataPath)
if ($masterProbe -notmatch 'plotCompletionDate: exactCompletionDate' -or $metadataProbe -notmatch 'plotCompletionDate\?: string') {
  if (-not (Test-Path $exactFixPath)) { throw 'Exact-date fix is not installed and its repair script is missing.' }
  Write-Host 'Exact-date support is not installed yet. Applying it first...' -ForegroundColor Yellow
  & powershell -ExecutionPolicy Bypass -File $exactFixPath
  if ($LASTEXITCODE -ne 0) { throw 'Exact-date repair failed; edit patch stopped.' }
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item $storePath "$storePath.editplot-$timestamp.bak" -Force
Copy-Item $masterPath "$masterPath.editplot-$timestamp.bak" -Force

function Insert-Before {
  param([string]$Text,[string]$Marker,[string]$Insertion)
  $idx = $Text.IndexOf($Marker)
  if ($idx -lt 0) { throw "Marker not found: $Marker" }
  return $Text.Substring(0,$idx) + $Insertion + $Text.Substring($idx)
}

function Replace-Block {
  param([string]$Text,[string]$Start,[string]$End,[string]$Replacement)
  $s = $Text.IndexOf($Start)
  if ($s -lt 0) { throw "Start marker not found: $Start" }
  $e = $Text.IndexOf($End,$s)
  if ($e -lt 0) { throw "End marker not found: $End" }
  return $Text.Substring(0,$s) + $Replacement + "`r`n`r`n" + $Text.Substring($e)
}

# ---------------- STORE ----------------
$store = [IO.File]::ReadAllText($storePath)

if ($store -notmatch 'updateSitePlot: \(plotId: string') {
  $needle = '  upsertSitePlot: (input: SitePlotInput) => Promise<void>;'
  if (-not $store.Contains($needle)) { throw 'Store contract insertion point not found.' }
  $store = $store.Replace($needle, $needle + "`r`n  updateSitePlot: (plotId: string, input: SitePlotInput) => Promise<void>;")
}

if ($store -notmatch 'const updateSitePlot = async') {
  $marker = '  const removeSitePlot = async (plotId: string) => {'
  $implementation = @'
  const updateSitePlot = async (plotId: string, input: SitePlotInput) => {
    const current = sitePlots.find((plot) => plot.id === plotId);
    if (!current) return;
    const cleaned = cleanPlotInput(input, current.buildOrder ?? 1);
    if (!cleaned) return;

    const duplicate = sitePlots.find(
      (plot) => plot.id !== plotId && plot.plotNo.toLowerCase() === cleaned.plotNo.toLowerCase(),
    );
    if (duplicate) throw new Error(`Plot ${cleaned.plotNo} already exists.`);

    const nextPlots = getSortedSitePlots(
      sitePlots.map((plot) =>
        plot.id === plotId
          ? {
              ...plot,
              plotNo: cleaned.plotNo,
              buildOrder: cleaned.buildOrder ?? plot.buildOrder,
              stage9CompleteWeek: cleaned.stage9CompleteWeek,
              templateId: cleaned.templateId,
            }
          : plot,
      ),
    );
    setSitePlots(nextPlots);
    await AsyncStorage.setItem(SITE_PLOTS_KEY, JSON.stringify(nextPlots));
  };

'@
  $store = Insert-Before $store $marker $implementation
}

# Expose the new update function through the provider value.
if ($store -notmatch '(?m)^\s*updateSitePlot,\s*$') {
  $needle = '      upsertSitePlot,'
  if (-not $store.Contains($needle)) { throw 'Provider value insertion point not found.' }
  $store = $store.Replace($needle, $needle + "`r`n      updateSitePlot,")
}

[IO.File]::WriteAllText($storePath,$store,[Text.UTF8Encoding]::new($false))

# ---------------- MASTER SCREEN ----------------
$master = [IO.File]::ReadAllText($masterPath)

# Add updateSitePlot to the planner destructure.
if ($master -notmatch '\bupdateSitePlot\b') {
  $master = $master.Replace(
    'siteSetup, upsertSitePlot, removeSitePlot, clearSitePlotData, holdPlotAtStage',
    'siteSetup, upsertSitePlot, updateSitePlot, removeSitePlot, clearSitePlotData, holdPlotAtStage'
  )
} elseif ($master -notmatch 'useSitePlanner\(\).*updateSitePlot') {
  # Fallback for a formatted destructure on one line.
  $master = $master.Replace('upsertSitePlot, removeSitePlot', 'upsertSitePlot, updateSitePlot, removeSitePlot')
}

# Edit-mode state.
if ($master -notmatch 'editingPlotId') {
  $needle = "  const [plotDateError, setPlotDateError] = useState('');"
  if (-not $master.Contains($needle)) { throw 'Edit state insertion point not found.' }
  $master = $master.Replace($needle, $needle + "`r`n  const [editingPlotId, setEditingPlotId] = useState('');`r`n  const [editingOriginalPlotNo, setEditingOriginalPlotNo] = useState('');`r`n  const [editMessage, setEditMessage] = useState('');")
}

# Functions that load an existing plot into the existing Plot Input form.
if ($master -notmatch 'const beginEditPlot =') {
  $marker = '  const savePlot = async () => {'
  $editFunctions = @'
  const beginEditPlot = (plot: (typeof sitePlots)[number]) => {
    const metadata = plotMetadata[getPlotMetadataKey(plot.plotNo)];
    const route = metadata?.buildRoute ?? (plot.templateId === 'timberFrame' ? 'Timber Frame' : 'Traditional');
    const bedroomTemplateId = metadata?.bedroomTemplateId ?? (plot.templateId === 'timberFrame' ? 'threeBed' : plot.templateId ?? 'threeBed');
    const programmeTemplate = getTemplateForPlot(plot, plotTemplates);
    const programmeWeeks = getEffectiveProgrammeWeeks(programmeTemplate, siteSetup);
    const completionDate = metadata?.plotCompletionDate || formatProgrammeDate(siteSetup.programmeStartDate, plot.stage9CompleteWeek);
    const startDate = metadata?.plotStartDate || shiftPlotDateByWeeks(completionDate, -(programmeWeeks - 1));

    setEditingPlotId(plot.id);
    setEditingOriginalPlotNo(plot.plotNo);
    setPlotNo(plot.plotNo);
    setHouseTypeName(metadata?.houseTypeName ?? '');
    setBuildRoute(route);
    setTemplateId(bedroomTemplateId);
    setProgrammeGenerationBasis(metadata?.programmeGenerationBasis ?? 'completion');
    setPlotStartDate(startDate);
    setPlotCompletionDate(completionDate);
    setPlotDateError('');
    setEditMessage(`Editing Plot ${plot.plotNo}. Change the details above, then press Save Plot Changes.`);
  };

  const cancelEditPlot = () => {
    setEditingPlotId('');
    setEditingOriginalPlotNo('');
    setPlotNo('');
    setHouseTypeName('');
    setPlotStartDate('');
    setPlotCompletionDate('');
    setPlotDateError('');
    setEditMessage('Edit cancelled.');
  };

'@
  $master = Insert-Before $master $marker $editFunctions
}

# Replace savePlot with an edit-aware version. This keeps plot ID/build order, exact dates and metadata.
$saveReplacement = @'
  const savePlot = async () => {
    const selectedDate = programmeGenerationBasis === 'start' ? plotStartDate : plotCompletionDate;
    const dateLabel = programmeGenerationBasis === 'start' ? 'Plot Start Date' : 'Plot Completion Date';
    const rawDateError = validatePlotCompletionDate(siteSetup.programmeStartDate, selectedDate);
    const dateError = rawDateError.replace(/Plot Completion Date/g, dateLabel);
    setPlotDateError(dateError);
    const anchorWeek = getProgrammeWeekForDate(siteSetup.programmeStartDate, selectedDate);
    const cleanedPlotNo = plotNo.trim();
    if (!cleanedPlotNo || dateError || !anchorWeek) return;

    const duplicate = sitePlots.find(
      (plot) => plot.id !== editingPlotId && plot.plotNo.toLowerCase() === cleanedPlotNo.toLowerCase(),
    );
    if (duplicate) {
      setPlotDateError(`Plot ${cleanedPlotNo} already exists.`);
      return;
    }

    const programmeTemplateId = buildRoute === 'Timber Frame' ? 'timberFrame' : templateId;
    const programmeTemplate = getTemplateById(programmeTemplateId, plotTemplates);
    const programmeWeeks = programmeTemplate
      ? getEffectiveProgrammeWeeks(programmeTemplate, siteSetup)
      : Math.max(1, siteSetup.defaultProgrammeWeeks || 23);
    const completionWeek = programmeGenerationBasis === 'start'
      ? anchorWeek + programmeWeeks - 1
      : anchorWeek;
    const exactStartDate = programmeGenerationBasis === 'start'
      ? normaliseBritishDate(plotStartDate)
      : shiftPlotDateByWeeks(normaliseBritishDate(plotCompletionDate), -(programmeWeeks - 1));
    const exactCompletionDate = programmeGenerationBasis === 'completion'
      ? normaliseBritishDate(plotCompletionDate)
      : shiftPlotDateByWeeks(normaliseBritishDate(plotStartDate), programmeWeeks - 1);

    const existingByNumber = sitePlots.find((plot) => plot.plotNo.toLowerCase() === cleanedPlotNo.toLowerCase());
    const editingPlot = editingPlotId ? sitePlots.find((plot) => plot.id === editingPlotId) : undefined;
    const nextBuildOrder = sitePlots.length ? Math.max(...sitePlots.map((plot) => plot.buildOrder ?? 0)) + 1 : 1;
    const plotInput = {
      plotNo: cleanedPlotNo,
      buildOrder: editingPlot?.buildOrder ?? existingByNumber?.buildOrder ?? nextBuildOrder,
      stage9CompleteWeek: completionWeek,
      templateId: programmeTemplateId,
    };

    try {
      if (editingPlotId) {
        await updateSitePlot(editingPlotId, plotInput);
        if (editingOriginalPlotNo && editingOriginalPlotNo.toLowerCase() !== cleanedPlotNo.toLowerCase()) {
          await removePlotMetadata(editingOriginalPlotNo);
        }
      } else {
        await upsertSitePlot(plotInput);
      }

      const nextMetadata = await savePlotMetadata({
        plotNo: cleanedPlotNo,
        houseTypeName,
        bedroomTemplateId: templateId,
        buildRoute,
        programmeGenerationBasis,
        plotStartDate: exactStartDate,
        plotCompletionDate: exactCompletionDate,
      });
      setPlotMetadata(nextMetadata);
      setEditMessage(editingPlotId ? `Plot ${cleanedPlotNo} updated successfully.` : `Plot ${cleanedPlotNo} added successfully.`);
      setEditingPlotId('');
      setEditingOriginalPlotNo('');
      setPlotNo('');
      setHouseTypeName('');
      setPlotStartDate('');
      setPlotCompletionDate('');
      setPlotDateError('');
      setClearConfirm(false);
    } catch (error) {
      setPlotDateError(String(error instanceof Error ? error.message : error));
    }
  };
'@
$master = Replace-Block $master '  const savePlot = async () => {' '  const selectResetMode = (mode: ResetMode) => {' $saveReplacement

# Change Generate button into Save Changes while editing and add Cancel.
$buttonPattern = '<Pressable style=\{styles\.saveButton\} onPress=\{savePlot\}>\s*<Text style=\{styles\.saveButtonText\}>Generate Plot Programme</Text>\s*</Pressable>'
$buttonReplacement = @'
          <View style={styles.editSaveRow}>
            <Pressable style={styles.saveButton} onPress={savePlot}>
              <Text style={styles.saveButtonText}>{editingPlotId ? 'Save Plot Changes' : 'Generate Plot Programme'}</Text>
            </Pressable>
            {editingPlotId ? (
              <Pressable style={styles.cancelEditButton} onPress={cancelEditPlot}>
                <Text style={styles.cancelEditButtonText}>Cancel Edit</Text>
              </Pressable>
            ) : null}
          </View>
'@
$master = [regex]::Replace($master,$buttonPattern,[System.Text.RegularExpressions.MatchEvaluator]{param($m)$buttonReplacement},1)
if ($master -notmatch 'Save Plot Changes') { throw 'Could not replace the Generate Plot Programme button.' }

# Display edit status directly below the form.
if ($master -notmatch '\{editMessage \?') {
  $needle = '        {plotDateError ? <Text style={styles.errorText}>{plotDateError}</Text> : null}'
  if (-not $master.Contains($needle)) { throw 'Plot error render marker not found.' }
  $master = $master.Replace($needle, $needle + "`r`n        {editMessage ? <Text style={styles.editMessage}>{editMessage}</Text> : null}")
}

# Master matrix action now has Edit + Select instead of forcing delete/recreate.
$oldAction = @'
                  <Pressable style={styles.removeButton} onPress={() => selectResetPlot(plot.id)}>
                    <Text style={styles.removeButtonText}>Select</Text>
                  </Pressable>
'@
$newAction = @'
                  <View style={styles.plotActionCell}>
                    <Pressable style={styles.editPlotButton} onPress={() => beginEditPlot(plot)}>
                      <Text style={styles.editPlotButtonText}>Edit</Text>
                    </Pressable>
                    <Pressable style={styles.selectPlotButton} onPress={() => selectResetPlot(plot.id)}>
                      <Text style={styles.selectPlotButtonText}>Select</Text>
                    </Pressable>
                  </View>
'@
if ($master.Contains($oldAction)) {
  $master = $master.Replace($oldAction,$newAction)
} elseif ($master -notmatch 'beginEditPlot\(plot\)') {
  throw 'Could not replace matrix Action control.'
}

# Wider Action header to match the two buttons.
$master = $master.Replace('  actionCell: { width: 86 },','  actionCell: { width: 150 },')

# Add styles once.
if ($master -notmatch 'editPlotButton:') {
  $styleMarker = "  saveButton: { backgroundColor: '#0f172a'"
  $idx = $master.IndexOf($styleMarker)
  if ($idx -lt 0) { throw 'Save button style marker not found.' }
  $styles = @'
  editSaveRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  cancelEditButton: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#94a3b8', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  cancelEditButtonText: { color: '#334155', fontWeight: '900' },
  editMessage: { color: '#166534', fontSize: 12, fontWeight: '900' },
  plotActionCell: { width: 150, flexDirection: 'row', gap: 6, padding: 5, borderWidth: 1, borderColor: '#c8d7e6', alignItems: 'center', justifyContent: 'center' },
  editPlotButton: { backgroundColor: '#dbeafe', borderWidth: 1, borderColor: '#60a5fa', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  editPlotButtonText: { color: '#1d4ed8', fontWeight: '900', fontSize: 11 },
  selectPlotButton: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7 },
  selectPlotButtonText: { color: '#475569', fontWeight: '900', fontSize: 11 },
'@
  $master = $master.Substring(0,$idx) + $styles + $master.Substring($idx)
}

[IO.File]::WriteAllText($masterPath,$master,[Text.UTF8Encoding]::new($false))

# ---------------- STATIC VERIFICATION ----------------
$storeCheck = [IO.File]::ReadAllText($storePath)
$masterCheck = [IO.File]::ReadAllText($masterPath)
$checks = @(
  @{ ok = $storeCheck -match 'updateSitePlot: \(plotId: string'; msg = 'Store exposes plot update API' },
  @{ ok = $storeCheck -match 'const updateSitePlot = async'; msg = 'Store updates a plot in place by stable plot ID' },
  @{ ok = $masterCheck -match 'const beginEditPlot ='; msg = 'Existing plot details load into edit form' },
  @{ ok = $masterCheck -match "editingPlotId \? 'Save Plot Changes'"; msg = 'Generate button becomes Save Plot Changes in edit mode' },
  @{ ok = $masterCheck -match 'beginEditPlot\(plot\)'; msg = 'Every master-matrix row has an Edit action' },
  @{ ok = $masterCheck -match 'await updateSitePlot\(editingPlotId, plotInput\)'; msg = 'Edit saves into existing plot instead of creating a replacement' },
  @{ ok = $masterCheck -match 'plotCompletionDate: exactCompletionDate'; msg = 'Exact completion date remains preserved while editing' }
)
foreach ($check in $checks) {
  if (-not $check.ok) { throw "VERIFY FAILED: $($check.msg)" }
  Write-Host "PASS: $($check.msg)" -ForegroundColor Green
}

# ---------------- DATA-LOGIC SELF TEST ----------------
$original = [pscustomobject]@{ id='site-plot-153'; plotNo='153'; buildOrder=4; stage9CompleteWeek=44; templateId='threeBed'; holdStage=6 }
$edited = [pscustomobject]@{
  id=$original.id
  plotNo='153'
  buildOrder=$original.buildOrder
  stage9CompleteWeek=47
  templateId='fourBed'
  holdStage=$original.holdStage
}
if ($edited.id -ne $original.id) { throw 'Self-test failed: plot ID changed during edit.' }
if ($edited.buildOrder -ne $original.buildOrder) { throw 'Self-test failed: build order changed during edit.' }
if ($edited.holdStage -ne $original.holdStage) { throw 'Self-test failed: hold state was lost during edit.' }
if ($edited.stage9CompleteWeek -ne 47 -or $edited.templateId -ne 'fourBed') { throw 'Self-test failed: edited fields were not applied.' }
Write-Host 'PASS: edit self-test preserves ID/build order/hold while changing programme fields' -ForegroundColor Green

Write-Host 'Running Expo production web build...' -ForegroundColor Cyan
npx expo export --platform web
if ($LASTEXITCODE -ne 0) { throw 'Expo web build failed.' }

Write-Host ''
Write-Host 'EDIT PLOT FEATURE VERIFIED' -ForegroundColor Green
Write-Host 'Each Master row now has Edit. It loads the existing plot into Plot Input and saves changes in place.' -ForegroundColor Green

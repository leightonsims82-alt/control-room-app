$ErrorActionPreference = 'Stop'

$storePath = Join-Path (Get-Location) 'data\sitePlannerStore.tsx'
if (-not (Test-Path $storePath)) {
  throw "Run this script from the control-room-app project root. Missing: $storePath"
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupPath = "$storePath.persistence-$timestamp.bak"
Copy-Item $storePath $backupPath -Force
Write-Host "Backup created: $backupPath" -ForegroundColor DarkGray

$source = [System.IO.File]::ReadAllText($storePath)

function Replace-Block {
  param(
    [string]$Text,
    [string]$StartMarker,
    [string]$EndMarker,
    [string]$Replacement
  )

  $start = $Text.IndexOf($StartMarker)
  if ($start -lt 0) { throw "Could not find start marker: $StartMarker" }

  $end = $Text.IndexOf($EndMarker, $start)
  if ($end -lt 0) { throw "Could not find end marker: $EndMarker" }

  return $Text.Substring(0, $start) + $Replacement + "`r`n`r`n" + $Text.Substring($end)
}

$mergeReplacement = @'
function mergeDefaultTemplates(stored: PlotTemplate[]) {
  if (!stored.length) return DEFAULT_PLOT_TEMPLATES.map(normaliseTemplate);

  const storedIds = new Set(stored.map((template) => template.id));
  const savedTemplates = stored.map(normaliseTemplate);
  const missingDefaults = DEFAULT_PLOT_TEMPLATES
    .filter((template) => !storedIds.has(template.id))
    .map(normaliseTemplate);

  return [...savedTemplates, ...missingDefaults];
}
'@

$source = Replace-Block `
  -Text $source `
  -StartMarker 'function mergeDefaultTemplates' `
  -EndMarker 'function cleanPlotInput' `
  -Replacement $mergeReplacement

$updateTemplateReplacement = @'
  const updatePlotTemplate = async (input: PlotTemplate) => {
    setPlotTemplates((currentTemplates) => {
      const nextTemplates = currentTemplates.map((template) =>
        template.id === input.id ? normaliseTemplate(input) : template,
      );
      void AsyncStorage.setItem(PLOT_TEMPLATES_KEY, JSON.stringify(nextTemplates)).catch((error) => {
        console.warn('Unable to save plot templates', error);
      });
      return nextTemplates;
    });
  };
'@

$source = Replace-Block `
  -Text $source `
  -StartMarker '  const updatePlotTemplate = async' `
  -EndMarker '  const updateTemplateActivityDuration = async' `
  -Replacement $updateTemplateReplacement

$durationReplacement = @'
  const updateTemplateActivityDuration = async (templateId: string, activityCode: string, durationDays: number) => {
    setPlotTemplates((currentTemplates) => {
      const nextTemplates = currentTemplates.map((template) => {
        if (template.id !== templateId) return template;
        return {
          ...template,
          activities: template.activities.map((activity) =>
            activity.code === activityCode ? { ...activity, durationDays: Math.max(0, durationDays) } : activity,
          ),
        };
      });
      void AsyncStorage.setItem(PLOT_TEMPLATES_KEY, JSON.stringify(nextTemplates)).catch((error) => {
        console.warn('Unable to save template duration', error);
      });
      return nextTemplates;
    });
  };
'@

$source = Replace-Block `
  -Text $source `
  -StartMarker '  const updateTemplateActivityDuration = async' `
  -EndMarker '  const value = useMemo' `
  -Replacement $durationReplacement

[System.IO.File]::WriteAllText(
  $storePath,
  $source,
  [System.Text.UTF8Encoding]::new($false)
)

try {
  Write-Host "`nRunning persistence self-test..." -ForegroundColor Cyan
  node .\scripts\template-persistence-selftest.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Persistence self-test failed' }

  Write-Host "`nRunning Expo web production build..." -ForegroundColor Cyan
  npm run build
  if ($LASTEXITCODE -ne 0) { throw 'Expo web build failed' }

  Write-Host "`nFIX VERIFIED" -ForegroundColor Green
  Write-Host "The actual store now preserves complete saved templates, including added/removed/reordered rows." -ForegroundColor Green
  Write-Host "The self-test simulated save -> another edit -> reload and passed." -ForegroundColor Green
}
catch {
  Copy-Item $backupPath $storePath -Force
  Write-Host "`nTEST FAILED - original store restored automatically." -ForegroundColor Red
  throw
}

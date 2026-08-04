$ErrorActionPreference = 'Stop'

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $projectRoot

$branch = 'programme-buddy-excel-rebuild'
$currentBranch = (git branch --show-current).Trim()

if ($currentBranch -ne $branch) {
  throw "The Programme task must be run on '$branch'. Current branch: '$currentBranch'."
}

Write-Host 'Stopping any old Programme server on port 8082...' -ForegroundColor Yellow
$connections = Get-NetTCPConnection -LocalPort 8082 -State Listen -ErrorAction SilentlyContinue
foreach ($connection in $connections) {
  if ($connection.OwningProcess) {
    Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
  }
}

Write-Host 'Synchronising this folder exactly with the latest GitHub branch...' -ForegroundColor Cyan
git fetch origin $branch
if ($LASTEXITCODE -ne 0) {
  throw 'GitHub fetch failed. The app has not been started.'
}

git reset --hard "origin/$branch"
if ($LASTEXITCODE -ne 0) {
  throw 'GitHub synchronisation failed. The app has not been started.'
}

Remove-Item -Recurse -Force '.expo' -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force 'node_modules/.cache' -ErrorAction SilentlyContinue

$commit = (git rev-parse --short HEAD).Trim()
Write-Host "Starting Programme commit $commit on port 8082..." -ForegroundColor Green
npm run programme:clean

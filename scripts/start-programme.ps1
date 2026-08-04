$ErrorActionPreference = 'Stop'

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $projectRoot

$branch = 'programme-buddy-excel-rebuild'
$currentBranch = (git branch --show-current).Trim()

if ($currentBranch -ne $branch) {
  throw "The Programme task must be run on '$branch'. Current branch: '$currentBranch'."
}

$localChanges = git status --porcelain
if ($localChanges) {
  throw 'Local code changes were found. Automatic updating has stopped to protect your work.'
}

Write-Host 'Checking GitHub for the latest Programme update...' -ForegroundColor Cyan
git pull --ff-only origin $branch

if ($LASTEXITCODE -ne 0) {
  throw 'GitHub update failed. The app has not been started.'
}

Write-Host 'Starting the latest Programme app on port 8082...' -ForegroundColor Green
npm run programme:clean

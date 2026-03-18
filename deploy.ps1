#!/usr/bin/env pwsh
# deploy.ps1 - Build, push to Power Platform, commit and push to GitHub
#
# USAGE
#   .\deploy.ps1              # build + power-apps push + git push
#   .\deploy.ps1 -SkipBuild   # skip npm build, just push
#   .\deploy.ps1 -DryRun      # preview only, no changes made

param(
    [switch]$SkipBuild,
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$AppDir = Join-Path $PSScriptRoot 'app'
$CLI    = Join-Path $AppDir 'node_modules\.bin\power-apps.cmd'

function Step  { param($msg) Write-Host "`n  >> $msg" -ForegroundColor Cyan }
function Ok    { param($msg) Write-Host "  OK  $msg" -ForegroundColor Green }
function Warn  { param($msg) Write-Host "  !!  $msg" -ForegroundColor Yellow }
function Fail  { param($msg) Write-Host "`n  ERR $msg`n" -ForegroundColor Red }

function Assert-Ok {
    param($label)
    if ($LASTEXITCODE -ne 0) { Fail "$label failed (exit $LASTEXITCODE)"; exit 1 }
}

# ── Banner ─────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  NextGen ITSM - Power Platform Deploy" -ForegroundColor White
Write-Host "  -------------------------------------" -ForegroundColor DarkGray
if ($DryRun) { Warn "DRY RUN - no changes will be made" }

# ── Read config ────────────────────────────────────────────────────────────────
$config = Get-Content "$AppDir/power.config.json" | ConvertFrom-Json
Write-Host ""
Write-Host "  App:    $($config.appDisplayName)" -ForegroundColor White
Write-Host "  App ID: $($config.appId)" -ForegroundColor DarkGray
Write-Host "  Env ID: $($config.environmentId)" -ForegroundColor DarkGray

# ── Verify CLI ─────────────────────────────────────────────────────────────────
Step "Checking power-apps CLI..."
if (-not (Test-Path $CLI)) {
    Fail "power-apps CLI not found. Run: cd app && npm install"
    exit 1
}
$ver = & $CLI --version 2>&1
Ok "power-apps $ver"

# ── Build ──────────────────────────────────────────────────────────────────────
if (-not $SkipBuild) {
    Step "Building React app..."
    Push-Location $AppDir
    try {
        if ($DryRun) {
            Warn "[DRY RUN] Would run: npm run build"
        } else {
            npm run build
            Assert-Ok "npm run build"
        }
    } finally { Pop-Location }
    Ok "Build complete"
} else {
    Warn "Skipping build (-SkipBuild)"
}

# ── Push to Power Platform ─────────────────────────────────────────────────────
Step "Pushing to Power Platform..."
Push-Location $AppDir
try {
    if ($DryRun) {
        Warn "[DRY RUN] Would run: power-apps push"
    } else {
        & $CLI push
        Assert-Ok "power-apps push"
    }
} finally { Pop-Location }
Ok "Pushed: $($config.appDisplayName)"

# ── Git commit & push ──────────────────────────────────────────────────────────
Step "Committing and pushing to GitHub..."
Push-Location $PSScriptRoot
try {
    if ($DryRun) {
        Warn "[DRY RUN] Would run: git add -A && git commit && git push"
    } else {
        git add -A
        Assert-Ok "git add"

        $dirty = git status --porcelain 2>&1
        if (-not $dirty) {
            Warn "Nothing to commit - working tree clean"
        } else {
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
            git commit -m "deploy: push NextGen ITSM app [$timestamp]"
            Assert-Ok "git commit"

            git push
            Assert-Ok "git push"

            $remote = git remote get-url origin 2>&1
            Ok "Pushed to $remote"
        }
    }
} finally { Pop-Location }

Write-Host ""
Write-Host "  DONE" -ForegroundColor Green
Write-Host ""

#!/usr/bin/env pwsh
# bootstrap.ps1 — One-command local setup for Power Apps Code App development

param(
    [Parameter(Mandatory=$true)]
    [string]$EnvironmentId,
    
    [Parameter(Mandatory=$false)]
    [string]$DisplayName = "My Code App"
)

Write-Host "🚀 Power Apps Code App Bootstrap" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# 1. Install dependencies
Write-Host "`n📦 Installing npm dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) { Write-Error "npm install failed"; exit 1 }

# 2. Authenticate PAC CLI
Write-Host "`n🔐 Authenticating PAC CLI..." -ForegroundColor Yellow
pac auth create
if ($LASTEXITCODE -ne 0) { Write-Error "PAC auth failed"; exit 1 }

# 3. Select environment
Write-Host "`n🌍 Selecting environment: $EnvironmentId" -ForegroundColor Yellow
pac env select --environment $EnvironmentId
if ($LASTEXITCODE -ne 0) { Write-Error "Environment select failed"; exit 1 }

# 4. Initialize code app
Write-Host "`n⚙️  Initializing code app: '$DisplayName'" -ForegroundColor Yellow
pac code init --displayname $DisplayName
if ($LASTEXITCODE -ne 0) { Write-Error "pac code init failed"; exit 1 }

Write-Host "`n✅ Bootstrap complete! Run 'npm run dev' to start local development." -ForegroundColor Green

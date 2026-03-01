#!/usr/bin/env pwsh
# deploy.ps1 — Build and push Code App to Power Platform

Write-Host "🏗️  Building..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed"; exit 1 }

Write-Host "🚀 Pushing to Power Platform..." -ForegroundColor Cyan
pac code push
if ($LASTEXITCODE -ne 0) { Write-Error "pac code push failed"; exit 1 }

Write-Host "✅ Deploy complete!" -ForegroundColor Green

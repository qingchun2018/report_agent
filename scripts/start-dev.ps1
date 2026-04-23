# 本地一键启动（Windows）：Mongo 可选；后端 8002 + 前端 5175
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "== Report Agent 开发启动 ==" -ForegroundColor Cyan

$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$backend'; python -m uvicorn app.main:app --reload --port 8002"
) -WindowStyle Normal

Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$frontend'; npm run dev"
) -WindowStyle Normal

Write-Host "后端: http://127.0.0.1:8002/docs" -ForegroundColor Green
Write-Host "前端: http://localhost:5175/" -ForegroundColor Green

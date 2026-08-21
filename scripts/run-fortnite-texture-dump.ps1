# Fix Fortnite UnrealExporter config (regex escapes) and run the dump.
# Double-click or: powershell -ExecutionPolicy Bypass -File .\run-fortnite-texture-dump.ps1

$ErrorActionPreference = 'Stop'
$tools = 'D:\Projetos\Fortnite\_tools'
$root = Join-Path $tools 'UnrealExporter\UnrealExporter-2.0.0'
$cfg = Join-Path $root 'configs\fortnite.json'
$out = 'D:\Projetos\Fortnite\FModelDump'
$fixJs = Join-Path $tools 'fix-fortnite-config.mjs'

if (-not (Test-Path $cfg)) { throw "Missing config: $cfg" }
New-Item -ItemType Directory -Path $out, $tools -Force | Out-Null

@'
import fs from 'node:fs';
const p = 'D:/Projetos/Fortnite/_tools/UnrealExporter/UnrealExporter-2.0.0/configs/fortnite.json';
const c = JSON.parse(fs.readFileSync(p, 'utf8'));
c.GamePath = 'C:/Program Files/Epic Games/Fortnite';
c.OutputPath = 'D:/Projetos/Fortnite/FModelDump';
c.EngineVersion = '5.6';
c.MappingFileName = 'Fortnite.usmap';
c.ExportPaths = [
  'FortniteGame/Content/.*[Ii]con.*\\.uasset:png',
  'FortniteGame/Plugins/.*[Ii]con.*\\.uasset:png',
  'FortniteGame/Content/Items/.*\\.uasset:png',
  'FortniteGame/Content/Characters/.*\\.uasset:png',
  'FortniteGame/Content/UI/Foundation/Textures/.*\\.uasset:png',
  'FortniteGame/Content/Athena/Items/Cosmetics/.*\\.uasset:png',
];
c.ExcludePaths = [
  '.*_Physics.*',
  '.*_PhysMat.*',
  '.*Nanite.*',
];
fs.writeFileSync(p, JSON.stringify(c, null, 2));
const check = JSON.parse(fs.readFileSync(p, 'utf8'));
console.log('fixed sample:', check.ExportPaths[0]);
console.log('ok has \\. :', check.ExportPaths[0].includes('\\.'));
'@ | Set-Content -Path $fixJs -Encoding UTF8

node $fixJs

Write-Host ''
Write-Host 'Starting UnrealExporter (console window). Leave it open until it finishes.'
Write-Host "Output: $out"
Write-Host ''

$p = Start-Process -FilePath (Join-Path $root 'UnrealExporter.exe') -ArgumentList 'fortnite.json' -WorkingDirectory $root -PassThru -WindowStyle Normal
Write-Host "PID $($p.Id). Polling every 30s..."

while (-not $p.HasExited) {
  Start-Sleep -Seconds 30
  $files = @(Get-ChildItem $out -Recurse -File -ErrorAction SilentlyContinue)
  $mb = if ($files.Count) { [math]::Round(($files | Measure-Object Length -Sum).Sum / 1MB, 1) } else { 0 }
  Write-Host ("[{0}] files={1} sizeMB={2}" -f (Get-Date -Format 'HH:mm:ss'), $files.Count, $mb)
}

$files = @(Get-ChildItem $out -Recurse -File -ErrorAction SilentlyContinue)
$mb = if ($files.Count) { [math]::Round(($files | Measure-Object Length -Sum).Sum / 1MB, 1) } else { 0 }
Write-Host ''
Write-Host "DONE exit=$($p.ExitCode) files=$($files.Count) sizeMB=$mb"
Write-Host "Folder: $out"
Pause

param(
  [Parameter(Mandatory = $true)]
  [string]$Root
)

$ErrorActionPreference = "Stop"

$nodeVersion = "22.16.0"
$runtimeDir = Join-Path $Root ".runtime"
$nodeDir = Join-Path $runtimeDir "node"
$archiveName = "node-v$nodeVersion-win-x64.zip"
$downloadUrl = "https://nodejs.org/dist/v$nodeVersion/$archiveName"
$archivePath = Join-Path $runtimeDir $archiveName
$extractDir = Join-Path $runtimeDir "node-v$nodeVersion-win-x64"

Write-Host "Preparing local Node.js runtime..."
Write-Host "Version: v$nodeVersion"
Write-Host "Target: $nodeDir"

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

if (-not (Test-Path $archivePath)) {
  Write-Host "Downloading Node.js from $downloadUrl"
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  Invoke-WebRequest -Uri $downloadUrl -OutFile $archivePath
}

if (Test-Path $extractDir) {
  Remove-Item -Recurse -Force $extractDir
}

Write-Host "Extracting Node.js..."
Expand-Archive -Path $archivePath -DestinationPath $runtimeDir -Force

if (Test-Path $nodeDir) {
  Remove-Item -Recurse -Force $nodeDir
}

Rename-Item -Path $extractDir -NewName "node"

$nodeExe = Join-Path $nodeDir "node.exe"
$npmCmd = Join-Path $nodeDir "npm.cmd"
if (-not (Test-Path $nodeExe) -or -not (Test-Path $npmCmd)) {
  throw "Downloaded Node.js runtime is incomplete."
}

Write-Host "Local Node.js runtime is ready."

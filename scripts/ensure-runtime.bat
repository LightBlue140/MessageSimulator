@echo off
setlocal
set "ROOT=%~dp0.."
for %%I in ("%ROOT%") do set "ROOT=%%~fI"
set "LOCAL_NODE=%ROOT%\.runtime\node"

if exist "%LOCAL_NODE%\node.exe" (
  set "PATH=%LOCAL_NODE%;%PATH%"
  goto :check_runtime
)

where node >nul 2>nul
if not errorlevel 1 goto :check_runtime

goto :install_runtime

:check_runtime
node -e "const major=Number(process.versions.node.split('.')[0]); process.exit(major >= 20 ? 0 : 1)" >nul 2>nul
if not errorlevel 1 goto :check_npm

:install_runtime
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\scripts\install-node-runtime.ps1" -Root "%ROOT%"
if errorlevel 1 (
  exit /b 1
)
set "PATH=%LOCAL_NODE%;%PATH%"

:check_npm
where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found after preparing Node.js.
  exit /b 1
)

node --version
npm --version
endlocal & set "PATH=%PATH%"
exit /b 0

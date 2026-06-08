@echo off
setlocal
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
cd /d "%ROOT%"

echo ========================================
echo    Message Simulator - Starting...
echo ========================================
echo.

echo Checking Node.js runtime...
call "%ROOT%\scripts\ensure-runtime.bat"
if errorlevel 1 (
  echo Node.js runtime preparation failed. Check the output above.
  pause
  exit /b 1
)
echo.

echo Checking dependencies...
node scripts\ensure-deps.mjs
if errorlevel 1 (
  echo Dependency installation failed. Check the output above.
  pause
  exit /b 1
)
echo.

echo Cleaning occupied ports 3001 and 5173...
node scripts\clear-ports.mjs 3001 5173
echo.

echo [1/2] Starting backend...
start "Server" "%ROOT%\start_server.bat"

node scripts\wait-for-url.mjs http://localhost:3001/health 90
if errorlevel 1 (
  echo Backend did not become ready. Check the Server window.
  pause
  exit /b 1
)

echo [2/2] Starting frontend...
start "Web" "%ROOT%\start_web.bat"

echo.
echo ========================================
echo    Done!
echo    Backend:  http://localhost:3001
echo    Frontend: http://localhost:5173
echo ========================================
echo.
exit /b 0

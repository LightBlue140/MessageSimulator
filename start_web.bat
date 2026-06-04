@echo off
setlocal
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
cd /d "%ROOT%"
echo Message Simulator - Web
echo UI: http://localhost:5173
echo.
node scripts\ensure-deps.mjs
if errorlevel 1 (
  echo Dependency installation failed. Check the output above.
  pause
  exit /b 1
)
echo.
node scripts\clear-ports.mjs 5173
echo.
node scripts\wait-for-url.mjs http://localhost:3001/health 3 >nul 2>nul
if errorlevel 1 (
  echo Backend is not ready. Starting backend...
  start "Server" cmd /k "cd /d ""%ROOT%"" && npm run dev"
  node scripts\wait-for-url.mjs http://localhost:3001/health 90
  if errorlevel 1 (
    echo Backend did not become ready. Check the Server window.
    pause
    exit /b 1
  )
) else (
  echo Backend is already ready.
)
echo.
npm run dev:web
pause

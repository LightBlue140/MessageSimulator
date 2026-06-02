@echo off
cd /d "%~dp0"
echo Message Simulator - Web
echo UI: http://localhost:5173
echo.
node scripts\clear-ports.mjs 3001 5173
echo.
echo Starting backend dependency...
start "Server" cmd /k "cd /d %~dp0 && npm run dev"
node scripts\wait-for-url.mjs http://localhost:3001/health 30
if errorlevel 1 (
  echo Backend did not become ready. Check the Server window.
  pause
  exit /b 1
)
echo.
npm run dev:web
pause

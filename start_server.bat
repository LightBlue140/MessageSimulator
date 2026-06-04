@echo off
cd /d "%~dp0"
echo Message Simulator - Server
echo API: http://localhost:3001
echo.
node scripts\ensure-deps.mjs
if errorlevel 1 (
  echo Dependency installation failed. Check the output above.
  pause
  exit /b 1
)
echo.
node scripts\clear-ports.mjs 3001
echo.
npm run dev
pause

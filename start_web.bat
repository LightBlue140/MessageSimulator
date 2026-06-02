@echo off
cd /d "%~dp0"
echo Message Simulator - Web
echo UI: http://localhost:5173
echo.
node scripts\clear-ports.mjs 5173
echo.
npm run dev:web
pause

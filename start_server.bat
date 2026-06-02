@echo off
cd /d "%~dp0"
echo Message Simulator - Server
echo API: http://localhost:3001
echo.
node scripts\clear-ports.mjs 3001
echo.
npm run dev
pause

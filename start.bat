@echo off
setlocal
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
cd /d "%ROOT%"

echo ========================================
echo    Message Simulator - Qi Dong Zhong...
echo ========================================
echo.

echo Cleaning occupied ports 3001 and 5173...
node scripts\clear-ports.mjs 3001 5173
echo.

echo [1/2] Qi Dong Hou Duan...
start "Server" cmd /k "cd /d %ROOT% && npm run dev"

ping -n 3 127.0.0.1 >nul

echo [2/2] Qi Dong Qian Duan...
start "Web" cmd /k "cd /d %ROOT% && npm run dev:web"

echo.
echo ========================================
echo    Wan Cheng!
echo    Hou Duan: http://localhost:3001
echo    Qian Duan: http://localhost:5173
echo ========================================
echo.
pause

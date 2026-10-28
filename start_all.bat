@echo off
title EduInsight AI - System Launcher
echo ===================================================
echo           Starting EduInsight AI Platform
echo ===================================================
echo.

:: Get workspace directory
set "ROOT_DIR=%~dp0"

echo [1/3] Starting Flask Backend Server (Port 5000)...
start "EduInsight - Backend" cmd /k "cd /d "%ROOT_DIR%backend" && "%ROOT_DIR%venv\Scripts\python.exe" app.py"

echo [2/3] Starting Vite Frontend Server (Port 5173)...
start "EduInsight - Frontend" cmd /k "cd /d "%ROOT_DIR%frontend" && npm run dev"

echo [3/3] Opening Browser...
timeout /t 3 /nobreak >nul
start http://localhost:5173/

echo.
echo ===================================================
echo   Application started successfully!
echo   Frontend: http://localhost:5173/
echo   Backend:  http://127.0.0.1:5000/
echo ===================================================
echo Keep the backend and frontend terminal windows open.
pause

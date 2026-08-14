@echo off
echo Starting OMR Evaluator...
echo.

start "Backend - Uvicorn" cmd /k "cd /d %~dp0backend && .venv\Scripts\python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
start "Frontend - Next.js" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Both servers launched in separate windows.

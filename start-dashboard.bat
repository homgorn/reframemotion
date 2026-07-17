@echo off
setlocal

set "ROOT=%~dp0"
set "URL=http://127.0.0.1:8787/"
set "HEALTH=http://127.0.0.1:8787/api/health"

cd /d "%ROOT%"

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -UseBasicParsing '%HEALTH%' -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } } catch { exit 1 }"
if %ERRORLEVEL% EQU 0 (
  echo ReFrameMotion dashboard is already running.
  start "" "%URL%"
  exit /b 0
)

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo Node.js was not found in PATH. Install Node.js 22.16+ and run this file again.
  pause
  exit /b 1
)

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo npm was not found in PATH. Reinstall Node.js with npm enabled.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies with npm ci...
  call npm ci
  if %ERRORLEVEL% NEQ 0 (
    echo npm ci failed.
    pause
    exit /b 1
  )
)

echo Starting ReFrameMotion dashboard at %URL%
start "" "%URL%"
node apps/api/server.mjs

echo.
echo ReFrameMotion dashboard stopped.
pause

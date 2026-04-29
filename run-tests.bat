@echo off
setlocal

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not available on PATH.
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm is not installed or not available on PATH.
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 exit /b 1
)

echo Running regression tests...
set LOG_FILE=test-output.log
if exist %LOG_FILE% del %LOG_FILE%

call npm test > %LOG_FILE% 2>&1
type %LOG_FILE%
if errorlevel 1 exit /b 1

echo.
echo All tests passed.
endlocal
@echo off
setlocal

set "NODE_HOME=G:\Softwares\node-v24.15.0-win-x64"

if not exist "%NODE_HOME%\node.exe" (
  echo Node executable not found at %NODE_HOME%\node.exe
  exit /b 1
)

if not exist "%NODE_HOME%\npm.cmd" (
  echo npm executable not found at %NODE_HOME%\npm.cmd
  exit /b 1
)

set "PATH=%NODE_HOME%;%PATH%"

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
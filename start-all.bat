@echo off
REM Contact Manager - Start Frontend and Backend
REM This script starts both the Next.js frontend and Express backend servers

setlocal enabledelayedexpansion
set "NODE_HOME=G:\Softwares\node-v24.15.0-win-x64"

if not exist "%NODE_HOME%\node.exe" (
  echo Node executable not found at %NODE_HOME%\node.exe
  pause
  exit /b 1
)

if not exist "%NODE_HOME%\npm.cmd" (
  echo npm executable not found at %NODE_HOME%\npm.cmd
  pause
  exit /b 1
)

set "PATH=%NODE_HOME%;%PATH%"

REM Check for Node.js
where node >nul 2>nul
if errorlevel 1 (
  echo ❌ Node.js is not installed or not on PATH
  echo Please install Node.js from https://nodejs.org
  pause
  exit /b 1
)

REM Check for npm
where npm >nul 2>nul
if errorlevel 1 (
  echo ❌ npm is not installed or not on PATH
  pause
  exit /b 1
)

echo.
echo ========================================
echo  Contact Manager - Starting All Services
echo ========================================
echo.

REM Install frontend dependencies if needed
if not exist "node_modules" (
  echo 📦 Installing frontend dependencies...
  call npm install
  if errorlevel 1 (
    echo ❌ Failed to install frontend dependencies
    pause
    exit /b 1
  )
)

REM Install backend dependencies if needed
if not exist "src\backend\node_modules" (
  echo 📦 Installing backend dependencies...
  cd src\backend
  call npm install
  if errorlevel 1 (
    echo ❌ Failed to install backend dependencies
    cd ..\..\
    pause
    exit /b 1
  )
  cd ..\..\
)

REM Backend setup: Prisma generate + migration + seed
echo.
echo 🗄️ Running backend setup (Prisma generate + migrate + seed)...
cd src\backend

if not exist ".env" (
  echo ❌ Missing src\backend\.env file.
  echo    Create it and set DATABASE_URL before running this script.
  cd ..\..\
  pause
  exit /b 1
)

echo ⚙️ Generating Prisma client...
call npx prisma generate
if errorlevel 1 (
  echo ❌ Prisma client generation failed.
  cd ..\..\
  pause
  exit /b 1
)

if exist "prisma\migrations\" (
  echo 📦 Applying existing migrations...
  call npx prisma migrate deploy
) else (
  echo 🧱 Creating initial migration and applying it...
  call npx prisma migrate dev --name init
)

if errorlevel 1 (
  echo ❌ Prisma migration failed.
  echo    Check PostgreSQL status and DATABASE_URL in src\backend\.env
  cd ..\..\
  pause
  exit /b 1
)

if exist "prisma\seed.ts" (
  echo 🌱 Seeding database...
  call npx tsx prisma\seed.ts
  if errorlevel 1 (
    echo ❌ Database seed failed.
    cd ..\..\
    pause
    exit /b 1
  )
)

cd ..\..\

REM Start backend in a new window
echo 🚀 Starting backend server on http://localhost:3001...
start "Contact Manager Backend" cmd /k "set PATH=%NODE_HOME%;%%PATH%% && cd src\backend && npm run dev"
timeout /t 3 /nobreak

REM Start frontend in a new window
echo 🚀 Starting frontend server on http://localhost:3000...
start "Contact Manager Frontend" cmd /k "set PATH=%NODE_HOME%;%%PATH%% && npm run dev"
timeout /t 3 /nobreak

REM Open browser to app
echo.
echo ✅ Both servers are starting!
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:3001
echo.
echo 📌 A browser window should open shortly...
echo.

REM Try to open browser (optional)
start "" "http://localhost:3000"

echo ✨ All services started!
echo.
echo To stop the servers:
echo   - Close the "Contact Manager Frontend" window
echo   - Close the "Contact Manager Backend" window
echo.
echo 💡 Tips:
echo   - Backend takes ~2-3 seconds to start. Wait before refreshing the app.
echo   - Check Prisma Studio: In backend window, press Ctrl+C, then run "npm run prisma:studio"
echo   - If you see "Backend unavailable" messages, the backend hasn't started yet.
echo.
pause

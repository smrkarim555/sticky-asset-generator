@echo off
TITLE 4K Transparent PNG Gemini AI Studio
echo ========================================================
echo   Starting 4K Transparent PNG Gemini AI Studio...
echo ========================================================
echo.

echo Checking Node.js installation...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH!
    echo Please download and install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Installing dependencies (if needed)...
call npm install

echo Building application...
call npm run build

echo Starting studio server on http://localhost:3000 ...
start "" http://localhost:3000

call npm run start
pause

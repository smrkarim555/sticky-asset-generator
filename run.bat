@echo off
TITLE Diagonal Stage Spotlight Studio Launcher
cls
echo ===========================================================
echo   Diagonal Stage Spotlight Studio - Local PC Launcher
echo ===========================================================
echo.

REM Check if node_modules directory exists
if not exist "node_modules\" (
    echo [1/3] Installing required Node packages (npm install)...
    echo Please wait, this only happens on first run...
    call npm install
    echo.
)

REM Check Python dependencies
echo [2/3] Checking Python installation and dependencies...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Python is not installed or not in PATH.
    echo Please install Python 3.10+ to enable programmatic Python PNG generation.
) else (
    echo Installing Python dependencies from requirements.txt...
    python -m pip install -r requirements.txt
)
echo.

echo [3/3] Starting server and opening application...
echo Opening http://localhost:3000 in your web browser...

REM Wait 3 seconds to let server spin up, then open browser automatically
timeout /t 3 /nobreak >nul
start "" "http://localhost:3000"

REM Start the application
call npm run dev

pause

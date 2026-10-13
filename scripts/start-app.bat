@echo off
echo Starting FandF Application...
echo.

REM Navigate to the project root directory
cd /d "%~dp0.."

REM Check if node_modules exists
if not exist "node_modules\" (
    echo node_modules not found. Installing dependencies...
    call npm install
    echo.
)

REM Start the Next.js development server
echo Starting Next.js development server...
echo.
npm run dev

pause


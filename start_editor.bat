@echo off
setlocal
cd /d "%~dp0"
echo ===================================================
echo   GRIMGE UI-Editor
echo ===================================================

rem Own port, so the editor can run next to the game server (launch.bat, port 3000).
set PORT=3100
set "URL=http://localhost:%PORT%/editor.html"

rem Already running? Then just open the editor in the browser.
netstat -ano -p tcp | findstr /c:"0.0.0.0:%PORT% " >nul
if %errorlevel% equ 0 (
    echo Server laeuft bereits auf Port %PORT%.
    start "" "%URL%"
    exit /b 0
)

set NODE_EXE=node
where node >/dev/null 2>nul
if %errorlevel% neq 0 (
    if exist "%APPDATA%\Antigravity\bin\agy-node.cmd" (
        set "NODE_EXE=%APPDATA%\Antigravity\bin\agy-node.cmd"
    ) else (
        echo [FEHLER] Node.js nicht gefunden.
        pause
        exit /b 1
    )
)

echo Editor: %URL%
echo Speichern schreibt docs\ui_spec\ui_editor_spec.json und UI_EDITOR_SPEC.md
echo Fenster schliessen beendet den Server.
echo.
start "" "%URL%"
call %NODE_EXE% "%~dp0server.js"

@echo off
setlocal
echo ===================================================
echo   Starting GRIMGE Autonomous Playable Prototype
echo ===================================================

set NODE_EXE=node
where node >nul 2>nul
if %errorlevel% neq 0 (
    if exist "%APPDATA%\Antigravity\bin\agy-node.cmd" (
        set "NODE_EXE=%APPDATA%\Antigravity\bin\agy-node.cmd"
    ) else (
        echo [ERROR] Node.js not found in PATH or Antigravity bin.
        pause
        exit /b 1
    )
)

echo Found Node runtime: %NODE_EXE%
echo Starting server on http://localhost:3000 ...

start "" http://localhost:3000
call %NODE_EXE% "%~dp0server.js"

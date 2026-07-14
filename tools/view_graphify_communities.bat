@echo off
setlocal

set "GRAPHIFY=graphify"
where graphify >nul 2>nul
if errorlevel 1 set "GRAPHIFY=%USERPROFILE%\.local\bin\graphify.exe"

"%GRAPHIFY%" cluster-only "." --graph "graphify-out\graph.json" --no-label
if errorlevel 1 exit /b %errorlevel%

start "" "%~dp0..\graphify-out\graph.html"

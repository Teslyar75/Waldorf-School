@echo off
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"
echo Starting local preview on http://127.0.0.1:5180/
start "" "http://127.0.0.1:5180/"
npx --yes serve -l 5180 .

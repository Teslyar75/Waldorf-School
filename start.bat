@echo off
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"
if not exist "node_modules\" (
  echo Installing dependencies...
  call npm install
)
echo Starting CMS on http://127.0.0.1:5180/
echo Admin: http://127.0.0.1:5180/admin/  ^(admin / admin^)
start "" "http://127.0.0.1:5180/admin/"
node server/index.js

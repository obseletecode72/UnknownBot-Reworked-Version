@echo off
set "CURRENT_DIR=%~dp0"
cd /d "%CURRENT_DIR%"

npm install
node converter-para-exe.js
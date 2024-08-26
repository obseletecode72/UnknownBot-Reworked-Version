@echo off
set "CURRENT_DIR=%~dp0"
cd /d "%CURRENT_DIR%"

echo Instalando dependencias...
npm install
echo Instalacao principal finalizada...
echo Iniciando 2 parte
powershell -Command "Expand-Archive -Path 'node_modules.zip' -DestinationPath 'node_modules' -Force"
echo Convertendo...
node converter-para-exe.js
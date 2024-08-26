@echo off
set "CURRENT_DIR=%~dp0"
cd /d "%CURRENT_DIR%"

echo =============================
echo Selecione uma opcao:
echo 1 - Iniciar
echo 2 - Instalar
echo =============================
set /p choice="Digite o numero da opcao desejada: "

if "%choice%"=="1" (
    echo Iniciando aplicacao...
    npx electron index.js
) else if "%choice%"=="2" (
    echo Instalando dependencias...
    call npm install
	echo Instalacao principal finalizada...
	echo Iniciando 2 parte
	call powershell -Command "Expand-Archive -Path 'node_modules.zip' -DestinationPath 'node_modules' -Force"
) else (
    echo Opcao invalida. Saindo...
)

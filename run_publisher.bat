@echo off
chcp 65001 >nul
echo ========================================
echo Запуск publisher_multisite.py
echo ========================================
echo.

REM Переход в директорию скрипта
cd /d "%~dp0"

REM Активация виртуального окружения
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
) else (
    echo [WARN] Виртуальное окружение не найдено. Используется системный Python.
)

REM Запуск скрипта
python publisher_multisite.py

pause


@echo off
echo Создание ярлыка для автоматического обновления...

REM Создание ярлыка на рабочем столе
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $DesktopPath = [Environment]::GetFolderPath('Desktop'); $ShortcutPath = Join-Path $DesktopPath 'auto_update.lnk'; $Shortcut = $WshShell.CreateShortcut($ShortcutPath); $Shortcut.TargetPath = 'powershell.exe'; $Shortcut.Arguments = '-ExecutionPolicy Bypass -File \"C:\texts\auto_update.ps1\"'; $Shortcut.WorkingDirectory = 'C:\texts'; $Shortcut.Description = 'Автоматическое обновление из GitHub'; $Shortcut.Save(); Write-Host 'Ярлык создан на рабочем столе'"

REM Создание ярлыка в папке автозагрузки
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $StartupPath = [Environment]::GetFolderPath('Startup'); $StartupShortcutPath = Join-Path $StartupPath 'auto_update.lnk'; $StartupShortcut = $WshShell.CreateShortcut($StartupShortcutPath); $StartupShortcut.TargetPath = 'powershell.exe'; $StartupShortcut.Arguments = '-ExecutionPolicy Bypass -File \"C:\texts\auto_update.ps1\"'; $StartupShortcut.WorkingDirectory = 'C:\texts'; $StartupShortcut.Description = 'Автоматическое обновление из GitHub'; $StartupShortcut.Save(); Write-Host 'Ярлык создан в папке автозагрузки'"

echo.
echo Готово! Ярлыки созданы:
echo - На рабочем столе
echo - В папке автозагрузки (скрипт будет запускаться при старте Windows)
echo.
pause


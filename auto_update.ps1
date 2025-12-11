# Скрипт автоматического обновления из GitHub
# Установка кодировки UTF-8 для корректного отображения кириллицы
$PSDefaultParameterValues['*:Encoding'] = 'utf8'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$env:PYTHONIOENCODING = "utf-8"
chcp 65001 | Out-Null

$repoPath = "C:\texts"
$checkInterval = 60  # Проверка каждые 60 секунд
$lockFile = Join-Path $repoPath ".git_update.lock"  # Файл блокировки

# Очистка экрана и установка заголовка окна
Clear-Host
$Host.UI.RawUI.WindowTitle = "Auto Update from GitHub"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Auto Update from GitHub" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Path: $repoPath"
Write-Host "Check interval: $checkInterval seconds"
Write-Host "Press Ctrl+C to stop`n"

while ($true) {
    try {
        Set-Location $repoPath
        
        # Получить последний коммит из удаленного репозитория
        git fetch origin
        
        $localCommit = git rev-parse HEAD
        $remoteCommit = git rev-parse origin/main
        
        if ($localCommit -ne $remoteCommit) {
            # Проверить блокировку (чтобы не конфликтовать с webhook сервером)
            if (Test-Path $lockFile) {
                $lockTime = (Get-Item $lockFile).LastWriteTime
                $lockAge = (Get-Date) - $lockTime
                if ($lockAge.TotalSeconds -lt 300) {  # Блокировка действительна 5 минут
                    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Update in progress (lock file exists), skipping..." -ForegroundColor Yellow
                    Start-Sleep -Seconds $checkInterval
                    continue
                } else {
                    # Старая блокировка, удаляем
                    Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
                }
            }
            
            # Создать блокировку
            try {
                New-Item -Path $lockFile -ItemType File -Force | Out-Null
                Set-ItemProperty -Path $lockFile -Name IsReadOnly -Value $false
            } catch {
                Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Cannot create lock file, another process may be updating" -ForegroundColor Yellow
                Start-Sleep -Seconds $checkInterval
                continue
            }
            
            try {
                Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Changes detected in repository" -ForegroundColor Yellow
                Write-Host "Local commit:  $localCommit"
                Write-Host "Remote commit: $remoteCommit"
                
                # Создать резервную копию изменений (если есть)
                $hasChanges = git diff --quiet
                if (-not $hasChanges) {
                    Write-Host "Saving local changes..." -ForegroundColor Yellow
                    git stash save "Auto-backup before pull at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
                }
                
                # Обновить код
                Write-Host "Updating code..." -ForegroundColor Green
                git pull origin main
                
                Write-Host "Update completed successfully!`n" -ForegroundColor Green
            } finally {
                # Удалить блокировку
                Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
            }
        } else {
            Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] No changes" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds $checkInterval
}


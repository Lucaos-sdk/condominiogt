# Script de desenvolvimento para CondominioGT (PowerShell)
param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    } else {
        $input | Write-Output
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Log($message) {
    Write-ColorOutput Blue "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $message"
}

function Success($message) {
    Write-ColorOutput Green "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $message"
}

function Warning($message) {
    Write-ColorOutput Yellow "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $message"
}

function Show-Help {
    Write-Host "Uso: .\dev.ps1 [comando]"
    Write-Host ""
    Write-Host "Comandos disponíveis:"
    Write-Host "  start         - Inicia ambiente de desenvolvimento"
    Write-Host "  stop          - Para todos os containers"
    Write-Host "  restart       - Reinicia ambiente de desenvolvimento"
    Write-Host "  rebuild       - Reconstrói e reinicia containers"
    Write-Host "  logs          - Mostra logs de todos os serviços"
    Write-Host "  clean         - Limpa volumes e rebuilds completo"
    Write-Host "  help          - Mostra esta ajuda"
}

function Start-Dev {
    Log "Iniciando ambiente de desenvolvimento..."
    docker compose -f docker-compose.dev.yml up -d
    Success "Ambiente iniciado!"
    Write-Host ""
    Write-Host "🌐 Frontend: http://localhost:3000"
    Write-Host "🔧 Backend:  http://localhost:3001"
    Write-Host "📊 PhpMyAdmin: http://localhost:8080"
    Write-Host "📈 Redis Commander: http://localhost:8081"
}

function Stop-Dev {
    Log "Parando ambiente de desenvolvimento..."
    docker compose -f docker-compose.dev.yml down
    Success "Ambiente parado!"
}

function Restart-Dev {
    Log "Reiniciando ambiente de desenvolvimento..."
    docker compose -f docker-compose.dev.yml restart
    Success "Ambiente reiniciado!"
}

function Rebuild-Dev {
    Log "Reconstruindo containers..."
    docker compose -f docker-compose.dev.yml down
    docker compose -f docker-compose.dev.yml build --no-cache
    docker compose -f docker-compose.dev.yml up -d
    Success "Containers reconstruídos!"
}

function Show-Logs {
    Log "Mostrando logs (Ctrl+C para sair)..."
    docker compose -f docker-compose.dev.yml logs -f
}

function Clean-Dev {
    Warning "ATENÇÃO: Isso vai remover todos os dados dos volumes!"
    $response = Read-Host "Tem certeza? (s/N)"
    if ($response -eq "s" -or $response -eq "S") {
        Log "Limpando ambiente..."
        docker compose -f docker-compose.dev.yml down -v
        docker system prune -f
        docker compose -f docker-compose.dev.yml build --no-cache
        docker compose -f docker-compose.dev.yml up -d
        Success "Ambiente limpo e reconstruído!"
    } else {
        Log "Operação cancelada."
    }
}

switch ($Command.ToLower()) {
    "start" { Start-Dev }
    "stop" { Stop-Dev }
    "restart" { Restart-Dev }
    "rebuild" { Rebuild-Dev }
    "logs" { Show-Logs }
    "clean" { Clean-Dev }
    "help" { Show-Help }
    default { 
        Write-ColorOutput Red "Comando '$Command' não reconhecido."
        Show-Help 
    }
}
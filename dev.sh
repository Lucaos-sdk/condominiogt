#!/bin/bash

# Script de desenvolvimento para CondominioGT
# Uso: ./dev.sh [comando]

set -e  # Sair em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Função para mostrar ajuda
show_help() {
    echo "Uso: ./dev.sh [comando]"
    echo ""
    echo "Comandos disponíveis:"
    echo "  start         - Inicia ambiente de desenvolvimento"
    echo "  stop          - Para todos os containers"
    echo "  restart       - Reinicia ambiente de desenvolvimento"
    echo "  rebuild       - Reconstrói e reinicia containers"
    echo "  logs          - Mostra logs de todos os serviços"
    echo "  logs-backend  - Mostra logs apenas do backend"
    echo "  logs-frontend - Mostra logs apenas do frontend"
    echo "  clean         - Limpa volumes e rebuilds completo"
    echo "  shell-backend - Acessa shell do container backend"
    echo "  shell-frontend- Acessa shell do container frontend"
    echo "  db            - Acessa MySQL CLI"
    echo "  redis         - Acessa Redis CLI"
    echo "  help          - Mostra esta ajuda"
    echo ""
}

# Função para iniciar desenvolvimento
dev_start() {
    log "Iniciando ambiente de desenvolvimento..."
    docker compose -f docker-compose.dev.yml up -d
    success "Ambiente iniciado!"
    echo ""
    echo "🌐 Frontend: http://localhost:3000"
    echo "🔧 Backend:  http://localhost:3001"
    echo "📊 PhpMyAdmin: http://localhost:8080"
    echo "📈 Redis Commander: http://localhost:8081"
    echo ""
    echo "Para ver logs: ./dev.sh logs"
    echo "Para parar: ./dev.sh stop"
}

# Função para parar desenvolvimento
dev_stop() {
    log "Parando ambiente de desenvolvimento..."
    docker compose -f docker-compose.dev.yml down
    success "Ambiente parado!"
}

# Função para reiniciar desenvolvimento
dev_restart() {
    log "Reiniciando ambiente de desenvolvimento..."
    docker compose -f docker-compose.dev.yml restart
    success "Ambiente reiniciado!"
}

# Função para rebuild
dev_rebuild() {
    log "Reconstruindo containers..."
    docker compose -f docker-compose.dev.yml down
    docker compose -f docker-compose.dev.yml build --no-cache
    docker compose -f docker-compose.dev.yml up -d
    success "Containers reconstruídos e iniciados!"
}

# Função para limpeza completa
dev_clean() {
    warning "ATENÇÃO: Isso vai remover todos os dados dos volumes!"
    read -p "Tem certeza? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        log "Limpando ambiente..."
        docker compose -f docker-compose.dev.yml down -v
        docker system prune -f
        docker compose -f docker-compose.dev.yml build --no-cache
        docker compose -f docker-compose.dev.yml up -d
        success "Ambiente limpo e reconstruído!"
    else
        log "Operação cancelada."
    fi
}

# Função para logs
dev_logs() {
    log "Mostrando logs (Ctrl+C para sair)..."
    docker compose -f docker-compose.dev.yml logs -f
}

# Função para logs do backend
dev_logs_backend() {
    log "Mostrando logs do backend (Ctrl+C para sair)..."
    docker compose -f docker-compose.dev.yml logs -f backend
}

# Função para logs do frontend
dev_logs_frontend() {
    log "Mostrando logs do frontend (Ctrl+C para sair)..."
    docker compose -f docker-compose.dev.yml logs -f frontend
}

# Função para shell do backend
dev_shell_backend() {
    log "Acessando shell do backend..."
    docker compose -f docker-compose.dev.yml exec backend sh
}

# Função para shell do frontend
dev_shell_frontend() {
    log "Acessando shell do frontend..."
    docker compose -f docker-compose.dev.yml exec frontend sh
}

# Função para MySQL CLI
dev_db() {
    log "Acessando MySQL CLI..."
    docker compose -f docker-compose.dev.yml exec mysql mysql -u root -pcondominiogt123 condominiogt
}

# Função para Redis CLI
dev_redis() {
    log "Acessando Redis CLI..."
    docker compose -f docker-compose.dev.yml exec redis redis-cli
}

# Main
case "$1" in
    start)
        dev_start
        ;;
    stop)
        dev_stop
        ;;
    restart)
        dev_restart
        ;;
    rebuild)
        dev_rebuild
        ;;
    clean)
        dev_clean
        ;;
    logs)
        dev_logs
        ;;
    logs-backend)
        dev_logs_backend
        ;;
    logs-frontend)
        dev_logs_frontend
        ;;
    shell-backend)
        dev_shell_backend
        ;;
    shell-frontend)
        dev_shell_frontend
        ;;
    db)
        dev_db
        ;;
    redis)
        dev_redis
        ;;
    help|--help|-h)
        show_help
        ;;
    "")
        show_help
        ;;
    *)
        error "Comando '$1' não reconhecido."
        show_help
        exit 1
        ;;
esac
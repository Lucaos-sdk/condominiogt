#!/bin/bash

# ======================================
# CONDOMINIOGT - SCRIPT DE ROLLBACK
# Sistema de Gestão de Condomínios
# ======================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_NAME="condominiogt"
BACKUP_DIR="./database/backups"
LOG_DIR="./logs"
ROLLBACK_LOG="$LOG_DIR/rollback-$(date +%Y%m%d_%H%M%S).log"

# Funções auxiliares
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$ROLLBACK_LOG"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$ROLLBACK_LOG"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$ROLLBACK_LOG"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$ROLLBACK_LOG"
    exit 1
}

# Listar backups disponíveis
list_backups() {
    echo -e "${BLUE}Backups disponíveis:${NC}"
    ls -la "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | nl || {
        error "Nenhum backup encontrado em $BACKUP_DIR"
    }
}

# Selecionar backup para restore
select_backup() {
    echo ""
    echo "Digite o número do backup para restaurar (ou 'latest' para o mais recente):"
    read -r backup_choice
    
    if [ "$backup_choice" = "latest" ]; then
        SELECTED_BACKUP=$(ls -t "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | head -n1)
    else
        SELECTED_BACKUP=$(ls -t "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | sed -n "${backup_choice}p")
    fi
    
    if [ -z "$SELECTED_BACKUP" ]; then
        error "Backup selecionado não encontrado"
    fi
    
    log "Backup selecionado: $SELECTED_BACKUP"
}

# Parar serviços
stop_services() {
    log "Parando serviços..."
    docker-compose -f docker-compose.production.yml down
    success "Serviços parados"
}

# Restaurar banco de dados
restore_database() {
    log "Restaurando banco de dados do backup: $SELECTED_BACKUP"
    
    # Criar backup atual antes do rollback
    EMERGENCY_BACKUP="$BACKUP_DIR/emergency_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if docker ps | grep -q "${PROJECT_NAME}-mysql"; then
        log "Criando backup de emergência..."
        docker exec ${PROJECT_NAME}-mysql mysqldump \
            -u root -p$(grep MYSQL_ROOT_PASSWORD .env.production | cut -d '=' -f2) \
            --single-transaction \
            condominiogt > "$EMERGENCY_BACKUP"
        gzip "$EMERGENCY_BACKUP"
        success "Backup de emergência criado: ${EMERGENCY_BACKUP}.gz"
    fi
    
    # Restaurar do backup selecionado
    log "Iniciando restauração..."
    
    # Descomprimir backup temporariamente
    TEMP_BACKUP="/tmp/restore_$(date +%Y%m%d_%H%M%S).sql"
    gunzip -c "$SELECTED_BACKUP" > "$TEMP_BACKUP"
    
    # Iniciar apenas MySQL para restore
    docker-compose -f docker-compose.production.yml up -d mysql
    sleep 30
    
    # Restaurar dados
    docker exec -i ${PROJECT_NAME}-mysql mysql \
        -u root -p$(grep MYSQL_ROOT_PASSWORD .env.production | cut -d '=' -f2) \
        condominiogt < "$TEMP_BACKUP"
    
    # Limpar arquivo temporário
    rm "$TEMP_BACKUP"
    
    success "Banco de dados restaurado"
}

# Iniciar serviços
start_services() {
    log "Iniciando serviços após rollback..."
    docker-compose -f docker-compose.production.yml up -d
    success "Serviços iniciados"
}

# Verificar saúde após rollback
health_check() {
    log "Verificando saúde dos serviços após rollback..."
    
    sleep 60
    
    # Verificar backend
    for i in {1..20}; do
        if curl -f http://localhost:3001/health > /dev/null 2>&1; then
            success "Backend está funcionando"
            break
        fi
        
        if [ $i -eq 20 ]; then
            error "Backend não está respondendo após rollback"
        fi
        
        log "Aguardando backend... tentativa $i/20"
        sleep 10
    done
    
    # Verificar frontend
    for i in {1..10}; do
        if curl -f http://localhost > /dev/null 2>&1; then
            success "Frontend está funcionando"
            break
        fi
        
        if [ $i -eq 10 ]; then
            error "Frontend não está respondendo após rollback"
        fi
        
        log "Aguardando frontend... tentativa $i/10"
        sleep 10
    done
    
    success "Rollback concluído com sucesso"
}

# Função principal
main() {
    echo ""
    echo -e "${RED}======================================${NC}"
    echo -e "${RED}  CONDOMINIOGT - ROLLBACK SISTEMA    ${NC}"
    echo -e "${RED}======================================${NC}"
    echo ""
    
    # Confirmar rollback
    echo -e "${RED}ATENÇÃO:${NC} Este script irá fazer ROLLBACK do sistema"
    echo -e "${RED}CUIDADO:${NC} Dados atuais serão substituídos pelo backup"
    echo "Tem certeza que deseja continuar? (y/N)"
    read -r confirmation
    
    if [[ ! $confirmation =~ ^[Yy]$ ]]; then
        log "Rollback cancelado pelo usuário"
        exit 0
    fi
    
    # Criar diretório de logs se não existir
    mkdir -p "$LOG_DIR"
    
    # Verificar se existe arquivo de produção
    if [ ! -f ".env.production" ]; then
        error "Arquivo .env.production não encontrado"
    fi
    
    # Executar rollback
    list_backups
    select_backup
    stop_services
    restore_database
    start_services
    health_check
    
    echo ""
    success "🔄 Rollback concluído!"
    echo ""
    echo -e "${GREEN}Sistema restaurado para:${NC} $(basename "$SELECTED_BACKUP")"
    echo -e "${YELLOW}Log do rollback:${NC} $ROLLBACK_LOG"
    echo ""
}

# Tratamento de sinais
trap 'error "Rollback interrompido"' INT TERM

# Executar rollback
main "$@"
#!/bin/bash

# ======================================
# CONDOMINIOGT - SCRIPT DE DEPLOY
# Sistema de Gestão de Condomínios
# ======================================

set -e  # Exit on any error

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
PROJECT_NAME="condominiogt"
BACKUP_DIR="./database/backups"
LOG_DIR="./logs"
DEPLOY_LOG="$LOG_DIR/deploy-$(date +%Y%m%d_%H%M%S).log"

# Funções auxiliares
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$DEPLOY_LOG"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$DEPLOY_LOG"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$DEPLOY_LOG"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$DEPLOY_LOG"
    exit 1
}

# Criar diretórios necessários
create_directories() {
    log "Criando diretórios necessários..."
    mkdir -p "$LOG_DIR"
    mkdir -p "$BACKUP_DIR"
    mkdir -p "./nginx/logs"
    mkdir -p "./nginx/ssl"
    success "Diretórios criados"
}

# Verificar pré-requisitos
check_prerequisites() {
    log "Verificando pré-requisitos..."
    
    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        error "Docker não encontrado. Instale o Docker primeiro."
    fi
    
    # Verificar Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose não encontrado. Instale o Docker Compose primeiro."
    fi
    
    # Verificar arquivo .env
    if [ ! -f ".env.production" ]; then
        warning "Arquivo .env.production não encontrado"
        log "Copiando .env.production.example para .env.production"
        cp .env.production.example .env.production
        warning "IMPORTANTE: Configure as variáveis em .env.production antes de continuar"
        echo "Pressione ENTER após configurar o arquivo .env.production"
        read -r
    fi
    
    success "Pré-requisitos verificados"
}

# Fazer backup do banco de dados
backup_database() {
    log "Iniciando backup do banco de dados..."
    
    if docker ps | grep -q "${PROJECT_NAME}-mysql"; then
        BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
        
        docker exec ${PROJECT_NAME}-mysql mysqldump \
            -u root -p$(grep MYSQL_ROOT_PASSWORD .env.production | cut -d '=' -f2) \
            --single-transaction \
            --routines \
            --triggers \
            condominiogt > "$BACKUP_FILE"
        
        # Comprimir backup
        gzip "$BACKUP_FILE"
        success "Backup criado: ${BACKUP_FILE}.gz"
    else
        warning "Container MySQL não está rodando. Pulando backup."
    fi
}

# Parar serviços existentes
stop_services() {
    log "Parando serviços existentes..."
    
    if [ -f "docker-compose.yml" ]; then
        docker-compose down --remove-orphans || true
    fi
    
    if [ -f "docker-compose.production.yml" ]; then
        docker-compose -f docker-compose.production.yml down --remove-orphans || true
    fi
    
    success "Serviços parados"
}

# Construir imagens
build_images() {
    log "Construindo imagens Docker..."
    
    # Build backend
    log "Construindo imagem do backend..."
    docker-compose -f docker-compose.production.yml build --no-cache backend
    
    # Build frontend
    log "Construindo imagem do frontend..."
    docker-compose -f docker-compose.production.yml build --no-cache frontend
    
    success "Imagens construídas"
}

# Executar migrações
run_migrations() {
    log "Executando migrações do banco de dados..."
    
    # Aguardar MySQL estar pronto
    sleep 30
    
    # Executar migrações
    docker-compose -f docker-compose.production.yml exec -T backend npm run migrate:production || {
        warning "Erro nas migrações. Verificando se é primeira instalação..."
        # Se for primeira instalação, executar setup completo
        docker-compose -f docker-compose.production.yml exec -T backend npm run db:setup:production
    }
    
    success "Migrações executadas"
}

# Iniciar serviços
start_services() {
    log "Iniciando serviços em produção..."
    
    # Carregar variáveis de ambiente
    export $(cat .env.production | grep -v '^#' | xargs)
    
    # Iniciar serviços
    docker-compose -f docker-compose.production.yml up -d
    
    success "Serviços iniciados"
}

# Verificar saúde dos serviços
health_check() {
    log "Verificando saúde dos serviços..."
    
    # Aguardar serviços iniciarem
    sleep 60
    
    # Verificar backend
    for i in {1..30}; do
        if curl -f http://localhost:3001/health > /dev/null 2>&1; then
            success "Backend está saudável"
            break
        fi
        
        if [ $i -eq 30 ]; then
            error "Backend não está respondendo após 5 minutos"
        fi
        
        log "Aguardando backend... tentativa $i/30"
        sleep 10
    done
    
    # Verificar frontend
    for i in {1..15}; do
        if curl -f http://localhost > /dev/null 2>&1; then
            success "Frontend está saudável"
            break
        fi
        
        if [ $i -eq 15 ]; then
            error "Frontend não está respondendo após 2.5 minutos"
        fi
        
        log "Aguardando frontend... tentativa $i/15"
        sleep 10
    done
    
    success "Todos os serviços estão saudáveis"
}

# Cleanup de backups antigos
cleanup_backups() {
    log "Limpando backups antigos..."
    
    # Manter apenas os últimos 30 backups
    find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +30 -delete
    
    success "Limpeza de backups concluída"
}

# Mostrar status final
show_status() {
    log "Status final dos serviços:"
    docker-compose -f docker-compose.production.yml ps
    
    echo ""
    success "🚀 Deploy concluído com sucesso!"
    echo ""
    echo -e "${GREEN}Sistema CondominioGT está rodando em:${NC}"
    echo -e "${BLUE}Frontend:${NC} http://localhost"
    echo -e "${BLUE}Backend API:${NC} http://localhost/api"
    echo -e "${BLUE}Health Check:${NC} http://localhost/api/health"
    echo ""
    echo -e "${YELLOW}Logs de deploy salvos em:${NC} $DEPLOY_LOG"
    echo -e "${YELLOW}Para visualizar logs:${NC} docker-compose -f docker-compose.production.yml logs -f"
}

# Função principal
main() {
    echo ""
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}  CONDOMINIOGT - DEPLOY PRODUÇÃO     ${NC}"
    echo -e "${BLUE}======================================${NC}"
    echo ""
    
    # Confirmar deploy
    echo -e "${YELLOW}ATENÇÃO:${NC} Este script irá fazer deploy em PRODUÇÃO"
    echo "Tem certeza que deseja continuar? (y/N)"
    read -r confirmation
    
    if [[ ! $confirmation =~ ^[Yy]$ ]]; then
        log "Deploy cancelado pelo usuário"
        exit 0
    fi
    
    # Executar etapas do deploy
    create_directories
    check_prerequisites
    backup_database
    stop_services
    build_images
    start_services
    run_migrations
    health_check
    cleanup_backups
    show_status
}

# Tratamento de sinais para cleanup
trap 'error "Deploy interrompido"' INT TERM

# Executar deploy
main "$@"
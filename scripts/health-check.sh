#!/bin/bash

# ======================================
# CONDOMINIOGT - HEALTH CHECK SCRIPT
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

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar Docker
check_docker() {
    log "Verificando Docker..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker não está instalado"
        return 1
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker daemon não está rodando"
        return 1
    fi
    
    success "Docker está funcionando"
}

# Verificar Docker Compose
check_compose() {
    log "Verificando Docker Compose..."
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose não está instalado"
        return 1
    fi
    
    success "Docker Compose está disponível"
}

# Verificar containers
check_containers() {
    log "Verificando status dos containers..."
    
    local containers=("${PROJECT_NAME}-nginx" "${PROJECT_NAME}-backend" "${PROJECT_NAME}-frontend" "${PROJECT_NAME}-mysql" "${PROJECT_NAME}-redis")
    local all_running=true
    
    for container in "${containers[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "^$container$"; then
            success "Container $container está rodando"
        else
            error "Container $container não está rodando"
            all_running=false
        fi
    done
    
    if [ "$all_running" = false ]; then
        return 1
    fi
}

# Verificar health dos serviços
check_services_health() {
    log "Verificando saúde dos serviços..."
    
    # Backend Health Check
    log "Verificando backend..."
    for i in {1..10}; do
        if curl -f -s http://localhost/api/health > /dev/null 2>&1; then
            success "Backend está saudável"
            break
        fi
        
        if [ $i -eq 10 ]; then
            error "Backend não está respondendo"
            return 1
        fi
        
        sleep 2
    done
    
    # Frontend Check
    log "Verificando frontend..."
    for i in {1..5}; do
        if curl -f -s http://localhost > /dev/null 2>&1; then
            success "Frontend está acessível"
            break
        fi
        
        if [ $i -eq 5 ]; then
            error "Frontend não está acessível"
            return 1
        fi
        
        sleep 2
    done
}

# Verificar conectividade do banco
check_database() {
    log "Verificando banco de dados..."
    
    if [ ! -f ".env.production" ]; then
        warning "Arquivo .env.production não encontrado"
        return 1
    fi
    
    local db_password=$(grep MYSQL_ROOT_PASSWORD .env.production | cut -d '=' -f2)
    
    if docker exec ${PROJECT_NAME}-mysql mysqladmin -u root -p"$db_password" ping > /dev/null 2>&1; then
        success "MySQL está respondendo"
    else
        error "MySQL não está respondendo"
        return 1
    fi
    
    # Verificar conexões ativas
    local connections=$(docker exec ${PROJECT_NAME}-mysql mysql -u root -p"$db_password" -e "SHOW STATUS LIKE 'Threads_connected'" | tail -n1 | awk '{print $2}')
    log "Conexões ativas no MySQL: $connections"
}

# Verificar Redis
check_redis() {
    log "Verificando Redis..."
    
    if docker exec ${PROJECT_NAME}-redis redis-cli ping > /dev/null 2>&1; then
        success "Redis está respondendo"
    else
        error "Redis não está respondendo"
        return 1
    fi
    
    # Verificar memória usada
    local memory=$(docker exec ${PROJECT_NAME}-redis redis-cli info memory | grep used_memory_human | cut -d ':' -f2 | tr -d '\r\n')
    log "Memória usada pelo Redis: $memory"
}

# Verificar uso de recursos
check_resources() {
    log "Verificando uso de recursos..."
    
    # Espaço em disco
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    log "Uso de disco: ${disk_usage}%"
    
    if [ "$disk_usage" -gt 80 ]; then
        warning "Uso de disco alto: ${disk_usage}%"
    else
        success "Uso de disco normal: ${disk_usage}%"
    fi
    
    # Memória
    local memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    log "Uso de memória: ${memory_usage}%"
    
    if [ "$memory_usage" -gt 80 ]; then
        warning "Uso de memória alto: ${memory_usage}%"
    else
        success "Uso de memória normal: ${memory_usage}%"
    fi
}

# Verificar logs por erros
check_logs() {
    log "Verificando logs por erros recentes..."
    
    local error_count=0
    
    # Verificar logs dos últimos 5 minutos
    if docker-compose -f docker-compose.production.yml logs --since=5m 2>/dev/null | grep -i error > /dev/null; then
        error_count=$(docker-compose -f docker-compose.production.yml logs --since=5m 2>/dev/null | grep -i error | wc -l)
        warning "Encontrados $error_count erros nos logs recentes"
    else
        success "Nenhum erro encontrado nos logs recentes"
    fi
}

# Verificar conectividade externa
check_external_connectivity() {
    log "Verificando conectividade externa..."
    
    # Testar conectividade com Google
    if curl -s --max-time 5 http://google.com > /dev/null; then
        success "Conectividade externa OK"
    else
        warning "Possível problema de conectividade externa"
    fi
}

# Verificar backups
check_backups() {
    log "Verificando backups..."
    
    local backup_dir="./database/backups"
    
    if [ -d "$backup_dir" ]; then
        local backup_count=$(find "$backup_dir" -name "*.sql.gz" -mtime -7 | wc -l)
        
        if [ "$backup_count" -gt 0 ]; then
            success "Encontrados $backup_count backups na última semana"
        else
            warning "Nenhum backup recente encontrado"
        fi
    else
        warning "Diretório de backup não encontrado"
    fi
}

# Verificar configurações de segurança
check_security() {
    log "Verificando configurações de segurança..."
    
    # Verificar se senhas padrão foram alteradas
    if grep -q "CHANGE_THIS" .env.production 2>/dev/null; then
        error "Senhas padrão detectadas no .env.production"
        return 1
    else
        success "Configurações de segurança OK"
    fi
    
    # Verificar se JWT secrets estão configurados
    if grep -q "JWT_SECRET=" .env.production && [ "$(grep JWT_SECRET= .env.production | cut -d '=' -f2 | wc -c)" -gt 32 ]; then
        success "JWT secrets configurados adequadamente"
    else
        warning "JWT secrets podem estar fracos"
    fi
}

# Função principal
main() {
    echo ""
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}  CONDOMINIOGT - HEALTH CHECK        ${NC}"
    echo -e "${BLUE}======================================${NC}"
    echo ""
    
    local checks_passed=0
    local total_checks=10
    
    # Executar verificações
    check_docker && ((checks_passed++))
    check_compose && ((checks_passed++))
    check_containers && ((checks_passed++))
    check_services_health && ((checks_passed++))
    check_database && ((checks_passed++))
    check_redis && ((checks_passed++))
    check_resources && ((checks_passed++))
    check_logs && ((checks_passed++))
    check_external_connectivity && ((checks_passed++))
    check_backups && ((checks_passed++))
    
    echo ""
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}  RESULTADO DO HEALTH CHECK          ${NC}"
    echo -e "${BLUE}======================================${NC}"
    
    local percentage=$((checks_passed * 100 / total_checks))
    
    if [ $checks_passed -eq $total_checks ]; then
        success "Todos os checks passaram! ($checks_passed/$total_checks - $percentage%)"
        echo -e "${GREEN}🎉 Sistema está 100% saudável!${NC}"
    elif [ $percentage -ge 80 ]; then
        warning "Sistema majoritariamente saudável ($checks_passed/$total_checks - $percentage%)"
        echo -e "${YELLOW}⚠️  Algumas verificações falharam. Verifique os logs acima.${NC}"
    else
        error "Sistema com problemas sérios ($checks_passed/$total_checks - $percentage%)"
        echo -e "${RED}🚨 Ação imediata necessária!${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}URLs de Acesso:${NC}"
    echo -e "${GREEN}Frontend:${NC} http://localhost"
    echo -e "${GREEN}API:${NC} http://localhost/api"
    echo -e "${GREEN}Health Check:${NC} http://localhost/api/health"
    echo ""
}

# Executar health check
main "$@"
#!/bin/bash

# Setup para Ubuntu - CondominioGT
# Verifica e instala dependências necessárias

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[SETUP]${NC} $1"; }
success() { echo -e "${GREEN}[SETUP]${NC} $1"; }
warning() { echo -e "${YELLOW}[SETUP]${NC} $1"; }
error() { echo -e "${RED}[SETUP]${NC} $1"; }

log "🐧 Configurando ambiente Ubuntu para CondominioGT..."

# Verificar se está no Ubuntu
if ! grep -q "Ubuntu" /etc/os-release; then
    warning "Este script foi feito para Ubuntu, mas pode funcionar em outras distros."
fi

# Verificar Docker
if ! command -v docker &> /dev/null; then
    error "Docker não está instalado!"
    log "Instalando Docker..."
    
    # Atualizar repositórios
    sudo apt-get update
    
    # Instalar dependências
    sudo apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # Adicionar chave oficial do Docker
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Adicionar repositório
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Instalar Docker
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Adicionar usuário ao grupo docker
    sudo usermod -aG docker $USER
    
    success "Docker instalado! REINICIE o terminal ou faça logout/login."
else
    success "Docker já está instalado."
fi

# Verificar Docker Compose
if ! docker compose version &> /dev/null; then
    error "Docker Compose não está instalado ou não é a versão nova!"
    log "Por favor, atualize para Docker Compose v2 (comando: docker compose)"
else
    success "Docker Compose v2 disponível."
fi

# Verificar Node.js local (opcional para desenvolvimento híbrido)
if ! command -v node &> /dev/null; then
    warning "Node.js não está instalado localmente."
    log "Isso não é obrigatório, mas útil para desenvolvimento híbrido."
    log "Para instalar: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
else
    success "Node.js local disponível: $(node --version)"
fi

# Verificar curl
if ! command -v curl &> /dev/null; then
    log "Instalando curl..."
    sudo apt-get install -y curl
fi

# Verificar git
if ! command -v git &> /dev/null; then
    log "Instalando git..."
    sudo apt-get install -y git
fi

# Verificar permissões do script de desenvolvimento
if [ -f "./dev.sh" ]; then
    if [ ! -x "./dev.sh" ]; then
        log "Dando permissão de execução ao dev.sh..."
        chmod +x ./dev.sh
    fi
    success "Script dev.sh pronto para uso."
else
    warning "Script dev.sh não encontrado no diretório atual."
fi

# Verificar grupo docker
if groups $USER | grep -q docker; then
    success "Usuário $USER está no grupo docker."
else
    warning "Usuário $USER NÃO está no grupo docker."
    log "Execute: sudo usermod -aG docker $USER"
    log "Depois reinicie o terminal ou faça logout/login."
fi

# Testar Docker
log "Testando Docker..."
if docker run hello-world &> /dev/null; then
    success "Docker funcionando perfeitamente!"
else
    error "Docker não está funcionando. Verifique se o serviço está rodando:"
    log "sudo systemctl start docker"
    log "sudo systemctl enable docker"
fi

log "🎯 Criando aliases úteis para seu .bashrc..."

# Backup do .bashrc
cp ~/.bashrc ~/.bashrc.backup.$(date +%Y%m%d_%H%M%S)

# Adicionar aliases se não existirem
cat >> ~/.bashrc << 'EOF'

# CondominioGT Development Aliases
alias devstart='./dev.sh start'
alias devstop='./dev.sh stop'
alias devlogs='./dev.sh logs'
alias devrestart='./dev.sh restart'
alias devrebuild='./dev.sh rebuild'
alias devclean='./dev.sh clean'

# Docker shortcuts
alias dps='docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'
alias dlogs='docker logs -f'
alias dstats='docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"'

# Quick development function
devdebug() {
    echo "=== 🐳 Containers ==="
    docker ps --format "table {{.Names}}\t{{.Status}}"
    echo -e "\n=== 📋 Últimos Logs ==="
    if [ -f "./dev.sh" ]; then
        ./dev.sh logs --tail=10
    else
        echo "dev.sh não encontrado"
    fi
    echo -e "\n=== 💾 Uso de Recursos ==="
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
}

# Function para portas ocupadas
checkports() {
    echo "=== 🔍 Verificando Portas ==="
    echo "Porto 3000 (Frontend):"
    lsof -i :3000 || echo "  Livre"
    echo "Porto 3001 (Backend):"
    lsof -i :3001 || echo "  Livre"
    echo "Porto 3306 (MySQL):"
    lsof -i :3306 || echo "  Livre"
}

# Function para limpeza rápida
devcleanall() {
    echo "🧹 Limpeza completa do ambiente..."
    docker system prune -f
    docker volume prune -f
    echo "✅ Limpeza concluída!"
}
EOF

success "Aliases adicionados ao ~/.bashrc"
log "Execute 'source ~/.bashrc' ou abra um novo terminal para usar os aliases."

echo ""
success "🎉 Setup Ubuntu concluído!"
echo ""
log "📋 Próximos passos:"
log "1. source ~/.bashrc  # ou abra novo terminal"
log "2. ./dev.sh start    # iniciar desenvolvimento"
log "3. code .            # abrir VS Code"
echo ""
log "🔧 Aliases disponíveis:"
log "  devstart, devstop, devlogs, devrestart, devrebuild, devclean"
log "  devdebug, checkports, devcleanall"
echo ""
log "📖 Para mais detalhes: cat GUIA_DESENVOLVIMENTO.md"
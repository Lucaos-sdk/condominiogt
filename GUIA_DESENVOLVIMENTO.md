# 🚀 Guia Completo de Desenvolvimento - CondominioGT

## 📋 Índice
1. [Configuração Inicial](#configuração-inicial)
2. [Workflows de Desenvolvimento](#workflows-de-desenvolvimento)
3. [Comandos Essenciais](#comandos-essenciais)
4. [Debugging e Logs](#debugging-e-logs)
5. [Troubleshooting](#troubleshooting)
6. [Boas Práticas](#boas-práticas)
7. [Performance e Otimização](#performance-e-otimização)

---

## 🔧 Configuração Inicial

### **Primeira Vez - Setup Completo**

```bash
# 1. Parar ambiente atual se estiver rodando
docker compose down

# 2. Limpar containers antigos (opcional)
docker system prune -f

# 3. Iniciar ambiente de desenvolvimento
./dev.sh start

# Aguardar containers subirem (30-60s)
# ✅ Frontend: http://localhost:3000
# ✅ Backend: http://localhost:3001  
# ✅ PhpMyAdmin: http://localhost:8080
# ✅ Redis Commander: http://localhost:8081
```

### **Verificação de Saúde**
```bash
# Ver status dos containers
docker ps

# Testar APIs
curl http://localhost:3001/api/health
curl http://localhost:3000

# Ver logs iniciais
./dev.sh logs
```

---

## 🔄 Workflows de Desenvolvimento

### **Workflow 1: Desenvolvimento Padrão (Hot Reload)**

**🎯 Melhor para:** Desenvolvimento diário, mudanças em código

```bash
# 1. Iniciar ambiente
./dev.sh start

# 2. Fazer suas mudanças no código
# ✨ Frontend: Mudanças aparecem automaticamente
# ✨ Backend: Nodemon reinicia automaticamente

# 3. Ver logs em tempo real
./dev.sh logs-frontend  # ou logs-backend

# 4. Para parar no final do dia
./dev.sh stop
```

### **Workflow 2: Desenvolvimento com Rebuild (Dependências)**

**🎯 Melhor para:** Quando instalar novos packages

```bash
# 1. Para ambiente atual
./dev.sh stop

# 2. Rebuild containers
./dev.sh rebuild

# 3. Aguardar build completo
# 4. Containers sobem automaticamente
```

### **Workflow 3: Limpeza Completa (Reset)**

**🎯 Melhor para:** Quando algo der muito errado

```bash
# ⚠️ ATENÇÃO: Remove todos os dados
./dev.sh clean

# Confirmar com 's' quando perguntado
# Aguardar rebuild completo
```

---

## 🎮 Comandos Essenciais

### **Comandos do Script de Desenvolvimento**

| Comando | Descrição | Quando Usar |
|---------|-----------|-------------|
| `./dev.sh start` | Inicia ambiente completo | Início do desenvolvimento |
| `./dev.sh stop` | Para todos os containers | Final do dia/semana |
| `./dev.sh restart` | Reinicia sem rebuild | Após mudança de config |
| `./dev.sh rebuild` | Reconstrói containers | Novos packages/dependências |
| `./dev.sh clean` | Reset completo | Quando tudo der errado |
| `./dev.sh logs` | Logs de todos serviços | Debug geral |
| `./dev.sh logs-backend` | Logs só do backend | Debug API |
| `./dev.sh logs-frontend` | Logs só do frontend | Debug React |

### **Comandos Docker Diretos (Alternativa)**

```bash
# Desenvolvimento
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml logs -f
docker compose -f docker-compose.dev.yml restart frontend
docker compose -f docker-compose.dev.yml down

# Produção
docker compose up -d
docker compose logs -f
docker compose down
```

### **Comandos de Acesso aos Containers**

```bash
# Shell do backend
./dev.sh shell-backend
# ou
docker compose -f docker-compose.dev.yml exec backend sh

# Shell do frontend
./dev.sh shell-frontend
# ou
docker compose -f docker-compose.dev.yml exec frontend sh

# MySQL CLI
./dev.sh db
# ou
docker compose -f docker-compose.dev.yml exec mysql mysql -u root -pcondominiogt123

# Redis CLI
./dev.sh redis
# ou
docker compose -f docker-compose.dev.yml exec redis redis-cli
```

---

## 🐛 Debugging e Logs

### **Estratégias de Debug**

#### **1. Logs Estruturados**
```bash
# Ver logs em tempo real
./dev.sh logs

# Filtrar logs por serviço
./dev.sh logs-backend | grep ERROR
./dev.sh logs-frontend | grep Warning

# Salvar logs em arquivo
./dev.sh logs > debug.log 2>&1
```

#### **2. Debug do Backend (Node.js)**
```bash
# O backend já está configurado com debug na porta 9229
# No VS Code:
# 1. Ir em Run and Debug (Ctrl+Shift+D)
# 2. Criar launch.json:
```

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Docker Backend Debug",
      "address": "localhost",
      "port": 9229,
      "localRoot": "${workspaceFolder}/backend",
      "remoteRoot": "/app",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

#### **3. Debug do Frontend (React)**
```bash
# React DevTools já funcionam automaticamente
# Chrome/Firefox: Instalar React Developer Tools
# Logs no browser console: F12 > Console
```

### **Análise de Performance**

```bash
# Ver uso de recursos
docker stats

# Ver espaço em disco
docker system df

# Limpar cache desnecessário
docker system prune
```

---

## 🚨 Troubleshooting

### **Problemas Comuns e Soluções**

#### **1. Port já em uso**
```bash
# Erro: Port 3000/3001 already in use
# Solução:
sudo lsof -t -i tcp:3000 | xargs kill -9
sudo lsof -t -i tcp:3001 | xargs kill -9

# Ou mudar porta no docker-compose.dev.yml
```

#### **2. Frontend não atualiza (Hot reload não funciona)**
```bash
# Solução 1: Restart frontend
docker compose -f docker-compose.dev.yml restart frontend

# Solução 2: Verificar variáveis de ambiente
# No docker-compose.dev.yml deve ter:
# - CHOKIDAR_USEPOLLING=true
# - WATCHPACK_POLLING=true
```

#### **3. Backend não reinicia automaticamente**
```bash
# Verificar se nodemon está rodando
./dev.sh logs-backend | grep nodemon

# Se não, rebuild:
./dev.sh rebuild
```

#### **4. Erro de permissão (Linux)**
```bash
# Dar permissão ao script
chmod +x dev.sh

# Problemas de ownership
sudo chown -R $USER:$USER .
```

#### **5. Node_modules corrompido**
```bash
# Limpeza completa
./dev.sh clean

# Ou manual:
rm -rf frontend/node_modules backend/node_modules
./dev.sh rebuild
```

#### **6. Database connection failed**
```bash
# Aguardar MySQL inicializar (pode levar 30-60s)
./dev.sh logs | grep mysql

# Verificar se MySQL está rodando
docker ps | grep mysql

# Reset database
./dev.sh clean
```

### **Diagnóstico Rápido**

```bash
# Checklist de verificação
echo "=== DIAGNÓSTICO RÁPIDO ==="
echo "1. Containers rodando:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo -e "\n2. Portas disponíveis:"
curl -f http://localhost:3000 >/dev/null 2>&1 && echo "✅ Frontend (3000)" || echo "❌ Frontend (3000)"
curl -f http://localhost:3001 >/dev/null 2>&1 && echo "✅ Backend (3001)" || echo "❌ Backend (3001)"

echo -e "\n3. Volumes:"
docker volume ls | grep condominiogt

echo -e "\n4. Logs recentes (últimas 5 linhas):"
./dev.sh logs --tail=5
```

---

## ⭐ Boas Práticas

### **Estrutura de Desenvolvimento**

#### **1. Organização de Branches**
```bash
# Git flow recomendado
git checkout main
git pull origin main
git checkout -b feature/nova-funcionalidade

# Desenvolver com hot reload ativo
./dev.sh start

# Commit frequente
git add .
git commit -m "feat: adiciona nova funcionalidade"

# Push e PR
git push origin feature/nova-funcionalidade
```

#### **2. Testes Durante Desenvolvimento**
```bash
# Backend - Testes automáticos
./dev.sh shell-backend
npm test

# Frontend - Testes automáticos
./dev.sh shell-frontend
npm test

# Linting automático (já configurado no hot reload)
```

#### **3. Monitoramento Contínuo**
```bash
# Terminal 1: Logs
./dev.sh logs

# Terminal 2: Desenvolvimento
code .

# Terminal 3: Comandos ad-hoc
./dev.sh shell-backend
```

### **Performance Tips**

#### **1. Otimização de Docker**
```bash
# .dockerignore já configurado
# Usar multi-stage builds (já implementado)
# Volumes para node_modules (já configurado)

# Verificar uso de recursos
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

#### **2. Desenvolvimento Eficiente**
```bash
# Usar hot reload inteligente
# Frontend: Salvar arquivos ativa rebuild automático
# Backend: Nodemon detecta mudanças em .js

# Evitar rebuild desnecessário
# Use ./dev.sh restart em vez de rebuild para configs
# Use ./dev.sh rebuild apenas para dependências novas
```

---

## 🚀 Performance e Otimização

### **Benchmarks e Métricas**

```bash
# Tempo de startup
time ./dev.sh start

# Uso de memória
docker stats --no-stream

# Tamanho das imagens
docker images | grep condominiogt

# Velocidade do hot reload (teste manual)
# 1. Fazer mudança no código
# 2. Cronometrar até ver mudança no browser
```

### **Otimizações Avançadas**

#### **1. Para Máquinas com Pouca RAM**
```yaml
# No docker-compose.dev.yml, adicionar limites:
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
  frontend:
    deploy:
      resources:
        limits:
          memory: 512M
```

#### **2. Para Desenvolvimento Offline**
```bash
# Fazer cache das imagens
docker save condominiogt-frontend-dev > frontend-dev.tar
docker save condominiogt-backend-dev > backend-dev.tar

# Restaurar cache
docker load < frontend-dev.tar
docker load < backend-dev.tar
```

#### **3. Desenvolvimento Híbrido (Parte Local)**
```bash
# Opção 1: Só database em Docker
docker compose -f docker-compose.dev.yml up mysql redis -d

# Backend local
cd backend && npm run dev

# Frontend local  
cd frontend && npm start

# Opção 2: Só backend em Docker
docker compose -f docker-compose.dev.yml up backend mysql redis -d

# Frontend local (mais rápido)
cd frontend && npm start
```

---

## 📚 Comandos de Referência Rápida

### **Comandos Mais Usados**
```bash
# Início do dia
./dev.sh start && ./dev.sh logs

# Durante desenvolvimento
# (apenas fazer mudanças no código - hot reload automático)

# Instalar nova dependência
./dev.sh stop
cd frontend && npm install nova-lib
./dev.sh rebuild

# Debug específico
./dev.sh logs-backend | grep ERROR

# Fim do dia
./dev.sh stop
```

### **Atalhos Úteis**

Adicione ao seu `.bashrc` ou `.zshrc`:

```bash
# Aliases para desenvolvimento
alias devstart='./dev.sh start'
alias devstop='./dev.sh stop'
alias devlogs='./dev.sh logs'
alias devrestart='./dev.sh restart'
alias devclean='./dev.sh clean'

# Função para quick debug
devdebug() {
    echo "=== Status dos Containers ==="
    docker ps --format "table {{.Names}}\t{{.Status}}"
    echo -e "\n=== Últimos Logs ==="
    ./dev.sh logs --tail=10
}
```

---

## 🎯 Próximos Passos

1. **Configurar IDE** - VS Code com extensões Docker, React, Node.js
2. **Configurar Git Hooks** - Pre-commit hooks para linting
3. **CI/CD Pipeline** - GitHub Actions para testes automáticos
4. **Monitoring** - Adicionar métricas de performance
5. **Testes E2E** - Cypress ou Playwright para testes end-to-end

---

**🎉 Pronto! Agora você tem um ambiente de desenvolvimento profissional e eficiente!**

Para dúvidas ou problemas, consulte a seção de Troubleshooting ou execute `./dev.sh help`.
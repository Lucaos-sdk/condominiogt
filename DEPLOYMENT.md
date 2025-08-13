# 🚀 GUIA DE DEPLOY - CONDOMINIOGT

## Sistema de Gestão de Condomínios - Versão 1.0.0

**Data de Criação:** 2025-07-29  
**Última Atualização:** 2025-07-29  
**Versão do Guia:** 1.0  

---

## 📋 ÍNDICE

1. [Pré-requisitos](#-pré-requisitos)
2. [Configuração Inicial](#-configuração-inicial)
3. [Deploy em Produção](#-deploy-em-produção)
4. [Configuração SSL/HTTPS](#-configuração-sslhttps)
5. [Monitoramento e Logs](#-monitoramento-e-logs)
6. [Backup e Restore](#-backup-e-restore)
7. [Troubleshooting](#-troubleshooting)
8. [Manutenção](#-manutenção)

---

## 🔧 PRÉ-REQUISITOS

### Sistema Operacional
- **Ubuntu 20.04 LTS+** (recomendado)
- **CentOS 8+** ou **RHEL 8+**
- **Debian 11+**

### Software Necessário
```bash
# Docker Engine (versão 20.10+)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Docker Compose (versão 2.0+)
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Recursos de Hardware Mínimos
- **CPU:** 2 cores
- **RAM:** 4GB
- **Armazenamento:** 50GB SSD
- **Rede:** 100Mbps

### Recursos Recomendados para Produção
- **CPU:** 4+ cores
- **RAM:** 8GB+
- **Armazenamento:** 100GB+ SSD
- **Rede:** 1Gbps

---

## ⚙️ CONFIGURAÇÃO INICIAL

### 1. Download do Projeto
```bash
# Clone ou extraia o projeto
cd /opt
sudo git clone <repository-url> condominiogt
cd condominiogt

# Ou descompacte o arquivo
sudo tar -xzf condominiogt-v1.0.0.tar.gz
cd condominiogt
```

### 2. Configuração de Ambiente
```bash
# Copie o arquivo de exemplo
cp .env.production.example .env.production

# Edite as configurações
sudo nano .env.production
```

### 3. Configurações Críticas (arquivo .env.production)

#### 🔒 SEGURANÇA (OBRIGATÓRIO ALTERAR)
```bash
# Gere senhas fortes
DB_PASSWORD="CHANGE_THIS_STRONG_PASSWORD_123!"
MYSQL_ROOT_PASSWORD="CHANGE_THIS_ROOT_PASSWORD_456!"
REDIS_PASSWORD="CHANGE_THIS_REDIS_PASSWORD_789!"

# Gere secrets JWT (use: openssl rand -base64 64)
JWT_SECRET="sua-chave-jwt-super-secreta-com-no-minimo-32-caracteres"
JWT_REFRESH_SECRET="sua-chave-refresh-super-secreta-com-no-minimo-32-caracteres"
```

#### 📧 EMAIL SMTP
```bash
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
EMAIL_USER="admin@suaempresa.com"
EMAIL_PASS="sua-senha-de-app"
```

#### 🌐 DOMÍNIO
```bash
DOMAIN_NAME="seudominio.com.br"
FRONTEND_URL="https://seudominio.com.br"
REACT_APP_API_URL="https://seudominio.com.br/api"
CORS_ORIGIN="https://seudominio.com.br"
```

### 4. Configuração de Permissões
```bash
# Definir proprietário
sudo chown -R $USER:$USER /opt/condominiogt

# Tornar scripts executáveis
chmod +x scripts/*.sh

# Criar diretórios necessários
mkdir -p logs database/backups nginx/ssl
```

---

## 🚀 DEPLOY EM PRODUÇÃO

### 1. Deploy Automatizado (Recomendado)
```bash
# Execute o script de deploy
./scripts/deploy.sh
```

O script irá:
- ✅ Verificar pré-requisitos
- ✅ Fazer backup do banco atual
- ✅ Construir imagens Docker otimizadas
- ✅ Executar migrações de banco
- ✅ Iniciar todos os serviços
- ✅ Verificar saúde do sistema
- ✅ Exibir URLs de acesso

### 2. Deploy Manual
```bash
# 1. Parar serviços existentes
docker-compose -f docker-compose.production.yml down

# 2. Construir imagens
docker-compose -f docker-compose.production.yml build --no-cache

# 3. Iniciar serviços
docker-compose -f docker-compose.production.yml up -d

# 4. Verificar status
docker-compose -f docker-compose.production.yml ps
```

### 3. Verificação de Deploy
```bash
# Health check do backend
curl http://localhost/api/health

# Verificar logs
docker-compose -f docker-compose.production.yml logs -f
```

---

## 🔐 CONFIGURAÇÃO SSL/HTTPS

### 1. Certificado SSL (Let's Encrypt)
```bash
# Instalar Certbot
sudo apt update
sudo apt install certbot

# Gerar certificado
sudo certbot certonly --standalone -d seudominio.com.br

# Copiar certificados
sudo cp /etc/letsencrypt/live/seudominio.com.br/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/seudominio.com.br/privkey.pem nginx/ssl/private.key
```

### 2. Ativação HTTPS
```bash
# Editar configuração do Nginx
nano nginx/sites-available/condominiogt

# Descomentar seção HTTPS e comentar HTTP
# Reiniciar Nginx
docker-compose -f docker-compose.production.yml restart nginx
```

### 3. Renovação Automática SSL
```bash
# Adicionar ao crontab
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

---

## 📊 MONITORAMENTO E LOGS

### 1. Visualizar Logs
```bash
# Todos os serviços
docker-compose -f docker-compose.production.yml logs -f

# Serviço específico
docker-compose -f docker-compose.production.yml logs -f backend
docker-compose -f docker-compose.production.yml logs -f frontend
docker-compose -f docker-compose.production.yml logs -f mysql
```

### 2. Logs da Aplicação
```bash
# Logs do backend (dentro do container)
docker exec -it condominiogt-backend tail -f /app/logs/application-$(date +%Y-%m-%d).log

# Logs de auditoria
docker exec -it condominiogt-backend tail -f /app/logs/audit-$(date +%Y-%m-%d).log

# Logs de segurança
docker exec -it condominiogt-backend tail -f /app/logs/security-$(date +%Y-%m-%d).log
```

### 3. Monitoramento de Recursos
```bash
# Status dos containers
docker stats

# Uso de disco
df -h

# Memoria e CPU
htop
```

---

## 💾 BACKUP E RESTORE

### 1. Backup Automático
O sistema inclui backup automático configurado para:
- **Frequência:** Diário às 02:00
- **Retenção:** 30 dias
- **Local:** `./database/backups/`

### 2. Backup Manual
```bash
# Criar backup manual
docker exec condominiogt-mysql mysqldump \
  -u root -p$(grep MYSQL_ROOT_PASSWORD .env.production | cut -d '=' -f2) \
  --single-transaction \
  --routines \
  --triggers \
  condominiogt > backup_$(date +%Y%m%d_%H%M%S).sql

# Comprimir backup
gzip backup_$(date +%Y%m%d_%H%M%S).sql
```

### 3. Restore (Rollback)
```bash
# Usando script automático
./scripts/rollback.sh

# Ou manual
gunzip -c backup_file.sql.gz | docker exec -i condominiogt-mysql mysql \
  -u root -p$(grep MYSQL_ROOT_PASSWORD .env.production | cut -d '=' -f2) \
  condominiogt
```

---

## 🔧 TROUBLESHOOTING

### Problemas Comuns

#### 1. Serviços Não Iniciam
```bash
# Verificar logs de erro
docker-compose -f docker-compose.production.yml logs

# Verificar espaço em disco
df -h

# Verificar portas em uso
netstat -tulpn | grep :80
netstat -tulpn | grep :443
```

#### 2. Banco de Dados Não Conecta
```bash
# Verificar status do MySQL
docker-compose -f docker-compose.production.yml exec mysql mysqladmin -u root -p status

# Verificar configurações
grep DB_ .env.production

# Logs do MySQL
docker-compose -f docker-compose.production.yml logs mysql
```

#### 3. Frontend Não Carrega
```bash
# Verificar build do frontend
docker-compose -f docker-compose.production.yml logs frontend

# Verificar Nginx
docker-compose -f docker-compose.production.yml logs nginx

# Testar conectividade
curl -I http://localhost
```

#### 4. SSL/HTTPS Problemas
```bash
# Verificar certificados
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Testar SSL
openssl s_client -connect seudominio.com.br:443

# Logs do Nginx
docker-compose -f docker-compose.production.yml logs nginx
```

### Comandos de Diagnóstico
```bash
# Status completo do sistema
./scripts/health-check.sh

# Limpar recursos Docker
docker system prune -a

# Reiniciar todos os serviços
docker-compose -f docker-compose.production.yml restart
```

---

## 🛠️ MANUTENÇÃO

### 1. Atualizações de Segurança
```bash
# Atualizar sistema base
sudo apt update && sudo apt upgrade -y

# Atualizar Docker
sudo apt update docker-ce docker-ce-cli containerd.io

# Reiniciar serviços
docker-compose -f docker-compose.production.yml restart
```

### 2. Limpeza de Logs
```bash
# Limpar logs antigos (>30 dias)
find logs/ -name "*.log" -mtime +30 -delete

# Limpar backups antigos (>30 dias)
find database/backups/ -name "*.sql.gz" -mtime +30 -delete

# Limpar logs do Docker
docker system prune -f
```

### 3. Monitoramento de Performance
```bash
# Verificar uso de memória MySQL
docker exec condominiogt-mysql mysql -u root -p -e "SHOW STATUS LIKE 'Innodb_buffer_pool_pages_%'"

# Verificar conexões ativas
docker exec condominiogt-mysql mysql -u root -p -e "SHOW PROCESSLIST"

# Verificar cache Redis
docker exec condominiogt-redis redis-cli info memory
```

### 4. Backup de Configurações
```bash
# Fazer backup de configurações importantes
tar -czvf config-backup-$(date +%Y%m%d).tar.gz \
  .env.production \
  nginx/ \
  redis/ \
  database/mysql.conf
```

---

## 📞 SUPORTE

### Informações do Sistema
- **Versão:** CondominioGT v1.0.0
- **Stack:** Node.js, React, MySQL, Redis, Nginx
- **Arquitetura:** Docker Containers

### Logs Importantes
- **Deploy:** `logs/deploy-YYYYMMDD_HHMMSS.log`
- **Aplicação:** `logs/application-YYYY-MM-DD.log`
- **Auditoria:** `logs/audit-YYYY-MM-DD.log`
- **Segurança:** `logs/security-YYYY-MM-DD.log`

### URLs de Acesso
- **Frontend:** `https://seudominio.com.br`
- **API:** `https://seudominio.com.br/api`
- **Health Check:** `https://seudominio.com.br/api/health`

---

## 🎯 CHECKLIST PÓS-DEPLOY

- [ ] Sistema acessível via browser
- [ ] Login funcionando
- [ ] APIs respondendo
- [ ] WebSocket conectado
- [ ] Email funcionando
- [ ] Backup configurado
- [ ] SSL ativo (se aplicável)
- [ ] Logs sendo gerados
- [ ] Monitoramento ativo
- [ ] Documentação atualizada

---

**✅ Sistema CondominioGT pronto para produção!**

Para suporte adicional, consulte os logs do sistema ou entre em contato com a equipe técnica.
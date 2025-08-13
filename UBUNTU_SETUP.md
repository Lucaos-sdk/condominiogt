# 🐧 Guia Ubuntu - CondominioGT

## 🚀 Setup Inicial Ubuntu

### **1. Setup Automático (Recomendado)**
```bash
# Execute o script de setup
./setup-ubuntu.sh

# Recarregue o terminal
source ~/.bashrc
# ou abra um novo terminal
```

### **2. Setup Manual (se preferir)**

#### **Instalar Docker (se não tiver)**
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Reiniciar sessão (logout/login ou reboot)
```

#### **Instalar Node.js (opcional - para desenvolvimento híbrido)**
```bash
# Instalar Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node --version
npm --version
```

#### **Dependências Extras**
```bash
# Utilitários úteis
sudo apt install -y curl git lsof htop tree jq

# VS Code (se não tiver)
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -o root -g root -m 644 packages.microsoft.gpg /etc/apt/trusted.gpg.d/
sudo sh -c 'echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/trusted.gpg.d/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" > /etc/apt/sources.list.d/vscode.list'
sudo apt update
sudo apt install code
```

---

## 🔧 Configurações Ubuntu

### **Aliases do Terminal (.bashrc)**

Já incluídos no setup automático:

```bash
# Desenvolvimento
alias devstart='./dev.sh start'
alias devstop='./dev.sh stop'
alias devlogs='./dev.sh logs'
alias devrestart='./dev.sh restart'
alias devrebuild='./dev.sh rebuild'
alias devclean='./dev.sh clean'

# Docker
alias dps='docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'
alias dlogs='docker logs -f'
alias dstats='docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"'

# Funções úteis
devdebug      # Diagnóstico completo
checkports    # Verificar portas 3000, 3001, 3306
devcleanall   # Limpeza completa do Docker
```

### **Permissões e Segurança**

```bash
# Verificar se usuário está no grupo docker
groups $USER | grep docker

# Se não estiver, adicionar:
sudo usermod -aG docker $USER
# Depois fazer logout/login

# Dar permissão aos scripts
chmod +x dev.sh setup-ubuntu.sh
```

---

## 🚨 Problemas Comuns Ubuntu

### **1. Docker Permission Denied**
```bash
# Erro: permission denied while trying to connect to Docker daemon
# Solução:
sudo usermod -aG docker $USER
# IMPORTANTE: Fazer logout/login ou reboot
```

### **2. Portas Ocupadas**
```bash
# Verificar o que está usando as portas
sudo lsof -i :3000    # Frontend
sudo lsof -i :3001    # Backend
sudo lsof -i :3306    # MySQL

# Matar processo se necessário
sudo kill -9 $(sudo lsof -t -i:3000)
```

### **3. Docker não inicia automaticamente**
```bash
# Habilitar Docker para iniciar com o sistema
sudo systemctl enable docker
sudo systemctl start docker

# Verificar status
sudo systemctl status docker
```

### **4. Problemas de DNS em containers**
```bash
# Se containers não conseguem acessar internet
# Reiniciar Docker
sudo systemctl restart docker

# Ou reconfigurar DNS
sudo nano /etc/docker/daemon.json
# Adicionar:
{
  "dns": ["8.8.8.8", "8.8.4.4"]
}
```

### **5. Espaço em disco insuficiente**
```bash
# Limpar Docker
docker system prune -af
docker volume prune -f

# Ver uso de espaço
docker system df

# Limpar logs antigos
sudo find /var/lib/docker/containers/ -name "*.log" -delete
```

### **6. Container muito lento**
```bash
# Verificar uso de recursos
htop
docker stats

# Se necessário, aumentar limite de memória para Docker
# Sistema → Configurações → Docker Desktop → Resources
```

---

## ⚡ Otimizações Ubuntu

### **1. Performance**
```bash
# Aumentar inotify watches (para hot reload)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Configurar swappiness para melhor performance
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

### **2. Atalhos de Teclado**
Adicione no seu ambiente desktop:

- `Ctrl+Alt+T` - Terminal
- `Ctrl+Alt+C` - VS Code
- `Super+D` - Docker Desktop (se instalado)

### **3. Configuração do Terminal**
```bash
# Instalar Zsh + Oh My Zsh (opcional)
sudo apt install zsh
sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# Plugins úteis para desenvolvimento
# ~/.zshrc:
plugins=(git docker docker-compose npm node)
```

---

## 🔍 Comandos de Diagnóstico Ubuntu

```bash
# Status geral do sistema
devdebug                    # Função customizada
htop                       # Processos e recursos
df -h                      # Espaço em disco
free -h                    # Memória RAM

# Docker específico
docker system df           # Uso de espaço Docker
docker system events       # Events em tempo real
dstats                     # Stats dos containers (alias)

# Rede
ss -tuln | grep :300      # Verificar portas 3000-3006
netstat -tlnp | grep docker  # Portas do Docker

# Logs do sistema
journalctl -u docker.service --since today  # Logs do Docker
tail -f /var/log/syslog | grep docker      # Logs sistema
```

---

## 📋 Checklist Ubuntu

### **Antes de começar:**
- [ ] Docker instalado e funcionando
- [ ] Usuário no grupo docker  
- [ ] Scripts com permissão de execução
- [ ] Portas 3000, 3001, 3306 livres
- [ ] Pelo menos 4GB RAM livre
- [ ] Pelo menos 10GB espaço disco

### **Setup inicial:**
- [ ] `./setup-ubuntu.sh` executado
- [ ] `source ~/.bashrc` ou novo terminal
- [ ] `devstart` funcionando
- [ ] VS Code com extensões instaladas

### **Desenvolvimento diário:**
- [ ] `devstart` - iniciar
- [ ] Fazer mudanças no código
- [ ] Ver hot reload funcionando
- [ ] `devstop` - parar no final

---

## 🎯 Comandos Ubuntu Específicos

```bash
# Monitoramento
watch -n 2 'docker stats --no-stream'  # Stats contínuo
iotop                                   # I/O disk
nethogs                                 # Uso de rede por processo

# Limpeza
sudo apt autoremove -y                  # Pacotes não usados
sudo apt autoclean                      # Cache de pacotes
bleachbit                               # Limpeza GUI (opcional)

# Backup rápido
tar -czf backup-$(date +%Y%m%d).tar.gz \
    frontend/src backend/src docker-compose*.yml

# Logs específicos Ubuntu
journalctl -f                           # Logs sistema tempo real
dmesg | tail                            # Mensagens kernel
```

---

**🐧 Pronto para desenvolvimento no Ubuntu!** 

Execute `./setup-ubuntu.sh` e depois `devstart` para começar!
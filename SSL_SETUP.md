# 🔐 CONFIGURAÇÃO SSL/HTTPS - CONDOMINIOGT

## Guia Completo para Certificados SSL

**Data de Criação:** 2025-07-29  
**Status:** Pronto para implementação  

---

## 📋 VISÃO GERAL

O sistema CondominioGT já está configurado para HTTPS, mas requer certificados SSL válidos. Este guia apresenta 3 opções para obter certificados SSL gratuitos ou comerciais.

---

## 🚀 OPÇÃO 1: LET'S ENCRYPT (RECOMENDADO - GRATUITO)

### Pré-requisitos
- Domínio válido apontando para o servidor
- Porta 80 aberta para validação
- Certbot instalado

### Instalação do Certbot
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot

# CentOS/RHEL
sudo yum install epel-release
sudo yum install certbot
```

### Gerando Certificado
```bash
# Parar nginx temporariamente
sudo systemctl stop nginx

# Gerar certificado (substitua seu-dominio.com)
sudo certbot certonly --standalone -d seu-dominio.com.br

# Ou para múltiplos domínios
sudo certbot certonly --standalone -d seu-dominio.com.br -d www.seu-dominio.com.br
```

### Copiando Certificados
```bash
# Copiar para o diretório do projeto
sudo cp /etc/letsencrypt/live/seu-dominio.com.br/fullchain.pem /home/ti-semdes/Documentos/Condominiogt/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/seu-dominio.com.br/privkey.pem /home/ti-semdes/Documentos/Condominiogt/nginx/ssl/private.key

# Ajustar permissões
sudo chown $USER:$USER /home/ti-semdes/Documentos/Condominiogt/nginx/ssl/*.pem
sudo chown $USER:$USER /home/ti-semdes/Documentos/Condominiogt/nginx/ssl/*.key
sudo chmod 644 /home/ti-semdes/Documentos/Condominiogt/nginx/ssl/cert.pem
sudo chmod 600 /home/ti-semdes/Documentos/Condominiogt/nginx/ssl/private.key
```

### Renovação Automática
```bash
# Adicionar ao crontab
echo "0 12 * * * /usr/bin/certbot renew --quiet --deploy-hook 'docker-compose -f /home/ti-semdes/Documentos/Condominiogt/docker-compose.production.yml restart nginx'" | sudo crontab -
```

---

## 🏢 OPÇÃO 2: CERTIFICADO COMERCIAL (PAGO)

### Fornecedores Recomendados
- **DigiCert** - Certificados premium
- **Comodo/Sectigo** - Boa relação custo-benefício
- **GeoTrust** - Certificados intermediários
- **RapidSSL** - Certificados básicos

### Gerando CSR (Certificate Signing Request)
```bash
# Gerar chave privada
openssl genrsa -out private.key 2048

# Gerar CSR
openssl req -new -key private.key -out certificate.csr

# Informações necessárias:
# Country Name: BR
# State: Seu Estado
# City: Sua Cidade
# Organization Name: Nome da Empresa
# Organizational Unit: TI/Desenvolvimento
# Common Name: seu-dominio.com.br
# Email Address: admin@seu-dominio.com.br
```

### Instalando Certificado Comercial
```bash
# Após receber o certificado da CA, combine com intermediários
cat seu-certificado.crt intermediarios.crt > fullchain.pem

# Copiar para o projeto
cp fullchain.pem /home/ti-semdes/Documentos/Condominiogt/nginx/ssl/cert.pem
cp private.key /home/ti-semdes/Documentos/Condominiogt/nginx/ssl/private.key

# Ajustar permissões
chmod 644 /home/ti-semdes/Documentos/Condominiogt/nginx/ssl/cert.pem
chmod 600 /home/ti-semdes/Documentos/Condominiogt/nginx/ssl/private.key
```

---

## 🧪 OPÇÃO 3: CERTIFICADO AUTO-ASSINADO (DESENVOLVIMENTO)

⚠️ **ATENÇÃO**: Apenas para desenvolvimento/testes. Navegadores mostrarão aviso de segurança.

```bash
# Gerar certificado auto-assinado válido por 365 dias
openssl req -x509 -newkey rsa:2048 -keyout private.key -out cert.pem -days 365 -nodes

# Mover para diretório do projeto
mv cert.pem /home/ti-semdes/Documentos/Condominiogt/nginx/ssl/
mv private.key /home/ti-semdes/Documentos/Condominiogt/nginx/ssl/

# Ajustar permissões
chmod 644 /home/ti-semdes/Documentos/Condominiogt/nginx/ssl/cert.pem
chmod 600 /home/ti-semdes/Documentos/Condominiogt/nginx/ssl/private.key
```

---

## ⚙️ CONFIGURAÇÃO FINAL

### 1. Atualizar .env.production
```bash
# Editar arquivo de ambiente
nano /home/ti-semdes/Documentos/Condominiogt/.env.production

# Configurar domínio real
DOMAIN_NAME=seu-dominio.com.br
FRONTEND_URL=https://seu-dominio.com.br
REACT_APP_API_URL=https://seu-dominio.com.br/api
CORS_ORIGIN=https://seu-dominio.com.br
```

### 2. Verificar Certificados
```bash
# Verificar validade do certificado
openssl x509 -in /home/ti-semdes/Documentos/Condominiogt/nginx/ssl/cert.pem -text -noout

# Verificar se certificado e chave combinam
openssl x509 -noout -modulus -in /home/ti-semdes/Documentos/Condominiogt/nginx/ssl/cert.pem | openssl md5
openssl rsa -noout -modulus -in /home/ti-semdes/Documentos/Condominiogt/nginx/ssl/private.key | openssl md5
```

### 3. Testar SSL
```bash
# Reiniciar sistema com SSL
cd /home/ti-semdes/Documentos/Condominiogt
./scripts/deploy.sh

# Testar conexão SSL
openssl s_client -connect seu-dominio.com.br:443

# Verificar redirecionamento HTTP para HTTPS
curl -I http://seu-dominio.com.br
```

---

## 🔍 TROUBLESHOOTING

### Erro: "SSL certificate problem"
```bash
# Verificar se arquivo existe
ls -la /home/ti-semdes/Documentos/Condominiogt/nginx/ssl/

# Verificar permissões
ls -la /home/ti-semdes/Documentos/Condominiogt/nginx/ssl/

# Verificar logs do Nginx
docker-compose -f docker-compose.production.yml logs nginx
```

### Erro: "Certificate not found"
```bash
# Criar diretório se não existir
mkdir -p /home/ti-semdes/Documentos/Condominiogt/nginx/ssl/

# Verificar se Docker consegue acessar
docker-compose -f docker-compose.production.yml exec nginx ls -la /etc/nginx/ssl/
```

### Erro: "Mixed content"
```bash
# Verificar se todas as URLs usam HTTPS
grep -r "http://" frontend/src/

# Atualizar variáveis de ambiente
# Garantir que REACT_APP_API_URL usa https://
```

---

## 📚 RECURSOS ADICIONAIS

### Ferramentas de Teste SSL
- **SSL Server Test**: https://www.ssllabs.com/ssltest/
- **SSL Checker**: https://www.sslshopper.com/ssl-checker.html
- **Mozilla SSL Configuration Generator**: https://ssl-config.mozilla.org/

### Monitoramento de Certificados
```bash
# Script para verificar expiração (adicionar ao cron)
#!/bin/bash
CERT_FILE="/home/ti-semdes/Documentos/Condominiogt/nginx/ssl/cert.pem"
EXPIRY_DATE=$(openssl x509 -enddate -noout -in $CERT_FILE | cut -d= -f2)
EXPIRY_TIMESTAMP=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_TIMESTAMP=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_TIMESTAMP - $CURRENT_TIMESTAMP) / 86400 ))

if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
    echo "AVISO: Certificado SSL expira em $DAYS_UNTIL_EXPIRY dias!"
fi
```

---

## ✅ CHECKLIST PÓS-INSTALAÇÃO

- [ ] Certificados SSL instalados corretamente
- [ ] Domínio configurado no .env.production
- [ ] Redirecionamento HTTP → HTTPS funcionando
- [ ] Navegador não mostra avisos de segurança
- [ ] Teste SSL obtém nota A ou A+
- [ ] Renovação automática configurada (Let's Encrypt)
- [ ] Backup dos certificados realizado
- [ ] Monitoramento de expiração ativo

---

**🎯 SISTEMA HTTPS PRONTO PARA PRODUÇÃO!**

Após seguir este guia, o CondominioGT estará executando com SSL/TLS seguro e todas as comunicações estarão criptografadas.
# 🚀 CondominioGT - Desenvolvimento

## 🐧 Setup Ubuntu (Primeira Vez)

```bash
# 1. Setup automático para Ubuntu
./setup-ubuntu.sh

# 2. Recarregar terminal
source ~/.bashrc

# 3. Iniciar desenvolvimento
devstart  # ou ./dev.sh start
```

## ⚡ Início Rápido (Uso Diário)

```bash
# 1. Iniciar ambiente de desenvolvimento
devstart    # ou ./dev.sh start

# 2. Abrir VS Code
code .

# 3. Acessar aplicação
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
# PhpMyAdmin: http://localhost:8080
```

## 🔄 Comandos Diários

| Situação | Comando | Descrição |
|----------|---------|-----------|
| 🌅 Início | `./dev.sh start` | Inicia ambiente completo |
| 👀 Debug | `./dev.sh logs` | Ver logs em tempo real |
| 🔄 Reiniciar | `./dev.sh restart` | Após mudança de config |
| 📦 Nova lib | `./dev.sh rebuild` | Após instalar dependências |
| 🌙 Final | `./dev.sh stop` | Para ambiente |

## 🐛 Problemas?

```bash
# Diagnóstico rápido
docker ps                    # Ver containers
./dev.sh logs --tail=20     # Ver últimos logs  
./dev.sh clean              # Reset completo (⚠️ remove dados)
```

## 📚 Documentação Completa

Veja [GUIA_DESENVOLVIMENTO.md](./GUIA_DESENVOLVIMENTO.md) para documentação completa.

## 🎯 Hot Reload

- ✅ **Frontend**: Mudanças em arquivos `.js/.jsx/.css` são aplicadas automaticamente
- ✅ **Backend**: Mudanças em arquivos `.js` reiniciam o servidor automaticamente
- ✅ **Database**: Persiste dados entre restarts

## 🔧 VS Code Setup

1. Instale extensões recomendadas (popup automático)
2. Configure debug: `F5` para backend, `Ctrl+Shift+D` para frontend
3. Formatação automática ao salvar já configurada

---

**Happy Coding! 🎉**
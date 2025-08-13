# 🔔 WebSocket API - Sistema de Notificações em Tempo Real

## 📡 Conexão WebSocket

**URL:** `ws://localhost:3001`  
**Autenticação:** JWT Token obrigatório  
**Protocolo:** Socket.io v4.7.4

### Autenticação
```javascript
const token = 'your-jwt-token';
const socket = io('http://localhost:3001', {
  auth: { token }
});
```

## 📥 Eventos que o Cliente PODE EMITIR

### 1. `get_online_users`
**Descrição:** Listar usuários online por condomínio  
**Parâmetros:**
```javascript
socket.emit('get_online_users', condominiumId);
```
**Resposta:** `online_users`

### 2. `mark_notification_read`
**Descrição:** Marcar notificação como lida  
**Parâmetros:**
```javascript
socket.emit('mark_notification_read', {
  communicationId: 123,
  notificationType: 'new_communication' // opcional
});
```
**Resposta:** `notification_read_confirmed`

### 3. `filter_notifications`
**Descrição:** Aplicar filtros avançados às notificações  
**Parâmetros:**
```javascript
socket.emit('filter_notifications', {
  type: 'announcement',           // opcional
  status: 'published',           // opcional
  priority: 'high',              // opcional
  condominiumId: 1,              // opcional
  dateFrom: '2025-01-01',        // opcional
  dateTo: '2025-12-31',          // opcional
  onlyUnread: true,              // opcional
  targetAudience: 'all',         // opcional
  authorId: 5                    // opcional
});
```
**Resposta:** `notifications_filtered`

## 📤 Eventos que o Cliente PODE RECEBER

### 1. `connection_status`
**Descrição:** Status da conexão WebSocket  
**Dados:**
```javascript
{
  success: true,
  message: "Conectado ao sistema de notificações",
  user: {
    id: 1,
    name: "João Silva",
    role: "admin",
    email: "joao@email.com"
  },
  timestamp: "2025-07-23T15:15:52.929Z"
}
```

### 2. `communication_notification`
**Descrição:** Notificação de comunicação (nova/editada/curtida)  
**Tipos:**
- `new_communication`
- `updated_communication`
- `communication_liked`
- `deleted_communication`

**Dados:**
```javascript
{
  type: "new_communication",
  communication: {
    id: 123,
    title: "Reunião de Condomínio",
    content: "Convocação para assembleia...",
    communication_type: "assembly",
    priority: "high",
    status: "published",
    target_audience: "all",
    publish_date: "2025-07-23T15:00:00Z",
    expire_date: "2025-08-23T15:00:00Z",
    condominium_id: 1,
    author: {
      id: 5,
      name: "Administrador"
    }
  },
  timestamp: "2025-07-23T15:15:52.929Z",
  message: "Nova comunicação: Reunião de Condomínio"
}
```

### 3. `system_notification`
**Descrição:** Notificações do sistema  
**Dados:**
```javascript
{
  type: "system_notification",
  message: "Sistema será atualizado às 02:00",
  priority: "medium",
  timestamp: "2025-07-23T15:15:52.929Z",
  condominium_id: 1
}
```

### 4. `online_users`
**Descrição:** Lista de usuários online  
**Dados:**
```javascript
{
  condominiumId: 1,
  users: [
    {
      id: 1,
      name: "João Silva",
      role: "admin"
    },
    {
      id: 2,
      name: "Maria Santos",
      role: "resident"
    }
  ]
}
```

### 5. `notification_read_confirmed`
**Descrição:** Confirmação de notificação lida  
**Dados:**
```javascript
{
  communicationId: 123,
  notificationType: "new_communication",
  userId: 1,
  readAt: "2025-07-23T15:15:52.929Z",
  timestamp: "2025-07-23T15:15:52.929Z",
  message: "Notificação marcada como lida"
}
```

### 6. `notifications_filtered`
**Descrição:** Resultado dos filtros aplicados  
**Dados:**
```javascript
{
  communications: [
    {
      id: 123,
      title: "Reunião de Condomínio",
      type: "assembly",
      priority: "high",
      status: "published",
      target_audience: "all",
      created_at: "2025-07-23T15:00:00Z",
      author: {
        id: 5,
        name: "Administrador",
        role: "admin"
      },
      is_read: false
    }
  ],
  count: 1,
  filters: {
    type: "assembly",
    priority: "high",
    onlyUnread: true
  },
  message: "Filtros aplicados com sucesso",
  timestamp: "2025-07-23T15:15:52.929Z"
}
```

### 7. `error`
**Descrição:** Erros do WebSocket  
**Dados:**
```javascript
{
  message: "Token inválido"
}
```

## 🏠 Sistema de Rooms

### Automático por Condomínio
- Usuários são automaticamente adicionados às rooms dos seus condomínios
- Room pattern: `condominium_{id}`
- Room pessoal: `user_{id}`

### Notificações Direcionadas
- **all:** Todos os usuários do condomínio
- **owners:** Apenas proprietários
- **tenants:** Apenas inquilinos  
- **managers:** Apenas gestores e administradores
- **specific_units:** Unidades específicas

## 🔐 Autenticação e Segurança

### JWT Token
- Token obrigatório na conexão
- Validação automática de usuário
- Acesso controlado por condomínio
- Logs detalhados de conexões

### Middleware de Segurança
- Verificação de token JWT
- Carregamento de dados do usuário
- Controle de acesso por condomínio
- Rate limiting (herdado do Express)

## 📊 Logs e Debugging

### Logs Automáticos
- Conexões/desconexões
- Notificações enviadas
- Filtros aplicados
- Notificações lidas
- Erros de autenticação

### Exemplo de Log
```
🔌 User João Silva (ID: 1) connected to WebSocket
👥 User João Silva joined room: condominium_1
📢 New communication notification sent: Reunião de Condomínio
📖 User João Silva marked notification as read: {communicationId: 123}
🔌 User João Silva (ID: 1) disconnected
```

## 🧪 Teste de Conexão

```javascript
// Frontend - Exemplo básico
const socket = io('http://localhost:3001', {
  auth: { token: 'your-jwt-token' }
});

socket.on('connect', () => {
  console.log('Conectado ao WebSocket!');
});

socket.on('connection_status', (data) => {
  console.log('Status:', data);
});

socket.on('communication_notification', (notification) => {
  console.log('Nova notificação:', notification);
});

// Marcar como lida
socket.emit('mark_notification_read', {
  communicationId: 123
});

// Aplicar filtros
socket.emit('filter_notifications', {
  onlyUnread: true,
  priority: 'high'
});
```

---

✅ **Sistema 100% funcional e integrado ao backend CondominioGT!**
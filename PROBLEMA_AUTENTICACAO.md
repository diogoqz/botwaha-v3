# 🚨 Problema de Autenticação - WAHA API

## ❌ Erro Identificado

```
Status: 401 - Unauthorized
Data: { message: 'Unauthorized', statusCode: 401 }
```

## 🔍 Análise do Problema

### **Causa Raiz**
A WAHA API está retornando erro 401 (Unauthorized), indicando que:
1. **Falta de autenticação** na requisição
2. **API Key inválida** ou não configurada
3. **Sessão não autorizada** ou expirada

### **URL da WAHA API**
```
https://api-waha2.9i6fnq.easypanel.host/api/ibra-grupo/messages/text
```

### **Requisição Atual**
```json
{
  "chatId": "120363422447143322@g.us",
  "text": "📝 Olá! Vejo que você enviou 2 imagem(ns)...",
  "mentions": ["556392437559@c.us"]
}
```

## 🔧 Soluções Implementadas

### 1. **Configuração de API Key**
```javascript
// config.js
waha: {
  apiUrl: 'https://api-waha2.9i6fnq.easypanel.host',
  session: 'ibra-grupo',
  apiKey: null // Configure se necessário
}
```

### 2. **Headers de Autenticação**
```javascript
const headers = {
  'Content-Type': 'application/json'
};

if (WAHA_API_KEY) {
  headers['Authorization'] = `Bearer ${WAHA_API_KEY}`;
}
```

## 🎯 Próximos Passos

### **Opção 1: Configurar API Key** ✅
1. ✅ API Key configurada: `102030`
2. ✅ Configurado no `config.js`
3. ❌ Ainda retorna 401 Unauthorized

### **Testes Realizados:**
```bash
# Teste 1: Bearer Token
curl -H "Authorization: Bearer 102030" → 401 Unauthorized

# Teste 2: Basic Auth
curl -u "102030:" → 401 Unauthorized

# Teste 3: Sem autenticação
curl → 401 Unauthorized
```

### **Opção 2: Verificar Sessão**
1. Verificar se a sessão `ibra-grupo` está ativa
2. Verificar se a sessão tem permissões para enviar mensagens

### **Opção 3: Testar Conectividade**
```bash
# Testar se a API está acessível
curl -X GET https://api-waha2.9i6fnq.easypanel.host/api/sessions

# Testar envio de mensagem
curl -X POST https://api-waha2.9i6fnq.easypanel.host/api/ibra-grupo/messages/text \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "120363422447143322@g.us",
    "text": "Teste de mensagem"
  }'
```

## 📊 Status Atual

- ✅ **Sistema funcionando**: Webhook recebe e processa imagens
- ✅ **Buffer de imagens**: Funcionando corretamente
- ✅ **Lógica de contexto**: Implementada
- ❌ **Envio de mensagens**: Falhando por autenticação
- ❌ **Notificação ao usuário**: Não está funcionando

## 🔍 Logs Observados

```
👤 Incluindo menção para usuário: 556392437559@c.us
❌ Erro ao enviar mensagem via WAHA:
- Status: 401
- Status Text: Unauthorized
- Data: { message: 'Unauthorized', statusCode: 401 }
⚠️ Não foi possível enviar mensagem de contexto, mas continuando o processamento...
```

## 🎯 Impacto

- **Sistema continua funcionando** para receber imagens
- **Buffer de imagens funciona** corretamente
- **Usuário não recebe notificação** de solicitação de contexto
- **Processamento de imagens** pode continuar se contexto for fornecido

## 🚀 Solução Temporária

Enquanto não resolver a autenticação, o sistema:
1. ✅ Recebe e processa imagens
2. ✅ Aguarda até 2 imagens
3. ⚠️ Tenta solicitar contexto (falha silenciosamente)
4. ✅ Processa quando contexto é fornecido

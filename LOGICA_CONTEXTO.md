# 🔍 Lógica de Contexto - BotWaha v3

## 📋 Nova Lógica Implementada

O sistema agora só envia imagens para o n8n quando tem contexto, seguindo uma lógica inteligente de aguardar até 2 imagens antes de solicitar contexto.

## 🔄 Fluxo de Processamento

### 1. **Recebimento de Imagem**
```
Usuário envia imagem → Sistema adiciona ao buffer
```

### 2. **Verificação de Legenda**
```
Tem legenda? 
├─ ✅ SIM → Processa imediatamente
└─ ❌ NÃO → Continua para próxima verificação
```

### 3. **Contagem de Imagens**
```
Quantas imagens sem legenda?
├─ < 2 imagens → Aguarda mais imagens
└─ ≥ 2 imagens → Solicita contexto
```

### 4. **Processamento**
```
Tem contexto?
├─ ✅ SIM → Envia para n8n
└─ ❌ NÃO → Aguarda contexto
```

## 📊 Cenários de Uso

### **Cenário 1: Imagem com Legenda**
```
📸 Imagem 1 (com legenda) → ✅ Processa imediatamente
```

### **Cenário 2: 1 Imagem sem Legenda**
```
📸 Imagem 1 (sem legenda) → ⏳ Aguarda mais imagens
⏰ Timeout (2s) → ❓ Solicita contexto
```

### **Cenário 3: 2+ Imagens sem Legenda**
```
📸 Imagem 1 (sem legenda) → ⏳ Aguarda mais imagens
📸 Imagem 2 (sem legenda) → ❓ Solicita contexto com menção do usuário
⏰ Timeout (2s) → ❓ Solicita contexto
```

### **Cenário 4: Contexto Fornecido**
```
📸 Imagens sem legenda → ❓ Solicita contexto
📝 Usuário envia contexto → ✅ Processa com contexto
```

## 👤 Funcionalidade de Menção

### **Mensagem de Contexto com Menção**
Quando o sistema solicita contexto, ele menciona o usuário específico:

```json
{
  "chatId": "120363422447143322@g.us",
  "text": "📝 Olá! Vejo que você enviou 2 imagem(ns), mas nenhuma tem legenda.\n\nPor favor, me conte o contexto dessas imagens para que eu possa analisá-las adequadamente.",
  "mentions": ["556392437559@c.us"]
}
```

### **Vantagens da Menção**
1. **Notificação Direta**: Usuário recebe notificação específica
2. **Identificação Clara**: Fica claro quem deve responder
3. **Melhor UX**: Usuário sabe que é direcionado a ele
4. **Organização**: Evita confusão em grupos com muitos membros

## 🎯 Vantagens da Nova Lógica

1. **Eficiência**: Só processa quando tem contexto
2. **Flexibilidade**: Aguarda até 2 imagens antes de pedir contexto
3. **Experiência do Usuário**: Não interrompe fluxo desnecessariamente
4. **Economia de Recursos**: Evita processamento sem contexto
5. **Menção Direcionada**: Usuário específico é notificado

## 📝 Logs do Sistema

### **Aguardando Imagens**
```
📸 Imagem adicionada ao buffer do usuário 5511999999999@c.us. Total: 1 imagem(ns)
⏳ Aguardando mais imagens... Atualmente: 1/2
```

### **Solicitando Contexto**
```
❓ Nenhuma imagem tem legenda e já temos 2+ imagens, pedindo contexto...
📤 Enviando mensagem via WAHA: 120363422447143322@g.us
```

### **Processando com Contexto**
```
📝 Contexto recebido para imagens pendentes...
🤖 Enviando contexto para análise com IA...
✅ Resposta da IA recebida, enviando para o usuário...
```

## 🔧 Configurações

```javascript
// Configurações do buffer
imageBuffer: {
  timeoutMs: 2000, // 2 segundos para aguardar
  maxImages: 10, // Máximo de imagens por usuário
  downloadTimeout: 30000 // 30 segundos para download
}
```

## 🚀 Status

- ✅ **Lógica implementada**
- ✅ **Aguarda até 2 imagens**
- ✅ **Só processa com contexto**
- ✅ **Logs detalhados**
- ✅ **Documentação completa**

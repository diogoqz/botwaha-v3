# BotWaha v3 - Sistema de Análise de Imagens com IA

Servidor Node.js para processar imagens do WhatsApp com IA através do n8n. Sistema inteligente que aguarda múltiplas imagens, verifica legendas e solicita contexto quando necessário.

## 🚀 Instalação

```bash
npm install
```

## 🔧 Execução

### Desenvolvimento (com nodemon)
```bash
npm run dev
```

### Produção
```bash
npm start
```

## 📡 Endpoints

### POST /webhook
Recebe dados do webhook do WhatsApp API.

**Exemplo de requisição:**
```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"message": "teste", "from": "5511999999999"}'
```

### GET /webhook/status
Verifica o status do webhook.

### GET /
Informações sobre a API.

## 🔧 Configuração

### Arquivo de Configuração

Todas as configurações estão no arquivo `config.js`. Edite diretamente este arquivo para configurar o sistema.

**Configurações disponíveis:**

```javascript
module.exports = {
  // Servidor
  server: {
    port: 3000,
    host: '0.0.0.0'
  },

  // WAHA API
  waha: {
    apiUrl: 'http://localhost:8080',
    session: 'ibra-grupo'
  },

  // Grupos WhatsApp
  groups: {
    dev: '120363422447143322@g.us',
    prod: null // Configure quando tiver
  },

  // n8n Webhook
  n8n: {
    webhookUrl: null // Configure quando tiver
  },

  // Buffer de imagens
  imageBuffer: {
    timeoutMs: 2000, // Aguardar múltiplas imagens
    maxImages: 10,
    downloadTimeout: 30000
  }
};
```

## 🎯 Funcionalidades

### 🏢 Grupos Específicos
- ✅ **Grupo DEV**: Processa imagens do grupo de desenvolvimento
- ✅ **Grupo PROD**: Processa imagens do grupo de produção
- ✅ **Separação de ambientes**: Identifica automaticamente o tipo de grupo

### 📸 Sistema de Buffer de Imagens
- ✅ **Aguarda até 2 imagens**: Espera por até 2 imagens do mesmo usuário
- ✅ **Buffer por usuário**: Cada usuário tem seu próprio buffer
- ✅ **Timeout inteligente**: Processa após 2 segundos de inatividade
- ✅ **Lógica de contexto**: Só processa quando tem contexto ou 2+ imagens

### 🔍 Análise de Legendas
- ✅ **Verificação automática**: Analisa se imagens têm legenda
- ✅ **Solicitação de contexto**: Pede contexto quando não há legenda
- ✅ **Processamento com contexto**: Usa o contexto fornecido pelo usuário

### 🤖 Integração com IA
- ✅ **Análise via n8n**: Envia imagens para análise com IA
- ✅ **Combinação de imagens**: Combina múltiplas imagens em uma única imagem
- ✅ **Resposta inteligente**: Devolve análise da IA para o usuário
- ✅ **Identificação de grupo**: Marca se é DEV ou PROD na resposta

## 📝 Logs

O servidor registra automaticamente:
- Todas as requisições recebidas
- Dados dos webhooks
- Processamento de mensagens
- Download de imagens
- Envio para n8n
- Erros e exceções

## 📊 Estrutura dos Dados Enviados para n8n

```json
{
  "userId": "5511999999999@c.us",
  "groupId": "120363123456789@g.us",
  "groupType": "DEV",
  "combinedImage": "data:image/jpeg;base64,/9j/4AAQ...",
  "context": "Contexto fornecido pelo usuário",
  "totalImages": 2,
  "hasMultipleImages": true,
  "timestamp": "2023-11-04T10:30:56.000Z"
}
```

### 🖼️ Combinação de Imagens

Quando o usuário envia múltiplas imagens, o sistema:
1. **Baixa todas as imagens** individualmente
2. **Combina em uma única imagem** verticalmente
3. **Centraliza horizontalmente** cada imagem
4. **Adiciona espaçamento** entre as imagens
5. **Envia uma única imagem** para o n8n

## 🔄 Fluxo do Sistema

1. **📸 Usuário envia imagem(s)** no grupo DEV ou PROD
2. **⏱️ Sistema aguarda até 2 imagens** do mesmo usuário
3. **🔍 Verifica se há legenda** nas imagens:
   - **✅ Com legenda**: Processa imediatamente
   - **❌ Sem legenda + < 2 imagens**: Aguarda mais imagens
   - **❌ Sem legenda + ≥ 2 imagens**: Solicita contexto
4. **📝 Usuário envia contexto**: Sistema processa com o contexto
5. **🤖 Envia para n8n**: Análise com IA (só quando tem contexto)
6. **💬 Resposta automática**: Devolve análise para o grupo

## 🛡️ Segurança

- Helmet.js para headers de segurança
- CORS habilitado
- Validação de entrada básica
- Tratamento de erros robusto

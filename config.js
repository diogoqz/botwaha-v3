// Configurações do sistema BotWaha v3
module.exports = {
  // Configurações do servidor
  server: {
    port: 3000,
    host: '0.0.0.0'
  },

  // URLs da WAHA API
  waha: {
    apiUrl: 'https://api-waha2.9i6fnq.easypanel.host',
    session: 'ibra-grupo',
    apiKey: '102030' // Configure se necessário
  },

  // IDs dos grupos WhatsApp
  groups: {
    dev: '120363422447143322@g.us',
    prod: null // Configure quando tiver o grupo de produçã
  },

  // URL do webhook n8n para análise com IA
  n8n: {
    webhookUrl: "https://srv-n8n.rtp53d.easypanel.host/webhook/grupo-dermato" // Configure quando tiver a URL do webhook n8n
  },

  // Configurações do buffer de imagens
  imageBuffer: {
    timeoutMs: 2000, // 2 segundos para aguardar múltiplas imagens
    maxImages: 10, // Máximo de imagens por usuário
    downloadTimeout: 30000 // 30 segundos para download de imagem
  },

  // Configurações de logging
  logging: {
    level: 'info', // debug, info, warn, error
    enableConsole: true,
    enableFile: false
  },

  // Configurações de segurança
  security: {
    enableCors: true,
    enableHelmet: true,
    maxRequestSize: '10mb'
  }
};

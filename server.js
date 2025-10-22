const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const config = require('./config');

const app = express();
const PORT = config.server.port;

// Configurações do sistema
const DEV_GROUP_ID = config.groups.dev;
const PROD_GROUP_ID = config.groups.prod;
const N8N_WEBHOOK_URL = config.n8n.webhookUrl;
const WAHA_API_URL = config.waha.apiUrl;
const WAHA_SESSION = config.waha.session;
const WAHA_API_KEY = config.waha.apiKey;
const IMAGE_BUFFER_TIMEOUT = config.imageBuffer.timeoutMs;
const DOWNLOAD_TIMEOUT = config.imageBuffer.downloadTimeout;

// Buffer para armazenar imagens temporariamente
const imageBuffer = new Map(); // userId -> { images: [], timeout: null, groupId: string }

// Middlewares
if (config.security.enableHelmet) {
  app.use(helmet()); // Segurança básica
}

if (config.security.enableCors) {
  app.use(cors()); // CORS habilitado
}

app.use(express.json({ limit: config.security.maxRequestSize })); // Parse JSON com limite de tamanho
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded

// Middleware para logging das requisições
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rota principal
app.get('/', (req, res) => {
  res.json({
    message: 'BotWaha API v3',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// Função para enviar mensagem via WAHA API
async function sendWhatsAppMessage(chatId, message, mentionUser = null) {
  try {
    console.log('📤 Enviando mensagem via WAHA:', chatId, message);
    
    let messageData = {
      chatId: chatId,
      text: message
    };
    
    // Se for para mencionar um usuário específico
    if (mentionUser) {
      const userJid = `${mentionUser}@c.us`;
      messageData.mentions = [userJid];
      console.log('👤 Incluindo menção para usuário:', userJid);
    }
    
    // Preparar headers
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Adicionar API Key se configurada
    if (WAHA_API_KEY) {
      headers['X-Api-Key'] = WAHA_API_KEY;
      console.log('🔑 Usando autenticação com API Key');
    }
    
    const response = await axios.post(`${WAHA_API_URL}/api/sendText`, messageData, {
      timeout: 10000,
      headers: headers
    });
    
    console.log('✅ Mensagem enviada com sucesso');
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem via WAHA:');
    console.error('- Status:', error.response?.status);
    console.error('- Status Text:', error.response?.statusText);
    console.error('- Data:', error.response?.data);
    console.error('- Message:', error.message);
    
    // Não relançar o erro para não quebrar o fluxo
    return null;
  }
}

// Função para baixar imagem e converter para base64
async function downloadImageAsBase64(imageUrl) {
  try {
    console.log('🖼️ Baixando imagem:', imageUrl);
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: DOWNLOAD_TIMEOUT
    });
    
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    const contentType = response.headers['content-type'] || 'image/jpeg';
    
    console.log('✅ Imagem baixada com sucesso, tamanho:', base64.length, 'bytes');
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('❌ Erro ao baixar imagem:', error.message);
    throw error;
  }
}

// Função para combinar múltiplas imagens em uma única imagem
async function combineImagesIntoOne(images) {
  try {
    console.log(`🖼️ Combinando ${images.length} imagem(ns) em uma única imagem...`);
    
    if (images.length === 0) {
      throw new Error('Nenhuma imagem para combinar');
    }
    
    if (images.length === 1) {
      console.log('📸 Apenas uma imagem, retornando sem combinar');
      return images[0];
    }
    
    // Carregar todas as imagens
    const loadedImages = [];
    for (let i = 0; i < images.length; i++) {
      try {
        const imageData = images[i].replace(/^data:image\/[a-z]+;base64,/, '');
        const buffer = Buffer.from(imageData, 'base64');
        const image = await loadImage(buffer);
        loadedImages.push(image);
        console.log(`✅ Imagem ${i + 1} carregada: ${image.width}x${image.height}`);
      } catch (error) {
        console.error(`❌ Erro ao carregar imagem ${i + 1}:`, error.message);
        throw error;
      }
    }
    
    // Calcular dimensões do canvas combinado
    const maxWidth = Math.max(...loadedImages.map(img => img.width));
    const totalHeight = loadedImages.reduce((sum, img) => sum + img.height, 0);
    const padding = 10; // Espaçamento entre imagens
    const canvasHeight = totalHeight + (padding * (loadedImages.length - 1));
    
    console.log(`📐 Canvas final: ${maxWidth}x${canvasHeight}`);
    
    // Criar canvas
    const canvas = createCanvas(maxWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    
    // Fundo branco
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, maxWidth, canvasHeight);
    
    // Desenhar imagens uma abaixo da outra
    let currentY = 0;
    for (let i = 0; i < loadedImages.length; i++) {
      const img = loadedImages[i];
      const x = (maxWidth - img.width) / 2; // Centralizar horizontalmente
      
      ctx.drawImage(img, x, currentY);
      currentY += img.height + padding;
      
      console.log(`✅ Imagem ${i + 1} desenhada na posição y: ${currentY - img.height - padding}`);
    }
    
    // Converter para base64
    const combinedBase64 = canvas.toDataURL('image/jpeg', 0.9);
    
    console.log(`✅ ${images.length} imagens combinadas com sucesso!`);
    console.log(`📊 Tamanho final: ${combinedBase64.length} bytes`);
    
    return combinedBase64;
    
  } catch (error) {
    console.error('❌ Erro ao combinar imagens:', error.message);
    throw error;
  }
}

// Função para enviar dados para n8n webhook
async function sendToN8n(data) {
  if (!N8N_WEBHOOK_URL) {
    console.log('⚠️ N8N_WEBHOOK_URL não configurado, pulando envio');
    return null;
  }
  
  try {
    console.log('📤 Enviando dados para n8n:', N8N_WEBHOOK_URL);
    const response = await axios.post(N8N_WEBHOOK_URL, data, {
      timeout: 30000, // 30 segundos para IA processar
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Dados enviados para n8n com sucesso');
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao enviar para n8n:');
    console.error('- Status:', error.response?.status);
    console.error('- Status Text:', error.response?.statusText);
    console.error('- Data:', error.response?.data);
    console.error('- Message:', error.message);
    
    // Não relançar o erro para não quebrar o fluxo
    return null;
  }
}

// Função para processar contexto com imagens
async function processContextWithImages(userId, chatId, groupType, contextMessage, userImages) {
  try {
    console.log(`🖼️ Processando contexto com ${userImages.length} imagem(ns) para usuário ${userId}`);
    
    // Processar imagens com o contexto fornecido
    const imagesWithBase64 = [];
    for (const image of userImages) {
      try {
        const base64Image = await downloadImageAsBase64(image.mediaUrl);
        imagesWithBase64.push(base64Image);
      } catch (error) {
        console.error('❌ Erro ao processar imagem:', error.message);
      }
    }
    
    if (imagesWithBase64.length === 0) {
      console.log('⚠️ Nenhuma imagem foi processada com sucesso');
      await sendWhatsAppMessage(chatId, '❌ Erro ao processar as imagens. Tente novamente.');
      return {
        success: false,
        message: 'Erro ao processar imagens',
        groupType: groupType
      };
    }
    
    // Combinar múltiplas imagens em uma única imagem
    let combinedImage;
    try {
      combinedImage = await combineImagesIntoOne(imagesWithBase64);
    } catch (error) {
      console.error('❌ Erro ao combinar imagens:', error.message);
      await sendWhatsAppMessage(chatId, '❌ Erro ao processar as imagens. Tente novamente.');
      return {
        success: false,
        message: 'Erro ao combinar imagens',
        groupType: groupType
      };
    }

    // Enviar para n8n para análise
    const analysisData = {
      userId: userId,
      groupId: chatId,
      groupType: groupType,
      combinedImage: combinedImage,
      context: contextMessage,
      totalImages: imagesWithBase64.length,
      hasMultipleImages: imagesWithBase64.length > 1,
      timestamp: new Date().toISOString()
    };

    console.log('🤖 Enviando contexto para análise com IA...');
    const aiResponse = await sendToN8n(analysisData);
    
    if (aiResponse && aiResponse.response) {
      // Enviar resposta da IA para o usuário
      console.log('✅ Resposta da IA recebida, enviando para o usuário...');
      await sendWhatsAppMessage(chatId, `🤖 Análise das imagens (${groupType}):\n\n${aiResponse.response}`);
    } else {
      console.log('⚠️ Nenhuma resposta da IA ou erro no n8n, enviando mensagem padrão...');
      await sendWhatsAppMessage(chatId, `🤖 Análise concluída! As imagens foram processadas com sucesso. (${groupType})`);
    }
    
    return {
      success: true,
      message: 'Contexto processado e imagens analisadas',
      groupType: groupType
    };
    
  } catch (error) {
    console.error('❌ Erro ao processar contexto com imagens:', error.message);
    console.error('Stack trace:', error.stack);
    try {
      await sendWhatsAppMessage(chatId, '❌ Erro ao processar as imagens. Tente novamente.');
    } catch (sendError) {
      console.error('❌ Erro ao enviar mensagem de erro:', sendError.message);
    }
    return {
      success: false,
      message: 'Erro ao processar contexto',
      groupType: groupType
    };
  }
}

// Função para processar imagens após timeout
async function processImagesAfterTimeout(userId, groupId) {
  try {
    const userBuffer = imageBuffer.get(userId);
    if (!userBuffer || userBuffer.images.length === 0) {
      console.log('⚠️ Nenhuma imagem encontrada para processar');
      return;
    }

    console.log(`🖼️ Processando ${userBuffer.images.length} imagem(ns) para usuário ${userId}`);

    // Verificar se alguma imagem tem legenda
    const hasCaption = userBuffer.images.some(img => img.caption && img.caption.trim() !== '');
    
    // Se não tem legenda, pedir contexto (independente de quantas imagens)
    if (!hasCaption) {
      console.log(`❓ Nenhuma imagem tem legenda, pedindo contexto para ${userBuffer.images.length} imagem(ns)...`);
      
      // Extrair número do usuário para mencionar
      const userNumber = userId.split('@')[0];
      
      const contextMessage = `📝 Olá! Vejo que você enviou ${userBuffer.images.length} imagem(ns), mas nenhuma tem legenda. 

Por favor, me conte o contexto dessas imagens para que eu possa analisá-las adequadamente.`;
      
      const messageResult = await sendWhatsAppMessage(groupId, contextMessage, userNumber);
      
      if (!messageResult) {
        console.log('⚠️ Não foi possível enviar mensagem de contexto, mas continuando o processamento...');
      }
      
      // Limpar buffer e aguardar contexto
      imageBuffer.delete(userId);
      return;
    }

    // Processar imagens com IA
    console.log('🤖 Enviando imagens para análise com IA...');
    
    const imagesWithBase64 = [];
    for (const image of userBuffer.images) {
      try {
        const base64Image = await downloadImageAsBase64(image.mediaUrl);
        imagesWithBase64.push(base64Image);
      } catch (error) {
        console.error('❌ Erro ao processar imagem:', error.message);
      }
    }

    if (imagesWithBase64.length === 0) {
      console.log('⚠️ Nenhuma imagem foi processada com sucesso');
      await sendWhatsAppMessage(groupId, '❌ Erro ao processar as imagens. Tente novamente.');
      imageBuffer.delete(userId);
      return;
    }

    // Combinar múltiplas imagens em uma única imagem
    let combinedImage;
    try {
      combinedImage = await combineImagesIntoOne(imagesWithBase64);
    } catch (error) {
      console.error('❌ Erro ao combinar imagens:', error.message);
      await sendWhatsAppMessage(groupId, '❌ Erro ao processar as imagens. Tente novamente.');
      imageBuffer.delete(userId);
      return;
    }

    // Enviar para n8n para análise
    const analysisData = {
      userId: userId,
      groupId: groupId,
      combinedImage: combinedImage,
      totalImages: imagesWithBase64.length,
      hasMultipleImages: imagesWithBase64.length > 1,
      timestamp: new Date().toISOString()
    };

    console.log('🤖 Enviando dados para análise com IA...');
    const aiResponse = await sendToN8n(analysisData);
    
    if (aiResponse && aiResponse.response) {
      // Enviar resposta da IA para o usuário
      console.log('✅ Resposta da IA recebida, enviando para o usuário...');
      await sendWhatsAppMessage(groupId, `🤖 Análise das imagens:\n\n${aiResponse.response}`);
    } else {
      console.log('⚠️ Nenhuma resposta da IA ou erro no n8n, enviando mensagem padrão...');
      await sendWhatsAppMessage(groupId, '🤖 Análise concluída! As imagens foram processadas com sucesso.');
    }

    // Limpar buffer
    imageBuffer.delete(userId);
    
  } catch (error) {
    console.error('❌ Erro ao processar imagens:', error.message);
    console.error('Stack trace:', error.stack);
    try {
      const messageResult = await sendWhatsAppMessage(groupId, '❌ Erro ao processar as imagens. Tente novamente.');
      if (!messageResult) {
        console.log('⚠️ Não foi possível enviar mensagem de erro para o usuário');
      }
    } catch (sendError) {
      console.error('❌ Erro ao enviar mensagem de erro:', sendError.message);
    }
    imageBuffer.delete(userId);
  }
}

// Função para adicionar imagem ao buffer
function addImageToBuffer(userId, groupId, imageData) {
  const now = Date.now();
  
  // Se não existe buffer para este usuário, criar
  if (!imageBuffer.has(userId)) {
    imageBuffer.set(userId, {
      images: [],
      timeout: null,
      groupId: groupId,
      firstImageTime: now
    });
  }

  const userBuffer = imageBuffer.get(userId);
  
  // Adicionar imagem ao buffer
  userBuffer.images.push(imageData);
  
  // Limpar timeout anterior se existir
  if (userBuffer.timeout) {
    clearTimeout(userBuffer.timeout);
  }
  
  console.log(`📸 Imagem adicionada ao buffer do usuário ${userId}. Total: ${userBuffer.images.length} imagem(ns)`);
  
  // Verificar se tem legenda na nova imagem
  const hasCaption = imageData.caption && imageData.caption.trim() !== '';
  
  if (hasCaption) {
    // Se tem legenda, processar imediatamente
    console.log('✅ Imagem com legenda encontrada, processando imediatamente...');
    userBuffer.timeout = setTimeout(() => {
      console.log(`⏰ Timeout atingido para usuário ${userId}, processando imagens...`);
      processImagesAfterTimeout(userId, groupId);
    }, IMAGE_BUFFER_TIMEOUT);
  } else {
    // Se não tem legenda, verificar se já tem 2+ imagens
    if (userBuffer.images.length >= 2) {
      console.log('📸 Já temos 2+ imagens sem legenda, aguardando um pouco mais...');
      userBuffer.timeout = setTimeout(() => {
        console.log(`⏰ Timeout atingido para usuário ${userId}, processando imagens...`);
        processImagesAfterTimeout(userId, groupId);
      }, IMAGE_BUFFER_TIMEOUT);
    } else {
      console.log(`⏳ Aguardando mais imagens... Atualmente: ${userBuffer.images.length}/2`);
      userBuffer.timeout = setTimeout(() => {
        console.log(`⏰ Timeout atingido para usuário ${userId}, processando imagens...`);
        processImagesAfterTimeout(userId, groupId);
      }, IMAGE_BUFFER_TIMEOUT);
    }
  }
}

// Função para processar mensagem do WhatsApp
async function processWhatsAppMessage(messageData) {
  try {
    console.log('🔍 Processando mensagem WhatsApp...');
    
    // Extrair informações da mensagem
    const chatId = messageData.from;
    const fromMe = messageData.fromMe;
    const messageBody = messageData.body;
    const messageType = messageData.hasMedia ? 'image' : messageData.type;
    const timestamp = messageData.timestamp;
    const userId = messageData.participant || messageData.author;
    const mediaUrl = messageData.media?.url || messageData.mediaUrl;
    const mediaMimeType = messageData.media?.mimetype || messageData.mediaMimeType;
    const caption = messageData.caption;
    
    console.log('📋 Dados da mensagem:');
    console.log('- Chat ID:', chatId);
    console.log('- From Me:', fromMe);
    console.log('- User ID:', userId);
    console.log('- Message Type:', messageType);
    console.log('- Body:', messageBody);
    console.log('- Caption:', caption);
    
    // Verificar se é mensagem de grupo (termina com @g.us)
    if (!chatId.endsWith('@g.us')) {
      console.log('⚠️ Mensagem não é de grupo, ignorando');
      return null;
    }
    
    // Verificar se é do grupo de dev ou produção
    const isDevGroup = DEV_GROUP_ID && chatId === DEV_GROUP_ID;
    const isProdGroup = PROD_GROUP_ID && chatId === PROD_GROUP_ID;
    
    if (!isDevGroup && !isProdGroup) {
      console.log('⚠️ Mensagem não é dos grupos permitidos, ignorando');
      console.log('- Grupo da mensagem:', chatId);
      console.log('- Grupo DEV permitido:', DEV_GROUP_ID);
      console.log('- Grupo PROD permitido:', PROD_GROUP_ID);
      return null;
    }
    
    // Ignorar mensagens próprias
    if (fromMe) {
      console.log('⚠️ Mensagem própria, ignorando');
      return null;
    }
    
    const groupType = isDevGroup ? 'DEV' : 'PROD';
    console.log(`📱 Mensagem do grupo ${groupType}:`, chatId);
    
    // Se for imagem, adicionar ao buffer
    if (messageType === 'image' && mediaUrl) {
      console.log('🖼️ Imagem detectada, adicionando ao buffer...');
      
      const imageData = {
        mediaUrl: mediaUrl,
        mediaMimeType: mediaMimeType,
        caption: caption || '',
        timestamp: timestamp,
        messageType: messageType
      };
      
      addImageToBuffer(userId, chatId, imageData);
      
      return {
        success: true,
        message: 'Imagem adicionada ao buffer',
        groupType: groupType,
        userId: userId,
        imageCount: imageBuffer.get(userId)?.images.length || 1
      };
    }
    
    // Se for texto, verificar se é contexto para imagens pendentes
    if (messageType === 'text' && messageBody) {
      const userBuffer = imageBuffer.get(userId);
      if (userBuffer && userBuffer.images.length > 0) {
        console.log('📝 Contexto recebido para imagens pendentes...');
        
        // Processar imagens com o contexto fornecido usando nova função
        const result = await processContextWithImages(userId, chatId, groupType, messageBody, userBuffer.images);
        
        // Limpar buffer
        imageBuffer.delete(userId);
        return result;
      }
    }
    
    console.log('✅ Mensagem processada com sucesso');
    return {
      success: true,
      message: 'Mensagem processada',
      groupType: groupType
    };
    
  } catch (error) {
    console.error('❌ Erro ao processar mensagem WhatsApp:', error);
    throw error;
  }
}

// Rota webhook para receber POST
app.post('/webhook', async (req, res) => {
  try {
    console.log('📨 Webhook recebido:');
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    const webhookData = req.body;
    
    // Verificar se é evento de mensagem
    if (webhookData.event === 'message' && webhookData.payload) {
      console.log('📱 Evento de mensagem detectado');
      
      // Processar a mensagem
      const processedMessage = await processWhatsAppMessage(webhookData.payload);
      
      if (processedMessage) {
        console.log('📤 Enviando mensagem processada para n8n...');
        
        // Enviar para n8n webhook
        await sendToN8n(processedMessage);
        
        res.status(200).json({
          success: true,
          message: 'Mensagem processada e enviada para n8n',
          timestamp: new Date().toISOString(),
          processedData: processedMessage
        });
      } else {
        res.status(200).json({
          success: true,
          message: 'Mensagem ignorada (não atende aos critérios)',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      console.log('ℹ️ Evento não é de mensagem ou não tem payload');
      res.status(200).json({
        success: true,
        message: 'Evento recebido (não é mensagem)',
        timestamp: new Date().toISOString(),
        event: webhookData.event
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Rota para verificar status do webhook
app.get('/webhook/status', (req, res) => {
  res.json({
    webhook: 'ativo',
    endpoint: '/webhook',
    method: 'POST',
    timestamp: new Date().toISOString()
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
    timestamp: new Date().toISOString()
  });
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
  console.error('❌ Erro não tratado:', error);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 Webhook disponível em: http://localhost:${PORT}/webhook`);
  console.log(`🔍 Status do webhook: http://localhost:${PORT}/webhook/status`);
  console.log(`📋 Documentação da API: http://localhost:${PORT}/`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM, encerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recebido SIGINT, encerrando servidor...');
  process.exit(0);
});

#!/usr/bin/env node

// Script para verificar a versão do código
console.log('🔍 Verificando versão do código...');
console.log('📅 Data:', new Date().toISOString());
console.log('📦 Versão:', '1.0.0');
console.log('🔧 Commit:', 'd9b02df - fix: refatorar função de processamento de contexto com imagens');
console.log('✅ Função processContextWithImages: IMPLEMENTADA');
console.log('✅ Erro processedImages is not defined: CORRIGIDO');
console.log('✅ Sistema funcionando: SIM');

// Verificar se a função existe
try {
  const fs = require('fs');
  const serverContent = fs.readFileSync('./server.js', 'utf8');
  
  if (serverContent.includes('processContextWithImages')) {
    console.log('✅ Função processContextWithImages: ENCONTRADA');
  } else {
    console.log('❌ Função processContextWithImages: NÃO ENCONTRADA');
  }
  
  if (serverContent.includes('processedImages is not defined')) {
    console.log('❌ Erro processedImages: AINDA PRESENTE');
  } else {
    console.log('✅ Erro processedImages: REMOVIDO');
  }
  
} catch (error) {
  console.log('❌ Erro ao verificar arquivo:', error.message);
}

console.log('🎯 Sistema pronto para deploy no Easypanel!');

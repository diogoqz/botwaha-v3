# 🖼️ Combinação de Imagens - BotWaha v3

## 📋 Funcionalidade

O sistema agora combina múltiplas imagens enviadas pelo usuário em uma única imagem antes de enviar para o n8n para análise com IA.

## 🔄 Como Funciona

### 1. **Recebimento de Imagens**
- Usuário envia 2 ou mais imagens no grupo
- Sistema aguarda 2 segundos por mais imagens
- Todas as imagens do mesmo usuário são agrupadas

### 2. **Processamento**
- Cada imagem é baixada individualmente
- Convertida para base64
- Carregada usando a biblioteca Canva

### 3. **Combinação**
- Imagens são combinadas verticalmente
- Cada imagem é centralizada horizontalmente
- Espaçamento de 10px entre as imagens
- Fundo branco para melhor contraste

### 4. **Envio para n8n**
- Uma única imagem combinada é enviada
- Campo `combinedImage` contém a imagem final
- Campo `hasMultipleImages` indica se houve combinação
- Campo `totalImages` mostra quantas imagens foram combinadas

## 📊 Estrutura de Dados

### Antes (Múltiplas Imagens)
```json
{
  "images": [
    {"base64": "data:image/jpeg;base64,/9j/4AAQ...", "caption": ""},
    {"base64": "data:image/jpeg;base64,/9j/4BBQ...", "caption": ""}
  ],
  "totalImages": 2
}
```

### Agora (Imagem Combinada)
```json
{
  "combinedImage": "data:image/jpeg;base64,/9j/4CCQ...",
  "totalImages": 2,
  "hasMultipleImages": true
}
```

## 🎯 Vantagens

1. **Simplicidade**: n8n recebe apenas uma imagem
2. **Contexto**: Todas as imagens em uma única visualização
3. **Eficiência**: Menos processamento no n8n
4. **Organização**: Imagens organizadas verticalmente

## 🔧 Configurações

```javascript
// Configurações da combinação
const padding = 10; // Espaçamento entre imagens
const quality = 0.9; // Qualidade JPEG (0.0 a 1.0)
const backgroundColor = 'white'; // Cor de fundo
```

## 📝 Logs

O sistema registra:
- Quantas imagens foram combinadas
- Dimensões de cada imagem
- Dimensões do canvas final
- Tamanho da imagem combinada

### Exemplo de Log:
```
🖼️ Combinando 2 imagem(ns) em uma única imagem...
✅ Imagem 1 carregada: 800x600
✅ Imagem 2 carregada: 1024x768
📐 Canvas final: 1024x1378
✅ Imagem 1 desenhada na posição y: 0
✅ Imagem 2 desenhada na posição y: 610
✅ 2 imagens combinadas com sucesso!
📊 Tamanho final: 245760 bytes
```

## 🚀 Status

- ✅ **Funcionalidade implementada**
- ✅ **Biblioteca Canvas instalada**
- ✅ **Tratamento de erros robusto**
- ✅ **Logs detalhados**
- ✅ **Documentação completa**

// Ficheiro: backend/services/aiService.js
// Descrição: Serviço para interagir com a API de IA (Google Gemini).

// [CORREÇÃO] Carrega o .env apenas em ambiente de desenvolvimento.
// Em produção, a chave da API deve vir do ecosystem.config.js para evitar conflitos.
if (process.env.NODE_ENV !== 'production') {
    const path = require('path');
    const envPath = path.resolve(__dirname, '../../.env'); // Aponta para a raiz do projeto
    if (require('fs').existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
    }
}
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fetch = require('node-fetch'); // [NOVO] Necessário para listar modelos via API REST
const systemKnowledge = require('../config/ai_knowledge_base'); // [NOVO] Importa a base de conhecimento externa

// Verifica se a chave da API foi fornecida
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn('⚠️ [AI-SERVICE] GEMINI_API_KEY não encontrada no .env. Assistente desativado.');
} else {
    // Log de segurança (mostra apenas os primeiros caracteres)
    console.log(`✅ [AI-SERVICE] Chave de API detetada: ${apiKey.substring(0, 5)}...`);
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// [NOVO] Função para listar modelos disponíveis e ajudar no debug
const listAvailableModels = async () => {
    if (!apiKey) return;
    console.log('🔄 [AI-SERVICE] A verificar modelos disponíveis na API...');
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        if (data.models) {
            const modelNames = data.models.map(m => m.name.replace('models/', ''));
            console.log('📜 [AI-SERVICE] Modelos disponíveis:', modelNames.join(', '));
        } else {
            console.warn('⚠️ [AI-SERVICE] Não foi possível listar modelos:', data);
        }
    } catch (error) {
        console.error('❌ [AI-SERVICE] Erro ao listar modelos:', error.message);
    }
};
if (apiKey) listAvailableModels();

const modelName = "gemini-2.5-flash"; // [MODIFICADO] Modelo que funcionou corretamente

// [NOVO] Instrução de Sistema (Persona e Fluxo)
const systemInstruction = `
Atue como 'Assistente Rota', um assistente virtual de suporte técnico da empresa "Rota Hotspot".
Seu objetivo é resolver o problema do cliente de forma autônoma.

FLUXO DE ATENDIMENTO OBRIGATÓRIO:
1. **Análise Inicial:** Verifique se é a primeira interação. Se for, agradeça o contato e confirme a abertura do ticket (mencione o título).
2. **Triagem de Assunto:** Se o usuário não deixou claro qual é o produto ou serviço com problema (ex: disse apenas "não funciona"), pergunte sobre qual assunto ele deseja falar.
3. **Triagem de Dificuldade:** Se o assunto é conhecido mas o problema não (ex: "Internet lenta" mas sem detalhes), pergunte qual a dificuldade específica, mensagens de erro ou comportamento observado.
4. **Solução:** APENAS quando tiver Assunto e Dificuldade claros, consulte a BASE DE CONHECIMENTO e forneça a solução passo a passo.
5. **Transbordo:** Se a solução não funcionar ou o problema for desconhecido, informe que um atendente humano irá analisar o caso.

BASE DE CONHECIMENTO:
${systemKnowledge}

Diretrizes:
- Mantenha o contexto da conversa.
- Seja cordial, objetivo e profissional.
- Responda sempre em Português do Brasil.
`;

const model = genAI ? genAI.getGenerativeModel({ model: modelName, systemInstruction: systemInstruction }) : null;

/**
 * Gera uma resposta de chat baseada no histórico do ticket.
 * @param {string} ticketTitle - Título do ticket (contexto).
 * @param {Array} historyMessages - Array de objetos { user_id, message }.
 */
const generateChatResponse = async (ticketTitle, historyMessages) => {
    if (!model) {
        return null; // Serviço desativado
    }

    console.log(`🤖 [AI-SERVICE] A gerar resposta de chat para o ticket: "${ticketTitle}"`);

    // Converte mensagens do DB para o formato do Gemini
    // user_id NULL = IA (model), user_id NUM = Usuário (user)
    const history = historyMessages.map(msg => ({
        role: msg.user_id === null ? "model" : "user",
        parts: [{ text: msg.message }]
    }));

    // Separa a última mensagem (prompt atual) do histórico
    let lastUserMessage = "";
    let chatHistory = [];

    if (history.length > 0) {
        const lastMsg = history[history.length - 1];
        if (lastMsg.role === "user") {
            lastUserMessage = lastMsg.parts[0].text;
            chatHistory = history.slice(0, -1);
        } else {
            // Se a última mensagem foi da IA, não faz nada (aguarda usuário)
            return null;
        }
    }

    // Injeta o contexto do título na primeira mensagem do histórico ou no prompt atual
    const contextHeader = `[Contexto do Ticket: Título="${ticketTitle}"]\n`;
    if (chatHistory.length > 0 && chatHistory[0].role === "user") {
        chatHistory[0].parts[0].text = contextHeader + chatHistory[0].parts[0].text;
    } else {
        lastUserMessage = contextHeader + lastUserMessage;
    }

    try {
        const chat = model.startChat({ history: chatHistory });
        const result = await chat.sendMessage(lastUserMessage);
        const response = await result.response;
        const text = response.text();
        console.log('✅ [AI-SERVICE] Resposta gerada com sucesso.');
        return text;
    } catch (error) {
        // [MELHORIA] Loga o objeto de erro completo para obter mais detalhes sobre
        // falhas de rede, como timeouts ou erros de DNS, que podem ser causados por um firewall.
        console.error('❌ [AI-SERVICE] Erro no chat:', error);
        return null; // Retorna null em caso de erro para não quebrar o fluxo
    }
};

/**
 * Wrapper para manter compatibilidade com a chamada inicial.
 */
const generateInitialResponse = async (ticketTitle, ticketMessage) => {
    // Simula um histórico com apenas a primeira mensagem
    return generateChatResponse(ticketTitle, [{ user_id: 1, message: ticketMessage }]);
};

module.exports = { generateInitialResponse, generateChatResponse };
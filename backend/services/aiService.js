// Ficheiro: backend/services/aiService.js
// Descrição: Serviço para interagir com a API de IA (Google Gemini).

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Verifica se a chave da API foi fornecida
if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️ [AI-SERVICE] Chave da API do Google Gemini (GEMINI_API_KEY) não encontrada no ficheiro .env. A funcionalidade de assistente virtual estará desativada.');
}

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-pro" }) : null;

/**
 * Gera uma resposta inicial para um novo ticket usando a IA.
 * @param {string} ticketTitle - O título do ticket.
 * @param {string} ticketMessage - A mensagem inicial do utilizador.
 * @returns {Promise<string|null>} - A resposta gerada pela IA ou null em caso de erro/desativação.
 */
const generateInitialResponse = async (ticketTitle, ticketMessage) => {
    if (!model) {
        return null; // Serviço desativado
    }

    // Prompt de sistema para guiar a IA
    const prompt = `
        Você é um assistente virtual de primeiro nível de uma empresa de Wi-Fi Hotspot.
        Seu nome é "Assistente Rota".
        Sua tarefa é dar uma resposta inicial e amigável para um novo ticket de suporte.

        Regras:
        1.  Seja breve e direto (máximo 3 parágrafos).
        2.  Agradeça ao utilizador por entrar em contato.
        3.  Confirme o recebimento do ticket, mencionando o título: "${ticketTitle}".
        4.  Informe que a equipa de suporte já foi notificada e que alguém irá responder em breve.
        5.  Se a mensagem do utilizador parecer uma pergunta simples (ex: "como mudo minha senha?", "não consigo conectar"), tente fornecer uma instrução básica e útil. Se for complexo, apenas diga que a equipa irá analisar.
        6.  Termine a mensagem de forma profissional.

        Mensagem do utilizador:
        "${ticketMessage}"

        Sua resposta:
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        return text;
    } catch (error) {
        console.error('❌ [AI-SERVICE] Erro ao gerar resposta da IA:', error);
        return null; // Retorna null em caso de erro para não quebrar o fluxo
    }
};

module.exports = { generateInitialResponse };
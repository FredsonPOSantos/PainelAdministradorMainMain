// Ficheiro: backend/routes/publicRoutes.js
// Descrição: Rotas que podem ser acedidas sem autenticação, como a que serve os dados da campanha.

const express = require('express');
const router = express.Router();
const pool = require('../connection');
const { getActiveCampaignData } = require('../services/campaignService'); // Vamos criar este serviço

// Rota para obter a campanha ativa para um determinado roteador
router.get('/active-campaign', async (req, res) => {
    const { routerName } = req.query;
    if (!routerName) {
        return res.status(400).json({ message: 'O parâmetro routerName é obrigatório.' });
    }

    try {
        const campaignData = await getActiveCampaignData(routerName);
        res.json(campaignData);
    } catch (error) {
        console.error(`[API-PUBLIC] Erro ao buscar campanha para '${routerName}':`, error);
        res.status(500).json({ message: 'Erro interno ao buscar dados da campanha.' });
    }
});

module.exports = router;


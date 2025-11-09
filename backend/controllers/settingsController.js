// Ficheiro: backend/controllers/settingsController.js
// Descrição: Lida com a lógica de GESTÃO de configurações do sistema.

const pool = require('../connection');
const path = require('path');
const fs = require('fs'); // Para lidar com caminhos de ficheiro e remoção
const { logAction } = require('../services/auditLogService');

// --- FASE 2.3: Configurações Gerais ---

/**
 * Obtém as configurações gerais (Nome, Logo, Cor)
 */
const getGeneralSettings = async (req, res) => {
    console.log("getGeneralSettings: Buscando configurações...");
    try {
        const settings = await pool.query(
            'SELECT company_name, logo_url, primary_color, background_color, font_color, font_family, font_size, background_image_url, modal_background_color, modal_font_color, modal_border_color, sidebar_color, login_background_color, login_form_background_color, login_font_color, login_button_color, login_logo_url FROM system_settings WHERE id = 1'
        );

        if (settings.rows.length === 0) {
            console.warn("getGeneralSettings: Nenhuma configuração encontrada (ID 1 não existe?).");
            // Isso não deve acontecer se a Etapa 1 (database_setup.sql) foi executada
            return res.status(404).json({ message: "Configurações do sistema não encontradas." });
        }
        console.log("getGeneralSettings: Configurações encontradas:", settings.rows[0]);
        res.json(settings.rows[0]);

    } catch (error) {
        console.error('Erro ao buscar configurações gerais:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar configurações.' });
    }
};

const updateBackgroundImage = async (req, res) => {
    console.log("updateBackgroundImage: Iniciando atualização...");
    const newBackgroundImageFile = req.file;
    console.log("updateBackgroundImage: Ficheiro recebido (req.file):", newBackgroundImageFile ? newBackgroundImageFile.filename : "Nenhum");

    try {
        if (newBackgroundImageFile) {
            const relativePath = path.relative('public', newBackgroundImageFile.path);
            const backgroundImageUrlForDB = '/' + relativePath.replace(/\\/g, '/');
            console.log(`updateBackgroundImage: Novo background image URL para DB: ${backgroundImageUrlForDB}`);

            const updateQuery = `UPDATE system_settings SET background_image_url = $1 WHERE id = 1 RETURNING *`;
            const updatedSettings = await pool.query(updateQuery, [backgroundImageUrlForDB]);

            if (updatedSettings.rows.length === 0) {
                console.error("updateBackgroundImage: Falha ao atualizar, linha ID 1 não encontrada?");
                throw new Error("Falha ao encontrar o registo de configurações para atualizar.");
            }

            console.log("updateBackgroundImage: Configurações atualizadas no DB:", updatedSettings.rows[0]);

            await logAction({
                req,
                action: 'SETTINGS_UPDATE_BACKGROUND',
                status: 'SUCCESS',
                description: `Utilizador "${req.user.email}" atualizou a imagem de fundo.`,
                target_type: 'settings'
            });

            res.status(200).json({
                message: "Imagem de fundo atualizada com sucesso!",
                settings: updatedSettings.rows[0]
            });
        } else {
            console.log("updateBackgroundImage: Nenhum ficheiro enviado para atualização.");
            res.status(400).json({
                message: "Nenhum ficheiro enviado."
            });
        }
    } catch (error) {
        await logAction({
            req,
            action: 'SETTINGS_UPDATE_BACKGROUND_FAILURE',
            status: 'FAILURE',
            description: `Falha ao atualizar a imagem de fundo. Erro: ${error.message}`,
            target_type: 'settings',
            details: { error: error.message }
        });

        console.error('Erro ao atualizar imagem de fundo:', error);
        res.status(500).json({ message: error.message || 'Erro interno do servidor ao atualizar imagem de fundo.' });
    }
};


// --- FASE 2.4: Configurações do Portal Hotspot ---
// (Já incluídas aqui para eficiência, pois usam a mesma tabela)

/**
 * Obtém as configurações do Hotspot (Timeout, Whitelist)
 */
const getHotspotSettings = async (req, res) => {
    console.log("getHotspotSettings: Buscando configurações...");
    try {
        const settings = await pool.query(
            'SELECT session_timeout_minutes, domain_whitelist FROM system_settings WHERE id = 1'
        );

        if (settings.rows.length === 0) {
             console.warn("getHotspotSettings: Nenhuma configuração encontrada (ID 1 não existe?).");
            return res.status(404).json({ message: "Configurações do hotspot não encontradas." });
        }
        console.log("getHotspotSettings: Configurações encontradas:", settings.rows[0]);
        res.json(settings.rows[0]);
    } catch (error) {
        console.error('Erro ao buscar configs do hotspot:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar configs do hotspot.' });
    }
};

/**
 * Atualiza as configurações do Hotspot (Timeout, Whitelist)
 * Espera 'application/json'
 */
const updateHotspotSettings = async (req, res) => {
     console.log("updateHotspotSettings: Iniciando atualização...");
     console.log("updateHotspotSettings: Dados recebidos (body):", req.body);
    // Estes dados vêm de um JSON (application/json)
    const { sessionTimeoutMinutes, domainWhitelist } = req.body;

    // --- Validação Robusta ---
    if (domainWhitelist === undefined || sessionTimeoutMinutes === undefined) {
         console.warn("updateHotspotSettings: Dados inválidos - faltam campos.");
         return res.status(400).json({ message: 'Dados inválidos. Timeout e Whitelist (mesmo vazia []) são obrigatórios.' });
    }
    // Whitelist DEVE ser um array
    if (!Array.isArray(domainWhitelist)) {
         console.warn("updateHotspotSettings: Whitelist não é um array.");
        return res.status(400).json({ message: 'Whitelist deve ser um array (lista) de domínios.' });
    }
    // Timeout deve ser um número positivo (ou null/0 para desativar, se aplicável - aqui exigimos > 0)
    const timeoutNum = parseInt(sessionTimeoutMinutes, 10);
    if (isNaN(timeoutNum) || timeoutNum <= 0) {
         console.warn("updateHotspotSettings: Timeout inválido:", sessionTimeoutMinutes);
        return res.status(400).json({ message: 'O tempo de sessão deve ser um número inteiro positivo (maior que zero).' });
    }
    // Validação extra: Limpar e validar cada domínio na whitelist (opcional, mas bom)
    const cleanedWhitelist = domainWhitelist
        .map(domain => domain.trim().toLowerCase()) // Limpa e padroniza
        .filter(domain => domain.length > 0 && domain.includes('.')); // Filtra vazios ou inválidos
        // TODO: Poderia adicionar validação de formato de domínio mais estrita aqui (regex)
    console.log("updateHotspotSettings: Whitelist após limpeza:", cleanedWhitelist);

    // --- Executa a Atualização ---
    try {
        const query = `
            UPDATE system_settings
            SET session_timeout_minutes = $1, domain_whitelist = $2
            WHERE id = 1
            RETURNING session_timeout_minutes, domain_whitelist
        `;
         console.log("updateHotspotSettings: Executando query:", query, "com params:", [timeoutNum, cleanedWhitelist]);
        const updatedSettings = await pool.query(query, [timeoutNum, cleanedWhitelist]);

        if (updatedSettings.rows.length === 0) {
             console.error("updateHotspotSettings: Falha ao atualizar, linha ID 1 não encontrada?");
             throw new Error("Falha ao encontrar o registo de configurações para atualizar.");
        }

        console.log("updateHotspotSettings: Configs do Hotspot atualizadas no DB:", updatedSettings.rows[0]);

        await logAction({
            req,
            action: 'SETTINGS_UPDATE_HOTSPOT',
            status: 'SUCCESS',
            description: `Utilizador "${req.user.email}" atualizou as configurações do hotspot.`,
            target_type: 'settings'
        });

        res.status(200).json({
            message: "Configurações do Hotspot atualizadas com sucesso!",
            settings: updatedSettings.rows[0] // Retorna os dados atualizados
        });
    } catch (error) {
        await logAction({
            req,
            action: 'SETTINGS_UPDATE_HOTSPOT_FAILURE',
            status: 'FAILURE',
            description: `Falha ao atualizar as configurações do hotspot. Erro: ${error.message}`,
            target_type: 'settings',
            details: { error: error.message }
        });

        console.error('Erro ao atualizar configs do hotspot:', error);
    }
};

const updateLoginAppearanceSettings = async (req, res) => {
    console.log("updateLoginAppearanceSettings: Iniciando atualização...");
    const { login_background_color, login_form_background_color, login_font_color, login_button_color } = req.body;
    console.log("updateLoginAppearanceSettings: Dados recebidos (body):", { login_background_color, login_form_background_color, login_font_color, login_button_color });

    try {
        const params = [];
        const fields = [];
        let queryIndex = 1;

        if (login_background_color) {
            fields.push(`login_background_color = $${queryIndex++}`);
            params.push(login_background_color);
        }
        if (login_form_background_color) {
            fields.push(`login_form_background_color = $${queryIndex++}`);
            params.push(login_form_background_color);
        }
        if (login_font_color) {
            fields.push(`login_font_color = $${queryIndex++}`);
            params.push(login_font_color);
        }
        if (login_button_color) {
            fields.push(`login_button_color = $${queryIndex++}`);
            params.push(login_button_color);
        }

        if (fields.length > 0) {
            const updateQuery = `UPDATE system_settings SET ${fields.join(', ')} WHERE id = 1 RETURNING *`;
            const updatedSettings = await pool.query(updateQuery, params);

            if (updatedSettings.rows.length === 0) {
                throw new Error("Falha ao encontrar o registo de configurações para atualizar.");
            }

            await logAction({
                req,
                action: 'SETTINGS_UPDATE_LOGIN_APPEARANCE',
                status: 'SUCCESS',
                description: `Utilizador "${req.user.email}" atualizou a aparência da página de login.`,
                target_type: 'settings'
            });

            res.status(200).json({
                message: "Configurações de aparência da página de login atualizadas com sucesso!",
                settings: updatedSettings.rows[0]
            });
        } else {
            res.status(200).json({
                message: "Nenhuma alteração detectada nas configurações de aparência da página de login."
            });
        }
    } catch (error) {
        await logAction({
            req,
            action: 'SETTINGS_UPDATE_LOGIN_APPEARANCE_FAILURE',
            status: 'FAILURE',
            description: `Falha ao atualizar a aparência da página de login. Erro: ${error.message}`,
            target_type: 'settings',
            details: { error: error.message }
        });

        console.error('Erro ao atualizar configurações de aparência da página de login:', error);
        res.status(500).json({ message: error.message || 'Erro interno do servidor ao atualizar configurações.' });
    }
};

const updateLoginLogo = async (req, res) => {
    console.log("updateLoginLogo: Iniciando atualização...");
    const newLoginLogoFile = req.file;
    console.log("updateLoginLogo: Ficheiro recebido (req.file):", newLoginLogoFile ? newLoginLogoFile.filename : "Nenhum");

    try {
        if (newLoginLogoFile) {
            const relativePath = path.relative('public', newLoginLogoFile.path);
            const loginLogoUrlForDB = '/' + relativePath.replace(/\\/g, '/');
            console.log(`updateLoginLogo: Novo login logo URL para DB: ${loginLogoUrlForDB}`);

            const updateQuery = `UPDATE system_settings SET login_logo_url = $1 WHERE id = 1 RETURNING *`;
            const updatedSettings = await pool.query(updateQuery, [loginLogoUrlForDB]);

            if (updatedSettings.rows.length === 0) {
                console.error("updateLoginLogo: Falha ao atualizar, linha ID 1 não encontrada?");
                throw new Error("Falha ao encontrar o registo de configurações para atualizar.");
            }

            console.log("updateLoginLogo: Configurações atualizadas no DB:", updatedSettings.rows[0]);

            await logAction({
                req,
                action: 'SETTINGS_UPDATE_LOGIN_LOGO',
                status: 'SUCCESS',
                description: `Utilizador "${req.user.email}" atualizou o logo da página de login.`,
                target_type: 'settings'
            });

            res.status(200).json({
                message: "Logo da página de login atualizado com sucesso!",
                settings: updatedSettings.rows[0]
            });
        } else {
            console.log("updateLoginLogo: Nenhum ficheiro enviado para atualização.");
            res.status(400).json({
                message: "Nenhum ficheiro enviado."
            });
        }
    } catch (error) {
        await logAction({
            req,
            action: 'SETTINGS_UPDATE_LOGIN_LOGO_FAILURE',
            status: 'FAILURE',
            description: `Falha ao atualizar o logo da página de login. Erro: ${error.message}`,
            target_type: 'settings',
            details: { error: error.message }
        });

        console.error('Erro ao atualizar o logo da página de login:', error);
        res.status(500).json({ message: error.message || 'Erro interno do servidor ao atualizar o logo.' });
    }
};

const updateAppearanceSettings = async (req, res) => {
    try {
        console.log('Recebendo atualização de aparência:', req.body);
        
        const updates = {};
        const files = req.files || {};

        // Processar arquivos enviados
        if (files.companyLogo) {
            updates.logo_url = '/uploads/logos/' + files.companyLogo[0].filename;
        }
        if (files.loginLogo) {
            updates.login_logo_url = '/uploads/logos/' + files.loginLogo[0].filename;
        }
        if (files.backgroundImage) {
            updates.background_image_url = '/uploads/background/' + files.backgroundImage[0].filename;
        }

        // Processar demais campos
        const fields = [
            'primary_color',
            'background_color',
            'sidebar_color',
            'font_color',
            'font_family',
            'font_size',
            'modal_background_color',
            'modal_font_color',
            'modal_border_color',
            'login_background_color',
            'login_form_background_color',
            'login_font_color',
            'login_button_color',
            'company_name'
        ];

        fields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        // Se não houver atualizações, retorne erro
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nenhuma atualização fornecida'
            });
        }

        // Construir a query dinamicamente
        const setClause = Object.keys(updates)
            .map((key, i) => `${key} = $${i + 1}`)
            .join(', ');
        
        const query = `
            UPDATE system_settings 
            SET ${setClause}
            WHERE id = 1
            RETURNING *
        `;

        const result = await pool.query(query, Object.values(updates));

        if (result.rows.length === 0) {
            throw new Error('Nenhuma configuração encontrada para atualizar');
        }

        res.json({
            success: true,
            message: 'Configurações de aparência atualizadas com sucesso',
            settings: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao atualizar configurações de aparência:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar configurações',
            error: error.message
        });
    }
};

const resetAppearanceSettings = async (req, res) => {
    console.log("resetAppearanceSettings: Iniciando a reposição das configurações de aparência...");

    try {
        // Lista de todos os campos de aparência para repor para NULL
        const appearanceFields = [
            'logo_url', 'primary_color', 'background_color', 'sidebar_color', 'font_color',
            'font_family', 'font_size', 'modal_background_color', 'modal_font_color',
            'modal_border_color', 'login_background_color', 'login_form_background_color',
            'login_font_color', 'login_button_color', 'login_logo_url', 'background_image_url'
        ];

        // Constrói a parte SET da query dinamicamente
        const setClauses = appearanceFields.map(field => `${field} = NULL`).join(', ');

        const updateQuery = `UPDATE system_settings SET ${setClauses} WHERE id = 1 RETURNING *`;

        const { rows } = await pool.query(updateQuery);

        await logAction({
            req,
            action: 'SETTINGS_RESET_APPEARANCE',
            status: 'SUCCESS',
            description: `Utilizador "${req.user.email}" repôs as configurações de aparência para os valores predefinidos.`,
        });

        res.status(200).json({
            message: "Configurações de aparência repostas com sucesso!",
            settings: rows[0]
        });

    } catch (error) {
        console.error('Erro ao repor as configurações de aparência:', error);
        await logAction({
            req,
            action: 'SETTINGS_RESET_APPEARANCE_FAILURE',
            status: 'FAILURE',
            description: `Falha ao repor as configurações de aparência. Erro: ${error.message}`,
        });
        res.status(500).json({ message: 'Erro interno do servidor ao repor as configurações.' });
    }
};


// Exporta todas as funções do controller
module.exports = {
    getGeneralSettings,
    getHotspotSettings,
    updateHotspotSettings,
    updateBackgroundImage,
    updateLoginAppearanceSettings,
    updateLoginLogo,
    updateAppearanceSettings, // EXPORTA A NOVA FUNÇÃO
    resetAppearanceSettings
};

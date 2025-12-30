// Ficheiro: backend/services/campaignService.js
const { pool } = require('../connection');

const getActiveCampaignData = async (routerName) => {

    let campaignData = {
        use_default: true,
        template: null, // [NOVO]
        postLoginBanners: [], // [CORRIGIDO] Padronizado para array (plural)
    };

    const routerResult = await pool.query('SELECT id, group_id FROM routers WHERE name = $1', [routerName]);
    const router = routerResult.rows[0];

    if (!router) {
        console.log(`[CampaignService] Roteador '${routerName}' não encontrado.`);
        return campaignData; // Retorna padrão se o roteador não existe
    }

    const campaignQuery = `
        SELECT * FROM campaigns
        WHERE is_active = true AND CURRENT_DATE BETWEEN start_date AND end_date
        AND (
            (target_type = 'single_router' AND target_id = $1) OR
            (target_type = 'group' AND target_id = $2) OR
            (target_type = 'all')
        )
        ORDER BY CASE target_type WHEN 'single_router' THEN 1 WHEN 'group' THEN 2 ELSE 3 END
        LIMIT 1;
    `;
    const campaignResult = await pool.query(campaignQuery, [router.id, router.group_id]);

    if (campaignResult.rows.length === 0) {
        console.log(`[CampaignService] Nenhuma campanha ativa para '${routerName}'.`);
        return campaignData; // Retorna padrão se não houver campanha
    }

    const activeCampaign = campaignResult.rows[0];
    console.log(`[CampaignService] Campanha encontrada: "${activeCampaign.name}"`);

    const templateQuery = `
        SELECT 
            t.*, -- Pega todos os campos do template
            b_post.image_url AS post_login_banner_url,
            b_post.target_url AS post_login_target_url
        FROM templates t
        LEFT JOIN banners AS b_post ON t.postlogin_banner_id = b_post.id AND b_post.type = 'post-login' AND b_post.is_active = true
        WHERE t.id = $1;
    `;
    const templateResult = await pool.query(templateQuery, [activeCampaign.template_id]);

    if (templateResult.rows.length > 0) {
        const templateData = templateResult.rows[0];
        campaignData.use_default = false;

        // [NOVO] Constrói o objeto de template para a resposta da API
        campaignData.template = {
            primaryColor: templateData.primary_color,
            statusTitle: templateData.status_title,
            statusMessage: templateData.status_message,
            // Constrói a URL completa para o logo de status, com fallback para o logo principal
            statusLogoUrl: templateData.status_logo_url || templateData.logo_url || null,
            // [NOVO] Adiciona os novos campos de personalização
            statusBgColor: templateData.status_bg_color,
            statusBgImageUrl: templateData.status_bg_image_url || null,
            statusH1FontSize: templateData.status_h1_font_size,
            statusPFontSize: templateData.status_p_font_size,
        };

        if (templateData.post_login_banner_url) {
            // [CORRIGIDO] Envolve em array para padronizar com o frontend
            campaignData.postLoginBanners = [{
                imageUrl: templateData.post_login_banner_url,
                targetUrl: templateData.post_login_target_url
            }];
        }
    }

    return campaignData;
};

/**
 * [NOVO] Obtém os dados de uma campanha específica para pré-visualização,
 * ignorando se está ativa ou não.
 * @param {number} campaignId - O ID da campanha a ser pré-visualizada.
 */
const getCampaignPreviewData = async (campaignId) => {

    // [CORRIGIDO] Busca configurações gerais para evitar erro no frontend (loginPageSettings)
    const settingsResult = await pool.query('SELECT * FROM system_settings WHERE id = 1');
    const loginPageSettings = settingsResult.rows[0] || {};

    let campaignData = {
        use_default: true,
        template: null,
        postLoginBanners: [], // [CORRIGIDO] Array para compatibilidade com o loader
        loginPageSettings: loginPageSettings, // [CORRIGIDO] Necessário para o loader
        campaign: null // [CORRIGIDO] Necessário para o loader
    };

    const campaignResult = await pool.query('SELECT * FROM campaigns WHERE id = $1', [campaignId]);

    if (campaignResult.rows.length === 0) {
        console.log(`[CampaignService-Preview] Campanha com ID '${campaignId}' não encontrada.`);
        return campaignData;
    }

    const campaign = campaignResult.rows[0];
    campaignData.campaign = { id: campaign.id, name: campaign.name }; // [CORRIGIDO] Preenche dados da campanha

    const templateQuery = `
        SELECT 
            t.*, -- Pega todos os campos do template
            b_pre.image_url AS pre_login_banner_url,
            b_pre.target_url AS pre_login_target_url,
            b_post.image_url AS post_login_banner_url,
            b_post.target_url AS post_login_target_url
        FROM templates t
        LEFT JOIN banners AS b_pre ON t.prelogin_banner_id = b_pre.id AND b_pre.type = 'pre-login'
        LEFT JOIN banners AS b_post ON t.postlogin_banner_id = b_post.id AND b_post.type = 'post-login'
        WHERE t.id = $1;
    `;
    const templateResult = await pool.query(templateQuery, [campaign.template_id]);

    if (templateResult.rows.length > 0) {
        const templateData = templateResult.rows[0];
        campaignData.use_default = false;

        // [CORRIGIDO] Adiciona a lógica para o banner de PRÉ-LOGIN na pré-visualização
        if (templateData.pre_login_banner_url) {
            campaignData.preLoginBanner = {
                imageUrl: templateData.pre_login_banner_url,
                targetUrl: templateData.pre_login_target_url
            };
        }

        // [CORRIGIDO] Monta o objeto de template COMPLETO, incluindo dados de login e status.
        campaignData.template = {
            // --- Dados para a página de LOGIN ---
            loginType: templateData.login_type,
            primaryColor: templateData.primary_color,
            fontColor: templateData.font_color,
            fontSize: templateData.font_size,
            formBackgroundColor: templateData.form_background_color,
            fontFamily: templateData.font_family,
            backgroundUrl: templateData.login_background_url || null,
            logoUrl: templateData.logo_url || null,

            // --- Dados para a página de STATUS ---
            statusTitle: templateData.status_title,
            statusMessage: templateData.status_message,
            statusLogoUrl: templateData.status_logo_url || templateData.logo_url || null,
            statusBgColor: templateData.status_bg_color,
            statusBgImageUrl: templateData.status_bg_image_url || null,
            statusH1FontSize: templateData.status_h1_font_size,
            statusPFontSize: templateData.status_p_font_size,
        };

        if (templateData.post_login_banner_url) {
            // [CORRIGIDO] Envolve em array para corresponder à expectativa do frontend (postLoginBanners)
            campaignData.postLoginBanners = [{
                imageUrl: templateData.post_login_banner_url,
                targetUrl: templateData.post_login_target_url
            }];
        }
    }
    return campaignData;
};

module.exports = { getActiveCampaignData, getCampaignPreviewData };
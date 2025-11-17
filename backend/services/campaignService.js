// Ficheiro: backend/services/campaignService.js
const pool = require('../connection');

const getActiveCampaignData = async (routerName) => {
    const admServerUrl = `http://${process.env.SERVER_IP || '127.0.0.1'}:${process.env.PORT || 3000}`;

    let campaignData = {
        use_default: true,
        template: null, // [NOVO]
        postLoginBanner: null,
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
            statusLogoUrl: (templateData.status_logo_url || templateData.logo_url)
                ? ((templateData.status_logo_url || templateData.logo_url).startsWith('http')
                    ? (templateData.status_logo_url || templateData.logo_url)
                    : `${admServerUrl}${(templateData.status_logo_url || templateData.logo_url)}`)
                : null,
            // [NOVO] Adiciona os novos campos de personalização
            statusBgColor: templateData.status_bg_color,
            statusBgImageUrl: templateData.status_bg_image_url
                ? (templateData.status_bg_image_url.startsWith('http')
                    ? templateData.status_bg_image_url
                    : `${admServerUrl}${templateData.status_bg_image_url}`)
                : null,
            statusH1FontSize: templateData.status_h1_font_size,
            statusPFontSize: templateData.status_p_font_size,
        };

        if (templateData.post_login_banner_url) {
            const imageUrl = templateData.post_login_banner_url.startsWith('http')
                ? templateData.post_login_banner_url
                : `${admServerUrl}${templateData.post_login_banner_url}`;

            campaignData.postLoginBanner = {
                imageUrl: imageUrl,
                targetUrl: templateData.post_login_target_url
            };
        }
    }

    return campaignData;
};

module.exports = { getActiveCampaignData };
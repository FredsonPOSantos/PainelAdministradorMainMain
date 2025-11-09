const pool = require('../connection');

async function checkSystemSettings() {
    try {
        const result = await pool.query('SELECT * FROM system_settings WHERE id = 1');
        
        if (result.rows.length === 0) {
            console.log('❌ Nenhuma configuração encontrada na tabela system_settings');
            return;
        }

        console.log('📋 Configurações atuais:');
        console.log(JSON.stringify(result.rows[0], null, 2));

        // Verificar URLs dos arquivos
        const files = {
            'Logo da empresa': result.rows[0].logo_url,
            'Logo de login': result.rows[0].login_logo_url,
            'Imagem de fundo': result.rows[0].background_image_url
        };

        console.log('\n🔍 Verificando arquivos:');
        for (const [name, url] of Object.entries(files)) {
            if (!url) {
                console.log(`⚠️  ${name}: URL não definida`);
                continue;
            }
            
            const filePath = `../public${url}`;
            console.log(`📁 ${name}: ${url}`);
        }

    } catch (error) {
        console.error('❌ Erro ao verificar configurações:', error);
    } finally {
        await pool.end();
    }
}

checkSystemSettings();
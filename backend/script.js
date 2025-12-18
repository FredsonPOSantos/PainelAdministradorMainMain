const pool = require('./connection');
const fs = require('fs');
const path = require('path');

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
            'Imagem de fundo': result.rows[0].background_image_url,
            // [NOVO] Verificação específica do arquivo que deu erro no seu log
            'Arquivo de Campanha (Teste)': '/uploads/logo_hotspot/hotspot-logoFile-1766023572411-473726796.png'
        };

        console.log('\n🔍 Verificando arquivos:');
        for (const [name, url] of Object.entries(files)) {
            if (!url) {
                console.log(`⚠️  ${name}: URL não definida`);
                continue;
            }
            
            // Verifica em ambos os locais possíveis (dentro do backend ou na raiz)
            const pathsToCheck = [
                path.join(__dirname, 'public', url),    // backend/public/...
                path.join(__dirname, '../public', url)  // raiz/public/...
            ];

            let found = false;
            for (const p of pathsToCheck) {
                if (fs.existsSync(p)) {
                    console.log(`✅ ${name}: ENCONTRADO em:\n   -> ${p}`);
                    found = true;
                    break;
                }
            }

            if (!found) {
                console.log(`❌ ${name}: NÃO ENCONTRADO no disco! (URL: ${url})`);
                console.log(`   Tentado em:\n   - ${pathsToCheck.join('\n   - ')}`);
            }
        }

    } catch (error) {
        console.error('❌ Erro ao verificar configurações:', error);
    } finally {
        await pool.end();
    }
}

checkSystemSettings();
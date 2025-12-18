Guia de Implantação Unificado para Servidores MX Linux
Arquitetura de Servidores:

Servidor de Serviço: 10.0.0.45 (PostgreSQL & FreeRADIUS)
Servidor Portal Hotspot: 10.0.0.46 (Aplicação Node.js virada para o cliente)
Servidor Painel Administrador: 10.0.0.47 (API de gestão e servidor de imagens)
Parte 1: Preparação Comum para os Servidores de Aplicação (10.0.0.46 e 10.0.0.47)
Execute estes passos em ambos os servidores MX Linux.

1.1. Atualizar o Sistema e Instalar Dependências Essenciais
Mantenha o sistema atualizado e instale ferramentas básicas de compilação, git e o curl.

bash
# Atualiza a lista de pacotes e o sistema
sudo apt update && sudo apt upgrade -y

# Instala ferramentas essenciais
sudo apt install -y build-essential git curl ufw
1.2. Instalar Node.js usando NVM (Node Version Manager)
O NVM permite gerir múltiplas versões do Node.js de forma fácil e segura.

bash
# Baixa e executa o script de instalação do NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Carrega o NVM no terminal atual
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Instala uma versão LTS (Long Term Support) do Node.js (ex: v20)
nvm install --lts

# Define a versão LTS como padrão
nvm use --lts
Nota: Feche e reabra o seu terminal para garantir que o nvm esteja disponível.

1.3. Instalar o Gestor de Processos PM2
O PM2 é essencial para manter as suas aplicações Node.js a rodar continuamente em produção.

bash
# Instala o PM2 globalmente
npm install pm2 -g
1.4. Configurar o Firewall (UFW)
Vamos configurar o firewall para permitir apenas as conexões necessárias.

bash
# Permite conexões SSH (essencial para não perder o acesso)
sudo ufw allow ssh

# Habilita o firewall
sudo ufw enable
As portas específicas de cada aplicação (3000 e 3001) serão abertas mais à frente.

Parte 2: Implantação do Servidor Painel Administrador (10.0.0.47)
Este servidor é a API central e o repositório de imagens.

2.1. Clonar o Repositório
bash
# Clone o projeto para o seu diretório home (ou outro de sua preferência)
git clone <URL_DO_SEU_REPOSITORIO_ADMIN> PainelAdministradorMain-master
cd PainelAdministradorMain-master/backend
2.2. Configurar o Firewall
bash
# Permite o acesso à porta da aplicação (3000)
sudo ufw allow 3000/tcp
2.3. Criar o Ficheiro de Ambiente (.env)
Dentro da pasta PainelAdministradorMain-master/backend, crie o ficheiro .env.

bash
nano .env
Cole o seguinte conteúdo, ajustando os valores secretos:

env
# Ficheiro: PainelAdministradorMain-master/backend/.env

# Configurações do Servidor
PORT=3000

# Configurações da Base de Dados (Aponta para o servidor de serviço)
DB_HOST=10.0.0.45
DB_PORT=5432
DB_USER=radius
DB_PASSWORD=sua_senha_segura_do_banco
DB_DATABASE=radius

# Segredos da Aplicação
JWT_SECRET=crie_um_segredo_forte_e_aleatorio_aqui

# Configurações de Email (Exemplo para Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=seu_email@gmail.com
EMAIL_PASS=sua_senha_de_app_do_gmail
EMAIL_FROM='"Seu Nome" <seu_email@gmail.com>'
2.4. Instalar Dependências e Iniciar a Aplicação
bash
# Instala os pacotes do package.json
npm install

# Inicia a aplicação com o PM2
pm2 start server.js --name "Admin-API"

# Salva a lista de processos do PM2 para reiniciar automaticamente
pm2 save

# Gera o comando para iniciar o PM2 no boot do sistema e executa-o
pm2 startup
# (Copie e cole o comando que o pm2 gerar)
Parte 3: Implantação do Servidor Portal Hotspot (10.0.0.46)
Este servidor renderiza a página que o cliente final vê.

3.1. Clonar o Repositório
bash
# Clone o projeto para o seu diretório home
git clone <URL_DO_SEU_REPOSITORIO_HOTSPOT> rota-hotspot-WSL-Debian-ap-main
cd rota-hotspot-WSL-Debian-ap-main/backend
3.2. Configurar o Firewall
bash
# Permite o acesso à porta da aplicação (3001)
sudo ufw allow 3001/tcp
3.3. Criar o Ficheiro de Ambiente (.env)
Dentro da pasta rota-hotspot-WSL-Debian-ap-main/backend, crie o ficheiro .env. Esta é a configuração mais crítica.

bash
nano .env
Cole o seguinte conteúdo:

env
# Ficheiro: rota-hotspot-WSL-Debian-ap-main/backend/.env

# Configurações do Servidor
PORT=3001

# Configurações da Base de Dados (Aponta para o servidor de serviço)
DB_HOST=10.0.0.45
DB_PORT=5432
DB_USER=radius
DB_PASSWORD=sua_senha_segura_do_banco
DB_DATABASE=radius

# === IMPORTANTE: Aponta para o Servidor de Administração (de onde vêm as imagens) ===
ADM_SERVER_IP=10.0.0.47
ADM_SERVER_PORT=3000
3.4. Instalar Dependências e Iniciar a Aplicação
bash
# Instala os pacotes do package.json
npm install

# Inicia a aplicação com o PM2
pm2 start server.js --name "Hotspot-Portal"

# Salva e configura o PM2 para o boot
pm2 save
pm2 startup
# (Copie e cole o comando que o pm2 gerar)
Parte 4: Configuração do Mikrotik (Walled Garden)
Isto é essencial para que os clientes não autenticados possam carregar a página de login e as imagens da campanha.

Aceda ao seu Mikrotik (via WinBox ou terminal).

Vá para IP -> Hotspot.

Selecione o seu perfil de servidor Hotspot e vá para a aba Walled Garden.

Adicione as seguintes regras para libertar o acesso aos seus servidores:

Libertar o Servidor do Portal: Dst. Address: 10.0.0.46
Libertar o Servidor de Imagens (Admin): Dst. Address: 10.0.0.47
Comando de terminal (exemplo):

mikrotik
/ip hotspot walled-garden
add dst-address=10.0.0.46 comment="Servidor Portal Hotspot"
add dst-address=10.0.0.47 comment="Servidor Admin (Imagens)"
Parte 5: Modificação Futura (Centralização da Lógica)
Conforme solicitado, aqui está a sugestão de melhoria para o futuro, já comentada. Quando decidir implementar, você aplicará esta alteração no server.js do Portal Hotspot.

server.js
-0
+21
        } 
        // --- FIM DA LÓGICA DE PRÉ-VISUALIZAÇÃO ---
        else if (routerName) {
            /*
            // --- [MODIFICAÇÃO FUTURA] ---
            // No futuro, para centralizar a lógica, podemos substituir a query direta
            // por uma chamada de API ao servidor Admin, similar ao modo de pré-visualização.
            // Isso tornaria o Portal Hotspot mais "burro" e o Admin mais "inteligente".
            
            console.log(`[SRV-HOTSPOT] Buscando campanha via API para o roteador: ${routerName}`);
            const campaignApiUrl = `${campaignData.admServerUrl}/api/public/campaign-by-router?routerName=${routerName}`;
            const apiResponse = await fetch(campaignApiUrl);

            if (apiResponse.ok) {
                const liveCampaignData = await apiResponse.json();
                if (liveCampaignData && !liveCampaignData.use_default) {
                    campaignData = { ...campaignData, ...liveCampaignData }; // Mescla os dados da API
                }
            } else {
                console.error(`[SRV-HOTSPOT] Erro ao buscar dados de campanha via API: ${apiResponse.statusText}`);
            }
            // --- FIM DA MODIFICAÇÃO FUTURA ---
            */

            // --- LÓGICA NORMAL (EXISTENTE) ---
            console.log(`[SRV-HOTSPOT] Modo Normal para Roteador: ${routerName}`);
            const routerResult = await pool.query('SELECT id, group_id FROM routers WHERE name = $1', [routerName]);

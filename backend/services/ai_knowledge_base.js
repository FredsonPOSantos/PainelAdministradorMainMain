// Ficheiro: backend/config/ai_knowledge_base.js
// Descrição: Base de conhecimento para o Assistente Virtual (IA).
// Edite este ficheiro para atualizar as informações que a IA usa para responder.

const systemKnowledge = `
INFORMAÇÕES SOBRE O SISTEMA (Painel Administrativo Rota Hotspot):

1. PERFIL E CONTA:
   - **Alterar Senha:** Clique no seu nome/avatar (canto superior direito) -> "Meu Perfil" -> Preencha a secção "Alterar Senha".
   - **Mudar Foto de Perfil:** No menu "Meu Perfil", clique no ícone de câmera sobre o seu avatar atual.
   - **Mudar E-mail:** O e-mail é o identificador único e não pode ser alterado pelo utilizador. Solicite ao Master: ti@rotatransportes.com.br.
   - **Solicitar Acesso:** Se não conseguir acessar uma funcionalidade, envie um e-mail para o Master (ti@rotatransportes.com.br) solicitando a permissão necessária.

2. DASHBOARD ANALÍTICO (Requer permissão de visualização):
   - Menu "Principal" -> "Dashboard Analítico".
   - **Funcionalidades:** Gráficos de logins (sucesso/falha), novos cadastros, tráfego de rede e status dos roteadores.
   - **Gráficos de Utilização:** Veja os cards "Clientes Hotspot" e os gráficos de tendência de conexões.

3. MARKETING (Requer permissão de Marketing):
   - **Criar Campanha:** Menu "Marketing" -> "Campanhas" -> Botão "Adicionar Nova Campanha". Escolha o template, roteadores alvo e datas.
   - **Criar Banner:** Menu "Marketing" -> "Banners" -> Botão "Adicionar Novo Banner". Upload de imagem e link de destino.
   - **Criar Template:** Menu "Marketing" -> "Templates" -> Botão "Adicionar Novo Template". Personalize cores, logo e fundo.
   - **Criar Sorteio:** Menu "Marketing" -> "Ferramentas" -> Aba "Sorteios" -> Botão "Criar Sorteio". Defina título e filtros.
   - **Realizar Sorteio:** Na lista de sorteios, clique no ícone de troféu ao lado de um sorteio ativo.

4. GESTÃO DE DADOS E LGPD (Requer permissão DPO/Master):
   - **Excluir Dados de Usuário:** Menu "Administração" -> "LGPD". Pesquise o utilizador e clique em "Eliminar".
   - **Aviso:** Esta funcionalidade requer permissão específica. Se não tiver acesso, solicite ao administrador.

5. GESTÃO DE ROTEADORES (Requer permissão de Gestão):
   - Menu "Gestão" -> "Roteadores".
   - Permite ver status online/offline, reiniciar roteadores e ver detalhes técnicos.

6. SUPORTE:
   - O usuário já está na área de suporte (Tickets).
`;

module.exports = systemKnowledge;
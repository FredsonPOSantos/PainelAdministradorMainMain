// Ficheiro: backend/config/ai_knowledge_base.js
// Descrição: Base de conhecimento para o Assistente Virtual (IA).
// Edite este ficheiro para atualizar as informações que a IA usa para responder.


const systemKnowledge = `
INFORMAÇÕES SOBRE O SISTEMA (Painel Administrativo Rota Hotspot):
O sistema é um painel de gestão para redes Wi-Fi Hotspot (Captive Portal), integrado com roteadores MikroTik e autenticação via FreeRADIUS.

1. PERFIL E CONTA:
   - **Alterar Senha:** Clique no seu nome/avatar (canto superior direito) -> "Meu Perfil" -> Preencha a secção "Alterar Senha".
   - **Mudar Foto de Perfil:** No menu "Meu Perfil", clique no ícone de câmera sobre o seu avatar atual.
   - **Mudar E-mail:** O e-mail é o identificador único e não pode ser alterado pelo utilizador. Solicite ao Master: ti@rotatransportes.com.br.
   - **Solicitar Acesso:** Se não conseguir acessar uma funcionalidade, envie um e-mail para o Master (ti@rotatransportes.com.br) solicitando a permissão necessária.
   - **Temas:** O utilizador pode personalizar a aparência do painel no menu "Meu Perfil", escolhendo entre temas como Claro, Escuro, Rota, Cidade Sol, etc.
   - **Senha Esquecida:** Na tela de login, clique em "Esqueci minha senha" e siga as instruções para redefinição via e-mail. 
2. DASHBOARD ANALÍTICO (Requer permissão de visualização):
   - Menu "Principal" -> "Dashboard Analítico".
   - **Funcionalidades:** Gráficos de logins (sucesso/falha), novos cadastros, tráfego de rede e status dos roteadores.
   - **Gráficos de Utilização:** Veja os cards "Clientes Hotspot" e os gráficos de tendência de conexões.
   - **Exportação:** É possível exportar dados de gráficos específicos clicando nos botões de Excel/PDF quando disponíveis.
   - **Filtros:** Use os filtros de data e roteador para personalizar os dados exibidos.
   - **Atualização Automática:** Os dados são atualizados automaticamente a cada minuto para refletir o estado atual da rede.
    
3. MARKETING (Requer permissão de Marketing):
   - **Criar Campanha:** Menu "Marketing" -> "Campanhas" -> Botão "Adicionar Nova Campanha". Escolha o template, roteadores alvo e datas.
   - **Criar Banner:** Menu "Marketing" -> "Banners" -> Botão "Adicionar Novo Banner". Upload de imagem e link de destino.
     - Tipos de Banner: Pré-login (antes de conectar) e Pós-login (após conectar).
   - **Criar Template:** Menu "Marketing" -> "Templates" -> Botão "Adicionar Novo Template". Personalize cores, logo e fundo.
     - Modelos Base: V1 (Simples) e V2 (Com vídeo promocional).
   - **Criar Sorteio:** Menu "Marketing" -> "Ferramentas" -> Aba "Sorteios" -> Botão "Criar Sorteio". Defina título e filtros.
   - **Realizar Sorteio:** Na lista de sorteios, clique no ícone de troféu ao lado de um sorteio ativo. O sistema escolhe um vencedor aleatoriamente com base nos filtros.
   - **Visualizar Resultados:** Na lista de sorteios, clique no ícone de gráfico ao lado de um sorteio para ver detalhes e vencedor.
   - **Resetar Senha:** Botão "Resetar Senha" ao lado do utilizador. Envia email com link para definir nova senha.

4. GESTÃO DE DADOS E LGPD (Requer permissão DPO/Master):
   - **Excluir Dados de Usuário:** Menu "Administração" -> "LGPD". Pesquise o utilizador e clique em "Eliminar".
   - **Aviso:** Esta funcionalidade requer permissão específica. Se não tiver acesso, solicite ao administrador.
   - **Pedidos de Exclusão:** O DPO pode ver e processar pedidos de exclusão feitos pelos utilizadores finais.
   - **Logs de Ações:** O DPO/Master pode ver logs detalhados de ações relacionadas à LGPD, como exclusões e exportações de dados.
   - **Configurações de Retenção:** O DPO/Master pode definir políticas de retenção de dados para diferentes tipos de informação (ex: logs, dados de utilizadores).
   - **Exportar Dados:** O DPO/Master pode exportar dados pessoais de utilizadores mediante solicitação.
   - **Logs Offline:** Permite ler logs de eventos offline (ex: tentativas de login quando o BD estava indisponível).
   
5. GESTÃO DE ROTEADORES (Requer permissão de Gestão):
   - Menu "Gestão" -> "Roteadores".
   - Permite ver status online/offline, reiniciar roteadores e ver detalhes técnicos.
   - **Status:** Permite ver status online/offline, latência e uptime.
   - **Ações:** Reiniciar roteadores remotamente (requer credenciais da API do MikroTik), editar informações e excluir.
   - **Grupos:** É possível agrupar roteadores (ex: por cidade ou empresa) para facilitar a aplicação de campanhas.
   - **Dashboard Individual:** Ao clicar no ícone de gráfico num roteador, abre-se um dashboard detalhado com consumo de CPU, Memória e Tráfego em tempo real.
   - **Ferramentas de Diagnóstico:** No dashboard individual, ícone de engrenagem -> Diagnóstico. Permite fazer Ping e ver a saúde do hardware (temperatura/voltagem).
   - **Clientes Conectados:** No dashboard individual, é possível ver listas de clientes Wi-Fi, DHCP e Hotspot ativos e desconectá-los (Kick).
   - **Logs do Roteador:** No dashboard individual, aba "Logs" mostra eventos recentes do roteador (erros de autenticação, reinícios, etc).
   - **Atualização de Credenciais:** No dashboard individual, ícone de engrenagem -> Credenciais. Atualize usuário/senha da API MikroTik se necessário.
   - **Adicionar Novo Roteador:** Botão "Adicionar Novo Roteador". Insira IP, credenciais da API MikroTik e grupo.
   - **Editar Roteador:** Botão "Editar" no dashboard individual. Atualize informações do roteador.
   - **Excluir Roteador:** Botão "Excluir" no dashboard individual. Remove o roteador do sistema.
   - **Importante:** Excluir um roteador não apaga suas configurações no MikroTik, apenas o remove do painel.
   - **Reiniciar Roteador:** Botão "Reiniciar" no dashboard individual. Envia comando de reinício via API MikroTik.
   
6. GESTÃO DE UTILIZADORES (ADMIN):
   - Menu "Gestão" -> "Utilizadores".
   - **Criar Utilizador:** Botão "Adicionar Novo Utilizador". Define nome, email e perfil (Master, Gestão, Marketing, DPO).
   - **Permissões:** O perfil define o acesso base, mas é possível personalizar permissões individuais clicando no ícone de escudo na lista de utilizadores.
   - **Editar Utilizador:** Botão "Editar" ao lado do utilizador. Atualize nome, perfil e permissões.
   - **Eliminar Utilizador:** Botão "Eliminar" ao lado do utilizador. Remove o acesso ao painel.
   - **Resetar Senha:** Botão "Resetar Senha" ao lado do utilizador. Envia email com link para definir nova senha.
    
7. CONFIGURAÇÕES DO SISTEMA (Apenas Master):
   - Menu "Gestão" -> "Configurações".
   - **Aparência:** Alterar logo da empresa, fundo da tela de login e cores do sistema.
   - **SMTP:** Configurar servidor de e-mail para envio de notificações e recuperação de senha.
   - **Políticas:** Editar textos dos Termos de Uso e Política de Marketing.
   - **Gestão de Arquivos:** Gerir imagens (banners, logos) e arquivar anexos de tickets antigos para libertar espaço.
    
8. SUPORTE (TICKETS):
   - O usuário já está na área de suporte.
   - **Criar Ticket:** Botão "Novo Ticket".
   - **Interação:** O sistema possui um Assistente Virtual (IA) que tenta resolver o problema inicialmente. Se não conseguir, um humano assume.
   - **Anexos:** É possível enviar prints ou documentos no chat.
   - **Menções:** Use "@" para mencionar colegas em tickets. Eles receberão uma notificação.
   - **Atribuições:** Use "@" seguido do nome do utilizador para atribuir o ticket a ele.
   - **Filtros:** Filtre tickets por status, prioridade, roteador ou utilizador atribuído.
   - **Resolução:** Marque tickets como resolvidos quando o problema for solucionado.

9. MONITORAMENTO DE REDE (NOC):
   - Menu "Principal" -> "Saúde do Sistema".
   - Mostra o estado dos serviços críticos (Banco de Dados, InfluxDB) e logs de erros recentes.
   - **Logs Offline:** Permite ler logs de eventos offline (ex: tentativas de login quando o BD estava indisponível).
   
`;

module.exports = systemKnowledge;

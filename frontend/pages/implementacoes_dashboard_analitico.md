# Futuras Implementações para o Dashboard Analítico

Este documento serve como um roteiro para futuras melhorias e adição de novos cards interativos ao Dashboard Analítico. As sugestões abaixo foram baseadas na análise da estrutura atual do sistema e visam extrair o máximo de valor dos dados coletados.

---

### 1. Atividade e Saúde do Sistema

#### **Card: Atividade dos Administradores**
- **Métricas no Card:**
  - **Ações nas últimas 24h:** Contagem de todas as linhas na tabela `audit_logs` do último dia.
  - **Admin mais ativo:** O `user_email` com mais ações.
- **Detalhes (ao clicar):**
  - **Gráfico de Ações por Hora:** Um gráfico de barras mostrando a distribuição de atividades ao longo do dia.
  - **Tabela de Ações Recentes:** Focada em ações de gestão (ex: `USER_CREATED`, `ROUTER_UPDATED`, `CAMPAIGN_DELETED`).
  - **Filtros:** Por tipo de ação (Criação, Edição, Exclusão), por administrador.
- **Valor:** Oferece uma visão rápida sobre o uso do painel, ajudando a identificar picos de atividade e quem são os administradores mais engajados.

#### **Card: Saúde do Servidor e Serviços**
- **Métricas no Card:**
  - **Uptime do Servidor:** `99.98%` (Calculado com base em logs de inicialização/parada ou uma ferramenta externa).
  - **Status do RADIUS:** `Online` (Uma nova rota no backend que tenta comunicar com o serviço FreeRADIUS).
- **Detalhes (ao clicar):**
  - **Gráfico de Uptime Histórico:** Linha do tempo mostrando a disponibilidade do serviço nos últimos 30 dias.
  - **Tabela de Eventos de Serviço:** Registos de quando o servidor reiniciou, o serviço RADIUS parou, etc.
- **Valor:** Essencial para o administrador `master` monitorar a estabilidade da infraestrutura que suporta todo o sistema.

---

### 2. Análise de Marketing e Campanhas

#### **Card: Engajamento com Campanhas**
- **Métricas no Card:**
  - **Campanhas Ativas:** Contagem de campanhas com data atual entre `start_date` e `end_date`.
  - **Visualizações Totais:** Soma de visualizações de todas as campanhas (exigiria uma nova coluna no DB para contagem).
- **Detalhes (ao clicar):**
  - **Gráfico de Desempenho:** Gráfico de barras comparando as campanhas mais visualizadas.
  - **Tabela de Campanhas:** Lista de todas as campanhas com métricas individuais (visualizações, período, status).
- **Valor:** Fornece ao gestor de marketing uma visão clara do desempenho das campanhas ativas.

#### **Card: Performance de Sorteios (Ferramentas)**
- **Métricas no Card:**
  - **Sorteios Ativos:** Contagem de sorteios ativos.
  - **Participantes Únicos (30d):** Contagem de participantes únicos nos últimos 30 dias.
- **Detalhes (ao clicar):**
  - **Gráfico de Participação Diária:** Mostra quantos novos participantes se inscreveram a cada dia.
  - **Tabela de Últimos Vencedores:** A tabela que removemos anteriormente, agora no seu devido lugar.
  - **Tabela de Sorteios Populares:** Ranking dos sorteios com mais participantes.
- **Valor:** Mede o sucesso das iniciativas de gamificação e engajamento, mostrando o que atrai mais os utilizadores.

---

### 3. Análise Geográfica e de Rede

#### **Card: Distribuição Geográfica de Acessos**
- **Métricas no Card:**
  - **Top Cidade:** `São Paulo`
  - **Top Estado:** `SP`
- **Detalhes (ao clicar):**
  - **Mapa Interativo:** Um mapa do Brasil (ou do mundo) mostrando "heat spots" (pontos de calor) de onde vêm os acessos dos utilizadores do hotspot. (Isto requer uma API de geolocalização por IP).
  - **Tabela de Acessos por Região:** Uma lista de cidades/estados e a contagem de utilizadores em cada um.
- **Valor:** Oferece insights poderosos sobre a expansão da sua rede e onde a sua base de utilizadores está concentrada.
# Guia de Implementação: Funcionalidade "Meu Perfil" (v2)

## Visão Geral
Implementação de uma área pessoal para cada administrador, permitindo a gestão de dados próprios e personalização visual (temas) sem afetar a configuração global do sistema.

## Regras de Negócio
1. **Isolamento de Temas:** A escolha do tema é salva nas preferências do utilizador (`admin_users`) e aplicada apenas à sua sessão.
2. **Temas Estáticos:** Os temas são predefinidos no CSS e não editáveis via interface.
3. **Identidade Corporativa:** O logótipo principal do grupo (`#headerLogo`) é imutável e persiste independentemente do tema.

## Interface Gráfica (GUI)

### 1. Cabeçalho da Página
* **Botão Voltar:** `<i class="fas fa-arrow-left"></i> Voltar ao Dashboard` (Canto superior esquerdo).
* **Título:** "Meu Perfil" (Centralizado).

### 2. Secção: Dados Pessoais
*(Layout: Card grande e limpo)*

* **Avatar (Esquerda):**
    * Círculo grande com a foto atual ou iniciais.
    * **Interação:** Hover exibe ícone de câmera para upload (`<i class="fas fa-camera"></i>`).
* **Formulário (Direita):**
    * **Nome Completo:** Input texto (Editável).
    * **E-mail:** Input texto (Somente leitura, fixo).
    * **Telefone:** Input texto (Editável).
    * **Setor:** Input texto (Editável).
* **Ações:**
    * Botão Inicial: `<i class="fas fa-pencil-alt"></i> Editar Dados`.
    * Modo Edição: Botões "Salvar Alterações" (Primário) e "Cancelar" (Secundário).

### 3. Secção: Aparência do Sistema
*(Layout: Card abaixo dos dados pessoais)*

* **Título:** "Tema Visual"
* **Descrição:** "Escolha um tema para personalizar a sua experiência. Esta alteração afeta apenas a sua visualização."
* **Seletor (Grid de Cartões):**
    * **Padrão do Sistema:** Preview das cores globais atuais.
    * **Claro (Light):** Fundo branco, texto escuro.
    * **Escuro (Dark):** Tema atual (conforto visual).
    * **Oceano:** Tons de azul profundo e ciano.
    * **Tema Rota:** Rosa/Vermelho e Roxo (`#dc335c`, `#6c5ca4`, `#e04460`, `#7a00df`).
    * **Tema Cidade Sol:** Amarelo e Azul (`#f5de15`, `#212837`, `#86a9c9`, `#54698d`).
    * **Tema Expresso Brasileiro:** Amarelo e Azul Petróleo (`#F2CE1B`, `#45637a`, `#97b6e4`, `#4c6c7c`).
* **Interação:** Seleção via `radio button`. Salva e aplica automaticamente ao clicar.

### 4. Secção: Segurança
*(Layout: Card focado)*

* **Título:** "Alterar Senha"
* **Campos:**
    * Senha Atual
    * Nova Senha
    * Confirmar Nova Senha
* **Ação:** Botão "Alterar Minha Senha".

## Requisitos Técnicos para Implementação Futura

1. **Banco de Dados (`admin_users`):**
   * Adicionar colunas: `avatar_url`, `phone`, `sector`, `theme_preference`.
2. **Frontend:**
   * Criar `pages/admin_profile.html`.
   * Criar `js/admin_profile.js`.
3. **CSS (`admin_style.css`):**
   * Criar classes de escopo no `body` (ex: `body.theme-rota`) para redefinir variáveis CSS de cores.

# Guia de Implementação: Gestão de Perfis Personalizados (Roles)

## Visão Geral
Atualmente, o sistema possui perfis fixos (Master, Gestão, Marketing/Estética, DPO). Esta implementação visa permitir a criação dinâmica de novos perfis (ex: "Suporte Nível 1", "Financeiro") com conjuntos de permissões personalizados, sem necessidade de alterar o código.

## 1. Banco de Dados

### Nova Tabela: `roles`
Para gerir os perfis dinamicamente, é recomendável criar uma tabela dedicada.

```sql
CREATE TABLE roles (
    slug VARCHAR(50) PRIMARY KEY, -- ex: 'suporte_nv1'
    name VARCHAR(100) NOT NULL,   -- ex: 'Suporte Nível 1'
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE -- Protege perfis padrão contra exclusão
);

-- Inserir perfis atuais como sistema (não removíveis)
INSERT INTO roles (slug, name, description, is_system) VALUES
('master', 'Master', 'Acesso total ao sistema', TRUE),
('gestao', 'Gestão', 'Gestão de roteadores e usuários', TRUE),
('estetica', 'Marketing', 'Gestão de campanhas e banners', TRUE),
('DPO', 'DPO', 'Encarregado de Proteção de Dados', TRUE);
```

## 2. Backend (API)

### Novos Endpoints (`RoleController`)
*   `GET /api/roles`: Retorna lista de perfis disponíveis.
*   `POST /api/roles`: Cria um novo perfil.
*   `DELETE /api/roles/:slug`: Remove um perfil (validar se `is_system` é false e se não há usuários vinculados).

## 3. Frontend

### Página de Configurações (Aba Permissões)
*   **Botão "Novo Perfil":** Adicionar ao lado do seletor de funções.
*   **Matriz Dinâmica:** O seletor de funções para edição de permissões deve ser populado via API (`/api/roles`) em vez de opções fixas.

### Página de Utilizadores (Modal Adicionar/Editar)
*   **Dropdown de Função:**
    *   Remover opções hardcoded (`<option value="gestao">...`).
    *   Usar JavaScript para buscar `/api/roles` e preencher o `<select>` dinamicamente.

# Guia de Implementação: Gráfico de Utilizadores por Roteador (dentro de um Grupo)

## Visão Geral
Criar uma visualização gráfica que, para um grupo selecionado, mostre a distribuição de utilizadores entre os roteadores que compõem esse grupo.

## 1. Backend (API)

### Novo Endpoint: `GET /api/analytics/group/:groupId/router-users`
*   **Objetivo:** Retornar a contagem de utilizadores para cada roteador pertencente a um grupo específico.
*   **Lógica:**
    1.  Receber o `:groupId` da URL.
    2.  Buscar todos os roteadores (`routers`) que têm `group_id = :groupId`.
    3.  Para cada roteador encontrado, contar quantos registos existem em `userdetails` onde `router_name` corresponde ao nome do roteador.
    4.  Retornar um array de objetos, ex: `[{ router_name: 'RT-001', user_count: 150 }, { router_name: 'RT-002', user_count: 210 }]`.

## 2. Frontend

### Página de Roteadores (ou Dashboard Analítico)
*   **Interação:** Adicionar um ícone de "gráfico" (`<i class="fas fa-chart-bar"></i>`) na linha de cada grupo na tabela "Grupos de Roteadores".
*   **Modal:** Ao clicar no ícone, abrir um modal que exibe um **gráfico de barras** com os dados retornados pela nova API.
*   **Visualização:** O eixo X mostraria o nome de cada roteador do grupo, e o eixo Y a quantidade de utilizadores.
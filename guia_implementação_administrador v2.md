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

# Guia de Implementação: Último Login (FreeRADIUS + PostgreSQL)

## Visão Geral
Para que o painel possa exibir a data e hora do "Último Login" de um utilizador do hotspot, é necessário que o servidor FreeRADIUS, responsável pela autenticação, grave os registos de sessão (accounting) numa base de dados PostgreSQL. O painel irá então consultar esta base de dados para obter a informação.

## 1. Configuração do FreeRADIUS

### Passo 1: Instalar o Módulo SQL
No servidor onde o FreeRADIUS está instalado, instale o módulo para PostgreSQL.
```bash
# Em sistemas baseados em Debian/Ubuntu
sudo apt-get update
sudo apt-get install freeradius-postgresql
```

### Passo 2: Configurar o `radiusd.conf`
Edite o ficheiro de configuração principal do FreeRADIUS (geralmente em `/etc/freeradius/3.0/radiusd.conf`) e na secção `accounting`, descomente a linha `sql` para ativar o módulo.

```
accounting {
    ...
    sql
    ...
}
```

### Passo 3: Configurar a Conexão SQL
Edite o ficheiro de configuração do módulo SQL (`/etc/freeradius/3.0/mods-available/sql`) e ajuste as seguintes secções:

```
sql {
    driver = "rlm_sql_postgresql"

    # Configurações da sua base de dados
    server = "IP_DO_SEU_DB"
    port = 5432
    login = "USUARIO_DO_DB"
    password = "SENHA_DO_DB"
    radius_db = "NOME_DO_DB"

    # Garante que o FreeRADIUS leia o schema correto
    read_clients = yes
    client_table = "nas"
}
```

### Passo 4: Importar o Schema do Banco de Dados
O FreeRADIUS vem com um schema SQL. Importe-o para a sua base de dados para criar a tabela `radacct` e outras necessárias.
```bash
# Navegue até o diretório de schemas do FreeRADIUS
cd /etc/freeradius/3.0/mods-config/sql/main/postgresql/
# Execute o schema na sua base de dados
psql -U USUARIO_DO_DB -d NOME_DO_DB < schema.sql
```
Isto criará a tabela `radacct`, que armazenará cada sessão de login, incluindo `acctstarttime` (início da sessão).

## 2. Backend (Painel Administrativo)

Para obter o último login de um utilizador, o backend do painel deve executar a seguinte consulta SQL:

```sql
SELECT acctstarttime 
FROM radacct 
WHERE username = 'EMAIL_DO_UTILIZADOR' 
ORDER BY acctstarttime DESC 
LIMIT 1;
```

---

# Guia de Implementação: Auto-Reboot da VM (Proxmox)

## Visão Geral
Para aumentar a resiliência do sistema, pode-se criar um script que verifica a conectividade com a internet e, em caso de falha persistente, reinicia a máquina virtual. Isto pode ser útil para resolver problemas de rede que deixam a VM "congelada".

## 1. Criar o Script de Verificação
No terminal da sua VM, crie um ficheiro chamado `check_network.sh`.
```bash
nano /usr/local/bin/check_network.sh
```
Cole o seguinte conteúdo no ficheiro:

```bash
#!/bin/bash

# Endereço IP confiável para pingar (DNS do Google é uma boa opção)
TARGET=8.8.8.8

# Número de tentativas de ping
COUNT=4

# Contador de falhas
FAILS=0

for ((i=1; i<=COUNT; i++)); do
    if ! ping -c 1 -W 1 $TARGET &> /dev/null; then
        ((FAILS++))
    fi
    sleep 1
done

# Se todas as tentativas falharem, reinicia o sistema
if [ $FAILS -eq $COUNT ]; then
    echo "$(date): Falha de rede detectada. Reiniciando o sistema." >> /var/log/network_check.log
    /sbin/reboot
fi
```

Torne o script executável:
```bash
chmod +x /usr/local/bin/check_network.sh
```

## 2. Agendar a Execução (Cron Job)
Edite o `crontab` do utilizador root para executar o script periodicamente.
```bash
sudo crontab -e
```
Adicione a seguinte linha no final do ficheiro para executar o script a cada 5 minutos:
```
*/5 * * * * /usr/local/bin/check_network.sh
```
Salve e feche o ficheiro. O sistema agora verificará a conectividade a cada 5 minutos e reiniciará se todas as 4 tentativas de ping falharem.

---

# Guia de Implementação: Otimização de Carregamento do `router_dashboard.js`

## Problema
O `live-summary` (atualizações em tempo real) do dashboard do roteador iniciava ao mesmo tempo que o carregamento principal dos dados (`loadMetrics`), causando sobrecarga e lentidão na renderização inicial da página.

## Solução
A lógica foi ajustada para que as atualizações em tempo real só iniciem **após** o carregamento completo dos dados iniciais. Além disso, ao mudar o filtro de período (que chama `loadMetrics` novamente), as atualizações são pausadas durante o processamento e retomadas depois.

### Alterações no Código (`frontend/js/router_dashboard.js`)
1.  A chamada inicial para `startLiveUpdates()` foi movida para dentro do bloco `.finally()` da primeira chamada a `loadMetrics()`.
2.  A função `loadMetrics()` agora chama `stopLiveUpdates()` no início e `startLiveUpdates()` no final (dentro de um bloco `finally`), garantindo que as atualizações sejam pausadas durante o processamento pesado.

# Guia de Implementação: Gestão Avançada de Roteadores (Modal de Ferramentas)

## Visão Geral
Melhorar a interface do dashboard individual do roteador (`router_dashboard`), agrupando funcionalidades de gestão e diagnóstico num modal organizado, acessível através de um ícone de configurações. Isto limpa a interface principal e prepara o terreno para funcionalidades futuras (alterar SSID, scripts, etc.).

## 1. Interface do Dashboard (`router_dashboard.js`)

### Alterações Visuais
*   **Remover:** O botão "Reiniciar" atual que fica no cabeçalho.
*   **Adicionar:** Um ícone de engrenagem (`<i class="fas fa-cog"></i>`) ao lado do nome do roteador.
*   **Estilo:** O ícone deve ser discreto, mas destacar-se ao passar o rato (hover).

### Lógica de Segurança (Status)
*   **Estado Inicial:** O botão de engrenagem deve iniciar **desabilitado** (visual cinza/inativo).
*   **Ativação:** O botão só deve ser habilitado após o carregamento bem-sucedido das métricas (`loadMetrics`). Se o roteador estiver offline ou inacessível, o botão permanece desabilitado.
*   **Feedback:** Adicionar um `title` ou tooltip ao botão:
    *   Habilitado: "Gerir Roteador"
    *   Desabilitado: "Roteador offline ou inacessível. Configurações indisponíveis."

## 2. Modal de Gestão (`RouterManagementModal`)

Ao clicar no ícone de engrenagem, abrir um modal com a seguinte estrutura de abas:

### Estrutura do Modal
*   **Cabeçalho:** Nome do Roteador e Botão de Fechar.
*   **Navegação:** Abas para alternar entre as secções.

### Aba 1: Logs (Diagnóstico)
*   **Objetivo:** Visualizar os logs internos do MikroTik para diagnóstico rápido.
*   **Interface:**
    *   Tabela com colunas: Hora, Tópicos, Mensagem.
    *   Botão "Atualizar Logs".
*   **Backend:** Endpoint `GET /api/routers/:id/logs` que executa `/log/print`.

### Aba 2: Configurações (Futuro)
*   *Reservado para funcionalidades como: Alterar SSID, Mudar Senha Wi-Fi, Alterar IP.*

### Aba 3: Sistema (Manutenção)
*   **Funcionalidades:**
    *   **Reiniciar:** Mover a funcionalidade de reiniciar (que já existe) para aqui.
        *   Botão "Reiniciar Roteador" (Vermelho).
        *   Deve manter a confirmação de segurança (pedir credenciais ou confirmação dupla).
    *   *Futuro: Executar Scripts, Verificar Atualizações.*
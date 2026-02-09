# Sistema de Gerenciamento de Formulários 4M - FR0062

Sistema web para digitalização e gerenciamento dos formulários 4M (Man, Machine, Material, Method) utilizado no processo de qualidade.

## 📋 Funcionalidades Implementadas

### ✅ Funcionalidades Principais

1. **Listagem de Formulários**
   - Visualização de todos os formulários 4M cadastrados
   - Filtros por número, solicitante, status e ano
   - Modos de visualização: grid e lista
   - Estatísticas em tempo real
   - Ordenação por data de criação

2. **Criação de Novo Formulário**
   - Formulário completo com todos os campos do 4M
   - Geração automática de número de controle único
   - Validação de dados
   - Feedback visual de sucesso/erro

3. **Edição de Formulário Existente**
   - Carregamento de dados salvos
   - Atualização de informações
   - Preservação do histórico (data de criação e atualização)

4. **Persistência de Dados**
   - Salvamento em formato JSON
   - Armazenamento no servidor
   - API RESTful completa

## 🚀 Como Executar

### Pré-requisitos

- Node.js versão 14 ou superior
- npm ou yarn

### Instalação

1. **Instalar dependências:**
```bash
npm install
```

2. **Iniciar o servidor:**
```bash
npm start
```

Ou para desenvolvimento com auto-reload:
```bash
npm run dev
```

3. **Acessar a aplicação:**
   - Abra o navegador e acesse: `http://localhost:3001`

## 📁 Estrutura do Projeto

```
/
├── src/
│   ├── server.js                    # Servidor backend Node.js/Express
│   └── scripts/
│       └── FR0062-formulario.js     # Script do formulário
├── templates/
│   ├── 4m.html                      # Página inicial
│   ├── 4m-checklist.html            # Listagem de formulários
│   └── FR0062-formulario.html       # Formulário 4M
├── css/
│   └── FR0062-estilos.css           # Estilos do formulário
├── data/
│   └── formularios/                 # Diretório de armazenamento dos JSON
├── package.json
└── README.md
```

## 🔌 API Endpoints

### **POST /api/fr0062**
Criar novo formulário

**Request Body:**
```json
{
  "numero_controle": "FR0062-20250206-143522001",
  "cabecalho": {...},
  "mudancas_4m": [...],
  "lista_verificacao": {...},
  "procedimento_normalidade": {...},
  "acompanhamento": [...],
  "status": "em_andamento",
  "solicitado_por": "Nome do Solicitante"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Formulário salvo com sucesso",
  "numero_controle": "FR0062-20250206-143522001"
}
```

### **GET /api/fr0062**
Listar todos os formulários

**Response:**
```json
{
  "success": true,
  "count": 10,
  "formularios": [...]
}
```

### **GET /api/fr0062/:numeroControle**
Buscar formulário específico

**Response:**
```json
{
  "success": true,
  "formulario": {...}
}
```

### **PUT /api/fr0062/:numeroControle**
Atualizar formulário existente

**Request Body:** (igual ao POST)

**Response:**
```json
{
  "success": true,
  "message": "Formulário atualizado com sucesso"
}
```

### **DELETE /api/fr0062/:numeroControle**
Deletar formulário

**Response:**
```json
{
  "success": true,
  "message": "Formulário deletado com sucesso"
}
```

### **GET /api/status**
Verificar status da API

**Response:**
```json
{
  "success": true,
  "message": "API funcionando corretamente",
  "timestamp": "2025-02-06T14:35:22.001Z"
}
```

## 💾 Formato dos Dados Salvos

Os formulários são salvos em formato JSON no diretório `data/formularios/` com o seguinte padrão de nome:
- `FR0062-AAAAMMDD-HHMMSSMMM.json`

Exemplo:
- `FR0062-20250206-143522001.json`

### Estrutura de Dados

```json
{
  "numero_controle": "FR0062-20250206-143522001",
  "data_criacao": "2025-02-06T14:35:22.001Z",
  "data_atualizacao": "2025-02-06T14:35:22.001Z",
  "status": "em_andamento",
  "solicitado_por": "João Silva",
  "aprovado_por": "Maria Santos",
  "confirmado_por": "Pedro Costa",
  "cabecalho": {
    "visto_retencao_qa": "Visto",
    "setor_producao": "Setor A",
    "setor_logistica_pc": "Setor B",
    "setor_engenharia": "Setor C",
    "qualidade_aprovado": "Aprovador",
    "qualidade_confirmado": "Confirmador",
    "qualidade_executado_por": "Executor",
    "recebimento_qa": "Recebedor",
    "mudanca_engenharia": true,
    "mudanca_controle_prod": false,
    "mudanca_producao": true,
    "analise_risco_processo": true,
    "analise_risco_produto": false,
    "analise_risco_nao_aplicavel": false,
    "horario_aplicacao_4m": "14:30"
  },
  "mudancas_4m": [
    {
      "tipo": "MAN",
      "item_modificado": "Operador treinado",
      "nome": "João Silva",
      "motivo": "Treinamento novo procedimento",
      "projeto": "PRJ-2025-001",
      "numero_operacao": "OP-001",
      "importancia_normal": false,
      "importancia_importante_as": true,
      "data_turno": "2025-02-06",
      "turno_1t": true,
      "turno_2t": false,
      "turno_3t": false
    },
    // ... outros 3M (MACHINE, MATERIAL, METHOD)
  ],
  "lista_verificacao": {
    "registro_treinam_operador": true,
    "avaliacao_treinam_operador": true,
    "registro_garantia_200": false,
    "certificado_habilitacao": true,
    "importante_a": true,
    "indicador_importante_a": true,
    "avaliacao_qualidade": true,
    "nivel_tecnico_acima_i": false,
    "qualidade_produto": true
  },
  "procedimento_normalidade": {
    "pr008_sim": true,
    "pr008_nao": false,
    "pr990_sim": true,
    "pr990_nao": false,
    "pr007_sim": false,
    "pr007_nao": true,
    "pr092_sim": true,
    "pr092_nao": false,
    "justificativa": "Justificativa do procedimento"
  },
  "acompanhamento": [
    {
      "nome_norma": "ISO 9001",
      "responsavel": "Responsável QA",
      "necessario_inov": true,
      "confirmado": true
    }
  ]
}
```

## 🎨 Interface do Usuário

### Página Inicial (4m.html)
- Menu de navegação principal
- Acesso rápido às funcionalidades

### Listagem (4m-checklist.html)
- **Filtros:**
  - Número de controle
  - Solicitado por
  - Status (rascunho, pendente, aprovado, rejeitado)
  - Ano
- **Visualizações:**
  - Grid (cards)
  - Lista (tabela)
- **Estatísticas:**
  - Total de formulários
  - Formulários aprovados
  - Último formulário criado

### Formulário (FR0062-formulario.html)
- Todos os campos do formulário 4M original
- Validação de campos obrigatórios
- Sistema de mensagens toast
- Botões:
  - **Salvar Checklist:** Salva o formulário
  - **Gerar PDF:** (em desenvolvimento)
  - **Limpar Dados:** Limpa o formulário

## 🔧 Tecnologias Utilizadas

### Backend
- Node.js
- Express.js
- CORS
- File System (fs)

### Frontend
- HTML5
- CSS3
- JavaScript (ES6+)
- Fetch API

## 📝 Fluxo de Uso

1. **Criar Novo Formulário:**
   - Acessar a página de listagem
   - Clicar em "Novo Checklist"
   - Preencher os campos
   - Clicar em "Salvar Checklist"
   - Sistema gera número de controle automaticamente
   - Dados são salvos no servidor
   - Redirecionamento automático para a listagem

2. **Visualizar Formulário:**
   - Acessar a página de listagem
   - Clicar em um card de formulário
   - O formulário abre com todos os dados preenchidos

3. **Editar Formulário:**
   - Abrir um formulário existente
   - Modificar os campos desejados
   - Clicar em "Salvar Checklist"
   - Sistema atualiza os dados preservando o número de controle

4. **Filtrar Formulários:**
   - Na página de listagem, usar os filtros disponíveis
   - Clicar em "Filtrar" para aplicar
   - Clicar em "Limpar" para remover filtros

## ⚠️ Observações Importantes

1. **Número de Controle:**
   - Gerado automaticamente no formato: `FR0062-AAAAMMDD-HHMMSSMMM`
   - Exemplo: `FR0062-20250206-143522001`
   - É único e usado como identificador do formulário

2. **Persistência:**
   - Os dados são salvos em arquivos JSON no servidor
   - Cada formulário é um arquivo separado
   - O diretório `data/formularios/` é criado automaticamente

3. **CORS:**
   - Configurado para aceitar requisições de múltiplas origens
   - Importante para desenvolvimento local

4. **Validações:**
   - Número de controle é obrigatório
   - Campos são validados no frontend antes do envio

## 🐛 Resolução de Problemas

### Servidor não inicia
- Verificar se a porta 3001 está disponível
- Instalar dependências: `npm install`
- Verificar versão do Node.js: `node --version`

### Erro ao salvar formulário
- Verificar se o servidor está rodando
- Verificar console do navegador para erros
- Verificar permissões do diretório `data/formularios/`

### Formulário não carrega dados
- Verificar se o arquivo JSON existe no servidor
- Verificar console do navegador para erros de rede
- Verificar se o número de controle está correto na URL

## 📞 Suporte

Para questões ou problemas, verificar:
1. Console do navegador (F12)
2. Logs do servidor (terminal)
3. Arquivos JSON em `data/formularios/`

## 🔄 Próximas Melhorias

- [ ] Geração de PDF
- [ ] Autenticação de usuários
- [ ] Histórico de alterações
- [ ] Assinatura digital
- [ ] Exportação em Excel
- [ ] Dashboard com gráficos
- [ ] Notificações por email
- [ ] Backup automático

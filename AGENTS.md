# AGENTS.md

## Objetivo do projeto
Sistema web para criação, edição, visualização e gerenciamento de checklists 4M / FR0062, com backend Node.js/Express, persistência em MongoDB e frontend em HTML/CSS/JavaScript puro.

## Stack real do projeto
- Node.js
- Express
- MongoDB (driver nativo)
- JWT
- HTML
- CSS
- JavaScript puro

## Estrutura do projeto
- `src/server.js` -> servidor principal e rotas da API
- `src/scripts/` -> scripts frontend compartilhados
- `src/config/` -> configurações auxiliares
- `templates/` -> páginas HTML
- `css/` -> estilos
- `data/` -> arquivos de apoio e dados antigos
- `README.md`, `ARQUITETURA_JWT.md`, `JWT_SEGURANCA.md` -> documentação do projeto

## Como rodar
- Instalar dependências: `npm install`
- Rodar em desenvolvimento: `npm run dev`
- Rodar normal: `npm start`

## Regras de arquitetura
- Não migrar o projeto para React, Vue, Next.js ou outro framework.
- Não trocar MongoDB por banco relacional.
- Não introduzir ORMs como Prisma ou Sequelize.
- Manter a arquitetura atual baseada em Express + templates HTML + JS puro.
- Fazer mudanças pequenas e compatíveis com a estrutura existente.

## Regras de backend
- Toda regra de negócio deve ficar no backend quando envolver segurança, status, permissões ou persistência.
- Reaproveitar os endpoints existentes antes de criar novos.
- Não quebrar os contratos atuais das rotas `/api/fr0062`.
- Ao alterar respostas da API, preservar compatibilidade com o frontend existente.
- Validar sempre os dados recebidos do frontend.
- Nunca confiar em valores enviados pelo cliente para autorização.

## Regras de frontend
- Não mover lógica de negócio crítica para o frontend.
- Reutilizar scripts existentes em `src/scripts/` sempre que possível.
- Evitar duplicar funções JS entre páginas HTML.
- Manter a UI funcional sem exigir build frontend.
- Não adicionar dependências frontend pesadas sem necessidade real.

## Regras de autenticação e segurança
- Toda alteração em login, token ou autorização deve preservar o fluxo JWT existente.
- Não remover verificações de token sem motivo.
- Não expor segredos, credenciais ou tokens em HTML.
- Não hardcodar credenciais no frontend.
- Se editar rotas protegidas, revisar impacto em permissões de admin e operador.
- Tratar token ausente, inválido e expirado de forma explícita.

## Regras específicas do domínio
- O sistema é de checklist 4M / FR0062.
- Preservar o padrão de número de controle `FR0062-XXXXXXXXX`.
- Preservar o fluxo de status do checklist.
- Não permitir mudanças que quebrem o histórico de criação/atualização.
- Não alterar nomes de campos persistidos no MongoDB sem atualizar backend e frontend juntos.

## Fluxo de status
Ao alterar a lógica de status:
- respeitar o fluxo atual implementado no backend
- evitar transições fora da regra de negócio
- não permitir que operador conclua checklist se a regra atual não permitir

## Persistência
- Usar MongoDB como fonte principal de dados.
- Não substituir persistência por arquivos locais.
- Não remover campos existentes de documentos sem avaliar compatibilidade.
- Em updates, evitar sobrescrever dados desnecessariamente.

## Áreas sensíveis
Tenha cuidado especial ao modificar:
- `src/server.js`
- rotas de login
- middleware JWT
- CORS
- geração do próximo número de controle
- atualização de checklist e mudança de status

## O que evitar
- Não reescrever arquivos inteiros sem necessidade.
- Não “modernizar” a stack à força.
- Não inventar endpoints que não foram pedidos.
- Não criar abstrações desnecessárias.
- Não mudar nomes de rotas, parâmetros ou campos sem ajustar todos os pontos de uso.

## Antes de finalizar qualquer tarefa
Sempre verificar:
- servidor sobe sem erro
- login continua funcionando
- rotas principais `/api/fr0062` continuam respondendo
- formulário FR0062 continua carregando
- listagem continua funcionando
- nenhuma mudança quebre o fluxo de status
- nenhum token ou segredo foi exposto

## Formato da resposta do agente
- Explicar de forma objetiva o que foi alterado
- Listar somente os arquivos alterados
- Apontar riscos ou impactos se houver
- Não afirmar que testou algo que não testou
# 🧪 Guia Completo de Testes - Sistema FR0062

## 1️⃣ VERIFICAR SE O SERVIDOR ESTÁ RODANDO

### Passo 1: Verificar se o servidor está respondendo

```bash
# No PowerShell, execute:
curl http://localhost:3001/api/status
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "API funcionando corretamente",
  "timestamp": "2026-03-02T...",
  "endpoints": { ... }
}
```

Se retornar erro ou "conexão recusada", o servidor não está rodando.

---

## 2️⃣ INICIAR O SERVIDOR CORRETAMENTE

### Passo 1: Verificar o .env

Certifique-se de que o arquivo `.env` na raiz do projeto contém:

```env
MONGODB_URI=sua_connection_string_mongodb
PORT=3001

# Usuários
USER_JULIO=julio
USER_JULIO_PASSWORD=julio-senha

USER_JULIA=julia
USER_JULIA_PASSWORD=julia-senha

USER_DIONAS=dionas
USER_DIONAS_PASSWORD=dionas-senha

USER_ADMIN=admin.ti
USER_ADMIN_PASSWORD=admin.ti-senha
```

### Passo 2: Instalar dependências

```bash
cd c:\Users\lucas.g\projetos\github\4m
npm install
```

### Passo 3: Iniciar o servidor

```bash
npm start
```

**Resposta esperada no console:**
```
✅ Conectado ao MongoDB
═══════════════════════════════════════════════════════
🚀 Servidor FR0062 iniciado com sucesso!
═══════════════════════════════════════════════════════
📡 Porta: 3001
🌐 URL: http://localhost:3001
🗄️  Banco de dados: MongoDB - 4m_checklist

📋 Endpoints disponíveis:
   POST   /api/fr0062/login       - Login (retorna user com role)
   POST   /api/fr0062              - Criar formulário
   GET    /api/fr0062              - Listar formulários
   GET    /api/fr0062/:id          - Buscar formulário
   PUT    /api/fr0062/:id          - Atualizar formulário (requer role)
   DELETE /api/fr0062/:id          - Deletar formulário (requer role)
   GET    /api/status              - Status da API
═══════════════════════════════════════════════════════
```

---

## 3️⃣ TESTAR O LOGIN COM POSTMAN OU CURL

### Opção A: Usando PowerShell (curl)

```powershell
# Teste de login com credenciais válidas (approver)
$body = @{
    username = "julio"
    password = "julio-senha"
} | ConvertTo-Json

curl -X POST `
  -ContentType "application/json" `
  -Body $body `
  http://localhost:3001/api/fr0062/login
```

**Resposta esperada:**
```json
{
  "success": true,
  "user": {
    "username": "julio",
    "role": "approver"
  }
}
```

### Opção B: Usando curl (Git Bash / CMD)

```bash
curl -X POST http://localhost:3001/api/fr0062/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"julio\",\"password\":\"julio-senha\"}"
```

### Opção C: Usando Postman

1. Abra o Postman
2. Create → Request
3. **Method:** POST
4. **URL:** `http://localhost:3001/api/fr0062/login`
5. **Headers:**
   - Key: `Content-Type`
   - Value: `application/json`
6. **Body** (raw JSON):
```json
{
  "username": "julio",
  "password": "julio-senha"
}
```
7. Click **Send**

---

## 4️⃣ TESTAR LOGIN PELA INTERFACE WEB

### Passo 1: Abrir Live Server

```bash
# Terminal 1: Servidor Node rodando
npm start

# Terminal 2 (PowerShell): Abrir o navegador no Live Server
start http://localhost:5500/login.html
```

Ou manualmente:
- Abra navegador
- Vá para: `http://localhost:5500/login.html`

### Passo 2: Preencher formulário

- **Usuário:** `julio`
- **Senha:** `julio-senha`
- Click **Entrar**

### Passo 3: Verificar resultados

- ✅ Se sucesso: Deve redirecionar para `/` (4m.html) com navbar mostrando "julio (APR)"
- ❌ Se erro: Aparece mensagem de erro. Verifique o console do navegador (F12)

---

## 5️⃣ TESTAR CREDENCIAIS DIFERENTES

### Admin (tem privilégios elevados)
```json
{
  "username": "admin.ti",
  "password": "admin.ti-senha"
}
```

**Resposta esperada:**
```json
{
  "success": true,
  "user": {
    "username": "admin.ti",
    "role": "admin"
  }
}
```

### Approver (sem privilégios elevados)
```json
{
  "username": "julia",
  "password": "julia-senha"
}
```

### Senha incorreta (deve falhar)
```json
{
  "username": "julio",
  "password": "senha-errada"
}
```

**Resposta esperada (401):**
```json
{
  "success": false,
  "message": "Credenciais inválidas"
}
```

---

## 6️⃣ TESTAR FLUXO COMPLETO

### 1. Login com approver
1. Va para `http://localhost:5500/login.html`
2. Login com `julio / julio-senha`
3. Deve aparecer "julio (APR)" na navbar

### 2. Acessar checklist list
1. Click no card "4M"
2. Deve abrir `4m-checklist.html`
3. Deve listar os checklists

### 3. Testar edit/delete buttons
1. Passe mouse sobre um checklist
2. Botões "Editar" e "Deletar" devem aparecer
3. Editando deve funcionar se status = "em_andamento"
4. Deletando deve pedir confirmação

### 4. Testar com admin
1. Logout (click botão Sair)
2. Make login com `admin.ti / admin.ti-senha`
3. Deve aparecer "admin.ti (ADM)" na navbar
4. Edit/Delete buttons devem estar habilitados para TODOS os checklists

---

## 7️⃣ PROBLEMAS COMUNS E SOLUÇÕES

### A. Erro: `POST http://localhost:3001/api/fr0062/login 404`

**Causas possíveis:**
- ❌ Servidor não está rodando
- ❌ Rota não foi registrada
- ❌ CORS bloqueando requisição

**Solução:**
```bash
# 1. Parar servidor (Ctrl+C)
# 2. Deletar node_modules e reinstalar
rm -r node_modules
npm install

# 3. Certificar que .env existe e tem as credenciais
# 4. Iniciar novamente
npm start

# 5. Testar endpoint em outro terminal
curl http://localhost:3001/api/status
```

### B. Erro: `SyntaxError: Unexpected token '<', "<!DOCTYPE "`

Significa que a resposta é HTML (página 404) em vez de JSON.

**Solução:**
- Confirme que a rota é `/api/fr0062/login` (com `/api`)
- Verifique se o servidor está rodando
- Verifique os logs no console do servidor

### C. CORS bloqueando requisição

O frontend consegue fazer requisição para `http://localhost:3001`?

**Solução:**
- Verifique se `localhost:5500` está no array de `origin` no CORS
- O código já tem configurado, então deve funcionar

---

## 8️⃣ VERIFICAR LOGS DO SERVIDOR

Quando você faz login, no console do servidor deve aparecer:

✅ **Login bem-sucedido:**
```
✅ Login bem-sucedido para usuário: julio (approver)
```

❌ **Login falha:**
```
❌ Tentativa de login falha para: julio
```

---

## 9️⃣ CHECKLIST FINAL

- [ ] `.env` configurado com USER_* variables
- [ ] `npm install` executado
- [ ] `npm start` rodando sem erros
- [ ] `curl http://localhost:3001/api/status` retorna JSON
- [ ] `curl POST` para `/api/fr0062/login` funciona
- [ ] Acessar `http://localhost:5500/login.html` abre o formulário de login
- [ ] Login com `julio / julio-senha` funciona
- [ ] Navbar mostra "julio (APR)"
- [ ] Logout funciona
- [ ] Login com `admin.ti / admin.ti-senha` mostra "admin.ti (ADM)"

---

## 🔟 ENDPOINTS PARA TESTAR

| Método | Endpoint | Dados | Resposta |
|--------|----------|-------|----------|
| **POST** | `/api/fr0062/login` | `{ username, password }` | `{ success, user: { username, role } }` |
| **GET** | `/api/status` | - | `{ success, message, endpoints }` |
| **GET** | `/api/fr0062` | - | `{ success, formularios: [] }` |
| **POST** | `/api/fr0062` | `{ numero_controle, ... }` | `{ success, numero_controle }` |
| **PUT** | `/api/fr0062/:id` | `{ dados }` + headers | `{ success, formulario }` |
| **DELETE** | `/api/fr0062/:id` | - + headers | `{ success, message }` |

---

## ⚡ RESUMO RÁPIDO

```bash
# Terminal 1
cd c:\Users\lucas.g\projetos\github\4m
npm install
npm start

# Terminal 2 (PowerShell)
curl http://localhost:3001/api/status

# Terminal 3 (Browser)
# Abrir: http://localhost:5500/login.html
# Usuário: julio
# Senha: julio-senha
```

Se tudo funcionar, você verá a navbar com "julio (APR)" e poderá acessar os checklists! 🚀

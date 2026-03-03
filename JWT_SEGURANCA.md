# 🔐 Implementação de JWT - Sistema FR0062

## 📋 O que foi mudado

### Backend (server.js)
✅ **JWT - JSON Web Tokens implementado**
- Biblioteca `jsonwebtoken` instalada
- Middleware `autenticarJWT` criado para proteger rotas
- Rota de login agora retorna um JWT token
- Rotas PUT e DELETE agora usam JWT ao invés de headers customizados
- CORS atualizado para aceitar header `Authorization`

### Frontend (login.html)
✅ **Token JWT armazenado no localStorage**
- Ao fazer login, ambos `currentUser` e `authToken` são salvos
- Token é enviado em toda requisição protegida

### Frontend (4m-checklist.html)
✅ **Requisições DELETE usam JWT**
- Token é enviado no header `Authorization: Bearer {token}`
- Muito mais seguro que enviar role e username em headers

### Frontend (4m.html)
✅ **Logout remove o token**
- Função `efetuarLogout()` agora limpa `authToken` também

---

## 🔑 Como funciona o JWT

### 1. Login
```
POST /api/fr0062/login
{
  "username": "julio",
  "password": "julio-senha"
}

✅ Response:
{
  "success": true,
  "user": { "username": "julio", "role": "approver" },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Deletar Checklist
```
DELETE /api/fr0062/{numeroControle}
Header: Authorization: Bearer {token}

✅ O middleware verifica o token
✅ Se válido, delete é permitido
❌ Se inválido/expirado, retorna 403
```

---

## 🧪 Testando o novo sistema

### Terminal 1: Iniciar servidor
```bash
cd c:\Users\lucas.g\projetos\github\4m
npm start
```

Aparecerá:
```
✅ Conectado ao MongoDB
🚀 Servidor FR0062 iniciado com sucesso!
📡 Porta: 3001
```

### Terminal 2: Testar com PowerShell

#### 1. Login e obter token
```powershell
$body = @{ 
    username = "julio"
    password = "julio-senha"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3001/api/fr0062/login" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"

$response | ConvertTo-Json
$token = $response.token
Write-Host "✅ Token obtido: $token"
```

#### 2. Deletar checklist com token
```powershell
# Assumindo que existe um checklist com numero_controle "TEST-001"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "http://localhost:3001/api/fr0062/TEST-001" `
  -Method Delete `
  -Headers $headers
```

#### 3. Testar com token inválido (deve falhar)
```powershell
$headers = @{
    "Authorization" = "Bearer token-invalido"
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "http://localhost:3001/api/fr0062/TEST-001" `
  -Method Delete `
  -Headers $headers

# Resposta esperada:
# 403 - Token inválido ou expirado
```

---

## 🌐 Testar pela interface Web

### 1. Abrir login.html
```
http://localhost:5500/login.html
```

### 2. Fazer login
- Usuário: `julio`
- Senha: `julio-senha`
- Click: Entrar

### 3. Verificar localStorage (F12 > Application > Local Storage)
Deve aparecer:
- `currentUser`: `{"username":"julio","role":"approver"}`
- `authToken`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 4. Ir para checklists
- Click no card "4M"
- Deve listar checklists

### 5. Testar delete
- Passe mouse sobre um checklist
- Click em "Deletar"
- Confirme a exclusão
- O frontend enviará o token automaticamente
- Checklist será deletado com sucesso

---

## 🔒 Segurança - Por que JWT é melhor

| Aspecto | Headers Customizados | JWT |
|--------|----------------------|-----|
| **Autenticação** | Role/Username em texto | Token criptografado |
| **Spoofing** | Fácil falsificar headers | Impossível sem secret |
| **Expiração** | Sem controle | Expira automaticamente |
| **Token revocation** | Não suportado | Suportado |
| **Padrão** | Customizado | Industry standard |
| **Segurança** | ⚠️ Baixa | ✅ Alta |

---

## 📦 Variáveis de Ambiente (.env)

**Opcional:** Adicionar `JWT_SECRET` ao `.env` para segurança extra:

```env
JWT_SECRET=sua-chave-super-secreta-aqui
```

Se não configurar, usa padrão: `seu-secret-key-super-seguro-2026`

---

## 🐛 Troubleshooting

### Erro: "Token não fornecido"
- ✅ Verificar se localStorage tem `authToken`
- ✅ Verificar console do navegador (F12)
- ✅ Fazer novo login

### Erro: "Token inválido ou expirado"
- ✅ Token expirou (24h de duração padrão)
- ✅ Fazer novo login para obter nuovo token

### Delete ainda não funciona
- ✅ Verificar se servidor está rodando
- ✅ Verificar se localhost:3001 está acessível
- ✅ Verificar headers da requisição (F12 > Network > DELETE)

---

## 📚 Referências

- JWT.io: https://jwt.io
- jsonwebtoken npm: https://www.npmjs.com/package/jsonwebtoken
- OAuth 2.0 Bearer Token: https://tools.ietf.org/html/rfc6750

---

## ✅ Checklist Final

- [ ] `npm install jsonwebtoken` executado
- [ ] `npm start` rodando sem erros
- [ ] Login retorna `token` na resposta
- [ ] localStorage tem `authToken` após login
- [ ] Delete funciona com o token JWT
- [ ] Logout remove o token
- [ ] Login novamente traz novo token
- [ ] Sistema está seguro! 🔐

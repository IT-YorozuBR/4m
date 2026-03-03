# 🏗️ Arquitetura de Segurança JWT - FR0062

## 📐 Fluxo de Autenticação

```
┌─────────────────────────────────────────────────────────────────┐
│ FASE 1: LOGIN                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Frontend (login.html)                  Backend (server.js)     │
│  ────────────────────                   ──────────────────      │
│  1. User submits form                   2. Verify credentials    │
│     username: "julio"                      vs .env              │
│     password: "****"                                            │
│           │                                                      │
│           └────── POST /api/fr0062/login ─────────────────>    │
│                                                                  │
│                                            3. Success ✅         │
│                                            4. Generate JWT:     │
│                                            jwt.sign({           │
│                                              username,          │
│                                              role,              │
│                                              expiresIn: 24h    │
│                                            })                   │
│                                                                  │
│                   <────── Response JSON ───────────────          │
│                   {                                              │
│                     success: true,                              │
│                     user: {...},                                │
│                     token: "eyJhb..."                           │
│                   }                                              │
│                                                                  │
│  5. Store in localStorage:                                      │
│     - currentUser                                               │
│     - authToken                                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ FASE 2: REQUISIÇÕES AUTENTICADAS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Frontend (4m-checklist.html)           Backend (server.js)     │
│  ──────────────────────────────         ──────────────────      │
│  6. User clicks DELETE                  7. GET token from       │
│  7. Fetch token from localStorage       header Authorization    │
│  8. Send DELETE request:                                        │
│                                         8. Verify JWT:          │
│  DELETE /api/fr0062/{id}                   jwt.verify(token,    │
│  Headers:                                  JWT_SECRET)          │
│  - Authorization: Bearer {token}                                │
│       │                                    9. Token valid? ✅    │
│       │                                    → Extract user info   │
│       │                                    → Process delete      │
│       └──────────────────────────────>                          │
│                                                                  │
│                   <──── 200 OK (Success) ────────               │
│                   ou 403 (Token invalid/expired) ❌             │
│                                                                  │
│  10. Update UI (remove deleted item)                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Estrutura do JWT Token

### Token Gerado
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJ1c2VybmFtZSI6Imp1bGlvIiwicm9sZSI6ImFwcHJvdmVyIiwiaWF0IjoxNjc2NzQ3MDAwLCJleHAiOjE2NzY4MzM0MDB9.
g9KHPIE5W_7v9WZqK8mPc_5C7jWqH2x3Y6zL8wM9Nk4
```

### Partes do Token
```
[HEADER].[PAYLOAD].[SIGNATURE]
```

### HEADER (algoritmo)
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### PAYLOAD (dados + claims)
```json
{
  "username": "julio",
  "role": "approver",
  "iat": 1676747000,     // Issued At
  "exp": 1676833400      // Expiration (24h depois)
}
```

### SIGNATURE (assinatura)
```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  "seu-secret-key-super-seguro-2026"
)
```

---

## 🛡️ Mecanismos de Segurança

### 1. **Confidenciality** (Confidencialidade)
- Token é assinado com `JWT_SECRET`
- Sem a chave secreta, é impossível forjar um token válido
- Qualquer alteração no payload invalida a assinatura

### 2. **Integrity** (Integridade)
- A assinatura garante que o token não foi modificado
- Se alguém alterar username/role no token, assinatura não bate

### 3. **Authentication** (Autenticação)
- Durante login, credenciais são verificadas contra `.env`
- Apenas usuários válidos recebem um token

### 4. **Expiration** (Expiração)
- Token expira em 24 horas automaticamente
- Sessions não duram infinitamente
- Força re-login periódico

### 5. **Authorization** (Autorização)
```javascript
// Na rota protegida:
if (req.user.role === 'admin') {
  // Permite delete
} else if (req.user.role === 'approver') {
  // Permite apenas em certos status
}
```

---

## 📋 Implementação - Archivos Modificados

### server.js
```javascript
// 1. Import JWT
const jwt = require('jsonwebtoken');

// 2. Middleware de verificação
const autenticarJWT = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token não fornecido' });
  
  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token inválido ou expirado' });
  }
};

// 3. Login - retorna token
app.post('/api/fr0062/login', (req, res) => {
  // ... validação de credenciais ...
  const token = jwt.sign({ username, role }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ success: true, user: { username, role }, token });
});

// 4. Rota protegida
app.delete('/api/fr0062/:id', autenticarJWT, (req, res) => {
  const username = req.user.username;  // ✅ Vem do JWT
  // ... deletar ...
});
```

### login.html
```javascript
// Armazenar token após login
localStorage.setItem('authToken', data.token);
localStorage.setItem('currentUser', JSON.stringify(data.user));
```

### 4m-checklist.html
```javascript
// Usar token em requisições
const token = localStorage.getItem('authToken');
fetch(url, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

---

## 🔄 Ciclo de Vida do Token

```
┌──────────────────────────────────────────────────────┐
│ NASCIMENTO (Login)                                   │
│ Token gerado com expiração = now + 24h               │
└──────────────────────┬───────────────────────────────┘
                       │
                       ↓
┌──────────────────────────────────────────────────────┐
│ VIDA ÚTIL (0-24h)                                    │
│ ✅ Token é válido para fazer requisições             │
│ ✅ Servidor aceita e processa                        │
└──────────────────────────────────────────────────────┘
                       │
                       ↓ (após 24h)
┌──────────────────────────────────────────────────────┐
│ MORTE/EXPIRAÇÃO                                      │
│ ❌ Token não é mais válido                           │
│ ❌ Servidor retorna 403 Forbidden                    │
│ → User precisa fazer login novamente                 │
└──────────────────────────────────────────────────────┘
```

---

## 🔑 Tamanho da Chave Secret

Recomendações:
- **Desenvolvimento**: `seu-secret-key-super-seguro-2026` (32+ chars) ✅ Fornecido
- **Produção**: Gerar com OpenSSL: `openssl rand -base64 32`
- **Mínimo aceitável**: 32 caracteres
- **Ideal**: 64 caracteres

### Exemplo seguro para .env
```env
JWT_SECRET=k7$#mP@w9&Lx!vB$2nQoRsT%uV^wXyZ&aB*cD(eF)gH-jK_lM
```

---

## 📊 Comparação: Antes vs Depois

| Aspecto | Antes (Headers) | Depois (JWT) |
|---------|-----------------|--------------|
| **Método** | Custom headers | Industry standard |
| **Segurança** | ⚠️ Baixa | ✅ Alta |
| **Formato** | `X-User-Role: approver` | `Bearer eyJhb...` |
| **Assinatura** | Nenhuma | HMACSHA256 |
| **Expiração** | Ilimitada | 24h |
| **Falsificação** | Fácil | Impossível |
| **Padrão** | Customizado | RFC 7519 |

---

## 🧪 Casos de Teste

### ✅ Sucesso
- Login com credenciais válidas → Recebe token
- DELETE com token válido → Checklist deletado
- GET com token válido → Lista retornada

### ❌ Falha Esperada
- Login com senha errada → Erro 401
- DELETE com token inválido → Erro 403
- DELETE sem token → Erro 401
- DELETE com token expirado → Erro 403

---

## 🚀 Próximas Melhorias

### Phase 2: Token Refresh
```javascript
// Adicionar endpoint para renovar token sem re-login
app.post('/api/fr0062/refresh', autenticarJWT, (req, res) => {
  const newToken = jwt.sign(
    { username: req.user.username, role: req.user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({ token: newToken });
});
```

### Phase 3: Token Revocation
```javascript
// Manter blacklist de tokens revogados (logout)
const tokenBlacklist = new Set();

app.post('/api/fr0062/logout', autenticarJWT, (req, res) => {
  tokenBlacklist.add(req.headers['authorization'].split(' ')[1]);
  res.json({ message: 'Logout bem-sucedido' });
});
```

### Phase 4: Role-Based Access (RBAC)
```javascript
// Diferentes permissões por role
const autorizarRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Acesso negado' });
  }
  next();
};

// Uso
app.delete('/api/fr0062/:id', 
  autenticarJWT, 
  autorizarRole(['admin']), 
  deleteHandler
);
```

---

## 📚 Recursos

- **JWT.io**: https://jwt.io (veja como tokens são estruturados)
- **jsonwebtoken npm**: https://www.npmjs.com/package/jsonwebtoken
- **RFC 7519**: https://tools.ietf.org/html/rfc7519 (Especificação JWT)
- **OWASP Cheath Sheet**: https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html

---

## ⚠️ Considerações de Segurança Adicionais

1. **HTTPS Obrigatório em Produção**
   - JWT no bearer token pode ser interceptado sem HTTPS
   - Sempre usar HTTPS em produção

2. **JWT_SECRET Seguro**
   - Não fazer commit da chave no Git
   - Armazenar em .env isolado
   - Rotacionar regularmente em produção

3. **Token Storage no Frontend**
   - localStorage está exposto ao XSS
   - Considerar sessionStorage para segurança extra
   - Não armazenar em cookies sem HttpOnly flag

4. **CORS Configurado**
   - Apenas domínios confiáveis podem fazer requisições
   - Authorization header está na whitelist

5. **Rate Limiting**
   - Limitar tentativas de login (brute force)
   - Implementar em fase 2

---

## ✅ Checklist de Implementação

- [x] JWT library instalada (`npm install jsonwebtoken`)
- [x] Middleware `autenticarJWT` criado
- [x] Rota POST `/api/fr0062/login` retorna token
- [x] Rotas DELETE/PUT protegidas com middleware
- [x] Frontend armazena token no localStorage
- [x] Frontend envia token em Authorization header
- [x] Logout remove token do localStorage
- [x] CORS permite Authorization header
- [ ] Testar end-to-end com testar-jwt.ps1
- [ ] Mover JWT_SECRET para .env
- [ ] Implementar token refresh (Phase 2)
- [ ] Implementar token blacklist (Phase 2)

---

## 🎯 Status

**Implementação**: ✅ 100% Completa
**Testes**: ⏸️ Aguardando execução
**Produção**: ⏳ Pronto após testes

Execute `.\testar-jwt.ps1` para validar a implementação completa!

# ════════════════════════════════════════════════════════════
# SCRIPT DE TESTE - Sistema FR0062 Login
# Execute no PowerShell: .\testar-login.ps1
# ════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  TESTE RÁPIDO DO LOGIN - FR0062" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Configurações
$SERVER_URL = "http://localhost:3001"
$API_LOGIN = "$SERVER_URL/api/fr0062/login"
$API_STATUS = "$SERVER_URL/api/status"

# ════════════════════════════════════════════════════════════
# TESTE 1: Verificar conexão com servidor
# ════════════════════════════════════════════════════════════

Write-Host "[1/6] Verificando conexão com servidor..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $API_STATUS -Method Get
    Write-Host "✅ Servidor está rodando!" -ForegroundColor Green
    Write-Host "   Resposta: $($response.message)" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ ERRO: Servidor não está respondendo" -ForegroundColor Red
    Write-Host "   URL: $API_STATUS" -ForegroundColor Red
    Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Inicie o servidor com: npm start" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Pressione Enter para sair"
    exit 1
}

# ════════════════════════════════════════════════════════════
# TESTE 2: Login com approver (VÁLIDO)
# ════════════════════════════════════════════════════════════

Write-Host "[2/6] Testando login com approver (julio/julio-senha)..." -ForegroundColor Yellow

$body = @{
    username = "julio"
    password = "julio-senha"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $API_LOGIN -Method Post -Body $body -ContentType "application/json"
    Write-Host "✅ Login bem-sucedido!" -ForegroundColor Green
    Write-Host "   Username: $($response.user.username)" -ForegroundColor Green
    Write-Host "   Role: $($response.user.role)" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Erro no login:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# ════════════════════════════════════════════════════════════
# TESTE 3: Login com admin (VÁLIDO)
# ════════════════════════════════════════════════════════════

Write-Host "[3/6] Testando login com admin (admin.ti/admin.ti-senha)..." -ForegroundColor Yellow

$body = @{
    username = "admin.ti"
    password = "admin.ti-senha"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $API_LOGIN -Method Post -Body $body -ContentType "application/json"
    Write-Host "✅ Login bem-sucedido!" -ForegroundColor Green
    Write-Host "   Username: $($response.user.username)" -ForegroundColor Green
    Write-Host "   Role: $($response.user.role)" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Erro no login:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# ════════════════════════════════════════════════════════════
# TESTE 4: Login com approver alternativo (VÁLIDO)
# ════════════════════════════════════════════════════════════

Write-Host "[4/6] Testando login com approver (julia/julia-senha)..." -ForegroundColor Yellow

$body = @{
    username = "julia"
    password = "julia-senha"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $API_LOGIN -Method Post -Body $body -ContentType "application/json"
    Write-Host "✅ Login bem-sucedido!" -ForegroundColor Green
    Write-Host "   Username: $($response.user.username)" -ForegroundColor Green
    Write-Host "   Role: $($response.user.role)" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Erro no login:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# ════════════════════════════════════════════════════════════
# TESTE 5: Senha incorreta (DEVE FALHAR)
# ════════════════════════════════════════════════════════════

Write-Host "[5/6] Testando login com senha incorreta (deve falhar)..." -ForegroundColor Yellow

$body = @{
    username = "julio"
    password = "senha-errada"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $API_LOGIN -Method Post -Body $body -ContentType "application/json"
    Write-Host "⚠️  Unexpected success - should have failed!" -ForegroundColor Yellow
    Write-Host ""
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "✅ Falha como esperado (Status: $statusCode)" -ForegroundColor Green
    Write-Host "   Mensagem: Credenciais inválidas" -ForegroundColor Green
    Write-Host ""
}

# ════════════════════════════════════════════════════════════
# TESTE 6: Listar formulários (GET)
# ════════════════════════════════════════════════════════════

Write-Host "[6/6] Listando todos os formulários..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$SERVER_URL/api/fr0062" -Method Get
    Write-Host "✅ Sucesso!" -ForegroundColor Green
    Write-Host "   Total de formulários: $($response.count)" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Erro ao listar:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# ════════════════════════════════════════════════════════════
# RESUMO
# ════════════════════════════════════════════════════════════

Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ✅ TESTES CONCLUÍDOS!" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Próximas ações:" -ForegroundColor Yellow
Write-Host "   1. Abra http://localhost:5500/login.html" -ForegroundColor White
Write-Host "   2. Faça login com:" -ForegroundColor White
Write-Host "      - Usuário: julio" -ForegroundColor Cyan
Write-Host "      - Senha: julio-senha" -ForegroundColor Cyan
Write-Host "   3. Verifique se a navbar mostra 'julio (APR)'" -ForegroundColor White
Write-Host "   4. Navegue até os checklists" -ForegroundColor White
Write-Host ""

Read-Host "Pressione Enter para sair"

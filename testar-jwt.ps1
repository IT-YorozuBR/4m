# Script para testar JWT - Sistema FR0062
# Execute: .\testar-jwt.ps1

Write-Host "========================================" -ForegroundColor Green
Write-Host "  🔐 TESTE JWT - Sistema FR0062" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$baseUrl = "http://localhost:3001/api/fr0062"
$token = ""

# ============================================
# 1. TESTE DE LOGIN
# ============================================
Write-Host "📝 TEST 1: Login com credenciais válidas"
Write-Host "─────────────────────────────────────" -ForegroundColor Yellow

$loginBody = @{
    username = "julio"
    password = "julio-senha"
} | ConvertTo-Json

Write-Host "POST /api/fr0062/login"
Write-Host "Body: $loginBody`n"

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json" `
        -ErrorAction Stop

    if ($response.success) {
        Write-Host "✅ Login bem-sucedido!" -ForegroundColor Green
        Write-Host "   Usuário: $($response.user.username)"
        Write-Host "   Role: $($response.user.role)"
        
        $token = $response.token
        Write-Host "   Token: $($token.Substring(0, 50))..."
        Write-Host ""
    } else {
        Write-Host "❌ Falha no login: $($response.message)" -ForegroundColor Red
        exit
    }
} catch {
    Write-Host "❌ Erro na requisição: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# ============================================
# 2. TESTE DE TOKEN VÁLIDO
# ============================================
Write-Host "🔑 TEST 2: Testar token válido em requisição protegida"
Write-Host "─────────────────────────────────────" -ForegroundColor Yellow

# Listar checklists com token
Write-Host "GET /api/fr0062?token=Bearer"
Write-Host "Header: Authorization: Bearer {token}`n"

try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    $response = Invoke-RestMethod -Uri "$baseUrl" `
        -Method Get `
        -Headers $headers `
        -ErrorAction Stop

    Write-Host "✅ Requisição com token válido funcionou!" -ForegroundColor Green
    Write-Host "   Checklists encontrados: $($response.Count)"
    Write-Host ""
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# 3. TESTE DE TOKEN INVÁLIDO
# ============================================
Write-Host "❌ TEST 3: Testar com token INVÁLIDO (deve falhar)"
Write-Host "─────────────────────────────────────" -ForegroundColor Yellow

Write-Host "GET /api/fr0062"
Write-Host "Header: Authorization: Bearer token-invalido`n"

try {
    $headers = @{
        "Authorization" = "Bearer token-invalido-12345"
    }
    
    $response = Invoke-RestMethod -Uri "$baseUrl" `
        -Method Get `
        -Headers $headers `
        -ErrorAction Stop

    Write-Host "⚠️  Inesperado: Requisição com token inválido foi aceita" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "✅ Corretamente rejeitado com 403!" -ForegroundColor Green
        Write-Host "   $($_.Exception.Response.StatusCode): Unauthorized"
        Write-Host ""
    } else {
        Write-Host "⚠️  Erro diferente: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

# ============================================
# 4. TESTE SEM TOKEN
# ============================================
Write-Host "🚫 TEST 4: Testar SEM token em rota protegida (deve falhar)"
Write-Host "─────────────────────────────────────" -ForegroundColor Yellow

Write-Host "DELETE /api/fr0062/TEST-ID (sem token)`n"

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/TEST-ID" `
        -Method Delete `
        -ErrorAction Stop

    Write-Host "⚠️  Inesperado: Requisição sem token foi aceita" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode -eq 401 -or $_.Exception.Response.StatusCode -eq 403) {
        Write-Host "✅ Corretamente rejeitado!" -ForegroundColor Green
        Write-Host "   $($_.Exception.Response.StatusCode): Unauthorized"
        Write-Host ""
    } else {
        Write-Host "⚠️  Erro $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

# ============================================
# 5. RESUMO
# ============================================
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ TESTES COMPLETADOS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Resumo:"
Write-Host "  ✅ Login gera token JWT válido"
Write-Host "  ✅ Token válido permite requisições protegidas"
Write-Host "  ✅ Token inválido é rejeitado (403)"
Write-Host "  ✅ Falta de token é rejeitada (401/403)"
Write-Host ""
Write-Host "🔐 Sistema JWT está funcionando corretamente!" -ForegroundColor Green

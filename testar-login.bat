@echo off
REM Guia de Testes para Sistema FR0062
REM Execute este arquivo no PowerShell ou CMD para testar

echo.
echo ════════════════════════════════════════════════════════════
echo  TESTE RÁPIDO DO LOGIN - FR0062
echo ════════════════════════════════════════════════════════════
echo.

REM Teste 1: Verificar se servidor está rodando
echo [1/5] Testando conexão com servidor...
curl http://localhost:3001/api/status
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERRO: Servidor não está respondendo em http://localhost:3001
    echo Inicie o servidor com: npm start
    pause
    exit /b 1
)
echo ✅ Servidor está rodando!
echo.

REM Teste 2: Login com approver
echo [2/5] Testando login com approver (julio)...
curl -X POST ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"julio\",\"password\":\"julio-senha\"}" ^
  http://localhost:3001/api/fr0062/login
echo.
echo.

REM Teste 3: Login com admin
echo [3/5] Testando login com admin (admin.ti)...
curl -X POST ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"admin.ti\",\"password\":\"admin.ti-senha\"}" ^
  http://localhost:3001/api/fr0062/login
echo.
echo.

REM Teste 4: Senha incorreta
echo [4/5] Testando login com senha errada (deve falhar)...
curl -X POST ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"julio\",\"password\":\"senha-errada\"}" ^
  http://localhost:3001/api/fr0062/login
echo.
echo.

REM Teste 5: Listar formulários
echo [5/5] Listando todos os formulários...
curl http://localhost:3001/api/fr0062
echo.
echo.

echo ════════════════════════════════════════════════════════════
echo  ✅ TESTES CONCLUÍDOS!
echo ════════════════════════════════════════════════════════════
echo.
echo Próximas ações:
echo 1. Abra http://localhost:5500/login.html
echo 2. Faça login com: julio / julio-senha
echo 3. Verifique se a navbar mostra "julio (APR)"
echo 4. Navegue até os checklists
echo.
pause

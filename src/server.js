const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

async function startServer() {
    const app = express();
    const port = process.env.PORT || 3001;
    
    // Configuração CORS
    app.use(cors({
        origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001', 'https://fourm-znis.onrender.com'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type'],
        credentials: true
    }));
    
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    
    // Servir arquivos estáticos
    app.use(express.static(path.join(__dirname, '..', 'templates')));
    app.use('/css', express.static(path.join(__dirname, '..', 'css')));
    app.use('/scripts', express.static(path.join(__dirname, 'scripts')));
    
    // Criar diretórios necessários
    const FORMULARIOS_DIR = path.join(__dirname, '..', 'data', 'formularios');
    if (!fsSync.existsSync(FORMULARIOS_DIR)) {
        fsSync.mkdirSync(FORMULARIOS_DIR, { recursive: true });
    }
    
    // ==================== ROTAS API ====================
    
    // Rota para salvar formulário FR0062
    app.post('/api/fr0062', async (req, res) => {
        try {
            const dados = req.body;
            console.log('📥 Recebendo dados do formulário:', dados.numero_controle);
            
            if (!dados.numero_controle) {
                return res.status(400).json({
                    success: false,
                    message: 'Número de controle é obrigatório'
                });
            }
            
            // Adicionar timestamps
            const agora = new Date().toISOString();
            dados.data_criacao = dados.data_criacao || agora;
            dados.data_atualizacao = agora;
            
            // Salvar arquivo JSON
            const arquivoFormulario = path.join(FORMULARIOS_DIR, `${dados.numero_controle}.json`);
            await fs.writeFile(arquivoFormulario, JSON.stringify(dados, null, 2));
            
            console.log('✅ Formulário salvo:', arquivoFormulario);
            
            res.json({
                success: true,
                message: 'Formulário salvo com sucesso',
                numero_controle: dados.numero_controle,
                arquivo: arquivoFormulario
            });
            
        } catch (error) {
            console.error('❌ Erro ao salvar formulário:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao salvar o formulário',
                error: error.message
            });
        }
    });
    
    // Rota para listar todos os formulários
    app.get('/api/fr0062', async (req, res) => {
        try {
            console.log('📋 Listando formulários...');
            
            const arquivos = await fs.readdir(FORMULARIOS_DIR);
            const arquivosJSON = arquivos.filter(f => f.endsWith('.json'));
            
            const formularios = [];
            
            for (const arquivo of arquivosJSON) {
                try {
                    const conteudo = await fs.readFile(
                        path.join(FORMULARIOS_DIR, arquivo),
                        'utf-8'
                    );
                    const dados = JSON.parse(conteudo);
                    formularios.push(dados);
                } catch (err) {
                    console.error(`⚠️ Erro ao ler arquivo ${arquivo}:`, err.message);
                }
            }
            
            // Ordenar por data de criação (mais recente primeiro)
            formularios.sort((a, b) => {
                const dataA = new Date(a.data_criacao || 0);
                const dataB = new Date(b.data_criacao || 0);
                return dataB - dataA;
            });
            
            console.log(`✅ ${formularios.length} formulários encontrados`);
            
            res.json({
                success: true,
                count: formularios.length,
                formularios: formularios
            });
            
        } catch (error) {
            console.error('❌ Erro ao listar formulários:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao listar formulários',
                error: error.message
            });
        }
    });
    
    // Rota para buscar um formulário específico
    app.get('/api/fr0062/:numeroControle', async (req, res) => {
        try {
            const numeroControle = req.params.numeroControle;
            console.log('🔍 Buscando formulário:', numeroControle);
            
            const arquivoFormulario = path.join(FORMULARIOS_DIR, `${numeroControle}.json`);
            
            // Verificar se o arquivo existe
            try {
                await fs.access(arquivoFormulario);
            } catch {
                return res.status(404).json({
                    success: false,
                    message: 'Formulário não encontrado'
                });
            }
            
            const conteudo = await fs.readFile(arquivoFormulario, 'utf-8');
            const dados = JSON.parse(conteudo);
            
            console.log('✅ Formulário encontrado:', numeroControle);
            
            res.json({
                success: true,
                formulario: dados
            });
            
        } catch (error) {
            console.error('❌ Erro ao buscar formulário:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar formulário',
                error: error.message
            });
        }
    });
    
    // Rota para deletar um formulário
    app.delete('/api/fr0062/:numeroControle', async (req, res) => {
        try {
            const numeroControle = req.params.numeroControle;
            console.log('🗑️ Deletando formulário:', numeroControle);
            
            const arquivoFormulario = path.join(FORMULARIOS_DIR, `${numeroControle}.json`);
            
            await fs.unlink(arquivoFormulario);
            
            console.log('✅ Formulário deletado:', numeroControle);
            
            res.json({
                success: true,
                message: 'Formulário deletado com sucesso'
            });
            
        } catch (error) {
            console.error('❌ Erro ao deletar formulário:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao deletar formulário',
                error: error.message
            });
        }
    });
    
    // Rota para atualizar um formulário
    app.put('/api/fr0062/:numeroControle', async (req, res) => {
        try {
            const numeroControle = req.params.numeroControle;
            const dados = req.body;
            
            console.log('📝 Atualizando formulário:', numeroControle);
            
            // Atualizar timestamp
            dados.data_atualizacao = new Date().toISOString();
            
            const arquivoFormulario = path.join(FORMULARIOS_DIR, `${numeroControle}.json`);
            await fs.writeFile(arquivoFormulario, JSON.stringify(dados, null, 2));
            
            console.log('✅ Formulário atualizado:', numeroControle);
            
            res.json({
                success: true,
                message: 'Formulário atualizado com sucesso',
                formulario: dados
            });
            
        } catch (error) {
            console.error('❌ Erro ao atualizar formulário:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao atualizar formulário',
                error: error.message
            });
        }
    });
    
    // Rota de status da API
    app.get('/api/status', (req, res) => {
        res.json({
            success: true,
            message: 'API funcionando corretamente',
            timestamp: new Date().toISOString(),
            endpoints: {
                'POST /api/fr0062': 'Criar novo formulário',
                'GET /api/fr0062': 'Listar todos os formulários',
                'GET /api/fr0062/:id': 'Buscar formulário específico',
                'PUT /api/fr0062/:id': 'Atualizar formulário',
                'DELETE /api/fr0062/:id': 'Deletar formulário'
            }
        });
    });
    
    // Rota raiz
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'templates', '4m.html'));
    });
    
    // Iniciar servidor
    app.listen(port, () => {
        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log('🚀 Servidor FR0062 iniciado com sucesso!');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`📡 Porta: ${port}`);
        console.log(`🌐 URL: http://localhost:${port}`);
        console.log(`📁 Diretório de formulários: ${FORMULARIOS_DIR}`);
        console.log('');
        console.log('📋 Endpoints disponíveis:');
        console.log(`   POST   /api/fr0062              - Criar formulário`);
        console.log(`   GET    /api/fr0062              - Listar formulários`);
        console.log(`   GET    /api/fr0062/:id          - Buscar formulário`);
        console.log(`   PUT    /api/fr0062/:id          - Atualizar formulário`);
        console.log(`   DELETE /api/fr0062/:id          - Deletar formulário`);
        console.log(`   GET    /api/status              - Status da API`);
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
    });
}

startServer().catch(error => {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
});

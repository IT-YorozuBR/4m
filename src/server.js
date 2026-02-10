const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function startServer() {
    try {
        // Conectar ao MongoDB
        await client.connect();
        const db = client.db("4m_checklist");
        console.log("✅ Conectado ao MongoDB");

        const app = express();
        const port = process.env.PORT || 3001;

        // CORS
        app.use(cors({
            origin: [
                'http://127.0.0.1:5500',
                'http://localhost:5500',
                'http://localhost:3000',
                'http://127.0.0.1:3000',
                'http://localhost:3001',
                'http://127.0.0.1:3001',
                'https://fourm-znis.onrender.com'
            ],
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type'],
            credentials: true
        }));

        app.use(express.json({ limit: '50mb' }));
        app.use(express.urlencoded({ extended: true, limit: '50mb' }));

        // Arquivos estáticos
        app.use(express.static(path.join(__dirname, '..', 'templates')));
        app.use('/css', express.static(path.join(__dirname, '..', 'css')));
        app.use('/scripts', express.static(path.join(__dirname, 'scripts')));

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

                // Salvar no MongoDB
                await db.collection('checklists').insertOne(dados);

                console.log('✅ Formulário salvo no MongoDB');

                res.json({
                    success: true,
                    message: 'Formulário salvo com sucesso',
                    numero_controle: dados.numero_controle
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
                const formularios = await db
                    .collection('checklists')
                    .find()
                    .sort({ data_criacao: -1 })
                    .toArray();

                res.json({
                    success: true,
                    count: formularios.length,
                    formularios
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

                const formulario = await db
                    .collection('checklists')
                    .findOne({ numero_controle: numeroControle });

                if (!formulario) {
                    return res.status(404).json({
                        success: false,
                        message: 'Formulário não encontrado'
                    });
                }

                res.json({
                    success: true,
                    formulario
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

        // Rota para atualizar um formulário
        app.put('/api/fr0062/:numeroControle', async (req, res) => {
            try {
                const numeroControle = req.params.numeroControle;
                const dados = req.body;

                dados.data_atualizacao = new Date().toISOString();

                const resultado = await db.collection('checklists').updateOne(
                    { numero_controle: numeroControle },
                    { $set: dados }
                );

                if (resultado.matchedCount === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Formulário não encontrado'
                    });
                }

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

        // Rota para deletar um formulário
        app.delete('/api/fr0062/:numeroControle', async (req, res) => {
            try {
                const numeroControle = req.params.numeroControle;

                const resultado = await db.collection('checklists').deleteOne({
                    numero_controle: numeroControle
                });

                if (resultado.deletedCount === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Formulário não encontrado'
                    });
                }

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
            console.log(`🗄️  Banco de dados: MongoDB - 4m_checklist`);
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

    } catch (error) {
        console.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1);
    }
}

// Iniciar o servidor
startServer();
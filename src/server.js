// src/server.js - VERSÃO CORRIGIDA

// ==================== CARREGAR VARIÁVEIS DE AMBIENTE ====================
const path = require('path');
const fs = require('fs');

// Verificar se o arquivo .env existe
const envPath = path.join(__dirname, '..', '.env');
console.log('🔍 Procurando .env em:', envPath);

if (fs.existsSync(envPath)) {
    console.log('✅ Arquivo .env encontrado');
    require('dotenv').config({ path: envPath });
} else {
    console.error('❌ ERRO: Arquivo .env não encontrado!');
    console.error('Crie um arquivo .env na raiz do projeto com:');
    console.error('MONGODB_URI=sua_string_de_conexao');
    process.exit(1);
}

// Verificar se MONGODB_URI foi carregada
if (!process.env.MONGODB_URI) {
    console.error('❌ ERRO: MONGODB_URI não definida no arquivo .env!');
    console.error('Adicione esta linha ao arquivo .env:');
    console.error('MONGODB_URI=mongodb+srv://usuario:senha@cluster0.mongodb.net/4m_checklist?retryWrites=true&w=majority');
    process.exit(1);
}

console.log('✅ Variáveis de ambiente carregadas');
console.log('📝 MONGODB_URI (primeiros 50 caracteres):', 
    process.env.MONGODB_URI.substring(0, 50) + '...');

// ==================== IMPORTAÇÕES DEPOIS DE CARREGAR .env ====================
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

// Agora a URI deve estar definida
const uri = process.env.MONGODB_URI.trim();

// Verificar se a URI é válida
if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    console.error('❌ ERRO: URI do MongoDB inválida!');
    console.error('Deve começar com mongodb:// ou mongodb+srv://');
    process.exit(1);
}

console.log('🔗 URI do MongoDB é válida');

// ==================== CONFIGURAÇÃO MONGODB ====================
const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
});

// ==================== FUNÇÃO PRINCIPAL ====================
async function startServer() {
    try {
        console.log('\n🚀 Iniciando servidor 4M Checklist...\n');
        
        // Conectar ao MongoDB
        console.log('🔗 Conectando ao MongoDB...');
        await client.connect();
        
        // Testar conexão
        await client.db().admin().ping();
        console.log('✅ MongoDB conectado com sucesso!');
        
        const db = client.db("4m_checklist");
        console.log(`🗄️  Banco de dados: ${db.databaseName}`);
        
        // Verificar/criar coleção
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        console.log('📚 Coleções disponíveis:', collectionNames);
        
        if (!collectionNames.includes('checklists')) {
            console.log('📝 Criando coleção "checklists"...');
            await db.createCollection('checklists');
            console.log('✅ Coleção "checklists" criada');
        }
        
        const collection = db.collection('checklists');
        
        // ==================== CONFIGURAÇÃO EXPRESS ====================
        const app = express();
        const port = process.env.PORT || 3001;
        
        // Middleware CORS
        app.use(cors({
            origin: [
                'http://localhost:3000',
                'http://localhost:5500',
                'http://127.0.0.1:3000',
                'http://127.0.0.1:5500',
                'https://fourm-znis.onrender.com'
            ],
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: true
        }));
        
        // Middleware JSON
        app.use(express.json({ limit: '10mb' }));
        app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        // Logging
        app.use((req, res, next) => {
            console.log(`${new Date().toLocaleTimeString()} ${req.method} ${req.url}`);
            next();
        });
        
        // Servir arquivos estáticos
        app.use(express.static(path.join(__dirname, '..', 'templates')));
        app.use('/css', express.static(path.join(__dirname, '..', 'css')));
        app.use('/scripts', express.static(path.join(__dirname, 'scripts')));
        
        // ==================== ROTAS API ====================
        
        // Rota de status
        app.get('/api/status', (req, res) => {
            res.json({
                success: true,
                message: 'API 4M Checklist funcionando',
                database: 'MongoDB',
                version: '1.0.0',
                timestamp: new Date().toISOString()
            });
        });
        
        // Rota para salvar formulário
        app.post('/api/fr0062', async (req, res) => {
            try {
                const dados = req.body;
                
                if (!dados.numero_controle) {
                    return res.status(400).json({
                        success: false,
                        message: 'Número de controle é obrigatório'
                    });
                }
                
                // Adicionar timestamps
                dados.data_criacao = new Date().toISOString();
                dados.data_atualizacao = dados.data_criacao;
                
                // Inserir no MongoDB
                const resultado = await collection.insertOne(dados);
                
                res.json({
                    success: true,
                    message: 'Formulário salvo com sucesso',
                    id: resultado.insertedId,
                    numero_controle: dados.numero_controle
                });
                
            } catch (error) {
                console.error('Erro ao salvar:', error);
                res.status(500).json({
                    success: false,
                    message: 'Erro ao salvar formulário'
                });
            }
        });
        
        // Rota para listar formulários
        app.get('/api/fr0062', async (req, res) => {
            try {
                const formularios = await collection
                    .find()
                    .sort({ data_criacao: -1 })
                    .toArray();
                
                res.json({
                    success: true,
                    count: formularios.length,
                    formularios
                });
            } catch (error) {
                console.error('Erro ao listar:', error);
                res.status(500).json({
                    success: false,
                    message: 'Erro ao listar formulários'
                });
            }
        });
        
        // Rota raiz
        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '..', 'templates', '4m.html'));
        });
        
        // Rota para checklist
        app.get('/checklist', (req, res) => {
            res.sendFile(path.join(__dirname, '..', 'templates', '4m-checklist.html'));
        });
        
        // Iniciar servidor
        app.listen(port, () => {
            console.log('\n═══════════════════════════════════════════════════════');
            console.log('🚀 Servidor 4M Checklist iniciado com sucesso!');
            console.log('═══════════════════════════════════════════════════════');
            console.log(`📡 Porta: ${port}`);
            console.log(`🌐 URL: http://localhost:${port}`);
            console.log(`🗄️  Banco: MongoDB - 4m_checklist`);
            console.log(`🏷️  Ambiente: ${process.env.NODE_ENV || 'development'}`);
            console.log('═══════════════════════════════════════════════════════\n');
        });
        
        // Fechar conexão ao sair
        process.on('SIGINT', async () => {
            await client.close();
            console.log('✅ Conexão com MongoDB fechada');
            process.exit(0);
        });
        
    } catch (error) {
        console.error('❌ Erro ao iniciar servidor:', error.message);
        console.error('Detalhes:', error);
        process.exit(1);
    }
}

// Iniciar servidor
startServer();
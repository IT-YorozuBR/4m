const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
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

        // CORS - Configuração detalhada
        const corsOptions = {
            origin: function (origin, callback) {
                const allowedOrigins = [
                    'http://127.0.0.1:5500',
                    'http://localhost:5500',
                    'http://localhost:3000',
                    'http://127.0.0.1:3000',
                    'http://localhost:3001',
                    'http://127.0.0.1:3001',
                    'https://fourm-znis.onrender.com'
                ];

                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            exposedHeaders: ['Content-Type', 'Authorization'],
            credentials: true,
            maxAge: 86400 // 24 horas
        };

        app.use(cors(corsOptions));

        // Preflight request handler
        app.options('*', cors(corsOptions));

        app.use(express.json({ limit: '50mb' }));
        app.use(express.urlencoded({ extended: true, limit: '50mb' }));

        // ==================== AUTHENTICATION HELPERS ====================
        const JWT_SECRET = process.env.JWT_SECRET || 'seu-secret-key-super-seguro-2026';
        const JWT_EXPIRES_IN = '24h';

        function verificarCredenciais(username, password) {
            // Buscar credenciais no .env
            const envUser = process.env[`USER_${username.toUpperCase()}`];
            const envPassword = process.env[`USER_${username.toUpperCase()}_PASSWORD`];

            if (envUser && envPassword && envUser === username && envPassword === password) {
                // Determinar role do usuário
                // Usuários começados com "admin" são admins
                const role = username.toLowerCase().includes('admin') ? 'admin' : 'admin';
                return { success: true, user: { username, role } };
            }
            return { success: false };
        }

        // Middleware de autenticação JWT (OPCIONAL - para admin)
        function autenticarJWT(req, res, next) {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Token não fornecido'
                });
            }

            jwt.verify(token, JWT_SECRET, (err, decoded) => {
                if (err) {
                    console.error('❌ Erro ao verificar JWT:', err.message);
                    return res.status(403).json({
                        success: false,
                        message: 'Token inválido ou expirado'
                    });
                }

                // Adicionar dados do usuário ao request
                req.user = decoded;
                next();
            });
        }

        // Middleware para verificar role
        function verificarRole(rolesPermitidas) {
            return (req, res, next) => {
                const authHeader = req.headers['authorization'];
                const token = authHeader && authHeader.split(' ')[1];

                if (token) {
                    jwt.verify(token, JWT_SECRET, (err, decoded) => {
                        if (!err && rolesPermitidas.includes(decoded.role)) {
                            req.user = decoded;
                            return next();
                        }
                    });
                }

                return res.status(403).json({
                    success: false,
                    message: 'Sem permissão para realizar esta ação'
                });
            };
        }

        // Middleware para operador (sem token, apenas acesso direto)
        function verificarOperador(req, res, next) {
            // Operador não precisa de token, acesso livre
            req.user = { username: 'operador', role: 'operador' };
            next();
        }

        // Arquivos estáticos
        app.use(express.static(path.join(__dirname, '..', 'templates')));
        app.use('/css', express.static(path.join(__dirname, '..', 'css')));
        app.use('/scripts', express.static(path.join(__dirname, 'scripts')));

        // ==================== ROTAS API ====================

        // ==================== ROTA DE LOGIN (APENAS PARA ADMIN) ====================
        app.post('/api/fr0062/login', async (req, res) => {
            try {
                const { username, password } = req.body;

                if (!username || !password) {
                    return res.status(400).json({
                        success: false,
                        message: 'Username e password são obrigatórios'
                    });
                }

                const resultado = verificarCredenciais(username, password);

                if (resultado.success) {
                    // Gerar JWT token
                    const token = jwt.sign(
                        {
                            username: resultado.user.username,
                            role: resultado.user.role
                        },
                        JWT_SECRET,
                        { expiresIn: JWT_EXPIRES_IN }
                    );

                    console.log(`✅ Login bem-sucedido para usuário: ${username} (${resultado.user.role})`);
                    return res.json({
                        success: true,
                        user: resultado.user,
                        token: token
                    });
                } else {
                    console.log(`❌ Tentativa de login falha para: ${username}`);
                    return res.status(401).json({
                        success: false,
                        message: 'Credenciais inválidas'
                    });
                }
            } catch (error) {
                console.error('❌ Erro ao fazer login:', error);
                res.status(500).json({
                    success: false,
                    message: 'Erro ao processar login',
                    error: error.message
                });
            }
        });


        // ==================== ROTAS CRUD FORMULÁRIOS ====================

        // Rota para salvar formulário FR0062 (OPERADOR + ADMIN)
        app.post('/api/fr0062', verificarOperador, async (req, res) => {
            try {
                const dados = req.body;
                console.log('📥 Recebendo dados do formulário:', dados.numero_controle);
                console.log(`👤 Criado por: ${req.user.username} (${req.user.role})`);

                if (!dados.numero_controle) {
                    return res.status(400).json({
                        success: false,
                        message: 'Número de controle é obrigatório'
                    });
                }

                // Adicionar timestamps e informações do usuário
                const agora = new Date().toISOString();
                dados.data_criacao = dados.data_criacao || agora;
                dados.data_atualizacao = agora;
                dados.criado_por = req.user.username;
                dados.status = dados.status || 'em_andamento';

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

        // ==================== ROTA PARA GERAR NÚMERO DE CONTROLE ====================
        // Baseado na quantidade de checklists existentes + 1
        // Cada reload da página gera um novo número baseado no count atual
        app.get('/api/fr0062/proximo-numero', verificarOperador, async (req, res) => {
            try {
                // 1. Contar quantos checklists existem no banco
                const totalExistentes = await db.collection('checklists').countDocuments();

                // 2. Próximo número = total + 1
                const proximoNumero = totalExistentes + 1;

                // 3. Formatar número no padrão: FR0062-000000001, FR0062-000000002, etc.
                const numero = `FR0062-${String(proximoNumero).padStart(9, '0')}`;
                
                console.log(`✅ Número de controle gerado: ${numero} (Total de checklists: ${totalExistentes})`);
                
                res.json({ 
                    success: true, 
                    numero_controle: numero,
                    sequencia: proximoNumero,
                    total_existentes: totalExistentes
                });

            } catch (error) {
                console.error('❌ Erro ao gerar número de controle:', error);
                res.status(500).json({ 
                    success: false, 
                    message: 'Erro ao gerar número de controle',
                    error: error.message 
                });
            }
        });

        // Rota para listar formulários com paginação (OPERADOR + ADMIN)
        app.get('/api/fr0062', verificarOperador, async (req, res) => {
            try {
                // Mantém compatibilidade com pagina/limite e aceita page/limit
                const pagina = parseInt(req.query.page || req.query.pagina, 10) || 1;
                const limite = parseInt(req.query.limit || req.query.limite, 10) || 10;
                const busca = (req.query.busca || '').trim();
                const status = (req.query.status || '').trim();
                const ano = (req.query.ano || '').trim();

                // Validações
                if (pagina < 1) {
                    return res.status(400).json({
                        success: false,
                        message: 'Página deve ser maior que 0'
                    });
                }

                if (limite < 1 || limite > 100) {
                    return res.status(400).json({
                        success: false,
                        message: 'Limite deve estar entre 1 e 100'
                    });
                }

                // Montar filtro principal da listagem
                const filtro = {};
                if (busca.trim()) {
                    filtro.$or = [
                        { numero_controle: { $regex: busca, $options: 'i' } },
                        { criado_por: { $regex: busca, $options: 'i' } },
                        { status: { $regex: busca, $options: 'i' } }
                    ];
                }

                if (status) {
                    if (status === 'concluido') {
                        filtro.status = { $in: ['concluido', 'finalizado'] };
                    } else {
                        filtro.status = status;
                    }
                }

                if (ano) {
                    filtro.data_criacao = { $regex: `^${ano}` };
                }

                // Estatísticas seguem a busca/ano, mas ignoram o filtro de status
                const filtroEstatisticas = { ...filtro };
                delete filtroEstatisticas.status;

                // Contar total de documentos que correspondem ao filtro
                const totalDocumentos = await db
                    .collection('checklists')
                    .countDocuments(filtro);

                // Calcular total de páginas
                const totalPaginas = totalDocumentos > 0 ? Math.ceil(totalDocumentos / limite) : 0;

                // Validar se a página existe
                if (pagina > totalPaginas && totalDocumentos > 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Página ${pagina} não existe. Total de páginas: ${totalPaginas}`
                    });
                }

                // Calcular skip
                const skip = (pagina - 1) * limite;

                // Buscar documentos com paginação
                const formularios = await db
                    .collection('checklists')
                    .find(filtro)
                    .sort({ data_atualizacao: -1, data_criacao: -1 })
                    .skip(skip)
                    .limit(limite)
                    .toArray();

                const estatisticasPorStatus = await db.collection('checklists').aggregate([
                    { $match: filtroEstatisticas },
                    {
                        $project: {
                            status_normalizado: {
                                $cond: [
                                    { $eq: ['$status', 'finalizado'] },
                                    'concluido',
                                    { $ifNull: ['$status', 'em_andamento'] }
                                ]
                            }
                        }
                    },
                    {
                        $group: {
                            _id: '$status_normalizado',
                            total: { $sum: 1 }
                        }
                    }
                ]).toArray();

                const stats = {
                    total: await db.collection('checklists').countDocuments(filtroEstatisticas),
                    em_andamento: 0,
                    aguardando_qualidade: 0,
                    aguardando_aprovacao: 0,
                    concluido: 0
                };

                estatisticasPorStatus.forEach((item) => {
                    if (Object.prototype.hasOwnProperty.call(stats, item._id)) {
                        stats[item._id] = item.total;
                    }
                });

                console.log(`📄 Listando página ${pagina} de ${totalPaginas} (${limite} itens por página)`);

                res.json({
                    success: true,
                    data: formularios,
                    pagination: {
                        page: pagina,
                        limit: limite,
                        total: totalDocumentos,
                        totalPages: totalPaginas
                    },
                    stats,
                    paginacao: {
                        pagina_atual: pagina,
                        limite_por_pagina: limite,
                        total_documentos: totalDocumentos,
                        total_paginas: totalPaginas,
                        tem_proxima: pagina < totalPaginas,
                        tem_anterior: pagina > 1
                    },
                    formularios,
                    count: formularios.length
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

        // Rota para buscar um formulário específico (OPERADOR + ADMIN)
        app.get('/api/fr0062/:numeroControle', verificarOperador, async (req, res) => {
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

        // Rota para atualizar um formulário (OPERADOR + ADMIN com restrições)
        app.put('/api/fr0062/:numeroControle', async (req, res) => {
            try {
                const { numeroControle } = req.params;
                const dados = req.body;

                // 1. Extração e limpeza do Token
                const authHeader = req.headers['authorization'];
                let token = authHeader && authHeader.split(' ')[1];

                // Se o token for a string "null" ou "undefined" vinda do front, tratamos como nulo
                if (token === 'null' || token === 'undefined') token = null;

                // Usuário padrão caso não haja token válido
                let user = { username: 'operador', role: 'operador' };

                // 2. Verificação do JWT (Se houver token)
                if (token) {
                    try {
                        const decoded = jwt.verify(token, JWT_SECRET);
                        user = decoded;
                        console.log(`✅ Token Admin verificado: ${user.username} (${user.role})`);
                    } catch (err) {
                        console.error('❌ Erro na verificação do JWT no PUT:', err.message);
                        // Se o cara mandou um token e ele é inválido, barramos por segurança
                        return res.status(403).json({
                            success: false,
                            message: 'Sessão inválida ou expirada. Por favor, faça login novamente.'
                        });
                    }
                }

                // 3. Busca o formulário no Banco de Dados
                const formularioAtual = await db.collection('checklists').findOne({
                    numero_controle: numeroControle
                });

                if (!formularioAtual) {
                    return res.status(404).json({
                        success: false,
                        message: 'Formulário não encontrado no banco de dados.'
                    });
                }

                const statusAtual = formularioAtual.status || 'em_andamento';
                const statusNovo = dados.status || statusAtual;

                // 4. Validação de Regras de Negócio por Role
                // Garantimos que o role seja comparado sempre em minúsculo para evitar erros de digitação
                const userRole = user.role ? user.role.toLowerCase() : 'operador';

                if (userRole === 'operador') {
                    // Regra: Nenhum operador edita checklist concluído/finalizado
                    if (statusAtual === 'concluido' || statusAtual === 'finalizado') {
                        console.log(`🚫 Bloqueado: Operador ${user.username} tentou editar checklist concluído.`);
                        return res.status(403).json({
                            success: false,
                            message: 'Não é possível editar um checklist já concluído.'
                        });
                    }

                    // Operador/Qualidade nunca podem definir status 'concluido' — só admin pode
                    if (statusNovo === 'concluido' || statusNovo === 'finalizado') {
                        return res.status(403).json({
                            success: false,
                            message: 'Apenas administradores podem concluir checklists.'
                        });
                    }

                    // Validar transições permitidas (fluxo linear)
                    const transicoesPermitidas = {
                        'em_andamento': ['em_andamento', 'aguardando_qualidade'],
                        'aguardando_qualidade': ['aguardando_qualidade', 'aguardando_aprovacao'],
                        'aguardando_aprovacao': ['aguardando_aprovacao'] // avanço para concluido só por admin
                    };

                    const permitidos = transicoesPermitidas[statusAtual] || [];
                    if (statusNovo !== statusAtual && !permitidos.includes(statusNovo)) {
                        console.log(`🚫 Transição inválida: ${statusAtual} → ${statusNovo} por ${user.username}`);
                        return res.status(403).json({
                            success: false,
                            message: `Transição de status '${statusAtual}' para '${statusNovo}' não é permitida.`
                        });
                    }

                    console.log(`📝 Operador/Qualidade ${user.username} atualizando: ${numeroControle} (${statusAtual} → ${statusNovo})`);

                } else if (userRole === 'admin') {
                    console.log(`👑 Admin ${user.username} atualizando: ${numeroControle} (Permissão Total)`);
                } else {
                    // Caso o role no token seja algo bizarro (ex: "user", "manager")
                    console.error(`⚠️ Role desconhecido detectado: ${userRole}`);
                    return res.status(403).json({
                        success: false,
                        message: 'Seu nível de acesso não permite esta ação.'
                    });
                }

                // 5. Preparação dos dados e Update
                dados.data_atualizacao = new Date().toISOString();
                dados.atualizado_por = user.username;

                // Removemos o _id dos dados para evitar erro de tentativa de alterar chave primária do Mongo
                delete dados._id;
                // data_criacao nunca deve ser sobrescrita em um update
                delete dados.data_criacao;

                const resultado = await db.collection('checklists').updateOne(
                    { numero_controle: numeroControle },
                    { $set: dados }
                );

                if (resultado.matchedCount === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Não foi possível encontrar o registro para atualizar.'
                    });
                }

                res.json({
                    success: true,
                    message: 'Formulário atualizado com sucesso!',
                    usuario: user.username
                });

            } catch (error) {
                console.error('❌ Erro crítico no Servidor (PUT):', error);
                res.status(500).json({
                    success: false,
                    message: 'Erro interno ao processar a atualização.',
                    error: error.message
                });
            }
        });

        // Rota para deletar um formulário (APENAS ADMIN)
        app.delete('/api/fr0062/:numeroControle', async (req, res) => {
            try {
                const numeroControle = req.params.numeroControle;

                // Verificar token (obrigatório para delete)
                const authHeader = req.headers['authorization'];
                const token = authHeader && authHeader.split(' ')[1];

                if (!token) {
                    return res.status(401).json({
                        success: false,
                        message: 'Token não fornecido. Apenas admins podem deletar.'
                    });
                }

                let user;
                try {
                    user = jwt.verify(token, JWT_SECRET);
                } catch (err) {
                    return res.status(403).json({
                        success: false,
                        message: 'Token inválido ou expirado'
                    });
                }

                // Apenas ADMIN pode deletar
                if (user.role !== 'admin') {
                    console.log(`❌ Usuário ${user.username} (${user.role}) tentou deletar ${numeroControle}`);
                    return res.status(403).json({
                        success: false,
                        message: 'Apenas administradores podem deletar checklists'
                    });
                }

                console.log(`👑 Admin ${user.username} deletando ${numeroControle}`);

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
                    'POST /api/fr0062/login': 'Login (Admin)',
                    'GET /api/fr0062/proximo-numero': 'Gerar próximo número sequencial (Operador/Admin)',
                    'POST /api/fr0062': 'Criar novo formulário (Operador/Admin)',
                    'GET /api/fr0062': 'Listar todos os formulários (Operador/Admin)',
                    'GET /api/fr0062/:id': 'Buscar formulário específico (Operador/Admin)',
                    'PUT /api/fr0062/:id': 'Atualizar formulário (Operador/Admin com restrições)',
                    'DELETE /api/fr0062/:id': 'Deletar formulário (Apenas Admin)'
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
            console.log('═══════════════════════════════════════════════════════════════════════════');
            console.log('🚀 Servidor FR0062 iniciado com sucesso!');
            console.log('═══════════════════════════════════════════════════════════════════════════');
            console.log(`📡 Porta: ${port}`);
            console.log(`🌐 URL: http://localhost:${port}`);
            console.log(`🗄️  Banco de dados: MongoDB - 4m_checklist`);
            console.log('');
            console.log('📋 Endpoints disponíveis:');
            console.log(`   POST   /api/fr0062/login           - Login (Admin)`);
            console.log(`   GET    /api/fr0062/proximo-numero   - Gerar número sequencial ⭐ CORRIGIDO`);
            console.log(`   POST   /api/fr0062                 - Criar formulário (Operador/Admin)`);
            console.log(`   GET    /api/fr0062                 - Listar formulários (Operador/Admin)`);
            console.log(`   GET    /api/fr0062/:id             - Buscar formulário (Operador/Admin)`);
            console.log(`   PUT    /api/fr0062/:id             - Atualizar formulário (Operador/Admin)`);
            console.log(`   DELETE /api/fr0062/:id             - Deletar formulário (Apenas Admin)`);
            console.log(`   GET    /api/status                 - Status da API`);
            console.log('');
            console.log('🔐 PERMISSÕES:');
            console.log(`   OPERADOR: Sem login, acesso direto`);
            console.log(`   - Criar checklists`);
            console.log(`   - Editar checklists em andamento`);
            console.log(`   - Finalizar checklists`);
            console.log(`   - Visualizar tudo (read-only em finalizados)`);
            console.log(`   - NÃO pode editar finalizados`);
            console.log(`   - NÃO pode deletar`);
            console.log('');
            console.log(`   ADMIN: Login obrigatório`);
            console.log(`   - Tudo que operador pode fazer`);
            console.log(`   - Editar checklists finalizados`);
            console.log(`   - Deletar checklists`);
            console.log('');
            console.log('⭐ CONTADOR SEQUENCIAL:');
            console.log(`   - Números NUNCA se repetem`);
            console.log(`   - Independente de deletions`);
            console.log(`   - Formato: FR0062-000000001, FR0062-000000002, etc.`);
            console.log('═══════════════════════════════════════════════════════════════════════════');
            console.log('');
        });

    } catch (error) {
        console.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1);
    }
}

// Iniciar o servidor
startServer();

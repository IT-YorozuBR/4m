const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const uri = process.env.MONGODB_URI;

// Conexão MongoDB reutilizada entre invocações.
// Em serverless (Vercel) o módulo é reaproveitado em instâncias "quentes":
// reconectar a cada requisição causa lentidão e timeouts, e quando a função
// estoura o tempo limite a plataforma devolve uma página HTML 500 — o que no
// front aparece como "Unexpected token '<'" ao tentar dar JSON.parse na resposta.
const globalForMongo = globalThis;

// Retorna uma promise (cacheada) do client conectado. Se a conexão falhar,
// limpa o cache para permitir nova tentativa na próxima invocação — assim uma
// falha transitória no cold start não "trava" a instância para sempre.
function getMongoClient() {
    if (!globalForMongo._mongoClientPromise) {
        const client = new MongoClient(uri, {
            // Falha rápido se o banco não responder, em vez de travar a função
            // até o timeout da plataforma. Assim o erro vira JSON, não HTML.
            serverSelectionTimeoutMS: 8000,
            maxPoolSize: 10
        });
        globalForMongo._mongoClientPromise = client.connect().catch((err) => {
            globalForMongo._mongoClientPromise = null;
            throw err;
        });
    }
    return globalForMongo._mongoClientPromise;
}

async function buildApp() {
    try {
        // Reaproveita a conexão já estabelecida (não reconecta a cada requisição)
        const client = await getMongoClient();
        const db = client.db("4m_checklist");
        const usersCollection = db.collection('users');
        const checklistsCollection = db.collection('checklists');
        const countersCollection = db.collection('counters');
        const auditLogsCollection = db.collection('audit_logs');
        console.log("✅ Conectado ao MongoDB");

        const app = express();
        const publicApiBaseUrl = String(process.env.PUBLIC_API_BASE_URL || '').trim().replace(/\/+$/, '');
        const publicApiUrl = String(process.env.PUBLIC_API_URL || '').trim().replace(/\/+$/, '') || (publicApiBaseUrl ? `${publicApiBaseUrl}/api` : '/api');
        const envCorsOrigins = String(process.env.CORS_ORIGINS || '')
            .split(',')
            .map((origin) => origin.trim().replace(/\/+$/, ''))
            .filter(Boolean);

        // CORS - Configuração detalhada.
        // Usamos a forma "delegate" do cors (recebe `req`) para conseguir liberar
        // requisições same-origin: o front e a API são servidos pelo MESMO domínio
        // na Vercel, então o navegador manda o header Origin em POST/PUT/DELETE
        // (mas não em GET same-origin). Comparando o Origin com o Host da própria
        // requisição liberamos o tráfego do próprio site sem depender de configurar
        // CORS_ORIGINS com o domínio de produção. Sem isso, o cors lançava
        // "Not allowed by CORS" e — como não há middleware de erro — o Express
        // devolvia uma página HTML 500, que no front vira "Unexpected token '<'".
        const corsOptionsDelegate = (req, callback) => {
            const allowedOrigins = [
                'http://127.0.0.1:5500',
                'http://localhost:5500',
                'http://localhost:3000',
                'http://127.0.0.1:3000',
                'http://localhost:3001',
                'http://127.0.0.1:3001',
                ...envCorsOrigins
            ];

            const origin = req.headers.origin;
            const normalizedOrigin = origin ? origin.replace(/\/+$/, '') : origin;

            // Same-origin: o host do Origin bate com o Host da requisição.
            const forwardedProto = req.headers['x-forwarded-proto'];
            const host = req.headers.host;
            const sameOrigin =
                !!normalizedOrigin &&
                !!host &&
                (normalizedOrigin === `https://${host}` ||
                    normalizedOrigin === `http://${host}` ||
                    (forwardedProto && normalizedOrigin === `${forwardedProto}://${host}`));

            const permitido =
                !normalizedOrigin ||
                sameOrigin ||
                allowedOrigins.includes(normalizedOrigin);

            callback(null, {
                origin: permitido,
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                allowedHeaders: ['Content-Type', 'Authorization'],
                exposedHeaders: ['Content-Type', 'Authorization'],
                credentials: true,
                maxAge: 86400 // 24 horas
            });
        };

        app.use(cors(corsOptionsDelegate));

        // Preflight request handler
        app.options('*', cors(corsOptionsDelegate));

        // Parsers do corpo da requisição.
        // ATENÇÃO (serverless/Vercel): a plataforma pode JÁ ter lido e parseado o
        // corpo da requisição, populando `req.body` e consumindo o stream. Se o
        // express.json() tentar ler de novo, ele fica esperando um 'end' que nunca
        // vem e a função trava até o timeout -> a Vercel devolve 500/504. Isso
        // afeta só POST/PUT (que têm corpo); GET continua funcionando. Por isso só
        // rodamos os parsers quando o corpo ainda NÃO foi parseado pela plataforma.
        const jsonParser = express.json({ limit: '50mb' });
        const urlencodedParser = express.urlencoded({ extended: true, limit: '50mb' });

        app.use((req, res, next) => {
            // Corpo já parseado pela plataforma (objeto pronto) -> não reparsear.
            if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
                return next();
            }
            jsonParser(req, res, (err) => (err ? next(err) : urlencodedParser(req, res, next)));
        });

        // ==================== AUTHENTICATION HELPERS ====================
        const JWT_SECRET = process.env.JWT_SECRET || 'seu-secret-key-super-seguro-2026';
        const JWT_EXPIRES_IN = '24h';
        const MASTER_ADMIN_USERNAME = 'admin.ti';

        // ──────────────────────────────────────────────────────────────
        // CONTROLE DE ACESSO POR ETAPA (níveis hierárquicos de role)
        //   operador (0)            → Produção (não exige conta)
        //   qualidade (1)           → Qualidade
        //   aprovador_qualidade (2) → Aprovação Qualidade
        //   admin (3)               → Aprovação / Conclusão (faz tudo)
        // Um nível mais alto pode atuar nas etapas de nível mais baixo.
        // ──────────────────────────────────────────────────────────────
        const ROLES_VALIDOS = [
            'operador', 'qualidade', 'aprovador_qualidade', 'admin',
            'engenharia', 'logistica_pc', 'producao_aprovacao'
        ];
        // "operador" é o nível implícito da Produção (sem conta). Contas só existem
        // para Qualidade, Aprovação Qualidade, Admin e as etapas "se programado".
        const ROLES_CONTA = [
            'qualidade', 'aprovador_qualidade', 'admin',
            'engenharia', 'logistica_pc', 'producao_aprovacao'
        ];
        const NIVEL_ROLE = {
            operador: 0, qualidade: 1, aprovador_qualidade: 2, admin: 3,
            // Papéis das etapas "se programado" não são hierárquicos — o acesso é
            // resolvido por ROLES_ETAPA_ESPECIAL, não por nível.
            engenharia: 0, logistica_pc: 0, producao_aprovacao: 0
        };
        // Nível mínimo necessário para EDITAR / avançar a partir de cada status.
        const NIVEL_MINIMO_POR_STATUS = {
            em_andamento: 0,
            aguardando_qualidade: 1,
            aguardando_aprovacao_qualidade: 2,
            aguardando_aprovacao: 3,
            concluido: 3,
            finalizado: 3
        };
        // Etapas "se programado": acesso por papel específico (não hierárquico).
        const ROLES_ETAPA_ESPECIAL = {
            aguardando_aprovacao_engenharia: ['engenharia'],
            aguardando_aprovacao_logistica: ['logistica_pc'],
            aguardando_aprovacao_producao: ['producao_aprovacao'],
            aguardando_conclusao_qualidade: ['qualidade', 'aprovador_qualidade']
        };

        // Etapa "Em aberto": só pode ser definida a partir da última etapa do fluxo
        // (Aprovação, ou Conclusão Qualidade no fluxo "se programado"). Prazo em dias.
        const ETAPAS_ORIGEM_EM_ABERTO = ['aguardando_aprovacao', 'aguardando_conclusao_qualidade'];
        const PRAZO_EM_ABERTO_DIAS = 30;

        function normalizarRole(role) {
            const r = String(role || '').trim().toLowerCase();
            return ROLES_VALIDOS.includes(r) ? r : 'operador';
        }

        function normalizarUsername(username) {
            return String(username || '').trim().toLowerCase();
        }

        function gerarHashSenha(password, salt = crypto.randomBytes(16).toString('hex')) {
            const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
            return `${salt}:${hash}`;
        }

        function verificarHashSenha(password, storedHash) {
            const [salt, originalHash] = String(storedHash || '').split(':');

            if (!salt || !originalHash) {
                return false;
            }

            const candidateHash = crypto.scryptSync(String(password), salt, 64).toString('hex');
            const originalBuffer = Buffer.from(originalHash, 'hex');
            const candidateBuffer = Buffer.from(candidateHash, 'hex');

            if (originalBuffer.length !== candidateBuffer.length) {
                return false;
            }

            return crypto.timingSafeEqual(originalBuffer, candidateBuffer);
        }

        function isMasterAdmin(user) {
            return !!user && user.role === 'admin' && user.username === MASTER_ADMIN_USERNAME;
        }

        function isAdminUser(user) {
            return !!user && normalizarRole(user.role) === 'admin';
        }

        async function garantirUsuariosIniciais() {
            await usersCollection.createIndex({ username: 1 }, { unique: true });

            const envUserKeys = Object.keys(process.env).filter((key) => key.startsWith('USER_') && !key.endsWith('_PASSWORD') && !key.endsWith('_ROLE'));

            for (const envUserKey of envUserKeys) {
                const username = normalizarUsername(process.env[envUserKey]);
                const password = String(process.env[`${envUserKey}_PASSWORD`] || '').trim();
                const role = String(process.env[`${envUserKey}_ROLE`] || 'admin').trim().toLowerCase() || 'admin';

                if (!username || !password) {
                    continue;
                }

                const existente = await usersCollection.findOne({ username });

                if (existente) {
                    continue;
                }

                await usersCollection.insertOne({
                    username,
                    password_hash: gerarHashSenha(password),
                    role: normalizarRole(role),
                    active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    created_by: 'system_env'
                });
            }
        }

        // Contas fixas das etapas do fluxo. Garante que existam (e com o role
        // correto) independentemente da configuração de ambiente. Não sobrescreve
        // a senha de uma conta já existente — apenas corrige o role se divergir.
        const CONTAS_ETAPAS = [
            { username: 'qualidade', password: 'qualidade123', role: 'qualidade' },
            { username: 'aprovador.qualidade', password: 'aprovador123', role: 'aprovador_qualidade' },
            // Contas das etapas "se programado" (Engenharia → Log./P.C. → Produção)
            { username: 'engenharia', password: 'engenharia123', role: 'engenharia' },
            { username: 'logistica.pc', password: 'logistica123', role: 'logistica_pc' },
            { username: 'producao.aprovacao', password: 'producao123', role: 'producao_aprovacao' }
        ];

        async function garantirContasEtapas() {
            for (const conta of CONTAS_ETAPAS) {
                const username = normalizarUsername(conta.username);
                const existente = await usersCollection.findOne({ username });

                if (!existente) {
                    await usersCollection.insertOne({
                        username,
                        password_hash: gerarHashSenha(conta.password),
                        role: conta.role,
                        active: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        created_by: 'system_stage_seed'
                    });
                    console.log(`👤 Conta de etapa criada: ${username} (${conta.role})`);
                } else if (normalizarRole(existente.role) !== conta.role) {
                    await usersCollection.updateOne(
                        { username },
                        { $set: { role: conta.role, updated_at: new Date().toISOString() } }
                    );
                    console.log(`🔁 Role da conta '${username}' ajustado para '${conta.role}'`);
                }
            }
        }

        // ──────────────────────────────────────────────────────────────
        // NÚMERO DE CONTROLE — geração atômica (corrige bug de duplicidade)
        //
        // O gerador antigo calculava o próximo número como
        // `countDocuments() + 1` a cada chamada de /proximo-numero, sem
        // reservar o valor. Duas criações de checklist próximas no tempo
        // (duas abas, dois usuários, ou só o usuário recarregando a tela de
        // "novo checklist" antes de salvar) recebiam o MESMO número, e como
        // não havia índice único em `numero_controle`, o Mongo aceitava os
        // dois documentos. A partir daí, GET/PUT por numero_controle
        // (`findOne`/`updateOne`) podiam pegar/alterar o registro errado —
        // exatamente o sintoma de "aparecem dados que não fui eu".
        //
        // Fix: sequência atômica via $inc numa collection `counters` (não
        // tem como duas chamadas concorrentes saírem com o mesmo valor) +
        // índice único em checklists.numero_controle como segunda barreira.
        // ──────────────────────────────────────────────────────────────
        const CONTADOR_ID = 'fr0062_numero_controle';

        async function garantirIndiceChecklists() {
            try {
                await checklistsCollection.createIndex({ numero_controle: 1 }, { unique: true });
            } catch (err) {
                // Se já existirem duplicados no banco (resíduo do bug antigo), a
                // criação do índice falha. Não derruba o servidor por isso — loga
                // um alerta bem visível para que os duplicados sejam limpos.
                console.error('⚠️ ATENÇÃO: não foi possível criar índice único em checklists.numero_controle.');
                console.error('   Provavelmente já existem checklists com numero_controle duplicado no banco.');
                console.error('   Detalhe:', err.message);
            }
        }

        async function garantirContadorChecklists() {
            const existente = await countersCollection.findOne({ _id: CONTADOR_ID });
            if (existente) return;

            // Semeia o contador a partir do maior número já usado nos checklists
            // existentes (mais seguro que countDocuments() se já houver gaps ou
            // duplicados deixados pelo gerador antigo).
            const registros = await checklistsCollection
                .find({ numero_controle: { $exists: true } }, { projection: { numero_controle: 1 } })
                .toArray();

            let maiorNumero = 0;
            for (const registro of registros) {
                const match = /^FR0062-(\d+)$/.exec(registro.numero_controle || '');
                if (match) {
                    const n = parseInt(match[1], 10);
                    if (n > maiorNumero) maiorNumero = n;
                }
            }

            await countersCollection.insertOne({ _id: CONTADOR_ID, seq: maiorNumero });
        }

        async function obterProximoNumeroControle() {
            const resultado = await countersCollection.findOneAndUpdate(
                { _id: CONTADOR_ID },
                { $inc: { seq: 1 } },
                { upsert: true, returnDocument: 'after' }
            );
            const seq = resultado?.value?.seq ?? resultado?.seq;
            return `FR0062-${String(seq).padStart(9, '0')}`;
        }

        async function verificarCredenciais(username, password) {
            const usernameNormalizado = normalizarUsername(username);
            const user = await usersCollection.findOne({
                username: usernameNormalizado,
                active: true
            });

            if (!user || !verificarHashSenha(password, user.password_hash)) {
                return { success: false };
            }
            return {
                success: true,
                user: {
                    username: user.username,
                    role: normalizarRole(user.role)
                }
            };
        }

        await garantirUsuariosIniciais();
        await garantirContasEtapas();
        await garantirContadorChecklists();
        await garantirIndiceChecklists();
        await garantirIndicesAuditoria();

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

        function obterUsuarioPorToken(req) {
            const authHeader = req.headers['authorization'];
            let token = authHeader && authHeader.split(' ')[1];

            if (token === 'null' || token === 'undefined') {
                token = null;
            }

            if (!token) {
                return null;
            }

            try {
                return jwt.verify(token, JWT_SECRET);
            } catch (error) {
                return null;
            }
        }

        // ==================== AUDITORIA (LOGS DE RASTREABILIDADE) ====================
        // Registra QUEM fez, QUANDO fez e O QUE mudou. Os registros são somente de
        // leitura pela API (não há rota de edição/remoção) e só o admin consulta.
        // Regra de ouro: auditoria NUNCA pode quebrar a operação — todo registro é
        // best-effort e qualquer erro é apenas logado no console.
        const AUDIT_CAMPOS_SENSIVEIS = ['password', 'senha', 'password_hash', 'token', 'authorization', 'nova_senha'];
        const AUDIT_MAX_ALTERACOES = 60;
        const AUDIT_MAX_TEXTO = 300;

        function auditCampoSensivel(campo) {
            const nome = String(campo || '').toLowerCase();
            return AUDIT_CAMPOS_SENSIVEIS.some((sensivel) => nome.includes(sensivel));
        }

        // Resume qualquer valor para algo curto e legível na tabela de auditoria.
        // Objetos/arrays viram um resumo (não guardamos o documento inteiro duas
        // vezes por update — isso inflaria a collection sem necessidade).
        function auditResumirValor(valor) {
            if (valor === undefined) return null;
            if (valor === null) return null;

            if (Array.isArray(valor)) {
                const texto = JSON.stringify(valor);
                return texto.length > AUDIT_MAX_TEXTO
                    ? `[${valor.length} item(ns)]`
                    : texto;
            }

            if (typeof valor === 'object') {
                const texto = JSON.stringify(valor);
                return texto.length > AUDIT_MAX_TEXTO
                    ? `{${Object.keys(valor).length} campo(s)}`
                    : texto;
            }

            const texto = String(valor);
            return texto.length > AUDIT_MAX_TEXTO ? `${texto.slice(0, AUDIT_MAX_TEXTO)}…` : texto;
        }

        // Compara o documento antes/depois e devolve só o que realmente mudou.
        function auditCalcularAlteracoes(antes, depois, ignorar = []) {
            const alteracoes = [];
            const ignorados = new Set([
                '_id', 'data_atualizacao', 'updated_at', 'atualizado_por', 'updated_by',
                ...ignorar
            ]);

            const origem = antes && typeof antes === 'object' ? antes : {};
            const destino = depois && typeof depois === 'object' ? depois : {};
            const campos = new Set([...Object.keys(origem), ...Object.keys(destino)]);

            for (const campo of campos) {
                if (ignorados.has(campo)) continue;

                const valorAntigo = origem[campo];
                const valorNovo = destino[campo];

                // Campo não enviado no update -> não houve alteração
                if (valorNovo === undefined && !(campo in destino)) continue;

                if (JSON.stringify(valorAntigo ?? null) === JSON.stringify(valorNovo ?? null)) continue;

                if (auditCampoSensivel(campo)) {
                    alteracoes.push({ campo, de: '***', para: '***' });
                } else {
                    alteracoes.push({
                        campo,
                        de: auditResumirValor(valorAntigo),
                        para: auditResumirValor(valorNovo)
                    });
                }

                if (alteracoes.length >= AUDIT_MAX_ALTERACOES) {
                    alteracoes.push({ campo: '…', de: null, para: 'demais alterações omitidas' });
                    break;
                }
            }

            return alteracoes;
        }

        function auditObterIp(req) {
            const encaminhado = String(req?.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
            return encaminhado || req?.socket?.remoteAddress || req?.ip || '';
        }

        async function garantirIndicesAuditoria() {
            try {
                await auditLogsCollection.createIndex({ timestamp: -1 });
                await auditLogsCollection.createIndex({ usuario: 1, timestamp: -1 });
                await auditLogsCollection.createIndex({ entidade_id: 1, timestamp: -1 });
                await auditLogsCollection.createIndex({ acao: 1, timestamp: -1 });
            } catch (err) {
                console.error('⚠️ Não foi possível criar índices de auditoria:', err.message);
            }
        }

        // Grava um evento de auditoria. Sempre "fire and forget" com try/catch:
        // se a auditoria falhar, a requisição do usuário continua normalmente.
        async function registrarAuditoria(req, evento = {}) {
            try {
                const agora = new Date();
                const usuario = evento.usuario || req?.user?.username || 'desconhecido';

                const registro = {
                    timestamp: agora.toISOString(),
                    data: agora.toISOString().slice(0, 10),
                    usuario: String(usuario),
                    role: normalizarRole(evento.role || req?.user?.role || 'operador'),
                    acao: String(evento.acao || 'desconhecida'),
                    categoria: String(evento.categoria || 'geral'),
                    entidade: String(evento.entidade || ''),
                    entidade_id: evento.entidade_id ? String(evento.entidade_id) : '',
                    descricao: String(evento.descricao || ''),
                    resultado: evento.resultado || 'sucesso',
                    alteracoes: Array.isArray(evento.alteracoes) ? evento.alteracoes : [],
                    metodo: req?.method || '',
                    rota: req?.originalUrl || req?.url || '',
                    ip: auditObterIp(req),
                    user_agent: String(req?.headers?.['user-agent'] || '').slice(0, 250)
                };

                await auditLogsCollection.insertOne(registro);
            } catch (err) {
                console.error('⚠️ Falha ao gravar log de auditoria:', err.message);
            }
        }

        function validarTexto(valor, nomeCampo, tamanhoMaximo) {
            const texto = String(valor || '').trim();

            if (!texto) {
                throw new Error(`${nomeCampo} é obrigatório`);
            }

            if (texto.length > tamanhoMaximo) {
                throw new Error(`${nomeCampo} deve ter no máximo ${tamanhoMaximo} caracteres`);
            }

            return texto;
        }

        function validarUrlModulo(url) {
            const urlLimpa = validarTexto(url, 'Link do submódulo', 1000);

            try {
                const urlObj = new URL(urlLimpa);
                if (!['http:', 'https:'].includes(urlObj.protocol)) {
                    throw new Error('Link do submódulo deve usar http ou https');
                }
            } catch (error) {
                throw new Error('Link do submódulo inválido');
            }

            return urlLimpa;
        }

        function normalizarDashboardModules(modules) {
            if (!Array.isArray(modules)) {
                throw new Error('Lista de módulos inválida');
            }

            if (modules.length > 30) {
                throw new Error('Limite máximo de 30 módulos excedido');
            }

            return modules.map((module, moduleIndex) => {
                const moduleId = validarTexto(
                    module.id || `modulo-${moduleIndex + 1}`,
                    `Identificador do módulo ${moduleIndex + 1}`,
                    80
                ).toLowerCase().replace(/[^a-z0-9_-]/g, '-');

                const title = validarTexto(module.title, `Nome do módulo ${moduleIndex + 1}`, 80);
                const description = String(module.description || '').trim().slice(0, 140);
                const icon = String(module.icon || 'description').trim().slice(0, 50) || 'description';
                const submodules = Array.isArray(module.submodules) ? module.submodules : [];

                if (submodules.length > 100) {
                    throw new Error(`Módulo ${title} excedeu o limite de 100 submódulos`);
                }

                return {
                    id: moduleId || `modulo-${moduleIndex + 1}`,
                    title,
                    description: description || 'Links de formulários',
                    icon,
                    submodules: submodules.map((submodule, submoduleIndex) => ({
                        id: validarTexto(
                            submodule.id || `${moduleId}-sub-${submoduleIndex + 1}`,
                            `Identificador do submódulo ${submoduleIndex + 1} de ${title}`,
                            120
                        ).toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
                        name: validarTexto(
                            submodule.name,
                            `Nome do submódulo ${submoduleIndex + 1} de ${title}`,
                            100
                        ),
                        description: String(submodule.description || '').trim().slice(0, 220),
                        url: validarUrlModulo(submodule.url)
                    }))
                };
            });
        }

        // Arquivos estáticos
        app.get('/scripts/api-config.js', (req, res) => {
            res.type('application/javascript').send(
                `window.APP_CONFIG = Object.freeze(${JSON.stringify({
                    API_BASE_URL: publicApiBaseUrl,
                    API_URL: publicApiUrl
                })});`
            );
        });

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

                const resultado = await verificarCredenciais(username, password);

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
                    await registrarAuditoria(req, {
                        usuario: resultado.user.username,
                        role: resultado.user.role,
                        acao: 'login',
                        categoria: 'autenticacao',
                        entidade: 'sessao',
                        entidade_id: resultado.user.username,
                        descricao: `Login realizado com sucesso (perfil ${resultado.user.role})`
                    });
                    return res.json({
                        success: true,
                        user: resultado.user,
                        token: token
                    });
                } else {
                    console.log(`❌ Tentativa de login falha para: ${username}`);
                    await registrarAuditoria(req, {
                        usuario: normalizarUsername(username) || 'desconhecido',
                        role: 'operador',
                        acao: 'login_falha',
                        categoria: 'autenticacao',
                        entidade: 'sessao',
                        entidade_id: normalizarUsername(username),
                        descricao: 'Tentativa de login com credenciais inválidas',
                        resultado: 'negado'
                    });
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
        app.get('/api/admin/users', autenticarJWT, async (req, res) => {
            try {
                if (!isAdminUser(req.user)) {
                    return res.status(403).json({
                        success: false,
                        message: 'Apenas administradores podem gerenciar usuários'
                    });
                }

                const users = await usersCollection
                    .find({}, { projection: { _id: 0, password_hash: 0 } })
                    .sort({ username: 1 })
                    .toArray();

                res.json({
                    success: true,
                    users
                });
            } catch (error) {
                console.error('❌ Erro ao listar usuários:', error);
                res.status(500).json({
                    success: false,
                    message: 'Erro ao listar usuários',
                    error: error.message
                });
            }
        });

        app.post('/api/admin/users', autenticarJWT, async (req, res) => {
            try {
                if (!isAdminUser(req.user)) {
                    return res.status(403).json({
                        success: false,
                        message: 'Apenas administradores podem criar usuários'
                    });
                }

                const username = normalizarUsername(req.body.username);
                const password = String(req.body.password || '').trim();
                const role = String(req.body.role || 'operador').trim().toLowerCase();

                if (!username) {
                    return res.status(400).json({
                        success: false,
                        message: 'Username é obrigatório'
                    });
                }

                if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Username deve ter entre 3 e 40 caracteres e usar apenas letras, números, ponto, hífen ou underline'
                    });
                }

                if (password.length < 6) {
                    return res.status(400).json({
                        success: false,
                        message: 'A senha deve ter pelo menos 6 caracteres'
                    });
                }

                const roleNormalizado = normalizarRole(role);

                if (!ROLES_CONTA.includes(roleNormalizado)) {
                    return res.status(400).json({
                        success: false,
                        message: 'O perfil Operador (Produção) não possui conta. Escolha Qualidade, Aprovação Qualidade ou Administrador.'
                    });
                }

                const existente = await usersCollection.findOne({ username });

                if (existente) {
                    return res.status(409).json({
                        success: false,
                        message: 'Já existe um usuário com esse username'
                    });
                }

                const agora = new Date().toISOString();

                await usersCollection.insertOne({
                    username,
                    password_hash: gerarHashSenha(password),
                    role: roleNormalizado,
                    active: true,
                    created_at: agora,
                    updated_at: agora,
                    created_by: req.user.username
                });

                await registrarAuditoria(req, {
                    acao: 'usuario_criar',
                    categoria: 'usuario',
                    entidade: 'usuario',
                    entidade_id: username,
                    descricao: `Criou o usuário "${username}" com perfil ${roleNormalizado}`,
                    alteracoes: [
                        { campo: 'username', de: null, para: username },
                        { campo: 'role', de: null, para: roleNormalizado },
                        { campo: 'password', de: null, para: '***' }
                    ]
                });

                res.status(201).json({
                    success: true,
                    message: 'Usuário criado com sucesso',
                    user: {
                        username,
                        role: roleNormalizado,
                        active: true,
                        created_at: agora,
                        created_by: req.user.username
                    }
                });
            } catch (error) {
                console.error('❌ Erro ao criar usuário:', error);
                res.status(500).json({
                    success: false,
                    message: 'Erro ao criar usuário',
                    error: error.message
                });
            }
        });

        // Editar usuário: alterar o perfil (role) e/ou trocar a senha.
        // A senha nunca é exposta — apenas substituída por uma nova.
        app.put('/api/admin/users/:username', autenticarJWT, async (req, res) => {
            try {
                if (!isAdminUser(req.user)) {
                    return res.status(403).json({
                        success: false,
                        message: 'Apenas administradores podem gerenciar usuários'
                    });
                }

                const alvo = normalizarUsername(req.params.username);
                const usuarioAlvo = await usersCollection.findOne({ username: alvo });

                if (!usuarioAlvo) {
                    return res.status(404).json({
                        success: false,
                        message: 'Usuário não encontrado'
                    });
                }

                const ehMaster = alvo === MASTER_ADMIN_USERNAME;
                const set = {
                    updated_at: new Date().toISOString(),
                    updated_by: req.user.username
                };

                // Alterar perfil (role)
                const roleEnviado = req.body.role != null ? String(req.body.role).trim() : '';
                if (roleEnviado) {
                    if (ehMaster) {
                        return res.status(403).json({
                            success: false,
                            message: 'Não é permitido alterar o perfil do administrador master.'
                        });
                    }
                    const novoRole = normalizarRole(roleEnviado);
                    if (!ROLES_CONTA.includes(novoRole)) {
                        return res.status(400).json({
                            success: false,
                            message: 'O perfil Operador (Produção) não possui conta. Escolha Qualidade, Aprovação Qualidade ou Administrador.'
                        });
                    }
                    set.role = novoRole;
                }

                // Trocar senha (sem expor a atual — apenas define a nova)
                const senhaEnviada = req.body.password != null ? String(req.body.password).trim() : '';
                if (senhaEnviada) {
                    if (senhaEnviada.length < 6) {
                        return res.status(400).json({
                            success: false,
                            message: 'A nova senha deve ter pelo menos 6 caracteres'
                        });
                    }
                    if (ehMaster && req.user.username !== MASTER_ADMIN_USERNAME) {
                        return res.status(403).json({
                            success: false,
                            message: 'Apenas o próprio administrador master pode trocar a senha dele.'
                        });
                    }
                    set.password_hash = gerarHashSenha(senhaEnviada);
                }

                if (!set.role && !set.password_hash) {
                    return res.status(400).json({
                        success: false,
                        message: 'Informe um novo perfil ou uma nova senha para atualizar.'
                    });
                }

                await usersCollection.updateOne({ username: alvo }, { $set: set });

                const alteracoesUsuario = [];
                if (set.role) {
                    alteracoesUsuario.push({
                        campo: 'role',
                        de: normalizarRole(usuarioAlvo.role),
                        para: set.role
                    });
                }
                if (set.password_hash) {
                    alteracoesUsuario.push({ campo: 'password', de: '***', para: '***' });
                }

                await registrarAuditoria(req, {
                    acao: 'usuario_atualizar',
                    categoria: 'usuario',
                    entidade: 'usuario',
                    entidade_id: alvo,
                    descricao: `Atualizou o usuário "${alvo}"` +
                        `${set.role ? ` (perfil → ${set.role})` : ''}` +
                        `${set.password_hash ? ' (senha redefinida)' : ''}`,
                    alteracoes: alteracoesUsuario
                });

                console.log(`🔧 Admin ${req.user.username} atualizou usuário ${alvo}` +
                    `${set.role ? ` (role → ${set.role})` : ''}${set.password_hash ? ' (senha trocada)' : ''}`);

                res.json({
                    success: true,
                    message: 'Usuário atualizado com sucesso',
                    user: {
                        username: alvo,
                        role: set.role || normalizarRole(usuarioAlvo.role)
                    }
                });
            } catch (error) {
                console.error('❌ Erro ao atualizar usuário:', error);
                res.status(500).json({
                    success: false,
                    message: 'Erro ao atualizar usuário',
                    error: error.message
                });
            }
        });

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
                dados.criador_nome = String(dados.criador_nome || '').trim();
                dados.criador_matricula = String(dados.criador_matricula || '').trim();

                if (!dados.criador_nome || !dados.criador_matricula) {
                    return res.status(400).json({
                        success: false,
                        message: 'Nome e matrÃ­cula do criador sÃ£o obrigatÃ³rios'
                    });
                }

                const agora = new Date().toISOString();
                dados.data_criacao = dados.data_criacao || agora;
                dados.data_atualizacao = agora;
                dados.criado_por = req.user.username;
                dados.solicitado_por = dados.solicitado_por || dados.criador_nome;
                dados.status = dados.status || 'em_andamento';
                dados.programado = dados.programado === true;

                // Salvar no MongoDB
                await checklistsCollection.insertOne(dados);

                console.log('✅ Formulário salvo no MongoDB');

                await registrarAuditoria(req, {
                    acao: 'checklist_criar',
                    categoria: 'checklist',
                    entidade: 'checklist',
                    entidade_id: dados.numero_controle,
                    descricao: `Criou o checklist ${dados.numero_controle} (criador: ${dados.criador_nome} / matrícula ${dados.criador_matricula})`,
                    alteracoes: [
                        { campo: 'status', de: null, para: dados.status },
                        { campo: 'criador_nome', de: null, para: auditResumirValor(dados.criador_nome) },
                        { campo: 'criador_matricula', de: null, para: auditResumirValor(dados.criador_matricula) },
                        { campo: 'programado', de: null, para: String(dados.programado) }
                    ]
                });

                res.json({
                    success: true,
                    message: 'Formulário salvo com sucesso',
                    numero_controle: dados.numero_controle
                });

            } catch (error) {
                // Índice único em numero_controle: se por algum motivo um número já
                // usado for enviado (ex.: aba antiga aberta antes da correção do
                // gerador atômico), barra aqui em vez de deixar dois checklists
                // diferentes compartilharem o mesmo numero_controle.
                if (error.code === 11000) {
                    console.error('🚫 numero_controle duplicado, insert rejeitado:', dados.numero_controle);
                    return res.status(409).json({
                        success: false,
                        message: 'Este número de controle já está em uso. Recarregue a página para gerar um novo número.',
                        error: error.message
                    });
                }

                console.error('❌ Erro ao salvar formulário:', error);
                res.status(500).json({
                    success: false,
                    message: 'Erro ao salvar o formulário',
                    error: error.message
                });
            }
        });

        // ==================== ROTA PARA GERAR NÚMERO DE CONTROLE ====================
        // Sequência atômica (collection `counters`) — ver comentário em
        // obterProximoNumeroControle() para o porquê da mudança.
        app.get('/api/fr0062/proximo-numero', verificarOperador, async (req, res) => {
            try {
                const numero = await obterProximoNumeroControle();

                console.log(`✅ Número de controle gerado: ${numero}`);

                res.json({
                    success: true,
                    numero_controle: numero
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
                const dataInicio = (req.query.data_inicio || '').trim();
                const dataFim = (req.query.data_fim || '').trim();
                const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

                if ((dataInicio && !DATA_REGEX.test(dataInicio)) || (dataFim && !DATA_REGEX.test(dataFim))) {
                    return res.status(400).json({
                        success: false,
                        message: 'Data inválida. Use o formato AAAA-MM-DD'
                    });
                }

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
                        { criador_nome: { $regex: busca, $options: 'i' } },
                        { criador_matricula: { $regex: busca, $options: 'i' } },
                        { criado_por: { $regex: busca, $options: 'i' } },
                        { status: { $regex: busca, $options: 'i' } },
                        { 'mudancas_4m.item_modificado': { $regex: busca, $options: 'i' } },
                        { 'mudancas_4m.modificacao': { $regex: busca, $options: 'i' } }
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

                // Período específico (data_inicio/data_fim) tem prioridade sobre "ano".
                // Comparação por string funciona porque data_criacao é ISO 8601
                // (AAAA-MM-DDTHH:mm:ss.sssZ), que ordena lexicograficamente como data real.
                if (dataInicio || dataFim) {
                    filtro.data_criacao = {};
                    if (dataInicio) {
                        filtro.data_criacao.$gte = `${dataInicio}T00:00:00.000Z`;
                    }
                    if (dataFim) {
                        filtro.data_criacao.$lte = `${dataFim}T23:59:59.999Z`;
                    }
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
                    aguardando_aprovacao_qualidade: 0,
                    aguardando_aprovacao: 0,
                    em_aberto: 0,
                    concluido: 0
                };

                estatisticasPorStatus.forEach((item) => {
                    if (Object.prototype.hasOwnProperty.call(stats, item._id)) {
                        stats[item._id] = item.total;
                    }
                });

                // Checklists em aberto com prazo (30 dias) vencido, separados pela etapa
                // de origem para que cada perfil veja apenas o que é da sua etapa.
                // em_aberto_desde é ISO 8601, então a comparação por string é válida.
                const limiteVencimento = new Date(Date.now() - PRAZO_EM_ABERTO_DIAS * 86400000).toISOString();
                const filtroVencidos = { ...filtroEstatisticas, status: 'em_aberto', em_aberto_desde: { $lt: limiteVencimento } };
                const vencidosConclusaoQualidade = await db.collection('checklists').countDocuments({
                    ...filtroVencidos,
                    status_origem_em_aberto: 'aguardando_conclusao_qualidade'
                });
                const vencidosTotal = await db.collection('checklists').countDocuments(filtroVencidos);
                stats.em_aberto_vencidos = vencidosTotal;
                stats.em_aberto_vencidos_qualidade = vencidosConclusaoQualidade;
                stats.em_aberto_vencidos_aprovacao = vencidosTotal - vencidosConclusaoQualidade;

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

                // Campos controlados só pelo servidor (etapa "Em aberto"): nunca
                // aceitar valores enviados pelo cliente.
                delete dados.em_aberto_desde;
                delete dados.status_origem_em_aberto;

                // "Em aberto" só pode ser definido a partir da última etapa
                // (ou mantido, se já estiver em aberto) — vale para qualquer role.
                if (statusNovo === 'em_aberto'
                    && statusAtual !== 'em_aberto'
                    && !ETAPAS_ORIGEM_EM_ABERTO.includes(statusAtual)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Só é possível deixar em aberto a partir da última etapa.'
                    });
                }

                // 4. Validação de Regras de Negócio por Role (controle por etapa)
                const userRole = normalizarRole(user.role);
                const nivelUser = NIVEL_ROLE[userRole] ?? 0;

                if (nivelUser >= NIVEL_ROLE.admin) {
                    // Admin: permissão total (faz qualquer etapa, inclusive concluir)
                    console.log(`👑 Admin ${user.username} atualizando: ${numeroControle} (Permissão Total)`);
                } else {
                    // Nenhum não-admin edita checklist concluído/finalizado
                    if (statusAtual === 'concluido' || statusAtual === 'finalizado') {
                        console.log(`🚫 Bloqueado: ${user.username} (${userRole}) tentou editar checklist concluído.`);
                        await registrarAuditoria(req, {
                            usuario: user.username,
                            role: userRole,
                            acao: 'checklist_editar_negado',
                            categoria: 'checklist',
                            entidade: 'checklist',
                            entidade_id: numeroControle,
                            descricao: `Tentou editar o checklist ${numeroControle} já ${statusAtual}`,
                            resultado: 'negado'
                        });
                        return res.status(403).json({
                            success: false,
                            message: 'Não é possível editar um checklist já concluído.'
                        });
                    }

                    // Conclusão normal: só admin. Exceção: no fluxo "se programado", a
                    // Qualidade (ou Aprovador Qualidade) conclui a partir da etapa
                    // "aguardando_conclusao_qualidade".
                    const origemEmAberto = formularioAtual.status_origem_em_aberto;
                    const podeConcluirComoQualidade = (statusAtual === 'aguardando_conclusao_qualidade'
                        || (statusAtual === 'em_aberto' && origemEmAberto === 'aguardando_conclusao_qualidade'))
                        && ['qualidade', 'aprovador_qualidade'].includes(userRole);

                    if ((statusNovo === 'concluido' || statusNovo === 'finalizado') && !podeConcluirComoQualidade) {
                        await registrarAuditoria(req, {
                            usuario: user.username,
                            role: userRole,
                            acao: 'checklist_concluir_negado',
                            categoria: 'checklist',
                            entidade: 'checklist',
                            entidade_id: numeroControle,
                            descricao: `Tentou concluir o checklist ${numeroControle} sem permissão`,
                            resultado: 'negado'
                        });
                        return res.status(403).json({
                            success: false,
                            message: 'Apenas administradores podem concluir checklists.'
                        });
                    }

                    // Nível mínimo (etapas hierárquicas) ou papel específico (etapas
                    // "se programado": Engenharia / Log.PC / Produção / Conclusão Qualidade)
                    // "Em aberto" herda o acesso da etapa de origem: se veio da Aprovação
                    // só admin atua (lista vazia aqui); se veio da Conclusão Qualidade,
                    // qualidade / aprovador qualidade.
                    const rolesEspeciais = statusAtual === 'em_aberto'
                        ? (origemEmAberto === 'aguardando_conclusao_qualidade'
                            ? ROLES_ETAPA_ESPECIAL.aguardando_conclusao_qualidade
                            : [])
                        : ROLES_ETAPA_ESPECIAL[statusAtual];
                    const temPermissaoEtapa = rolesEspeciais
                        ? rolesEspeciais.includes(userRole)
                        : nivelUser >= (NIVEL_MINIMO_POR_STATUS[statusAtual] ?? 0);

                    if (!temPermissaoEtapa) {
                        console.log(`🚫 Sem permissão: ${user.username} (${userRole}) na etapa ${statusAtual}`);
                        await registrarAuditoria(req, {
                            usuario: user.username,
                            role: userRole,
                            acao: 'checklist_editar_negado',
                            categoria: 'checklist',
                            entidade: 'checklist',
                            entidade_id: numeroControle,
                            descricao: `Sem permissão para editar o checklist ${numeroControle} na etapa ${statusAtual}`,
                            resultado: 'negado'
                        });
                        return res.status(403).json({
                            success: false,
                            message: 'Sua conta não tem permissão para editar esta etapa.'
                        });
                    }

                    // Validar transições permitidas (fluxo linear, com ramal "se programado")
                    const transicoesPermitidas = {
                        'em_andamento': ['em_andamento', 'aguardando_qualidade'],
                        'aguardando_qualidade': ['aguardando_qualidade', 'aguardando_aprovacao_qualidade'],
                        'aguardando_aprovacao_qualidade': formularioAtual.programado
                            ? ['aguardando_aprovacao_qualidade', 'aguardando_aprovacao_engenharia']
                            : ['aguardando_aprovacao_qualidade', 'aguardando_aprovacao'],
                        'aguardando_aprovacao_engenharia': ['aguardando_aprovacao_engenharia', 'aguardando_aprovacao_logistica'],
                        'aguardando_aprovacao_logistica': ['aguardando_aprovacao_logistica', 'aguardando_aprovacao_producao'],
                        'aguardando_aprovacao_producao': ['aguardando_aprovacao_producao', 'aguardando_conclusao_qualidade'],
                        'aguardando_conclusao_qualidade': ['aguardando_conclusao_qualidade', 'concluido', 'em_aberto'],
                        'aguardando_aprovacao': ['aguardando_aprovacao'], // avanço para concluido só por admin
                        'em_aberto': ['em_aberto', 'concluido']
                    };

                    const permitidos = transicoesPermitidas[statusAtual] || [statusAtual];
                    if (statusNovo !== statusAtual && !permitidos.includes(statusNovo)) {
                        console.log(`🚫 Transição inválida: ${statusAtual} → ${statusNovo} por ${user.username}`);
                        await registrarAuditoria(req, {
                            usuario: user.username,
                            role: userRole,
                            acao: 'checklist_transicao_negada',
                            categoria: 'checklist',
                            entidade: 'checklist',
                            entidade_id: numeroControle,
                            descricao: `Transição de status não permitida: ${statusAtual} → ${statusNovo}`,
                            resultado: 'negado',
                            alteracoes: [{ campo: 'status', de: statusAtual, para: statusNovo }]
                        });
                        return res.status(403).json({
                            success: false,
                            message: `Transição de status '${statusAtual}' para '${statusNovo}' não é permitida.`
                        });
                    }

                    console.log(`📝 ${userRole} ${user.username} atualizando: ${numeroControle} (${statusAtual} → ${statusNovo})`);
                }

                // 5. Preparação dos dados e Update
                dados.data_atualizacao = new Date().toISOString();
                dados.atualizado_por = user.username;
                dados.criador_nome = String(dados.criador_nome || formularioAtual.criador_nome || '').trim();
                dados.criador_matricula = String(dados.criador_matricula || formularioAtual.criador_matricula || '').trim();
                dados.solicitado_por = dados.solicitado_por || formularioAtual.solicitado_por || dados.criador_nome;

                // Removemos o _id dos dados para evitar erro de tentativa de alterar chave primária do Mongo
                delete dados._id;
                // data_criacao nunca deve ser sobrescrita em um update
                delete dados.data_criacao;

                // Etapa "Em aberto": o servidor registra quando e de onde entrou
                // (início do prazo de 30 dias). Ao concluir/atualizar, o histórico é mantido.
                if (statusNovo === 'em_aberto' && statusAtual !== 'em_aberto') {
                    dados.em_aberto_desde = dados.data_atualizacao;
                    dados.status_origem_em_aberto = statusAtual;
                }

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

                const alteracoesChecklist = auditCalcularAlteracoes(formularioAtual, dados);
                const mudouStatus = statusNovo !== statusAtual;

                await registrarAuditoria(req, {
                    usuario: user.username,
                    role: userRole,
                    acao: mudouStatus ? 'checklist_mudar_status' : 'checklist_atualizar',
                    categoria: 'checklist',
                    entidade: 'checklist',
                    entidade_id: numeroControle,
                    descricao: mudouStatus
                        ? `Alterou o status do checklist ${numeroControle}: ${statusAtual} → ${statusNovo}`
                        : `Editou o checklist ${numeroControle} (${alteracoesChecklist.length} campo(s) alterado(s))`,
                    alteracoes: alteracoesChecklist
                });

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

        // Módulos do dashboard 4M
        app.get('/api/dashboard-modules', verificarOperador, async (req, res) => {
            try {
                const configuracao = await db.collection('dashboard_modules').findOne({
                    key: 'main'
                });

                res.json({
                    success: true,
                    modules: Array.isArray(configuracao?.modules) ? configuracao.modules : []
                });
            } catch (error) {
                console.error('❌ Erro ao listar módulos do dashboard:', error);
                res.status(500).json({
                    success: false,
                    message: 'Erro ao listar módulos do dashboard',
                    error: error.message
                });
            }
        });

        app.put('/api/dashboard-modules', async (req, res) => {
            try {
                const usuario = obterUsuarioPorToken(req);

                if (!usuario || usuario.role !== 'admin') {
                    await registrarAuditoria(req, {
                        usuario: usuario?.username || 'desconhecido',
                        role: usuario?.role || 'operador',
                        acao: 'dashboard_modulos_negado',
                        categoria: 'dashboard',
                        entidade: 'dashboard_modules',
                        entidade_id: 'main',
                        descricao: 'Tentou alterar os módulos do dashboard sem ser administrador',
                        resultado: 'negado'
                    });
                    return res.status(403).json({
                        success: false,
                        message: 'Apenas administradores podem alterar os módulos do dashboard'
                    });
                }

                const configuracaoAnterior = await db.collection('dashboard_modules').findOne({ key: 'main' });
                const modulesAnteriores = Array.isArray(configuracaoAnterior?.modules) ? configuracaoAnterior.modules : [];
                const modules = normalizarDashboardModules(req.body.modules);
                const agora = new Date().toISOString();

                await db.collection('dashboard_modules').updateOne(
                    { key: 'main' },
                    {
                        $set: {
                            key: 'main',
                            modules,
                            updated_at: agora,
                            updated_by: usuario.username
                        },
                        $setOnInsert: {
                            created_at: agora
                        }
                    },
                    { upsert: true }
                );

                await registrarAuditoria(req, {
                    usuario: usuario.username,
                    role: usuario.role,
                    acao: 'dashboard_modulos_atualizar',
                    categoria: 'dashboard',
                    entidade: 'dashboard_modules',
                    entidade_id: 'main',
                    descricao: `Atualizou os módulos do dashboard (${modules.length} módulo(s))`,
                    alteracoes: [{
                        campo: 'modules',
                        de: auditResumirValor(modulesAnteriores),
                        para: auditResumirValor(modules)
                    }]
                });

                res.json({
                    success: true,
                    message: 'Módulos do dashboard atualizados com sucesso',
                    modules
                });
            } catch (error) {
                console.error('❌ Erro ao salvar módulos do dashboard:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao salvar módulos do dashboard'
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
                    await registrarAuditoria(req, {
                        usuario: user.username,
                        role: user.role,
                        acao: 'checklist_excluir_negado',
                        categoria: 'checklist',
                        entidade: 'checklist',
                        entidade_id: numeroControle,
                        descricao: `Tentou excluir o checklist ${numeroControle} sem ser administrador`,
                        resultado: 'negado'
                    });
                    return res.status(403).json({
                        success: false,
                        message: 'Apenas administradores podem deletar checklists'
                    });
                }

                console.log(`👑 Admin ${user.username} deletando ${numeroControle}`);

                // Lê antes de apagar para guardar no log o estado do registro excluído.
                const checklistExcluido = await db.collection('checklists').findOne({
                    numero_controle: numeroControle
                });

                const resultado = await db.collection('checklists').deleteOne({
                    numero_controle: numeroControle
                });

                if (resultado.deletedCount === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Formulário não encontrado'
                    });
                }

                await registrarAuditoria(req, {
                    usuario: user.username,
                    role: user.role,
                    acao: 'checklist_excluir',
                    categoria: 'checklist',
                    entidade: 'checklist',
                    entidade_id: numeroControle,
                    descricao: `Excluiu o checklist ${numeroControle}` +
                        `${checklistExcluido?.status ? ` (status: ${checklistExcluido.status})` : ''}`,
                    alteracoes: [
                        { campo: 'status', de: auditResumirValor(checklistExcluido?.status), para: null },
                        { campo: 'criador_nome', de: auditResumirValor(checklistExcluido?.criador_nome), para: null },
                        { campo: 'data_criacao', de: auditResumirValor(checklistExcluido?.data_criacao), para: null }
                    ]
                });

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

        // ==================== LOGS DE AUDITORIA (APENAS ADMIN) ====================
        // Somente leitura: não existe rota para editar ou apagar registros de
        // auditoria — isso é proposital, para que o log sirva como evidência.
        app.get('/api/admin/audit-logs', autenticarJWT, async (req, res) => {
            try {
                if (!isAdminUser(req.user)) {
                    return res.status(403).json({
                        success: false,
                        message: 'Apenas administradores podem consultar os logs de auditoria'
                    });
                }

                const pagina = Math.max(parseInt(req.query.page || req.query.pagina, 10) || 1, 1);
                const limite = Math.min(Math.max(parseInt(req.query.limit || req.query.limite, 10) || 25, 1), 200);

                const usuario = String(req.query.usuario || '').trim().toLowerCase();
                const acao = String(req.query.acao || '').trim();
                const categoria = String(req.query.categoria || '').trim();
                const resultado = String(req.query.resultado || '').trim();
                const busca = String(req.query.busca || '').trim();
                const dataInicio = String(req.query.data_inicio || '').trim();
                const dataFim = String(req.query.data_fim || '').trim();
                const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

                const filtro = {};

                if (usuario) filtro.usuario = usuario;
                if (acao) filtro.acao = acao;
                if (categoria) filtro.categoria = categoria;
                if (resultado) filtro.resultado = resultado;

                if (busca) {
                    const escapado = busca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(escapado, 'i');
                    filtro.$or = [
                        { descricao: regex },
                        { entidade_id: regex },
                        { usuario: regex },
                        { ip: regex }
                    ];
                }

                // timestamp é ISO string -> comparação lexicográfica funciona.
                if (DATA_REGEX.test(dataInicio) || DATA_REGEX.test(dataFim)) {
                    filtro.timestamp = {};
                    if (DATA_REGEX.test(dataInicio)) filtro.timestamp.$gte = `${dataInicio}T00:00:00.000Z`;
                    if (DATA_REGEX.test(dataFim)) filtro.timestamp.$lte = `${dataFim}T23:59:59.999Z`;
                }

                const total = await auditLogsCollection.countDocuments(filtro);
                const logs = await auditLogsCollection
                    .find(filtro, { projection: { _id: 0 } })
                    .sort({ timestamp: -1 })
                    .skip((pagina - 1) * limite)
                    .limit(limite)
                    .toArray();

                // Opções para os selects de filtro do frontend.
                const [usuarios, acoes, categorias] = await Promise.all([
                    auditLogsCollection.distinct('usuario'),
                    auditLogsCollection.distinct('acao'),
                    auditLogsCollection.distinct('categoria')
                ]);

                res.json({
                    success: true,
                    logs,
                    paginacao: {
                        pagina,
                        limite,
                        total,
                        total_paginas: Math.max(Math.ceil(total / limite), 1)
                    },
                    opcoes: {
                        usuarios: usuarios.filter(Boolean).sort(),
                        acoes: acoes.filter(Boolean).sort(),
                        categorias: categorias.filter(Boolean).sort()
                    }
                });
            } catch (error) {
                console.error('❌ Erro ao consultar logs de auditoria:', error);
                res.status(500).json({
                    success: false,
                    message: 'Erro ao consultar logs de auditoria',
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
                    'GET /api/admin/users': 'Listar usuários (Apenas admin.ti)',
                    'POST /api/admin/users': 'Criar usuário (Apenas admin.ti)',
                    'GET /api/fr0062/proximo-numero': 'Gerar próximo número sequencial (Operador/Admin)',
                    'POST /api/fr0062': 'Criar novo formulário (Operador/Admin)',
                    'GET /api/fr0062': 'Listar todos os formulários (Operador/Admin)',
                    'GET /api/fr0062/:id': 'Buscar formulário específico (Operador/Admin)',
                    'PUT /api/fr0062/:id': 'Atualizar formulário (Operador/Admin com restrições)',
                    'DELETE /api/fr0062/:id': 'Deletar formulário (Apenas Admin)',
                    'GET /api/admin/audit-logs': 'Consultar logs de auditoria (Apenas Admin)'
                }
            });
        });

        // Rota raiz
        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '..', 'templates', '4m.html'));
        });

        // Middleware de tratamento de erros (DEVE ser o último, com 4 argumentos).
        // Garante que qualquer erro lançado em middleware — CORS bloqueado, JSON
        // malformado no body-parser, etc. — vire uma resposta JSON e não a página
        // HTML padrão do Express (que no front quebra com "Unexpected token '<'").
        // eslint-disable-next-line no-unused-vars
        app.use((err, req, res, next) => {
            const corsBloqueado = err && /not allowed by cors/i.test(err.message || '');
            const status = corsBloqueado ? 403 : (err.status || err.statusCode || 500);
            console.error('❌ Erro não tratado em middleware:', err);
            if (res.headersSent) {
                return next(err);
            }
            res.status(status).json({
                success: false,
                message: corsBloqueado
                    ? 'Origem não autorizada (CORS)'
                    : 'Erro interno ao processar a requisição',
                error: err && err.message
            });
        });

        // App pronto. Quem decide entre "ouvir uma porta" (local/Render) ou
        // "ser usado como handler" (Vercel) é o final do arquivo.
        return app;

    } catch (error) {
        console.error('❌ Erro ao iniciar servidor:', error);
        throw error;
    }
}

// Cache do app entre invocações. Em serverless o módulo é reaproveitado em
// instâncias quentes, então construímos o app (e a conexão) apenas uma vez.
let appPromise = null;
function getApp() {
    if (!appPromise) {
        appPromise = buildApp().catch((error) => {
            // Zera o cache para permitir nova tentativa na próxima requisição
            appPromise = null;
            throw error;
        });
    }
    return appPromise;
}

// Handler exportado para a Vercel (serverless). Garante que erros de
// inicialização virem JSON, e não uma página HTML da plataforma.
module.exports = async (req, res) => {
    try {
        const app = await getApp();
        return app(req, res);
    } catch (error) {
        console.error('❌ Erro ao inicializar a aplicação:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            success: false,
            message: 'Erro ao inicializar a aplicação',
            error: error.message
        }));
    }
};

// Execução local / Render (`node src/server.js` ou `npm start`):
// sobe um servidor HTTP tradicional escutando uma porta.
if (require.main === module) {
    const port = process.env.PORT || 3001;
    getApp()
        .then((app) => app.listen(port, () => {
            console.log('═══════════════════════════════════════════════════════════════════════════');
            console.log('🚀 Servidor FR0062 iniciado com sucesso!');
            console.log(`📡 Porta: ${port}  |  🌐 http://localhost:${port}`);
            console.log(`🗄️  Banco de dados: MongoDB - 4m_checklist`);
            console.log('═══════════════════════════════════════════════════════════════════════════');
        }))
        .catch((error) => {
            console.error('❌ Erro ao iniciar servidor local:', error);
            process.exit(1);
        });
}

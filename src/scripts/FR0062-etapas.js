/**
 * SISTEMA DE GERENCIAMENTO 4M COM 3 ETAPAS
 * Etapa 1: Operador (preenchimento de campos)
 * Etapa 2: Qualidade (validação)
 * Etapa 3: Aprovação (aprovação final)
 */

const API_URL = 'https://fourm-znis.onrender.com/api';
// const API_URL = 'http://localhost:3001/api';

// ========== CONSTANTES E CONFIGURAÇÕES ==========
const ETAPAS = {
    OPERADOR: 'operador',
    QUALIDADE: 'qualidade',
    APROVACAO: 'aprovacao'
};

const STATUS_CHECKLIST = {
    EM_ANDAMENTO: 'em_andamento',
    AGUARDANDO_QUALIDADE: 'aguardando_qualidade',
    AGUARDANDO_APROVACAO: 'aguardando_aprovacao',
    CONCLUIDO: 'concluido'
};

// Usuários autorizados para aprovação
const USUARIOS_AUTORIZADOS = ['julio', 'julia', 'dionas', 'admin.ti'];

// Definição de turnos
const TURNOS = {
    TURNO_1: { inicio: '07:00', fim: '16:40', numero: 1 },
    TURNO_2: { inicio: '16:40', fim: '23:23', numero: 2 },
    TURNO_3: { inicio: '23:23', fim: '07:00', numero: 3 }
};

// ========== SISTEMA DE MENSAGENS ==========
class SistemaMensagens {
    constructor() {
        this.container = null;
        this.criarContainer();
        this.adicionarEstilos();
    }

    criarContainer() {
        this.container = document.createElement('div');
        this.container.id = 'sistema-mensagens';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            max-width: 400px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(this.container);
    }

    adicionarEstilos() {
        const style = document.createElement('style');
        style.textContent = `
            .mensagem-item {
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                color: white;
                font-family: Arial, sans-serif;
                font-size: 14px;
                line-height: 1.5;
                pointer-events: auto;
                animation: slideInRight 0.3s ease;
                display: flex;
                align-items: center;
                gap: 10px;
                transform: translateX(0);
                transition: transform 0.3s ease, opacity 0.3s ease;
            }
            
            .mensagem-item.saindo {
                transform: translateX(100%);
                opacity: 0;
            }
            
            .mensagem-success {
                background: linear-gradient(135deg, #4CAF50, #45a049);
                border-left: 5px solid #2E7D32;
            }
            
            .mensagem-error {
                background: linear-gradient(135deg, #F44336, #d32f2f);
                border-left: 5px solid #b71c1c;
            }
            
            .mensagem-warning {
                background: linear-gradient(135deg, #FF9800, #F57C00);
                border-left: 5px solid #E65100;
            }
            
            .mensagem-info {
                background: linear-gradient(135deg, #2196F3, #1976D2);
                border-left: 5px solid #0D47A1;
            }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            .mensagem-icon {
                font-size: 20px;
                flex-shrink: 0;
            }
            
            .mensagem-conteudo {
                flex-grow: 1;
            }
            
            .mensagem-fechar {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                flex-shrink: 0;
                font-size: 16px;
                padding: 0;
            }
            
            .mensagem-fechar:hover {
                background: rgba(255,255,255,0.3);
            }
        `;
        document.head.appendChild(style);
    }

    exibir(mensagem, tipo = 'info', duracao = 5000) {
        const icones = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };

        const elemento = document.createElement('div');
        elemento.className = `mensagem-item mensagem-${tipo}`;
        elemento.innerHTML = `
            <span class="mensagem-icon">${icones[tipo]}</span>
            <span class="mensagem-conteudo">${mensagem}</span>
            <button class="mensagem-fechar">×</button>
        `;

        this.container.appendChild(elemento);

        const fechar = () => {
            elemento.classList.add('saindo');
            setTimeout(() => elemento.remove(), 300);
        };

        elemento.querySelector('.mensagem-fechar').addEventListener('click', fechar);

        if (duracao > 0) {
            setTimeout(fechar, duracao);
        }
    }

    sucesso(mensagem, duracao = 5000) {
        this.exibir(mensagem, 'success', duracao);
    }

    erro(mensagem, duracao = 7000) {
        this.exibir(mensagem, 'error', duracao);
    }

    aviso(mensagem, duracao = 6000) {
        this.exibir(mensagem, 'warning', duracao);
    }

    informacao(mensagem, duracao = 5000) {
        this.exibir(mensagem, 'info', duracao);
    }
}

// ========== GERENCIADOR DE AUTENTICAÇÃO ==========
class GerenciadorAutenticacao {
    constructor() {
        this.usuarioAtual = null;
        this.tokenAtual = null;
        this.carregarSessao();
    }

    carregarSessao() {
        const sessao = sessionStorage.getItem('sessao_4m');
        if (sessao) {
            const dados = JSON.parse(sessao);
            this.usuarioAtual = dados.usuario;
            this.tokenAtual = dados.token;
        }
    }

    autenticar(usuario) {
        if (USUARIOS_AUTORIZADOS.includes(usuario.toLowerCase())) {
            this.usuarioAtual = usuario;
            this.tokenAtual = this.gerarToken();
            
            const sessao = {
                usuario: usuario,
                token: this.tokenAtual,
                timestamp: new Date().toISOString()
            };
            
            sessionStorage.setItem('sessao_4m', JSON.stringify(sessao));
            return true;
        }
        return false;
    }

    gerarToken() {
        return 'tk_' + Math.random().toString(36).substr(2, 9);
    }

    estaAutenticado() {
        return !!this.usuarioAtual && !!this.tokenAtual;
    }

    obterUsuario() {
        return this.usuarioAtual;
    }

    logout() {
        this.usuarioAtual = null;
        this.tokenAtual = null;
        sessionStorage.removeItem('sessao_4m');
    }

    testaAutorizacao(etapa) {
        if (etapa === ETAPAS.APROVACAO) {
            return this.estaAutenticado();
        }
        return true;
    }
}

// ========== GERENCIADOR DE ESTADO DA ETAPA ==========
class GerenciadorEtapa {
    constructor(etapa) {
        this.etapa = etapa;
        this.colunaEmEdicao = null;
        this.colunasPreenchidas = new Set();
        this.camposObrigatorios = this.definirCamposObrigatorios();
    }

    definirCamposObrigatorios() {
        switch (this.etapa) {
            case ETAPAS.OPERADOR:
                return ['operadorMAN', 'operadorMACHINE', 'operadorMATERIAL', 'operadorMETHOD'];
            case ETAPAS.QUALIDADE:
                return ['qualidadeValidacao', 'qualidadeRejeitados', 'qualidadeAprovacao'];
            case ETAPAS.APROVACAO:
                return ['aprovacaoAprovado', 'aprovacaoConfirmado'];
            default:
                return [];
        }
    }

    iniciarEdicaoColuna(numeroColuna) {
        if (this.colunaEmEdicao === null) {
            this.colunaEmEdicao = numeroColuna;
            this.atualizarVisualizacaoColuna();
        } else if (this.colunaEmEdicao !== numeroColuna) {
            return false; // Não permite mudar de coluna
        }
        return true;
    }

    finalizarEdicaoColuna(numeroColuna) {
        if (this.colunaEmEdicao === numeroColuna) {
            this.colunasPreenchidas.add(numeroColuna);
            this.colunaEmEdicao = null;
            this.atualizarVisualizacaoColuna();
            return true;
        }
        return false;
    }

    atualizarVisualizacaoColuna() {
        document.querySelectorAll(`[data-coluna]`).forEach(elem => {
            const coluna = elem.getAttribute('data-coluna');
            
            if (this.colunaEmEdicao !== null) {
                if (coluna == this.colunaEmEdicao) {
                    elem.style.opacity = '1';
                    elem.style.pointerEvents = 'auto';
                } else {
                    elem.style.opacity = '0.5';
                    elem.style.pointerEvents = 'none';
                }
            } else {
                elem.style.opacity = '1';
                elem.style.pointerEvents = 'auto';
            }
        });
    }

    verificarCamposObrigatorios() {
        // Verificar se toda coluna que foi iniciada está completa
        for (let i = 1; i <= 4; i++) {
            const coluna = document.querySelector(`[data-coluna="${i}"]`);
            if (coluna && coluna.style.opacity !== '0.5') {
                // Coluna visível deve estar completa
                const campos = coluna.querySelectorAll('[data-obrigatorio]');
                for (let campo of campos) {
                    if (!campo.textContent.trim()) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    obterColunaEmEdicao() {
        return this.colunaEmEdicao;
    }

    podeFinalizarEtapa() {
        return this.colunaEmEdicao === null && this.colunasPreenchidas.size > 0;
    }
}

// ========== SISTEMA PRINCIPAL DO CHECKLIST ==========
class SistemaChecklist4MEtapas {
    constructor() {
        this.mensagens = new SistemaMensagens();
        this.autenticacao = new GerenciadorAutenticacao();
        this.numeroControleAtual = null;
        this.etapaAtual = ETAPAS.OPERADOR;
        this.statusAtual = STATUS_CHECKLIST.EM_ANDAMENTO;
        this.gerenciadorEtapa = new GerenciadorEtapa(this.etapaAtual);
        this.dadosFormulario = {};
        
        this.inicializar();
    }

    inicializar() {
        this.carregarFormularioExistente();
        this.configurarListeners();
        this.configurarBloqueoColunas();
        this.atualizarUIEtapa();
    }

    // ========== IDENTIFICAÇÃO DO USUÁRIO ==========
    exibirTelaLogin() {
        const modalHTML = `
            <div id="modal-login" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            ">
                <div style="
                    background: white;
                    padding: 30px;
                    border-radius: 8px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    max-width: 400px;
                    width: 90%;
                ">
                    <h2 style="margin-bottom: 20px; color: #333;">Autenticação - Etapa de Aprovação</h2>
                    <p style="margin-bottom: 15px; color: #666;">Usuários autorizados: julio, julia, dionas, admin.ti</p>
                    
                    <input 
                        type="text" 
                        id="usuario-login" 
                        placeholder="Digite seu usuário"
                        style="
                            width: 100%;
                            padding: 10px;
                            margin-bottom: 15px;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                            font-size: 14px;
                        "
                    >
                    
                    <button 
                        id="btn-autenticar"
                        style="
                            width: 100%;
                            padding: 10px;
                            background: #4CAF50;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: bold;
                        "
                    >
                        Autenticar
                    </button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        document.getElementById('btn-autenticar').addEventListener('click', () => {
            const usuario = document.getElementById('usuario-login').value.trim();
            
            if (!usuario) {
                this.mensagens.erro('Por favor, digite seu usuário');
                return;
            }

            if (this.autenticacao.autenticar(usuario)) {
                document.getElementById('modal-login').remove();
                this.mensagens.sucesso(`Bem-vindo, ${usuario}!`);
                this.atualizarUIEtapa();
            } else {
                this.mensagens.erro('Usuário não autorizado para aprovação');
            }
        });

        // Permitir Enter para autenticar
        document.getElementById('usuario-login').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('btn-autenticar').click();
            }
        });
    }

    // ========== CARREGAMENTO DE FORMULÁRIO ==========
    carregarFormularioExistente() {
        const params = new URLSearchParams(window.location.search);
        const numeroControle = params.get('numero_controle');

        if (numeroControle) {
            this.numeroControleAtual = numeroControle;
            fetch(`${API_URL}/fr0062/${numeroControle}`)
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        this.dadosFormulario = data.formulario;
                        this.etapaAtual = data.formulario.etapa_atual || ETAPAS.OPERADOR;
                        this.statusAtual = data.formulario.status || STATUS_CHECKLIST.EM_ANDAMENTO;
                        this.gerenciadorEtapa = new GerenciadorEtapa(this.etapaAtual);
                        this.preencherFormulario();
                        this.atualizarUIEtapa();
                    }
                })
                .catch(e => {
                    this.mensagens.erro('Erro ao carregar formulário: ' + e.message);
                });
        } else {
            this.gerarNumeroControle();
        }
    }

    // ========== GERAÇÃO DE NÚMERO DE CONTROLE ==========
    gerarNumeroControle() {
        const now = new Date();
        const ano = now.getFullYear();
        const mes = String(now.getMonth() + 1).padStart(2, '0');
        const dia = String(now.getDate()).padStart(2, '0');
        const horas = String(now.getHours()).padStart(2, '0');
        const minutos = String(now.getMinutes()).padStart(2, '0');
        const segundos = String(now.getSeconds()).padStart(2, '0');
        const ms = String(now.getMilliseconds()).padStart(3, '0');

        this.numeroControleAtual = `FR0062-${ano}${mes}${dia}-${horas}${minutos}${segundos}${ms}`;
        this.dadosFormulario.numero_controle = this.numeroControleAtual;
    }

    // ========== DETERMINAÇÃO DE TURNO ==========
    obterTurnoAtual() {
        const now = new Date();
        const hora = now.getHours();
        const minuto = now.getMinutes();
        const tempo = hora + (minuto / 60);

        if (tempo >= 7 && tempo < 16.67) return TURNOS.TURNO_1.numero;
        if (tempo >= 16.67 && tempo < 23.38) return TURNOS.TURNO_2.numero;
        return TURNOS.TURNO_3.numero;
    }

    obterDataAtual() {
        const now = new Date();
        const dia = String(now.getDate()).padStart(2, '0');
        const mes = String(now.getMonth() + 1).padStart(2, '0');
        const ano = now.getFullYear();
        return `${dia}/${mes}/${ano}`;
    }

    // ========== PREENCHIMENTO AUTOMÁTICO ==========
    preencherAutomaticamente() {
        switch (this.etapaAtual) {
            case ETAPAS.OPERADOR:
                this.preencherCamposOperador();
                break;
            case ETAPAS.QUALIDADE:
                this.preencherCamposQualidade();
                break;
            case ETAPAS.APROVACAO:
                this.preencherCamposAprovacao();
                break;
        }
    }

    preencherCamposOperador() {
        // Preencher data e turno automaticamente
        const dataAtual = this.obterDataAtual();
        const turnoAtual = this.obterTurnoAtual();

        document.querySelectorAll('[data-campo="data"]').forEach(elem => {
            if (!elem.textContent.trim()) {
                elem.textContent = dataAtual;
                this.dadosFormulario.data_operador = dataAtual;
            }
        });

        document.querySelectorAll('[data-campo="turno"]').forEach(elem => {
            if (!elem.textContent.trim()) {
                elem.textContent = `Turno ${turnoAtual}`;
                this.dadosFormulario.turno_operador = turnoAtual;
            }
        });
    }

    preencherCamposQualidade() {
        // Lógica de preenchimento automático para qualidade (se necessário)
    }

    preencherCamposAprovacao() {
        // Preencher "Aprovado por" com usuário autenticado
        if (this.autenticacao.estaAutenticado()) {
            const usuario = this.autenticacao.obterUsuario();
            document.querySelectorAll('[data-campo="aprovado-por"]').forEach(elem => {
                if (!elem.textContent.trim()) {
                    elem.textContent = usuario;
                    this.dadosFormulario.aprovado_por = usuario;
                }
            });
        }
    }

    // ========== CONFIGURAÇÃO DE BLOQUEIO DE COLUNAS ==========
    configurarBloqueoColunas() {
        document.querySelectorAll('[data-coluna]').forEach(coluna => {
            const numeroColuna = coluna.getAttribute('data-coluna');

            // Listener para início de edição
            coluna.addEventListener('focus', (e) => {
                if (e.target.contentEditable === 'true' || e.target.tagName === 'INPUT') {
                    this.gerenciadorEtapa.iniciarEdicaoColuna(numeroColuna);
                }
            }, true);

            // Listener para mudança de conteúdo
            coluna.addEventListener('input', (e) => {
                if (this.gerenciadorEtapa.obterColunaEmEdicao() !== numeroColuna) {
                    e.preventDefault();
                    this.mensagens.aviso('Você já está editando outra coluna. Finalize antes de mudar.');
                }
            });

            // Listener para saída de foco
            coluna.addEventListener('blur', (e) => {
                // Verificar se há conteúdo
                if (coluna.textContent.trim()) {
                    this.gerenciadorEtapa.finalizarEdicaoColuna(numeroColuna);
                }
            }, true);
        });
    }

    // ========== ATUALIZAÇÃO DA UI ==========
    atualizarUIEtapa() {
        // Mostrar/esconder elementos baseado na etapa
        this.atualizarIndicadorEtapa();
        this.atualizarBotoes();
        this.atualizarCamposVisiveis();
        this.preencherAutomaticamente();
    }

    atualizarIndicadorEtapa() {
        const indicador = document.getElementById('indicador-etapa') || this.criarIndicadorEtapa();
        
        const nomes = {
            [ETAPAS.OPERADOR]: '1. OPERADOR',
            [ETAPAS.QUALIDADE]: '2. QUALIDADE',
            [ETAPAS.APROVACAO]: '3. APROVAÇÃO'
        };

        const status = {
            [STATUS_CHECKLIST.EM_ANDAMENTO]: 'Em Andamento',
            [STATUS_CHECKLIST.AGUARDANDO_QUALIDADE]: 'Aguardando Qualidade',
            [STATUS_CHECKLIST.AGUARDANDO_APROVACAO]: 'Aguardando Aprovação',
            [STATUS_CHECKLIST.CONCLUIDO]: 'Concluído'
        };

        indicador.innerHTML = `
            <strong>Etapa Atual:</strong> ${nomes[this.etapaAtual]}<br>
            <strong>Status:</strong> ${status[this.statusAtual]}<br>
            ${this.autenticacao.estaAutenticado() ? `<strong>Usuário:</strong> ${this.autenticacao.obterUsuario()}` : ''}
        `;
    }

    criarIndicadorEtapa() {
        const div = document.createElement('div');
        div.id = 'indicador-etapa';
        div.style.cssText = `
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 4px;
            font-family: Arial, sans-serif;
            font-size: 12px;
        `;
        
        const formulario = document.getElementById('formularioFR0062');
        if (formulario) {
            formulario.parentElement.insertBefore(div, formulario);
        }
        
        return div;
    }

    atualizarBotoes() {
        const btnFinalizar = document.getElementById('btnFinalizarEtapa') || this.criarBtnFinalizar();
        const btnEditar = document.getElementById('btnEditarEtapa') || this.criarBtnEditar();

        // Habilitar/desabilitar botões baseado no estado
        if (this.etapaAtual === ETAPAS.APROVACAO && !this.autenticacao.estaAutenticado()) {
            this.exibirTelaLogin();
        }

        // Mostrar botão correto
        if (this.gerenciadorEtapa.podeFinalizarEtapa()) {
            btnFinalizar.style.display = 'inline-block';
        } else {
            btnFinalizar.style.display = 'none';
        }
    }

    criarBtnFinalizar() {
        const btn = document.createElement('button');
        btn.id = 'btnFinalizarEtapa';
        btn.textContent = 'Finalizar Etapa';
        btn.style.cssText = `
            background: #4CAF50;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            margin-top: 20px;
        `;
        btn.addEventListener('click', () => this.finalizarEtapa());
        
        const container = document.querySelector('[data-container="botoes"]') || 
                         document.querySelector('.bloco-botoes') ||
                         document.body;
        container.appendChild(btn);
        
        return btn;
    }

    criarBtnEditar() {
        const btn = document.createElement('button');
        btn.id = 'btnEditarEtapa';
        btn.textContent = 'Editar';
        btn.style.cssText = `
            background: #2196F3;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            margin-top: 20px;
            margin-left: 10px;
        `;
        btn.addEventListener('click', () => this.reabrirEtapa());
        
        const container = document.querySelector('[data-container="botoes"]') || 
                         document.querySelector('.bloco-botoes') ||
                         document.body;
        container.appendChild(btn);
        
        return btn;
    }

    atualizarCamposVisiveis() {
        // Mostrar apenas campos da etapa atual
        document.querySelectorAll('[data-etapa]').forEach(elem => {
            const etapa = elem.getAttribute('data-etapa');
            elem.style.display = etapa === this.etapaAtual ? 'block' : 'none';
        });

        // Desabilitar/habilitar campos baseado na etapa
        this.atualizarEstadoCampos();
    }

    atualizarEstadoCampos() {
        const podeEditar = this.etapaAtual === ETAPAS.OPERADOR ||
                          (this.etapaAtual === ETAPAS.QUALIDADE) ||
                          (this.etapaAtual === ETAPAS.APROVACAO && this.autenticacao.estaAutenticado());

        // Controle fino de edição por etapa
        if (this.etapaAtual === ETAPAS.APROVACAO && this.autenticacao.estaAutenticado()) {
            // Usuários de aprovação podem editar tudo
            document.querySelectorAll('[contenteditable], input, textarea, select').forEach(elem => {
                elem.removeAttribute('readonly');
                elem.style.opacity = '1';
            });
        } else {
            // Bloquear edição de outras etapas
            document.querySelectorAll('[data-etapa]').forEach(elem => {
                if (elem.getAttribute('data-etapa') !== this.etapaAtual) {
                    elem.querySelectorAll('[contenteditable], input, textarea, select').forEach(campo => {
                        campo.setAttribute('readonly', 'readonly');
                        campo.style.opacity = '0.6';
                    });
                }
            });
        }
    }

    // ========== FINALIZAÇÃO DE ETAPA ==========
    finalizarEtapa() {
        if (!this.gerenciadorEtapa.verificarCamposObrigatorios()) {
            this.mensagens.erro('Por favor, complete todos os campos obrigatórios da etapa');
            return;
        }

        this.coletarDadosEtapa();

        const proximasEtapas = {
            [ETAPAS.OPERADOR]: { etapa: ETAPAS.QUALIDADE, status: STATUS_CHECKLIST.AGUARDANDO_QUALIDADE },
            [ETAPAS.QUALIDADE]: { etapa: ETAPAS.APROVACAO, status: STATUS_CHECKLIST.AGUARDANDO_APROVACAO },
            [ETAPAS.APROVACAO]: { etapa: null, status: STATUS_CHECKLIST.CONCLUIDO }
        };

        const proxima = proximasEtapas[this.etapaAtual];
        
        if (proxima) {
            this.etapaAtual = proxima.etapa || ETAPAS.OPERADOR;
            this.statusAtual = proxima.status;
            
            // Se foi para aprovação, exigir autenticação
            if (this.etapaAtual === ETAPAS.APROVACAO && !this.autenticacao.estaAutenticado()) {
                this.exibirTelaLogin();
            }

            this.salvarFormulario();
        }
    }

    reabrirEtapa() {
        this.gerenciadorEtapa = new GerenciadorEtapa(this.etapaAtual);
        this.atualizarUIEtapa();
        this.mensagens.informacao('Você pode editar esta etapa novamente');
    }

    // ========== COLETA E SALVAMENTO DE DADOS ==========
    coletarDadosEtapa() {
        const dados = {};

        document.querySelectorAll('[data-etapa="' + this.etapaAtual + '"] [data-campo]').forEach(elem => {
            const campo = elem.getAttribute('data-campo');
            dados[campo] = elem.textContent.trim() || elem.value;
        });

        this.dadosFormulario = {
            ...this.dadosFormulario,
            ...dados,
            etapa_atual: this.etapaAtual,
            status: this.statusAtual,
            numero_controle: this.numeroControleAtual
        };
    }

    salvarFormulario() {
        const metodo = this.numeroControleAtual && this.modoEdicao ? 'PUT' : 'POST';
        const url = metodo === 'PUT' 
            ? `${API_URL}/fr0062/${this.numeroControleAtual}`
            : `${API_URL}/fr0062`;

        fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.dadosFormulario)
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                this.mensagens.sucesso('Etapa finalizada com sucesso!');
                this.atualizarUIEtapa();
                
                // Redirecionar para listagem após 2 segundos
                setTimeout(() => {
                    window.location.href = './4m-checklist.html';
                }, 2000);
            } else {
                this.mensagens.erro('Erro ao salvar: ' + data.message);
            }
        })
        .catch(e => this.mensagens.erro('Erro na requisição: ' + e.message));
    }

    preencherFormulario() {
        // Preencher formulário com dados existentes
        document.querySelectorAll('[data-campo]').forEach(elem => {
            const campo = elem.getAttribute('data-campo');
            if (this.dadosFormulario[campo]) {
                elem.textContent = this.dadosFormulario[campo];
            }
        });

        this.modoEdicao = true;
    }

    // ========== LISTENERS ==========
    configurarListeners() {
        // Botão salvar existente (se houver)
        const btnSalvar = document.getElementById('btnSalvarCheck');
        if (btnSalvar) {
            btnSalvar.addEventListener('click', () => this.finalizarEtapa());
        }

        // Botão limpar existente (se houver)
        const btnLimpar = document.getElementById('btnLimparDados');
        if (btnLimpar) {
            btnLimpar.addEventListener('click', () => this.limparFormulario());
        }

        // Botão cancelar existente (se houver)
        const btnCancelar = document.getElementById('btnCancelar');
        if (btnCancelar) {
            btnCancelar.addEventListener('click', () => this.cancelarEdicao());
        }
    }

    limparFormulario() {
        if (confirm('Tem certeza que deseja limpar todos os dados?')) {
            document.querySelectorAll('[contenteditable], input, textarea, select').forEach(elem => {
                elem.textContent = '';
                elem.value = '';
            });
            this.mensagens.informacao('Formulário limpo');
        }
    }

    cancelarEdicao() {
        if (confirm('Deseja cancelar e retornar à listagem?')) {
            window.location.href = './4m-checklist.html';
        }
    }
}

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', () => {
    window.sistemaChecklist = new SistemaChecklist4MEtapas();
});
// const API_URL = 'https://fourm-znis.onrender.com/api';
const API_URL = 'http://localhost:3001/api';

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

// ========== SISTEMA CHECKLIST 4M ==========
class SistemaChecklist4M {
    constructor() {
        this.mensagens = new SistemaMensagens();
        this.numeroControleAtual = null;
        this.modoEdicao = false;
    }

    // Adicione este método à classe SistemaChecklist4M
    encontrarElementoPorTexto(selector, texto) {
        const elementos = document.querySelectorAll(selector);
        for (let elemento of elementos) {
            if (elemento.textContent.includes(texto)) {
                return elemento;
            }
        }
        return null;
    }

    // Gerar número de controle único
    gerarNumeroControle() {
        const now = new Date();
        const ano = now.getFullYear();
        const mes = String(now.getMonth() + 1).padStart(2, '0');
        const dia = String(now.getDate()).padStart(2, '0');
        const dataStr = `${ano}${mes}${dia}`;

        const horas = String(now.getHours()).padStart(2, '0');
        const minutos = String(now.getMinutes()).padStart(2, '0');
        const segundos = String(now.getSeconds()).padStart(2, '0');
        const horaStr = `${horas}${minutos}${segundos}`;

        const milissegundos = String(now.getMilliseconds()).padStart(3, '0');

        this.numeroControleAtual = `FR0062-${dataStr}-${horaStr}${milissegundos}`;
        console.log('✅ Número de controle gerado:', this.numeroControleAtual);
        return this.numeroControleAtual;
    }

    coletarMudancas4M() {
        const tipos = ['MAN', 'MACHINE', 'MATERIAL', 'METHOD'];
        const mudancas = [];

        for (let i = 0; i < 4; i++) {
            const tipo = tipos[i];
            const colunaSelector = `.quadro-container-2 .coluna:nth-child(${i + 1})`;
            const colunaElement = document.querySelector(colunaSelector);
            const isFirstColumn = i === 0;

            // Obter o prefixo correto para IDs baseado no tipo
            const getIdPrefix = (tipo) => {
                const prefixes = {
                    'MAN': 'man',
                    'MACHINE': 'machine',
                    'MATERIAL': 'material',
                    'METHOD': 'method'
                };
                return prefixes[tipo] || tipo.toLowerCase();
            };

            const idPrefix = getIdPrefix(tipo);

            const mudanca = {
                tipo: tipo,
                // Campos básicos da primeira linha
                item_modificado: this.getTexto(`#${idPrefix}_itemModificado1`),
                nome: tipo === 'MAN' ? this.getTexto(`#man_nome1`) : '',
                motivo: tipo !== 'MAN' ? this.getTexto(`#${idPrefix}_motivo1`) : '',
                projeto: this.getTexto(`#${idPrefix}_projeto1`),
                numero_operacao: this.getTexto(`#${idPrefix}_numOperacao1`),

                // Importância
                importancia_normal: this.isChecked(`input[aria-label*="${tipo} Importância Normal"]`),
                importancia_importante_as: this.isChecked(`input[aria-label*="${tipo} Importância Importante A/S"]`),

                // Data e turnos
                data_turno: this.getTexto(`#${idPrefix}_dataTurno1`),
                turno_1t: this.isChecked(`input[aria-label*="${tipo} Turno 1T"]`),
                turno_2t: this.isChecked(`input[aria-label*="${tipo} Turno 2T"]`),
                turno_3t: this.isChecked(`input[aria-label*="${tipo} Turno 3T"]`),

                // Para colunas 2-4, temos campos de modificação e registro
                modificacao: isFirstColumn ? '' : this.getTexto(`${colunaSelector} .secao:nth-child(1) .input-line`),
                registro: isFirstColumn ? '' : this.getTexto(`${colunaSelector} .secao:nth-child(2) .input-line`),

                // Garantia 200%
                garantia_200_sim: isFirstColumn ? false : this.isChecked(`input[aria-label*="${tipo} Garantia 200% Sim"]`),
                garantia_200_nao: isFirstColumn ? false : this.isChecked(`input[aria-label*="${tipo} Garantia 200% Não"]`),
                garantia_200_valor: isFirstColumn ? '' : this.getTexto(`${colunaSelector} .secao-garantia .input-line`),

                // Lote de produção garantido (apenas colunas 2-4)
                lote_prod_garantido: isFirstColumn ? '' : this.getTextoPorLabel(colunaElement, "LOTE DE PROD. GARANTIDO"),

                // Sakanobori - ajuste para primeira coluna
                sakanobori_nao: this.isChecked(isFirstColumn ? `input[aria-label="Sakanobori Não"]` : `input[aria-label*="${tipo} Sakanobori Não"]`),
                sakanobori_sim: this.isChecked(isFirstColumn ? `input[aria-label="Sakanobori Sim"]` : `input[aria-label*="${tipo} Sakanobori Sim"]`),
                sakanobori_qtd: this.getTexto(`${colunaSelector} .secao-sakanobori .input-line`),

                // QTD YAB e NBA - DIFERENÇA PARA A PRIMEIRA COLUNA
                qtd_yab: this.getTextoPorSeletores(colunaElement, isFirstColumn),
                qtd_nba: this.getTextoPorSeletores(colunaElement, isFirstColumn, true),

                // Acompanhamento QA (apenas colunas 2-4)
                acompanhamento_qa: isFirstColumn ? '' : this.getTextoPorLabel(colunaElement, "ACOMPANHAMENTO Q.A."),

                // Meios de avaliação (apenas colunas 2-4)
                avaliacao_2d: isFirstColumn ? false : this.isChecked(`input[aria-label*="${tipo} Avaliação 2D"]`),
                avaliacao_cmm: isFirstColumn ? false : this.isChecked(`input[aria-label*="${tipo} Avaliação CMM"]`),
                avaliacao_macro: isFirstColumn ? false : this.isChecked(`input[aria-label*="${tipo} Avaliação MACRO"]`),
                avaliacao_outros: isFirstColumn ? false : this.isChecked(`input[aria-label*="${tipo} Avaliação Outros"]`),
                avaliacao_outros_texto: isFirstColumn ? '' : this.getTexto(`${colunaSelector} .secao-meios .input-line`)
            };

            // Campos específicos do METHOD (última coluna)
            if (tipo === 'METHOD') {
                mudanca.lote_prod_garantido_nao = this.isChecked(`input[aria-label*="METHOD Lote Prod. Garantido Não"]`);

                // Segurança
                mudanca.seguranca = this.getTextoPorLabel(colunaElement, "SEGURANÇA");

                // Yield time
                mudanca.produtividade_yield_time = (() => {
                    if (!colunaElement) return '';
                    const yieldElements = colunaElement.querySelectorAll('.text-red');
                    for (let element of yieldElements) {
                        if (element.textContent.includes('Yield time')) {
                            const secao = element.closest('.secao');
                            if (secao) {
                                const inputLine = secao.querySelector('.input-line');
                                return inputLine ? inputLine.textContent.trim() : '';
                            }
                        }
                    }
                    return '';
                })();
            }

            mudancas.push(mudanca);
        }

        return mudancas;
    }

    // NOVO MÉTODO AUXILIAR PARA PEGAR QTD YAB E NBA
    getTextoPorSeletores(container, isFirstColumn, isNba = false) {
        if (!container) return '';

        // Buscar o label específico (QTD YAB ou QTD NBA)
        const labelTexto = isNba ? 'QTD NBA' : 'QTD YAB';
        const labels = container.querySelectorAll('.label-bold');

        for (let label of labels) {
            if (label.textContent.trim() === labelTexto) {
                // O próximo elemento após o label deve ser o input-line
                let nextElement = label.nextElementSibling;
                while (nextElement && nextElement.nodeType === 3) { // Pular text nodes
                    nextElement = nextElement.nextElementSibling;
                }
                if (nextElement && nextElement.classList.contains('input-line')) {
                    return nextElement.textContent.trim();
                }
            }
        }

        return '';
    }

    encontrarElementoPorLabel(container, textoLabel) {
        if (!container) return null;

        const labels = container.querySelectorAll('.label-bold');
        for (let label of labels) {
            if (label.textContent.includes(textoLabel)) {
                return label;
            }
        }
        return null;
    }

    getTextoPorLabel(container, textoLabel) {
        const label = this.encontrarElementoPorLabel(container, textoLabel);
        if (label) {
            const secao = label.closest('.secao');
            if (secao) {
                const inputLine = secao.querySelector('.input-line');
                return inputLine ? inputLine.textContent.trim() : '';
            }
        }
        return '';
    }

    // Coletar dados do formulário
    coletarDados() {
        const cabecalho = this.coletarCabecalho();

        const dados = {
            numero_controle: this.numeroControleAtual,
            cabecalho: cabecalho,
            mudancas_4m: this.coletarMudancas4M(),
            lista_verificacao: this.coletarListaVerificacao(),
            procedimento_normalidade: this.coletarProcedimentoNormalidade(),
            acompanhamento: this.coletarAcompanhamento(),
            resultados_avaliacao: this.coletarResultadosAvaliacao(),
            justificativas: this.coletarJustificativas(),
            status: 'em_andamento', // Valor padrão
            data_criacao: new Date().toISOString(),
            data_atualizacao: new Date().toISOString()
        };

        // Campos extras do formulário
        dados.solicitado_por = document.querySelector('.bloco-controle .input-line')?.textContent.trim() || '';
        dados.aprovado_por = cabecalho.qualidade_aprovado || '';
        dados.confirmado_por = cabecalho.qualidade_confirmado || '';
        dados.elaborado_por = cabecalho.qualidade_executado_por || '';
        dados.executado_por = this.getTexto('#controleExecutadoPor');
        dados.controle_elaborado_por = this.getTexto('#controleElaboradoPor');
        dados.man_numOperacao1 = this.getTexto('#man_numOperacao1');

        console.log('📦 Dados coletados:', dados);
        return dados;
    }

    coletarCabecalho() {
        return {
            visto_retencao_qa: this.getTexto('#vistoRetencaoQA'),
            setor_producao: this.getTexto('#setorProducao'),
            setor_logistica_pc: this.getTexto('#setorLogistica'),
            setor_engenharia: this.getTexto('#setorEngenharia'),
            qualidade_aprovado: this.getTexto('#controleAprovado'),
            qualidade_confirmado: this.getTexto('#qualidadeConfirmado'),
            qualidade_executado_por: this.getTexto('#qualidadeExecutadoPor'),
            recebimento_qa: this.getTexto('#recebimentoQA'),
            mudanca_engenharia: this.isChecked('input[aria-label*="Engenharia Mudança 4M"]'),
            mudanca_controle_prod: this.isChecked('input[aria-label*="Controle Prod. Mudança 4M"]'),
            mudanca_producao: this.isChecked('input[aria-label*="Produção Mudança 4M"]'),
            analise_risco_processo: this.isChecked('input[aria-label*="Análise Risco Processo"]'),
            analise_risco_produto: this.isChecked('input[aria-label*="Análise Risco Produto"]'),
            analise_risco_nao_aplicavel: this.isChecked('input[aria-label*="Análise Risco Não Aplicável"]'),
            horario_aplicacao_4m: this.getTexto('[name="horarioAplicacao"]'),

        };
    }

    coletarListaVerificacao() {
        return {
            registro_treinam_operador: this.isChecked('input[aria-label*="Registro Treinam Operador"]'),
            avaliacao_treinam_operador: this.isChecked('input[aria-label*="Avaliação Treinam Operador"]'),
            registro_garantia_200: this.isChecked('input[aria-label*="Registro Garantia 200%"]'),
            certificado_habilitacao: this.isChecked('input[aria-label*="Certificado Habilitação"]'),
            importante_a: this.isChecked('input[aria-label*="Importante A"]'),
            indicador_importante_a: this.isChecked('input[aria-label*="Indicador de Importante A"]'),
            avaliacao_qualidade: this.isChecked('input[aria-label*="Avaliação de Qualidade"]'),
            nivel_tecnico_acima_i: this.isChecked('input[aria-label*="Nível Técnico Acima de I"]'),
            qualidade_produto: this.isChecked('input[aria-label*="Qualidade Produto"]')
        };
    }

    coletarProcedimentoNormalidade() {
        return {
            pr008_sim: this.isChecked('input[aria-label*="PR008 Sim"]'),
            pr008_nao: this.isChecked('input[aria-label*="PR008 Não"]'),
            pr990_sim: this.isChecked('input[aria-label*="PR990 Sim"]'),
            pr990_nao: this.isChecked('input[aria-label*="PR990 Não"]'),
            pr007_sim: this.isChecked('input[aria-label*="PR007 Sim"]'),
            pr007_nao: this.isChecked('input[aria-label*="PR007 Não"]'),
            pr092_sim: this.isChecked('input[aria-label*="PR092 Sim"]'),
            pr092_nao: this.isChecked('input[aria-label*="PR092 Não"]'),
            justificativa: this.getTexto('.secao-justificativa .input-line')
        };
    }

    coletarAcompanhamento() {
        const acompanhamento = [];
        const rows = document.querySelectorAll('.sidebar-table tbody tr');

        let nomeNormaAtual = '';

        rows.forEach(row => {
            // Verificar se a primeira célula tem rowspan (novo grupo)
            const primeiraColuna = row.querySelector('td:first-child');
            if (primeiraColuna) {
                // Se tem rowspan ou é uma nova linha sem rowspan, atualizar o nome
                if (primeiraColuna.hasAttribute('rowspan') || row.cells.length >= 4) {
                    nomeNormaAtual = primeiraColuna.textContent.trim();
                }
            }

            // Buscar a célula de responsável (pode ser a segunda ou primeira, dependendo do rowspan)
            let responsavel = '';
            let checkboxNecessario = null;
            let checkboxConfirmado = null;

            if (row.cells.length === 4) {
                // Linha normal com todas as 4 colunas
                responsavel = row.querySelector('td:nth-child(2)')?.textContent.trim() || '';
                checkboxNecessario = row.querySelector('td:nth-child(3) input');
                checkboxConfirmado = row.querySelector('td:nth-child(4) input');
            } else if (row.cells.length === 3) {
                // Linha com rowspan (sem a primeira coluna)
                responsavel = row.querySelector('td:nth-child(1)')?.textContent.trim() || '';
                checkboxNecessario = row.querySelector('td:nth-child(2) input');
                checkboxConfirmado = row.querySelector('td:nth-child(3) input');
            }

            if (nomeNormaAtual) {
                acompanhamento.push({
                    nome_norma: nomeNormaAtual,
                    responsavel: responsavel,
                    necessario_inov: checkboxNecessario?.checked || false,
                    confirmado: checkboxConfirmado?.checked || false
                });
            }
        });

        return acompanhamento;
    }

    coletarResultadosAvaliacao() {
        const resultados = [];

        // Selecionar todas as seções de resultado
        const secoesResultado = document.querySelectorAll('.celula-3.secao-resultado');

        secoesResultado.forEach((secao, index) => {
            const i = index + 1;

            // Buscar elementos dentro da seção específica
            const avaliacaoOk = secao.querySelector(`input[aria-label*="Resultado Avaliação OK ${i}"]`);
            const resultado2d = secao.querySelector(`input[aria-label*="Resultado ${i} 2D"]`);
            const resultadoCmm = secao.querySelector(`input[aria-label*="Resultado ${i} CMM"]`);
            const resultadoMacro = secao.querySelector(`input[aria-label*="Resultado ${i} MACRO"]`);
            const resultadoOutros = secao.querySelector(`input[aria-label*="Resultado ${i} OUTROS"]`);

            // Buscar os textos - vamos buscar os .input-line que estão relacionados a cada checkbox
            const resultado2dTexto = this.getTextoAposCheckbox(secao, `input[aria-label*="Resultado ${i} 2D"]`);
            const resultadoCmmTexto = this.getTextoAposCheckbox(secao, `input[aria-label*="Resultado ${i} CMM"]`);
            const resultadoMacroTexto = this.getTextoAposCheckbox(secao, `input[aria-label*="Resultado ${i} MACRO"]`);
            const resultadoOutrosTexto = this.getTextoAposCheckbox(secao, `input[aria-label*="Resultado ${i} OUTROS"]`);

            // Buscar garantia 200% - o último input-line da seção
            const garantia200 = secao.querySelector('.input-line[style*="margin-top: auto"]') ||
                secao.querySelector('.input-line:last-child');

            const resultado = {
                numero: i,
                avaliacao_ok: avaliacaoOk ? avaliacaoOk.checked : false,
                resultado_2d: resultado2d ? resultado2d.checked : false,
                resultado_2d_texto: resultado2dTexto,
                resultado_cmm: resultadoCmm ? resultadoCmm.checked : false,
                resultado_cmm_texto: resultadoCmmTexto,
                resultado_macro: resultadoMacro ? resultadoMacro.checked : false,
                resultado_macro_texto: resultadoMacroTexto,
                resultado_outros: resultadoOutros ? resultadoOutros.checked : false,
                resultado_outros_texto: resultadoOutrosTexto,
                garantia_200: garantia200 ? garantia200.textContent.trim() : ''
            };

            resultados.push(resultado);
        });

        return resultados;
    }

    // Adicione este método auxiliar
    getTextoAposCheckbox(container, checkboxSelector) {
        const checkbox = container.querySelector(checkboxSelector);
        if (!checkbox) return '';

        // Encontrar o input-line mais próximo após o checkbox
        const parentInputItem = checkbox.closest('.input-item');
        if (parentInputItem) {
            const inputLine = parentInputItem.querySelector('.input-line');
            return inputLine ? inputLine.textContent.trim() : '';
        }

        return '';
    }

    coletarJustificativas() {
        const justificativas = [];

        // Selecionar todas as seções de justificativa
        const secoesJustificativa = document.querySelectorAll('.celula-3.secao-justificativa');

        secoesJustificativa.forEach((secao, index) => {
            const i = index + 1;

            // Buscar elementos dentro da seção específica
            const nokCheckbox = secao.querySelector(`input[aria-label*="Justificativa ${i} NOK"]`);

            // Buscar texto da justificativa
            const justificativaTexto = secao.querySelector('.justificativa-linha .input-line');

            // Buscar observações - input-line com min-height
            const observacoes = secao.querySelector('.input-line[style*="min-height"]');

            const justificativa = {
                numero: i,
                nok: nokCheckbox ? nokCheckbox.checked : false,
                justificativa_texto: justificativaTexto ? justificativaTexto.textContent.trim() : '',
                observacoes: observacoes ? observacoes.textContent.trim() : ''
            };

            justificativas.push(justificativa);
        });

        return justificativas;
    }

    getTexto(selector) {
        const element = document.querySelector(selector);
        return element ? element.textContent.trim() : '';
    }

    getTextoNth(selector, index) {
        const elements = document.querySelectorAll(selector);
        return elements[index] ? elements[index].textContent.trim() : '';
    }

    isChecked(selector) {
        const element = document.querySelector(selector);
        return element ? element.checked : false;
    }

    // Salvar formulário no backend
    async salvarFormulario() {
        try {
            this.mensagens.informacao('Salvando formulário...', 0);

            const dados = this.coletarDados();

            const url = this.modoEdicao
                ? `${API_URL}/fr0062/${this.numeroControleAtual}`
                : `${API_URL}/fr0062`;

            const method = this.modoEdicao ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dados)
            });

            const result = await response.json();

            if (result.success) {
                this.mensagens.sucesso(`✓ Formulário ${this.modoEdicao ? 'atualizado' : 'salvo'} com sucesso!`);
                console.log('✅ Resposta do servidor:', result);

                // Após salvar, redirecionar para a lista após 2 segundos
                setTimeout(() => {
                    window.location.href = '4m-checklist.html';
                }, 2000);
            } else {
                this.mensagens.erro(`✗ Erro ao salvar: ${result.message}`);
            }

        } catch (error) {
            console.error('❌ Erro ao salvar formulário:', error);
            this.mensagens.erro('✗ Erro ao comunicar com o servidor. Verifique se o servidor está rodando.');
        }
    }

    // Carregar dados do formulário
    async carregarFormulario(numeroControle) {
        try {
            const response = await fetch(`${API_URL}/fr0062/${numeroControle}`);
            const result = await response.json();

            if (result.success && result.formulario) {
                this.preencherFormulario(result.formulario);
                this.numeroControleAtual = numeroControle;
                this.modoEdicao = true;

                // Verificar se o checklist já está finalizado
                if (result.formulario.status === 'finalizado') {
                    console.log('⚠️ Checklist carregado em modo FINALIZADO (somente leitura)');
                    this.desabilitarEdicaoFormulario();
                } else {
                    console.log('✅ Checklist carregado em modo de edição');
                }

                return result.formulario;
            } else {
                this.mensagens.erro('Formulário não encontrado');
                return null;
            }

        } catch (error) {
            console.error('❌ Erro ao carregar formulário:', error);
            this.mensagens.erro('✗ Erro ao carregar formulário');
            return null;
        }
    }
    // Adicione este método à classe SistemaChecklist4M
    verificarPermissoesEdicao(status) {
        if (status === 'finalizado') {
            this.desabilitarEdicaoFormulario();
            return false;
        }
        return true;
    }
    preencherAcompanhamento(dadosAcompanhamento) {
        if (!dadosAcompanhamento || dadosAcompanhamento.length === 0) {
            console.log('⚠️ Nenhum dado de acompanhamento para preencher');
            return;
        }

        console.log('📋 Preenchendo dados de acompanhamento:', dadosAcompanhamento);

        const rows = document.querySelectorAll('.sidebar-table tbody tr');
        let acompanhamentoIndex = 0;
        let nomeNormaAtual = '';

        rows.forEach((row, rowIndex) => {
            // Verificar se a primeira célula tem rowspan (novo grupo)
            const primeiraColuna = row.querySelector('td:first-child');
            if (primeiraColuna) {
                // Se tem rowspan ou é uma nova linha sem rowspan, atualizar o nome
                if (primeiraColuna.hasAttribute('rowspan') || row.cells.length >= 4) {
                    nomeNormaAtual = primeiraColuna.textContent.trim();
                }
            }

            // Determinar o item de acompanhamento correto
            let item = null;

            if (acompanhamentoIndex < dadosAcompanhamento.length) {
                item = dadosAcompanhamento[acompanhamentoIndex];

                // Verificar se este item corresponde a esta linha
                // Procurando pelo nome da norma na linha atual
                let nomeNaLinha = '';
                if (primeiraColuna && (primeiraColuna.hasAttribute('rowspan') || row.cells.length >= 4)) {
                    nomeNaLinha = primeiraColuna.textContent.trim();
                } else {
                    // Se não tem primeira coluna, usar o último nomeNormaAtual
                    nomeNaLinha = nomeNormaAtual;
                }

                // Buscar responsável na linha
                let responsavelNaLinha = '';
                if (row.cells.length === 4) {
                    responsavelNaLinha = row.querySelector('td:nth-child(2)')?.textContent.trim() || '';
                } else if (row.cells.length === 3) {
                    responsavelNaLinha = row.querySelector('td:nth-child(1)')?.textContent.trim() || '';
                }

                // Verificar se o item corresponde à linha
                if (item.nome_norma === nomeNaLinha && item.responsavel === responsavelNaLinha) {
                    // Encontrar os checkboxes e preencher
                    let checkboxNecessario = null;
                    let checkboxConfirmado = null;

                    if (row.cells.length === 4) {
                        checkboxNecessario = row.querySelector('td:nth-child(3) input');
                        checkboxConfirmado = row.querySelector('td:nth-child(4) input');
                    } else if (row.cells.length === 3) {
                        checkboxNecessario = row.querySelector('td:nth-child(2) input');
                        checkboxConfirmado = row.querySelector('td:nth-child(3) input');
                    }

                    if (checkboxNecessario) {
                        checkboxNecessario.checked = item.necessario_inov || false;
                        console.log(`✅ Preenchido Necessário: ${item.nome_norma} - ${item.responsavel}: ${item.necessario_inov}`);
                    }

                    if (checkboxConfirmado) {
                        checkboxConfirmado.checked = item.confirmado || false;
                        console.log(`✅ Preenchido Confirmado: ${item.nome_norma} - ${item.responsavel}: ${item.confirmado}`);
                    }

                    acompanhamentoIndex++;
                }
            }
        });

        console.log(`✅ Preenchimento de acompanhamento concluído: ${acompanhamentoIndex} itens processados`);
    }

    // Preencher formulário com dados
    preencherFormulario(dados) {
        // Campos extras
        this.setTexto('#controleElaboradoPor', dados.controle_elaborado_por);

        // Preencher cabeçalho
        if (dados.cabecalho) {
            this.setTexto('#solicitadoPor', dados.solicitado_por);
            this.setTexto('#qualidadeAprovado', dados.aprovado_por);
            this.setTexto('#vistoRetencaoQA', dados.cabecalho.visto_retencao_qa);
            this.setTexto('#setorProducao', dados.cabecalho.setor_producao);
            this.setTexto('#setorLogistica', dados.cabecalho.setor_logistica_pc);
            this.setTexto('#setorEngenharia', dados.cabecalho.setor_engenharia);
            this.setTexto('#controleAprovado', dados.cabecalho.qualidade_aprovado);
            this.setTexto('#qualidadeConfirmado', dados.cabecalho.qualidade_confirmado);
            this.setTexto('#qualidadeExecutadoPor', dados.cabecalho.qualidade_executado_por);
            this.setTexto('#recebimentoQA', dados.cabecalho.recebimento_qa);
            this.setTexto('#controleExecutadoPor', dados.executado_por);

            // Checkboxes do cabeçalho
            this.setChecked('input[aria-label*="Engenharia Mudança 4M"]', dados.cabecalho.mudanca_engenharia);
            this.setChecked('input[aria-label*="Controle Prod. Mudança 4M"]', dados.cabecalho.mudanca_controle_prod);
            this.setChecked('input[aria-label*="Produção Mudança 4M"]', dados.cabecalho.mudanca_producao);
            this.setChecked('input[aria-label*="Análise Risco Processo"]', dados.cabecalho.analise_risco_processo);
            this.setChecked('input[aria-label*="Análise Risco Produto"]', dados.cabecalho.analise_risco_produto);
            this.setChecked('input[aria-label*="Análise Risco Não Aplicável"]', dados.cabecalho.analise_risco_nao_aplicavel);

            this.setTexto('[name="horarioAplicacao"]', dados.cabecalho.horario_aplicacao_4m);
        }

        // Preencher Mudanças 4M
        if (dados.mudancas_4m && dados.mudancas_4m.length > 0) {
            dados.mudancas_4m.forEach((mudanca, i) => {
                const tipo = mudanca.tipo;
                const colunaSelector = `.quadro-container-2 .coluna:nth-child(${i + 1})`;
                const colunaElement = document.querySelector(colunaSelector);
                const isFirstColumn = i === 0;

                // Campos básicos usando IDs diretos
                this.setTexto(`#${tipo.toLowerCase()}_itemModificado1`, mudanca.item_modificado);

                if (tipo === 'MAN') {
                    this.setTexto(`#man_nome1`, mudanca.nome);
                } else {
                    this.setTexto(`#${tipo.toLowerCase()}_motivo1`, mudanca.motivo);
                }

                this.setTexto(`#${tipo.toLowerCase()}_projeto1`, mudanca.projeto);
                this.setTexto(`#${tipo.toLowerCase()}_numOperacao1`, mudanca.numero_operacao);
                this.setTexto(`#${tipo.toLowerCase()}_dataTurno1`, mudanca.data_turno);

                // Importância
                this.setChecked(`input[aria-label*="${tipo} Importância Normal"]`, mudanca.importancia_normal);
                this.setChecked(`input[aria-label*="${tipo} Importância Importante A/S"]`, mudanca.importancia_importante_as);

                // Turnos
                this.setChecked(`input[aria-label*="${tipo} Turno 1T"]`, mudanca.turno_1t);
                this.setChecked(`input[aria-label*="${tipo} Turno 2T"]`, mudanca.turno_2t);
                this.setChecked(`input[aria-label*="${tipo} Turno 3T"]`, mudanca.turno_3t);

                // Modificação e Registro (apenas colunas 2-4)
                if (!isFirstColumn) {
                    this.setTexto(`${colunaSelector} .secao:nth-child(1) .input-line`, mudanca.modificacao);
                    this.setTexto(`${colunaSelector} .secao:nth-child(2) .input-line`, mudanca.registro);

                    // Garantia 200%
                    this.setChecked(`input[aria-label*="${tipo} Garantia 200% Sim"]`, mudanca.garantia_200_sim);
                    this.setChecked(`input[aria-label*="${tipo} Garantia 200% Não"]`, mudanca.garantia_200_nao);
                    this.setTexto(`${colunaSelector} .secao-garantia .input-line`, mudanca.garantia_200_valor);

                    // Lote de produção garantido
                    if (mudanca.lote_prod_garantido) {
                        const loteLabel = this.encontrarElementoPorLabel(colunaElement, "LOTE DE PROD. GARANTIDO");
                        if (loteLabel) {
                            const secao = loteLabel.closest('.secao');
                            if (secao) {
                                const inputLine = secao.querySelector('.input-line');
                                if (inputLine) inputLine.textContent = mudanca.lote_prod_garantido;
                            }
                        }
                    }

                    // Acompanhamento QA
                    if (mudanca.acompanhamento_qa) {
                        const qaLabel = this.encontrarElementoPorLabel(colunaElement, "ACOMPANHAMENTO Q.A.");
                        if (qaLabel) {
                            const secao = qaLabel.closest('.secao');
                            if (secao) {
                                const inputLine = secao.querySelector('.input-line');
                                if (inputLine) inputLine.textContent = mudanca.acompanhamento_qa;
                            }
                        }
                    }

                    // Meios de avaliação
                    this.setChecked(`input[aria-label*="${tipo} Avaliação 2D"]`, mudanca.avaliacao_2d);
                    this.setChecked(`input[aria-label*="${tipo} Avaliação CMM"]`, mudanca.avaliacao_cmm);
                    this.setChecked(`input[aria-label*="${tipo} Avaliação MACRO"]`, mudanca.avaliacao_macro);
                    this.setChecked(`input[aria-label*="${tipo} Avaliação Outros"]`, mudanca.avaliacao_outros);
                    this.setTexto(`${colunaSelector} .secao-meios .input-line`, mudanca.avaliacao_outros_texto);
                }

                // QTD YAB e QTD NBA - Para TODAS as colunas (incluindo MAN)
                if (mudanca.qtd_yab !== undefined && mudanca.qtd_yab !== null && mudanca.qtd_yab !== '') {
                    const labels = colunaElement.querySelectorAll('.label-bold');
                    for (let label of labels) {
                        if (label.textContent.trim() === 'QTD YAB') {
                            // O próximo elemento após o label deve ser o input-line
                            let nextElement = label.nextElementSibling;
                            while (nextElement && nextElement.nodeType === 3) { // Pular text nodes
                                nextElement = nextElement.nextElementSibling;
                            }
                            if (nextElement && nextElement.classList.contains('input-line')) {
                                nextElement.textContent = String(mudanca.qtd_yab);
                            }
                            break;
                        }
                    }
                }

                if (mudanca.qtd_nba !== undefined && mudanca.qtd_nba !== null && mudanca.qtd_nba !== '') {
                    const labels = colunaElement.querySelectorAll('.label-bold');
                    for (let label of labels) {
                        if (label.textContent.trim() === 'QTD NBA') {
                            // O próximo elemento após o label deve ser o input-line
                            let nextElement = label.nextElementSibling;
                            while (nextElement && nextElement.nodeType === 3) { // Pular text nodes
                                nextElement = nextElement.nextElementSibling;
                            }
                            if (nextElement && nextElement.classList.contains('input-line')) {
                                nextElement.textContent = String(mudanca.qtd_nba);
                            }
                            break;
                        }
                    }
                }

                // Sakanobori para todas as colunas
                this.setChecked(isFirstColumn ? `input[aria-label="Sakanobori Não"]` : `input[aria-label*="${tipo} Sakanobori Não"]`, mudanca.sakanobori_nao);
                this.setChecked(isFirstColumn ? `input[aria-label="Sakanobori Sim"]` : `input[aria-label*="${tipo} Sakanobori Sim"]`, mudanca.sakanobori_sim);
                this.setTexto(`${colunaSelector} .secao-sakanobori .input-line`, mudanca.sakanobori_qtd);

                // Campos específicos do METHOD
                if (tipo === 'METHOD') {
                    this.setChecked(`input[aria-label*="METHOD Lote Prod. Garantido Não"]`, mudanca.lote_prod_garantido_nao);

                    if (mudanca.seguranca) {
                        const segLabel = this.encontrarElementoPorLabel(colunaElement, "SEGURANÇA");
                        if (segLabel) {
                            const secao = segLabel.closest('.secao');
                            if (secao) {
                                const inputLine = secao.querySelector('.input-line');
                                if (inputLine) inputLine.textContent = mudanca.seguranca;
                            }
                        }
                    }

                    if (mudanca.produtividade_yield_time) {
                        const yieldElements = colunaElement.querySelectorAll('.text-red');
                        for (let element of yieldElements) {
                            if (element.textContent.includes('Yield time')) {
                                const secao = element.closest('.secao');
                                if (secao) {
                                    const inputLine = secao.querySelector('.input-line');
                                    if (inputLine) inputLine.textContent = mudanca.produtividade_yield_time;
                                }
                            }
                        }
                    }
                }
            });
        }

        // Preencher Lista de Verificação
        if (dados.lista_verificacao) {
            this.setChecked('input[aria-label*="Registro Treinam Operador"]', dados.lista_verificacao.registro_treinam_operador);
            this.setChecked('input[aria-label*="Avaliação Treinam Operador"]', dados.lista_verificacao.avaliacao_treinam_operador);
            this.setChecked('input[aria-label*="Registro Garantia 200%"]', dados.lista_verificacao.registro_garantia_200);
            this.setChecked('input[aria-label*="Certificado Habilitação"]', dados.lista_verificacao.certificado_habilitacao);
            this.setChecked('input[aria-label*="Importante A"]', dados.lista_verificacao.importante_a);
            this.setChecked('input[aria-label*="Indicador de Importante A"]', dados.lista_verificacao.indicador_importante_a);
            this.setChecked('input[aria-label*="Avaliação de Qualidade"]', dados.lista_verificacao.avaliacao_qualidade);
            this.setChecked('input[aria-label*="Nível Técnico Acima de I"]', dados.lista_verificacao.nivel_tecnico_acima_i);
            this.setChecked('input[aria-label*="Qualidade Produto"]', dados.lista_verificacao.qualidade_produto);
        }

        // Preencher Procedimento de Normalidade
        if (dados.procedimento_normalidade) {
            this.setChecked('input[aria-label*="PR008 Sim"]', dados.procedimento_normalidade.pr008_sim);
            this.setChecked('input[aria-label*="PR008 Não"]', dados.procedimento_normalidade.pr008_nao);
            this.setChecked('input[aria-label*="PR990 Sim"]', dados.procedimento_normalidade.pr990_sim);
            this.setChecked('input[aria-label*="PR990 Não"]', dados.procedimento_normalidade.pr990_nao);
            this.setChecked('input[aria-label*="PR007 Sim"]', dados.procedimento_normalidade.pr007_sim);
            this.setChecked('input[aria-label*="PR007 Não"]', dados.procedimento_normalidade.pr007_nao);
            this.setChecked('input[aria-label*="PR092 Sim"]', dados.procedimento_normalidade.pr092_sim);
            this.setChecked('input[aria-label*="PR092 Não"]', dados.procedimento_normalidade.pr092_nao);

            this.setTexto('.secao-justificativa .input-line', dados.procedimento_normalidade.justificativa);
        }

        // Preencher Acompanhamento usando o método específico
        if (dados.acompanhamento && dados.acompanhamento.length > 0) {
            this.preencherAcompanhamento(dados.acompanhamento);
        }

        // Preencher Resultados de Avaliação
        if (dados.resultados_avaliacao && dados.resultados_avaliacao.length > 0) {
            dados.resultados_avaliacao.forEach((resultado, i) => {
                const n = resultado.numero || (i + 1);

                this.setChecked(`input[aria-label*="Resultado Avaliação OK ${n}"]`, resultado.avaliacao_ok);
                this.setChecked(`input[aria-label*="Resultado ${n} 2D"]`, resultado.resultado_2d);
                this.setChecked(`input[aria-label*="Resultado ${n} CMM"]`, resultado.resultado_cmm);
                this.setChecked(`input[aria-label*="Resultado ${n} MACRO"]`, resultado.resultado_macro);
                this.setChecked(`input[aria-label*="Resultado ${n} OUTROS"]`, resultado.resultado_outros);

                // Preencher textos dos resultados
                const secaoResultado = document.querySelectorAll('.secao-resultado')[i];
                if (secaoResultado) {
                    const inputLines = secaoResultado.querySelectorAll('.input-line');
                    if (resultado.resultado_2d_texto && inputLines[0]) inputLines[0].textContent = resultado.resultado_2d_texto;
                    if (resultado.resultado_cmm_texto && inputLines[1]) inputLines[1].textContent = resultado.resultado_cmm_texto;
                    if (resultado.resultado_macro_texto && inputLines[2]) inputLines[2].textContent = resultado.resultado_macro_texto;
                    if (resultado.resultado_outros_texto && inputLines[3]) inputLines[3].textContent = resultado.resultado_outros_texto;
                    if (resultado.garantia_200 && inputLines[4]) inputLines[4].textContent = resultado.garantia_200;
                }
            });
        }

        // Preencher Justificativas
        if (dados.justificativas && dados.justificativas.length > 0) {
            dados.justificativas.forEach((just, i) => {
                const n = just.numero || (i + 1);

                this.setChecked(`input[aria-label*="Justificativa ${n} NOK"]`, just.nok);

                const secaoJustificativa = document.querySelectorAll('.secao-justificativa')[i];
                if (secaoJustificativa) {
                    const justTexto = secaoJustificativa.querySelector('.justificativa-linha .input-line');
                    if (justTexto && just.justificativa_texto) {
                        justTexto.textContent = just.justificativa_texto;
                    }

                    const obsTexto = secaoJustificativa.querySelector('.input-line[style*="min-height"]');
                    if (obsTexto && just.observacoes) {
                        obsTexto.textContent = just.observacoes;
                    }
                }
            });
        }

        console.log('✅ Formulário preenchido com os dados');
    }

    setTexto(selector, valor) {
        const element = document.querySelector(selector);
        if (element && valor) {
            element.textContent = valor;
        }
    }

    setTextoNth(selector, index, valor) {
        const elements = document.querySelectorAll(selector);
        if (elements[index] && valor) {
            elements[index].textContent = valor;
        }
    }

    setChecked(selector, valor) {
        const element = document.querySelector(selector);
        if (element) {
            element.checked = !!valor;
        }
    }

    // Limpar formulário
    limparFormulario() {
        if (confirm('Tem certeza que deseja limpar todos os dados do formulário?')) {
            document.querySelectorAll('input[type="text"], input[type="date"], textarea, [contenteditable="true"]').forEach(el => {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.value = '';
                } else {
                    el.textContent = '';
                }
            });

            document.querySelectorAll('input[type="checkbox"]').forEach(el => {
                el.checked = false;
            });

            this.numeroControleAtual = null;
            this.modoEdicao = false;
            this.gerarNumeroControle();
            this.mensagens.informacao('Formulário limpo com sucesso!');
        }
    }
    // Adicione este método à classe SistemaChecklist4M
    // Adicione este método à classe SistemaChecklist4M
    async finalizarChecklist() {
        const confirmacao = confirm(
            "Tem certeza que deseja FINALIZAR este checklist?\n\n" +
            "Após finalizar, NÃO será mais possível editar os dados.\n\n" +
            "Deseja continuar?"
        );
        if (!confirmacao) return;

        try {
            this.mensagens.informacao('Finalizando checklist...', 0);

            const dados = this.coletarDados();

            if (!dados.numero_controle) {
                this.mensagens.erro('✗ Número de controle inválido. Recarregue a página.');
                return;
            }

            dados.status = 'finalizado';
            dados.data_finalizacao = new Date().toISOString();
            dados.data_atualizacao = new Date().toISOString();
            dados.data_criacao = dados.data_criacao || dados.data_finalizacao;

            // 1. Verificar se já existe
            console.log('🔍 Verificando existência do checklist...');
            const checkResponse = await fetch(`${API_URL}/fr0062/${dados.numero_controle}`);
            const existe = checkResponse.ok;

            console.log(existe ? '✅ Existe → PUT' : '🆕 Não existe → POST');

            // 2. Criar ou atualizar conforme resultado
            const method = existe ? 'PUT' : 'POST';
            const url = existe
                ? `${API_URL}/fr0062/${dados.numero_controle}`
                : `${API_URL}/fr0062`;

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });

            const result = await response.json();

            if (result.success) {
                this.mensagens.sucesso('✓ Checklist finalizado com sucesso!');
                this.desabilitarEdicaoFormulario();

                const btnFinalizar = document.getElementById('btnFinalizarcheck');
                if (btnFinalizar) {
                    btnFinalizar.disabled = true;
                    btnFinalizar.textContent = 'CHECKLIST FINALIZADO';
                    btnFinalizar.style.cssText += '; background-color: #666; cursor: not-allowed;';
                }

                setTimeout(() => { window.location.href = '4m-checklist.html'; }, 3000);
            } else {
                this.mensagens.erro(`✗ Erro ao finalizar: ${result.message || 'Erro desconhecido'}`);
            }

        } catch (error) {
            console.error('❌ Erro ao finalizar checklist:', error);
            this.mensagens.erro('✗ Erro ao finalizar. Verifique a conexão com o servidor.');
        }
    }
    // Método auxiliar: tenta PUT, cria com POST se não existir (upsert manual)


    // Adicione este método para desabilitar a edição
    // Método para desabilitar edição (apenas funcional, sem alterações visuais)
    desabilitarEdicaoFormulario() {
        console.log('🔒 Desabilitando edição do formulário...');

        // Desabilitar todos os campos contenteditable (não removemos conteúdo, apenas editabilidade)
        document.querySelectorAll('[contenteditable="true"]').forEach(element => {
            element.setAttribute('contenteditable', 'false');
            // Adicionar atributo personalizado para identificar que era editável
            element.setAttribute('data-was-editable', 'true');
        });

        // Desabilitar todos os inputs e textareas
        document.querySelectorAll('input, textarea').forEach(element => {
            element.setAttribute('disabled', 'disabled');
            element.setAttribute('readonly', 'readonly');
            // Adicionar atributo personalizado para identificar estado original
            element.setAttribute('data-was-enabled', 'true');
        });

        // Desabilitar botões de ação específicos
        const botoesDesabilitar = ['btnSalvarCheck', 'btnLimparDados', 'btnFinalizarcheck'];
        botoesDesabilitar.forEach(id => {
            const botao = document.getElementById(id);
            if (botao) {
                botao.setAttribute('disabled', 'disabled');
                // Alterar texto do botão de finalizar se existir
                if (id === 'btnFinalizarcheck') {
                    botao.textContent = 'CHECKLIST FINALIZADO';
                }
            }
        });

        console.log('✅ Formulário desabilitado para edição (somente leitura)');
    }


    // Inicializar o sistema
    iniciar() {
        console.log('🚀 Sistema Checklist 4M iniciado');
    }
}

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', function () {
    console.log('📄 Página FR0062 carregada');

    // Criar instância global do sistema
    window.sistemaChecklist = new SistemaChecklist4M();

    // Verificar se está em modo de edição
    const urlParams = new URLSearchParams(window.location.search);
    const numeroControleEditar = urlParams.get('id');

    if (numeroControleEditar) {
        console.log('📝 Modo edição:', numeroControleEditar);
        window.sistemaChecklist.carregarFormulario(numeroControleEditar);
    } else {
        console.log('➕ Modo criação');
        window.sistemaChecklist.gerarNumeroControle();
    }

    // Configurar eventos dos botões
    const btnSalvarCheck = document.getElementById('btnSalvarCheck');
    const btnGerarPDF = document.getElementById('btnGerarPDF');
    const btnLimpar = document.getElementById('btnLimparDados');
    const btnCancelar = document.getElementById('btnCancelar');
    const btnFinalizarCheck = document.getElementById('btnFinalizarcheck');


    if (btnFinalizarCheck) {
        btnFinalizarCheck.addEventListener('click', function (e) {
            e.preventDefault();

            // Verificar se há um número de controle (checklist deve estar salvo primeiro)
            if (!window.sistemaChecklist.numeroControleAtual) {
                window.sistemaChecklist.mensagens.erro('Salve o checklist antes de finalizar!');
                return;
            }

            window.sistemaChecklist.finalizarChecklist();
        });
    }
    if (btnCancelar) {
        btnCancelar.addEventListener('click', function (e) {
            e.preventDefault();

            // Criar modal de confirmação
            const modalHTML = `
            <div id="modalCancelar" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 999999;
            ">
                <div style="
                    background: white;
                    padding: 30px;
                    border-radius: 8px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                    max-width: 400px;
                    width: 90%;
                ">
                    <h3 style="color: #d32f2f; margin-top: 0;">ATENÇÃO</h3>
                    <p>Os dados não salvos serão perdidos!</p>
                    <p>Deseja realmente voltar para a lista de checklists?</p>
                    <div style="
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                        margin-top: 20px;
                    ">
                        <button id="btnConfirmarVoltar" style="
                            padding: 8px 16px;
                            background: #df1b1b;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                        ">Cancelar</button>
                        <button id="btnCancelarModal" style="
                            padding: 8px 16px;
                            background: #3a5cb2;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                        ">Voltar para checklist</button>
                    </div>
                </div>
            </div>
        `;

            // Inserir modal no documento
            document.body.insertAdjacentHTML('beforeend', modalHTML);

            // Configurar eventos dos botões do modal
            document.getElementById('btnCancelarModal').addEventListener('click', function () {
                document.getElementById('modalCancelar').remove();
            });

            document.getElementById('btnConfirmarVoltar').addEventListener('click', function () {
                window.location.href = '/templates/4m-checklist.html';
            });
        });
    }
    if (btnSalvarCheck) {
        btnSalvarCheck.addEventListener('click', function (e) {
            e.preventDefault();

            window.sistemaChecklist.salvarFormulario();
            window.location.href = '/templates/4m-checklist.html';
        });
    }

    if (btnLimpar) {
        btnLimpar.addEventListener('click', function (e) {
            e.preventDefault();
            window.sistemaChecklist.limparFormulario();
        });
    }

    if (btnGerarPDF) {
        btnGerarPDF.addEventListener('click', function (e) {
            e.preventDefault();
            window.sistemaChecklist.mensagens.informacao('Funcionalidade de PDF em desenvolvimento...');
        });
    }

    // Inicializar sistema
    setTimeout(() => {
        window.sistemaChecklist.iniciar();
    }, 500);
});


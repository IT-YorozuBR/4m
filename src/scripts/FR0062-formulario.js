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
            status: 'em_andamento',
            data_criacao: new Date().toISOString()
        };
        
        // Campos extras do formulário
        dados.solicitado_por = document.querySelector('.bloco-controle .input-line')?.textContent.trim() || '';
        dados.aprovado_por = cabecalho.qualidade_aprovado || '';
        dados.confirmado_por = cabecalho.qualidade_confirmado || '';
        dados.elaborado_por = cabecalho.qualidade_executado_por || '';
        dados.executado_por = cabecalho.recebimento_qa || '';
        
        console.log('📦 Dados coletados:', dados);
        return dados;
    }

    coletarCabecalho() {
        return {
            visto_retencao_qa: this.getTexto('#vistoRetencaoQA'),
            setor_producao: this.getTexto('#setorProducao'),
            setor_logistica_pc: this.getTexto('#setorLogistica'),
            setor_engenharia: this.getTexto('#setorEngenharia'),
            qualidade_aprovado: this.getTexto('#qualidadeAprovado'),
            qualidade_confirmado: this.getTexto('#qualidadeConfirmado'),
            qualidade_executado_por: this.getTexto('#qualidadeExecutadoPor'),
            recebimento_qa: this.getTexto('#recebimentoQA'),
            mudanca_engenharia: this.isChecked('input[aria-label*="Engenharia Mudança 4M"]'),
            mudanca_controle_prod: this.isChecked('input[aria-label*="Controle Prod. Mudança 4M"]'),
            mudanca_producao: this.isChecked('input[aria-label*="Produção Mudança 4M"]'),
            analise_risco_processo: this.isChecked('input[aria-label*="Análise Risco Processo"]'),
            analise_risco_produto: this.isChecked('input[aria-label*="Análise Risco Produto"]'),
            analise_risco_nao_aplicavel: this.isChecked('input[aria-label*="Análise Risco Não Aplicável"]'),
            horario_aplicacao_4m: this.getTexto('.bloco-cabecalho-direita .input-line')
        };
    }

    coletarMudancas4M() {
        const tipos = ['MAN', 'MACHINE', 'MATERIAL', 'METHOD'];
        const mudancas = [];
        
        for (let i = 0; i < 4; i++) {
            const tipo = tipos[i];
            
            // Seletor para a coluna específica de cada M
            const colunaSelector = `.quadro-container-2 .coluna:nth-child(${i + 1})`;
            
            const mudanca = {
                tipo: tipo,
                // Campos básicos da primeira linha
                item_modificado: this.getTextoNth(`.quadro-container-1 .celula-4m`, i * 5),
                nome: this.getTextoNth(`.quadro-container-1 .celula-4m`, i * 5 + 1),
                motivo: this.getTextoNth(`.quadro-container-1 .celula-4m`, i * 5 + 2),
                projeto: this.getTextoNth(`.quadro-container-1 .celula-4m`, i * 5 + 3),
                numero_operacao: this.getTextoNth(`.quadro-container-1 .celula-4m`, i * 5 + 4),
                
                // Importância
                importancia_normal: this.isChecked(`input[aria-label*="${tipo} Importância Normal"]`),
                importancia_importante_as: this.isChecked(`input[aria-label*="${tipo} Importância Importante A/S"]`),
                
                // Data e turnos
                data_turno: this.getTextoNth(`.celula.data-turno .input-line`, i),
                turno_1t: this.isChecked(`input[aria-label*="${tipo} Turno 1T"]`),
                turno_2t: this.isChecked(`input[aria-label*="${tipo} Turno 2T"]`),
                turno_3t: this.isChecked(`input[aria-label*="${tipo} Turno 3T"]`),
                
                // Campos da coluna (quadro-container-2)
                modificacao: this.getTexto(`${colunaSelector} .secao:nth-child(1) .input-line`),
                registro: this.getTexto(`${colunaSelector} .secao:nth-child(2) .input-line`),
                
                // Garantia 200%
                garantia_200_sim: this.isChecked(`input[aria-label*="${tipo} Garantia 200% Sim"]`),
                garantia_200_nao: this.isChecked(`input[aria-label*="${tipo} Garantia 200% Não"]`),
                garantia_200_valor: this.getTexto(`${colunaSelector} .secao-garantia .input-line`),
                
                // Lote de produção garantido
                lote_prod_garantido: this.getTexto(`${colunaSelector} .secao:has(.label-bold:contains("LOTE DE PROD. GARANTIDO")) .input-line`),
                
                // Sakanobori
                sakanobori_nao: this.isChecked(`input[aria-label*="${tipo} Sakanobori Não"]`),
                sakanobori_sim: this.isChecked(`input[aria-label*="${tipo} Sakanobori Sim"]`),
                sakanobori_qtd: this.getTexto(`${colunaSelector} .secao-sakanobori .input-line`),
                
                // QTD YAB e NBA
                qtd_yab: this.getTextoNth(`${colunaSelector} .secao:has(.label-bold:contains("QTD YAB")) .input-line`, 0),
                qtd_nba: this.getTextoNth(`${colunaSelector} .secao:has(.label-bold:contains("QTD NBA")) .input-line`, 0),
                
                // Acompanhamento QA
                acompanhamento_qa: this.getTexto(`${colunaSelector} .secao:has(.label-bold:contains("ACOMPANHAMENTO Q.A.")) .input-line`),
                
                // Meios de avaliação
                avaliacao_2d: this.isChecked(`input[aria-label*="${tipo} Avaliação 2D"]`),
                avaliacao_cmm: this.isChecked(`input[aria-label*="${tipo} Avaliação CMM"]`),
                avaliacao_macro: this.isChecked(`input[aria-label*="${tipo} Avaliação MACRO"]`),
                avaliacao_outros: this.isChecked(`input[aria-label*="${tipo} Avaliação Outros"]`),
                avaliacao_outros_texto: this.getTexto(`${colunaSelector} .secao-meios .input-line`)
            };
            
            // Campos específicos do METHOD
            if (tipo === 'METHOD') {
                mudanca.lote_prod_garantido_nao = this.isChecked(`input[aria-label*="METHOD Lote Prod. Garantido Não"]`);
                mudanca.seguranca = this.getTexto(`${colunaSelector} .secao:has(.label-bold:contains("SEGURANÇA")) .input-line`);
                mudanca.produtividade_yield_time = this.getTexto(`${colunaSelector} .secao:has(.text-red:contains("Yield time")) .input-line`);
            }
            
            mudancas.push(mudanca);
        }
        
        return mudancas;
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
        
        rows.forEach(row => {
            const nomeNorma = row.querySelector('td:first-child')?.textContent.trim();
            const responsavel = row.querySelector('td:nth-child(2)')?.textContent.trim();
            const necessario = row.querySelector('td:nth-child(3) input')?.checked || false;
            const confirmado = row.querySelector('td:nth-child(4) input')?.checked || false;
            
            if (nomeNorma) {
                acompanhamento.push({
                    nome_norma: nomeNorma,
                    responsavel: responsavel,
                    necessario_inov: necessario,
                    confirmado: confirmado
                });
            }
        });
        
        return acompanhamento;
    }
    
    coletarResultadosAvaliacao() {
        const resultados = [];
        
        for (let i = 1; i <= 3; i++) {
            const resultado = {
                numero: i,
                avaliacao_ok: this.isChecked(`input[aria-label*="Resultado Avaliação OK ${i}"]`),
                resultado_2d: this.isChecked(`input[aria-label*="Resultado ${i} 2D"]`),
                resultado_2d_texto: this.getTextoNth(`.secao-resultado:nth-child(${i}) .input-item:has(input[aria-label*="Resultado ${i} 2D"]) .input-line`, 0),
                resultado_cmm: this.isChecked(`input[aria-label*="Resultado ${i} CMM"]`),
                resultado_cmm_texto: this.getTextoNth(`.secao-resultado:nth-child(${i}) .input-item:has(input[aria-label*="Resultado ${i} CMM"]) .input-line`, 0),
                resultado_macro: this.isChecked(`input[aria-label*="Resultado ${i} MACRO"]`),
                resultado_macro_texto: this.getTextoNth(`.secao-resultado:nth-child(${i}) .input-item:has(input[aria-label*="Resultado ${i} MACRO"]) .input-line`, 0),
                resultado_outros: this.isChecked(`input[aria-label*="Resultado ${i} OUTROS"]`),
                resultado_outros_texto: this.getTextoNth(`.secao-resultado:nth-child(${i}) .input-item:has(input[aria-label*="Resultado ${i} OUTROS"]) .input-line`, 0),
                garantia_200: this.getTextoNth(`.secao-resultado:nth-child(${i}) .input-line`, 4) // último input-line da seção
            };
            
            resultados.push(resultado);
        }
        
        return resultados;
    }
    
    coletarJustificativas() {
        const justificativas = [];
        
        for (let i = 1; i <= 3; i++) {
            const justificativa = {
                numero: i,
                nok: this.isChecked(`input[aria-label*="Justificativa ${i} NOK"]`),
                justificativa_texto: this.getTextoNth(`.secao-justificativa:nth-child(${i}) .justificativa-linha .input-line`, 0),
                observacoes: this.getTextoNth(`.secao-justificativa:nth-child(${i}) .input-line[style*="min-height"]`, 0)
            };
            
            justificativas.push(justificativa);
        }
        
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
            this.mensagens.informacao('Carregando formulário...', 0);
            
            const response = await fetch(`${API_URL}/fr0062/${numeroControle}`);
            const result = await response.json();
            
            if (result.success && result.formulario) {
                this.preencherFormulario(result.formulario);
                this.numeroControleAtual = numeroControle;
                this.modoEdicao = true;
                this.mensagens.sucesso('✓ Formulário carregado com sucesso!');
                console.log('✅ Dados carregados:', result.formulario);
                return result.formulario;
            } else {
                this.mensagens.erro('✗ Formulário não encontrado');
                return null;
            }
            
        } catch (error) {
            console.error('❌ Erro ao carregar formulário:', error);
            this.mensagens.erro('✗ Erro ao carregar formulário');
            return null;
        }
    }

    // Preencher formulário com dados
    preencherFormulario(dados) {
        // Preencher cabeçalho
        if (dados.cabecalho) {
            this.setTexto('#vistoRetencaoQA', dados.cabecalho.visto_retencao_qa);
            this.setTexto('#setorProducao', dados.cabecalho.setor_producao);
            this.setTexto('#setorLogistica', dados.cabecalho.setor_logistica_pc);
            this.setTexto('#setorEngenharia', dados.cabecalho.setor_engenharia);
            this.setTexto('#qualidadeAprovado', dados.cabecalho.qualidade_aprovado);
            this.setTexto('#qualidadeConfirmado', dados.cabecalho.qualidade_confirmado);
            this.setTexto('#qualidadeExecutadoPor', dados.cabecalho.qualidade_executado_por);
            this.setTexto('#recebimentoQA', dados.cabecalho.recebimento_qa);
            
            // Checkboxes do cabeçalho
            this.setChecked('input[aria-label*="Engenharia Mudança 4M"]', dados.cabecalho.mudanca_engenharia);
            this.setChecked('input[aria-label*="Controle Prod. Mudança 4M"]', dados.cabecalho.mudanca_controle_prod);
            this.setChecked('input[aria-label*="Produção Mudança 4M"]', dados.cabecalho.mudanca_producao);
            this.setChecked('input[aria-label*="Análise Risco Processo"]', dados.cabecalho.analise_risco_processo);
            this.setChecked('input[aria-label*="Análise Risco Produto"]', dados.cabecalho.analise_risco_produto);
            this.setChecked('input[aria-label*="Análise Risco Não Aplicável"]', dados.cabecalho.analise_risco_nao_aplicavel);
            
            this.setTexto('.bloco-cabecalho-direita .input-line', dados.cabecalho.horario_aplicacao_4m);
        }
        
        // Preencher Mudanças 4M
        if (dados.mudancas_4m && dados.mudancas_4m.length > 0) {
            dados.mudancas_4m.forEach((mudanca, i) => {
                // Campos básicos da primeira linha
                this.setTextoNth('.quadro-container-1 .celula-4m .input-line', i * 5, mudanca.item_modificado);
                this.setTextoNth('.quadro-container-1 .celula-4m .input-line', i * 5 + 1, mudanca.nome);
                this.setTextoNth('.quadro-container-1 .celula-4m .input-line', i * 5 + 2, mudanca.motivo);
                this.setTextoNth('.quadro-container-1 .celula-4m .input-line', i * 5 + 3, mudanca.projeto);
                this.setTextoNth('.quadro-container-1 .celula-4m .input-line', i * 5 + 4, mudanca.numero_operacao);
                
                // Importância
                this.setChecked(`input[aria-label*="${mudanca.tipo} Importância Normal"]`, mudanca.importancia_normal);
                this.setChecked(`input[aria-label*="${mudanca.tipo} Importância Importante A/S"]`, mudanca.importancia_importante_as);
                
                // Data e turnos
                this.setTextoNth('.celula.data-turno .input-line', i, mudanca.data_turno);
                this.setChecked(`input[aria-label*="${mudanca.tipo} Turno 1T"]`, mudanca.turno_1t);
                this.setChecked(`input[aria-label*="${mudanca.tipo} Turno 2T"]`, mudanca.turno_2t);
                this.setChecked(`input[aria-label*="${mudanca.tipo} Turno 3T"]`, mudanca.turno_3t);
                
                // Seletor da coluna
                const colunaSelector = `.quadro-container-2 .coluna:nth-child(${i + 1})`;
                
                // Modificação e Registro
                if (mudanca.modificacao) {
                    this.setTexto(`${colunaSelector} .secao:nth-child(1) .input-line`, mudanca.modificacao);
                }
                if (mudanca.registro) {
                    this.setTexto(`${colunaSelector} .secao:nth-child(2) .input-line`, mudanca.registro);
                }
                
                // Garantia 200%
                this.setChecked(`input[aria-label*="${mudanca.tipo} Garantia 200% Sim"]`, mudanca.garantia_200_sim);
                this.setChecked(`input[aria-label*="${mudanca.tipo} Garantia 200% Não"]`, mudanca.garantia_200_nao);
                if (mudanca.garantia_200_valor) {
                    this.setTexto(`${colunaSelector} .secao-garantia .input-line`, mudanca.garantia_200_valor);
                }
                
                // Lote de produção
                if (mudanca.lote_prod_garantido) {
                    const loteSec = document.querySelector(`${colunaSelector} .secao .label-bold`);
                    if (loteSec && loteSec.textContent.includes('LOTE DE PROD. GARANTIDO')) {
                        const inputLine = loteSec.parentElement.querySelector('.input-line');
                        if (inputLine) inputLine.textContent = mudanca.lote_prod_garantido;
                    }
                }
                
                // Sakanobori
                this.setChecked(`input[aria-label*="${mudanca.tipo} Sakanobori Não"]`, mudanca.sakanobori_nao);
                this.setChecked(`input[aria-label*="${mudanca.tipo} Sakanobori Sim"]`, mudanca.sakanobori_sim);
                if (mudanca.sakanobori_qtd) {
                    const sakSec = document.querySelector(`${colunaSelector} .secao-sakanobori .input-line`);
                    if (sakSec) sakSec.textContent = mudanca.sakanobori_qtd;
                }
                
                // QTD YAB e NBA
                if (mudanca.qtd_yab || mudanca.qtd_nba) {
                    const qtdSecoes = document.querySelectorAll(`${colunaSelector} .secao .input-line`);
                    qtdSecoes.forEach(el => {
                        const label = el.previousElementSibling;
                        if (label && label.textContent.includes('QTD YAB') && mudanca.qtd_yab) {
                            el.textContent = mudanca.qtd_yab;
                        }
                        if (label && label.textContent.includes('QTD NBA') && mudanca.qtd_nba) {
                            el.textContent = mudanca.qtd_nba;
                        }
                    });
                }
                
                // Acompanhamento QA
                if (mudanca.acompanhamento_qa) {
                    const qaSecao = document.querySelector(`${colunaSelector} .secao .label-bold`);
                    if (qaSecao && qaSecao.textContent.includes('ACOMPANHAMENTO Q.A.')) {
                        const inputLine = qaSecao.parentElement.querySelector('.input-line');
                        if (inputLine) inputLine.textContent = mudanca.acompanhamento_qa;
                    }
                }
                
                // Meios de avaliação
                this.setChecked(`input[aria-label*="${mudanca.tipo} Avaliação 2D"]`, mudanca.avaliacao_2d);
                this.setChecked(`input[aria-label*="${mudanca.tipo} Avaliação CMM"]`, mudanca.avaliacao_cmm);
                this.setChecked(`input[aria-label*="${mudanca.tipo} Avaliação MACRO"]`, mudanca.avaliacao_macro);
                this.setChecked(`input[aria-label*="${mudanca.tipo} Avaliação Outros"]`, mudanca.avaliacao_outros);
                if (mudanca.avaliacao_outros_texto) {
                    this.setTexto(`${colunaSelector} .secao-meios .input-line`, mudanca.avaliacao_outros_texto);
                }
                
                // Campos específicos do METHOD
                if (mudanca.tipo === 'METHOD') {
                    if (mudanca.lote_prod_garantido_nao !== undefined) {
                        this.setChecked(`input[aria-label*="METHOD Lote Prod. Garantido Não"]`, mudanca.lote_prod_garantido_nao);
                    }
                    if (mudanca.seguranca) {
                        const segSec = document.querySelector(`${colunaSelector} .secao .label-bold[style*="color: #00B0F0"]`);
                        if (segSec) {
                            const inputLine = segSec.parentElement.querySelector('.input-line');
                            if (inputLine) inputLine.textContent = mudanca.seguranca;
                        }
                    }
                    if (mudanca.produtividade_yield_time) {
                        const prodSec = document.querySelector(`${colunaSelector} .text-red`);
                        if (prodSec && prodSec.textContent.includes('Yield time')) {
                            const inputLine = prodSec.parentElement.querySelector('.input-line');
                            if (inputLine) inputLine.textContent = mudanca.produtividade_yield_time;
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

    // Inicializar o sistema
    iniciar() {
        console.log('🚀 Sistema Checklist 4M iniciado');
    }
}

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', function() {
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
    
    if (btnSalvarCheck) {
        btnSalvarCheck.addEventListener('click', function(e) {
            e.preventDefault();
            window.sistemaChecklist.salvarFormulario();
        });
    }
    
    if (btnLimpar) {
        btnLimpar.addEventListener('click', function(e) {
            e.preventDefault();
            window.sistemaChecklist.limparFormulario();
        });
    }
    
    if (btnGerarPDF) {
        btnGerarPDF.addEventListener('click', function(e) {
            e.preventDefault();
            window.sistemaChecklist.mensagens.informacao('Funcionalidade de PDF em desenvolvimento...');
        });
    }
    
    // Inicializar sistema
    setTimeout(() => {
        window.sistemaChecklist.iniciar();
    }, 500);
});

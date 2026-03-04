// ========== SISTEMA DE VALIDAÇÃO DE COLUNAS ==========

document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Iniciando Sistema de Validação de Colunas...');

    setTimeout(() => {
        const validador = new ValidadorColunas();
        validador.inicializar();
    }, 1000);
});

class ValidadorColunas {
    constructor() {
        this.colunaAtiva = null;
        this.nomesColunas = {
            0: 'MAN (OPERADOR)',
            1: 'MACHINE (OPERAÇÃO)',
            2: 'MATERIAL (PEÇA)',
            3: 'METHOD (MÉTODO)'
        };
        // Mapa para armazenar valores iniciais de cada campo
        this.valoresIniciais = new WeakMap();
    }

    inicializar() {
        console.log('📋 Procurando por todas as colunas (topo + meio)...');

        const quadro1 = document.querySelector('.quadro-container-1');
        const quadro2 = document.querySelector('.quadro-container-2');

        if (!quadro1 && !quadro2) {
            console.error('❌ Nenhum quadro encontrado!');
            return;
        }

        // Armazenar valores iniciais de todos os campos editáveis
        this.armazenarValoresIniciais();

        // Adicionar listeners para COLUNAS DO MEIO (quadro-container-2)
        if (quadro2) {
            const colunas = quadro2.querySelectorAll('.coluna');
            console.log(`✅ ${colunas.length} colunas encontradas em quadro-container-2`);

            colunas.forEach((coluna, indice) => {
                this.adicionarListenersColuna(coluna, indice);
            });
        }

        // Adicionar listeners para COLUNAS DO TOPO (quadro-container-1)
        if (quadro1) {
            const tipos = ['man', 'machine', 'material', 'method'];

            tipos.forEach((tipo, indice) => {
                const campos = quadro1.querySelectorAll(`[data-categoria="${tipo.toUpperCase()}"]`);
                console.log(`✅ ${campos.length} campos encontrados para ${tipo.toUpperCase()} em quadro-container-1`);

                if (campos.length > 0) {
                    this.adicionarListenersColunaTopo(campos, indice);
                }
            });
        }

        // Interceptar botão "Limpar Dados"
        this.interceptarBotaoLimpar();

        console.log('✅ Sistema de Validação Pronto!');
    }

    armazenarValoresIniciais() {
        // Seleciona todos os campos editáveis: contenteditable, inputs, textareas, checkboxes
        const campos = document.querySelectorAll(
            '[contenteditable="true"], input[type="text"], input[type="checkbox"], textarea'
        );

        campos.forEach(campo => {
            let valorInicial;
            if (campo.type === 'checkbox') {
                valorInicial = campo.checked;
            } else if (campo.contentEditable === 'true') {
                valorInicial = campo.textContent || '';
            } else {
                valorInicial = campo.value || '';
            }
            this.valoresIniciais.set(campo, valorInicial);
        });
        console.log(`💾 Valores iniciais armazenados para ${campos.length} campos.`);
    }

    // ==================== LISTENERS ====================

    adicionarListenersColuna(coluna, indice) {
        const campos = coluna.querySelectorAll(
            '[contenteditable="true"], input[type="text"], input[type="checkbox"], textarea'
        );

        campos.forEach(campo => {
            // Evento principal: input, change, keyup para capturar deleções
            campo.addEventListener('input', () => {
                console.log(`📝 Campo alterado na coluna ${indice}`);
                this.aoInteragirCampo(indice, campo);
            });

            if (campo.type === 'checkbox') {
                campo.addEventListener('change', () => {
                    console.log(`☑️ Checkbox alterado na coluna ${indice}`);
                    this.aoInteragirCampo(indice, campo);
                });
            }

            // Para contenteditable: detectar deleções também
            if (campo.contentEditable === 'true') {
                campo.addEventListener('keyup', () => {
                    console.log(`⌨️ Tecla solida na coluna ${indice}`);
                    this.aoInteragirCampo(indice, campo);
                });
            }

            campo.addEventListener('blur', () => {
                console.log(`👁️ Saiu do campo na coluna ${indice}`);
                this.aoSairCampo(indice);
            });
        });
    }

    adicionarListenersColunaTopo(campos, indice) {
        campos.forEach(campo => {
            campo.addEventListener('input', () => {
                console.log(`📝 Campo TOPO alterado na coluna ${indice}`);
                this.aoInteragirCampo(indice, campo);
            });

            if (campo.type === 'checkbox') {
                campo.addEventListener('change', () => {
                    console.log(`☑️ Checkbox TOPO alterado na coluna ${indice}`);
                    this.aoInteragirCampo(indice, campo);
                });
            }

            // Para contenteditable: detectar deleções também
            if (campo.contentEditable === 'true') {
                campo.addEventListener('keyup', () => {
                    console.log(`⌨️ Tecla solida TOPO na coluna ${indice}`);
                    this.aoInteragirCampo(indice, campo);
                });
            }

            campo.addEventListener('blur', () => {
                console.log(`👁️ Saiu do campo TOPO na coluna ${indice}`);
                this.aoSairCampo(indice);
            });
        });
    }

    // ==================== LÓGICA PRINCIPAL ====================

    aoInteragirCampo(indice, campo) {
        // Se não há coluna ativa e este campo tem valor (diferente do inicial), ativar esta coluna
        if (!this.colunaAtiva && this.campoTemValor(campo)) {
            this.ativarColuna(indice);
        }

        // Sempre verificar se a coluna atual (se houver) ficou vazia após a interação
        if (this.colunaAtiva !== null) {
            this.verificarESoltarSeVazio(this.colunaAtiva);
        }
    }

    aoSairCampo(indice) {
        if (this.colunaAtiva === indice) {
            this.verificarESoltarSeVazio(indice);
        }
    }

    verificarESoltarSeVazio(indice) {
        console.log(`🔍 Verificando se coluna ${indice} está vazia...`);

        if (!this.colunaTemDados(indice)) {
            console.log(`✅ Coluna ${indice} está vazia! Desbloqueando...`);
            this.desbloquearTodas();
        } else {
            console.log(`❌ Coluna ${indice} ainda tem dados. Mantendo bloqueio.`);
        }
    }

    colunaTemDados(indice) {
        const quadro1 = document.querySelector('.quadro-container-1');
        const quadro2 = document.querySelector('.quadro-container-2');
        const tipos = ['man', 'machine', 'material', 'method'];

        // 1. Verificar campos do TOPO (data-categoria)
        if (quadro1) {
            const tipo = tipos[indice].toUpperCase();
            const camposTopo = quadro1.querySelectorAll(`[data-categoria="${tipo}"]`);
            for (let campo of camposTopo) {
                if (this.campoTemValor(campo)) {
                    console.log(`   ✅ Campo TOPO tem valor: "${this.obterValorCampo(campo)}"`);
                    return true;
                }
            }
        }

        // 2. Verificar campos do MEIO (dentro da coluna)
        if (quadro2) {
            const colunas = quadro2.querySelectorAll('.coluna');
            const coluna = colunas[indice];
            if (coluna) {
                const camposMeio = coluna.querySelectorAll(
                    '[contenteditable="true"], input[type="text"], input[type="checkbox"], textarea'
                );
                for (let campo of camposMeio) {
                    if (this.campoTemValor(campo)) {
                        console.log(`   ✅ Campo MEIO tem valor: "${this.obterValorCampo(campo)}"`);
                        return true;
                    }
                }
            }
        }

        console.log(`   ❌ Nenhum campo com valor encontrado`);
        return false;
    }

    campoTemValor(campo) {
        // Para checkbox, verifica se está marcado
        if (campo.type === 'checkbox') {
            return campo.checked;
        }

        // Obtém o valor atual
        let valorAtual;
        if (campo.contentEditable === 'true') {
            valorAtual = campo.textContent || '';
        } else {
            valorAtual = campo.value || '';
        }
        valorAtual = valorAtual.trim();

        // Obtém o valor inicial armazenado
        const valorInicial = this.valoresIniciais.get(campo);
        let valorInicialStr = '';
        if (typeof valorInicial === 'string') {
            valorInicialStr = valorInicial.trim();
        } else if (typeof valorInicial === 'boolean') {
            // Não se aplica a checkbox aqui, pois já tratamos acima
            return false;
        }

        // Se o valor atual for diferente do inicial, considera preenchido
        return valorAtual !== valorInicialStr;
    }

    obterValorCampo(campo) {
        if (campo.type === 'checkbox') {
            return campo.checked ? 'marcado' : 'desmarcado';
        }
        return campo.textContent?.trim() || campo.value?.trim() || '';
    }

    ativarColuna(indiceAtivo) {
        // Evita reativar a mesma coluna
        if (this.colunaAtiva === indiceAtivo) return;

        this.colunaAtiva = indiceAtivo;

        const quadro1 = document.querySelector('.quadro-container-1');
        const quadro2 = document.querySelector('.quadro-container-2');

        console.log(`\n🔒 ATIVANDO COLUNA ${indiceAtivo + 1} E BLOQUEANDO OUTRAS...`);

        // Processar colunas do TOPO
        if (quadro1) {
            const tipos = ['man', 'machine', 'material', 'method'];

            tipos.forEach((tipo, indice) => {
                const campos = quadro1.querySelectorAll(`[data-categoria="${tipo.toUpperCase()}"]`);

                if (indice === indiceAtivo) {
                    // ✅ LIBERAR
                    campos.forEach(campo => {
                        campo.style.border = '2px solid #00aa00';
                        campo.style.backgroundColor = '';
                        campo.style.cursor = 'auto';
                        campo.style.opacity = '1';
                        if (campo.contentEditable === 'false') {
                            campo.contentEditable = 'true';
                        }
                        campo.removeAttribute('disabled');
                        campo.removeAttribute('readonly');
                    });
                } else {
                    // ❌ BLOQUEAR
                    campos.forEach(campo => {
                        campo.style.border = '3px solid #ff0000';
                        campo.style.backgroundColor = 'rgba(255, 0, 0, 0.15)';
                        campo.style.cursor = 'not-allowed';
                        campo.style.opacity = '0.6';
                        if (campo.contentEditable === 'true') {
                            campo.contentEditable = 'false';
                        }
                        campo.setAttribute('disabled', 'disabled');
                        campo.setAttribute('readonly', 'readonly');
                    });
                }
            });
        }

        // Processar colunas do MEIO
        if (quadro2) {
            const todasColunas = quadro2.querySelectorAll('.coluna');

            todasColunas.forEach((coluna, indice) => {
                if (indice === indiceAtivo) {
                    // ✅ LIBERAR
                    coluna.style.opacity = '1';
                    coluna.style.border = '3px solid #00aa00';
                    coluna.style.backgroundColor = 'rgba(0, 170, 0, 0.05)';
                    coluna.style.boxShadow = '0 0 10px rgba(0, 170, 0, 0.2)';

                    const campos = coluna.querySelectorAll('[contenteditable], input, textarea');
                    campos.forEach(campo => {
                        campo.style.border = '2px solid #00aa00';
                        campo.style.cursor = 'auto';
                        if (campo.contentEditable === 'false') {
                            campo.contentEditable = 'true';
                        }
                        campo.removeAttribute('disabled');
                        campo.removeAttribute('readonly');
                        campo.style.backgroundColor = '';
                        campo.style.opacity = '1';
                    });
                } else {
                    // ❌ BLOQUEAR
                    coluna.style.opacity = '0.5';
                    coluna.style.border = '3px solid #ff0000';
                    coluna.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
                    coluna.style.boxShadow = '0 0 15px rgba(255, 0, 0, 0.4)';
                    coluna.style.pointerEvents = 'none';

                    const campos = coluna.querySelectorAll('[contenteditable], input, textarea');
                    campos.forEach(campo => {
                        campo.style.border = '3px solid #ff0000';
                        campo.style.backgroundColor = 'rgba(255, 0, 0, 0.15)';
                        campo.style.cursor = 'not-allowed';
                        campo.style.opacity = '0.6';
                        if (campo.contentEditable === 'true') {
                            campo.contentEditable = 'false';
                        }
                        campo.setAttribute('disabled', 'disabled');
                        campo.setAttribute('readonly', 'readonly');
                    });
                }
            });
        }

        // Mostrar mensagem apenas uma vez
        this.mostrarMensagem(
            `✅ Coluna ${this.nomesColunas[indiceAtivo]} selecionada!\n` +
            `❌ Outras colunas estão bloqueadas (vermelhas).\n` +
            `Limpe os dados para desbloquear.`,
            'sucesso'
        );
    }

    desbloquearTodas() {
        // Se já está desbloqueado, não faz nada
        if (this.colunaAtiva === null) return;

        console.log('\n🔓 DESBLOQUEANDO TODAS AS COLUNAS...');

        const quadro1 = document.querySelector('.quadro-container-1');
        const quadro2 = document.querySelector('.quadro-container-2');

        // Desbloquear topo
        if (quadro1) {
            const tipos = ['man', 'machine', 'material', 'method'];

            tipos.forEach(() => {
                const campos = quadro1.querySelectorAll('[data-categoria]');
                campos.forEach(campo => {
                    campo.style.border = '';
                    campo.style.backgroundColor = '';
                    campo.style.cursor = 'auto';
                    campo.style.opacity = '1';
                    if (campo.contentEditable === 'false') {
                        campo.contentEditable = 'true';
                    }
                    campo.removeAttribute('disabled');
                    campo.removeAttribute('readonly');
                });
            });
        }

        // Desbloquear meio
        if (quadro2) {
            const todasColunas = quadro2.querySelectorAll('.coluna');
            todasColunas.forEach(coluna => {
                coluna.style.opacity = '1';
                coluna.style.border = '';
                coluna.style.backgroundColor = '';
                coluna.style.boxShadow = '';
                coluna.style.pointerEvents = 'auto';

                const campos = coluna.querySelectorAll('[contenteditable], input, textarea');
                campos.forEach(campo => {
                    campo.style.border = '';
                    campo.style.backgroundColor = '';
                    campo.style.cursor = 'auto';
                    campo.style.opacity = '1';
                    if (campo.contentEditable === 'false') {
                        campo.contentEditable = 'true';
                    }
                    campo.removeAttribute('disabled');
                    campo.removeAttribute('readonly');
                });
            });
        }

        this.colunaAtiva = null;
        this.mostrarMensagem(
            '🧹 Bloqueio removido!\n✅ Você pode preencher qualquer coluna agora.',
            'info'
        );
    }

    // ==================== MENSAGENS ====================

    mostrarMensagem(texto, tipo = 'erro') {
        // Remover mensagens anteriores
        const msg = document.getElementById('msg-validacao-colunas');
        if (msg) {
            msg.remove();
        }

        const div = document.createElement('div');
        div.id = 'msg-validacao-colunas';
        div.innerHTML = texto.replace(/\n/g, '<br>');

        div.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            padding: 20px 30px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            text-align: center;
            animation: slideDown 0.3s ease;
        `;

        if (tipo === 'sucesso') {
            div.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
            div.style.borderLeft = '5px solid #2E7D32';
        } else if (tipo === 'info') {
            div.style.background = 'linear-gradient(135deg, #2196F3, #1976D2)';
            div.style.borderLeft = '5px solid #0D47A1';
        } else {
            div.style.background = 'linear-gradient(135deg, #f44336, #d32f2f)';
            div.style.borderLeft = '5px solid #b71c1c';
        }

        document.body.appendChild(div);

        setTimeout(() => {
            div.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => div.remove(), 300);
        }, 6000);
    }

    // ==================== BOTÃO LIMPAR ====================

    interceptarBotaoLimpar() {
        const btnLimpar = document.getElementById('btnLimparDados');
        if (btnLimpar) {
            btnLimpar.addEventListener('click', () => {
                console.log('\n🧹 Botão LIMPAR DADOS clicado');
                setTimeout(() => {
                    this.desbloquearTodas();
                }, 500);
            });
            console.log('✅ Botão "Limpar Dados" interceptado');
        }
    }
}

// Adicionar animação CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            transform: translateX(-50%) translateY(-30px);
            opacity: 0;
        }
        to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
    }

    @keyframes slideUp {
        from {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        to {
            transform: translateX(-50%) translateY(-30px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
/**
 * FR0062 — GERENCIADOR DE ETAPAS  v3
 * ─────────────────────────────────────────────────────────────────
 *
 *  ETAPA 1 — PRODUÇÃO  (em_andamento)
 *    Editável : quadro-container-1 + quadro-container-2
 *    Bloqueado: cabeçalho, container-3, container-4, sidebar
 *
 *  ETAPA 2 — QUALIDADE  (aguardando_qualidade)
 *    Editável : quadro-container-3 colunas cujas categorias 4M foram preenchidas
 *               pela produção (MAN → col-1, MACHINE → col-2, MATERIAL → col-3, METHOD → col-4)
 *               sidebar-acompanhamento
 *    Leitura  : container-1, container-2
 *    Bloqueado: cabeçalho, container-4
 *
 *  ETAPA 3 — APROVAÇÃO  (aguardando_aprovacao — só admin JWT)
 *    Editável : TUDO  (foco no cabeçalho + container-4)
 *
 *  CONCLUÍDO  (concluido / finalizado)
 *    Somente leitura. Todos os botões ocultos. Badge permanente.
 * ─────────────────────────────────────────────────────────────────
 */

// ─── Mapeamento: coluna do container-3 → categoria 4M ────────────
// col-1 = lista-verificacao + tratativa  → MAN   (operador)
// col-2 = resultado-1 + justificativa-1  → MACHINE
// col-3 = resultado-2 + justificativa-2  → MATERIAL
// col-4 = resultado-3 + justificativa-3  → METHOD
// Só desbloqueia a coluna se a categoria correspondente foi preenchida na produção.
const COL3_PARA_CATEGORIA = { 1: 'MAN', 2: 'MACHINE', 3: 'MATERIAL', 4: 'METHOD' };
// ─────────────────────────────────────────────────────────────────

class GerenciadorEtapas {

    constructor() {
        this.statusAtual = 'em_andamento';
        this.isAdmin = false;
        this.usuarioAtual = null;
    }

    /* ════════════════════════════════════════════════════════════
       INICIALIZAÇÃO
    ════════════════════════════════════════════════════════════ */

    inicializar() {
        this._verificarAuth();
        this._injetarCSS();
        this._criarBarraProgresso();
        this._criarBotoes();
        this._ocultarAntigos();

        const id = new URLSearchParams(window.location.search).get('id');

        if (!id) {
            this._aplicar('em_andamento');
        } else {
            // Hook: aplica bloqueios APÓS preencherFormulario() popular os dados
            const self = this;
            if (window.sistemaChecklist) {
                const orig = window.sistemaChecklist.preencherFormulario
                    .bind(window.sistemaChecklist);
                window.sistemaChecklist.preencherFormulario = function (dados) {
                    orig(dados);
                    self._aplicar(dados.status || 'em_andamento');
                };
            }
        }
    }

    /* ════════════════════════════════════════════════════════════
       AUTH
    ════════════════════════════════════════════════════════════ */

    _verificarAuth() {
        const token = localStorage.getItem('authToken');
        if (!token || token === 'null' || token === 'undefined') return;
        try {
            const p = JSON.parse(atob(token.split('.')[1]));
            if (p.role === 'admin' && p.exp > Date.now() / 1000) {
                this.isAdmin = true;
                this.usuarioAtual = p.username;
            }
        } catch (_) { /* token inválido */ }
    }

    /* ════════════════════════════════════════════════════════════
       DESPACHADOR
    ════════════════════════════════════════════════════════════ */

    _aplicar(status) {
        this.statusAtual = status;
        this._atualizarBarra();

        switch (status) {
            case 'em_andamento':
                this._etapa1();
                break;
            case 'aguardando_qualidade':
                this._etapa2();
                break;
            case 'aguardando_aprovacao':
                this.isAdmin ? this._etapa3() : (this._bloquearTudo(), this._badge('⏳ AGUARDANDO APROVAÇÃO', '#E65100'));
                break;

            case 'concluido':
                if (!this.isAdmin) {
                    this._bloquearTudo();
                }

            case 'finalizado':
                if (!this.isAdmin) {
                    this._bloquearTudo();
                }
                this._show('btnSalvarEtapa');
                this._badge('✔ CONCLUÍDO', '#2E7D32');
                break;
            default:
                this._etapa1();
        }
    }

    /* ════════════════════════════════════════════════════════════
       ETAPA 1 — PRODUÇÃO
    ════════════════════════════════════════════════════════════ */

    _etapa1() {
        this._lockAll();
        this._unlock('.quadro-container-1');
        this._unlock('.quadro-container-2');
        this._limparBanners();

        this._show('btnSalvarEtapa');
        this._show('btnAvancarEtapa');
        this._hide('btnVoltarSalvar');
        this._hide('btnAprovarFinalizar');
        this._atualTexto('btnAvancarEtapa', '📋 AVANÇAR');
        this._atualClasse('btnAvancarEtapa', 'btn-avancar btn-avancar-producao');
    }

    /* ════════════════════════════════════════════════════════════
       ETAPA 2 — QUALIDADE
    ════════════════════════════════════════════════════════════ */

    _etapa2() {
        this._lockAll();
        this._limparBanners();

        // Detectar quais categorias foram preenchidas pela produção
        // e desbloquear SOMENTE as colunas correspondentes em container-3
        // (col-1 → MAN também segue a mesma regra das outras colunas)
        const colsAtivas = [];
        for (const [col, cat] of Object.entries(COL3_PARA_CATEGORIA)) {
            if (this._categoriaFoiPreenchida(cat)) {
                this._unlockCelulas3([Number(col)]);
                colsAtivas.push(Number(col));
            } else {
                this._faixaBloqueadaCol3(Number(col), `🔒  ${cat} não preenchido`);
            }
        }

        this._unlock('.sidebar-acompanhamento');

        this._show('btnSalvarEtapa');
        this._show('btnAvancarEtapa');
        this._hide('btnVoltarSalvar');
        this._hide('btnAprovarFinalizar');
        this._atualTexto('btnAvancarEtapa', '📤 AVANÇAR');
        this._atualClasse('btnAvancarEtapa', 'btn-avancar btn-avancar-qualidade');
    }

    /* ════════════════════════════════════════════════════════════
       ETAPA 3 — APROVAÇÃO
    ════════════════════════════════════════════════════════════ */

    _etapa3() {
        this._unlockAll();
        this._limparBanners();

        this._show('btnSalvarEtapa');
        this._hide('btnAvancarEtapa');
        this._hide('btnVoltarSalvar');
        this._show('btnAprovarFinalizar');
    }

    /* ════════════════════════════════════════════════════════════
       BLOQUEAR TUDO
    ════════════════════════════════════════════════════════════ */

    _bloquearTudo() {
        this._lockAll();
        this._limparBanners();
        this._hide('btnSalvarEtapa');
        this._hide('btnAvancarEtapa');
        this._hide('btnVoltarSalvar');
        this._hide('btnAprovarFinalizar');
    }

    /* ════════════════════════════════════════════════════════════
       DETECÇÃO DE COLUNA PREENCHIDA
    ════════════════════════════════════════════════════════════ */

    _categoriaFoiPreenchida(categoria) {
        // Verifica APENAS container-1 e container-2 — onde a produção preenche.
        // Não consulta container-3/4 para evitar falsos positivos com dados
        // salvos pela qualidade em etapas anteriores.
        const escopo = '.quadro-container-1, .quadro-container-2';
        const raizes = document.querySelectorAll(escopo);
        for (const raiz of raizes) {
            const campos = raiz.querySelectorAll(`[data-categoria="${categoria}"]`);
            for (const el of campos) {
                if (el.tagName === 'INPUT' && el.type === 'checkbox') {
                    if (el.checked) return true;
                } else {
                    if (el.textContent.trim().length > 0) return true;
                }
            }
        }
        return false;
    }

    /* ════════════════════════════════════════════════════════════
       PRIMITIVOS DE LOCK / UNLOCK
    ════════════════════════════════════════════════════════════ */

    _lockAll() {
        document.querySelectorAll('[contenteditable]').forEach(el => {
            el.setAttribute('contenteditable', 'false');
            el.classList.add('etapa-lock');
        });
        document.querySelectorAll('input, textarea, select').forEach(el => {
            if (['submit', 'button', 'hidden', 'reset'].includes(el.type)) return;
            el.disabled = true;
            el.classList.add('etapa-lock');
        });
    }

    _unlockAll() {
        document.querySelectorAll('[contenteditable]').forEach(el => {
            el.setAttribute('contenteditable', 'true');
            el.classList.remove('etapa-lock', 'etapa-readonly');
        });
        document.querySelectorAll('input, textarea, select').forEach(el => {
            if (['submit', 'button', 'hidden', 'reset'].includes(el.type)) return;
            el.disabled = false;
            el.classList.remove('etapa-lock', 'etapa-readonly');
        });
    }

    _unlock(selector) {
        const el = document.querySelector(selector);
        if (!el) return;
        el.querySelectorAll('[contenteditable]').forEach(c => {
            c.setAttribute('contenteditable', 'true');
            c.classList.remove('etapa-lock', 'etapa-readonly');
        });
        el.querySelectorAll('input, textarea, select').forEach(c => {
            if (['submit', 'button', 'hidden', 'reset'].includes(c.type)) return;
            c.disabled = false;
            c.classList.remove('etapa-lock', 'etapa-readonly');
        });
    }

    /**
     * Desbloqueia células específicas do container-3.
     * O container-3 usa grid de 4 colunas com 8 células.
     * Para coluna N: células N-1 e N+3 (0-based)
     */
    _unlockCelulas3(colunas) {
        const celulas = document.querySelectorAll('.quadro-container-3 .celula-3');
        colunas.forEach(col => {
            [col - 1, col + 3].forEach(idx => {
                const cel = celulas[idx];
                if (!cel) return;
                cel.querySelectorAll('[contenteditable]').forEach(c => {
                    c.setAttribute('contenteditable', 'true');
                    c.classList.remove('etapa-lock', 'etapa-readonly');
                });
                cel.querySelectorAll('input, textarea, select').forEach(c => {
                    if (['submit', 'button', 'hidden', 'reset'].includes(c.type)) return;
                    c.disabled = false;
                    c.classList.remove('etapa-lock', 'etapa-readonly');
                });
            });
        });
    }

    /* ════════════════════════════════════════════════════════════
       FAIXAS INDICADORAS
    ════════════════════════════════════════════════════════════ */

    _limparBanners() {
        document.querySelectorAll('.etapa-faixa, .etapa-faixa-ok').forEach(el => el.remove());
    }

    _faixaBloqueada(selector, texto) {
        const el = document.querySelector(selector);
        if (!el || el.querySelector('.etapa-faixa')) return;
        const div = document.createElement('div');
        div.className = 'etapa-faixa etapa-faixa-lock';
        div.textContent = texto;
        el.insertBefore(div, el.firstChild);
    }

    _faixaBloqueadaCol3(col, texto) {
        const celulas = document.querySelectorAll('.quadro-container-3 .celula-3');
        [col - 1, col + 3].forEach(idx => {
            const cel = celulas[idx];
            if (!cel || cel.querySelector('.etapa-faixa')) return;
            const div = document.createElement('div');
            div.className = 'etapa-faixa etapa-faixa-lock';
            div.textContent = texto;
            cel.insertBefore(div, cel.firstChild);
        });
    }

    _faixaDestaque(selector, texto) {
        const el = document.querySelector(selector);
        if (!el || el.querySelector('.etapa-faixa-ok')) return;
        const div = document.createElement('div');
        div.className = 'etapa-faixa etapa-faixa-ok';
        div.textContent = texto;
        el.insertBefore(div, el.firstChild);
    }

    /* ════════════════════════════════════════════════════════════
       BOTÕES
    ════════════════════════════════════════════════════════════ */

    _ocultarAntigos() {
        // Ocultar botões legados do formulario.js que interferem no fluxo de etapas
        ['btnSalvarCheck', 'btnFinalizarcheck'].forEach(id => this._hide(id));
    }

    _criarBotoes() {
        const bloco = document.querySelector('.bloco-visto');
        if (!bloco) return;

        // ─── Salvar (mantém status) ───────────────────────────────
        const btnSalvar = document.createElement('button');
        btnSalvar.id = 'btnSalvarEtapa';
        btnSalvar.type = 'button';
        btnSalvar.className = 'btn-etapa-salvar';
        btnSalvar.innerHTML = '💾 SALVAR';
        btnSalvar.style.display = 'none';
        btnSalvar.addEventListener('click', () => this._salvarRascunho());
        bloco.appendChild(btnSalvar);

        // ─── Avançar etapa ────────────────────────────────────────
        const btnAvancar = document.createElement('button');
        btnAvancar.id = 'btnAvancarEtapa';
        btnAvancar.type = 'button';
        btnAvancar.className = 'btn-avancar';
        btnAvancar.textContent = 'AVANÇAR';
        btnAvancar.style.display = 'none';
        btnAvancar.addEventListener('click', () => this._avancar());
        bloco.appendChild(btnAvancar);

        // ─── Voltar / salvar (reservado) ──────────────────────────
        const btnVoltar = document.createElement('button');
        btnVoltar.id = 'btnVoltarSalvar';
        btnVoltar.type = 'button';
        btnVoltar.className = 'btn-etapa-salvar';
        btnVoltar.textContent = '↩ VOLTAR';
        btnVoltar.style.display = 'none';
        bloco.appendChild(btnVoltar);

        // ─── Aprovar e finalizar ──────────────────────────────────
        const btnAprovar = document.createElement('button');
        btnAprovar.id = 'btnAprovarFinalizar';
        btnAprovar.type = 'button';
        btnAprovar.className = 'btn-aprovar';
        btnAprovar.textContent = 'FINALIZAR';
        btnAprovar.style.display = 'none';
        btnAprovar.addEventListener('click', () => this._aprovarFinalizar());
        bloco.appendChild(btnAprovar);
    }

    _show(id) { const el = document.getElementById(id); if (el) el.style.display = ''; }
    _hide(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }

    _atualTexto(id, txt) {
        const el = document.getElementById(id);
        if (el) el.textContent = txt;
    }

    _atualClasse(id, cls) {
        const el = document.getElementById(id);
        if (el) el.className = cls;
    }

    /* ════════════════════════════════════════════════════════════
       AÇÕES
    ════════════════════════════════════════════════════════════ */

    // Salvar rascunho — mantém status atual, sem avançar
    async _salvarRascunho() {
        const msg = window.sistemaChecklist?.mensagens;
        try {
            msg?.informacao('Salvando…', 0);
            const dados = window.sistemaChecklist.coletarDados();
            dados.status = this.statusAtual;
            dados.data_atualizacao = new Date().toISOString();

            const res = await this._req(dados);
            if (res.success) {
                if (window.sistemaChecklist) window.sistemaChecklist.modoEdicao = true;
                msg?.sucesso('✓ Salvo com sucesso!');
                //redireciona para a pagina /4m-checklist.html
                setTimeout(() => { window.location.href = '/4m-checklist.html'; }, 1500);

            } else {
                msg?.erro('Erro ao salvar: ' + (res.message || 'tente novamente.'));
            }
        } catch (e) { msg?.erro('Erro: ' + e.message); }
    }

    // Avançar para próxima etapa
    async _avancar() {
        const proximo = {
            'em_andamento': 'aguardando_qualidade',
            'aguardando_qualidade': 'aguardando_aprovacao'
        }[this.statusAtual];

        if (!proximo) return;

        // ── Validação obrigatória antes de avançar ──
        const invalidos = this._validarEtapaAtual();
        if (invalidos.length) {
            this._mostrarErrosValidacao(invalidos);
            return;
        }

        const msg = window.sistemaChecklist?.mensagens;
        const label = proximo === 'aguardando_qualidade' ? 'Qualidade' : 'Aprovação';

        try {
            msg?.informacao(`Enviando para ${label}…`, 0);
            const dados = window.sistemaChecklist.coletarDados();
            dados.status = proximo;
            dados.data_atualizacao = new Date().toISOString();

            const res = await this._req(dados);
            if (res.success) {
                msg?.sucesso(`✓ Formulário enviado para ${label}!`);
                setTimeout(() => { window.location.href = '/4m-checklist.html'; }, 2000);
            } else {
                msg?.erro('Erro ao enviar: ' + (res.message || 'tente novamente.'));
            }
        } catch (e) { msg?.erro('Erro: ' + e.message); }
    }

    // Aprovar e finalizar (somente admin)
    async _aprovarFinalizar() {
        const msg = window.sistemaChecklist?.mensagens;

        // ── Validação obrigatória antes de finalizar ──
        const invalidos = this._validarEtapaAtual();
        if (invalidos.length) {
            this._mostrarErrosValidacao(invalidos);
            return;
        }

        const ok = await this._modalConfirm(
            'Ao finalizar, o checklist será marcado como <strong>CONCLUÍDO</strong> e não poderá mais ser editado.<br><br>Confirmar finalização?'
        );
        if (!ok) return;

        try {
            msg?.informacao('Finalizando…', 0);
            const dados = window.sistemaChecklist.coletarDados();
            dados.status = 'concluido';
            dados.data_finalizacao = new Date().toISOString();
            dados.data_atualizacao = new Date().toISOString();
            if (this.usuarioAtual) dados.finalizado_por = this.usuarioAtual;

            const res = await this._req(dados);
            if (res.success) {
                msg?.sucesso('✓ Checklist aprovado e concluído!');
                setTimeout(() => { window.location.href = '/4m-checklist.html'; }, 2500);
            } else {
                msg?.erro('Erro ao finalizar: ' + (res.message || 'tente novamente.'));
            }
        } catch (e) { msg?.erro('Erro: ' + e.message); }
    }

    async _req(dados) {
        const sc = window.sistemaChecklist;
        if (sc && !sc.modoEdicao && !sc.numeroControleAtual) {
            await sc.gerarNumeroControle();
            dados.numero_controle = sc.numeroControleAtual;
        }

        const nc = sc?.numeroControleAtual || dados.numero_controle;
        const modo = sc?.modoEdicao || false;
        const token = localStorage.getItem('authToken');

        const method = modo ? 'PUT' : 'POST';
        const url = modo ? `${API_URL}/fr0062/${nc}` : `${API_URL}/fr0062`;

        const headers = { 'Content-Type': 'application/json' };
        if (token && token !== 'null' && token !== 'undefined')
            headers['Authorization'] = `Bearer ${token}`;

        const r = await fetch(url, { method, headers, body: JSON.stringify(dados) });
        return r.json();
    }

    /* ════════════════════════════════════════════════════════════
       VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS
    ════════════════════════════════════════════════════════════ */

    /**
     * Valida um par de checkboxes (SIM/NÃO) onde pelo menos um deve estar marcado
     * e o texto correspondente só é obrigatório quando "SIM" estiver marcado.
     * 
     * @param {HTMLElement} cbSim - Checkbox "SIM"
     * @param {HTMLElement} cbNao - Checkbox "NÃO"
     * @param {HTMLElement} spanTexto - Span contenteditable para preenchimento
     * @param {string} categoria - Nome da categoria (ex: 'MACHINE')
     * @param {string} tipo - Nome do campo (ex: 'GARANTIA 200%')
     * @param {Function} isVazio - Função para verificar se um campo está vazio
     * @param {Array} erros - Array onde os erros serão adicionados
     */
    _validarCheckboxComTextoObrigatorio(cbSim, cbNao, spanTexto, categoria, tipo, isVazio, erros) {
        // Validação básica: pelo menos um deve estar marcado
        if (!cbSim.checked && !cbNao.checked) {
            erros.push({ 
                el: cbSim, 
                msg: `${categoria} › ${tipo}: Selecione SIM ou NÃO` 
            });
            return;
        }

        // Texto obrigatório apenas quando "SIM" está marcado
        if (cbSim.checked && spanTexto && isVazio(spanTexto)) {
            erros.push({ 
                el: spanTexto, 
                msg: `${categoria} › ${tipo}: Preencha o texto` 
            });
        }
    }

    /**
     * Valida múltiplos checkboxes (grupo) onde pelo menos um deve estar marcado
     * e, para cada marcado, o texto correspondente é obrigatório.
     * 
     * Útil para validar campos como "Resultado Avaliação" (2D, CMM, MACRO, OUTROS).
     * 
     * @param {Array<{cb: HTMLElement, span: HTMLElement}>} itens - Array com pares {checkbox, span}
     * @param {string} nomeCampo - Nome do campo para mensagem de erro
     * @param {Function} isVazio - Função para verificar se um campo está vazio
     * @param {Array} erros - Array onde os erros serão adicionados
     * @param {HTMLElement} elFallback - Elemento para fallback se nenhum item tiver checkbox válido
     */
    _validarCheckboxMultiplosComTextos(itens, nomeCampo, isVazio, erros, elFallback = null) {
        // Regra 1: pelo menos um checkbox deve estar marcado
        const algumMarcado = itens.some(item => item.cb && item.cb.checked);
        if (!algumMarcado) {
            const elErro = elFallback || (itens[0]?.cb);
            if (elErro) {
                erros.push({ 
                    el: elErro, 
                    msg: `${nomeCampo}: Selecione ao menos uma opção` 
                });
            }
        }

        // Regra 2: para cada checkbox marcado, o texto é obrigatório
        itens.forEach(item => {
            if (item.cb && item.cb.checked && item.span && isVazio(item.span)) {
                erros.push({ 
                    el: item.span, 
                    msg: `${nomeCampo}: Preencha o campo de texto do item marcado` 
                });
            }
        });
    }

    /**
     * Retorna lista de { el, msg } com todos os campos obrigatórios
     * da etapa atual que estão vazios ou incompletos.
     */
    _validarEtapaAtual() {
        const erros = [];

        const textoVazio = el => !el.textContent.trim();
        const bloqueado = el => el.classList.contains('etapa-lock')
            || el.getAttribute('contenteditable') === 'false';
        const desabilitado = el => el.disabled;

        const testarTexto = (el, label) => {
            if (!bloqueado(el) && textoVazio(el)) erros.push({ el, msg: label });
        };

        const testarGrupo = (seletor, label) => {
            const itens = [...document.querySelectorAll(seletor)].filter(c => !desabilitado(c));
            if (itens.length && !itens.some(c => c.checked))
                erros.push({ el: itens[0], msg: label });
        };

        // ── ETAPA 1 — PRODUÇÃO ─────────────────────────────────
        if (this.statusAtual === 'em_andamento') {

            // Função auxiliar para verificar se um campo contenteditable está vazio
            const isVazio = (el) => {
                if (!el) return true;
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    return !el.value.trim();
                }
                // Para spans com contenteditable
                return !(el.textContent || el.innerText || '').trim();
            };

            const CATS = ['MAN', 'MACHINE', 'MATERIAL', 'METHOD'];

            CATS.forEach(cat => {
                const campos = document.querySelectorAll(
                    `.quadro-container-1 [data-categoria="${cat}"][contenteditable]`
                );
                if (!campos.length || bloqueado(campos[0])) return;

                campos.forEach(el => {
                    const label = el.closest('.celula-4m')?.querySelector('label')?.textContent?.trim()
                        || el.getAttribute('aria-label') || 'Campo';
                    testarTexto(el, `${cat} › ${label}`);
                });

                testarGrupo(
                    `input[aria-label*="${cat} Importância"]:not(:disabled)`,
                    `${cat} › IMPORTÂNCIA`
                );
                testarGrupo(
                    `input[aria-label*="${cat} Turno"]:not(:disabled)`,
                    `${cat} › DATA / TURNO`
                );
            });

            document.querySelectorAll('.quadro-container-2 .coluna').forEach((col, i) => {
                // Pula coluna se estiver completamente bloqueada
                const primeiroElemEditavel = col.querySelector('[contenteditable]:not(.etapa-lock), input[type="checkbox"]:not(:disabled)');
                if (!primeiroElemEditavel) return;

                col.querySelectorAll('[contenteditable]').forEach(el => {
                    if (bloqueado(el)) return;
                    if (el.closest('.secao-garantia')) return;
                    if (el.closest('.secao-sakanobori')) return;
                    if (el.closest('.secao-meios')) return;
                    const label = el.closest('[class*="secao"]')
                        ?.querySelector('span:first-child')?.textContent?.trim()
                        || 'Campo';
                    testarTexto(el, `${CATS[i]} › ${label}`);
                });

                // ────────────────────────────────────────────────────────────
                // GARANTIA 200% — validação com texto obrigatório
                // ────────────────────────────────────────────────────────────
                const cbGarantiaSim = col.querySelector(`input[aria-label*="${CATS[i]} Garantia 200% Sim"]`);
                const cbGarantiaNao = col.querySelector(`input[aria-label*="${CATS[i]} Garantia 200% Não"]`);
                const spanGarantia = col.querySelector('.secao-garantia span.input-line');
                
                if (cbGarantiaSim && cbGarantiaNao && !desabilitado(cbGarantiaSim) && !desabilitado(cbGarantiaNao)) {
                    this._validarCheckboxComTextoObrigatorio(
                        cbGarantiaSim,
                        cbGarantiaNao,
                        spanGarantia,
                        CATS[i],
                        'GARANTIA 200%',
                        isVazio,
                        erros
                    );
                }

                // ────────────────────────────────────────────────────────────
                // MEIOS DE AVALIAÇÃO — validação com "OUTROS" obrigatório
                // ────────────────────────────────────────────────────────────
                const secaoMeios = col.querySelector('.secao-meios');
                if (secaoMeios && !bloqueado(secaoMeios)) {
                    const cb2D = secaoMeios.querySelector(`input[aria-label*="${CATS[i]} Avaliação 2D"]`);
                    const cbCMM = secaoMeios.querySelector(`input[aria-label*="${CATS[i]} Avaliação CMM"]`);
                    const cbMACRO = secaoMeios.querySelector(`input[aria-label*="${CATS[i]} Avaliação MACRO"]`);
                    const cbOutros = secaoMeios.querySelector(`input[aria-label*="${CATS[i]} Avaliação Outros"]`);
                    const spanOutros = secaoMeios.querySelector('.checkbox-group:last-child span.input-line');
                    
                    // Validar apenas se todos os elementos estão desbloqueados
                    if (cb2D && cbCMM && cbMACRO && cbOutros && !desabilitado(cb2D) && !desabilitado(cbCMM) && !desabilitado(cbMACRO) && !desabilitado(cbOutros)) {
                        // Regra 1: pelo menos um deve estar marcado
                        if (!cb2D.checked && !cbCMM.checked && !cbMACRO.checked && !cbOutros.checked) {
                            erros.push({ el: cb2D, msg: `${CATS[i]} › MEIOS DE AVALIAÇÃO: Selecione ao menos uma opção` });
                        }
                        
                        // Regra 2: se "OUTROS" está marcado, o texto é obrigatório
                        if (cbOutros.checked && spanOutros && isVazio(spanOutros)) {
                            erros.push({ el: spanOutros, msg: `${CATS[i]} › MEIOS DE AVALIAÇÃO › OUTROS: Preencha o texto` });
                        }
                    }
                }

                testarGrupo(
                    `input[aria-label*="${i === 0 ? 'Sakanobori' : CATS[i] + ' Sakanobori'}"]:not(:disabled)`,
                    `${CATS[i]} › SAKANOBORI`
                );
            });
        }

        // ── ETAPA 2 — QUALIDADE ────────────────────────────────
        else if (this.statusAtual === 'aguardando_qualidade') {

            // Função auxiliar para verificar se um campo contenteditable está vazio
            const isVazio = (el) => {
                if (!el) return true;
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    return !el.value.trim();
                }
                // Para spans com contenteditable
                return !(el.textContent || el.innerText || '').trim();
            };

            document.querySelectorAll('.quadro-container-3 .celula-3').forEach(cel => {
                // Pula células completamente bloqueadas
                const primeiro = cel.querySelector('[contenteditable], input');
                if (!primeiro || desabilitado(primeiro) || bloqueado(primeiro)) return;

                // ------------------------------------------------------------
                // RESULTADO AVALIAÇÃO (secao-resultado) e JUSTIFICATIVA (secao-justificativa) são pares
                // ------------------------------------------------------------
                if (cel.classList.contains('secao-resultado')) {
                    // Encontra o bloco de justificativa correspondente (mesmo índice)
                    const index = Array.from(document.querySelectorAll('.secao-resultado')).indexOf(cel);
                    const blocoJust = document.querySelectorAll('.secao-justificativa')[index];
                    if (!blocoJust) return;

                    const cbOk = cel.querySelector('input[type="checkbox"]'); // primeiro checkbox do resultado (OK)
                    const cbNok = blocoJust.querySelector('input[type="checkbox"]'); // primeiro checkbox da justificativa (NOK)

                    if (!cbOk || !cbNok) return;

                    // Regra 1: pelo menos um dos dois deve estar marcado
                    if (!cbOk.checked && !cbNok.checked) {
                        erros.push({ el: cbOk, msg: 'Selecione OK ou NOK para este item' });
                    }

                    // Se OK estiver marcado
                    if (cbOk.checked) {
                        // Coleta todos os itens internos (checkboxes com campo de texto)
                        const itensInternos = [];
                        cel.querySelectorAll('.input-item').forEach(item => {
                            const cb = item.querySelector('input[type="checkbox"]');
                            const span = item.querySelector('span.input-line');
                            if (cb && span) itensInternos.push({ cb, span });
                        });

                        // Usa função genérica para validar múltiplos checkboxes
                        const primeiroLabel = cel.querySelector('.input-item label');
                        this._validarCheckboxMultiplosComTextos(
                            itensInternos,
                            'RESULTADO AVALIAÇÃO (2D, CMM, MACRO, OUTROS)',
                            isVazio,
                            erros,
                            primeiroLabel || cbOk
                        );

                        const spanGarantia = cel.querySelector('.input-line[style*="margin-top: auto"]')
                            || cel.querySelector('.input-line:last-child');
                        if (spanGarantia && isVazio(spanGarantia)) {
                            erros.push({ el: spanGarantia, msg: 'GARANTIA 200%: Preencha o texto' });
                        }
                    }

                    // Se NOK estiver marcado
                    if (cbNok.checked) {
                        // Apenas a justificativa principal (primeiro span dentro de .justificativa-linha) é obrigatória
                        const spanJust = blocoJust.querySelector('.justificativa-linha span.input-line');
                        if (spanJust && isVazio(spanJust)) {
                            erros.push({ el: spanJust, msg: 'Justificativa obrigatória' });
                        }
                    }
                }

                // ------------------------------------------------------------
                // TRATATIVA (procedimentos) - regra existente
                // ------------------------------------------------------------
                if (cel.classList.contains('secao-tratativa')) {
                    ['PR008', 'PR990', 'PR007', 'PR092'].forEach(pr =>
                        testarGrupo(
                            `input[aria-label*="${pr}"]:not(:disabled)`,
                            `${pr}: selecione SIM ou NÃO`
                        )
                    );
                }

                // A validação antiga de justificativa (apenas checkbox) foi removida porque agora é feita em conjunto com o resultado.
                // Se houver outras justificativas independentes, ajuste conforme necessário.
            });
        }

        // ── ETAPA 3 — APROVAÇÃO ────────────────────────────────
        else if (this.statusAtual === 'aguardando_aprovacao') {

            [
                ['solicitadoPor', 'Solicitado Por'],
                ['vistoRetencaoQA', 'Visto Retenção QA'],
                ['setorProducao', 'Setor Produção'],
                ['setorLogistica', 'Setor Log. / P.C.'],
                ['setorEngenharia', 'Setor Engenharia'],
                ['qualidadeAprovado', 'Qualidade Aprovado'],
                ['qualidadeConfirmado', 'Qualidade Confirmado'],
                ['qualidadeExecutadoPor', 'Qualidade Executado Por'],
                ['recebimentoQA', 'Recebimento Q.A.'],
                ['controleAprovado', 'Controle Aprovado'],
                ['controleExecutadoPor', 'Controle Executado Por'],
                ['controleElaboradoPor', 'Controle Elaborado Por'],
            ].forEach(([id, label]) => {
                const el = document.getElementById(id);
                if (el && !bloqueado(el)) testarTexto(el, label);
            });

            testarGrupo(
                '#mudanca4mEngenharia, #mudanca4mControle, #mudanca4mProducao',
                'MUDANÇA 4M: selecione pelo menos uma opção'
            );
        }

        return erros;
    }

    /**
     * Destaca visualmente os campos inválidos e exibe resumo de erros.
     */
    _mostrarErrosValidacao(invalidos) {
        // Remove destaques anteriores
        document.querySelectorAll('.campo-invalido').forEach(el => el.classList.remove('campo-invalido'));

        // Destaca cada campo inválido e remove o destaque quando preenchido
        invalidos.forEach(({ el }) => {
            el.classList.add('campo-invalido');
            el.addEventListener('input', () => el.classList.remove('campo-invalido'), { once: true });
            el.addEventListener('change', () => el.classList.remove('campo-invalido'), { once: true });
        });

        // Scrolla até o primeiro campo inválido
        invalidos[0]?.el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Exibe mensagem resumida
        const msg = window.sistemaChecklist?.mensagens;
        const visiveis = invalidos.slice(0, 6);
        const lista = visiveis.map(e => `• ${e.msg}`).join('\n');
        const extra = invalidos.length > 6 ? `\n...e mais ${invalidos.length - 6} campo(s)` : '';

        if (msg) {
            msg.erro(`Campos obrigatórios não preenchidos (${invalidos.length}):\n${lista}${extra}`);
        } else {
            alert(`Campos obrigatórios não preenchidos (${invalidos.length}):\n\n${lista}${extra}`);
        }
    }

    /* ════════════════════════════════════════════════════════════
       MODAL CONFIRMAÇÃO
    ════════════════════════════════════════════════════════════ */

    _modalConfirm(html) {
        return new Promise(resolve => {
            const ov = document.createElement('div');
            ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:999999;';
            ov.innerHTML = `
            <div style="background:#fff;border-radius:10px;padding:36px;max-width:480px;width:94%;
                        box-shadow:0 20px 60px rgba(0,0,0,.35);font-family:Arial,sans-serif;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
                    <span style="font-size:26px;color:#2E7D32;">✔</span>
                    <h3 style="margin:0;color:#1B5E20;font-size:15px;letter-spacing:.3px;">CONFIRMAR FINALIZAÇÃO</h3>
                </div>
                <p style="color:#444;line-height:1.7;margin:0 0 26px;">${html}</p>
                <div style="display:flex;gap:10px;justify-content:flex-end;">
                    <button id="_mc_no"  style="padding:9px 22px;background:#757575;color:#fff;border:none;border-radius:5px;cursor:pointer;font-weight:700;font-size:13px;">Cancelar</button>
                    <button id="_mc_yes" style="padding:9px 22px;background:#2E7D32;color:#fff;border:none;border-radius:5px;cursor:pointer;font-weight:700;font-size:13px;box-shadow:0 2px 8px rgba(46,125,50,.4);">✔ Confirmar</button>
                </div>
            </div>`;
            document.body.appendChild(ov);
            ov.querySelector('#_mc_yes').onclick = () => { ov.remove(); resolve(true); };
            ov.querySelector('#_mc_no').onclick = () => { ov.remove(); resolve(false); };
        });
    }

    /* ════════════════════════════════════════════════════════════
       BARRA DE PROGRESSO
    ════════════════════════════════════════════════════════════ */

    _criarBarraProgresso() {
        const barra = document.createElement('div');
        barra.id = 'barra-etapas';

        const etapas = [
            { n: 1, label: 'PRODUÇÃO', cor: '#1565C0' },
            { n: 2, label: 'QUALIDADE', cor: '#E65100' },
            { n: 3, label: 'APROVAÇÃO', cor: '#1B5E20' }
        ];

        barra.innerHTML = etapas.map((e, i) => `
            ${i > 0 ? '<div class="barra-conector" data-after="' + i + '"></div>' : ''}
            <div class="barra-step" data-n="${e.n}" style="--cor:${e.cor}">
                <div class="barra-circulo"><span class="barra-num">${e.n}</span></div>
                <div class="barra-label">${e.label}</div>
            </div>
        `).join('');

        const form = document.getElementById('formularioFR0062');
        if (form) form.insertBefore(barra, form.firstChild);
    }

    _atualizarBarra() {
        const barra = document.getElementById('barra-etapas');
        if (!barra) return;

        const etapaN = { 'em_andamento': 1, 'aguardando_qualidade': 2, 'aguardando_aprovacao': 3, 'concluido': 4, 'finalizado': 4 };
        const ativa = etapaN[this.statusAtual] || 1;

        barra.querySelectorAll('.barra-step').forEach(step => {
            const n = +step.dataset.n;
            step.classList.remove('step-ok', 'step-ativa', 'step-inativa');
            const num = step.querySelector('.barra-num');

            if (ativa > 3 || n < ativa) { step.classList.add('step-ok'); num.textContent = '✓'; }
            else if (n === ativa) { step.classList.add('step-ativa'); num.textContent = n; }
            else { step.classList.add('step-inativa'); num.textContent = n; }
        });

        barra.querySelectorAll('.barra-conector').forEach((c, i) => {
            c.classList.toggle('conector-ok', ativa > i + 1);
        });
    }

    /* ════════════════════════════════════════════════════════════
       BADGE FIXO
    ════════════════════════════════════════════════════════════ */

    _badge(texto, cor) {
        document.getElementById('_status_badge')?.remove();
        const el = document.createElement('div');
        el.id = '_status_badge';
        el.textContent = texto;
        el.style.cssText = `
            position:fixed;top:14px;left:50%;transform:translateX(-50%);
            background:${cor};color:#fff;padding:6px 26px;border-radius:20px;
            font-size:12px;font-weight:700;letter-spacing:.7px;
            z-index:99999;box-shadow:0 3px 12px rgba(0,0,0,.3);
            font-family:Arial,sans-serif;white-space:nowrap;pointer-events:none;
        `;
        document.body.appendChild(el);
    }

    /* ════════════════════════════════════════════════════════════
       CSS INJETADO
    ════════════════════════════════════════════════════════════ */

    _injetarCSS() {
        if (document.getElementById('_etapas_css')) return;
        const s = document.createElement('style');
        s.id = '_etapas_css';
        s.textContent = `

/* ── BARRA DE PROGRESSO ─────────────────────────────────────────── */
#barra-etapas {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 20px 8px;
    background: #fff;
    border-bottom: 1px solid #ddd;
    position: sticky;
    top: 0;
    z-index: 1000;
    box-shadow: 0 1px 6px rgba(0,0,0,.08);
    gap: 0;
    font-family: Arial, sans-serif;
    user-select: none;
}
@media print { #barra-etapas { display: none; } }

.barra-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-width: 80px;
    cursor: default;
}

.barra-circulo {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    transition: background .3s, box-shadow .3s;
}

.barra-num { line-height: 1; }

.barra-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    transition: color .3s;
}

.barra-conector {
    height: 3px;
    flex: 1;
    max-width: 72px;
    min-width: 24px;
    background: #ddd;
    margin-bottom: 18px;
    border-radius: 2px;
    transition: background .3s;
}
.conector-ok { background: #43A047; }

/* Inativa */
.barra-step.step-inativa .barra-circulo { background: #e0e0e0; color: #9e9e9e; }
.barra-step.step-inativa .barra-label   { color: #9e9e9e; }

/* Ativa — usa a CSS custom property --cor definida inline */
.barra-step.step-ativa .barra-circulo {
    background: var(--cor);
    color: #fff;
    box-shadow: 0 0 0 5px color-mix(in srgb, var(--cor) 25%, transparent);
}
.barra-step.step-ativa .barra-label { color: var(--cor); }

/* Concluída */
.barra-step.step-ok .barra-circulo { background: #43A047; color: #fff; }
.barra-step.step-ok .barra-label   { color: #2E7D32; }

/* ── BOTÕES DE ETAPA ─────────────────────────────────────────────── */
.btn-etapa-salvar {
    padding: 5px 12px;
    font-size: 10.5px;
    font-weight: 700;
    color: #444;
    background: #f5f5f5;
    border: 1px solid #bdbdbd;
    border-radius: 4px;
    cursor: pointer;
    letter-spacing: .3px;
    margin-top: 4px;
    white-space: nowrap;
    transition: background .15s;
}
.btn-etapa-salvar:hover { background: #eeeeee; }

.btn-avancar {
    padding: 6px 14px;
    font-size: 11px;
    font-weight: 700;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    letter-spacing: .4px;
    margin-top: 4px;
    white-space: nowrap;
    color: #fff;
    transition: filter .15s, transform .1s;
}
.btn-avancar:hover  { filter: brightness(1.1); }
.btn-avancar:active { transform: scale(.97); }

.btn-avancar-producao  { background: #1565C0; }
.btn-avancar-qualidade { background: #E65100; }

.btn-aprovar {
    padding: 7px 16px;
    font-size: 11.5px;
    font-weight: 700;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    letter-spacing: .4px;
    margin-top: 4px;
    white-space: nowrap;
    color: #fff;
    background: #2E7D32;
    box-shadow: 0 2px 8px rgba(46,125,50,.35);
    transition: filter .15s, transform .1s;
}
.btn-aprovar:hover  { filter: brightness(1.1); }
.btn-aprovar:active { transform: scale(.97); }

/* ── CAMPOS BLOQUEADOS ───────────────────────────────────────────── */
.etapa-lock {
    background-color: #f4f4f4 !important;
    cursor: not-allowed  !important;
    opacity: .65         !important;
    color: #757575       !important;
}
[contenteditable="false"].etapa-lock {
    pointer-events: none;
    user-select: none;
}

/* ── CAMPOS INVÁLIDOS (validação obrigatória) ────────────────────── */
.campo-invalido {
    outline: 2px solid #e53935 !important;
    background-color: rgba(229, 57, 53, 0.08) !important;
}

/* ── FAIXAS INDICADORAS ──────────────────────────────────────────── */
.etapa-faixa {
    display: block;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .5px;
    padding: 3px 8px;
    font-family: Arial, sans-serif;
    line-height: 1.5;
}
.etapa-faixa-lock {
    background: #FFF8E1;
    color:  #795548;
    border-left: 3px solid #FF8F00;
}
.etapa-faixa-ok {
    background: #E8F5E9;
    color: #1B5E20;
    border-left: 3px solid #43A047;
}
        `;
        document.head.appendChild(s);
    }
}

/* ════════════════════════════════════════════════════════════════════
   BOOT
════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    window.gerenciadorEtapas = new GerenciadorEtapas();
    window.gerenciadorEtapas.inicializar();
});

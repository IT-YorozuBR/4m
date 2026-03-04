/**
 * FR0062 — GERENCIADOR DE ETAPAS  v3
 * ─────────────────────────────────────────────────────────────────
 *
 *  ETAPA 1 — PRODUÇÃO  (em_andamento)
 *    Editável : quadro-container-1 + quadro-container-2
 *    Bloqueado: cabeçalho, container-3, container-4, sidebar
 *
 *  ETAPA 2 — QUALIDADE  (aguardando_qualidade)
 *    Editável : quadro-container-3 col-1 (lista+tratativa) SEMPRE
 *               quadro-container-3 col-2/3/4 SÓ se a categoria
 *               correspondente (MACHINE/MATERIAL/METHOD) foi preenchida
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
// col-1 = lista-verificacao + tratativa  → SEMPRE editável
// col-2 = resultado-1 + justificativa-1  → MACHINE
// col-3 = resultado-2 + justificativa-2  → MATERIAL
// col-4 = resultado-3 + justificativa-3  → METHOD
const COL3_PARA_CATEGORIA = { 2: 'MACHINE', 3: 'MATERIAL', 4: 'METHOD' };

// ─────────────────────────────────────────────────────────────────

class GerenciadorEtapas {

    constructor() {
        this.statusAtual  = 'em_andamento';
        this.isAdmin      = false;
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
                this.isAdmin      = true;
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
            case 'finalizado':
                this._bloquearTudo();
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

        // Liberar containers da produção
        this._unlock('.quadro-container-1');
        this._unlock('.quadro-container-2');

        // Remover banners de etapa anterior
        this._limparBanners();

        // Sinalizar seções bloqueadas com faixa discreta
        this._faixaBloqueada('.quadro-container-3',     '🔒  QUALIDADE — preenchido na Etapa 2');
        this._faixaBloqueada('.sidebar-acompanhamento', '🔒  QUALIDADE — preenchido na Etapa 2');
        this._faixaBloqueada('.cabecalho-superior',     '🔒  APROVAÇÃO — preenchido na Etapa 3');
        this._faixaBloqueada('.quadro-container-4',     '🔒  APROVAÇÃO — preenchido na Etapa 3');

        this._show('btnSalvarEtapa');
        this._show('btnAvancarEtapa');
        this._hide('btnVoltarSalvar');
        this._hide('btnAprovarFinalizar');
        this._atualTexto('btnAvancarEtapa', '📋 ENVIAR PARA QUALIDADE');
        this._atualClasse('btnAvancarEtapa', 'btn-avancar btn-avancar-producao');
    }

    /* ════════════════════════════════════════════════════════════
       ETAPA 2 — QUALIDADE
    ════════════════════════════════════════════════════════════ */

    _etapa2() {
        this._lockAll();
        this._limparBanners();

        // Liberar col-1 de container-3 (lista-verificacao + tratativa) — SEMPRE
        this._unlockCelulas3([1]);

        // Detectar quais categorias de produção foram preenchidas
        // e liberar as colunas correspondentes em container-3
        const colsAtivas = [1]; // col-1 sempre
        for (const [col, cat] of Object.entries(COL3_PARA_CATEGORIA)) {
            if (this._categoriaFoiPreenchida(cat)) {
                this._unlockCelulas3([Number(col)]);
                colsAtivas.push(Number(col));
            } else {
                this._faixaBloqueadaCol3(Number(col), `🔒  ${cat} não preenchido`);
            }
        }

        // Liberar sidebar
        this._unlock('.sidebar-acompanhamento');

        // Sinalizar restantes
        this._faixaBloqueada('.cabecalho-superior', '🔒  APROVAÇÃO — preenchido na Etapa 3');
        this._faixaBloqueada('.quadro-container-4',  '🔒  APROVAÇÃO — preenchido na Etapa 3');

        this._show('btnSalvarEtapa');
        this._show('btnAvancarEtapa');
        this._hide('btnVoltarSalvar');
        this._hide('btnAprovarFinalizar');
        this._atualTexto('btnAvancarEtapa', '📤 ENVIAR PARA APROVAÇÃO');
        this._atualClasse('btnAvancarEtapa', 'btn-avancar btn-avancar-qualidade');
    }

    /* ════════════════════════════════════════════════════════════
       ETAPA 3 — APROVAÇÃO
    ════════════════════════════════════════════════════════════ */

    _etapa3() {
        this._unlockAll();
        this._limparBanners();

        // Destacar cabeçalho e container-4 como foco da aprovação
        this._faixaDestaque('.cabecalho-superior', '✏️  Preencha o cabeçalho para finalizar o fluxo');
        this._faixaDestaque('.quadro-container-4',  '✏️  Confirme a análise de risco e horário de aplicação');

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
        // Verifica campos contenteditable com data-categoria na categoria
        const spans = document.querySelectorAll(`[data-categoria="${categoria}"]`);
        for (const el of spans) {
            if (el.tagName === 'INPUT' && el.type === 'checkbox') {
                if (el.checked) return true;
            } else {
                if (el.textContent.trim().length > 0) return true;
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
            if (['submit','button','hidden','reset'].includes(el.type)) return;
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
            if (['submit','button','hidden','reset'].includes(el.type)) return;
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
            if (['submit','button','hidden','reset'].includes(c.type)) return;
            c.disabled = false;
            c.classList.remove('etapa-lock', 'etapa-readonly');
        });
    }

    /**
     * Desbloqueia células específicas do container-3.
     * O container-3 usa grid de 4 colunas com 8 células.
     * Para coluna N: células N e (N+4) — ex: col 2 → célula 2 e célula 6
     */
    _unlockCelulas3(colunas) {
        const celulas = document.querySelectorAll('.quadro-container-3 .celula-3');
        colunas.forEach(col => {
            // linha 1: índice col-1  (0-based → col-1)
            // linha 2: índice col+3  (0-based → col+3)
            [col - 1, col + 3].forEach(idx => {
                const cel = celulas[idx];
                if (!cel) return;
                cel.querySelectorAll('[contenteditable]').forEach(c => {
                    c.setAttribute('contenteditable', 'true');
                    c.classList.remove('etapa-lock', 'etapa-readonly');
                });
                cel.querySelectorAll('input, textarea, select').forEach(c => {
                    if (['submit','button','hidden','reset'].includes(c.type)) return;
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
        ['btnSalvarCheck', 'btnFinalizarcheck'].forEach(id => this._hide(id));
    }

    _criarBotoes() {
        const bloco = document.querySelector('.bloco-visto');
        if (!bloco) return;

        // ─── Salvar (mantém status) ───────────────────────────────
        const btnSalvar = document.createElement('button');
        btnSalvar.id        = 'btnSalvarEtapa';
        btnSalvar.type      = 'button';
        btnSalvar.className = 'btn-etapa-salvar';
        btnSalvar.innerHTML = '💾 SALVAR';
        btnSalvar.style.display = 'none';
        btnSalvar.addEventListener('click', () => this._salvarRascunho());
        bloco.appendChild(btnSalvar);

        // ─── Avançar etapa ────────────────────────────────────────
        const btnAvancar = document.createElement('button');
        btnAvancar.id        = 'btnAvancarEtapa';
        btnAvancar.type      = 'button';
        btnAvancar.className = 'btn-avancar';
        btnAvancar.textContent = 'AVANÇAR';
        btnAvancar.style.display = 'none';
        btnAvancar.addEventListener('click', () => this._avancar());
        bloco.appendChild(btnAvancar);

        // ─── Voltar / salvar (reservado) ──────────────────────────
        const btnVoltar = document.createElement('button');
        btnVoltar.id        = 'btnVoltarSalvar';
        btnVoltar.type      = 'button';
        btnVoltar.className = 'btn-etapa-salvar';
        btnVoltar.textContent = '↩ VOLTAR';
        btnVoltar.style.display = 'none';
        bloco.appendChild(btnVoltar);

        // ─── Aprovar e finalizar ──────────────────────────────────
        const btnAprovar = document.createElement('button');
        btnAprovar.id        = 'btnAprovarFinalizar';
        btnAprovar.type      = 'button';
        btnAprovar.className = 'btn-aprovar';
        btnAprovar.textContent = '✔ APROVAR E FINALIZAR';
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
            dados.status           = this.statusAtual;   // mantém status
            dados.data_atualizacao = new Date().toISOString();

            const res = await this._req(dados);
            if (res.success) {
                // Marca como modoEdicao para próximos salvamentos usarem PUT
                if (window.sistemaChecklist) window.sistemaChecklist.modoEdicao = true;
                msg?.sucesso('✓ Salvo com sucesso!');
            } else {
                msg?.erro('Erro ao salvar: ' + (res.message || 'tente novamente.'));
            }
        } catch (e) { msg?.erro('Erro: ' + e.message); }
    }

    // Avançar para próxima etapa
    async _avancar() {
        const proximo = {
            'em_andamento':        'aguardando_qualidade',
            'aguardando_qualidade': 'aguardando_aprovacao'
        }[this.statusAtual];

        if (!proximo) return;

        const msg = window.sistemaChecklist?.mensagens;
        const label = proximo === 'aguardando_qualidade' ? 'Qualidade' : 'Aprovação';

        try {
            msg?.informacao(`Enviando para ${label}…`, 0);
            const dados = window.sistemaChecklist.coletarDados();
            dados.status           = proximo;
            dados.data_atualizacao = new Date().toISOString();

            const res = await this._req(dados);
            if (res.success) {
                msg?.sucesso(`✓ Formulário enviado para ${label}!`);
                setTimeout(() => { window.location.href = '/templates/4m-checklist.html'; }, 2000);
            } else {
                msg?.erro('Erro ao enviar: ' + (res.message || 'tente novamente.'));
            }
        } catch (e) { msg?.erro('Erro: ' + e.message); }
    }

    // Aprovar e finalizar (somente admin)
    async _aprovarFinalizar() {
        const msg = window.sistemaChecklist?.mensagens;

        const ok = await this._modalConfirm(
            'Ao finalizar, o checklist será marcado como <strong>CONCLUÍDO</strong> e não poderá mais ser editado.<br><br>Confirmar finalização?'
        );
        if (!ok) return;

        try {
            msg?.informacao('Finalizando…', 0);
            const dados = window.sistemaChecklist.coletarDados();
            dados.status           = 'concluido';
            dados.data_finalizacao = new Date().toISOString();
            dados.data_atualizacao = new Date().toISOString();
            if (this.usuarioAtual) dados.finalizado_por = this.usuarioAtual;

            const res = await this._req(dados);
            if (res.success) {
                msg?.sucesso('✓ Checklist aprovado e concluído!');
                setTimeout(() => { window.location.href = '/templates/4m-checklist.html'; }, 2500);
            } else {
                msg?.erro('Erro ao finalizar: ' + (res.message || 'tente novamente.'));
            }
        } catch (e) { msg?.erro('Erro: ' + e.message); }
    }

    async _req(dados) {
        const sc    = window.sistemaChecklist;
        const nc    = sc?.numeroControleAtual || dados.numero_controle;
        const modo  = sc?.modoEdicao || false;
        const token = localStorage.getItem('authToken');

        const method = modo ? 'PUT' : 'POST';
        const url    = modo ? `${API_URL}/fr0062/${nc}` : `${API_URL}/fr0062`;

        const headers = { 'Content-Type': 'application/json' };
        if (token && token !== 'null' && token !== 'undefined')
            headers['Authorization'] = `Bearer ${token}`;

        const r = await fetch(url, { method, headers, body: JSON.stringify(dados) });
        return r.json();
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
            ov.querySelector('#_mc_yes').onclick = () => { ov.remove(); resolve(true);  };
            ov.querySelector('#_mc_no').onclick  = () => { ov.remove(); resolve(false); };
        });
    }

    /* ════════════════════════════════════════════════════════════
       BARRA DE PROGRESSO
    ════════════════════════════════════════════════════════════ */

    _criarBarraProgresso() {
        const barra = document.createElement('div');
        barra.id = 'barra-etapas';

        const etapas = [
            { n: 1, label: 'PRODUÇÃO',  cor: '#1565C0' },
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
        const ativa  = etapaN[this.statusAtual] || 1;

        barra.querySelectorAll('.barra-step').forEach(step => {
            const n = +step.dataset.n;
            step.classList.remove('step-ok', 'step-ativa', 'step-inativa');
            const num = step.querySelector('.barra-num');

            if (ativa > 3 || n < ativa)     { step.classList.add('step-ok');     num.textContent = '✓'; }
            else if (n === ativa)            { step.classList.add('step-ativa');  num.textContent = n; }
            else                             { step.classList.add('step-inativa'); num.textContent = n; }
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
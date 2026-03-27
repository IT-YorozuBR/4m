/**
 * VALIDAÇÕES DE CAMPOS OBRIGATÓRIOS — FORMULÁRIO 4M (FR0062)
 *
 * Adaptado à estrutura REAL do HTML (sem alterar nenhum ID existente):
 *
 * 1. SAKANOBORI (4 colunas: MAN / MACHINE / MATERIAL / METHOD)
 *    Estrutura: .secao-sakanobori
 *      → checkbox[0] = NÃO  |  checkbox[1] = SIM
 *      → span.input-line[contenteditable] = QTD
 *    Regra: QTD obrigatório apenas quando SIM estiver marcado.
 *
 * 2. RESULTADO AVALIAÇÃO (3 conjuntos: MACHINE / MATERIAL / METHOD)
 *    Estrutura: .secao-resultado  ↔  .secao-justificativa  (pareados por índice)
 *      .secao-resultado → checkbox OK → checkboxes internos (2D/CMM/MACRO/OUTROS) obrigatórios
 *      .secao-justificativa → checkbox NOK → span.input-line de justificativa obrigatórios
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────
  // CSS dinâmico
  // ─────────────────────────────────────────────────────────
  const CSS = `
    .campo-obrigatorio-ativo {
      outline: 2px solid #f0a500 !important;
      background-color: #fffbe6 !important;
      border-radius: 2px;
    }
    .campo-erro-validacao {
      outline: 2px solid #e53935 !important;
      background-color: #fff5f5 !important;
      border-radius: 2px;
    }
    .msg-erro-4m {
      display: inline-block;
      color: #e53935;
      font-size: 0.7rem;
      font-weight: bold;
      margin-left: 4px;
    }
    .asterisco-req {
      color: red;
      font-size: 0.8rem;
      margin-left: 1px;
    }
    .qtd-bloqueado {
      opacity: 0.4;
      pointer-events: none;
      background-color: #efefef !important;
      outline: 1px dashed #bbb !important;
    }
  `;

  function injetarCSS() {
    if (document.getElementById('css-val-4m')) return;
    const s = document.createElement('style');
    s.id = 'css-val-4m';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ─────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────
  function isVazio(el) {
    if (!el) return true;
    if (el.tagName === 'INPUT') return !el.value.trim();
    return !(el.textContent || el.innerText || '').trim();
  }

  function marcarErro(el, msg) {
    if (!el) return;
    el.classList.add('campo-erro-validacao');
    el.classList.remove('campo-obrigatorio-ativo');
    // Remove msg anterior se houver
    const anterior = el.parentNode && el.parentNode.querySelector('.msg-erro-4m');
    if (anterior) anterior.remove();
    if (msg) {
      const span = document.createElement('span');
      span.className = 'msg-erro-4m';
      span.textContent = msg;
      el.insertAdjacentElement('afterend', span);
    }
  }

  function limparErro(el) {
    if (!el) return;
    el.classList.remove('campo-erro-validacao');
    const next = el.nextElementSibling;
    if (next && next.classList.contains('msg-erro-4m')) next.remove();
  }

  function adicionarAsterisco(el) {
    if (!el || el.querySelector('.asterisco-req')) return;
    const ast = document.createElement('span');
    ast.className = 'asterisco-req';
    ast.textContent = ' *';
    el.appendChild(ast);
  }

  function removerAsterisco(el) {
    if (!el) return;
    const ast = el.querySelector('.asterisco-req');
    if (ast) ast.remove();
  }

  // ─────────────────────────────────────────────────────────
  // 1. SAKANOBORI
  // ─────────────────────────────────────────────────────────
  function initSakanobori() {
    document.querySelectorAll('.secao-sakanobori').forEach(function (bloco) {
      const cbs     = bloco.querySelectorAll('input[type="checkbox"]');
      const qtdSpan = bloco.querySelector('span.input-line[contenteditable]');

      if (cbs.length < 2 || !qtdSpan) return;

      // Identifica pelo aria-label; fallback posicional
      let cbNao = null, cbSim = null;
      cbs.forEach(function (cb) {
        const lbl = (cb.getAttribute('aria-label') || '').toLowerCase();
        if (lbl.includes('não') || lbl.includes('nao')) cbNao = cb;
        else if (lbl.includes('sim'))                    cbSim = cb;
      });
      if (!cbNao) cbNao = cbs[0];
      if (!cbSim) cbSim = cbs[1];

      // Label "QTD:" para asterisco
      const labelQtd = Array.from(bloco.querySelectorAll('span')).find(function (s) {
        return s.textContent.replace(/\s|\*/g, '').toLowerCase() === 'qtd:';
      });

      function atualizar() {
        if (cbSim.checked) {
          qtdSpan.classList.add('campo-obrigatorio-ativo');
          qtdSpan.classList.remove('qtd-bloqueado');
          qtdSpan.contentEditable = 'true';
          adicionarAsterisco(labelQtd);
        } else {
          qtdSpan.classList.remove('campo-obrigatorio-ativo');
          qtdSpan.classList.add('qtd-bloqueado');
          qtdSpan.contentEditable = 'false';
          qtdSpan.textContent = '';
          limparErro(qtdSpan);
          removerAsterisco(labelQtd);
        }
      }

      cbNao.addEventListener('change', function () {
        if (cbNao.checked) cbSim.checked = false;
        atualizar();
      });
      cbSim.addEventListener('change', function () {
        if (cbSim.checked) cbNao.checked = false;
        atualizar();
      });

      atualizar();
    });
  }

  // ─────────────────────────────────────────────────────────
  // 1.1 GARANTIA 200%
  // ─────────────────────────────────────────────────────────
  function initGarantia200() {
    document.querySelectorAll('.secao-garantia').forEach(function (bloco) {
      const cbs = bloco.querySelectorAll('input[type="checkbox"]');
      const campoTexto = bloco.querySelector('span.input-line[contenteditable]');

      if (cbs.length < 2 || !campoTexto) return;

      let cbNao = null, cbSim = null;
      cbs.forEach(function (cb) {
        const lbl = (cb.getAttribute('aria-label') || '').toLowerCase();
        if (lbl.includes('não') || lbl.includes('nao')) cbNao = cb;
        else if (lbl.includes('sim')) cbSim = cb;
      });

      if (!cbNao) cbNao = cbs[0];
      if (!cbSim) cbSim = cbs[1];

      const labelGarantia = Array.from(bloco.querySelectorAll('span')).find(function (s) {
        return s.textContent.replace(/\s|\*/g, '').toLowerCase() === 'garantia200%';
      });

      function atualizar() {
        if (cbSim.checked) {
          campoTexto.classList.add('campo-obrigatorio-ativo');
          campoTexto.classList.remove('qtd-bloqueado');
          campoTexto.contentEditable = 'true';
          adicionarAsterisco(labelGarantia);
          limparErro(campoTexto);
          return;
        }

        campoTexto.classList.remove('campo-obrigatorio-ativo');
        campoTexto.classList.add('qtd-bloqueado');
        campoTexto.contentEditable = 'false';
        campoTexto.textContent = '';
        limparErro(campoTexto);
        removerAsterisco(labelGarantia);
      }

      cbNao.addEventListener('change', function () {
        if (cbNao.checked) cbSim.checked = false;
        atualizar();
      });

      cbSim.addEventListener('change', function () {
        if (cbSim.checked) cbNao.checked = false;
        atualizar();
      });

      atualizar();
    });
  }

  function initMeiosAvaliacao() {
    document.querySelectorAll('.secao-meios').forEach(function (bloco) {
      const cbOutros = bloco.querySelector('input[aria-label*="Avaliação Outros"]');
      const campoTexto = bloco.querySelector('.checkbox-group:last-child span.input-line[contenteditable]');
      const labelOutros = bloco.querySelector('.checkbox-group:last-child label');

      if (!cbOutros || !campoTexto || !labelOutros) return;

      function atualizar() {
        if (cbOutros.checked) {
          campoTexto.classList.add('campo-obrigatorio-ativo');
          campoTexto.classList.remove('qtd-bloqueado');
          campoTexto.contentEditable = 'true';
          adicionarAsterisco(labelOutros);
          limparErro(campoTexto);
          return;
        }

        campoTexto.classList.remove('campo-obrigatorio-ativo');
        campoTexto.classList.add('qtd-bloqueado');
        campoTexto.contentEditable = 'false';
        campoTexto.textContent = '';
        limparErro(campoTexto);
        removerAsterisco(labelOutros);
      }

      cbOutros.addEventListener('change', atualizar);
      atualizar();
    });
  }

  // ─────────────────────────────────────────────────────────
  // 2. RESULTADO AVALIAÇÃO — OK / NOK
  // ─────────────────────────────────────────────────────────
  function initResultadoAvaliacao() {
    const resultados     = Array.from(document.querySelectorAll('.secao-resultado'));
    const justificativas = Array.from(document.querySelectorAll('.secao-justificativa'));
    const total = Math.min(resultados.length, justificativas.length);

    for (let i = 0; i < total; i++) {
      configurarParOkNok(resultados[i], justificativas[i]);
    }
  }

  function configurarParOkNok(blocoOk, blocoNok) {
    // Checkbox OK = primeiro checkbox dentro de .secao-resultado
    const cbOk = blocoOk.querySelector('input[type="checkbox"]');

    const checklistItens = Array.from(
      blocoOk.querySelectorAll('.resultado-col-interna .input-item, .input-item')
    ).map(function (item) {
      return {
        cb: item.querySelector('input[type="checkbox"]'),
        label: item.querySelector('label'),
        span: item.querySelector('span.input-line[contenteditable]')
      };
    }).filter(function (item) {
      return item.cb && item.label && item.span;
    });

    // Checkbox NOK = primeiro checkbox de .secao-justificativa
    const cbNok = blocoNok.querySelector('input[type="checkbox"]');

    // Spans de texto livre da justificativa
    const spansJust = Array.from(
      blocoNok.querySelectorAll('span.input-line[contenteditable]')
    );

    // Label "JUSTIFICATIVA" para asterisco
    const labelJust = blocoNok.querySelector('.justificativa-linha .label-bold');
    const labelGarantia = Array.from(blocoOk.querySelectorAll('.label-bold')).find(function (el) {
      return (el.textContent || '').replace(/\s|\*/g, '').toLowerCase() === 'garantia200%';
    });
    const spanGarantia = blocoOk.querySelector('.input-line[style*="margin-top: auto"]')
      || blocoOk.querySelector('.input-line:last-child');

    if (!cbOk || !cbNok) return;

    function alternarCampoTexto(span, label, ativo) {
      if (!span) return;

      if (ativo) {
        span.classList.add('campo-obrigatorio-ativo');
        span.classList.remove('qtd-bloqueado');
        span.contentEditable = 'true';
        if (label) adicionarAsterisco(label);
        limparErro(span);
        return;
      }

      span.classList.remove('campo-obrigatorio-ativo');
      span.classList.add('qtd-bloqueado');
      span.contentEditable = 'false';
      span.textContent = '';
      limparErro(span);
      if (label) {
        label.classList.remove('campo-obrigatorio-ativo');
        removerAsterisco(label);
        limparErro(label);
      }
    }

    function atualizarCamposChecklist() {
      checklistItens.forEach(function (item) {
        const ativo = cbOk.checked && item.cb.checked;
        if (ativo) {
          item.label.classList.add('campo-obrigatorio-ativo');
        } else {
          item.label.classList.remove('campo-obrigatorio-ativo');
        }
        alternarCampoTexto(item.span, item.label, ativo);
      });
    }

    function ativarOk() {
      cbNok.checked = false;
      desativarNok();
      atualizarCamposChecklist();
      alternarCampoTexto(spanGarantia, labelGarantia, true);
    }

    function desativarOk() {
      atualizarCamposChecklist();
      alternarCampoTexto(spanGarantia, labelGarantia, false);
    }

    function ativarNok() {
      cbOk.checked = false;
      desativarOk();

      spansJust.forEach(function (sp) {
        alternarCampoTexto(sp, labelJust, true);
      });
    }

    function desativarNok() {
      spansJust.forEach(function (sp) {
        alternarCampoTexto(sp, labelJust, false);
      });
    }

    cbOk.addEventListener('change', function () {
      if (cbOk.checked) ativarOk(); else desativarOk();
    });

    cbNok.addEventListener('change', function () {
      if (cbNok.checked) ativarNok(); else desativarNok();
    });

    checklistItens.forEach(function (item) {
      item.cb.addEventListener('change', function () {
        atualizarCamposChecklist();
      });
    });

    // Estado inicial
    desativarOk();
    desativarNok();
    if (cbOk.checked) ativarOk();
    if (cbNok.checked) ativarNok();
  }

  // ─────────────────────────────────────────────────────────
  // 3. VALIDAÇÃO AO SALVAR / FINALIZAR
  // ─────────────────────────────────────────────────────────
  function initValidacaoSubmit() {
    const btns = [
      document.getElementById('btnSalvarCheck'),
      document.getElementById('btnFinalizarcheck')
    ];

    btns.forEach(function (btn) {
      if (!btn) return;
      btn.addEventListener('click', function (e) {
        const ok = validarTudo();
        if (!ok) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      }, true);
    });
  }

  function validarTudo() {
    let valido = true;

    // Limpa erros anteriores
    document.querySelectorAll('.campo-erro-validacao').forEach(limparErro);
    document.querySelectorAll('.msg-erro-4m').forEach(function (el) { el.remove(); });

    // ── SAKANOBORI ──────────────────────────────────────────
    document.querySelectorAll('.secao-sakanobori').forEach(function (bloco) {
      const cbs     = bloco.querySelectorAll('input[type="checkbox"]');
      const qtdSpan = bloco.querySelector('span.input-line[contenteditable]');
      if (!qtdSpan || cbs.length < 2) return;

      let cbSim = null;
      cbs.forEach(function (cb) {
        const lbl = (cb.getAttribute('aria-label') || '').toLowerCase();
        if (lbl.includes('sim')) cbSim = cb;
      });
      if (!cbSim) cbSim = cbs[1];

      if (cbSim && cbSim.checked && isVazio(qtdSpan)) {
        marcarErro(qtdSpan, 'Informe a QTD');
        valido = false;
      }
    });

    // ── GARANTIA 200% ──────────────────────────────────────
    document.querySelectorAll('.secao-garantia').forEach(function (bloco) {
      const cbs = bloco.querySelectorAll('input[type="checkbox"]');
      const campoTexto = bloco.querySelector('span.input-line[contenteditable]');
      if (!campoTexto || cbs.length < 2) return;

      let cbSim = null;
      cbs.forEach(function (cb) {
        const lbl = (cb.getAttribute('aria-label') || '').toLowerCase();
        if (lbl.includes('sim')) cbSim = cb;
      });
      if (!cbSim) cbSim = cbs[1];

      if (cbSim && cbSim.checked && isVazio(campoTexto)) {
        marcarErro(campoTexto, 'Informe a Garantia 200%');
        valido = false;
      }
    });

    // ── RESULTADO AVALIAÇÃO ─────────────────────────────────
    const resultados     = Array.from(document.querySelectorAll('.secao-resultado'));
    const justificativas = Array.from(document.querySelectorAll('.secao-justificativa'));
    const total = Math.min(resultados.length, justificativas.length);

    for (let i = 0; i < total; i++) {
      const blocoOk  = resultados[i];
      const blocoNok = justificativas[i];

      const cbOk  = blocoOk.querySelector('input[type="checkbox"]');
      const cbNok = blocoNok.querySelector('input[type="checkbox"]');

      // OK marcado → exige ao menos 1 checklist interno marcado
      if (cbOk && cbOk.checked) {
        const itens = blocoOk.querySelectorAll(
          '.resultado-col-interna input[type="checkbox"], .input-item input[type="checkbox"]'
        );
        const marcado = Array.from(itens).some(function (cb) { return cb.checked; });
        if (!marcado && itens.length > 0) {
          const labelRef = blocoOk.querySelector('.resultado-col-interna label, .input-item label');
          marcarErro(labelRef, 'Marque ao menos um item');
          valido = false;
        }

        const garantia200 = blocoOk.querySelector('.input-line[style*="margin-top: auto"]')
          || blocoOk.querySelector('.input-line:last-child');
        if (garantia200 && isVazio(garantia200)) {
          marcarErro(garantia200, 'Garantia 200% obrigatória');
          valido = false;
        }
      }

      // NOK marcado → exige justificativa preenchida
      if (cbNok && cbNok.checked) {
        const spansJust = blocoNok.querySelectorAll('span.input-line[contenteditable]');
        spansJust.forEach(function (sp) {
          if (isVazio(sp)) {
            marcarErro(sp, 'Justificativa obrigatória');
            valido = false;
          }
        });
      }
    }

    // Scrolla até o primeiro erro
    const primeiro = document.querySelector('.campo-erro-validacao');
    if (primeiro) primeiro.scrollIntoView({ behavior: 'smooth', block: 'center' });

    return valido;
  }

  // ─────────────────────────────────────────────────────────
  // BOOT
  // ─────────────────────────────────────────────────────────
  function init() {
    injetarCSS();
    initSakanobori();
    initGarantia200();
    initMeiosAvaliacao();
    initResultadoAvaliacao();
    initValidacaoSubmit();
    console.info('[FR0062] Validações inicializadas com sucesso.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

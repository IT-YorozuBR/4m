const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const QUANTIDADE = 25;
const BATCH_SIZE = 25;

const OPERADORES = [
  { nome: 'João Silva', matricula: '10023' },
  { nome: 'Maria Santos', matricula: '10045' },
  { nome: 'Pedro Oliveira', matricula: '10078' },
  { nome: 'Ana Costa', matricula: '10091' },
  { nome: 'Carlos Mendes', matricula: '10102' },
  { nome: 'Lucia Ferreira', matricula: '10114' },
  { nome: 'Bruno Alves', matricula: '10130' },
  { nome: 'Fernanda Rocha', matricula: '10141' }
];

const CONTAS_POR_STATUS = {
  em_andamento: 'operador',
  aguardando_qualidade: 'qualidade',
  aguardando_aprovacao_qualidade: 'aprovador.qualidade',
  aguardando_aprovacao: 'aprovador.qualidade',
  concluido: 'admin.ti',
  finalizado: 'admin.ti'
};

// Pesos aproximam um funil real: mais itens no início do fluxo, poucos no fim.
const STATUS_PESOS = [
  ['em_andamento', 5],
  ['aguardando_qualidade', 5],
  ['aguardando_aprovacao_qualidade', 4],
  ['aguardando_aprovacao', 3],
  ['concluido', 6],
  ['finalizado', 2]
];
const STATUS_SORTEIO = STATUS_PESOS.flatMap(([status, peso]) => Array(peso).fill(status));

const MOTIVOS = [
  'Troca de operador por afastamento',
  'Atualização de instrução de trabalho',
  'Substituição de matéria-prima por indisponibilidade do fornecedor',
  'Ajuste de parâmetro de máquina após manutenção',
  'Novo método de inspeção implementado',
  'Reposição de ferramenta desgastada',
  'Alteração de fornecedor homologado',
  'Correção de não conformidade de processo'
];

const PROJETOS = ['PRJ-2026-001', 'PRJ-2026-014', 'PRJ-2026-027', 'PRJ-2026-033', 'PRJ-2026-048'];

const ACOMPANHAMENTO_BASE = [
  { nome_norma: 'DESIGN FMEA', responsavel: 'ENGa' },
  { nome_norma: 'QUALIDADE KFD', responsavel: 'QUAL.' },
  { nome_norma: 'DESENHO PRODUTO', responsavel: 'ENGa' },
  { nome_norma: 'FMEA PROCESSO', responsavel: 'ENGa' },
  { nome_norma: 'PADRÃO INSPEÇÃO', responsavel: 'QUAL.' },
  { nome_norma: 'PLANO DE CONTROLE', responsavel: 'ENGa' },
  { nome_norma: 'INSTRUÇÃO DE TRABALHO', responsavel: 'PROD.' },
  { nome_norma: 'CHECK LIST', responsavel: 'QUAL.' }
];

function sortear(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

function bool(chanceTrue = 0.5) {
  return Math.random() < chanceTrue;
}

function gerarDataAleatoria(diasAtras = 90) {
  const agora = new Date();
  return new Date(agora.getTime() - Math.random() * diasAtras * 24 * 60 * 60 * 1000);
}

function gerarMudanca4M(tipo) {
  return {
    tipo,
    item_modificado: sortear(MOTIVOS),
    nome: sortear(OPERADORES).nome,
    motivo: sortear(MOTIVOS),
    projeto: sortear(PROJETOS),
    numero_operacao: `OP-${String(Math.floor(Math.random() * 90) + 10)}`,
    importancia_normal: bool(0.6),
    importancia_importante_as: bool(0.4),
    data_turno: gerarDataAleatoria(30).toISOString().slice(0, 10),
    turno_1t: bool(0.4),
    turno_2t: bool(0.3),
    turno_3t: bool(0.3),
    modificacao: sortear(MOTIVOS),
    registro: `REG-${Math.floor(Math.random() * 9000) + 1000}`,
    garantia_200_sim: bool(0.5),
    garantia_200_nao: bool(0.5),
    garantia_200_valor: String(Math.floor(Math.random() * 500)),
    lote_prod_garantido: `LOTE-${Math.floor(Math.random() * 9000) + 1000}`,
    sakanobori_nao: bool(0.7),
    sakanobori_sim: bool(0.3),
    sakanobori_qtd: String(Math.floor(Math.random() * 50)),
    qtd_yab: String(Math.floor(Math.random() * 200)),
    qtd_nba: String(Math.floor(Math.random() * 200)),
    acompanhamento_qa: sortear(OPERADORES).nome,
    avaliacao_2d: bool(0.5),
    avaliacao_cmm: bool(0.5),
    avaliacao_macro: bool(0.5),
    avaliacao_outros: bool(0.2),
    avaliacao_outros_texto: ''
  };
}

function gerarChecklistAleatorio(numero) {
  const status = sortear(STATUS_SORTEIO);
  const criador = sortear(OPERADORES);
  const conta = CONTAS_POR_STATUS[status];

  const dataCriacao = gerarDataAleatoria(90);
  const dataAtualizacao = new Date(dataCriacao.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000);

  return {
    numero_controle: `FR0062-${String(numero).padStart(9, '0')}`,
    status,
    criador_nome: criador.nome,
    criador_matricula: criador.matricula,
    criado_por: conta === 'operador' ? 'operador' : criador.nome,
    atualizado_por: conta,
    solicitado_por: criador.nome,
    aprovado_por: ['concluido', 'finalizado'].includes(status) ? sortear(OPERADORES).nome : '',
    confirmado_por: ['aguardando_aprovacao', 'concluido', 'finalizado'].includes(status) ? sortear(OPERADORES).nome : '',
    elaborado_por: criador.nome,
    executado_por: criador.nome,
    controle_elaborado_por: criador.nome,
    data_criacao: dataCriacao.toISOString(),
    data_atualizacao: dataAtualizacao.toISOString(),
    cabecalho: {
      visto_retencao_qa: sortear(OPERADORES).nome,
      setor_producao: 'Setor A',
      setor_logistica_pc: 'Setor B',
      setor_engenharia: 'Setor C',
      qualidade_aprovado: sortear(OPERADORES).nome,
      qualidade_confirmado: sortear(OPERADORES).nome,
      qualidade_executado_por: sortear(OPERADORES).nome,
      recebimento_qa: sortear(OPERADORES).nome,
      mudanca_engenharia: bool(0.4),
      mudanca_controle_prod: bool(0.4),
      mudanca_producao: bool(0.6),
      analise_risco_processo: bool(0.5),
      analise_risco_produto: bool(0.3),
      analise_risco_nao_aplicavel: bool(0.2),
      horario_aplicacao_4m: `${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`
    },
    mudancas_4m: ['MAN', 'MACHINE', 'MATERIAL', 'METHOD'].map(gerarMudanca4M),
    lista_verificacao: {
      registro_treinam_operador: bool(0.7),
      avaliacao_treinam_operador: bool(0.7),
      registro_garantia_200: bool(0.4),
      certificado_habilitacao: bool(0.6),
      importante_a: bool(0.5),
      indicador_importante_a: bool(0.5),
      avaliacao_qualidade: bool(0.7),
      nivel_tecnico_acima_i: bool(0.4),
      qualidade_produto: bool(0.8)
    },
    procedimento_normalidade: {
      pr008_sim: bool(0.5),
      pr008_nao: bool(0.5),
      pr990_sim: bool(0.5),
      pr990_nao: bool(0.5),
      pr007_sim: bool(0.5),
      pr007_nao: bool(0.5),
      pr092_sim: bool(0.5),
      pr092_nao: bool(0.5),
      justificativa: sortear(MOTIVOS)
    },
    acompanhamento: ACOMPANHAMENTO_BASE.map((item) => ({
      ...item,
      necessario_inov: bool(0.7),
      confirmado: bool(0.7)
    }))
  };
}

async function gerarChecklists() {
  try {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('🔧 GERADOR DE CHECKLISTS DE TESTE (FR0062)');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`📊 Quantidade a gerar: ${QUANTIDADE}`);
    console.log('');

    await client.connect();
    const db = client.db('4m_checklist');
    const collection = db.collection('checklists');

    console.log('✅ Conectado ao MongoDB');
    console.log('');

    const contagemAtual = await collection.countDocuments();
    console.log(`📋 Checklists existentes: ${contagemAtual}`);
    console.log('');

    let inseridos = 0;
    const tempoInicio = Date.now();

    for (let lote = 0; lote < Math.ceil(QUANTIDADE / BATCH_SIZE); lote++) {
      const tamanhoLote = Math.min(BATCH_SIZE, QUANTIDADE - lote * BATCH_SIZE);
      const documentos = [];

      for (let i = 0; i < tamanhoLote; i++) {
        const numero = contagemAtual + (lote * BATCH_SIZE) + i + 1;
        documentos.push(gerarChecklistAleatorio(numero));
      }

      const resultado = await collection.insertMany(documentos);
      inseridos += Object.keys(resultado.insertedIds).length;

      const percentual = Math.round((inseridos / QUANTIDADE) * 100);
      const barraPreenchida = Math.round(percentual / 2);
      const barraVazia = 50 - barraPreenchida;
      const barra = '█'.repeat(barraPreenchida) + '░'.repeat(barraVazia);

      console.log(`[${barra}] ${percentual}% - ${inseridos}/${QUANTIDADE} checklists`);
    }

    const tempoTotal = ((Date.now() - tempoInicio) / 1000).toFixed(2);

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('✅ SUCESSO!');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`✨ ${inseridos} checklists gerados com sucesso!`);
    console.log(`⏱️  Tempo total: ${tempoTotal}s`);
    console.log(`📈 Checklists totais no banco: ${contagemAtual + inseridos}`);
    console.log('');

    const stats = await collection.aggregate([
      { $group: { _id: '$status', quantidade: { $sum: 1 } } }
    ]).toArray();

    console.log('📊 Distribuição por Status (banco completo):');
    stats.forEach((stat) => {
      const statusLabel = {
        em_andamento: '⏳ Em Andamento',
        aguardando_qualidade: '👀 Aguardando Qualidade',
        aguardando_aprovacao_qualidade: '🔎 Aguardando Aprovação Qualidade',
        aguardando_aprovacao: '✋ Aguardando Aprovação',
        concluido: '✅ Concluído',
        finalizado: '🏁 Finalizado'
      };
      console.log(`   ${statusLabel[stat._id] || stat._id}: ${stat.quantidade}`);
    });

    console.log('');
    console.log('🚀 Rode o servidor (npm run dev) e acesse a listagem para conferir.');
    console.log('');
  } catch (error) {
    console.error('❌ ERRO ao gerar checklists:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Desconectado do MongoDB');
    console.log('');
  }
}

gerarChecklists();

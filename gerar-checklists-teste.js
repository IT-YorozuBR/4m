const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const QUANTIDADE = 1000;
const BATCH_SIZE = 100; // Inserir em lotes de 100

const USUARIOS = [
  'João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Mendes',
  'Lucia Ferreira', 'Bruno Alves', 'Fernanda Rocha', 'Ricardo Gomes', 'Camila Souza'
];

const DEPARTAMENTOS = [
  'Produção', 'Qualidade', 'Aprovação', 'Administração', 'Logística'
];

const STATUS = [
  'em_andamento',
  'aguardando_qualidade',
  'aguardando_aprovacao',
  'concluido'
];

function gerarDataAleatoria(diasAtras = 90) {
  const agora = new Date();
  const data = new Date(agora.getTime() - Math.random() * diasAtras * 24 * 60 * 60 * 1000);
  return data.toISOString();
}

function gerarChecklistAleatorio(numero) {
  const dataUltimosAtualizacao = gerarDataAleatoria();
  const dataCriacao = new Date(new Date(dataUltimosAtualizacao).getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
  
  return {
    numero_controle: `FR0062-${String(numero).padStart(9, '0')}`,
    solicitado_por: USUARIOS[Math.floor(Math.random() * USUARIOS.length)],
    departamento: DEPARTAMENTOS[Math.floor(Math.random() * DEPARTAMENTOS.length)],
    status: STATUS[Math.floor(Math.random() * STATUS.length)],
    criado_por: USUARIOS[Math.floor(Math.random() * USUARIOS.length)],
    atualizado_por: USUARIOS[Math.floor(Math.random() * USUARIOS.length)],
    data_criacao: dataCriacao.toISOString(),
    data_atualizacao: dataUltimosAtualizacao,
    descricao: `Checklist de teste ${numero} - Gerado para testes de paginação`,
    observacoes: Math.random() > 0.5 ? 'Alguma observação de teste' : '',
    itens_checklist: [
      { nome: 'Item 1', concluido: Math.random() > 0.3 },
      { nome: 'Item 2', concluido: Math.random() > 0.3 },
      { nome: 'Item 3', concluido: Math.random() > 0.3 }
    ]
  };
}

async function gerarChecklists() {
  try {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('🔧 GERADOR DE CHECKLISTS DE TESTE');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`📊 Quantidade a gerar: ${QUANTIDADE}`);
    console.log(`📦 Tamanho do lote: ${BATCH_SIZE}`);
    console.log('');

    // Conectar ao MongoDB
    await client.connect();
    const db = client.db("4m_checklist");
    const collection = db.collection('checklists');

    console.log('✅ Conectado ao MongoDB');
    console.log('');

    // Verificar se a coleção já tem dados
    const contagemAtual = await collection.countDocuments();
    console.log(`📋 Checklists existentes: ${contagemAtual}`);
    console.log('');

    // Perguntar se deseja continuar
    if (contagemAtual > 0) {
      console.log('⚠️  A coleção já contém dados. Os novos checklists serão ADICIONADOS.');
      console.log('');
    }

    // Gerar e inserir em lotes
    let inseridos = 0;
    const tempoInicio = Date.now();

    for (let lote = 0; lote < QUANTIDADE / BATCH_SIZE; lote++) {
      const documentos = [];
      
      for (let i = 0; i < BATCH_SIZE; i++) {
        const numero = contagemAtual + (lote * BATCH_SIZE) + i + 1;
        documentos.push(gerarChecklistAleatorio(numero));
      }

      // Inserir lote
      const resultado = await collection.insertMany(documentos);
      inseridos += resultado.insertedIds.length;

      // Mostrar progresso
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

    // Mostrar estatísticas
    const stats = await collection.aggregate([
      {
        $group: {
          _id: '$status',
          quantidade: { $sum: 1 }
        }
      }
    ]).toArray();

    console.log('📊 Distribuição por Status:');
    stats.forEach(stat => {
      const statusLabel = {
        'em_andamento': '⏳ Em Andamento',
        'aguardando_qualidade': '👀 Aguardando Qualidade',
        'aguardando_aprovacao': '✋ Aguardando Aprovação',
        'concluido': '✅ Concluído'
      };
      console.log(`   ${statusLabel[stat._id] || stat._id}: ${stat.quantidade}`);
    });

    console.log('');
    console.log('🚀 Você pode testar a paginação agora!');
    console.log('');
    console.log('💡 URLs para testar:');
    console.log(`   http://localhost:3001/api/fr0062?pagina=1&limite=10`);
    console.log(`   http://localhost:3001/api/fr0062?pagina=1&limite=20`);
    console.log(`   http://localhost:3001/api/fr0062?pagina=2&limite=10`);
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

// Executar
gerarChecklists();
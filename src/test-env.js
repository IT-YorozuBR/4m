// test-env.js
const path = require('path');
const fs = require('fs');

console.log('=== TESTE DE CARREGAMENTO .env ===\n');

// Teste 1: Verificar arquivo .env
const envPath = path.join(__dirname, '.env');
console.log('1. Verificando arquivo .env...');
console.log('   Caminho:', envPath);

if (fs.existsSync(envPath)) {
    console.log('   ✅ Arquivo .env encontrado');
    
    // Ler conteúdo
    const content = fs.readFileSync(envPath, 'utf8');
    console.log('   Conteúdo (primeiras 3 linhas):');
    content.split('\n').slice(0, 3).forEach(line => {
        if (line.trim() && !line.trim().startsWith('#')) {
            console.log('   ', line.substring(0, 60) + (line.length > 60 ? '...' : ''));
        }
    });
} else {
    console.log('   ❌ Arquivo .env NÃO encontrado!');
    console.log('   Crie um arquivo .env na raiz com:');
    console.log('   MONGODB_URI=sua_string_de_conexao');
}

// Teste 2: Testar dotenv
console.log('\n2. Testando dotenv...');
try {
    require('dotenv').config({ path: envPath });
    console.log('   ✅ dotenv carregado');
} catch (error) {
    console.log('   ❌ Erro ao carregar dotenv:', error.message);
}

// Teste 3: Verificar MONGODB_URI
console.log('\n3. Verificando MONGODB_URI...');
if (process.env.MONGODB_URI) {
    console.log('   ✅ MONGODB_URI encontrada');
    console.log('   Tamanho:', process.env.MONGODB_URI.length, 'caracteres');
    console.log('   Primeiros 50 chars:', process.env.MONGODB_URI.substring(0, 50) + '...');
    
    // Verificar se começa corretamente
    if (process.env.MONGODB_URI.startsWith('mongodb://') || 
        process.env.MONGODB_URI.startsWith('mongodb+srv://')) {
        console.log('   ✅ Formato correto');
    } else {
        console.log('   ❌ Formato incorreto!');
        console.log('   Deve começar com mongodb:// ou mongodb+srv://');
    }
} else {
    console.log('   ❌ MONGODB_URI NÃO definida!');
    console.log('   Adicione ao .env: MONGODB_URI=string_de_conexao');
}

console.log('\n=== FIM DO TESTE ===');
#!/bin/bash
# render-build.sh
echo "🚀 Iniciando build no Render..."

# Instala dependências
npm install --production

# Verifica instalação
if [ -d "node_modules/mongodb" ]; then
    echo "✅ MongoDB instalado com sucesso"
else
    echo "❌ ERRO: MongoDB não foi instalado"
    exit 1
fi

echo "✅ Build concluído com sucesso"
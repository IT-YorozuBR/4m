const app = express();

const FR0062Route = require('./src/routes/FR0062/route');
app.use('/FR0062', FR0062Route);


app.post('/FR0062', async (req, res) => {
    const dados = req.body;

    console.log('dados recebidos:', dados);

    if (!dados.numero_controle) {
        return res.status(400).json({
            success: false,
            message: 'Número de controle é obrigatório'
        });
    }

    try {
        const formularioDir = path.join(__dirname, '..', 'data', 'formularios');
        if (!fsSync.existsSync(formularioDir)) {
            fsSync.mkdirSync(formularioDir, { recursive: true });
        }

        const arquivoFormulario = path.join(formularioDir, `${dados.numero_controle}.json`);
        await fs.writeFile(arquivoFormulario, JSON.stringify(dados, null, 2));
        console.log('✓ Arquivo JSON salvo:', arquivoFormulario);
    } catch (error) {
        console.error('✗ Erro ao salvar o arquivo JSON:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao salvar o formulário'
        });
    }

    res.json({
        success: true,
        message: 'Formulário salvo com sucesso'
    }); 
});
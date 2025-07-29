// server.js

// Importa os pacotes necessários
const express = require('express');
const axios = require('axios');
const cors = require('cors');

// Cria a aplicação Express
const app = express();
const port = 3000;

// --- Middlewares ---
// Habilita o CORS para permitir que nosso front-end (mesmo em um arquivo local)
// se comunique com este servidor.
app.use(cors());

// Habilita o parsing de JSON no corpo das requisições
app.use(express.json());


// --- Rotas do Proxy ---

/**
 * Rota para autenticação.
 * Recebe 'user' e 'senha' do front-end e os repassa para a API da SED.
 */
app.post('/api/login', async (req, res) => {
    const { user, senha } = req.body;

    // Validação básica de entrada
    if (!user || !senha) {
        return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
    }

    const loginApiKey = '2b03c1db3884488795f79c37c069381a';
    const apiUrl = 'https://sedintegracoes.educacao.sp.gov.br/credenciais/api/LoginCompletoToken';

    console.log(`[LOGIN] Recebida requisição para o usuário: ${user}`);

    try {
        // Faz a chamada para a API real da SED
        const response = await axios.post(apiUrl, {
            user: user,
            senha: senha
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Ocp-Apim-Subscription-Key': loginApiKey
            }
        });

        console.log(`[LOGIN] Sucesso para o usuário: ${user}. Enviando dados de volta para o cliente.`);
        // Envia a resposta da API da SED de volta para o front-end
        res.json(response.data);

    } catch (error) {
        console.error('[LOGIN] Erro ao chamar a API da SED:', error.response ? error.response.data : error.message);
        
        // Repassa o erro da API da SED para o front-end
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { message: 'Erro interno no servidor proxy.' };
        res.status(status).json(data);
    }
});


/**
 * Rota para buscar as turmas.
 * Recebe o 'codigoAluno' como parâmetro de URL.
 */
app.get('/api/turmas/:codigoAluno', async (req, res) => {
    const { codigoAluno } = req.params;

    if (!codigoAluno) {
        return res.status(400).json({ message: 'Código do aluno é obrigatório.' });
    }

    const turmasApiKey = '5936fddda3484fe1aa4436df1bd76dab';
    const apiUrl = `https://sedintegracoes.educacao.sp.gov.br/apihubintegracoes/api/v2/Turma/ListarTurmasPorAluno?codigoAluno=${codigoAluno}`;

    console.log(`[TURMAS] Recebida requisição para o código de aluno: ${codigoAluno}`);

    try {
        // Faz a chamada para a API real da SED
        const response = await axios.get(apiUrl, {
            headers: {
                'Ocp-Apim-Subscription-Key': turmasApiKey
            }
        });

        console.log(`[TURMAS] Sucesso para o código: ${codigoAluno}. Enviando dados de volta para o cliente.`);
        // Envia a resposta de volta para o front-end
        res.json(response.data);

    } catch (error) {
        console.error('[TURMAS] Erro ao chamar a API da SED:', error.response ? error.response.data : error.message);

        // Repassa o erro
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { message: 'Erro interno no servidor proxy.' };
        res.status(status).json(data);
    }
});


// --- Inicia o Servidor ---
app.listen(port, () => {
    console.log(`Servidor proxy rodando na porta ${port}`);
    console.log(`Aguardando requisições do front-end em http://localhost:${port}`);
});


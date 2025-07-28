// Este arquivo deve estar em /api/server.js

import fetch from 'node-fetch';

// Handler principal que a Vercel irá executar
export default async function handler(req, res) {
    // Configurações de CORS para permitir que qualquer origem acesse a API
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Resposta para a requisição OPTIONS (pre-flight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Apenas aceitamos requisições POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const { user, senha } = req.body;

        if (!user || !senha) {
            return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
        }

        // --- ETAPA 1: Login para obter o Token de Acesso ---
        console.log('Etapa 1: Realizando login...');
        const loginResponse = await fetch('https://sedintegracoes.educacao.sp.gov.br/credenciais/api/LoginCompletoToken', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Ocp-Apim-Subscription-Key': '2b03c1db3884488795f79c37c069381a',
                'User-Agent': 'Mozilla/5.0'
            },
            body: JSON.stringify({ user, senha }),
        });

        if (!loginResponse.ok) {
            const errorData = await loginResponse.json();
            console.error('Erro no login SED:', errorData);
            return res.status(loginResponse.status).json({ error: `Falha na autenticação: ${errorData.Message || 'Credenciais inválidas.'}` });
        }

        const loginData = await loginResponse.json();
        const { token, codigoAluno } = loginData;
        console.log('Login bem-sucedido. Código do Aluno:', codigoAluno);

        // --- ETAPA 2: Buscar as turmas do aluno ---
        console.log('Etapa 2: Buscando turmas...');
        const turmasResponse = await fetch(`https://sedintegracoes.educacao.sp.gov.br/apihubintegracoes/api/v2/Turma/ListarTurmasPorAluno?codigoAluno=${codigoAluno}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Ocp-Apim-Subscription-Key': '5936fddda3484fe1aa4436df1bd76dab',
                'User-Agent': 'Mozilla/5.0'
            }
        });

        if (!turmasResponse.ok) {
            throw new Error('Não foi possível buscar os dados das turmas.');
        }
        
        const turmasData = await turmasResponse.json();
        console.log(`Encontradas ${turmasData.length} turmas.`);

        // --- ETAPA 3: Buscar os bimestres usando o ID da escola ---
        let bimestresData = null;
        if (turmasData && turmasData.length > 0) {
            const escolaId = turmasData[0].escolaId;
            console.log(`Etapa 3: Buscando bimestres para a escola ID: ${escolaId}`);
            const bimestresResponse = await fetch(`https://sedintegracoes.educacao.sp.gov.br/apihubintegracoes/api/v2/Bimestre/ListarBimestres?escolaId=${escolaId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Ocp-Apim-Subscription-Key': '5936fddda3484fe1aa4436df1bd76dab', // Mesma chave da API de turmas
                    'User-Agent': 'Mozilla/5.0'
                }
            });
            if (bimestresResponse.ok) {
                bimestresData = await bimestresResponse.json();
                console.log('Bimestres encontrados.');
            } else {
                console.warn('Não foi possível buscar os bimestres.');
            }
        }

        // --- ETAPA 4: Obter token de registro Edusp ---
        // NOTA: A API edusp-api.ip.tv pode exigir um corpo (body) específico ou outros headers.
        // O exemplo original não mostra o corpo do POST. Estou enviando um corpo vazio.
        // Pode ser necessário ajustar o `body` e os headers `x-api-platform` e `x-api-realm`.
        console.log('Etapa 4: Buscando token Edusp...');
        let eduspTokenData = null;
        try {
            const eduspResponse = await fetch('https://edusp-api.ip.tv/registration/edusp/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-platform': 'android', // Valor de exemplo
                    'x-api-realm': 'edusp',     // Valor de exemplo
                    'User-Agent': 'Mozilla/5.0'
                    // Esta API pode ou não precisar do 'Authorization': `Bearer ${token}`. Adicione se necessário.
                },
                body: JSON.stringify({}) // Corpo da requisição, pode precisar de dados.
            });

            if (eduspResponse.ok) {
                eduspTokenData = await eduspResponse.json();
                console.log('Token Edusp obtido.');
            } else {
                const errorText = await eduspResponse.text();
                console.warn('Não foi possível obter o token Edusp:', errorText);
                eduspTokenData = { error: 'Falha ao obter token Edusp', details: errorText };
            }
        } catch (eduspError) {
            console.error("Erro na chamada para Edusp:", eduspError.message);
            eduspTokenData = { error: 'Não foi possível conectar ao serviço Edusp.' };
        }


        // --- ETAPA FINAL: Enviar todos os dados compilados de volta para o frontend ---
        console.log('Enviando resposta final para o cliente.');
        res.status(200).json({
            loginData,
            turmasData,
            bimestresData,
            eduspTokenData
        });

    } catch (error) {
        console.error('Erro geral no servidor:', error);
        res.status(500).json({ error: error.message || 'Ocorreu um erro interno no servidor.' });
    }
}

    

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// ==========================================
// 1. CONFIGURAÇÕES OBRIGATÓRIAS (PREENCHA AQUI)
// ==========================================
const SUPERFRETE_TOKEN = process.env.SUPERFRETE_TOKEN;
const CEP_ORIGEM = '50741280'; // Seu CEP (apenas números)
const SEU_EMAIL = 'seu_email@contato.com'; // Para o User-Agent

// ==========================================
// 2. MEDIDAS E PESO FIXOS (PADRÃO CORREIOS)
// ==========================================
const PESO_FIXO = 0.3;        // 500 gramas
const ALTURA_FIXA = 3;      // 10 cm
const LARGURA_FIXA = 10;     // 15 cm
const COMPRIMENTO_FIXO = 13; // 20 cm

app.post('/calcular-frete', async (req, res) => {
    const { cepDestino, produtos } = req.body;

    // Limpeza de segurança do CEP
    const cepOrigemLimpo = CEP_ORIGEM.replace(/\D/g, '');
    const cepDestinoLimpo = cepDestino.replace(/\D/g, '');

    console.log(`--- Iniciando cálculo: De ${cepOrigemLimpo} para ${cepDestinoLimpo} ---`);

    // Formata os produtos conforme exigência da API
    const produtosFormatados = produtos.map(p => ({
        weight: PESO_FIXO,
        width: LARGURA_FIXA,
        height: ALTURA_FIXA,
        length: COMPRIMENTO_FIXO,
        quantity: p.quantity || 1
    }));

    try {
        // Chamada oficial para a API v0 da SuperFrete
        const response = await axios.post('https://api.superfrete.com/api/v0/calculator', {
            from: {
                postal_code: cepOrigemLimpo
            },
            to: {
                postal_code: cepDestinoLimpo
            },
            services: "1,2,17", // 1=SEDEX, 2=PAC, 17=MINI ENVIO
            options: {
                own_hand: false,
                receipt: false,
                insurance: 0,
                use_insurance_value: false
            },
            products: produtosFormatados
        }, {
            headers: { 
                'Authorization': `Bearer ${SUPERFRETE_TOKEN}`,
                'User-Agent': `MinhaLoja v1.0 (${SEU_EMAIL})`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        console.log("Sucesso! Resposta da API enviada ao frontend.");
        res.json(response.data);

    } catch (error) {
        console.error("### ERRO NA COMUNICAÇÃO ###");
        
        if (error.response) {
            // A API retornou um erro estruturado (ex: 400, 401)
            console.error("Status do Erro:", error.response.status);
            console.error("Detalhes do Erro:", JSON.stringify(error.response.data, null, 2));
            res.status(error.response.status).json(error.response.data);
        } else {
            // Erro de conexão ou timeout
            console.error("Mensagem de Erro:", error.message);
            res.status(500).json({ error: 'Erro de conexão com o servidor de frete' });
        }
    }
});

const PORTA = 3000;
app.listen(PORTA, () => {
    console.log(`=========================================`);
    console.log(`Servidor rodando em http://localhost:${PORTA}`);
    console.log(`=========================================`);
});
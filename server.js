const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// ==========================================
// 1. CONFIGURAÇÕES
// ==========================================
const SUPERFRETE_TOKEN = process.env.SUPERFRETE_TOKEN;
const CEP_ORIGEM = '50741280'; 
const SEU_EMAIL = 'blublu.nails@contato.com'; 

app.post('/calcular-frete', async (req, res) => {
    try {
        const { cepDestino, produtos = [] } = req.body;

        if (!cepDestino) {
            return res.status(400).json({ error: "CEP de destino é obrigatório" });
        }

        // --- TRAVA DE SEGURANÇA DE PESO ---
        const quantidade = produtos.length;
        let pesoParaEnvio;

        if (quantidade === 1) {
            pesoParaEnvio = 0.10; 
        } else if (quantidade === 2) {
            pesoParaEnvio = 0.20; 
        } else if (quantidade === 3) {
            pesoParaEnvio = 0.28; // Garante Mini Envios (limite é 0.30)
        } else {
            pesoParaEnvio = 0.40; // Bloqueia Mini Envios acima de 3 itens
        }

        // --- TRAVA DE SEGURANÇA DE VALOR (R$ 100) ---
        const valorTotalReal = produtos.reduce((total, p) => total + (p.price || 0), 0);
        const valorSeguroParaAPI = valorTotalReal > 100 ? 100 : valorTotalReal;

        console.log(`Itens: ${quantidade} | Peso: ${pesoParaEnvio}kg | Seguro: R$ ${valorSeguroParaAPI}`);

        // CHAMADA ÚNICA PARA A API (Atenção: só deve existir um 'const response' aqui)
        const response = await axios.post('https://api.superfrete.com/api/v0/calculator', {
            from: { postal_code: CEP_ORIGEM.replace(/\D/g, '') },
            to: { postal_code: cepDestino.replace(/\D/g, '') },
            services: "17,1,2",
            options: {
                own_hand: false,
                receipt: false,
                insurance: valorSeguroParaAPI,
                use_insurance_value: valorTotalReal <= 100
            },
            products: [{
                weight: pesoParaEnvio,
                width: 12,
                height: 4,
                length: 16,
                quantity: 1
            }]
        }, {
            headers: { 
                'Authorization': `Bearer ${SUPERFRETE_TOKEN}`,
                'User-Agent': `BlubluNails v1.0 (${SEU_EMAIL})`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        // Envia a resposta da API de volta para o seu site
        res.json(response.data);

    } catch (error) {
        console.error("Erro no cálculo:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Erro interno' });
    }
});

const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
    console.log(`Servidor Blublu Nails ativo na porta ${PORTA}`);
});
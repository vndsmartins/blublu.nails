const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// ==========================================
// 1. CONFIGURAÇÕES OBRIGATÓRIAS
// ==========================================
const SUPERFRETE_TOKEN = process.env.SUPERFRETE_TOKEN;
const CEP_ORIGEM = '50741280'; 
const SEU_EMAIL = 'seu_email@contato.com'; 

// ==========================================
// 2. MEDIDAS E PESO (AJUSTADOS PARA MINI ENVIOS)
// ==========================================
// O peso de 0.1 garante que 3 produtos = 0.3 (limite do Mini Envios)
const PESO_FIXO = 0.1;       
const ALTURA_FIXA = 4;       // Limite máximo do Mini Envios é 4cm
const LARGURA_FIXA = 12;     // Aumentado para evitar erro de dimensão mínima
const COMPRIMENTO_FIXO = 16; // Aumentado para evitar erro de dimensão mínima

app.post('/calcular-frete', async (req, res) => {
    try {
        const { cepDestino, produtos = [] } = req.body;

        // 1. CALCULANDO O PESO TOTAL
        // Cada produto vindo do site deve ter weight: 0.1
        // 3 produtos = 0.3 (Limite do Mini Envios) | 4 produtos = 0.4 (Ele some!)
        const pesoTotal = produtos.reduce((total, p) => total + (p.weight || 0.1), 0);

        // 2. TRAVA DE VALOR (Seguro)
        // Somamos o valor dos produtos. Se passar de 100, fixamos em 100 para o Mini Envios não sumir por preço.
        const valorProdutos = produtos.reduce((total, p) => total + (p.price || 0), 0);
        const valorSeguro = valorProdutos > 100 ? 100 : valorProdutos;

        const cepOrigemLimpo = CEP_ORIGEM.replace(/\D/g, '');
        const cepDestinoLimpo = cepDestino.replace(/\D/g, '');

        const response = await axios.post('https://api.superfrete.com/api/v0/calculator', {
            from: { postal_code: cepOrigemLimpo },
            to: { postal_code: cepDestinoLimpo },
            services: "17,1,2", // Mini Envios, SEDEX, PAC
            options: {
                own_hand: false,
                receipt: false,
                insurance: valorSeguro, // Usando a nossa trava de R$ 100
                use_insurance_value: valorProdutos <= 100
            },
            // Enviamos como um PACOTE ÚNICO para a altura não somar e banir o frete
            products: [{
                weight: pesoTotal,
                width: 12,
                height: 4,      // Altura fixa no limite de 4cm
                length: 16,
                quantity: 1
            }]
        }, {
            headers: { 
                'Authorization': `Bearer ${SUPERFRETE_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        res.json(response.data);

    } catch (error) {
        console.error("Erro no cálculo:", error.response?.data || error.message);
        res.status(500).json({ error: 'Erro ao calcular frete' });
    }
});

// Use process.env.PORT para o Render funcionar corretamente
const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
    console.log(`Servidor rodando na porta ${PORTA}`);
});
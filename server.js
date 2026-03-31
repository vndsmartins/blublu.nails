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
const SEU_EMAIL = 'botarr o email'; 

// ==========================================
// 2. MEDIDAS FIXAS (PADRÃO MINI ENVIOS)
// ==========================================
const ALTURA_FIXA = 4;       
const LARGURA_FIXA = 12;     
const COMPRIMENTO_FIXO = 16; 

app.post('/calcular-frete', async (req, res) => {
    try {
        const { cepDestino, produtos = [] } = req.body;

        if (!cepDestino) {
            return res.status(400).json({ error: "CEP de destino é obrigatório" });
        }

        // 3. LÓGICA DO PESO (0.09 para permitir 3 itens no limite de 0.3)
        // 1 item = 0.09 | 2 = 0.18 | 3 = 0.27 (OK) | 4 = 0.36 (SOME)
        const pesoTotal = produtos.reduce((total, p) => total + (p.weight || 0.09), 0);

        // 4. TRAVA DE VALOR (Limite de R$ 100 do Mini Envios)
        const valorProdutos = produtos.reduce((total, p) => total + (p.price || 0), 0);
        const valorSeguro = valorProdutos > 100 ? 100 : valorProdutos;

        const cepOrigemLimpo = CEP_ORIGEM.replace(/\D/g, '');
        const cepDestinoLimpo = cepDestino.replace(/\D/g, '');

        console.log(`Calculando: ${produtos.length} itens, Peso Total: ${pesoTotal.toFixed(2)}kg`);

        const response = await axios.post('https://api.superfrete.com/api/v0/calculator', {
            from: { postal_code: cepOrigemLimpo },
            to: { postal_code: cepDestinoLimpo },
            services: "17,1,2", // Mini Envios (17), PAC (1), SEDEX (2)
            options: {
                own_hand: false,
                receipt: false,
                insurance: valorSeguro, 
                use_insurance_value: valorProdutos <= 100
            },
            // IMPORTANTE: Enviamos como pacote único para a altura não acumular
            products: [{
                weight: pesoTotal,
                width: LARGURA_FIXA,
                height: ALTURA_FIXA,
                length: COMPRIMENTO_FIXO,
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
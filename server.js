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
    // Adicionei um valor padrão para produtos caso venha vazio
    const { cepDestino, produtos = [] } = req.body;

    if (!cepDestino) {
        return res.status(400).json({ error: "CEP de destino é obrigatório" });
    }

    const cepOrigemLimpo = CEP_ORIGEM.replace(/\D/g, '');
    const cepDestinoLimpo = cepDestino.replace(/\D/g, '');

    console.log(`--- Iniciando cálculo: De ${cepOrigemLimpo} para ${cepDestinoLimpo} ---`);

    // Formata os produtos usando as constantes que definimos acima
    const produtosFormatados = produtos.map(p => ({
        weight: PESO_FIXO,
        width: LARGURA_FIXA,
        height: ALTURA_FIXA,
        length: COMPRIMENTO_FIXO,
        quantity: p.quantity || 1
    }));

    try {
        const response = await axios.post('https://api.superfrete.com/api/v0/calculator', {
            from: {
                postal_code: cepOrigemLimpo
            },
            to: {
                postal_code: cepDestinoLimpo
            },
            services: "17,1,2", // 17=MINI, 1=SEDEX, 2=PAC
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

        console.log("Sucesso! Resposta enviada.");
        res.json(response.data);

    } catch (error) {
        console.error("### ERRO NA COMUNICAÇÃO ###");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Detalhes:", JSON.stringify(error.response.data, null, 2));
            res.status(error.response.status).json(error.response.data);
        } else {
            console.error("Mensagem:", error.message);
            res.status(500).json({ error: 'Erro de conexão com o servidor de frete' });
        }
    }
});

// Use process.env.PORT para o Render funcionar corretamente
const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
    console.log(`Servidor rodando na porta ${PORTA}`);
});
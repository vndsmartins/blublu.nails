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
    const { cepDestino, produtos = [] } = req.body;

    const cepOrigemLimpo = CEP_ORIGEM.replace(/\D/g, '');
    const cepDestinoLimpo = cepDestino.replace(/\D/g, '');

    // 1. Calculamos o PESO TOTAL no servidor
    // Se cada item do site vem com peso 0.1, aqui somamos todos.
    const pesoTotal = produtos.reduce((total, p) => total + (p.weight || 0.1), 0);

    console.log(`--- Calculando Pacote Único: ${pesoTotal}kg para ${cepDestinoLimpo} ---`);

    try {
        const response = await axios.post('https://api.superfrete.com/api/v0/calculator', {
            from: { postal_code: cepOrigemLimpo },
            to: { postal_code: cepDestinoLimpo },
            services: "17,1,2",
            options: {
    own_hand: false,
    receipt: false,
    insurance: 0,              // Valor do seguro zerado
    use_insurance_value: false // Diz para NÃO usar o valor dos produtos para seguro
},
            // A MUDANÇA ESTÁ AQUI: Enviamos apenas 1 "produto" que representa o pacote todo
            products: [{
                weight: pesoTotal,      // Peso somado (0.1, 0.2, 0.3...)
                width: LARGURA_FIXA,    // 12
                height: ALTURA_FIXA,    // 4 (Sempre fixo, para não banir o Mini Envios)
                length: COMPRIMENTO_FIXO, // 16
                quantity: 1             // Sempre 1 pacote
            }]
        }, {
            headers: { 
                'Authorization': `Bearer ${SUPERFRETE_TOKEN}`,
                'User-Agent': `MinhaLoja v1.0 (${SEU_EMAIL})`,
                'Content-Type': 'application/json'
            }
        });

        res.json(response.data);

    } catch (error) {
        console.error("Erro detalhes:", error.response?.data);
        res.status(500).json({ error: 'Erro no cálculo' });
    }
});

// Use process.env.PORT para o Render funcionar corretamente
const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
    console.log(`Servidor rodando na porta ${PORTA}`);
});
// --- CONFIGURAÇÕES ---
let carrinho = [];
let freteEscolhido = null;
const WHATSAPP_LOJA = "5581983115644"; // <--- COLOQUE SEU NÚMERO AQUI (DDI + DDD + Numero)

// --- FUNÇÃO ADICIONAR AO CARRINHO ---
function adicionarAoCarrinho(nome, preco) {
    // Peso de 50g para garantir que o Mini Envios apareça
    carrinho.push({ name: nome, price: preco, weight: 0.05 });
    
    // Reseta o frete pois o carrinho mudou
    freteEscolhido = null; 
    document.getElementById('area-finalizar').classList.add('hidden');
    
    atualizarCarrinho();
}

// --- ATUALIZAR VISUAL DO CARRINHO ---
function atualizarCarrinho() {
    const lista = document.getElementById('lista-carrinho');
    const subtotalText = document.getElementById('subtotal-produtos');
    
    if (carrinho.length === 0) {
        lista.innerHTML = "O carrinho está vazio...";
        subtotalText.innerText = "R$ 0,00";
        return;
    }

    const subtotal = carrinho.reduce((sum, item) => sum + item.price, 0);
    
    lista.innerHTML = carrinho.map(item => `
        <div class="flex justify-between py-1 border-b border-gray-50 italic text-gray-700">
            <span>• ${item.name}</span>
            <span class="font-bold">R$ ${item.price.toFixed(2)}</span>
        </div>
    `).join('');

    subtotalText.innerText = `R$ ${subtotal.toFixed(2)}`;
    document.getElementById('resultado-frete').innerHTML = ""; 
}

// --- CALCULAR FRETE (CONEXÃO COM RENDER) ---
async function calcularFrete() {
    const cepInput = document.getElementById('cep');
    const resDiv = document.getElementById('resultado-frete');
    const btn = document.getElementById('btn-calc');
    const cep = cepInput.value.replace(/\D/g, '');
    
    if (carrinho.length === 0) { alert("Adicione produtos primeiro!"); return; }
    if (cep.length !== 8) { alert("CEP inválido! Digite 8 números."); return; }

    resDiv.innerHTML = "<p class='animate-pulse text-pink-600 text-center py-2'>Consultando frete...</p>";
    btn.disabled = true;

    try {
        const response = await fetch('https://blublu-nails.onrender.com/calcular-frete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cepDestino: cep, produtos: carrinho })
        });

        if (!response.ok) throw new Error("Erro no servidor");

        const dados = await response.json();
        const opcoes = Array.isArray(dados) ? dados : (dados.options || []);

        if (opcoes.length === 0) {
            resDiv.innerHTML = "<p class='text-red-500 text-center'>Nenhum frete disponível para este CEP.</p>";
            return;
        }

        resDiv.innerHTML = opcoes.map(s => `
            <div onclick="selecionarFrete(this, '${s.name}', ${s.price})" 
                 class="frete-card p-3 border rounded-lg cursor-pointer flex justify-between items-center transition">
                <div>
                    <span class="font-bold text-gray-800">${s.name}</span>
                    <p class="text-xs text-gray-500">${s.delivery_time} dias úteis</p>
                </div>
                <span class="font-bold text-gray-900 text-lg">R$ ${parseFloat(s.price).toFixed(2)}</span>
            </div>
        `).join('');

    } catch (error) {
        console.error(error);
        resDiv.innerHTML = "<p class='text-red-500 text-center'>Erro ao conectar com o servidor. Tente novamente.</p>";
    } finally {
        btn.disabled = false;
    }
}

// --- SELECIONAR OPÇÃO DE FRETE ---
function selecionarFrete(elemento, nome, valor) {
    freteEscolhido = { nome, valor };

    // Estiliza o card selecionado
    document.querySelectorAll('.frete-card').forEach(card => card.classList.remove('frete-selecionado'));
    elemento.classList.add('frete-selecionado');

    // Calcula Total Geral
    const subtotal = carrinho.reduce((sum, item) => sum + item.price, 0);
    const total = subtotal + valor;

    document.getElementById('total-geral').innerText = `R$ ${total.toFixed(2)}`;
    document.getElementById('area-finalizar').classList.remove('hidden');
    
    // Rola para o botão de finalizar
    document.getElementById('area-finalizar').scrollIntoView({ behavior: 'smooth' });
}

// --- ENVIAR PARA WHATSAPP ---
function enviarPedido() {
    if (!freteEscolhido) return alert("Por favor, selecione o frete primeiro!");

    const subtotal = carrinho.reduce((sum, item) => sum + item.price, 0);
    const total = subtotal + freteEscolhido.valor;
    const cep = document.getElementById('cep').value;

    let texto = `*NOVO PEDIDO - blublu.nails*\n\n`;
    texto += `*Itens:*\n`;
    carrinho.forEach(i => texto += `• ${i.name}: R$ ${i.price.toFixed(2)}\n`);
    
    texto += `\n*Entrega:* ${freteEscolhido.nome} (R$ ${freteEscolhido.valor.toFixed(2)})`;
    texto += `\n*CEP:* ${cep}`;
    texto += `\n\n*TOTAL: R$ ${total.toFixed(2)}*`;
    texto += `\n\n_Ah! e também se quiser alterar a cor/tamaho, me envie por aqui☺️`;

    const url = `https://api.whatsapp.com/send?phone=${WHATSAPP_LOJA}&text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
}
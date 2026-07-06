// Substitua pelos seus links reais da planilha:
const URL_PRODUTOS =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaxFywWCOVsRB4dU_4_DCGK0P3kdKJXCOQdp_HgRh1YR4ZQ98j-EvH4lDK0xLVw0JkterBmymGNXi9/pub?gid=0&single=true&output=csv";
const URL_CATEGORIAS =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaxFywWCOVsRB4dU_4_DCGK0P3kdKJXCOQdp_HgRh1YR4ZQ98j-EvH4lDK0xLVw0JkterBmymGNXi9/pub?gid=1548688194&single=true&output=csv";

let produtos = [];
let categoriaSelecionada = "Todos";

// ==========================================
// CARREGAR DADOS (Google Sheets)
// ==========================================
async function carregarDados() {
    try {
        // 1. Carrega e processa as Categorias
        const respostaCategorias = await fetch(URL_CATEGORIAS);
        const textoCategoriasCSV = await respostaCategorias.text();
        const linhasCategorias = textoCategoriasCSV
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l !== "");

        const listaCategorias = linhasCategorias
            .slice(1)
            .map((linha) => {
                const valores = linha.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                return valores[1] ? valores[1].replace(/"/g, "").trim() : "";
            })
            .filter((cat) => cat && cat !== "");

        criarCategorias(listaCategorias);

        // 2. Carrega e processa os Produtos
        const respostaProdutos = await fetch(URL_PRODUTOS);
        const textoProdutosCSV = await respostaProdutos.text();

        // Remove quebras de linha invisíveis (\r) comuns no Excel/Sheets
        const linhasProdutos = textoProdutosCSV
            .replace(/\r/g, "")
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l !== "");

        produtos = linhasProdutos
            .slice(1)
            .map((linha) => {
                // Divide por vírgula respeitando textos entre aspas (ex: "R$ 0,50")
                const valores = linha.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

                const codigo = valores[0]
                    ? valores[0].replace(/"/g, "").trim()
                    : "";
                const categoria = valores[1]
                    ? valores[1].replace(/"/g, "").trim()
                    : "";
                const produtoNome = valores[2]
                    ? valores[2].replace(/"/g, "").trim()
                    : "";
                const precoRaw = valores[3]
                    ? valores[3].replace(/"/g, "").trim()
                    : "";
                const ativoRaw = valores[4]
                    ? valores[4].replace(/"/g, "").trim().toLowerCase()
                    : ""; // Coluna E (índice 4)

                return {
                    codigo: codigo,
                    categoria: categoria,
                    produto: produtoNome,
                    preco: parsePreco(precoRaw),
                    ativo: ativoRaw,
                };
            })
            .filter((p) => p.ativo === "sim" || p.ativo.includes("sim")); // Filtra apenas itens ativos

        renderizarProdutos();
    } catch (erro) {
        console.error("Erro ao carregar dados do Sheets:", erro);
        document.getElementById("produtos").innerHTML =
            "<p>Erro ao carregar os dados do catálogo.</p>";
    }
}

// ==========================================
// CATEGORIAS (Menu Superior)
// ==========================================
function criarCategorias(listaCategorias) {
    const container = document.getElementById("categorias");
    container.innerHTML = "";
    adicionarBotaoCategoria("Todos");
    listaCategorias.forEach((categoria) => {
        if (categoria) adicionarBotaoCategoria(categoria);
    });
}

function adicionarBotaoCategoria(nome) {
    const botao = document.createElement("button");
    botao.textContent = nome;
    if (nome === categoriaSelecionada) botao.classList.add("ativo");
    botao.onclick = () => {
        categoriaSelecionada = nome;
        document
            .querySelectorAll("#categorias button")
            .forEach((btn) => btn.classList.remove("ativo"));
        botao.classList.add("ativo");
        renderizarProdutos();
    };
    container = document.getElementById("categorias").appendChild(botao);
}

// ==========================================
// RENDERIZAR PRODUTOS (Filtro e Busca)
// ==========================================
function renderizarProdutos() {
    const container = document.getElementById("produtos");
    const pesquisa = document
        .getElementById("pesquisa")
        .value.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    container.innerHTML = "";

    const lista = produtos.filter((produto) => {
        const nome = produto.produto
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        const categoriaOK =
            categoriaSelecionada === "Todos" ||
            produto.categoria === categoriaSelecionada;
        const pesquisaOK = nome.includes(pesquisa);
        return categoriaOK && pesquisaOK;
    });

    if (lista.length === 0) {
        container.innerHTML = "<p>Nenhum produto encontrado.</p>";
        return;
    }
    lista.forEach((produto) => criarCard(produto));
}

// ==========================================
// CARD DE PRODUTO (Apenas texto e preço)
// ==========================================
function criarCard(produto) {
    const card = document.createElement("div");
    card.className = "card";

    const info = document.createElement("div");
    info.className = "info";
    info.innerHTML = `
        <h2>${produto.produto}</h2>
        <div class="preco">${formatarPreco(produto.preco)}</div>
    `;

    card.appendChild(info);
    document.getElementById("produtos").appendChild(card);
}

// ==========================================
// UTILITÁRIOS (Preço)
// ==========================================
function parsePreco(valorTexto) {
    if (!valorTexto) return 0;
    let limpo = valorTexto
        .replace("R$", "")
        .replace(/\s/g, "")
        .replace(/\./g, "")
        .replace(",", ".");
    return parseFloat(limpo) || 0;
}

function formatarPreco(valor) {
    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
}

// Evento de digitação na barra de pesquisa
document
    .getElementById("pesquisa")
    .addEventListener("input", renderizarProdutos);

// Inicializa o app
carregarDados();
